/**
 * AIVO API Gateway - Cloudflare Worker
 * 
 * Unified API entry point that routes requests to backend services.
 * Uses Cloudflare Service Bindings for internal networking (production)
 * with HTTP fallback for local development.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { requestId } from 'hono/request-id';
import { secureHeaders } from 'hono/secure-headers';
import { etag } from 'hono/etag';
import type { Context } from 'hono';
import { mountGatewaySwagger } from './swagger';
import type { GatewayEnv } from './env';

// =============================================================================
// Types
// =============================================================================

type ServiceName = 'auth' | 'health' | 'coach' | 'nutrition' | 'mail';

const SERVICE_PATHS: Record<ServiceName, string> = {
  auth: '/api/v1/auth',
  health: '/api/v1/health',
  coach: '/api/v1/coach',
  nutrition: '/api/v1/nutrition',
  mail: '/api/v1/mail',
};

// Legacy path mappings for convenience routes
const LEGACY_PATHS: Record<ServiceName, string> = {
  auth: '/auth',
  health: '/health',
  coach: '/coach',
  nutrition: '/nutrition',
  mail: '/mail',
};

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
 * Get service URL from environment (for local development)
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
 * Get service binding fetcher (for production with Cloudflare)
 */
function getServiceBinding(service: ServiceName, env: GatewayEnv): Fetcher | null {
  const bindings: Record<ServiceName, keyof GatewayEnv> = {
    auth: 'AUTH_SERVICE',
    health: 'HEALTH_SERVICE',
    coach: 'COACH_SERVICE',
    nutrition: 'NUTRITION_SERVICE',
    mail: 'MAIL_SERVICE',
  };
  
  const binding = bindings[service];
  const fetcher = env[binding];
  
  return fetcher && typeof fetcher.fetch === 'function' ? fetcher : null;
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
// Rate Limiter
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
function getRateLimitKey(request: Request): string {
  const ip = request.headers.get('CF-Connecting-IP') || 
             request.headers.get('X-Forwarded-For')?.split(',')[0] ||
             'unknown';
  return `ip:${ip}`;
}

// =============================================================================
// Request Forwarder
// =============================================================================

/**
 * Forward request via Cloudflare Service Binding (production)
 */
async function forwardViaServiceBinding(
  request: Request,
  fetcher: Fetcher
): Promise<Response> {
  const headers = new Headers(request.headers);
  headers.set('X-Gateway-Request', 'true');
  headers.set('X-Forwarded-Host', 'api.aivo.app');
  
  // Get the path without the /api/v1/{service}/ prefix for internal service routing
  // e.g., /api/v1/auth/login -> /login, /api/v1/oauth/start -> /oauth/start
  // Note: auth routes are at root level (/login, not /auth/login)
  const url = new URL(request.url);
  const internalPath = url.pathname.replace(/^\/api\/v1\/(auth)\//, '/').replace(/^\/api\/v1\/(oauth|health|coach|nutrition|mail)\//, '/$1/');
  const internalUrl = `${url.origin}${internalPath}${url.search}`;
  
  const forwardRequest = new Request(internalUrl, {
    method: request.method,
    headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' 
      ? await request.clone().text() 
      : undefined,
  });
  
  try {
    const response = await fetcher.fetch(forwardRequest);
    
    // Log for debugging
    console.log(`[Gateway] Service binding response: ${response.status} for ${internalUrl}`);
    
    // If response indicates the route was not found, throw to trigger HTTP fallback
    // This handles cases where service bindings exist but route mapping differs
    if (response.status === 404) {
      throw new Error(`Service binding returned 404 for ${internalUrl} - route not found in service binding context`);
    }
    
    // Copy response headers
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('X-Gateway-Response', 'true');
    responseHeaders.set('X-Gateway-Binding', 'service');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('[Gateway] Service binding call failed:', error);
    // Re-throw the error so forwardToService can fallback to HTTP
    throw error;
  }
}

/**
 * Forward request via HTTP (local development fallback)
 */
async function forwardViaHttp(
  request: Request,
  serviceUrl: string,
  targetPath: string
): Promise<Response> {
  // Strip /api/v1/{service}/ prefix for internal service routing
  // e.g., /api/v1/auth/login -> /login, /api/v1/oauth/start -> /oauth/start
  // Note: auth routes are at root level (/login, not /auth/login)
  const internalPath = targetPath.replace(/^\/api\/v1\/(auth)\//, '/').replace(/^\/api\/v1\/(oauth|health|coach|nutrition|mail)\//, '/$1/');
  const url = `${serviceUrl}${internalPath}`;
  
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
      // @ts-expect-error - Cloudflare fetch supports timeout
      timeout: 30000,
    });
    
    // Copy response headers
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('X-Gateway-Response', 'true');
    responseHeaders.set('X-Gateway-Binding', 'http');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`[Gateway] HTTP forward failed:`, error);
    return Response.json(
      {
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: `Service is currently unavailable`,
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

/**
 * Forward request to a backend service
 */
async function forwardToService(
  request: Request,
  service: ServiceName,
  env: GatewayEnv,
  path: string
): Promise<Response> {
  // Try to use Cloudflare Service Binding first (production)
  const serviceBinding = getServiceBinding(service, env);
  
  if (serviceBinding) {
    try {
      return await forwardViaServiceBinding(request, serviceBinding);
    } catch (error) {
      console.warn(`[Gateway] Service binding failed for ${service}, falling back to HTTP:`, error);
      // Fall through to HTTP fallback
    }
  }
  
  // Fall back to HTTP for local development
  const serviceUrl = getServiceUrl(service, env);
  return forwardViaHttp(request, serviceUrl, path);
}

// =============================================================================
// Health Check Handler
// =============================================================================

async function healthCheck(env: GatewayEnv): Promise<Response> {
  const services: Record<ServiceName, { status: 'up' | 'down' | 'unknown'; latency?: number; binding: 'service' | 'http' }> = {
    auth: { status: 'unknown', binding: 'http' },
    health: { status: 'unknown', binding: 'http' },
    coach: { status: 'unknown', binding: 'http' },
    nutrition: { status: 'unknown', binding: 'http' },
    mail: { status: 'unknown', binding: 'http' },
  };
  
  // Check each service
  const checks = Object.entries(services).map(async ([name]) => {
    const service = name as ServiceName;
    const start = Date.now();
    
    // Check if using service binding or HTTP
    const binding = getServiceBinding(service, env);
    services[service].binding = binding ? 'service' : 'http';
    
    try {
      if (binding) {
        // Use service binding
        const serviceUrl = getServiceUrl(service, env);
        const response = await binding.fetch(new Request(`${serviceUrl}/health`));
        const latency = Date.now() - start;
        services[service] = { status: response.ok ? 'up' : 'down', latency, binding: 'service' };
      } else {
        // Use HTTP
        const serviceUrl = getServiceUrl(service, env);
        const response = await fetch(`${serviceUrl}/health`, { 
          method: 'GET',
          // @ts-expect-error
          timeout: 5000,
        });
        const latency = Date.now() - start;
        services[service] = { status: response.ok ? 'up' : 'down', latency, binding: 'http' };
      }
    } catch {
      services[service] = { status: 'down', binding: binding ? 'service' : 'http' };
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
  }, {
    status: allUp ? 200 : 503,
  });
}

// =============================================================================
// Main Application
// =============================================================================

// Define context type
type AppContext = {
  Bindings: GatewayEnv;
  Variables: {
    requestId: string;
    userId?: string;
    service?: string;
  };
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

// Mount Swagger documentation
mountGatewaySwagger(app);

// Service proxy routes (standard paths)
app.all('/api/v1/auth/*', async (c) => {
  return forwardToService(c.req.raw, 'auth', c.env, c.req.path);
});

app.all('/api/v1/oauth/*', async (c) => {
  // OAuth routes are handled by the auth service
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

// Convenience routes (short paths mapped to services)
app.all('/auth/*', async (c) => {
  return forwardToService(c.req.raw, 'auth', c.env, `/api/v1${c.req.path}`);
});

app.all('/oauth/*', async (c) => {
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
app.get('/metrics', (c) => {
  const metrics = {
    requests: {
      total: rateLimitStore.size,
      active: Array.from(rateLimitStore.entries())
        .filter(([, v]) => v.resetAt > Date.now())
        .length,
    },
    services: {
      auth: { path: SERVICE_PATHS.auth },
      health: { path: SERVICE_PATHS.health },
      coach: { path: SERVICE_PATHS.coach },
      nutrition: { path: SERVICE_PATHS.nutrition },
      mail: { path: SERVICE_PATHS.mail },
    },
    version: '1.0.0',
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
      details: err.message,
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
    const reqId = request.headers.get('X-Request-ID') || crypto.randomUUID();
    
    console.log(`[Gateway] ${request.method} ${request.url}`, {
      requestId: reqId,
      cf: request.cf,
    });
    
    return app.fetch(request, env as unknown as Context, ctx);
  },
};
