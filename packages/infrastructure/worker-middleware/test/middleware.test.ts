/**
 * Middleware Package Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  // Error classes
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  InternalError,
  isAppError,
  isRetryable,
  getStatusCode,
  fromZodError,
} from '../src/errors';

import {
  // Rate limiter
  MemoryRateLimitStore,
  checkRateLimit,
  getRateLimitKey,
  parseRateLimitConfig,
  type RateLimitConfig,
} from '../src/rate-limiter';

import {
  // CORS
  parseOriginsFromEnv,
  createOriginValidator,
  createCORSValidator,
} from '../src/cors';

import {
  // Request ID
  generateRequestId,
  extractRequestId,
  sanitizeRequestId,
  isValidRequestId,
} from '../src/request-id';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with all properties', () => {
      const error = new AppError('VALIDATION_ERROR', 'Invalid input', 400, { field: 'email' });
      
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'email' });
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('AppError');
    });

    it('should serialize to JSON correctly', () => {
      const error = new AppError('NOT_FOUND', 'User not found', 404);
      const json = error.toJSON();
      
      expect(json).toEqual({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    });

    it('should include details in JSON when present', () => {
      const error = new AppError('VALIDATION_ERROR', 'Invalid', 400, { issues: [] });
      const json = error.toJSON();
      
      expect(json).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Invalid',
        details: { issues: [] },
      });
    });
  });

  describe('Error subclasses', () => {
    it('should create ValidationError with correct status', () => {
      const error = new ValidationError('Invalid email', { field: 'email' });
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should create UnauthorizedError with correct status', () => {
      const error = new UnauthorizedError();
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Authentication required');
    });

    it('should create ForbiddenError with correct status', () => {
      const error = new ForbiddenError();
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
      expect(error.message).toBe('Access denied');
    });

    it('should create NotFoundError with formatted message', () => {
      const error = new NotFoundError('User');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('User not found');
    });

    it('should create RateLimitError with retryAfter', () => {
      const error = new RateLimitError(60);
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMITED');
      expect(error.retryAfter).toBe(60);
    });

    it('should create InternalError with default message', () => {
      const error = new InternalError();
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('Error utilities', () => {
    it('should identify AppError correctly', () => {
      expect(isAppError(new ValidationError('test'))).toBe(true);
      expect(isAppError(new Error())).toBe(false);
      expect(isAppError(null)).toBe(false);
    });

    it('should identify retryable errors', () => {
      expect(isRetryable(new InternalError())).toBe(true);
      expect(isRetryable(new RateLimitError(60))).toBe(true);
      expect(isRetryable(new ValidationError('test'))).toBe(false);
    });

    it('should get correct status codes', () => {
      expect(getStatusCode(new ValidationError('test'))).toBe(400);
      expect(getStatusCode(new UnauthorizedError())).toBe(401);
      expect(getStatusCode(new Error())).toBe(500);
    });
  });

  describe('fromZodError', () => {
    it('should convert Zod error to ValidationError', () => {
      const zodError = {
        issues: [
          { path: ['email'], message: 'Invalid email' },
          { path: ['password'], message: 'Too short' },
        ],
      };
      
      const error = fromZodError(zodError);
      
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.details).toEqual({
        issues: [
          { field: 'email', message: 'Invalid email' },
          { field: 'password', message: 'Too short' },
        ],
        path: [],
      });
    });
  });
});

describe('Rate Limiter', () => {
  let store: MemoryRateLimitStore;

  beforeEach(() => {
    store = new MemoryRateLimitStore();
  });

  afterEach(() => {
    store.clear();
  });

  describe('MemoryRateLimitStore', () => {
    it('should store and retrieve entries', () => {
      store.set('test-key', { count: 5, resetAt: Date.now() + 60000 });
      const entry = store.get('test-key');
      
      expect(entry).toEqual({ count: 5, resetAt: expect.any(Number) });
    });

    it('should return undefined for expired entries', () => {
      store.set('test-key', { count: 5, resetAt: Date.now() - 1000 });
      const entry = store.get('test-key');
      
      expect(entry).toBeUndefined();
    });

    it('should delete entries', () => {
      store.set('test-key', { count: 5, resetAt: Date.now() + 60000 });
      store.delete('test-key');
      
      expect(store.get('test-key')).toBeUndefined();
    });

    it('should report size', () => {
      store.set('key1', { count: 1, resetAt: Date.now() + 60000 });
      store.set('key2', { count: 2, resetAt: Date.now() + 60000 });
      
      expect(store.size).toBe(2);
    });

    it('should cleanup on set when at capacity', () => {
      // Fill store
      for (let i = 0; i < 100; i++) {
        store.set(`key${i}`, { count: i, resetAt: Date.now() + 60000 });
      }
      
      // Set with expired key should cleanup
      store.set('expired-key', { count: 1, resetAt: Date.now() - 1000 });
      
      expect(store.get('expired-key')).toBeUndefined();
    });
  });

  describe('checkRateLimit', () => {
    const config: RateLimitConfig = { max: 10, windowMs: 60000 };

    it('should allow request within limit', () => {
      const result = checkRateLimit('test-key', config, store);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      expect(result.limit).toBe(10);
    });

    it('should decrement remaining count', () => {
      checkRateLimit('test-key', config, store);
      const result = checkRateLimit('test-key', config, store);
      
      expect(result.remaining).toBe(8);
    });

    it('should block request when limit reached', () => {
      // Exhaust limit
      for (let i = 0; i < 10; i++) {
        checkRateLimit('test-key', config, store);
      }
      
      const result = checkRateLimit('test-key', config, store);
      
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset after window expires', () => {
      // Set up with past reset time
      store.set('test-key', { count: 10, resetAt: Date.now() - 1000 });
      
      const result = checkRateLimit('test-key', config, store);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });
  });

  describe('getRateLimitKey', () => {
    it('should use user ID if provided', () => {
      const request = new Request('http://localhost/test');
      const key = getRateLimitKey(request, { userId: 'user-123' });
      
      expect(key).toBe('user:user-123');
    });

    it('should use IP from CF-Connecting-IP header', () => {
      const request = new Request('http://localhost/test', {
        headers: { 'CF-Connecting-IP': '192.168.1.1' },
      });
      const key = getRateLimitKey(request);
      
      expect(key).toBe('ip:192.168.1.1');
    });

    it('should use X-Forwarded-For header', () => {
      const request = new Request('http://localhost/test', {
        headers: { 'X-Forwarded-For': '10.0.0.1, 192.168.1.1' },
      });
      const key = getRateLimitKey(request);
      
      expect(key).toBe('ip:10.0.0.1');
    });

    it('should include path when option enabled', () => {
      const request = new Request('http://localhost/api/users');
      const key = getRateLimitKey(request, { includePath: true });
      
      expect(key).toContain(':');
      expect(key).toContain('/api/users');
    });
  });

  describe('parseRateLimitConfig', () => {
    it('should parse from environment', () => {
      const config = parseRateLimitConfig({
        RATE_LIMIT_MAX: '50',
        RATE_LIMIT_WINDOW_MS: '30000',
      });
      
      expect(config.max).toBe(50);
      expect(config.windowMs).toBe(30000);
    });

    it('should use defaults for missing values', () => {
      const config = parseRateLimitConfig({});
      
      expect(config.max).toBe(100);
      expect(config.windowMs).toBe(60000);
    });
  });
});

describe('CORS', () => {
  describe('parseOriginsFromEnv', () => {
    it('should parse comma-separated origins', () => {
      const origins = parseOriginsFromEnv('https://a.com,https://b.com');
      
      expect(origins).toEqual(['https://a.com', 'https://b.com']);
    });

    it('should deduplicate origins', () => {
      const origins = parseOriginsFromEnv('https://a.com,https://a.com');
      
      expect(origins).toEqual(['https://a.com']);
    });

    it('should merge with defaults', () => {
      const origins = parseOriginsFromEnv('https://new.com', ['https://default.com']);
      
      expect(origins).toContain('https://default.com');
      expect(origins).toContain('https://new.com');
    });

    it('should return defaults when env is undefined', () => {
      const origins = parseOriginsFromEnv(undefined, ['https://default.com']);
      
      expect(origins).toEqual(['https://default.com']);
    });
  });

  describe('createOriginValidator', () => {
    const validator = createOriginValidator([
      'https://aivo.app',
      'https://*.example.com',
      '*',
    ]);

    it('should allow exact match', () => {
      const request = new Request('http://localhost');
      expect(validator('https://aivo.app', request)).toBe('https://aivo.app');
    });

    it('should allow subdomain wildcard', () => {
      const request = new Request('http://localhost');
      expect(validator('https://app.example.com', request)).toBe('https://app.example.com');
    });

    it('should allow wildcard', () => {
      const request = new Request('http://localhost');
      expect(validator('https://anything.com', request)).toBe('https://anything.com');
    });

    it('should reject non-matching origin', () => {
      const request = new Request('http://localhost');
      expect(validator('https://other.com', request)).toBeNull();
    });

    it('should handle null origin', () => {
      const request = new Request('http://localhost');
      expect(validator(null, request)).toBeNull();
    });
  });
});

describe('Request ID', () => {
  describe('generateRequestId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      
      expect(id1).not.toBe(id2);
    });

    it('should generate valid format', () => {
      const id = generateRequestId();
      
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      expect(id.length).toBeLessThanOrEqual(100);
    });
  });

  describe('extractRequestId', () => {
    it('should extract from header', () => {
      const request = new Request('http://localhost', {
        headers: { 'X-Request-ID': 'test-123' },
      });
      
      expect(extractRequestId(request)).toBe('test-123');
    });

    it('should return null when header missing', () => {
      const request = new Request('http://localhost');
      
      expect(extractRequestId(request)).toBeNull();
    });
  });

  describe('sanitizeRequestId', () => {
    it('should remove invalid characters', () => {
      expect(sanitizeRequestId('abc123-xyz')).toBe('abc123-xyz');
      expect(sanitizeRequestId('abc< script >xyz')).toBe('abcxy z');
      expect(sanitizeRequestId('test\n\r\nalert()')).toBe('testalert');
    });

    it('should truncate to 64 characters', () => {
      const longId = 'a'.repeat(100);
      expect(sanitizeRequestId(longId).length).toBe(64);
    });
  });

  describe('isValidRequestId', () => {
    it('should validate correct IDs', () => {
      expect(isValidRequestId('abc123')).toBe(true);
      expect(isValidRequestId('test-uuid-123')).toBe(true);
      expect(isValidRequestId('ID_123')).toBe(true);
    });

    it('should reject invalid IDs', () => {
      expect(isValidRequestId('')).toBe(false);
      expect(isValidRequestId('a'.repeat(200))).toBe(false);
      expect(isValidRequestId('test<script>')).toBe(false);
      expect(isValidRequestId(null as unknown as string)).toBe(false);
    });
  });
});
