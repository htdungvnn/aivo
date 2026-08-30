/**
 * Auth Worker - Cloudflare Workers entry point
 */

import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-workers';
import { cors, requestId, errorHandler, rateLimits } from './middleware';
import { createRoutes } from './routes';
import { getJWTService, setJWTService } from './lib/jwt';
import type { AuthEnv } from './middleware/auth';

export interface Env extends AuthEnv {
  // D1 Database
  DB: D1Database;
  
  // JWT Configuration
  AUTH_JWT_PRIVATE_KEY?: string;
  AUTH_JWT_PUBLIC_KEY?: string;
  AUTH_JWT_ISSUER?: string;
  AUTH_JWT_AUDIENCE?: string;
  AUTH_JWT_ACCESS_TOKEN_TTL?: string;
  
  // OAuth Configuration
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  FACEBOOK_CLIENT_ID?: string;
  FACEBOOK_CLIENT_SECRET?: string;
  FACEBOOK_REDIRECT_URI?: string;
  
  // App URLs
  WEB_APP_URL?: string;
  MOBILE_REDIRECT_URI?: string;
  
  // Allowed Origins (comma-separated)
  ALLOWED_ORIGINS?: string;
}

const app = new Hono<{ Bindings: Env }>();

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
  
  if (env.WEB_APP_URL) {
    origins.push(env.WEB_APP_URL);
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
    return c.text('', 204);
  }
  
  await next();
});

// Initialize JWT service
async function initJWTService(env: Env) {
  const jwtService = getJWTService();
  
  if (env.AUTH_JWT_PRIVATE_KEY && env.AUTH_JWT_PUBLIC_KEY) {
    try {
      const service = await jwtService.constructor.fromEnvironment({
        AUTH_JWT_PRIVATE_KEY: env.AUTH_JWT_PRIVATE_KEY,
        AUTH_JWT_PUBLIC_KEY: env.AUTH_JWT_PUBLIC_KEY,
        AUTH_JWT_ISSUER: env.AUTH_JWT_ISSUER,
        AUTH_JWT_AUDIENCE: env.AUTH_JWT_AUDIENCE,
        AUTH_JWT_ACCESS_TOKEN_TTL: env.AUTH_JWT_ACCESS_TOKEN_TTL,
      });
      setJWTService(service);
      console.log('JWT service initialized with keys');
    } catch (error) {
      console.error('Failed to initialize JWT service:', error);
    }
  }
}

// Health check (no rate limit)
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: Date.now(),
    version: '1.0.0',
  });
});

// Mount routes
const routes = createRoutes();
app.route('/', routes);

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
    // Initialize JWT service if not already done
    await initJWTService(env);
    
    // Log request (sanitized)
    const requestId = request.headers.get('X-Request-ID') || crypto.randomUUID();
    console.log(`[${requestId}] ${request.method} ${request.url}`);
    
    const response = await handle(app)(request, env, ctx);
    
    return response;
  },
} satisfies ExportedHandler<Env>;
