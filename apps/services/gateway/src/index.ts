/**
 * AIVO API Gateway - Cloudflare Worker
 * 
 * Unified API entry point that routes requests to backend services.
 * Handles cross-cutting concerns: authentication, rate limiting, CORS, logging.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { requestId } from 'hono/request-id';
import { secureHeaders } from 'hono/secure-headers';
import { etag } from 'hono/etag';
import type { CloudflareVariables, Context } from 'hono';

// =============================================================================
// Environment Types
// =============================================================================

export interface GatewayEnv {
  // Service URLs
  AUTH_SERVICE_URL: string;
  HEALTH_SERVICE_URL: string;
  COACH_SERVICE_URL: string;
  NUTRITION_SERVICE_URL: string;
  MAIL_SERVICE_URL: string;
  
  // CORS Configuration
  ALLOWED_ORIGINS: string;
  
  // Rate Limiting
  RATE_LIMIT_MAX: string;
  RATE_LIMIT_WINDOW_MS: string;
  
  // Feature Flags
  ENABLE_SWAGGER: string;
  ENABLE_METRICS: string;
  
  // Auth
  API_KEY: string;
  
  // Cloudflare bindings
  ASSETS?: { fetch: (req: Request) => Promise<Response> };
}

// =============================================================================
// Constants
// =============================================================================

const SERVICE_ROUTES = {
  auth: '/api/v1/auth/*',
  health: '/api/v1/health/*',
  coach: '/api/v1/coach/*',
  nutrition: '/api/v1/nutrition/*',
  mail: '/api/v1/mail/*',
} as const;

const SERVICE_PATHS = {
  auth: ['/auth'],
  health: ['/health'],
  coach: ['/coach'],
  nutrition: ['/nutrition'],
  mail: ['/mail'],
} as const;

type ServiceName = keyof typeof SERVICE_ROUTES;

// =============================================================================
// Response Types
// =============================================================================

interface ApiResponse<T = unknown> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    requestId: string;
    timestamp: number;
    version: string;
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Parse allowed origins from environment
 */
function getAllowedOrigins(env: GatewayEnv): string[] {
  const defaults = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://aivo.app',
    'https://www.aivo.app',
  ];
  
  if (env.ALLOWED_ORIGINS) {
    const configured = env.ALLOWED_ORIGINS.split(',')
      .map(s => s.trim())
      .filter(Boolean);
    return [...new Set([...defaults, ...configured])];
  }
  
  return defaults;
}

/**
 * Get service URL from environment
 */
function getServiceUrl(service: ServiceName, env: GatewayEnv): string {
  const urls: Record<ServiceName, string> = {
    auth: env.AUTH_SERVICE_URL || 'http://localhost:3001',
    health: env.HEALTH_SERVICE_URL || 'http://localhost:3002',
    coach: env.COACH_SERVICE_URL || 'http://localhost:3003',
    nutrition: env.NUTRITION_SERVICE_URL || 'http://localhost:3004',
    mail: env.MAIL_SERVICE_URL || 'http://localhost:3005',
  };
  return urls[service];
}

/**
 * Get rate limit configuration
 */
function getRateLimitConfig(env: GatewayEnv): { max: number; windowMs: number } {
  return {
    max: parseInt(env.RATE_LIMIT_MAX || '100', 10),
    windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  };
}

/**
 * Validate API key (if configured)
 */
function validateApiKey(request: Request, env: GatewayEnv): boolean {
  if (!env.API_KEY) return true; // No API key configured, skip validation
  
  const apiKey = request.headers.get('X-API-Key');
  return apiKey === env.API_KEY;
}

// =============================================================================
// Rate Limiter (In-memory for single instance, use KV for production)
// =============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  // Clean up expired entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore) {
      if (v.resetAt < now) rateLimitStore.delete(k);
    }
  }
  
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, resetAt: now + windowMs };
  }
  
  if (entry.count >= max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  
  entry.count++;
  return { allowed: true, remaining: max - entry.count, resetAt: entry.resetAt };
}

/**
 * Get rate limit key from request
 */
function getRateLimitKey(request: Request, userId?: string): string {
  const ip = request.headers.get('CF-Connecting-IP') || 
             request.headers.get('X-Forwarded-For')?.split(',')[0] ||
             'unknown';
  return userId ? `user:${userId}` : `ip:${ip}`;
}

// =============================================================================
// Request Forwarder
// =============================================================================

/**
 * Forward request to a backend service
 */
