/**
 * Health Worker - Cloudflare Workers entry point
 * Handles Daily Intelligence, readiness calculation, and health tracking
 */

import { Hono } from 'hono';
import { cors, requestId, errorHandler } from './middleware';
import { createRoutes } from './routes';
import type { HealthEnv } from './types/env';

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

// Health check (no auth required)
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: Date.now(),
    version: '1.0.0',
    service: 'health',
  });
});

// Mount routes
const routes = createRoutes();
app.route('/api/v1', routes);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
        requestId: c.get('requestId'),
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
    
    return app.fetch(request, env, ctx);
  },
  
  // Queue consumer for async processing
  async queue(batch: MessageBatch, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`Processing ${batch.messages.length} queue messages`);
    
    for (const message of batch.messages) {
      try {
        const payload = JSON.parse(message.body);
        
        // Handle different message types
        switch (payload.type) {
          case 'calculate_readiness':
            // Calculate readiness for user
            console.log(`Calculating readiness for user ${payload.userId}`);
            break;
          
          case 'generate_actions':
            // Generate daily actions
            console.log(`Generating actions for user ${payload.userId}`);
            break;
          
          case 'sync_health_data':
            // Sync health data from wearables
            console.log(`Syncing health data for user ${payload.userId}`);
            break;
          
          default:
            console.warn(`Unknown message type: ${payload.type}`);
        }
        
        // Acknowledge message
        message.ack();
      } catch (error) {
        console.error('Failed to process message:', error);
        
        // Retry if within retry limit
        if (message.attempts < 3) {
          message.retry();
        } else {
          message.ack();
        }
      }
    }
  },
} satisfies ExportedHandler<Env>;
