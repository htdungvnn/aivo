/**
 * Authentication Middleware for Health Worker
 */

import type { Context, Next } from 'hono';
import type { HealthEnv } from '../types/env.js';
import { getHealthError } from './errors.js';

/**
 * Get client IP from request
 */
export function getClientIP(request: Request): string | null {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    request.headers.get('X-Real-IP') ||
    null
  );
}

/**
 * Get user agent from request
 */
export function getUserAgent(request: Request): string | null {
  return request.headers.get('User-Agent');
}

/**
 * Extract bearer token from request
 */
function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

/**
 * Verify token with auth service
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
    
    const data = await response.json();
    return {
      userId: data.data.userId,
      roles: data.data.roles || [],
    };
  } catch {
    return null;
  }
}

/**
 * Require authentication middleware
 */
export function requireAuth() {
  return async (c: Context<{ Bindings: HealthEnv }>, next: Next) => {
    const token = extractBearerToken(c.req.raw);
    
    if (!token) {
      throw getHealthError('UNAUTHORIZED', 'Authentication required');
    }
    
    const authServiceUrl = c.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    const verification = await verifyTokenWithAuthService(token, authServiceUrl);
    
    if (!verification) {
      throw getHealthError('UNAUTHORIZED', 'Invalid or expired token');
    }
    
    c.set('userId', verification.userId);
    
    await next();
  };
}

/**
 * Require active user middleware
 */
export function requireActiveUser() {
  return async (c: Context, next: Next) => {
    const userId = c.get('userId');
    
    if (!userId) {
      throw getHealthError('UNAUTHORIZED', 'Authentication required');
    }
    
    await next();
  };
}
