/**
 * Coach Worker - Cloudflare Workers entry point
 * Handles workout planning, session tracking, and fitness coaching
 */

import { Hono } from 'hono';
import { requestId, errorHandler, cors, rateLimit } from './middleware';
import { createRoutes } from './routes';
import type { CoachEnv } from './env.d';

export interface Env extends CoachEnv {}

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

// Health check endpoint (no auth required)
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: Date.now(),
    version: '1.0.0',
    service: 'coach',
  });
});

// Mount routes under /api/v1
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
  
  // Queue consumer for planning jobs
  async queue(messages: Message[], env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`Processing ${messages.length} planning queue messages`);
    
    for (const message of messages) {
      try {
        const payload = message.body;
        
        switch (payload.type) {
          case 'coach.plan_adjustment':
            console.log(`Processing plan adjustment for user ${payload.data.userId}`);
            // Handle plan adjustment
            break;
          
          default:
            console.warn(`Unknown message type: ${payload.type}`);
        }
        
        message.ack();
      } catch (error) {
        console.error('Failed to process planning message:', error);
        
        if (message.attempts < 3) {
          message.retry();
        } else {
          message.ack();
        }
      }
    }
  },
} satisfies ExportedHandler<Env>;
