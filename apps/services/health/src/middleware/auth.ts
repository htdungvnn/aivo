/**
 * Authentication Middleware for Health Worker
 * 
 * Uses shared auth-core package for JWT validation.
 */

import type { Context, Next, MiddlewareHandler } from 'hono';
import type { HealthEnv } from '../types/env.js';
import { getHealthError } from './errors.js';
import {
  extractBearerToken,
  getClientIP,
  getUserAgent,
  type AuthEnv as CoreAuthEnv,
} from '@aivo/auth-core';
import { getJWTService } from '@aivo/auth-core/jwt';
import { JWTService } from '@aivo/auth-core';
import { AUTH_ERROR_CODES } from '@aivo/auth-core';

/**
 * Health service auth environment
 */
type HealthAuthEnv = HealthEnv & CoreAuthEnv;

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
async function initJWTService(env: HealthAuthEnv): Promise<void> {
  const jwtService = getJWTService();

  if (!jwtService.canVerify() && env.AUTH_JWT_PUBLIC_KEY) {
    // Initialize from environment
    const service = await JWTService.fromEnvironment({
      AUTH_JWT_PUBLIC_KEY: env.AUTH_JWT_PUBLIC_KEY,
      AUTH_JWT_ISSUER: env.AUTH_JWT_ISSUER,
      AUTH_JWT_AUDIENCE: env.AUTH_JWT_AUDIENCE,
    });
    jwtService.setKeys(
      service.canSign() ? (service as unknown as { privateKey: CryptoKey }).privateKey : ({} as CryptoKey),
      (service as unknown as { publicKey: CryptoKey }).publicKey
    );
  }
}

/**
 * Require authentication middleware
 * Validates JWT and sets user context
 */
export function requireAuth(): MiddlewareHandler<{ Bindings: HealthAuthEnv; Variables: { userId: string; roles: string[] } }> {
  return async (c: Context, next: Next) => {
    const token = extractBearerToken(c.req.raw);

    if (!token) {
      throw getHealthError('UNAUTHORIZED', 'Authentication required');
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

      throw getHealthError('UNAUTHORIZED', 'Invalid or expired token');
    } else {
      // No local keys, use auth service
      const authServiceUrl = c.env.AUTH_SERVICE_URL || 'http://localhost:3001';
      const verification = await verifyTokenWithAuthService(token, authServiceUrl);

      if (!verification) {
        throw getHealthError('UNAUTHORIZED', 'Invalid or expired token');
      }

      c.set('userId', verification.userId);
      c.set('roles', verification.roles);
    }

    await next();
  };
}

/**
 * Require active user middleware
 * Must be used after requireAuth
 */
export function requireActiveUser(): MiddlewareHandler<{ Variables: { userId: string } }> {
  return async (c: Context, next: Next) => {
    const userId = c.get('userId');

    if (!userId) {
      throw getHealthError('UNAUTHORIZED', 'Authentication required');
    }

    await next();
  };
}

/**
 * Require specific role middleware
 */
export function requireRole(role: string): MiddlewareHandler<{ Variables: { roles: string[] } }> {
  return async (c: Context, next: Next) => {
    const roles = c.get('roles') || [];

    if (!roles.includes(role)) {
      throw getHealthError(
        'FORBIDDEN',
        `Required role: ${role}`,
        403
      );
    }

    await next();
  };
}

/**
 * Require admin role
 */
export const requireAdmin = () => requireRole('admin');

/**
 * Re-export utilities from auth-core
 */
export { getClientIP, getUserAgent };
