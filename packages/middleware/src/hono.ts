/**
 * Hono Middleware Adapters
 * 
 * Hono-specific middleware implementations that wrap core functionality.
 * Follows Adapter Pattern: bridges core middleware to Hono's interface.
 */

import type { MiddlewareHandler } from 'hono';
import type { Context } from 'hono';

import {
  AppError,
  isAppError,
  getStatusCode,
  fromZodError,
  type ErrorCode,
} from './errors.js';

import {
  type RateLimitConfig,
  type RateLimitStore,
  type RateLimitResult,
  MemoryRateLimitStore,
  checkRateLimit,
  getRateLimitKey,
  parseRateLimitConfig,
} from './rate-limiter.js';

import {
  type CORSConfig,
  createCORSValidator,
  parseOriginsFromEnv,
} from './cors.js';

import {
  generateRequestId,
  extractRequestId,
  sanitizeRequestId,
} from './request-id.js';

// =============================================================================
// Context Keys
// =============================================================================

export const REQUEST_ID_KEY = 'requestId';
export const RATE_LIMIT_KEY = 'rateLimit';
export const USER_ID_KEY = 'userId';

// =============================================================================
// Request ID Middleware (Hono)
// =============================================================================

/**
 * Hono middleware for request ID handling
 */
export function requestId(options?: {
  headerName?: string;
  responseHeaderName?: string;
}): MiddlewareHandler {
  const opts = {
    headerName: options?.headerName || 'X-Request-ID',
    responseHeaderName: options?.responseHeaderName || 'X-Request-ID',
  };

  return async (c, next) => {
    // Get or generate request ID
    const incomingId = extractRequestId(c.req.raw, opts.headerName);
    const requestId = incomingId && sanitizeRequestId(incomingId)
      ? sanitizeRequestId(incomingId)
      : generateRequestId();

    // Store in context
    c.set(REQUEST_ID_KEY, requestId);

    // Set response header
    c.header(opts.responseHeaderName, requestId);

    // Add to logging context
    console.log(`[${requestId}] ${c.req.method} ${new URL(c.req.url).pathname}`);

    await next();
  };
}

/**
 * Get request ID from context
 */
export function getRequestId(c: Context): string {
  return c.get(REQUEST_ID_KEY) || 'unknown';
}

// =============================================================================
// Error Handler Middleware (Hono)
// =============================================================================

/**
 * Hono middleware for error handling
 */
export function errorHandler(options?: {
  includeStack?: boolean;
  logErrors?: boolean;
}): MiddlewareHandler {
  const opts = {
    includeStack: options?.includeStack ?? false,
    logErrors: options?.logErrors ?? true,
  };

  return async (c, next) => {
    try {
      await next();
    } catch (error) {
      const requestId = getRequestId(c);

      // Log error if enabled
      if (opts.logErrors) {
        logError(requestId, error);
      }

      // Handle AppError
      if (isAppError(error)) {
        const response: Record<string, unknown> = {
          error: {
            code: error.code,
            message: error.message,
            requestId,
            ...(error.details && { details: error.details }),
          },
        };

        // Add stack trace in development
        if (opts.includeStack && error.stack) {
          (response.error as Record<string, unknown>).stack = error.stack
            .split('\n')
            .slice(0, 5);
        }

        // Handle rate limit with Retry-After header
        if (error.name === 'RateLimitError') {
          c.header('Retry-After', String((error as { retryAfter?: number }).retryAfter || 60));
        }

        return c.json(response, error.statusCode);
      }

      // Handle Zod errors
      if (error instanceof Error && error.name === 'ZodError') {
        return c.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request data',
              requestId,
              details: fromZodError(error).details,
            },
          },
          400
        );
      }

      // Handle unknown errors
      const message = error instanceof Error ? error.message : 'Unknown error';
      const response: Record<string, unknown> = {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
          requestId,
        },
      };

      if (opts.includeStack && error instanceof Error && error.stack) {
        (response.error as Record<string, unknown>).stack = error.stack
          .split('\n')
          .slice(0, 5);
      }

      return c.json(response, getStatusCode(error));
    }
  };
}

