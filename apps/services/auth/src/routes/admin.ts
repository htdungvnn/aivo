/**
 * Admin routes
 * Handles admin-only account operations
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthEnv } from '../middleware/auth';
import { requireAuth, requireAdmin, getAuthUser, getClientIP, getUserAgent } from '../middleware/auth';
import { createAuthService } from '../services/auth';
import { getUserById, getUserRoles, getUserIdentities } from '../db/queries';

const admin = new Hono<{ Bindings: AuthEnv }>();

// Apply admin middleware to all routes
admin.use('/*', requireAdmin());

/**
 * GET /admin/users/:userId
 * Get user info for admin
 */
admin.get('/users/:userId', async (c) => {
  const userId = c.req.param('userId');
  const adminUser = getAuthUser(c)!;
  
  const user = await getUserById(c.env.DB, userId);
  
  if (!user) {
    return c.json(
      {
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
          requestId: c.get('requestId'),
        },
      },
      404
    );
  }
  
  const roles = await getUserRoles(c.env.DB, userId);
  const identities = await getUserIdentities(c.env.DB, userId);
  
  return c.json({
    data: {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        status: user.status,
        emailVerifiedAt: user.email_verified_at,
        authVersion: user.auth_version,
        createdAt: user.created_at,
      },
      roles: roles.map(r => ({ code: r.code, name: r.name, isSystem: r.is_system })),
      identities: identities.map(i => ({
        provider: i.provider,
        providerEmail: i.provider_email,
        providerEmailVerified: i.provider_email_verified,
        createdAt: i.created_at,
      })),
    },
    requestId: c.get('requestId'),
  });
});

/**
 * GET /admin/users
 * List all users (paginated)
 */
admin.get('/users', async (c) => {
  const cursor = c.req.query('cursor');
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
  
  // For simplicity, return empty list - would need to implement pagination properly
  return c.json({
    data: {
      users: [],
      nextCursor: null,
    },
    requestId: c.get('requestId'),
  });
});

/**
 * POST /admin/users/:userId/suspend
 * Suspend a user
 */
admin.post('/users/:userId/suspend', async (c) => {
  const userId = c.req.param('userId');
  const adminUser = getAuthUser(c)!;
  
  // Can't suspend yourself
  if (userId === adminUser.id) {
    return c.json(
      {
        error: {
          code: 'INVALID_REQUEST',
          message: 'Cannot suspend your own account',
          requestId: c.get('requestId'),
        },
      },
      400
    );
  }
  
  const authService = createAuthService(c.env.DB);
  
  try {
    const user = await authService.suspendUser(
      userId,
      adminUser.id,
      getClientIP(c.req.raw),
      getUserAgent(c.req.raw)
    );
    
    return c.json({
      data: {
        user: {
          id: user.id,
          status: user.status,
        },
        message: 'User suspended successfully',
      },
      requestId: c.get('requestId'),
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as any).code === 'NOT_FOUND') {
      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
            requestId: c.get('requestId'),
          },
        },
        404
      );
    }
    
    console.error('Suspend user error:', error);
    
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to suspend user',
          requestId: c.get('requestId'),
        },
      },
      500
    );
  }
});

/**
 * POST /admin/users/:userId/reactivate
 * Reactivate a suspended user
 */
admin.post('/users/:userId/reactivate', async (c) => {
  const userId = c.req.param('userId');
  const adminUser = getAuthUser(c)!;
  
  const authService = createAuthService(c.env.DB);
  
  try {
    const user = await authService.reactivateUser(
      userId,
      adminUser.id,
      getClientIP(c.req.raw),
      getUserAgent(c.req.raw)
    );
    
    return c.json({
      data: {
        user: {
          id: user.id,
          status: user.status,
        },
        message: 'User reactivated successfully',
      },
      requestId: c.get('requestId'),
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as any).code === 'NOT_FOUND') {
      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
            requestId: c.get('requestId'),
          },
        },
        404
      );
    }
    
    console.error('Reactivate user error:', error);
    
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to reactivate user',
          requestId: c.get('requestId'),
        },
      },
      500
    );
  }
});

/**
 * POST /admin/users/:userId/roles
 * Assign role to user
 */
admin.post('/users/:userId/roles', async (c) => {
  const userId = c.req.param('userId');
  const adminUser = getAuthUser(c)!;
  const body = await c.req.json().catch(() => ({}));
  
  const schema = z.object({
    role: z.string().min(1, 'Role is required'),
  });
  
  const result = schema.safeParse(body);
  
  if (!result.success) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          requestId: c.get('requestId'),
        },
      },
      400
    );
  }
  
  const { role } = result.data;
  
  // Prevent assigning admin role to others (admin can only be assigned in database)
  if (role === 'admin' && userId !== adminUser.id) {
    return c.json(
      {
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot assign admin role',
          requestId: c.get('requestId'),
        },
      },
      403
    );
  }
  
  const authService = createAuthService(c.env.DB);
  
  try {
    await authService.assignRole(userId, role, adminUser.id, getClientIP(c.req.raw), getUserAgent(c.req.raw));
    
    return c.json({
      data: {
        message: 'Role assigned successfully',
      },
      requestId: c.get('requestId'),
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as any).code === 'NOT_FOUND') {
      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'User or role not found',
            requestId: c.get('requestId'),
          },
        },
        404
      );
    }
    
    console.error('Assign role error:', error);
    
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to assign role',
          requestId: c.get('requestId'),
        },
      },
      500
    );
  }
});

/**
 * DELETE /admin/users/:userId/roles/:role
 * Remove role from user
 */
admin.delete('/users/:userId/roles/:role', async (c) => {
  const userId = c.req.param('userId');
  const roleCode = c.req.param('role');
  const adminUser = getAuthUser(c)!;
  
  // Prevent removing admin role from yourself
  if (roleCode === 'admin' && userId === adminUser.id) {
    return c.json(
      {
        error: {
          code: 'INVALID_REQUEST',
          message: 'Cannot remove admin role from yourself',
          requestId: c.get('requestId'),
        },
      },
      400
    );
  }
  
  const authService = createAuthService(c.env.DB);
  
  try {
    await authService.removeRole(userId, roleCode, adminUser.id, getClientIP(c.req.raw), getUserAgent(c.req.raw));
    
    return c.json({
      data: {
        message: 'Role removed successfully',
      },
      requestId: c.get('requestId'),
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as any).code === 'NOT_FOUND') {
      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'User or role not found',
            requestId: c.get('requestId'),
          },
        },
        404
      );
    }
    
    console.error('Remove role error:', error);
    
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to remove role',
          requestId: c.get('requestId'),
        },
      },
      500
    );
  }
});

export default admin;
