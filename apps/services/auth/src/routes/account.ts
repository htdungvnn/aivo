/**
 * Account routes
 * Handles account deletion
 */

import { Hono } from 'hono';
import type { AuthEnv } from '../middleware/auth';
import { requireAuth, getAuthUser, getClientIP, getUserAgent } from '../middleware/auth';
import { createAuthService } from '../services/auth';

const account = new Hono<{ Bindings: AuthEnv }>();

/**
 * DELETE /account
 * Soft delete current user's account
 */
account.delete('/', requireAuth(), async (c) => {
  const user = getAuthUser(c)!;
  
  const authService = createAuthService(c.env.DB);
  
  try {
    await authService.deleteAccount(user.id, getClientIP(c.req.raw), getUserAgent(c.req.raw));
    
    return c.json({
      data: {
        message: 'Account deleted successfully',
      },
      requestId: c.get('requestId'),
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete account',
          requestId: c.get('requestId'),
        },
      },
      500
    );
  }
});

/**
 * GET /account
 * Get current account info
 */
account.get('/', requireAuth(), async (c) => {
  const user = getAuthUser(c)!;
  const { getUserRoles } = await import('../db/queries');
  const roles = await getUserRoles(c.env.DB, user.id);
  
  return c.json({
    data: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      status: user.status,
      emailVerifiedAt: user.email_verified_at,
      createdAt: user.created_at,
      roles: roles.map(r => ({ code: r.code, name: r.name })),
    },
    requestId: c.get('requestId'),
  });
});

export default account;
