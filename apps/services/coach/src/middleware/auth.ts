/**
 * Coach Service - Authentication Middleware
 */

import { Context, MiddlewareHandler } from 'hono';
import type { CoachContext } from '../env.d';
import { AuthError } from './index';

/**
 * Authentication middleware
 * Validates JWT token from Authorization header
 */
export const authMiddleware = (): MiddlewareHandler<CoachContext> => {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader) {
      throw new AuthError('Missing Authorization header');
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      throw new AuthError('Invalid Authorization header format');
    }
    
    const token = authHeader.substring(7);
    
    if (!token) {
      throw new AuthError('Missing token');
    }
    
    try {
      // Verify token and extract user ID
      const userId = await verifyToken(token, c);
      
      // Set user ID in context
      c.set('userId', userId);
      
      await next();
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Invalid or expired token');
    }
  };
};

/**
 * Verify JWT token and return user ID
 * In production, this would verify against the auth service
 */
async function verifyToken(token: string, c: Context<CoachContext>): Promise<string> {
  // Decode JWT (in production, verify signature against auth service public key)
  const parts = token.split('.');
  
  if (parts.length !== 3) {
    throw new AuthError('Invalid token format');
  }
  
  try {
    const payload = JSON.parse(atob(parts[1]));
    
    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      throw new AuthError('Token expired');
    }
    
    // Check issuer
    if (payload.iss !== 'aivo') {
      throw new AuthError('Invalid token issuer');
    }
    
    // Return user ID
    if (!payload.sub) {
      throw new AuthError('Missing user ID in token');
    }
    
    return payload.sub;
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError('Failed to decode token');
  }
}

/**
 * Optional auth middleware - doesn't fail if no token
 */
export const optionalAuthMiddleware = (): MiddlewareHandler<CoachContext> => {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      if (token) {
        try {
          const userId = await verifyToken(token, c);
          c.set('userId', userId);
        } catch {
          // Ignore auth errors for optional auth
        }
      }
    }
    
    await next();
  };
};
