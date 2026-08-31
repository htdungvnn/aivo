/**
 * Queue Consumer Instrumentation
 * 
 * Instruments queue message consumption with:
 * - Idempotency tracking
 * - Correlation context extraction
 * - Retry handling
 * - Dead-letter queue management
 * - Metrics
 */

import { recordQueueConsume, recordQueuePublish } from '../metrics.js';
import { parseTraceparent, sanitizeTraceContext } from '../context.js';
import { createServiceLogger, type Logger } from '../logger.js';
import type { ServiceContext, NormalizedError } from '../types.js';
import { createNormalizedError, ERROR_CODES } from '../errors.js';

// =============================================================================
// Queue Consumer Instrumentation
// =============================================================================

export interface QueueConsumerInstrumentationOptions {
  serviceContext: ServiceContext;
  logger?: Logger;
  queueName: string;
  /** Check if message was already processed (idempotency) */
  isIdempotent?: (eventId: string) => Promise<boolean>;
  /** Mark message as processed (idempotency) */
  markProcessed?: (eventId: string, result: ProcessingResult) => Promise<void>;
  /** Dead-letter queue producer */
  dlqProducer?: {
    send: (message: unknown) => Promise<void>;
  };
  /** Maximum retries before DLQ */
  maxRetries?: number;
}

/**
 * Create queue consumer instrumentation.
 */
export function createQueueConsumerInstrumentation(
  options: QueueConsumerInstrumentationOptions
): {
  process: <T>(
    message: T,
    handler: (payload: T, context: ProcessingContext) => Promise<void>
  ) => Promise<ProcessingOutcome>;
  recordConsume: (
    eventType: string,
    eventVersion: number,
    success: boolean,
    durationMs: number,
    retryable: boolean
  ) => void;
  recordRetry: (attempt: number, delayMs: number) => void;
  recordDlq: (reason: string, eventType?: string) => void;
} {
  const logger = options.logger || createServiceLogger(options.serviceContext.service);
  const maxRetries = options.maxRetries ?? 5;
  
  return {
    /**
     * Process a queue message with full instrumentation.
     */
    async process<T>(
      message: T,
      handler: (payload: T, context: ProcessingContext) => Promise<void>
    ): Promise<ProcessingOutcome> {
      const startTime = Date.now();
      
      // Extract message metadata
      const messageObj = message as Record<string, unknown>;
      const eventType = messageObj.type as string || 'unknown';
      const eventVersion = (messageObj.version as number) || 1;
      const eventId = (messageObj.eventId || messageObj.messageId || crypto.randomUUID()) as string;
      const correlationId = (messageObj.correlationId || messageObj._meta?.correlationId) as string | undefined;
      const retryCount = (messageObj._meta?.retryCount || messageObj.retryCount || 0) as number;
      
      // Extract trace context
      const traceparent = messageObj.traceparent || messageObj._meta?.traceparent as string | undefined;
      const traceContext = traceparent
        ? sanitizeTraceContext({ traceparent })
        : { traceId: crypto.randomUUID(), spanId: crypto.randomUUID().slice(0, 16) };
      
      // Create processing context
      const context: ProcessingContext = {
        eventId,
        eventType,
        eventVersion,
        correlationId: correlationId || crypto.randomUUID(),
        traceContext,
        retryCount,
        startTime,
        queueName: options.queueName,
      };
      
      // Log start
      logger.info(`Processing message from ${options.queueName}`, {
        operation: 'queue_consume_start',
        eventId,
        eventType,
        eventVersion,
        correlationId: context.correlationId,
        retryCount,
        queueName: options.queueName,
      });
      
      try {
        // Check idempotency
        if (options.isIdempotent) {
          const alreadyProcessed = await options.isIdempotent(eventId);
          if (alreadyProcessed) {
            logger.info(`Message ${eventId} already processed, skipping`, {
              operation: 'queue_consume_skip',
              eventId,
              correlationId: context.correlationId,
            });
            
            const durationMs = Date.now() - startTime;
            this.recordConsume(eventType, eventVersion, true, durationMs, false);
            
            return { status: 'skipped', eventId, durationMs };
          }
        }
        
        // Process message
        await handler(message, context);
        
        const durationMs = Date.now() - startTime;
        const result: ProcessingResult = {
          status: 'success',
          processedAt: Date.now(),
        };
        
        // Mark as processed
        if (options.markProcessed) {
          await options.markProcessed(eventId, result);
        }
        
        // Record success
        this.recordConsume(eventType, eventVersion, true, durationMs, false);
        
        logger.info(`Message ${eventId} processed successfully`, {
          operation: 'queue_consume_success',
          eventId,
          correlationId: context.correlationId,
          durationMs,
        });
        
        return { status: 'success', eventId, durationMs };
        
      } catch (error) {
        const durationMs = Date.now() - startTime;
        const normalizedError = createNormalizedError(
          error,
          ERROR_CODES.QUEUE_CONSUME_FAILED,
          context.correlationId
        );
        
        // Determine if retryable
        const shouldRetry = normalizedError.retryable && retryCount < maxRetries;
        
        if (shouldRetry) {
          const delayMs = calculateDelay(retryCount);
          this.recordRetry(retryCount + 1, delayMs);
          
          logger.warn(`Message ${eventId} failed, will retry`, {
            operation: 'queue_consume_retry',
            eventId,
            errorCode: normalizedError.code,
            retryable: normalizedError.retryable,
            retryCount: retryCount + 1,
            delayMs,
          });
          
          this.recordConsume(eventType, eventVersion, false, durationMs, true);
          
          return {
            status: 'retry',
            eventId,
            durationMs,
            error: normalizedError,
            retryCount: retryCount + 1,
            delayMs,
          };
        } else {
          // Send to DLQ
          if (options.dlqProducer) {
            await options.dlqProducer.send({
              originalMessage: message,
              error: {
                code: normalizedError.code,
                message: normalizedError.safeMessage,
              },
              metadata: {
                failedAt: Date.now(),
                failedAfterRetries: retryCount,
                correlationId: context.correlationId,
                eventType,
                eventVersion,
                producer: options.serviceContext.service,
              },
            });
            
            this.recordDlq(normalizedError.code, eventType);
          }
          
          // Record failure
          this.recordConsume(eventType, eventVersion, false, durationMs, false);
          
          logger.error(`Message ${eventId} failed permanently`, error instanceof Error ? error : undefined, {
            operation: 'queue_consume_failure',
            eventId,
            errorCode: normalizedError.code,
            retryCount,
          });
          
          // Mark as failed
          if (options.markProcessed) {
            await options.markProcessed(eventId, {
              status: 'failed',
              error: normalizedError,
              failedAt: Date.now(),
            });
          }
          
          return {
            status: 'dlq',
            eventId,
            durationMs,
            error: normalizedError,
          };
        }
      }
    },
    
    /**
     * Record message consumption.
     */
    recordConsume(
      eventType: string,
      eventVersion: number,
      success: boolean,
      durationMs: number,
      retryable: boolean
    ): void {
      recordQueueConsume(options.queueName, eventType, success, durationMs, retryable);
    },
    
    /**
     * Record retry attempt.
     */
    recordRetry(attempt: number, delayMs: number): void {
      logger.info(`Scheduling retry attempt ${attempt}`, {
        operation: 'queue_retry',
        queueName: options.queueName,
        attempt,
        delayMs,
      });
    },
    
    /**
     * Record message sent to DLQ.
     */
    recordDlq(reason: string, eventType?: string): void {
      logger.error(`Message sent to DLQ`, undefined, {
        operation: 'queue_dlq',
        queueName: options.queueName,
        reason,
        eventType,
      });
    },
  };
}

