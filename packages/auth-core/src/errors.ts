/**
 * Auth Core Errors Re-export
 * 
 * Re-exports all error types for convenient access.
 */

export {
  AUTH_ERROR_CODES,
  type AuthErrorCode,
  AuthError,
  TokenError,
  ForbiddenError,
  AccountStatusError,
  unauthorized,
  invalidToken,
  tokenExpired,
  forbidden,
  notFound,
  accountSuspended,
  accountDeleted,
  emailVerificationRequired,
  insufficientPermissions,
  getStatusCode,
} from './types/errors.js';
