/**
 * Normalized Error Handling
 * 
 * Provides consistent error classification, retryability detection,
 * and safe error messages for clients.
 * 
 * Error Categories:
 * - validation: Input validation errors
 * - authentication: Authentication failures
 * - authorization: Permission denied
 * - not_found: Resource not found
 * - conflict: Resource conflicts (duplicate, version mismatch)
 * - rate_limit: Rate limiting
 * - database: Database operation failures
 * - queue: Queue operation failures
 * - external_provider: External service failures
 * - ai_provider: AI provider failures
 * - wasm: WebAssembly failures
 * - configuration: Configuration errors
 * - internal: Internal errors
 */

import type { ErrorCategory, NormalizedError } from './types.js';

// =============================================================================
// Error Codes
// =============================================================================

export const ERROR_CODES = {
  // Validation (1000-1999)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_FORMAT: 'INVALID_FORMAT',
  MISSING_REQUIRED: 'MISSING_REQUIRED',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',
  
  // Authentication (2000-2999)
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  
  // Authorization (3000-3999)
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // Not Found (4000-4999)
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  
  // Conflict (5000-5999)
  CONFLICT: 'CONFLICT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  VERSION_CONFLICT: 'VERSION_CONFLICT',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  
  // Rate Limit (6000-6999)
  RATE_LIMITED: 'RATE_LIMITED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  
  // Database (7000-7999)
  DATABASE_ERROR: 'DATABASE_ERROR',
  DATABASE_TIMEOUT: 'DATABASE_TIMEOUT',
  DATABASE_CONNECTION: 'DATABASE_CONNECTION',
  DATABASE_CONSTRAINT: 'DATABASE_CONSTRAINT',
  MIGRATION_ERROR: 'MIGRATION_ERROR',
  
  // Queue (8000-8999)
  QUEUE_ERROR: 'QUEUE_ERROR',
  QUEUE_PUBLISH_FAILED: 'QUEUE_PUBLISH_FAILED',
  QUEUE_CONSUME_FAILED: 'QUEUE_CONSUME_FAILED',
  DLQ_FULL: 'DLQ_FULL',
  
  // External Provider (9000-9999)
  EXTERNAL_PROVIDER_ERROR: 'EXTERNAL_PROVIDER_ERROR',
  PROVIDER_TIMEOUT: 'PROVIDER_TIMEOUT',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  
  // AI Provider (10000-10999)
  AI_PROVIDER_ERROR: 'AI_PROVIDER_ERROR',
  AI_SCHEMA_VALIDATION: 'AI_SCHEMA_VALIDATION',
  AI_SAFETY_REJECTION: 'AI_SAFETY_REJECTION',
  AI_TIMEOUT: 'AI_TIMEOUT',
  AI_QUOTA_EXCEEDED: 'AI_QUOTA_EXCEEDED',
  
  // WASM (11000-11999)
  WASM_ERROR: 'WASM_ERROR',
  WASM_INITIALIZATION: 'WASM_INITIALIZATION',
  WASM_EXECUTION: 'WASM_EXECUTION',
  WASM_TIMEOUT: 'WASM_TIMEOUT',
  
  // Configuration (12000-12999)
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  MISSING_CONFIG: 'MISSING_CONFIG',
  INVALID_CONFIG: 'INVALID_CONFIG',
  
  // Internal (13000+)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNEXPECTED_ERROR: 'UNEXPECTED_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// =============================================================================
// Error Category Mapping
// =============================================================================

const CODE_TO_CATEGORY: Record<string, ErrorCategory> = {
  // Validation
  [ERROR_CODES.VALIDATION_ERROR]: 'validation',
  [ERROR_CODES.INVALID_INPUT]: 'validation',
  [ERROR_CODES.INVALID_FORMAT]: 'validation',
  [ERROR_CODES.MISSING_REQUIRED]: 'validation',
  [ERROR_CODES.CONSTRAINT_VIOLATION]: 'validation',
  
  // Authentication
  [ERROR_CODES.AUTHENTICATION_REQUIRED]: 'authentication',
  [ERROR_CODES.INVALID_TOKEN]: 'authentication',
  [ERROR_CODES.TOKEN_EXPIRED]: 'authentication',
  [ERROR_CODES.INVALID_CREDENTIALS]: 'authentication',
  
  // Authorization
  [ERROR_CODES.FORBIDDEN]: 'authorization',
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 'authorization',
  
  // Not Found
  [ERROR_CODES.NOT_FOUND]: 'not_found',
  [ERROR_CODES.RESOURCE_NOT_FOUND]: 'not_found',
  [ERROR_CODES.USER_NOT_FOUND]: 'not_found',
  
  // Conflict
  [ERROR_CODES.CONFLICT]: 'conflict',
  [ERROR_CODES.DUPLICATE_ENTRY]: 'conflict',
  [ERROR_CODES.VERSION_CONFLICT]: 'conflict',
  [ERROR_CODES.IDEMPOTENCY_CONFLICT]: 'conflict',
  
  // Rate Limit
  [ERROR_CODES.RATE_LIMITED]: 'rate_limit',
  [ERROR_CODES.QUOTA_EXCEEDED]: 'rate_limit',
  
  // Database
  [ERROR_CODES.DATABASE_ERROR]: 'database',
  [ERROR_CODES.DATABASE_TIMEOUT]: 'database',
  [ERROR_CODES.DATABASE_CONNECTION]: 'database',
  [ERROR_CODES.DATABASE_CONSTRAINT]: 'database',
  [ERROR_CODES.MIGRATION_ERROR]: 'database',
  
  // Queue
  [ERROR_CODES.QUEUE_ERROR]: 'queue',
  [ERROR_CODES.QUEUE_PUBLISH_FAILED]: 'queue',
  [ERROR_CODES.QUEUE_CONSUME_FAILED]: 'queue',
  [ERROR_CODES.DLQ_FULL]: 'queue',
  
  // External Provider
  [ERROR_CODES.EXTERNAL_PROVIDER_ERROR]: 'external_provider',
  [ERROR_CODES.PROVIDER_TIMEOUT]: 'external_provider',
  [ERROR_CODES.PROVIDER_UNAVAILABLE]: 'external_provider',
  
  // AI Provider
  [ERROR_CODES.AI_PROVIDER_ERROR]: 'ai_provider',
  [ERROR_CODES.AI_SCHEMA_VALIDATION]: 'ai_provider',
  [ERROR_CODES.AI_SAFETY_REJECTION]: 'ai_provider',
  [ERROR_CODES.AI_TIMEOUT]: 'ai_provider',
  [ERROR_CODES.AI_QUOTA_EXCEEDED]: 'ai_provider',
  
  // WASM
  [ERROR_CODES.WASM_ERROR]: 'wasm',
  [ERROR_CODES.WASM_INITIALIZATION]: 'wasm',
  [ERROR_CODES.WASM_EXECUTION]: 'wasm',
  [ERROR_CODES.WASM_TIMEOUT]: 'wasm',
  
  // Configuration
  [ERROR_CODES.CONFIGURATION_ERROR]: 'configuration',
  [ERROR_CODES.MISSING_CONFIG]: 'configuration',
  [ERROR_CODES.INVALID_CONFIG]: 'configuration',
  
  // Internal
  [ERROR_CODES.INTERNAL_ERROR]: 'internal',
  [ERROR_CODES.UNEXPECTED_ERROR]: 'internal',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'internal',
};

// =============================================================================
// Retryability Rules
// =============================================================================

const RETRYABLE_ERROR_CODES = new Set([
  // Network issues
  ERROR_CODES.DATABASE_TIMEOUT,
  ERROR_CODES.PROVIDER_TIMEOUT,
  ERROR_CODES.AI_TIMEOUT,
  ERROR_CODES.WASM_TIMEOUT,
  ERROR_CODES.QUEUE_PUBLISH_FAILED,
  ERROR_CODES.QUEUE_CONSUME_FAILED,
  
  // Transient failures
  ERROR_CODES.DATABASE_CONNECTION,
  ERROR_CODES.PROVIDER_UNAVAILABLE,
  ERROR_CODES.SERVICE_UNAVAILABLE,
  ERROR_CODES.RATE_LIMITED,
  ERROR_CODES.QUOTA_EXCEEDED,
  ERROR_CODES.AI_QUOTA_EXCEEDED,
]);

const NON_RETRYABLE_ERROR_CODES = new Set([
  // Client errors
  ERROR_CODES.VALIDATION_ERROR,
  ERROR_CODES.INVALID_INPUT,
  ERROR_CODES.INVALID_FORMAT,
  ERROR_CODES.MISSING_REQUIRED,
  
  // Auth errors (need re-authentication)
  ERROR_CODES.AUTHENTICATION_REQUIRED,
  ERROR_CODES.INVALID_TOKEN,
  ERROR_CODES.INVALID_CREDENTIALS,
  
  // Not found
  ERROR_CODES.NOT_FOUND,
  ERROR_CODES.RESOURCE_NOT_FOUND,
  ERROR_CODES.USER_NOT_FOUND,
  
  // Conflict (need manual resolution)
  ERROR_CODES.CONFLICT,
  ERROR_CODES.DUPLICATE_ENTRY,
  ERROR_CODES.VERSION_CONFLICT,
  ERROR_CODES.IDEMPOTENCY_CONFLICT,
  
  // Safety/Security
  ERROR_CODES.FORBIDDEN,
  ERROR_CODES.AI_SAFETY_REJECTION,
]);

// =============================================================================
// Severity Rules
// =============================================================================

const SEVERITY_BY_CATEGORY: Record<ErrorCategory, 'info' | 'warn' | 'error' | 'critical'> = {
  validation: 'warn',
  authentication: 'warn',
  authorization: 'error',
  not_found: 'info',
  conflict: 'warn',
  rate_limit: 'info',
  database: 'error',
  queue: 'error',
  external_provider: 'error',
  ai_provider: 'error',
  wasm: 'error',
  configuration: 'critical',
  internal: 'error',
};

// =============================================================================
// Safe Messages
// =============================================================================

const SAFE_MESSAGES: Record<ErrorCode, string> = {
  // Validation
  [ERROR_CODES.VALIDATION_ERROR]: 'The provided data is invalid.',
  [ERROR_CODES.INVALID_INPUT]: 'One or more input values are invalid.',
  [ERROR_CODES.INVALID_FORMAT]: 'The data format is incorrect.',
  [ERROR_CODES.MISSING_REQUIRED]: 'Required data is missing.',
  [ERROR_CODES.CONSTRAINT_VIOLATION]: 'A data constraint was violated.',
  
  // Authentication
  [ERROR_CODES.AUTHENTICATION_REQUIRED]: 'Authentication is required.',
  [ERROR_CODES.INVALID_TOKEN]: 'The provided token is invalid.',
  [ERROR_CODES.TOKEN_EXPIRED]: 'The session has expired.',
  [ERROR_CODES.INVALID_CREDENTIALS]: 'The credentials are invalid.',
  
  // Authorization
  [ERROR_CODES.FORBIDDEN]: 'You do not have permission to perform this action.',
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 'Insufficient permissions for this operation.',
  
  // Not Found
  [ERROR_CODES.NOT_FOUND]: 'The requested resource was not found.',
  [ERROR_CODES.RESOURCE_NOT_FOUND]: 'The resource was not found.',
  [ERROR_CODES.USER_NOT_FOUND]: 'The user was not found.',
  
  // Conflict
  [ERROR_CODES.CONFLICT]: 'A conflict occurred.',
  [ERROR_CODES.DUPLICATE_ENTRY]: 'This entry already exists.',
  [ERROR_CODES.VERSION_CONFLICT]: 'A version conflict occurred.',
  [ERROR_CODES.IDEMPOTENCY_CONFLICT]: 'A conflicting request was detected.',
  
  // Rate Limit
  [ERROR_CODES.RATE_LIMITED]: 'Too many requests. Please try again later.',
  [ERROR_CODES.QUOTA_EXCEEDED]: 'Usage quota exceeded.',
  
  // Database
  [ERROR_CODES.DATABASE_ERROR]: 'A database error occurred.',
  [ERROR_CODES.DATABASE_TIMEOUT]: 'Database operation timed out.',
  [ERROR_CODES.DATABASE_CONNECTION]: 'Unable to connect to database.',
  [ERROR_CODES.DATABASE_CONSTRAINT]: 'A database constraint was violated.',
  [ERROR_CODES.MIGRATION_ERROR]: 'A database migration failed.',
  
  // Queue
  [ERROR_CODES.QUEUE_ERROR]: 'A queue operation failed.',
  [ERROR_CODES.QUEUE_PUBLISH_FAILED]: 'Failed to publish message.',
  [ERROR_CODES.QUEUE_CONSUME_FAILED]: 'Failed to process message.',
  [ERROR_CODES.DLQ_FULL]: 'Dead-letter queue is full.',
  
  // External Provider
  [ERROR_CODES.EXTERNAL_PROVIDER_ERROR]: 'An external service error occurred.',
  [ERROR_CODES.PROVIDER_TIMEOUT]: 'External service request timed out.',
  [ERROR_CODES.PROVIDER_UNAVAILABLE]: 'External service is unavailable.',
  
  // AI Provider
  [ERROR_CODES.AI_PROVIDER_ERROR]: 'AI service error occurred.',
  [ERROR_CODES.AI_SCHEMA_VALIDATION]: 'AI response validation failed.',
  [ERROR_CODES.AI_SAFETY_REJECTION]: 'AI request was rejected.',
  [ERROR_CODES.AI_TIMEOUT]: 'AI request timed out.',
  [ERROR_CODES.AI_QUOTA_EXCEEDED]: 'AI usage quota exceeded.',
  
  // WASM
  [ERROR_CODES.WASM_ERROR]: 'WebAssembly error occurred.',
  [ERROR_CODES.WASM_INITIALIZATION]: 'Failed to initialize WebAssembly module.',
  [ERROR_CODES.WASM_EXECUTION]: 'WebAssembly execution failed.',
  [ERROR_CODES.WASM_TIMEOUT]: 'WebAssembly operation timed out.',
  
  // Configuration
  [ERROR_CODES.CONFIGURATION_ERROR]: 'A configuration error occurred.',
  [ERROR_CODES.MISSING_CONFIG]: 'Required configuration is missing.',
  [ERROR_CODES.INVALID_CONFIG]: 'Configuration is invalid.',
  
  // Internal
  [ERROR_CODES.INTERNAL_ERROR]: 'An internal error occurred.',
  [ERROR_CODES.UNEXPECTED_ERROR]: 'An unexpected error occurred.',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'Service is currently unavailable.',
};

// =============================================================================
// Normalization Functions
// =============================================================================

/**
 * Normalize an error to a consistent format.
 */
export function normalizeError(
  error: unknown,
  code: ErrorCode,
  correlationId?: string
): NormalizedError {
  const category = CODE_TO_CATEGORY[code] || 'internal';
  const retryable = isRetryableCode(code);
  const severity = SEVERITY_BY_CATEGORY[category];
  const safeMessage = SAFE_MESSAGES[code] || 'An error occurred.';
  
  return {
    code,
    category,
    retryable,
    severity,
    safeMessage,
    correlationId,
    cause: error,
  };
}

/**
 * Check if an error code is retryable.
 */
export function isRetryableCode(code: string): boolean {
  // @ts-expect-error - Type narrowing issue with Set
  if (RETRYABLE_ERROR_CODES.has(code)) {
    return true;
  }
  // @ts-expect-error - Type narrowing issue with Set
  if (NON_RETRYABLE_ERROR_CODES.has(code)) {
    return false;
  }
  // Default to retryable for unknown codes
  return true;
}

/**
 * Get error category from error code.
 */
export function getErrorCategory(code: string): ErrorCategory {
  return CODE_TO_CATEGORY[code] || 'internal';
}

/**
 * Get safe message for an error code.
 */
export function getSafeMessage(code: ErrorCode): string {
  return SAFE_MESSAGES[code] || 'An error occurred.';
}

// =============================================================================
// Error Factory
// =============================================================================

/**
 * Create a normalized error from various inputs.
 */
export function createNormalizedError(
  input: unknown,
  defaultCode: ErrorCode = ERROR_CODES.INTERNAL_ERROR,
  correlationId?: string
): NormalizedError {
  // If already normalized
  if (isNormalizedError(input)) {
    return input;
  }
  
  // Extract code from known error types
  let code = defaultCode;
  
  if (input instanceof Error) {
    code = inferErrorCode(input) || defaultCode;
  } else if (typeof input === 'object' && input !== null) {
    const obj = input as Record<string, unknown>;
    if (obj.code && typeof obj.code === 'string') {
      code = obj.code as ErrorCode;
    }
  }
  
  return normalizeError(input, code, correlationId);
}

/**
 * Check if an error is already normalized.
 */
function isNormalizedError(error: unknown): error is NormalizedError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'category' in error &&
    'retryable' in error &&
    'severity' in error &&
    'safeMessage' in error
  );
}

