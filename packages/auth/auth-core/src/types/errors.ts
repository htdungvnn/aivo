/**
 * Authentication Error Types
 */

// =============================================================================
// Error Codes
// =============================================================================

/**
 * Authentication error codes
 */
export const AUTH_ERROR_CODES = {
  // OAuth errors
  INVALID_STATE: 'INVALID_STATE',
  INVALID_PKCE: 'INVALID_PKCE',
  OAUTH_ERROR: 'OAUTH_ERROR',
  UNSUPPORTED_PROVIDER: 'UNSUPPORTED_PROVIDER',

  // Account errors
  EMAIL_VERIFICATION_REQUIRED: 'EMAIL_VERIFICATION_REQUIRED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  ACCOUNT_DELETED: 'ACCOUNT_DELETED',
  ACCOUNT_LINKING_REQUIRED: 'ACCOUNT_LINKING_REQUIRED',

  // Token errors
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  REFRESH_TOKEN_REUSED: 'REFRESH_TOKEN_REUSED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_REVOKED: 'SESSION_REVOKED',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',

  // Authorization errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Rate limiting
  RATE_LIMITED: 'RATE_LIMITED',

  // Not found
  NOT_FOUND: 'NOT_FOUND',

  // Generic
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Base authentication error
 */
export class AuthError extends Error {
  public readonly code: AuthErrorCode;
  public readonly statusCode: number;

  constructor(
    message: string,
    code: AuthErrorCode,
    statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = statusCode;
  }

  /**
   * Create error response object
   */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
      },
    };
  }
}

/**
 * Token-specific error
 */
export class TokenError extends AuthError {
  constructor(message: string, code: AuthErrorCode = 'INVALID_TOKEN') {
    super(message, code, 401);
    this.name = 'TokenError';
  }
}

/**
 * Authorization error (forbidden)
 */
export class ForbiddenError extends AuthError {
  constructor(message: string = 'Access denied') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * Account status error
 */
export class AccountStatusError extends AuthError {
  public readonly accountStatus: string;

  constructor(message: string, accountStatus: string) {
    const code = AUTH_ERROR_CODES.ACCOUNT_SUSPENDED; // Default, can be overridden
    super(message, code, 403);
    this.name = 'AccountStatusError';
    this.accountStatus = accountStatus;
  }
}

// =============================================================================
// Error Factory Functions
// =============================================================================

/**
 * Create unauthorized error
 */
export function unauthorized(message: string = 'Authentication required'): AuthError {
  return new AuthError(message, 'UNAUTHORIZED', 401);
}

/**
 * Create invalid token error
 */
export function invalidToken(message: string = 'Invalid or expired token'): TokenError {
  return new TokenError(message, 'INVALID_TOKEN');
}

/**
 * Create token expired error
 */
export function tokenExpired(message: string = 'Token has expired'): TokenError {
  return new TokenError(message, 'TOKEN_EXPIRED');
}

/**
 * Create forbidden error
 */
export function forbidden(message: string = 'Access denied'): ForbiddenError {
  return new ForbiddenError(message);
}

/**
 * Create not found error
 */
export function notFound(resource: string = 'Resource'): AuthError {
  return new AuthError(`${resource} not found`, 'NOT_FOUND', 404);
}

/**
 * Create account suspended error
 */
export function accountSuspended(): AccountStatusError {
  return new AccountStatusError('Your account has been suspended', 'suspended');
}

/**
 * Create account deleted error
 */
export function accountDeleted(): AccountStatusError {
  return new AccountStatusError('Your account has been deleted', 'deleted');
}

/**
 * Create email verification required error
 */
export function emailVerificationRequired(): AuthError {
  return new AuthError('Please verify your email to continue', 'EMAIL_VERIFICATION_REQUIRED', 403);
}

/**
 * Create insufficient permissions error
 */
export function insufficientPermissions(requiredRole: string): AuthError {
  return new AuthError(
    `Required role: ${requiredRole}`,
    'INSUFFICIENT_PERMISSIONS',
    403
  );
}

// =============================================================================
// HTTP Status Code Mapping
// =============================================================================

/**
 * Map error codes to HTTP status codes
 */
export const STATUS_CODE_MAP: Record<AuthErrorCode, number> = {
  [AUTH_ERROR_CODES.INVALID_STATE]: 400,
  [AUTH_ERROR_CODES.INVALID_PKCE]: 400,
  [AUTH_ERROR_CODES.OAUTH_ERROR]: 400,
  [AUTH_ERROR_CODES.UNSUPPORTED_PROVIDER]: 400,

  [AUTH_ERROR_CODES.EMAIL_VERIFICATION_REQUIRED]: 403,
  [AUTH_ERROR_CODES.ACCOUNT_SUSPENDED]: 403,
  [AUTH_ERROR_CODES.ACCOUNT_DELETED]: 401,
  [AUTH_ERROR_CODES.ACCOUNT_LINKING_REQUIRED]: 403,

  [AUTH_ERROR_CODES.INVALID_TOKEN]: 401,
  [AUTH_ERROR_CODES.TOKEN_EXPIRED]: 401,
  [AUTH_ERROR_CODES.TOKEN_INVALID]: 401,
  [AUTH_ERROR_CODES.REFRESH_TOKEN_REUSED]: 401,
  [AUTH_ERROR_CODES.SESSION_EXPIRED]: 401,
  [AUTH_ERROR_CODES.SESSION_REVOKED]: 401,

  [AUTH_ERROR_CODES.VALIDATION_ERROR]: 400,
  [AUTH_ERROR_CODES.INVALID_REQUEST]: 400,

  [AUTH_ERROR_CODES.UNAUTHORIZED]: 401,
  [AUTH_ERROR_CODES.FORBIDDEN]: 403,
  [AUTH_ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 403,

  [AUTH_ERROR_CODES.RATE_LIMITED]: 429,

  [AUTH_ERROR_CODES.NOT_FOUND]: 404,

  [AUTH_ERROR_CODES.INTERNAL_ERROR]: 500,
  [AUTH_ERROR_CODES.SERVICE_UNAVAILABLE]: 503,
};

/**
 * Get HTTP status code for error code
 */
export function getStatusCode(code: AuthErrorCode): number {
  return STATUS_CODE_MAP[code] ?? 500;
}
