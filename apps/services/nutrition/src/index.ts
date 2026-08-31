/**
 * Nutrition Worker - Cloudflare Workers entry point
 * Handles meal analysis, nutrition tracking, and meal planning
 */

import { Hono } from 'hono';
import { cors, requestId, errorHandler } from './middleware';
import { createRoutes } from './routes';
import type { NutritionEnv } from './types/env';

export interface Env extends NutritionEnv {
  // D1 Database
  DB: D1Database;
  
  // R2 Bucket for meal images
  MEAL_IMAGES: R2Bucket;
  
  // Queue for async analysis
  ANALYSIS_QUEUE: Queue;
  
  // AI Gateway
  AI_GATEWAY: Ai;
  
  // Auth service URL
  AUTH_SERVICE_URL: string;
  
  // Image processing config
  IMAGE_MAX_DIMENSION_PX: string;
  IMAGE_QUALITY: string;
  
  // AI config
  AI_DAILY_LIMIT: string;
  AI_HOURLY_LIMIT: string;
  AI_RETRY_LIMIT: string;
  AI_CONFIDENCE_THRESHOLD: string;
  DEFAULT_MODEL: string;
  FALLBACK_MODEL: string;
  
  // Allowed origins
  ALLOWED_ORIGINS?: string;
}

// Context type for request context
type Context = {
  Bindings: Env;
  Variables: {
    requestId: string;
    userId: string;
  };
};

const app = new Hono<Context>();

// Request ID for all requests
app.use('*', requestId());

// Error handling
app.use('*', errorHandler());

// Get allowed origins from environment
function getAllowedOrigins(env: Env): string[] {
  const origins: string[] = ['http://localhost:3000', 'http://localhost:3002'];
  
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
    service: 'nutrition',
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
    console.log(`[${requestId}] ${request.method} ${new URL(request.url).pathname}`);
    
    return app.fetch(request, env, ctx);
  },
  
  // Queue consumer for async meal analysis
  async queue(batch: MessageBatch, env: Env, ctx: ExecutionContext): Promise<void> {
    // This will be handled by the workers/queue.ts file
    console.log(`Processing ${batch.messages.length} queue messages`);
  },
} satisfies ExportedHandler<Env>;