async function forwardToService(
  request: Request,
  service: ServiceName,
  env: GatewayEnv,
  path: string
): Promise<Response> {
  const serviceUrl = getServiceUrl(service, env);
  const targetPath = path.replace(SERVICE_PATHS[service][0], '');
  const url = `${serviceUrl}${targetPath}`;
  
  // Clone request and modify URL
  const headers = new Headers(request.headers);
  headers.set('X-Gateway-Request', 'true');
  headers.set('X-Forwarded-Host', 'api.aivo.app');
  
  const forwardRequest = new Request(url, {
    method: request.method,
    headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' 
      ? await request.clone().text() 
      : undefined,
    redirect: 'manual',
  });
  
  try {
    const response = await fetch(forwardRequest, {
      // @ts-expect-error - Cloudflare fetch supports this
      timeout: 30000,
    });
    
    // Copy response headers
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('X-Gateway-Response', 'true');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`[Gateway] Failed to forward to ${service}:`, error);
    return Response.json(
      {
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: `Service ${service} is currently unavailable`,
        },
        meta: {
          requestId: request.headers.get('X-Request-ID'),
          timestamp: Date.now(),
          version: '1.0.0',
        },
      },
      { status: 503 }
    );
  }
}

// =============================================================================
// Health Check Handler
// =============================================================================

async function healthCheck(env: GatewayEnv): Promise<Response> {
  const services: Record<ServiceName, { status: 'up' | 'down' | 'unknown'; latency?: number }> = {
    auth: { status: 'unknown' },
    health: { status: 'unknown' },
    coach: { status: 'unknown' },
    nutrition: { status: 'unknown' },
    mail: { status: 'unknown' },
  };
  
  // Check each service
  const checks = Object.entries(services).map(async ([name, _]) => {
    const service = name as ServiceName;
    const start = Date.now();
    try {
      const url = getServiceUrl(service, env);
      const response = await fetch(`${url}/health`, { 
        method: 'GET',
        // @ts-expect-error
        timeout: 5000,
      });
      const latency = Date.now() - start;
      services[service] = { status: response.ok ? 'up' : 'down', latency };
    } catch {
      services[service] = { status: 'down' };
    }
  });
  
  await Promise.allSettled(checks);
  
  const allUp = Object.values(services).every(s => s.status === 'up');
  const overallStatus = allUp ? 'healthy' : 'degraded';
  
  return Response.json({
    status: overallStatus,
    version: '1.0.0',
    timestamp: Date.now(),
    services,
    uptime: process.uptime ? process.uptime() : 0,
  }, {
    status: allUp ? 200 : 503,
  });
}

// =============================================================================
// API Documentation Handler
// =============================================================================

function getApiDocs(): Response {
  const docs = {
    openapi: '3.0.0',
    info: {
      title: 'AIVO API Gateway',
      version: '1.0.0',
      description: 'Unified API gateway for AIVO health and fitness platform',
    },
    servers: [
      { url: 'https://api.aivo.app', description: 'Production' },
      { url: 'http://localhost:3000', description: 'Development' },
    ],
    paths: {
      '/api/v1/auth': {
        get: {
          summary: 'Auth service proxy',
          description: 'Forwards to auth service',
        },
      },
      '/api/v1/health': {
        get: {
          summary: 'Health service proxy',
          description: 'Forwards to health service',
        },
      },
      '/api/v1/coach': {
        get: {
          summary: 'Coach service proxy',
          description: 'Forwards to coach service',
        },
      },
      '/api/v1/nutrition': {
        get: {
          summary: 'Nutrition service proxy',
          description: 'Forwards to nutrition service',
        },
      },
      '/api/v1/mail': {
        get: {
          summary: 'Mail service proxy',
          description: 'Forwards to mail service',
        },
      },
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
        },
      },
    },
  };
  
  return Response.json(docs);
}

// =============================================================================
// Main Application
// =============================================================================

type AppContext = {
  Variables: CloudflareVariables & {
    requestId: string;
    userId?: string;
    service?: ServiceName;
  };
  Bindings: GatewayEnv;
};

const app = new Hono<AppContext>();

// Middleware
app.use('*', logger());
app.use('*', requestId());
app.use('*', etag());
app.use('*', secureHeaders());

