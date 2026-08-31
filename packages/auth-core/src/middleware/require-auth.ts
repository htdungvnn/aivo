/**
 * Authentication Middleware
 * 
 * Hono middleware for JWT validation and user authentication.
 * Validates tokens and sets auth context for downstream handlers.
 */

import type { Context, Next, MiddlewareHandler } from 'hono';
import type { JWTPayload, UserStatus } from '../types/index.js';
import { AUTH_ERROR_CODES } from '../types/errors.js';
import { getJWTService, JWTService, setJWTService } from '../jwt.js';
import { extractBearerToken } from '../request.js';

// =============================================================================
// Environment Types
// =============================================================================

/**
 * Environment variables required for auth middleware
 */
export interface AuthEnv {
  /** D1 Database for session validation */
  DB?: D1Database;
  /** Public key for JWT verification (base64) */
  AUTH_JWT_PUBLIC_KEY?: string;
  /** Token issuer */
  AUTH_JWT_ISSUER?: string;
  /** Token audience */
  AUTH_JWT_AUDIENCE?: string;
  /** Auth service URL for remote validation */
  AUTH_SERVICE_URL?: string;
  /** Skip session validation (use only JWT) */
  AUTH_SKIP_SESSION_CHECK?: boolean;
}

/**
 * Auth context variables set by middleware
 */
export interface AuthContext {
  /** Authenticated user object */
  user?: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    status: UserStatus;
    authVersion: number;
  };
  /** Session info */
  session?: {
    id: string;
    clientType: string;
    userAgent: string | null;
    ipAddress: string | null;
  };
  /** User roles from JWT */
  userRoles?: string[];
  /** Decoded JWT payload */
  authPayload?: JWTPayload;
  /** User ID (simple string access) */
  userId?: string;
}

// =============================================================================
// Session Validator Type
// =============================================================================

/**
 * Session validator function signature
 * Services can provide custom session validation
 */
export type SessionValidator = (
  db: D1Database,
  sessionId: string,
  userId: string
) => Promise<{
  valid: boolean;
  session?: {
    id: string;
    clientType: string;
    userAgent: string | null;
    ipAddress: string | null;
  };
  user?: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    status: UserStatus;
    authVersion: number;
  };
  roles?: string[];
}>;

// =============================================================================
// Default Session Validator
// =============================================================================

/**
 * Default session validator using D1 database
 * Services should override this with their specific queries
 */
export async function defaultSessionValidator(
  db: D1Database,
  sessionId: string,
  userId: string
): Promise<{
  valid: boolean;
  session?: {
    id: string;
    clientType: string;
    userAgent: string | null;
    ipAddress: string | null;
  };
  user?: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    status: UserStatus;
    authVersion: number;
  };
  roles?: string[];
}> {
  // This is a template - services will implement their own
  // Default implementation just checks session exists
  try {
    const now = Math.floor(Date.now() / 1000);
    
    // Check session is valid and not expired
    const sessionResult = await db
      .prepare(
        `SELECT s.*, u.email, u.display_name, u.avatar_url, u.status, u.auth_version
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.id = ? AND s.user_id = ? AND s.expires_at > ? AND s.revoked_at IS NULL
         AND u.deleted_at IS NULL`
      )
      .bind(sessionId, userId, now)
      .first();

    if (!sessionResult) {
      return { valid: false };
    }

    const row = sessionResult as Record<string, unknown>;

    // Get user roles
    const rolesResult = await db
      .prepare(
        `SELECT r.code FROM roles r
         INNER JOIN user_roles ur ON r.id = ur.role_id
         WHERE ur.user_id = ?`
      )
      .bind(userId)
      .all();

    const roles = (rolesResult.results as Array<{ code: string }>)?.map(r => r.code) ?? [];

    return {
      valid: true,
      session: {
        id: row.id as string,
        clientType: row.client_type as string,
        userAgent: row.user_agent as string | null,
        ipAddress: row.ip_address as string | null,
      },
      user: {
        id: row.user_id as string,
        email: row.email as string,
        displayName: row.display_name as string | null,
        avatarUrl: row.avatar_url as string | null,
        status: row.status as UserStatus,
        authVersion: row.auth_version as number,
      },
      roles,
    };
  } catch (error) {
    console.error('Session validation error:', error);
    return { valid: false };
  }
}

