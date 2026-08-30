/**
 * Request utilities middleware
 */

import type { Context, Next } from 'hono';

/**
 * Request ID middleware
 * Generates and attaches a unique request ID to each request
 */
export function requestId() {
  return async (c: Context, next: Next) => {
    const requestId =
      c.req.header('X-Request-ID') ||
      crypto.randomUUID();
    
    c.set('requestId', requestId);
    
    // Add to response headers
    await next();
    
    c.res.headers.set('X-Request-ID', requestId);
  };
}

/**
 * CORS middleware for API endpoints
 */
export function cors(allowedOrigins: string[]) {
  return async (c: Context, next: Next) => {
    const origin = c.req.header('Origin');
    
    if (origin && allowedOrigins.some(o => origin === o || o === '*')) {
      c.header('Access-Control-Allow-Origin', origin);
      c.header('Access-Control-Allow-Credentials', 'true');
    }
    
    // Handle preflight
    if (c.req.method === 'OPTIONS') {
      c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
      c.header('Access-Control-Max-Age', '86400');
      return c.text('', 204);
    }
    
    await next();
  };
}

/**
 * Simple rate limiter using in-memory store
 * For production, use Cloudflare Rate Limiting or KV
 */
export function rateLimit(options: {
  windowMs: number;
  max: number;
  keyGenerator?: (c: Context) => string;
}) {
  const store = new Map<string, { count: number; resetAt: number }>();
  
  return async (c: Context, next: Next) => {
    const key = options.keyGenerator
      ? options.keyGenerator(c)
      : c.req.header('CF-Connecting-IP') || 'unknown';
    
    const now = Date.now();
    const record = store.get(key);
    
    if (record) {
      if (now > record.resetAt) {
        // Reset window
        store.set(key, { count: 1, resetAt: now + options.windowMs });
      } else {
        record.count++;
        
        if (record.count > options.max) {
          const retryAfter = Math.ceil((record.resetAt - now) / 1000);
          c.header('Retry-After', String(retryAfter));
          c.header('X-RateLimit-Limit', String(options.max));
          c.header('X-RateLimit-Remaining', '0');
          c.header('X-RateLimit-Reset', String(record.resetAt));
          
          return c.json(
            {
              error: {
                code: 'RATE_LIMITED',
                message: 'Too many requests. Please try again later.',
                requestId: c.get('requestId'),
              },
            },
            429
          );
        }
        
        store.set(key, record);
      }
    } else {
      store.set(key, { count: 1, resetAt: now + options.windowMs });
    }
    
    // Set rate limit headers
    const current = store.get(key)!;
    c.header('X-RateLimit-Limit', String(options.max));
    c.header('X-RateLimit-Remaining', String(Math.max(0, options.max - current.count)));
    c.header('X-RateLimit-Reset', String(current.resetAt));
    
    await next();
  };
}

/**
 * Standard rate limit configurations
 */
export const rateLimits = {
  // Strict: OAuth init, failed auth attempts
  strict: rateLimit({ windowMs: 60 * 1000, max: 5 }),
  
  // Normal: Most authenticated endpoints
  normal: rateLimit({ windowMs: 60 * 1000, max: 100 }),
  
  // Lenient: Health checks, public endpoints
  lenient: rateLimit({ windowMs: 60 * 1000, max: 1000 }),
  
  // By IP: For IP-based rate limiting
  byIP: rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    keyGenerator: (c) => c.req.header('CF-Connecting-IP') || 'unknown',
  }),
};

/**
 * Error handler middleware
 */
export function errorHandler() {
  return async (c: Context, next: Next) => {
    try {
      await next();
    } catch (error) {
      console.error('Unhandled error:', error);
      
      if (error instanceof Error) {
        return c.json(
          {
            error: {
              code: 'INTERNAL_ERROR',
              message: 'An internal error occurred',
              requestId: c.get('requestId'),
            },
          },
          500
        );
      }
      
      return c.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unknown error occurred',
            requestId: c.get('requestId'),
          },
        },
        500
      );
    }
  };
}

/**
 * Security headers middleware
 */
export function securityHeaders() {
  return async (c: Context, next: Next) => {
    await next();
    
    // Prevent clickjacking
    c.header('X-Frame-Options', 'DENY');
    
    // Prevent XSS
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-XSS-Protection', '1; mode=block');
    
    // Content Security Policy
    c.header(
      'Content-Security-Policy',
      "default-src 'none'; frame-ancestors 'none'"
    );
    
    // Strict Transport Security (for HTTPS)
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    // Referrer Policy
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  };
}
