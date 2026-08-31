/**
 * Coach Event Consumers
 * 
 * Consumes domain events from the Coach service.
 * Currently handles WorkoutCompleted events to trigger readiness recalculation.
 */

import {
  domainEventEnvelopeSchema,
  EVENT_TYPES,
  isEventType,
  validateEventPayload,
  workoutCompletedPayloadSchema,
} from '@aivo/queue-types';
import { createEventIdempotencyStore, type EventIdempotencyStore } from './idempotency.js';

// =============================================================================
// Event Handlers
// =============================================================================

export interface EventContext {
  eventId: string;
  eventType: string;
  eventVersion: number;
  correlationId?: string;
  causationId?: string;
  userId?: string;
}

export interface EventHandlerResult {
  success: boolean;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export interface WorkoutCompletedHandler {
  (payload: WorkoutCompletedData, context: EventContext): Promise<EventHandlerResult>;
}

export interface WorkoutCompletedData {
  sessionId: string;
  userId: string;
  planId?: string;
  completedAt: string;
  durationMs: number;
  totalSets: number;
  completedSets: number;
  skippedSets: number;
  totalReps: number;
  overallQualityScore?: number;
  formComplianceRate?: number;
  totalCorrectionCount: number;
}

// =============================================================================
// Consumer Implementation
// =============================================================================

export interface HealthEventConsumerOptions {
  db: D1Database;
  consumerName: string;
  readinessEngine: {
    calculate: (params: {
      userId: string;
      date: string;
      workoutData?: {
        durationMs: number;
        totalSets: number;
        completedSets: number;
        qualityScore?: number;
      };
    }) => Promise<{
      score: number;
      level: 'low' | 'moderate' | 'good' | 'high';
      confidence: number;
    }>;
  };
  logger?: Console;
}

export function createHealthEventConsumer(options: HealthEventConsumerOptions) {
  const idempotencyStore = createEventIdempotencyStore(options.db, options.consumerName);

  return {
    /**
     * Process a single message from the queue.
     */
    async processMessage(message: unknown): Promise<EventHandlerResult> {
      // 1. Validate event envelope
      const envelopeResult = domainEventEnvelopeSchema.safeParse(message);
      if (!envelopeResult.success) {
        options.logger?.error('Invalid event envelope:', envelopeResult.error);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid event envelope',
            retryable: false,
          },
        };
      }

      const envelope = envelopeResult.data;

      // 2. Check idempotency
      const alreadyProcessed = await idempotencyStore.isProcessed(envelope.eventId);
      if (alreadyProcessed) {
        options.logger?.log(`Event ${envelope.eventId} already processed, skipping`);
        return { success: true };
      }

      // 3. Handle by event type
      try {
        if (isEventType(envelope, EVENT_TYPES.COACH.WORKOUT_COMPLETED)) {
          return await handleWorkoutCompleted(envelope, options, idempotencyStore);
        }

        // Unknown event type - log and acknowledge
        options.logger?.warn(`Unknown event type: ${envelope.eventType}`);
        return { success: true };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        await idempotencyStore.markFailed(
          envelope.eventId,
          'PROCESSING_ERROR',
          errorMessage
        );

        // Determine if retryable
        const isRetryable = error instanceof Error && (
          error.message.includes('timeout') ||
          error.message.includes('rate limit') ||
          error.message.includes('connection')
        );

        return {
          success: false,
          error: {
            code: 'PROCESSING_ERROR',
            message: errorMessage,
            retryable: isRetryable,
          },
        };
      }
    },

    /**
     * Get the idempotency store for testing.
     */
    getIdempotencyStore(): EventIdempotencyStore {
      return idempotencyStore;
    },
  };
}

// =============================================================================
// Event Handlers
// =============================================================================

async function handleWorkoutCompleted(
  envelope: ReturnType<typeof domainEventEnvelopeSchema.parse>,
  options: HealthEventConsumerOptions,
  idempotencyStore: EventIdempotencyStore
): Promise<EventHandlerResult> {
  const { eventId, eventType, eventVersion, correlationId, causationId } = envelope;
  const payload = envelope.payload as WorkoutCompletedData;

  // Build context
  const context: EventContext = {
    eventId,
    eventType,
    eventVersion,
    correlationId,
    causationId,
    userId: payload.userId,
  };

  options.logger?.log(
    `Processing WorkoutCompleted for user ${payload.userId}, session ${payload.sessionId}`
  );

  // 1. Validate payload
  const payloadResult = workoutCompletedPayloadSchema.safeParse(payload);
  if (!payloadResult.success) {
    options.logger?.error('Invalid workout payload:', payloadResult.error);
    
    await idempotencyStore.markFailed(
      eventId,
      'VALIDATION_ERROR',
      'Invalid payload schema'
    );

    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid payload schema',
        retryable: false,
      },
    };
  }

  // 2. Mark as processing (idempotency)
  const marked = await idempotencyStore.markProcessing(eventId, eventType, eventVersion);
  if (!marked) {
    // Already processed
    return { success: true };
  }

  try {
    // 3. Calculate readiness based on workout
    const date = new Date(payload.completedAt).toISOString().split('T')[0];
    
    const readinessResult = await options.readinessEngine.calculate({
      userId: payload.userId,
      date,
      workoutData: {
        durationMs: payload.durationMs,
        totalSets: payload.totalSets,
        completedSets: payload.completedSets,
        qualityScore: payload.overallQualityScore,
      },
    });

    options.logger?.log(
      `Calculated readiness: score=${readinessResult.score}, level=${readinessResult.level}`
    );

    // 4. Store result (simplified - actual implementation would call health db)
    // await saveReadinessSnapshot(options.db, { ... });

    // 5. Mark as processed
    await idempotencyStore.markProcessed(eventId, `readiness:${payload.userId}:${date}`);

    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await idempotencyStore.markFailed(eventId, 'CALCULATION_ERROR', errorMessage);

    // Determine retryability
    const isRetryable = errorMessage.includes('timeout') || 
                       errorMessage.includes('rate limit');

    return {
      success: false,
      error: {
        code: 'CALCULATION_ERROR',
        message: errorMessage,
        retryable: isRetryable,
      },
    };
  }
}

// =============================================================================
// Queue Batch Handler
// =============================================================================

export function createQueueHandler(
  consumer: ReturnType<typeof createHealthEventConsumer>
) {
  return async function handleBatch(messages: Message[]): Promise<void> {
    for (const message of messages) {
      const messageBody = message.body as Record<string, unknown>;

      const result = await consumer.processMessage(messageBody);

      if (result.success) {
        message.ack();
      } else if (result.error?.retryable) {
        // Retry with backoff
        if (message.attempts < 5) {
          message.retry();
        } else {
          // Max retries exceeded, send to DLQ
          message.ack(); // Ack to remove from main queue
          // Message will be in DLQ if configured
        }
      } else {
        // Non-retryable error, acknowledge and move on
        message.ack();
      }
    }
  };
}
