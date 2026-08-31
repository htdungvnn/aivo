/**
 * Health Worker - Cloudflare Workers entry point
 * Handles Daily Intelligence, readiness calculation, health tracking, and health reports
 */

import { Hono } from 'hono';
import { cors, requestId, errorHandler } from './middleware/index.js';
import { createRoutes } from './routes/index.js';
import { createReportRoutes } from './routes/reports.js';
import { handleScheduledReportCron } from './lib/report-scheduler.js';
import { processReportGeneration } from './lib/report-generator.js';
import type { HealthEnv, ReportQueueMessage } from './types/env.js';

export interface Env extends HealthEnv {}

const app = new Hono();

// Request ID for all requests
app.use('*', requestId());

// Error handling
app.use('*', errorHandler());

// Get allowed origins from environment
function getAllowedOrigins(env: Env): string[] {
  const origins: string[] = ['http://localhost:3000'];
  
  if (env.ALLOWED_ORIGINS) {
    origins.push(...env.ALLOWED_ORIGINS.split(',').map(s => s.trim()));
  }
  
  return [...new Set(origins)];
}

// CORS middleware
app.use('*', async (c, next) => {
  const origin = c.req.header('Origin');
  const allowedOrigins = getAllowedOrigins(c.env as Env);

  if (origin && allowedOrigins.some(o => origin === o || o === '*')) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Allow-Credentials', 'true');
  }
  
  if (c.req.method === 'OPTIONS') {
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, X-Timezone');
    c.header('Access-Control-Max-Age', '86400');
    return c.text('', 200);
  }
  
  await next();
});

// Health check (no auth required)
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: Date.now(),
    version: '1.0.0',
    service: 'health',
  });
});

// Mount health routes
const routes = createRoutes();
app.route('/api/v1', routes);

// Mount report routes
const reportRoutes = createReportRoutes();
app.route('/api/v1/reports', reportRoutes);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
        requestId: String(c.get('requestId') ?? ''),
      },
    },
    404
  );
});

// Export the worker
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Log request (sanitized - no sensitive data)
    const requestId = request.headers.get('X-Request-ID') || crypto.randomUUID();
    const pathname = new URL(request.url).pathname;
    console.log(`[${requestId}] ${request.method} ${pathname}`);

    return app.fetch(request, env as Env, ctx);
  },
  
  // Queue consumer for async processing
  async queue(batch: MessageBatch, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`Processing ${batch.messages.length} queue messages from ${batch.queue}`);

    // Queue names
    const HEALTH_QUEUE = 'aivo-health-queue';
    const REPORT_QUEUE = 'aivo-health-report-queue';
    const REPORT_DLQ = 'aivo-health-report-dlq';

    // Route to appropriate handler based on queue name
    for (const message of batch.messages) {
      try {
        const payload = JSON.parse(message.body as string);

        // Use batch.queue for routing since message.queue may not be accessible on Message<unknown>
        const queueName = batch.queue;

        if (queueName === HEALTH_QUEUE) {
          // Original health queue messages
          switch (payload.type) {
            case 'calculate_readiness':
              console.log(`Calculating readiness for user ${payload.userId}`);
              break;
            case 'generate_actions':
              console.log(`Generating actions for user ${payload.userId}`);
              break;
            case 'sync_health_data':
              console.log(`Syncing health data for user ${payload.userId}`);
              break;
            default:
              console.warn(`Unknown message type in health queue: ${payload.type}`);
          }
          message.ack();

        } else if (queueName === REPORT_QUEUE) {
          // Report generation queue
          console.log(`Processing report generation for job ${payload.reportJobId}`);
          const result = await processReportGeneration(env, payload as ReportQueueMessage);
          if (result.success) {
            message.ack();
          } else if (message.attempts < 3) {
            message.retry();
          } else {
            message.ack(); // Already marked as failed in DB
          }

        } else if (queueName === REPORT_DLQ) {
          // Dead letter queue - log and acknowledge
          console.error(`DLQ message received for job ${payload.reportJobId}:`, payload);
          message.ack();

        } else {
          console.warn(`Unknown queue: ${queueName}`);
          message.ack();
        }
      } catch (error) {
        console.error('Failed to process message:', error);
        if (message.attempts < 3) {
          message.retry();
        } else {
          message.ack();
        }
      }
    }
  },
  
  // Scheduled handler for cron trigger
  async scheduled(event: { scheduledTime: number; cron: string }, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`[Scheduled] Cron triggered at ${new Date(event.scheduledTime).toISOString()}`);
    console.log(`[Scheduled] Cron pattern: ${event.cron}`);
    
    try {
      const response = await handleScheduledReportCron(env, event.scheduledTime, event.cron);
      
      // Log response
      const body = await response.text();
      console.log(`[Scheduled] Result: ${body}`);
    } catch (error) {
      console.error('[Scheduled] Handler failed:', error);
    }
  },
} satisfies ExportedHandler<Env>;
