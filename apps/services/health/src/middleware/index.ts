/**
 * Middleware for Health Worker
 */

import type { Context, Next } from 'hono';
import type { HealthEnv } from '../types/env.js';
import { getHealthError, HealthError } from './errors.js';

// Re-export from auth
export { requireAuth, requireActiveUser } from './auth.js';

/**
 * Request ID middleware
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
 */
export function errorHandler() {
  return async (c: Context, next: Next) => {
    try {
      await next();
    } catch (error) {
      const requestId = c.get('requestId') || crypto.randomUUID();
      
      if (error instanceof HealthError) {
        c.status(error.statusCode);
        return c.json({
          error: {
            code: error.code,
            message: error.message,
            requestId,
          },
        });
      }
      
      // Log unexpected errors (sanitized)
      console.error('Unexpected error:', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      c.status(500);
      return c.json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          requestId,
        },
      });
    }
  };
}

/**
 * Rate limiter middleware
 */
export function rateLimiter(
  maxRequests: number = 100,
  windowMs: number = 60000
) {
  // Simple in-memory rate limiter (use KV for production)
  const requests = new Map<string, { count: number; resetAt: number }>();
  
  return async (c: Context, next: Next) => {
    const userId = c.get('userId');
    if (!userId) {
      await next();
      return;
    }
    
    const now = Date.now();
    const key = userId;
    const record = requests.get(key);
    
    if (!record || now > record.resetAt) {
      requests.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      await next();
      return;
    }
    
    if (record.count >= maxRequests) {
      const error = getHealthError('RATE_LIMITED', 'Too many requests');
      throw error;
    }
    
    record.count++;
    await next();
  };
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

/**
 * Timezone parser
 */
export function parseTimezone(request: Request): string {
  const timezoneHeader = request.headers.get('X-Timezone');
  if (timezoneHeader) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezoneHeader });
      return timezoneHeader;
    } catch {
      // Invalid timezone, use UTC
    }
  }
  
  // Try to get from CF header
  const cfTimezone = request.headers.get('CF-IPTimezone');
  if (cfTimezone) {
    return cfTimezone;
  }
  
  return 'UTC';
}

/**
 * Date parser
 */
export function parseDateParam(dateStr: string | undefined, defaultDate: Date = new Date()): string {
  if (!dateStr) {
    return defaultDate.toISOString().split('T')[0];
  }
  
  // Validate format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw getHealthError('VALIDATION_ERROR', 'Invalid date format. Use YYYY-MM-DD');
  }
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw getHealthError('VALIDATION_ERROR', 'Invalid date');
  }
  
  return dateStr;
}

/**
 * Range parser
 */
export function parseRangeParam(rangeStr: string | undefined): '1d' | '7d' | '30d' | '90d' | '1y' {
  const validRanges = ['1d', '7d', '30d', '90d', '1y'];
  const range = rangeStr as '1d' | '7d' | '30d' | '90d' | '1y' | undefined;
  
  if (!range || !validRanges.includes(range)) {
    return '7d';
  }
  
  return range;
}
