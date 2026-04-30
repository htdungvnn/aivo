import { describe, it, expect } from '@jest/globals';
import {
  APIError,
  ValidationError,
  AuthError,
  InvalidTokenError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServiceUnavailableError,
  ExternalAPIError,
  DatabaseError,
  formatZodError,
} from '../utils/errors';

describe('API Errors', () => {
  describe('APIError', () => {
    it('creates error with correct properties', () => {
      const error = new APIError(400, 'BAD_REQUEST', 'Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.message).toBe('Invalid input');
      expect(error.name).toBe('APIError');
      expect(error instanceof Error).toBe(true);
    });

    it('includes details when provided', () => {
      const error = new APIError(400, 'BAD', 'Msg', { field: 'email' });
      expect(error.details).toEqual({ field: 'email' });
    });

    it('toJSON returns correct structure', () => {
      const error = new APIError(404, 'NOT_FOUND', 'User not found');
      expect(error.toJSON()).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      });
    });

    it('toJSON includes details when present', () => {
      const error = new APIError(400, 'VALIDATION', 'Invalid', { field: 'name' });
      expect(error.toJSON()).toEqual({
        success: false,
        error: {
          code: 'VALIDATION',
          message: 'Invalid',
          details: { field: 'name' },
        },
      });
    });
  });

  describe('ValidationError', () => {
    it('has default status 400 and code VALIDATION_ERROR', () => {
      const error = new ValidationError('Invalid email');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Invalid email');
      expect(error.name).toBe('ValidationError');
    });

    it('accepts details', () => {
      const error = new ValidationError('Bad data', { field: 'age' });
      expect(error.details).toEqual({ field: 'age' });
    });
  });

  describe('AuthError', () => {
    it('has default status 401 and code AUTH_ERROR', () => {
      const error = new AuthError();
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTH_ERROR');
      expect(error.message).toBe('Authentication failed');
    });

    it('accepts custom message', () => {
      const error = new AuthError('Session expired');
      expect(error.message).toBe('Session expired');
    });
  });

  describe('InvalidTokenError', () => {
    it('has default values', () => {
      const error = new InvalidTokenError();
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('INVALID_TOKEN');
      expect(error.message).toBe('Invalid or expired token');
    });
  });

  describe('ForbiddenError', () => {
    it('has default status 403 and code FORBIDDEN', () => {
      const error = new ForbiddenError();
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
      expect(error.message).toBe('Insufficient permissions');
    });

    it('accepts custom message', () => {
      const error = new ForbiddenError('Admin only');
      expect(error.message).toBe('Admin only');
    });
  });

  describe('NotFoundError', () => {
    it('has default status 404 and code NOT_FOUND', () => {
      const error = new NotFoundError();
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('Resource not found');
    });

    it('includes resource name in message', () => {
      const error = new NotFoundError('User');
      expect(error.message).toBe('User not found');
    });
  });

  describe('ConflictError', () => {
    it('has default status 409 and code CONFLICT', () => {
      const error = new ConflictError();
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
      expect(error.message).toBe('Resource conflict');
    });

    it('accepts custom message', () => {
      const error = new ConflictError('Email already exists');
      expect(error.message).toBe('Email already exists');
    });
  });

  describe('RateLimitError', () => {
    it('has default status 429 and code RATE_LIMIT_EXCEEDED', () => {
      const error = new RateLimitError(60);
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.message).toBe('Too many requests');
      expect(error.details?.retryAfter).toBe(60);
    });
  });

  describe('ServiceUnavailableError', () => {
    it('has default status 503 and code SERVICE_UNAVAILABLE', () => {
      const error = new ServiceUnavailableError();
      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
      expect(error.message).toBe('Service is temporarily unavailable');
    });

    it('includes service name', () => {
      const error = new ServiceUnavailableError('OpenAI');
      expect(error.message).toBe('OpenAI is temporarily unavailable');
    });
  });

  describe('ExternalAPIError', () => {
    it('has default status 502 and code EXTERNAL_API_ERROR', () => {
      const error = new ExternalAPIError('OpenAI');
      expect(error.statusCode).toBe(502);
      expect(error.code).toBe('EXTERNAL_API_ERROR');
      expect(error.message).toBe('Error calling OpenAI');
      expect(error.details?.service).toBe('OpenAI');
    });

    it('accepts custom message and status', () => {
      const error = new ExternalAPIError('Stripe', 'Payment failed', 402);
      expect(error.statusCode).toBe(402);
      expect(error.message).toBe('Payment failed');
    });
  });

  describe('DatabaseError', () => {
    it('has default status 500 and code DATABASE_ERROR', () => {
      const error = new DatabaseError();
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.message).toBe('Database error');
    });

    it('accepts custom message and details', () => {
      const error = new DatabaseError('Connection timeout', { timeout: 5000 });
      expect(error.message).toBe('Connection timeout');
      expect(error.details).toEqual({ timeout: 5000 });
    });
  });

  describe('formatZodError', () => {
    it('formats Zod error into ValidationError', () => {
      const zodError = new Error('Zod error');
      // @ts-ignore - simulating Zod error structure
      zodError.issues = [{ message: 'Invalid email', path: ['email'] }];

      const validationError = formatZodError(zodError);
      expect(validationError instanceof ValidationError).toBe(true);
      expect(validationError.message).toBe('Invalid email');
      expect(validationError.details?.field).toBe('email');
    });

    it('includes multiple issues (first 5)', () => {
      const zodError = new Error('Zod error');
      // @ts-ignore
      zodError.issues = [
        { message: 'Err1', path: ['field1'] },
        { message: 'Err2', path: ['field2'] },
        { message: 'Err3', path: ['field3'] },
        { message: 'Err4', path: ['field4'] },
        { message: 'Err5', path: ['field5'] },
        { message: 'Err6', path: ['field6'] },
      ];

      const validationError = formatZodError(zodError);
      expect(validationError.details?.issues).toHaveLength(5);
    });

    it('handles non-Zod errors', () => {
      const error = new Error('Unknown error');
      const validationError = formatZodError(error);
      expect(validationError.message).toBe('Unknown error');
    });

    it('handles Zod error without issues', () => {
      const zodError = new Error('Zod error');
      // @ts-ignore - issues is empty
      zodError.issues = [];
      const validationError = formatZodError(zodError);
      // Fallback uses the error's message
      expect(validationError.message).toBe('Zod error');
    });
  });
});