// =============================================================================
// Auth Middleware Factory
// =============================================================================

/**
 * Create auth middleware with custom configuration
 */
export function createAuthMiddleware(options?: {
  /** Skip database session validation (JWT only) */
  skipSessionCheck?: boolean;
  /** Custom session validator */
  sessionValidator?: SessionValidator;
  /** Initialize JWT service from environment */
  initFromEnv?: boolean;
}): MiddlewareHandler {
  const { skipSessionCheck = false, sessionValidator, initFromEnv = true } = options ?? {};

  return async (c: Context, next: Next) => {
    const request = c.req.raw;
    const token = extractBearerToken(request);

    // Token required
    if (!token) {
      return c.json(
        {
          error: {
            code: AUTH_ERROR_CODES.UNAUTHORIZED,
            message: 'Authentication required',
            requestId: c.get('requestId'),
          },
        },
        401
      );
    }

    // Initialize JWT service if needed
    if (initFromEnv) {
      const jwtService = getJWTService();
      if (!jwtService.canVerify()) {
        // Try to initialize from environment
        try {
          const service = await JWTService.fromEnvironment({
            AUTH_JWT_PUBLIC_KEY: c.env.AUTH_JWT_PUBLIC_KEY,
            AUTH_JWT_ISSUER: c.env.AUTH_JWT_ISSUER,
            AUTH_JWT_AUDIENCE: c.env.AUTH_JWT_AUDIENCE,
          });
          setJWTService(service);
        } catch (error) {
          console.error('Failed to initialize JWT service:', error);
        }
      }
    }

    // Verify token
    const jwtService = getJWTService();
    const result = await jwtService.verifyAccessToken(token);

    if (!result.valid || !result.payload) {
      return c.json(
        {
          error: {
            code: AUTH_ERROR_CODES.INVALID_TOKEN,
            message: result.error ?? 'Invalid or expired token',
            requestId: c.get('requestId'),
          },
        },
        401
      );
    }

    const payload = result.payload;

    // Set basic auth context from JWT
    c.set('userId', payload.sub);
    c.set('userRoles', payload.roles);
    c.set('authPayload', payload);

    // Skip session check if configured
    if (skipSessionCheck || !c.env.DB) {
      // Set minimal user info from token
      c.set('user', {
        id: payload.sub,
        email: '', // Not in JWT payload
        displayName: null,
        avatarUrl: null,
        status: 'active' as UserStatus,
        authVersion: payload.ver,
      });
      
      await next();
      return;
    }

    // Validate session with database
    const validator = sessionValidator ?? defaultSessionValidator;
    const sessionResult = await validator(c.env.DB, payload.sid, payload.sub);

    if (!sessionResult.valid) {
      return c.json(
        {
          error: {
            code: AUTH_ERROR_CODES.SESSION_EXPIRED,
            message: 'Session has expired',
            requestId: c.get('requestId'),
          },
        },
        401
      );
    }

    // Verify auth version matches
    if (sessionResult.user && payload.ver !== sessionResult.user.authVersion) {
      return c.json(
        {
          error: {
            code: AUTH_ERROR_CODES.INVALID_TOKEN,
            message: 'Account has been modified. Please log in again.',
            requestId: c.get('requestId'),
          },
        },
        401
      );
    }

    // Set full auth context
    if (sessionResult.user) {
      c.set('user', sessionResult.user);
    }
    
    if (sessionResult.session) {
      c.set('session', sessionResult.session);
    }

    if (sessionResult.roles) {
      c.set('userRoles', sessionResult.roles);
    }

    await next();
  };
}

/**
 * Default require auth middleware
 * Validates JWT and checks session in database
 */
export const requireAuth = createAuthMiddleware();

// Re-export for convenience
export { JWTService, getJWTService, setJWTService } from '../jwt.js';
