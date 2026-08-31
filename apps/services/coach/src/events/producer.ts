/**
 * Coach Service Event Producers
 * 
 * Produces domain events for workout-related operations.
 * Events are published to the domain events queue for consumption
 * by downstream services (Health, Nutrition, etc.)
 */

import { createWorkoutCompletedEvent, createWorkoutStartedEvent } from '@repo/queue-types';
import { generateCorrelationId, sanitizeTraceContext } from '@repo/observability';
import type { DomainEventEnvelope } from '@repo/queue-types';

// =============================================================================
// Event Producer Interface
// =============================================================================

export interface EventProducer {
  publishWorkoutCompleted(params: WorkoutCompletedParams): Promise<DomainEventEnvelope>;
  publishWorkoutStarted(params: WorkoutStartedParams): Promise<DomainEventEnvelope>;
}

export interface WorkoutCompletedParams {
  sessionId: string;
  userId: string;
  planId?: string;
  completedAt: Date;
  durationMs: number;
  totalSets: number;
  completedSets: number;
  skippedSets: number;
  totalReps: number;
  overallQualityScore?: number;
  formComplianceRate?: number;
  totalCorrectionCount: number;
  correlationId?: string;
  causationId?: string;
}

export interface WorkoutStartedParams {
  sessionId: string;
  userId: string;
  planId?: string;
  exerciseCount: number;
  estimatedDurationMs: number;
  startedAt: Date;
  correlationId?: string;
  causationId?: string;
}

// =============================================================================
// Event Producer Implementation
// =============================================================================

export function createCoachEventProducer(
  queue: Queue,
  options: { serviceName?: string } = {}
): EventProducer {
  const serviceName = options.serviceName || 'coach-service';

  return {
    async publishWorkoutCompleted(
      params: WorkoutCompletedParams
    ): Promise<DomainEventEnvelope> {
      const correlationId = params.correlationId || generateCorrelationId();
      const traceContext = sanitizeTraceContext({});

      const event = createWorkoutCompletedEvent({
        sessionId: params.sessionId,
        userId: params.userId,
        planId: params.planId,
        completedAt: params.completedAt,
        durationMs: params.durationMs,
        totalSets: params.totalSets,
        completedSets: params.completedSets,
        skippedSets: params.skippedSets,
        totalReps: params.totalReps,
        overallQualityScore: params.overallQualityScore,
        formComplianceRate: params.formComplianceRate,
        totalCorrectionCount: params.totalCorrectionCount,
        correlationId,
        causationId: params.causationId,
      });

      // Publish to queue
      await queue.send({
        ...event,
        // Cloudflare Queue may have different serialization
        occurredAt: event.occurredAt,
      });

      return event;
    },

    async publishWorkoutStarted(
      params: WorkoutStartedParams
    ): Promise<DomainEventEnvelope> {
      const correlationId = params.correlationId || generateCorrelationId();
      const traceContext = sanitizeTraceContext({});

      const event = createWorkoutStartedEvent({
        sessionId: params.sessionId,
        userId: params.userId,
        planId: params.planId,
        exerciseCount: params.exerciseCount,
        estimatedDurationMs: params.estimatedDurationMs,
        startedAt: params.startedAt,
        correlationId,
        causationId: params.causationId,
      });

      // Publish to queue
      await queue.send({
        ...event,
        occurredAt: event.occurredAt,
      });

      return event;
    },
  };
}

// =============================================================================
// Integration with Session Service
// =============================================================================

/**
 * Complete a workout session and publish domain event.
 * This combines the local transaction with event publication.
 */
export async function completeWorkoutSession(
  params: {
    sessionId: string;
    userId: string;
    planId?: string;
    completedAt: Date;
    durationMs: number;
    totalSets: number;
    completedSets: number;
    skippedSets: number;
    totalReps: number;
    overallQualityScore?: number;
    formComplianceRate?: number;
    totalCorrectionCount: number;
  },
  dependencies: {
    db: D1Database;
    queue: Queue;
    logger?: Console;
  }
): Promise<{ sessionId: string; event: DomainEventEnvelope }> {
  const { db, queue, logger } = dependencies;

  // 1. Update workout session status in local transaction
  const updateResult = await db
    .prepare(`
      UPDATE workout_sessions 
      SET status = 'completed',
          completed_at = ?,
          last_sync_at = ?
      WHERE id = ? AND user_id = ?
    `)
    .bind(
      Math.floor(params.completedAt.getTime() / 1000),
      Math.floor(Date.now() / 1000),
      params.sessionId,
      params.userId
    )
    .run();

  if (!updateResult.success) {
    throw new Error('Failed to update workout session');
  }

  // 2. Create workout summary if needed
  // (Implementation would go here)

  // 3. Publish domain event
  const producer = createCoachEventProducer(queue);
  const event = await producer.publishWorkoutCompleted({
    sessionId: params.sessionId,
    userId: params.userId,
    planId: params.planId,
    completedAt: params.completedAt,
    durationMs: params.durationMs,
    totalSets: params.totalSets,
    completedSets: params.completedSets,
    skippedSets: params.skippedSets,
    totalReps: params.totalReps,
    overallQualityScore: params.overallQualityScore,
    formComplianceRate: params.formComplianceRate,
    totalCorrectionCount: params.totalCorrectionCount,
  });

  if (logger) {
    logger.log(`Published WorkoutCompleted event: ${event.eventId}`);
  }

  return { sessionId: params.sessionId, event };
}
