/**
 * Authentication middleware for the Nutrition Worker
 * Validates JWT tokens and extracts user information
 */

import type { Context, Next } from 'hono';
import type { NutritionEnv } from '../types/env';
import { NutritionError } from './index';

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
 * Validates JWT token and sets user context
 */
export function requireAuth() {
  return async (c: Context<{ Bindings: NutritionEnv }>, next: Next) => {
    const token = extractBearerToken(c.req.raw);
    
    if (!token) {
      throw NutritionError.unauthorized('Authentication required');
    }
    
    const authServiceUrl = c.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    const verification = await verifyTokenWithAuthService(token, authServiceUrl);
    
    if (!verification) {
      throw NutritionError.unauthorized('Invalid or expired token');
    }
    
    c.set('userId', verification.userId);
    
    await next();
  };
}

/**
 * Require active user middleware
 * Must be used after requireAuth
 */
export function requireActiveUser() {
  return async (c: Context, next: Next) => {
    // Additional checks can be added here if needed
    // For now, we just ensure userId is set
    const userId = c.get('userId');
    
    if (!userId) {
      throw NutritionError.unauthorized('Authentication required');
    }
    
    await next();
  };
}

/**
 * Require specific role middleware
 */
export function requireRole(role: string) {
  return async (c: Context, next: Next) => {
    // In a real implementation, we would verify roles from the auth service
    // For now, roles are not enforced in the nutrition service
    await next();
  };
}
