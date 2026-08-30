/**
 * Session routes
 * Handles session listing and revocation
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthEnv } from '../middleware/auth';
import { requireAuth, getAuthUser, getClientIP, getUserAgent } from '../middleware/auth';
import { getUserSessions, revokeSession } from '../db/queries';
import { createAuditLog } from '../db/queries';
import { TokenService, createTokenService } from '../lib/tokens';

const sessions = new Hono<{ Bindings: AuthEnv }>();

/**
 * GET /sessions
 * List current user's sessions
 */
sessions.get('/', requireAuth(), async (c) => {
  const user = getAuthUser(c)!;
  const currentSession = c.get('session');
  
  const userSessions = await getUserSessions(c.env.DB, user.id);
  
  return c.json({
    data: {
      sessions: userSessions.map(session => ({
        id: session.id,
        clientType: session.client_type,
        deviceName: session.device_name,
        platform: session.platform,
        userAgent: session.user_agent,
        ipAddress: session.ip_address,
        createdAt: session.created_at,
        lastActiveAt: session.last_active_at,
        expiresAt: session.expires_at,
        isCurrent: session.id === currentSession.id,
      })),
    },
    requestId: c.get('requestId'),
  });
});

/**
 * DELETE /sessions/:sessionId
 * Revoke a specific session
 */
sessions.delete('/:sessionId', requireAuth(), async (c) => {
  const user = getAuthUser(c)!;
  const sessionId = c.req.param('sessionId');
  const currentSession = c.get('session');
  
  // Get sessions
  const userSessions = await getUserSessions(c.env.DB, user.id);
  const targetSession = userSessions.find(s => s.id === sessionId);
  
  if (!targetSession) {
    return c.json(
      {
        error: {
          code: 'NOT_FOUND',
          message: 'Session not found',
          requestId: c.get('requestId'),
        },
      },
      404
    );
  }
  
  // Can't revoke current session via this endpoint
  if (sessionId === currentSession.id) {
    return c.json(
      {
        error: {
          code: 'INVALID_REQUEST',
          message: 'Use logout endpoint to revoke current session',
          requestId: c.get('requestId'),
        },
      },
      400
    );
  }
  
  const tokenService = createTokenService(c.env.DB);
  await tokenService.revokeSession(sessionId, user.id, 'user_revoked');
  
  await createAuditLog(c.env.DB, {
    userId: user.id,
    sessionId,
    action: 'session.revoked',
    success: true,
    ipAddress: getClientIP(c.req.raw),
    userAgent: getUserAgent(c.req.raw),
    metadata: { revokedBy: 'user' },
  });
  
  return c.json({
    data: { success: true },
    requestId: c.get('requestId'),
  });
});

/**
 * DELETE /sessions
 * Revoke all sessions except current
 */
sessions.delete('/', requireAuth(), async (c) => {
  const user = getAuthUser(c)!;
  const currentSession = c.get('session');
  
  // Get all user sessions
  const userSessions = await getUserSessions(c.env.DB, user.id);
  
  // Revoke all except current
  const tokenService = createTokenService(c.env.DB);
  let revokedCount = 0;
  
  for (const session of userSessions) {
    if (session.id !== currentSession.id) {
      await tokenService.revokeSession(session.id, user.id, 'user_revoked_all');
      revokedCount++;
    }
  }
  
  await createAuditLog(c.env.DB, {
    userId: user.id,
    sessionId: currentSession.id,
    action: 'session.revoked',
    success: true,
    ipAddress: getClientIP(c.req.raw),
    userAgent: getUserAgent(c.req.raw),
    metadata: { count: revokedCount, revokedBy: 'user' },
  });
  
  return c.json({
    data: { success: true, revokedCount },
    requestId: c.get('requestId'),
  });
});

export default sessions;
