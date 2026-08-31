/**
 * Mail Worker - Cloudflare Workers
 * Consumes email Queue messages and sends transactional emails via Resend
 *
 * Features:
 * - Batch processing of Queue messages
 * - Schema validation using Zod
 * - Deduplication using messageId
 * - Retry logic for transient errors
 * - Dead Letter Queue for failed messages
 * - English and Vietnamese template support
 * - Health report notifications
 */

import { createEmailService, EmailService } from './services/email';
import {
  createQueueConsumer,
  QueueConsumerService,
  InMemoryDeduplicationStore,
} from './services/consumer';
import type {
  EmailVerificationQueueMessage,
  ReportReadyQueueMessage,
} from '@repo/queue-types';

// Environment interface
export interface Env {
  // Resend API key (stored as secret)
  RESEND_API_KEY: string;

  // Email configuration
  EMAIL_FROM?: string;
  EMAIL_REPLY_TO?: string;
  EMAIL_ENABLED?: string;

  // App URLs
  WEB_APP_URL?: string;
  SUPPORT_EMAIL?: string;

  // Email Queue (consumer binding)
  EMAIL_QUEUE: Queue<EmailVerificationQueueMessage>;

  // Health Report Deliver Queue
  REPORT_DELIVER_QUEUE: Queue<ReportReadyQueueMessage>;

  // Dead Letter Queue for failed messages
  EMAIL_DLQ: Queue<EmailVerificationQueueMessage | ReportReadyQueueMessage>;
}

// Email service instance (initialized per Worker instance)
let emailService: EmailService | null = null;
let emailQueueConsumer: QueueConsumerService | null = null;
let reportQueueConsumer: QueueConsumerService | null = null;
let deduplicationStore: InMemoryDeduplicationStore | null = null;

/**
 * Initialize services lazily
 */
function getEmailService(env: Env): EmailService {
  if (!emailService) {
    const fromAddress = env.EMAIL_FROM || 'AIVO <no-reply@mail.aivo.app>';
    const enabled = env.EMAIL_ENABLED !== 'false';

    emailService = createEmailService({
      apiKey: env.RESEND_API_KEY,
      fromAddress,
      replyToAddress: env.EMAIL_REPLY_TO,
      enabled,
    });
  }
  return emailService;
}

/**
 * Get or create email queue consumer
 */
function getEmailQueueConsumer(env: Env): QueueConsumerService {
  if (!emailQueueConsumer) {
    emailQueueConsumer = createQueueConsumer({
      emailService: getEmailService(env),
      deduplicationStore: getDeduplicationStore(),
      dlq: env.EMAIL_DLQ,
      maxRetries: 3,
    });
  }
  return emailQueueConsumer;
}

/**
 * Get or create report queue consumer
 */
function getReportQueueConsumer(env: Env): QueueConsumerService {
  if (!reportQueueConsumer) {
    reportQueueConsumer = createQueueConsumer({
      emailService: getEmailService(env),
      deduplicationStore: getDeduplicationStore(),
      dlq: env.EMAIL_DLQ,
      maxRetries: 3,
    });
  }
  return reportQueueConsumer;
}

/**
 * Get deduplication store
 */
function getDeduplicationStore(): InMemoryDeduplicationStore {
  if (!deduplicationStore) {
    deduplicationStore = new InMemoryDeduplicationStore();
  }
  return deduplicationStore;
}

/**
 * Health check endpoint
 */
async function handleHealth(): Promise<Response> {
  return new Response(
    JSON.stringify({
      status: 'ok',
      timestamp: Date.now(),
      worker: 'mail',
      version: '1.0.0',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Main worker fetch handler
 */
const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health' && request.method === 'GET') {
      return handleHealth();
    }

    // No public endpoints for arbitrary email sending
    return new Response(
      JSON.stringify({
        error: {
          code: 'NOT_FOUND',
          message: 'This worker does not expose public email sending endpoints',
        },
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  },

  /**
   * Email queue consumer handler
   */
  async emailQueue(messages: EmailVerificationQueueMessage[], env: Env, ctx: ExecutionContext): Promise<void> {
    if (!messages || messages.length === 0) {
      return;
    }

    console.log(`Processing batch of ${messages.length} email messages`);

    const consumer = getEmailQueueConsumer(env);
    const result = await consumer.processBatch(messages);

    console.log(
      `Email batch complete: ${result.succeeded} succeeded, ${result.failed} failed out of ${result.processed} messages`
    );

    const failedMessages = result.results
      .filter((r) => !r.success && r.isRetryable)
      .map((r) => r.message);

    if (failedMessages.length > 0) {
      console.log(`${failedMessages.length} messages failed and are eligible for retry`);
    }

    const nonRetryableFailures = result.results.filter(
      (r) => !r.success && !r.isRetryable
    );
    if (nonRetryableFailures.length > 0) {
      console.warn(`${nonRetryableFailures.length} non-retryable failures (sent to DLQ)`);
    }
  },

  /**
   * Report deliver queue consumer handler
   */
  async reportDeliverQueue(messages: ReportReadyQueueMessage[], env: Env, ctx: ExecutionContext): Promise<void> {
    if (!messages || messages.length === 0) {
      return;
    }

    console.log(`Processing batch of ${messages.length} report deliver messages`);

    const consumer = getReportQueueConsumer(env);
    const result = await consumer.processBatch(messages);

    console.log(
      `Report deliver batch complete: ${result.succeeded} succeeded, ${result.failed} failed out of ${result.processed} messages`
    );

    const failedMessages = result.results
      .filter((r) => !r.success && r.isRetryable)
      .map((r) => r.message);

    if (failedMessages.length > 0) {
      console.log(`${failedMessages.length} report messages failed and are eligible for retry`);
    }

    const nonRetryableFailures = result.results.filter(
      (r) => !r.success && !r.isRetryable
    );
    if (nonRetryableFailures.length > 0) {
      console.warn(`${nonRetryableFailures.length} non-retryable report failures (sent to DLQ)`);
    }
  },
};

export default worker;
