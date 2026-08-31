/**
 * AIVO Middleware Package
 * 
 * Shared middleware implementations following SOLID principles:
 * - Single Responsibility: Each middleware does one thing
 * - Open/Closed: Extensible without modification
 * - Liskov Substitution: Swappable implementations
 * - Interface Segregation: Focused, minimal interfaces
 * - Dependency Inversion: Depend on abstractions
 */

export * from './errors.js';
export * from './rate-limiter.js';
export * from './cors.js';
export * from './request-id.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Environment variable interface for services
 */
export interface ServiceEnv {
  ALLOWED_ORIGINS?: string;
  RATE_LIMIT_MAX?: string;
  RATE_LIMIT_WINDOW_MS?: string;
}

/**
 * Standard API error response
 */
export interface ApiError {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: unknown;
  };
}

/**
 * Standard API success response
 */
export interface ApiSuccess<T = unknown> {
  data: T;
  meta?: {
    requestId?: string;
    timestamp?: number;
    version?: string;
  };
}

// =============================================================================
// Re-export commonly used types
// =============================================================================

export type { MiddlewareHandler } from 'hono';
export type { 
  RateLimitConfig, 
  RateLimitStore,
  RateLimitEntry,
  AsyncRateLimitStore
} from './rate-limiter.js';
export type { 
  CORSConfig, 
  CORSOriginValidator 
} from './cors.js';
export type {
  ErrorCode,
  AppError
} from './errors.js';
