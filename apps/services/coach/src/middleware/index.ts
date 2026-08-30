/**
 * Coach Service - Middleware
 */

import type { MiddleureHandler } from 'hono';
import type { CoachEnv, CoachContext } from '../env.d';

// Rate limiting state (in production, use KV for distributed state)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Request ID middleware
 * Adds a unique request ID to each request
 */
export const requestId = (): MiddleureHandler<CoachContext> => {
  return async (c, next) => {
    const requestId = c.req.header('X-Request-ID') || crypto.randomUUID();
    c.set('requestId', requestId);
    c.header('X-Request-ID', requestId);
    await next();
  };
};

/**
 * Error handler middleware
 * Formats errors consistently
 */
export const errorHandler = (): MiddleureHandler<CoachContext> => {
  return async (c, next) => {
    try {
      await next();
    } catch (error) {
      const requestId = c.get('requestId');
      
      if (error instanceof Error) {
        // Log error (sanitized)
        console.error(`[${requestId}] Error:`, {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 5), // First 5 lines only
        });
        
        // Check for known error types
        if (error.name === 'ZodError') {
          return c.json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request data',
              requestId,
              details: extractZodErrors(error),
            },
          }, 400);
        }
        
        if (error.name === 'AuthError') {
          return c.json({
            error: {
              code: 'UNAUTHORIZED',
              message: error.message,
              requestId,
            },
          }, 401);
        }
        
        if (error.name === 'ForbiddenError') {
          return c.json({
            error: {
              code: 'FORBIDDEN',
              message: error.message,
              requestId,
            },
          }, 403);
        }
        
        if (error.name === 'NotFoundError') {
          return c.json({
            error: {
              code: 'NOT_FOUND',
              message: error.message,
              requestId,
            },
          }, 404);
        }
      }
      
      // Generic error response
      return c.json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
          requestId,
        },
      }, 500);
    }
  };
};

/**
 * Rate limiting middleware
 */
export const rateLimit = (): MiddleureHandler<CoachContext> => {
  return async (c, next) => {
    // Get rate limit config
    const maxRequests = parseInt(c.env.RATE_LIMIT_REQUESTS || '100', 10);
    const windowMs = parseInt(c.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
    
    // Use IP address as identifier
    const ip = c.req.header('CF-Connecting-IP') || 
               c.req.header('X-Forwarded-For')?.split(',')[0] || 
               'unknown';
    
    const now = Date.now();
    const key = `rate_limit:${ip}`;
    
    // Get current state
    let state = rateLimitStore.get(key);
    
    if (!state || now > state.resetTime) {
      // Start new window
      state = {
        count: 0,
        resetTime: now + windowMs,
      };
    }
    
    // Check limit
    if (state.count >= maxRequests) {
      const retryAfter = Math.ceil((state.resetTime - now) / 1000);
      c.header('Retry-After', retryAfter.toString());
      c.header('X-RateLimit-Limit', maxRequests.toString());
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', state.resetTime.toString());
      
      return c.json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          requestId: c.get('requestId'),
        },
      }, 429);
    }
    
    // Increment counter
    state.count++;
    rateLimitStore.set(key, state);
    
    // Add rate limit headers
    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', (maxRequests - state.count).toString());
    c.header('X-RateLimit-Reset', state.resetTime.toString());
    
    await next();
  };
};

/**
 * CORS middleware
 */
export const cors = (options?: {
  allowedOrigins?: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  maxAge?: number;
}): MiddleureHandler<CoachContext> => {
  const {
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization', 'X-Request-ID'],
    maxAge = 86400,
  } = options || {};
  
  return async (c, next) => {
    const origin = c.req.header('Origin');
    
    if (origin) {
      // Check if origin is allowed
      c.header('Access-Control-Allow-Origin', origin);
      c.header('Access-Control-Allow-Credentials', 'true');
    }
    
    if (c.req.method === 'OPTIONS') {
      c.header('Access-Control-Allow-Methods', allowedMethods.join(', '));
      c.header('Access-Control-Allow-Headers', allowedHeaders.join(', '));
      c.header('Access-Control-Max-Age', maxAge.toString());
      return c.text('', 200);
    }
    
    await next();
  };
};

// Helper functions
function extractZodErrors(error: Error): Array<{ field: string; message: string }> {
  try {
    const zodError = error as any;
    if (zodError.errors && Array.isArray(zodError.errors)) {
      return zodError.errors.map((e: any) => ({
        field: e.path.join('.') || 'unknown',
        message: e.message,
      }));
    }
  } catch {
    // Ignore
  }
  return [];
}

// Custom error classes
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  public errors: Array<{ field: string; message: string }>;
  
  constructor(errors: Array<{ field: string; message: string }>) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}
