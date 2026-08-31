/**
 * Auth Core Package
 * 
 * Shared authentication utilities for AIVO services.
 * Provides JWT handling, middleware, and error types.
 * 
 * @example
 * // Import specific modules
 * import { requireAuth, requireRole } from '@aivo/auth-core/middleware';
 * import { JWTService } from '@aivo/auth-core/jwt';
 * import { AUTH_ERROR_CODES } from '@aivo/auth-core/types';
 * 
 * @example
 * // Import everything
 * import {
 *   requireAuth,
 *   requireAdmin,
 *   JWTService,
 *   getClientIP,
 *   AuthError,
 * } from '@aivo/auth-core';
 */

// =============================================================================
// Types
// =============================================================================

export * from './types/index.js';

// =============================================================================
// JWT Service
// =============================================================================

export { JWTService } from './jwt.js';
export { getJWTService, setJWTService, resetJWTService } from './jwt.js';

// =============================================================================
// Middleware
// =============================================================================

// Require Auth
export {
  requireAuth,
  createAuthMiddleware,
  type AuthEnv,
  type AuthContext,
  type SessionValidator,
  defaultSessionValidator,
} from './middleware/require-auth.js';

// Role Check
export {
  requireRole,
  requireAnyRole,
  requireAllRoles,
  excludeRoles,
  requireAdmin,
  requireSuperAdmin,
  requireRoles,
  type RoleRequirement,
} from './middleware/role-check.js';

// Context Helpers
export {
  getAuthUserId,
  getAuthUser,
  getAuthRoles,
  getAuthPayload,
  getAuthSession,
  hasRole,
  hasAnyRole,
  hasAllRoles,
  isAdmin,
  isSuperAdmin,
  requireAuthUser,
  requireAuthRole,
} from './middleware/context.js';

// =============================================================================
// Request Utilities
// =============================================================================

export {
  // Token extraction
  extractBearerToken,
  extractCookieToken,
  extractAccessToken,
  extractRefreshToken,
  // Client info
  getClientIP,
  getUserAgent,
  getClientType,
  getDeviceInfo,
  // Request ID
  getRequestId,
  getCorrelationId,
  // Origin/Referer
  getOrigin,
  getReferer,
  isAllowedOrigin,
  // Content Type
  isJsonRequest,
  acceptsJson,
  // Rate Limiting
  getRateLimitInfo,
} from './request.js';

// =============================================================================
// Re-export errors directly for convenience
// =============================================================================

export { AuthError, TokenError, ForbiddenError, AccountStatusError } from './types/errors.js';
export {
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