// =============================================================================
// Types
// =============================================================================

export interface ProcessingContext {
  /** Unique event/message ID */
  eventId: string;
  /** Event type */
  eventType: string;
  /** Event schema version */
  eventVersion: number;
  /** Correlation ID from the workflow */
  correlationId: string;
  /** Trace context */
  traceContext: {
    traceparent?: string;
    traceId?: string;
    spanId?: string;
  };
  /** Current retry count */
  retryCount: number;
  /** Processing start time */
  startTime: number;
  /** Queue name */
  queueName: string;
}

export interface ProcessingResult {
  status: 'success' | 'failed' | 'skipped';
  processedAt?: number;
  failedAt?: number;
  error?: NormalizedError;
}

export interface ProcessingOutcome {
  status: 'success' | 'retry' | 'dlq' | 'skipped';
  eventId: string;
  durationMs: number;
  error?: NormalizedError;
  retryCount?: number;
  delayMs?: number;
}

// =============================================================================
// Retry Delay Calculation
// =============================================================================

function calculateDelay(attempt: number): number {
  const baseDelay = 1000; // 1 second
  const maxDelay = 60000; // 1 minute
  const multiplier = 2;
  
  const delay = Math.min(baseDelay * Math.pow(multiplier, attempt), maxDelay);
  
  // Add jitter (±10%)
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  return Math.round(delay + jitter);
}

// =============================================================================
// Cloudflare Queue Consumer
// =============================================================================

export interface CloudflareQueueConsumerOptions extends QueueConsumerInstrumentationOptions {
  /** Additional DLQ queue for exhausted messages */
  dlqQueue?: Queue;
  dlqBindingName?: string;
}

/**
 * Create a Cloudflare Queue consumer with full instrumentation.
 */
export function createCloudflareQueueConsumer(
  options: CloudflareQueueConsumerOptions
): {
  handle: (messages: Message[]) => Promise<void>;
} {
  // Create DLQ producer if DLQ queue is configured
  const dlqProducer = options.dlqQueue
    ? {
        send: async (message: unknown) => {
          await options.dlqQueue!.send(message);
          recordQueuePublish('dlq', 'unknown', true, 0);
        },
      }
    : undefined;
  
  const instrumentation = createQueueConsumerInstrumentation({
    ...options,
    dlqProducer,
  });
  
  return {
    /**
     * Handle a batch of messages from Cloudflare Queue.
     */
    async handle(messages: Message[]): Promise<void> {
      for (const message of messages) {
        const messageObj = message.body as Record<string, unknown>;
        
        const outcome = await instrumentation.process(
          messageObj,
          async (payload, context) => {
            // This is where the actual handler logic would go
            // For now, just ack/nack based on outcome
            throw new Error('Handler not implemented');
          }
        );
        
        switch (outcome.status) {
          case 'success':
          case 'skipped':
            message.ack();
            break;
            
          case 'retry':
            if (outcome.delayMs) {
              // Cloudflare Queues retry automatically
              // Setting attempts metadata for visibility
              message.retry();
            } else {
              message.ack();
            }
            break;
            
          case 'dlq':
            message.ack(); // Ack to prevent infinite retry
            break;
        }
      }
    },
  };
}