// CORS
app.use('*', cors({
  origin: (origin, c) => {
    const allowed = getAllowedOrigins(c.env);
    if (allowed.includes('*') || allowed.includes(origin)) return origin;
    return allowed[0];
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
  credentials: true,
  maxAge: 86400,
}));

// Rate limiting middleware
app.use('*', async (c, next) => {
  const config = getRateLimitConfig(c.env);
  const rateLimitKey = getRateLimitKey(c.req.raw);
  const { allowed, remaining, resetAt } = checkRateLimit(
    rateLimitKey,
    config.max,
    config.windowMs
  );
  
  // Set rate limit headers
  c.header('X-RateLimit-Limit', String(config.max));
  c.header('X-RateLimit-Remaining', String(remaining));
  c.header('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));
  
  if (!allowed) {
    return c.json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please try again later.',
      },
      meta: {
        requestId: c.get('requestId'),
        timestamp: Date.now(),
        version: '1.0.0',
      },
    }, 429);
  }
  
  await next();
});

// API Key validation
app.use('*', async (c, next) => {
  if (!validateApiKey(c.req.raw, c.env)) {
    return c.json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or missing API key',
      },
      meta: {
        requestId: c.get('requestId'),
        timestamp: Date.now(),
        version: '1.0.0',
      },
    }, 401);
  }
  await next();
});

// =============================================================================
// Routes
// =============================================================================

// Health check (no auth required)
app.get('/health', (c) => healthCheck(c.env));
app.head('/health', (c) => healthCheck(c.env));

// API documentation
app.get('/docs', (c) => getApiDocs());
app.get('/swagger', (c) => getApiDocs());

// Service proxy routes
app.all('/api/v1/auth/*', async (c) => {
  return forwardToService(c.req.raw, 'auth', c.env, c.req.path);
});

app.all('/api/v1/health/*', async (c) => {
  return forwardToService(c.req.raw, 'health', c.env, c.req.path);
});

app.all('/api/v1/coach/*', async (c) => {
  return forwardToService(c.req.raw, 'coach', c.env, c.req.path);
});

app.all('/api/v1/nutrition/*', async (c) => {
  return forwardToService(c.req.raw, 'nutrition', c.env, c.req.path);
});

app.all('/api/v1/mail/*', async (c) => {
  return forwardToService(c.req.raw, 'mail', c.env, c.req.path);
});

// Convenience routes (mapped to services)
app.all('/auth/*', async (c) => {
  return forwardToService(c.req.raw, 'auth', c.env, `/api/v1${c.req.path}`);
});

app.all('/health/*', async (c) => {
  return forwardToService(c.req.raw, 'health', c.env, `/api/v1${c.req.path}`);
});

app.all('/coach/*', async (c) => {
  return forwardToService(c.req.raw, 'coach', c.env, `/api/v1${c.req.path}`);
});

app.all('/nutrition/*', async (c) => {
  return forwardToService(c.req.raw, 'nutrition', c.env, `/api/v1${c.req.path}`);
});

app.all('/mail/*', async (c) => {
  return forwardToService(c.req.raw, 'mail', c.env, `/api/v1${c.req.path}`);
});

// Metrics endpoint
app.get('/metrics', async (c) => {
  const metrics = {
    requests: {
      total: rateLimitStore.size,
      active: Array.from(rateLimitStore.entries())
        .filter(([_, v]) => v.resetAt > Date.now())
        .length,
    },
    services: Object.fromEntries(
      Object.entries(SERVICE_PATHS).map(([name, paths]) => [name, { paths }])
    ) as Record<ServiceName, { paths: string[] }>,
  };
  return c.json(metrics);
});

// 404 handler
app.notFound((c) => {
  return c.json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${c.req.method} ${c.req.path} not found`,
    },
    meta: {
      requestId: c.get('requestId'),
      timestamp: Date.now(),
      version: '1.0.0',
    },
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error(`[Gateway Error] ${err.message}`, err);
  
  return c.json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    },
    meta: {
      requestId: c.get('requestId'),
      timestamp: Date.now(),
      version: '1.0.0',
    },
  }, 500);
});

// =============================================================================
// Export Worker
// =============================================================================

export default {
  async fetch(request: Request, env: GatewayEnv, ctx: ExecutionContext): Promise<Response> {
    const requestId = request.headers.get('X-Request-ID') || crypto.randomUUID();
    
    console.log(`[Gateway] ${request.method} ${request.url}`, {
      requestId,
      cf: request.cf,
    });
    
    return app.fetch(request, env as unknown as Context, ctx);
  },
} satisfies ExportedHandler<GatewayEnv>;
