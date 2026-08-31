/**
 * Coach Service - Authentication Middleware
 * 
 * Uses shared auth-core package for JWT validation.
 */

import { type MiddlewareHandler } from 'hono';
import {
  extractBearerToken,
  getClientIP,
  getUserAgent,
  getJWTService,
  JWTService,
  AuthError,
  AUTH_ERROR_CODES,
} from '@repo/auth-core';

// Environment types
interface CoachEnv {
  DB: D1Database;
  AUTH_JWT_PUBLIC_KEY?: string;
  AUTH_JWT_ISSUER?: string;
  AUTH_JWT_AUDIENCE?: string;
  AUTH_SERVICE_URL?: string;
}

interface CoachContext {
  Bindings: CoachEnv;
  Variables: {
    userId: string;
    roles: string[];
    requestId: string;
  };
}

/**
 * Verify token with auth service (for distributed validation)
 */
async function verifyTokenWithAuthService(
  token: string,
  authServiceUrl: string
): Promise<{ userId: string; roles: string[] } | null> {
  try {
    const response = await fetch(`${authServiceUrl}/api/v1/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { data: { userId: string; roles?: string[] } };
    return {
      userId: data.data.userId,
      roles: data.data.roles || [],
    };
  } catch {
    return null;
  }
}

/**
 * Initialize JWT service from environment
 */
async function initJWTService(env: CoachEnv): Promise<void> {
  const jwtService = getJWTService();

  if (!jwtService.canVerify() && env.AUTH_JWT_PUBLIC_KEY) {
    const service = await JWTService.fromEnvironment({
      AUTH_JWT_PUBLIC_KEY: env.AUTH_JWT_PUBLIC_KEY,
      AUTH_JWT_ISSUER: env.AUTH_JWT_ISSUER,
      AUTH_JWT_AUDIENCE: env.AUTH_JWT_AUDIENCE,
    });

    // Copy keys if available
    const serviceWithKeys = service as unknown as { privateKey?: CryptoKey; publicKey?: CryptoKey };
    if (serviceWithKeys.privateKey && serviceWithKeys.publicKey) {
      jwtService.setKeys(serviceWithKeys.privateKey, serviceWithKeys.publicKey);
    } else if (serviceWithKeys.publicKey) {
      // Only public key for verification
      (jwtService as unknown as { privateKey: CryptoKey | null; publicKey: CryptoKey | null }).privateKey = null;
      (jwtService as unknown as { privateKey: CryptoKey | null; publicKey: CryptoKey | null }).publicKey = serviceWithKeys.publicKey;
    }
  }
}

/**
 * Authentication middleware
 * Validates JWT token from Authorization header
 */
export const authMiddleware = (): MiddlewareHandler<CoachContext> => {
  return async (c, next) => {
    const token = extractBearerToken(c.req.raw);

    if (!token) {
      throw new AuthError('Missing Authorization header', AUTH_ERROR_CODES.UNAUTHORIZED, 401);
    }

    // Try local JWT validation first
    await initJWTService(c.env);

    const jwtService = getJWTService();

    if (jwtService.canVerify()) {
      // Local validation
      const result = await jwtService.verifyAccessToken(token);

      if (result.valid && result.payload) {
        c.set('userId', result.payload.sub);
        c.set('roles', result.payload.roles);
        await next();
        return;
      }

      // Token invalid, try auth service
      const authServiceUrl = c.env.AUTH_SERVICE_URL || 'http://localhost:3001';
      const verification = await verifyTokenWithAuthService(token, authServiceUrl);

      if (verification) {
        c.set('userId', verification.userId);
        c.set('roles', verification.roles);
        await next();
        return;
      }

      throw new AuthError('Invalid or expired token', AUTH_ERROR_CODES.INVALID_TOKEN, 401);
    } else {
      // No local keys, use auth service
      const authServiceUrl = c.env.AUTH_SERVICE_URL || 'http://localhost:3001';
      const verification = await verifyTokenWithAuthService(token, authServiceUrl);

      if (!verification) {
        throw new AuthError('Invalid or expired token', AUTH_ERROR_CODES.INVALID_TOKEN, 401);
      }

      c.set('userId', verification.userId);
      c.set('roles', verification.roles);
    }

    await next();
  };
};

/**
 * Require specific role middleware
 */
export const requireRole = (role: string): MiddlewareHandler<CoachContext> => {
  return async (c, next) => {
    const roles = c.get('roles') || [];

    if (!roles.includes(role)) {
      throw new AuthError(
        `Required role: ${role}`,
        AUTH_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        403
      );
    }

    await next();
  };
};

/**
 * Require admin role
 */
export const requireAdmin = () => requireRole('admin');

/**
 * Optional auth middleware - doesn't fail if no token
 */
export const optionalAuthMiddleware = (): MiddlewareHandler<CoachContext> => {
  return async (c, next) => {
    const token = extractBearerToken(c.req.raw);

    if (token) {
      await initJWTService(c.env);

      const jwtService = getJWTService();

      if (jwtService.canVerify()) {
        const result = await jwtService.verifyAccessToken(token);

        if (result.valid && result.payload) {
          c.set('userId', result.payload.sub);
          c.set('roles', result.payload.roles);
        }
      }
    }

    await next();
  };
};

// Re-export utilities
export { getClientIP, getUserAgent };