/**
 * Infer error code from error type/message.
 */
function inferErrorCode(error: Error): ErrorCode | null {
  const name = error.name.toLowerCase();
  const message = error.message.toLowerCase();
  
  // Type-based inference
  if (name.includes('validation') || name.includes('zod')) {
    return ERROR_CODES.VALIDATION_ERROR;
  }
  if (name.includes('timeout')) {
    return ERROR_CODES.DATABASE_TIMEOUT;
  }
  if (name.includes('auth') || name.includes('jwt') || name.includes('token')) {
    return ERROR_CODES.INVALID_TOKEN;
  }
  
  // Message-based inference
  if (message.includes('timeout')) {
    return ERROR_CODES.DATABASE_TIMEOUT;
  }
  if (message.includes('unique') || message.includes('duplicate')) {
    return ERROR_CODES.DUPLICATE_ENTRY;
  }
  if (message.includes('not found') || message.includes('does not exist')) {
    return ERROR_CODES.NOT_FOUND;
  }
  if (message.includes('permission') || message.includes('access')) {
    return ERROR_CODES.FORBIDDEN;
  }
  if (message.includes('rate limit')) {
    return ERROR_CODES.RATE_LIMITED;
  }
  
  return null;
}

// =============================================================================
// HTTP Status Code Mapping
// =============================================================================

