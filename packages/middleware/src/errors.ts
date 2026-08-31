/**
 * Error Handling Middleware
 * 
 * Provides consistent error handling and response formatting.
 * Follows Single Responsibility: only handles errors.
 */

// =============================================================================
// Error Types
// =============================================================================

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'BAD_REQUEST';

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number,
    details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    
    // Maintains proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): object {
    return {
      code: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
    };
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Bad request error (400)
 */
export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super('BAD_REQUEST', message, 400, details);
    this.name = 'BadRequestError';
  }
}

/**
 * Authentication error (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super('UNAUTHORIZED', message, 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Authorization error (403)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied') {
    super('FORBIDDEN', message, 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super('NOT_FOUND', `${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(retryAfter: number, message: string = 'Too many requests') {
    super('RATE_LIMITED', message, 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Internal server error (500)
 */
export class InternalError extends AppError {
  constructor(message: string = 'An internal error occurred') {
    super('INTERNAL_ERROR', message, 500);
    this.name = 'InternalError';
  }
}

/**
 * Service unavailable error (503)
 */
export class ServiceUnavailableError extends AppError {
  constructor(service: string = 'Service') {
    super('SERVICE_UNAVAILABLE', `${service} is currently unavailable`, 503);
    this.name = 'ServiceUnavailableError';
  }
}

// =============================================================================
// Error Factories
// =============================================================================

/**
 * Create error from Zod validation errors
 */
export function fromZodError(error: unknown, path: string[] = []): ValidationError {
  const issues = extractZodIssues(error);
  return new ValidationError('Validation failed', { issues, path });
}

/**
 * Create error from generic error
 */
export function fromError(error: unknown): InternalError {
  if (error instanceof AppError) {
    return new InternalError(error.message);
  }
  
  const message = error instanceof Error ? error.message : 'Unknown error';
  return new InternalError(message);
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract Zod validation issues
 */
function extractZodIssues(error: unknown): Array<{ field: string; message: string }> {
  try {
    const zodError = error as { issues?: Array<{ path: (string | number)[]; message: string }> };
    if (zodError.issues && Array.isArray(zodError.issues)) {
      return zodError.issues.map((issue) => ({
        field: issue.path.join('.') || 'unknown',
        message: issue.message,
      }));
    }
  } catch {
    // Ignore extraction errors
  }
  return [];
}

/**
 * Check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Check if error is retryable
 */
export function isRetryable(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.statusCode >= 500 || error.code === 'RATE_LIMITED';
  }
  return false;
}

/**
 * Get HTTP status code from error
 */
export function getStatusCode(error: unknown): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }
  if (error instanceof Error && error.name === 'ZodError') {
    return 400;
  }
  return 500;
}
