/**
 * Authentication routes
 * Handles current user, token refresh, and logout
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthEnv } from '../middleware/auth';
import { requireAuth, getAuthUser, getAuthSession, getClientIP, getUserAgent } from '../middleware/auth';
import { createAuthService } from '../services/auth';
import { TokenService, createTokenService } from '../lib/tokens';
import { createAuditLog, getUserRoles, getUserSessions, revokeSession } from '../db/queries';

const auth = new Hono<{ Bindings: AuthEnv }>();

/**
 * GET /auth/me
 * Get current user
 */
auth.get('/me', requireAuth(), async (c) => {
  const user = getAuthUser(c)!;
  const session = getAuthSession(c)!;
  const roles = await getUserRoles(c.env.DB, user.id);
  
  return c.json({
    data: {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        status: user.status,
        emailVerifiedAt: user.email_verified_at,
        createdAt: user.created_at,
      },
      roles: roles.map(r => r.code),
      session: {
        id: session.id,
        clientType: session.client_type,
        deviceName: session.device_name,
        platform: session.platform,
        createdAt: session.created_at,
        lastActiveAt: session.last_active_at,
        expiresAt: session.expires_at,
      },
    },
    requestId: c.get('requestId'),
  });
});

/**
 * POST /auth/refresh
 * Refresh access token
 */
auth.post('/refresh', async (c) => {
  const request = c.req.raw;
  const tokenService = createTokenService(c.env.DB);
  
  // Get refresh token from cookie or body
  let refreshToken: string | null = null;
  
  const cookies = request.headers.get('Cookie') || '';
  const cookieMatch = cookies.match(/aivo_refresh_token=([^;]+)/);
  if (cookieMatch) {
    refreshToken = cookieMatch[1];
  } else {
    const body = await request.json().catch(() => ({}));
    refreshToken = body.refreshToken;
  }
  
  if (!refreshToken) {
    return c.json(
      {
        error: {
          code: 'INVALID_REQUEST',
          message: 'Refresh token required',
          requestId: c.get('requestId'),
        },
      },
      400
    );
  }
  
  try {
    const tokenPair = await tokenService.refreshTokens(refreshToken, {
      ipAddress: getClientIP(request),
      userAgent: getUserAgent(request),
    });
    
    const response = c.json({
      data: tokenService.buildTokenResponse(tokenPair),
      requestId: c.get('requestId'),
    });
    
    // For web, set cookies
    const userAgent = getUserAgent(request) || '';
    if (userAgent.includes('Mozilla/5.0')) {
      // Set access token cookie (short-lived, optional)
      // Most clients will store access token in memory
    }
    
    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    
    const code = error instanceof Error && 'code' in error ? (error as any).code : 'INVALID_TOKEN';
    
    return c.json(
      {
        error: {
          code,
          message: error instanceof Error ? error.message : 'Token refresh failed',
          requestId: c.get('requestId'),
        },
      },
      401
    );
  }
});

/**
 * POST /auth/logout
 * Logout current session
 */
auth.post('/logout', requireAuth(), async (c) => {
  const user = getAuthUser(c)!;
  const session = getAuthSession(c)!;
  
  const tokenService = createTokenService(c.env.DB);
  await tokenService.revokeSession(session.id, user.id, 'user_logout');
  
  await createAuditLog(c.env.DB, {
    userId: user.id,
    sessionId: session.id,
    action: 'auth.logout',
    success: true,
    ipAddress: getClientIP(c.req.raw),
    userAgent: getUserAgent(c.req.raw),
  });
  
  return c.json({
    data: { success: true },
    requestId: c.get('requestId'),
  });
});

/**
 * POST /auth/logout-all
 * Logout all sessions
 */
auth.post('/logout-all', requireAuth(), async (c) => {
  const user = getAuthUser(c)!;
  
  const tokenService = createTokenService(c.env.DB);
  await tokenService.revokeAllSessions(user.id);
  
  await createAuditLog(c.env.DB, {
    userId: user.id,
    action: 'auth.logout_all',
    success: true,
    ipAddress: getClientIP(c.req.raw),
    userAgent: getUserAgent(c.req.raw),
  });
  
  return c.json({
    data: { success: true },
    requestId: c.get('requestId'),
  });
});

export default auth;
