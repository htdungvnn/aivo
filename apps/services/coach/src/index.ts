/**
 * Coach Service - Cloudflare Worker Entry Point
 * Workout coaching, session management, and AI planning
 */

import { Hono } from 'hono';
import { cors, requestId, errorHandler, rateLimit } from './middleware';
import { createRoutes } from './routes';
import type { CoachEnv, CoachContext } from './env.d';

// Create Hono app
const app = new Hono<CoachContext>();

// Request ID middleware
app.use('*', requestId());

// Error handling middleware
app.use('*', errorHandler());

// Rate limiting
app.use('*', rateLimit());

// CORS middleware
app.use('*', async (c, next) => {
  const origin = c.req.header('Origin');
  const allowedOrigins = getAllowedOrigins(c.env);
  
  if (origin && allowedOrigins.some(o => origin === o || o === '*')) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Allow-Credentials', 'true');
  }
  
  if (c.req.method === 'OPTIONS') {
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
    c.header('Access-Control-Max-Age', '86400');
    return c.text('', 200);
  }
  
  await next();
});

// Get allowed origins from environment
function getAllowedOrigins(env: CoachEnv): string[] {
  const origins: string[] = ['http://localhost:3000', 'http://localhost:3001'];
  
  if (env.ALLOWED_ORIGINS) {
    origins.push(...env.ALLOWED_ORIGINS.split(',').map(s => s.trim()));
  }
  
  return [...new Set(origins)];
}

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'aivo-coach',
    timestamp: Date.now(),
    version: '1.0.0',
    environment: {
      schemaVersion: c.env.SCHEMA_VERSION,
      engineVersion: c.env.ENGINE_VERSION,
      wasmEngineVersion: c.env.WASM_ENGINE_VERSION,
    },
  });
});

// Readiness check (includes database connectivity)
app.get('/ready', async (c) => {
  try {
    // Test database connectivity
    const result = await c.env.DB
      .prepare('SELECT 1 as health_check')
      .first();
    
    return c.json({
      status: 'ready',
      database: 'connected',
      timestamp: Date.now(),
    });
  } catch (error) {
    return c.json({
      status: 'not_ready',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 503);
  }
});

// Mount routes
const routes = createRoutes();
app.route('/api/v1', routes);

// 404 handler
app.notFound((c) => {
  return c.json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      requestId: c.get('requestId'),
    },
  }, 404);
});

// Export the worker
export default {
  async fetch(request: Request, env: CoachEnv, ctx: ExecutionContext): Promise<Response> {
    // Log request (sanitized)
    const requestId = request.headers.get('X-Request-ID') || crypto.randomUUID();
    console.log(`[${requestId}] ${request.method} ${request.url}`);
    
    return app.fetch(request, env, ctx);
  },
  
  // Queue consumer for async planning jobs
  async queue(batch: MessageBatch<any>, env: CoachEnv, ctx: ExecutionContext): Promise<void> {
    for (const message of batch.messages) {
      try {
        await processQueueMessage(message, env, ctx);
        message.ack();
      } catch (error) {
        console.error('Failed to process queue message:', error);
        message.nack();
      }
    }
  },
} satisfies ExportedHandler<CoachEnv>;

async function processQueueMessage(message: QueueMessage, env: CoachEnv, ctx: ExecutionContext): Promise<void> {
  const payload = message as any;
  
  switch (payload.type) {
    case 'coach.plan_adjustment':
      // Trigger AI planning for plan adjustment
      await handlePlanAdjustment(payload.data, env, ctx);
      break;
      
    default:
      console.warn(`Unknown message type: ${payload.type}`);
  }
}

async function handlePlanAdjustment(
  data: { userId: string; planId: string; reason: string; completedSessionId?: string },
  env: CoachEnv,
  ctx: ExecutionContext
): Promise<void> {
  console.log(`Processing plan adjustment for user ${data.userId}, reason: ${data.reason}`);
  
  // Check if AI planning is enabled
  if (env.PLANNING_ENABLED !== 'true') {
    console.log('AI planning is disabled, skipping');
    return;
  }
  
  // Import and run planning service
  const { PlanningService } = await import('./services/planning.js');
  const planningService = new PlanningService(env);
  
  await planningService.adjustPlan(data.userId, data.planId, data.reason, data.completedSessionId);
}
