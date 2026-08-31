/**
 * Queue Producer Instrumentation
 * 
 * Instruments queue message publishing with correlation context,
 * tracing, and metrics.
 */

import { recordQueuePublish } from '../metrics.js';
import { injectCorrelationId, injectTraceContext } from '../context.js';
import { createServiceLogger, type Logger } from '../logger.js';
import type { ServiceContext, NormalizedError } from '../types.js';

// =============================================================================
// Queue Producer Instrumentation
// =============================================================================

export interface QueueProducerInstrumentationOptions {
  serviceContext: ServiceContext;
  logger?: Logger;
  queueName: string;
  defaultRetryCount?: number;
}

/**
 * Create queue producer instrumentation.
 */
export function createQueueProducerInstrumentation(
  options: QueueProducerInstrumentationOptions
): {
  createMessage: <T>(
    payload: T,
    correlationId?: string,
    causationId?: string
  ) => QueueMessage<T>;
  recordPublish: (
    eventType: string,
    eventVersion: number,
    success: boolean,
    durationMs: number,
    error?: NormalizedError
  ) => void;
} {
  const logger = options.logger || createServiceLogger(options.serviceContext.service);
  
  return {
    /**
     * Create a queue message with correlation context.
     */
    createMessage<T>(
      payload: T,
      correlationId?: string,
      causationId?: string
    ): QueueMessage<T> {
      const messageCorrelationId = correlationId || crypto.randomUUID();
      
      // Generate trace context
      const traceContext = {
        traceparent: `00-${crypto.randomUUID().replace(/-/g, '')}-${crypto.randomUUID().slice(0, 16)}-${'01'}`,
      };
      
      return {
        payload,
        metadata: {
          correlationId: messageCorrelationId,
          causationId,
          traceparent: traceContext.traceparent,
          producedAt: Date.now(),
          producer: options.serviceContext.service,
          retryCount: 0,
        },
      };
    },
    
    /**
     * Record message publication.
     */
    recordPublish(
      eventType: string,
      eventVersion: number,
      success: boolean,
      durationMs: number,
      error?: NormalizedError
    ): void {
      // Record metrics
      recordQueuePublish(options.queueName, eventType, success, durationMs);
      
      // Log
      const logData: Record<string, unknown> = {
        operation: 'queue_publish',
        queueName: options.queueName,
        eventType,
        eventVersion,
        success,
        durationMs,
      };
      
      if (error) {
        logData.errorCode = error.code;
        logData.retryable = error.retryable;
      }
      
      if (success) {
        logger.info(`Published message to ${options.queueName}`, logData);
      } else {
        logger.error(`Failed to publish message to ${options.queueName}`, undefined, logData);
      }
    },
  };
}

// =============================================================================
// Queue Message Types
// =============================================================================

export interface QueueMessage<T> {
  /** Message payload */
  payload: T;
  /** Message metadata */
  metadata: QueueMessageMetadata;
}

export interface QueueMessageMetadata {
  /** Correlation ID for distributed tracing */
  correlationId: string;
  /** Causation ID (event that caused this message) */
  causationId?: string;
  /** W3C traceparent */
  traceparent?: string;
  /** Production timestamp */
  producedAt: number;
  /** Producer service name */
  producer: string;
  /** Current retry count */
  retryCount: number;
}

// =============================================================================
// Cloudflare Queue Producer
// =============================================================================

export interface CloudflareQueueProducerOptions extends QueueProducerInstrumentationOptions {
  queue: Queue;
  bindingName?: string;
}

/**
 * Create a Cloudflare Queue producer with instrumentation.
 */
export function createCloudflareQueueProducer(
  options: CloudflareQueueProducerOptions
): {
  send: <T>(message: QueueMessage<T>, retryable?: boolean) => Promise<void>;
  sendBatch: <T>(messages: QueueMessage<T>[], retryable?: boolean) => Promise<void>;
} {
  const instrumentation = createQueueProducerInstrumentation(options);
  
  return {
    /**
     * Send a single message.
     */
    async send<T>(message: QueueMessage<T>, retryable: boolean = true): Promise<void> {
      const startTime = Date.now();
      
      try {
        await options.queue.send({
          ...message.payload,
          // Inject metadata into message
          _meta: message.metadata,
        });
        
        const durationMs = Date.now() - startTime;
        instrumentation.recordPublish(
          (message.payload as Record<string, unknown>).type as string || 'unknown',
          (message.payload as Record<string, unknown>).version as number || 1,
          true,
          durationMs
        );
      } catch (error) {
        const durationMs = Date.now() - startTime;
        const normalizedError: NormalizedError = {
          code: 'QUEUE_PUBLISH_FAILED',
          category: 'queue',
          retryable,
          severity: 'error',
          safeMessage: 'Failed to publish message to queue.',
          cause: error,
        };
        
        instrumentation.recordPublish(
          (message.payload as Record<string, unknown>).type as string || 'unknown',
          (message.payload as Record<string, unknown>).version as number || 1,
          false,
          durationMs,
          normalizedError
        );
        
        if (!retryable) {
          throw error;
        }
      }
    },
    
    /**
     * Send multiple messages in a batch.
     */
    async sendBatch<T>(messages: QueueMessage<T>[], retryable: boolean = true): Promise<void> {
      const startTime = Date.now();
      
      try {
        const batchMessages = messages.map((msg) => ({
          ...msg.payload,
          _meta: msg.metadata,
        }));
        await options.queue.sendBatch(batchMessages as any);
        
        const durationMs = Date.now() - startTime;
        
        for (const message of messages) {
          instrumentation.recordPublish(
            (message.payload as Record<string, unknown>).type as string || 'unknown',
            (message.payload as Record<string, unknown>).version as number || 1,
            true,
            durationMs
          );
        }
      } catch (error) {
        const durationMs = Date.now() - startTime;
        const normalizedError: NormalizedError = {
          code: 'QUEUE_PUBLISH_FAILED',
          category: 'queue',
          retryable,
          severity: 'error',
          safeMessage: 'Failed to publish batch to queue.',
          cause: error,
        };
        
        for (const message of messages) {
          instrumentation.recordPublish(
            (message.payload as Record<string, unknown>).type as string || 'unknown',
            (message.payload as Record<string, unknown>).version as number || 1,
            false,
            durationMs,
            normalizedError
          );
        }
        
        if (!retryable) {
          throw error;
        }
      }
    },
  };
}

// =============================================================================
// Retry Configuration
// =============================================================================

export interface RetryConfig {
  /** Maximum retry attempts */
  maxRetries: number;
  /** Base delay in milliseconds */
  baseDelayMs: number;
  /** Maximum delay in milliseconds */
  maxDelayMs: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
}

/**
 * Default retry configuration.
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
};

/**
 * Calculate retry delay with exponential backoff.
 */
export function calculateRetryDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const delay = Math.min(
    config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelayMs
  );
  
  // Add jitter (±10%)
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  return Math.round(delay + jitter);
}
