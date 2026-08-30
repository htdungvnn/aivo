/**
 * Authentication and authorization middleware
 */

import type { Context, Next } from 'hono';
import type { D1Database } from '@cloudflare/workers-types';
import type { JWTPayload, ClientType } from '../types';
import { getJWTService } from '../lib/jwt';
import { getValidSession, getUserById, getUserRoles } from '../db/queries';

export interface AuthEnv {
  DB: D1Database;
  AUTH_JWT_PUBLIC_KEY?: string;
  AUTH_JWT_ISSUER?: string;
  AUTH_JWT_AUDIENCE?: string;
}

/**
 * Get client type from request
 */
function getClientType(env: AuthEnv, request: Request): ClientType {
  const ua = request.headers.get('User-Agent') || '';
  
  if (ua.includes('Mozilla/5.0')) {
    return 'web';
  }
  
  // Check for platform-specific headers or other indicators
  const secChUaMobile = request.headers.get('Sec-CH-UA-Mobile');
  if (secChUaMobile === '?1') {
    // Likely mobile
    const platform = request.headers.get('Sec-CH-UA-Platform') || '';
    if (platform.toLowerCase().includes('ios') || ua.includes('iPhone') || ua.includes('iPad')) {
      return 'ios';
    }
    return 'android';
  }
  
  return 'web';
}

/**
 * Extract token from request
 */
function extractToken(request: Request, env: AuthEnv): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  
  // For web, try cookie
  const cookies = request.headers.get('Cookie') || '';
  const match = cookies.match(/aivo_access_token=([^;]+)/);
  if (match) {
    return match[1];
  }
  
  return null;
}

/**
 * Extract refresh token from request
 */
function extractRefreshToken(request: Request): string | null {
  // For web, try cookie
  const cookies = request.headers.get('Cookie') || '';
  const match = cookies.match(/aivo_refresh_token=([^;]+)/);
  if (match) {
    return match[1];
  }
  
  // For mobile, try body
  // This is handled in the refresh endpoint
  
  return null;
}

/**
 * Get IP address from request
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
 * Require authentication middleware
 * Validates JWT and checks session/account status
 */
export function requireAuth() {
  return async (c: Context<{ Bindings: AuthEnv }>, next: Next) => {
    const request = c.req.raw;
    const token = extractToken(request, c.env);
    
    if (!token) {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            requestId: c.get('requestId'),
          },
        },
        401
      );
    }
    
    const jwtService = getJWTService();
    const payload = await jwtService.verifyAccessToken(token);
    
    if (!payload) {
      return c.json(
        {
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token',
            requestId: c.get('requestId'),
          },
        },
        401
      );
    }
    
    // Verify session exists and is valid
    const session = await getValidSession(c.env.DB, payload.sid);
    if (!session) {
      return c.json(
        {
          error: {
            code: 'SESSION_EXPIRED',
            message: 'Session has expired',
            requestId: c.get('requestId'),
          },
        },
        401
      );
    }
    
    // Verify user exists
    const user = await getUserById(c.env.DB, payload.sub);
    if (!user) {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not found',
            requestId: c.get('requestId'),
          },
        },
        401
      );
    }
    
    // Check auth version
    if (payload.ver !== user.auth_version) {
      return c.json(
        {
          error: {
            code: 'INVALID_TOKEN',
            message: 'Account has been modified. Please log in again.',
            requestId: c.get('requestId'),
          },
        },
        401
      );
    }
    
    // Check account status
    if (user.status === 'suspended') {
      return c.json(
        {
          error: {
            code: 'ACCOUNT_SUSPENDED',
            message: 'Your account has been suspended',
            requestId: c.get('requestId'),
          },
        },
        403
      );
    }
    
    if (user.status === 'deleted') {
      return c.json(
        {
          error: {
            code: 'ACCOUNT_DELETED',
            message: 'Your account has been deleted',
            requestId: c.get('requestId'),
          },
        },
        401
      );
    }
    
    // Get current roles from database (not just from token)
    const roles = await getUserRoles(c.env.DB, user.id);
    
    // Set auth context
    c.set('user', user);
    c.set('session', session);
    c.set('userRoles', roles.map(r => r.code));
    c.set('authPayload', payload);
    
    await next();
  };
}

/**
 * Require active account middleware
 * Must be used after requireAuth
 */
export function requireActiveAccount() {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    
    if (!user) {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            requestId: c.get('requestId'),
          },
        },
        401
      );
    }
    
    if (user.status !== 'active') {
      if (user.status === 'pending_verification') {
        return c.json(
          {
            error: {
              code: 'EMAIL_VERIFICATION_REQUIRED',
              message: 'Please verify your email to continue',
              requestId: c.get('requestId'),
            },
          },
          403
        );
      }
      
      return c.json(
        {
          error: {
            code: 'ACCOUNT_SUSPENDED',
            message: 'Your account is not active',
            requestId: c.get('requestId'),
          },
        },
        403
      );
    }
    
    await next();
  };
}

/**
 * Require specific role middleware
 */
export function requireRole(role: string) {
  return async (c: Context, next: Next) => {
    const userRoles = c.get('userRoles') as string[] | undefined;
    
    if (!userRoles || !userRoles.includes(role)) {
      return c.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to perform this action',
            requestId: c.get('requestId'),
          },
        },
        403
      );
    }
    
    await next();
  };
}

/**
 * Require admin role middleware
 */
export function requireAdmin() {
  return async (c: Context, next: Next) => {
    const userRoles = c.get('userRoles') as string[] | undefined;
    
    if (!userRoles || !userRoles.includes('admin')) {
      return c.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required',
            requestId: c.get('requestId'),
          },
        },
        403
      );
    }
    
    await next();
  };
}

/**
 * Get authenticated user from context
 */
export function getAuthUser(c: Context) {
  return c.get('user');
}

/**
 * Get session from context
 */
export function getAuthSession(c: Context) {
  return c.get('session');
}

/**
 * Get user roles from context
 */
export function getAuthRoles(c: Context): string[] {
  return c.get('userRoles') || [];
}