/**
 * Map error category to HTTP status code.
 */
export function categoryToStatusCode(category: ErrorCategory): number {
  switch (category) {
    case 'validation':
      return 400;
    case 'authentication':
      return 401;
    case 'authorization':
      return 403;
    case 'not_found':
      return 404;
    case 'conflict':
      return 409;
    case 'rate_limit':
      return 429;
    case 'database':
    case 'queue':
    case 'external_provider':
    case 'ai_provider':
    case 'wasm':
    case 'internal':
      return 500;
    case 'configuration':
      return 500;
  }
}

/**
 * Create HTTP error response body.
 */
export function createErrorResponse(
  error: NormalizedError,
  requestId?: string
): { error: { code: string; message: string; requestId?: string } } {
  return {
    error: {
      code: error.code,
      message: error.safeMessage,
      ...(requestId && { requestId }),
    },
  };
}

// =============================================================================
// Logging Helpers
// =============================================================================

/**
 * Format error for logging (safe version).
 */
export function formatErrorForLog(error: NormalizedError): Record<string, unknown> {
  return {
    code: error.code,
    category: error.category,
    retryable: error.retryable,
    severity: error.severity,
    message: error.safeMessage,
    correlationId: error.correlationId,
  };
}

/**
 * Check if error should trigger alerting.
 */
export function shouldAlert(error: NormalizedError): boolean {
  // Alert on critical severity or high-impact errors
  if (error.severity === 'critical') {
    return true;
  }
  
  // Alert on non-retryable internal errors
  if (error.category === 'internal' && !error.retryable) {
    return true;
  }
  
  // Alert on configuration errors
  if (error.category === 'configuration') {
    return true;
  }
  
  // Alert on sustained AI/WASM/database failures
  if (
    (error.category === 'ai_provider' || error.category === 'wasm' || error.category === 'database') &&
    error.retryable
  ) {
    return true;
  }
  
  return false;
}