/**
 * Log error to console
 */
function logError(requestId: string, error: unknown): void {
  if (error instanceof Error) {
    console.error(`[${requestId}] Error:`, {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5),
    });
  } else {
    console.error(`[${requestId}] Unknown error:`, error);
  }
}

// =============================================================================
// Rate Limit Middleware (Hono)
// =============================================================================

// Store instance (can be replaced)
let rateLimitStore: RateLimitStore = new MemoryRateLimitStore();

/**
 * Set custom rate limit store
 */
export function setRateLimitStore(store: RateLimitStore): void {
  rateLimitStore = store;
}

/**
 * Get current rate limit store
 */
export function getRateLimitStore(): RateLimitStore {
  return rateLimitStore;
}

/**
 * Hono middleware for rate limiting
 */
export function rateLimit(config?: RateLimitConfig): MiddlewareHandler {
  return async (c, next) => {
    // Get configuration
    const rateLimitConfig = config || parseRateLimitConfig({
      RATE_LIMIT_MAX: c.env.RATE_LIMIT_MAX as string | undefined,
      RATE_LIMIT_WINDOW_MS: c.env.RATE_LIMIT_WINDOW_MS as string | undefined,
    });

    // Get user ID if authenticated
    const userId = c.get(USER_ID_KEY);

    // Get rate limit key
    const key = getRateLimitKey(c.req.raw, {
      userId: userId as string | undefined,
    });

    // Check rate limit
    const result = checkRateLimit(key, rateLimitConfig, rateLimitStore);

    // Set rate limit headers
    setRateLimitHeaders(c, result);

    // Reject if rate limited
    if (!result.allowed) {
      return c.json(
        {
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests',
            requestId: getRequestId(c),
          },
        },
        429
      );
    }

    await next();
  };
}

/**
 * Set rate limit headers on response
 */
function setRateLimitHeaders(c: Context, result: RateLimitResult): void {
  c.header('X-RateLimit-Limit', String(result.limit));
  c.header('X-RateLimit-Remaining', String(result.remaining));
  c.header('X-RateLimit-Reset', String(result.resetAt));
}

// =============================================================================
// CORS Middleware (Hono)
// =============================================================================

/**
 * Hono middleware for CORS handling
 */
export function cors(options?: CORSConfig): MiddlewareHandler {
  const validator = createCORSValidator(options || {});

  return async (c, next) => {
    const origin = c.req.header('Origin');
    const allowedOrigin = validator.validateOrigin(origin, c.req.raw);

    if (allowedOrigin) {
      c.header('Access-Control-Allow-Origin', allowedOrigin);
      c.header('Access-Control-Allow-Credentials', 'true');

      if (c.req.method === 'OPTIONS') {
        const config = options || {};
        c.header(
          'Access-Control-Allow-Methods',
          (config.methods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']).join(', ')
        );
        c.header(
          'Access-Control-Allow-Headers',
          (config.headers || ['Content-Type', 'Authorization', 'X-Request-ID']).join(', ')
        );
        c.header(
          'Access-Control-Max-Age',
          String(config.maxAge || 86400)
        );
        return c.text('', 200);
      }
    }

    await next();
  };
}

// =============================================================================
// Combined Security Middleware
// =============================================================================

/**
 * Create security headers middleware
 */
export function securityHeaders(): MiddlewareHandler {
  return async (c, next) => {
    // Basic security headers
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('X-XSS-Protection', '1; mode=block');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    await next();
  };
}

/**
 * Create standard service middleware stack
 */
export function createServiceMiddleware(options?: {
  env?: Record<string, string | undefined>;
  rateLimitConfig?: RateLimitConfig;
  corsConfig?: CORSConfig;
}): MiddlewareHandler[] {
  const env = options?.env || {};
  const corsConfig = options?.corsConfig || {
    origins: parseOriginsFromEnv(env.ALLOWED_ORIGINS),
  };
  const rateLimitConfig = options?.rateLimitConfig || parseRateLimitConfig(env);

  return [
    requestId(),
    securityHeaders(),
    cors(corsConfig),
    rateLimit(rateLimitConfig),
    errorHandler(),
  ];
}
