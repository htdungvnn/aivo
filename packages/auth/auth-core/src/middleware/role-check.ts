/**
 * Role Check Middleware
 * 
 * Middleware for role-based access control (RBAC).
 * Must be used after requireAuth middleware.
 */

import type { Context, Next, MiddlewareHandler } from 'hono';
import { AUTH_ERROR_CODES } from '../types/errors.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Role requirements for access
 */
export interface RoleRequirement {
  /** Minimum one of these roles required */
  any?: string[];
  /** All of these roles required */
  all?: string[];
  /** Exclude users with these roles */
  exclude?: string[];
}

// =============================================================================
// Role Check Middleware Factory
// =============================================================================

/**
 * Create middleware that requires specific roles
 * 
 * @example
 * // Require admin role
 * app.use('/admin/*', requireRole('admin'));
 * 
 * @example
 * // Require either admin or moderator
 * app.use('/moderate/*', requireAnyRole(['admin', 'moderator']));
 * 
 * @example
 * // Require both editor and publisher roles
 * app.use('/publish/*', requireAllRoles(['editor', 'publisher']));
 */
export function requireRole(role: string): MiddlewareHandler {
  return requireAnyRole([role]);
}

/**
 * Require at least one of the specified roles
 */
export function requireAnyRole(roles: string[]): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const userRoles = c.get('userRoles') as string[] | undefined;

    if (!userRoles || userRoles.length === 0) {
      return c.json(
        {
          error: {
            code: AUTH_ERROR_CODES.FORBIDDEN,
            message: 'Access denied',
            requestId: c.get('requestId'),
          },
        },
        403
      );
    }

    const hasRole = roles.some(role => userRoles.includes(role));

    if (!hasRole) {
      return c.json(
        {
          error: {
            code: AUTH_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
            message: `Required role: ${roles.join(' or ')}`,
            requestId: c.get('requestId'),
          },
        },
        403
      );
    }

    await next();
    return;
  };
}

/**
 * Require all specified roles
 */
export function requireAllRoles(roles: string[]): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const userRoles = c.get('userRoles') as string[] | undefined;

    if (!userRoles || userRoles.length === 0) {
      return c.json(
        {
          error: {
            code: AUTH_ERROR_CODES.FORBIDDEN,
            message: 'Access denied',
            requestId: c.get('requestId'),
          },
        },
        403
      );
    }

    const hasAllRoles = roles.every(role => userRoles.includes(role));

    if (!hasAllRoles) {
      return c.json(
        {
          error: {
            code: AUTH_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
            message: `Required roles: ${roles.join(', ')}`,
            requestId: c.get('requestId'),
          },
        },
        403
      );
    }

    await next();
    return;
  };
}

/**
 * Exclude users with specified roles
 */
export function excludeRoles(roles: string[]): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const userRoles = c.get('userRoles') as string[] | undefined;

    if (userRoles && userRoles.some(role => roles.includes(role))) {
      return c.json(
        {
          error: {
            code: AUTH_ERROR_CODES.FORBIDDEN,
            message: 'Access denied for this role',
            requestId: c.get('requestId'),
          },
        },
        403
      );
    }

    await next();
    return;
  };
}

/**
 * Require admin role
 */
export const requireAdmin = () => requireRole('admin');

/**
 * Require super admin role
 */
export const requireSuperAdmin = () => requireRole('super_admin');

/**
 * Create middleware with custom role requirements
 */
export function requireRoles(requirement: RoleRequirement): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const userRoles = c.get('userRoles') as string[] | undefined;

    // Check exclusion first
    if (requirement.exclude && userRoles) {
      const hasExcludedRole = requirement.exclude.some(role => userRoles.includes(role));
      if (hasExcludedRole) {
        return c.json(
          {
            error: {
              code: AUTH_ERROR_CODES.FORBIDDEN,
              message: 'Access denied for this role',
              requestId: c.get('requestId'),
            },
          },
          403
        );
      }
    }

    // Check "any" requirement
    if (requirement.any && requirement.any.length > 0) {
      const hasAnyRole = requirement.any.some(role => userRoles?.includes(role));
      if (!hasAnyRole) {
        return c.json(
          {
            error: {
              code: AUTH_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
              message: `Required role: ${requirement.any.join(' or ')}`,
              requestId: c.get('requestId'),
            },
          },
          403
        );
      }
    }

    // Check "all" requirement
    if (requirement.all && requirement.all.length > 0) {
      const hasAllRoles = requirement.all.every(role => userRoles?.includes(role));
      if (!hasAllRoles) {
        return c.json(
          {
            error: {
              code: AUTH_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
              message: `Required roles: ${requirement.all.join(', ')}`,
              requestId: c.get('requestId'),
            },
          },
          403
        );
      }
    }

    await next();
    return;
  };
}
