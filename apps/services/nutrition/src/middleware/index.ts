/**
 * Request middleware for the Nutrition Worker
 */

import type { Context, Next } from 'hono';
import type { NutritionEnv } from '../types/env';
import { getClientIP, getUserAgent } from './auth';

/**
 * Request ID middleware
 * Adds a unique request ID to each request
 */
export function requestId() {
  return async (c: Context, next: Next) => {
    const requestId = c.req.header('X-Request-ID') || crypto.randomUUID();
    c.set('requestId', requestId);
    c.header('X-Request-ID', requestId);
    await next();
  };
}

/**
 * Error handler middleware
 * Catches errors and returns structured JSON responses
 */
export function errorHandler() {
  return async (c: Context, next: Next) => {
    try {
      await next();
    } catch (error) {
      const requestId = c.get('requestId');
      
      // Handle known error types
      if (error instanceof NutritionError) {
        return c.json(
          {
            error: {
              code: error.code,
              message: error.message,
              requestId,
            },
          },
          error.statusCode
        );
      }
      
      // Log unexpected errors (sanitized)
      console.error(`[${requestId}] Unhandled error:`, {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
      });
      
      // Return generic error for unexpected errors
      return c.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An internal error occurred',
            requestId,
          },
        },
        500
      );
    }
  };
}

/**
 * Custom error class for nutrition service errors
 */
export class NutritionError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'NutritionError';
  }
  
  static notFound(message: string): NutritionError {
    return new NutritionError(message, 'NOT_FOUND', 404);
  }
  
  static unauthorized(message: string = 'Authentication required'): NutritionError {
    return new NutritionError(message, 'UNAUTHORIZED', 401);
  }
  
  static forbidden(message: string = 'Access denied'): NutritionError {
    return new NutritionError(message, 'FORBIDDEN', 403);
  }
  
  static badRequest(message: string): NutritionError {
    return new NutritionError(message, 'VALIDATION_ERROR', 400);
  }
  
  static internal(message: string = 'Internal error'): NutritionError {
    return new NutritionError(message, 'INTERNAL_ERROR', 500);
  }
  
  static rateLimited(message: string = 'Too many requests'): NutritionError {
    return new NutritionError(message, 'RATE_LIMITED', 429);
  }
}

/**
 * CORS middleware
 */
export function cors(allowedOrigins: string[]) {
  return async (c: Context, next: Next) => {
    const origin = c.req.header('Origin');
    
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
  };
}

export { getClientIP, getUserAgent } from './auth';
