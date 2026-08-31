/**
 * Auth Context Helpers
 * 
 * Utility functions for accessing auth context in handlers.
 */

import type { Context } from 'hono';
import type { JWTPayload, UserStatus } from '../types/index.js';

/**
 * Get authenticated user ID from context
 */
export function getAuthUserId(c: Context): string | undefined {
  return c.get('userId');
}

/**
 * Get authenticated user from context
 */
export function getAuthUser(c: Context): {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  authVersion: number;
} | undefined {
  return c.get('user');
}

/**
 * Get user roles from context
 */
export function getAuthRoles(c: Context): string[] {
  return c.get('userRoles') ?? [];
}

/**
 * Get JWT payload from context
 */
export function getAuthPayload(c: Context): JWTPayload | undefined {
  return c.get('authPayload');
}

/**
 * Get session from context
 */
export function getAuthSession(c: Context): {
  id: string;
  clientType: string;
  userAgent: string | null;
  ipAddress: string | null;
} | undefined {
  return c.get('session');
}

/**
 * Check if user has a specific role
 */
export function hasRole(c: Context, role: string): boolean {
  const roles = getAuthRoles(c);
  return roles.includes(role);
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(c: Context, roles: string[]): boolean {
  const userRoles = getAuthRoles(c);
  return roles.some(role => userRoles.includes(role));
}

/**
 * Check if user has all specified roles
 */
export function hasAllRoles(c: Context, roles: string[]): boolean {
  const userRoles = getAuthRoles(c);
  return roles.every(role => userRoles.includes(role));
}

/**
 * Check if user is admin
 */
export function isAdmin(c: Context): boolean {
  return hasRole(c, 'admin');
}

/**
 * Check if user is super admin
 */
export function isSuperAdmin(c: Context): boolean {
  return hasRole(c, 'super_admin');
}

/**
 * Require authentication and throw if not authenticated
 */
export function requireAuthUser(c: Context): NonNullable<ReturnType<typeof getAuthUser>> {
  const user = getAuthUser(c);
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

/**
 * Require specific role and throw if not authorized
 */
export function requireAuthRole(c: Context, role: string): void {
  if (!hasRole(c, role)) {
    throw new Error(`Required role: ${role}`);
  }
}
