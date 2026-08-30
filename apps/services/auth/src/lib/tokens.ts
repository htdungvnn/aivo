/**
 * Token service for managing refresh tokens
 * Handles rotation, reuse detection, and secure storage
 */

import type { D1Database } from '@cloudflare/workers-types';
import type { ClientType, TokenResponse } from '../types';
import {
  createSession,
  createRefreshToken,
  getRefreshTokenByHash,
  getValidSession,
  updateSessionActivity,
  consumeRefreshToken,
  revokeSession,
  revokeSessionTokens,
  revokeTokenFamily,
  getSessionById,
  getUserById,
  getUserRoles,
  getRoleByCode,
} from '../db/queries';
import { hashToken, generateSecureToken, generateUUID } from '../utils/crypto';
import { getJWTService } from './jwt';
import { createAuditLog } from '../db/queries';

const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60; // 30 days in seconds
const SESSION_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Token service for managing access and refresh tokens
 */
export class TokenService {
  constructor(private db: D1Database) {}
  
  /**
   * Create new token pair for user
   */
  async createTokenPair(
    userId: string,
    clientType: ClientType,
    options?: {
      deviceName?: string;
      platform?: string;
      userAgent?: string;
      ipAddress?: string;
    }
  ): Promise<TokenPair> {
    // Get user for auth version
    const user = await getUserById(this.db, userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Get user roles
    const roles = await getUserRoles(this.db, userId);
    const roleCodes = roles.map(r => r.code);
    
    // Create session
    const session = await createSession(this.db, {
      userId,
      clientType,
      deviceName: options?.deviceName,
      platform: options?.platform,
      userAgent: options?.userAgent,
      ipAddress: options?.ipAddress,
      expiresAt: Math.floor(Date.now() / 1000) + SESSION_TTL,
    });
    
    // Generate tokens
    const refreshToken = generateSecureToken(64);
    const refreshTokenHash = await hashToken(refreshToken);
    const tokenFamilyId = generateUUID();
    
    // Create refresh token
    await createRefreshToken(this.db, {
      sessionId: session.id,
      tokenFamilyId,
      tokenHash: refreshTokenHash,
      expiresAt: Math.floor(Date.now() / 1000) + REFRESH_TOKEN_TTL,
    });
    
    // Generate access token
    const jwtService = getJWTService();
    const { token: accessToken, expiresAt } = await jwtService.generateAccessToken({
      userId,
      sessionId: session.id,
      authVersion: user.auth_version,
      roles: roleCodes,
    });
    
    // Audit log
    await createAuditLog(this.db, {
      userId,
      sessionId: session.id,
      action: 'session.created',
      success: true,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      metadata: { clientType },
    });
    
    return { accessToken, refreshToken, expiresAt };
  }
  
  /**
   * Refresh tokens - consume old token and issue new pair
   * Implements rotation with reuse detection
   */
  async refreshTokens(
    refreshToken: string,
    options?: {
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<TokenPair> {
    const tokenHash = await hashToken(refreshToken);
    
    // Find the token
    const storedToken = await getRefreshTokenByHash(this.db, tokenHash);
    
    if (!storedToken) {
      throw new TokenError('Invalid token', 'INVALID_TOKEN');
    }
    
    // Check if token is already consumed (potential reuse attack)
    if (storedToken.consumed_at) {
      // Token was already used - possible attack!
      // Revoke entire token family
      await revokeTokenFamily(this.db, storedToken.token_family_id);
      
      // Also revoke the session
      const session = await getSessionById(this.db, storedToken.session_id);
      if (session) {
        await revokeSession(this.db, session.id, 'token_reuse_detected');
        
        // Audit the security event
        await createAuditLog(this.db, {
          userId: session.user_id,
          sessionId: session.id,
          action: 'auth.token_refresh_error',
          success: false,
          ipAddress: options?.ipAddress,
          userAgent: options?.userAgent,
          metadata: { reason: 'refresh_token_reuse_detected' },
        });
      }
      
      throw new TokenError('Token reuse detected', 'REFRESH_TOKEN_REUSED');
    }
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (storedToken.expires_at < now) {
      throw new TokenError('Token expired', 'TOKEN_EXPIRED');
    }
    
    // Check if token is revoked
    if (storedToken.revoked_at) {
      throw new TokenError('Token revoked', 'INVALID_TOKEN');
    }
    
    // Get the session
    const session = await getValidSession(this.db, storedToken.session_id);
    if (!session) {
      throw new TokenError('Session not found or expired', 'SESSION_EXPIRED');
    }
    
    // Get user
    const user = await getUserById(this.db, session.user_id);
    if (!user) {
      throw new TokenError('User not found', 'INVALID_TOKEN');
    }
    
    // Check user status
    if (user.status === 'suspended') {
      throw new TokenError('Account suspended', 'ACCOUNT_SUSPENDED');
    }
    
    if (user.status === 'deleted') {
      throw new TokenError('Account deleted', 'ACCOUNT_DELETED');
    }
    
    // Consume the old token
    await consumeRefreshToken(this.db, storedToken.id);
    
    // Update session activity
    await updateSessionActivity(this.db, session.id);
    
    // Generate new tokens
    const newRefreshToken = generateSecureToken(64);
    const newRefreshTokenHash = await hashToken(newRefreshToken);
    
    // Create new refresh token (child of the consumed one)
    await createRefreshToken(this.db, {
      sessionId: session.id,
      tokenFamilyId: storedToken.token_family_id,
      tokenHash: newRefreshTokenHash,
      parentTokenId: storedToken.id,
      expiresAt: Math.floor(Date.now() / 1000) + REFRESH_TOKEN_TTL,
    });
    
    // Get updated user roles
    const roles = await getUserRoles(this.db, user.id);
    const roleCodes = roles.map(r => r.code);
    
    // Generate new access token
    const jwtService = getJWTService();
    const { token: accessToken, expiresAt } = await jwtService.generateAccessToken({
      userId: user.id,
      sessionId: session.id,
      authVersion: user.auth_version,
      roles: roleCodes,
    });
    
    // Audit log
    await createAuditLog(this.db, {
      userId: user.id,
      sessionId: session.id,
      action: 'auth.token_refresh',
      success: true,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
    });
    
    return { accessToken, refreshToken: newRefreshToken, expiresAt };
  }
  
  /**
   * Revoke current session
   */
  async revokeSession(sessionId: string, userId: string, reason?: string): Promise<void> {
    await revokeSession(this.db, sessionId, reason);
    
    await createAuditLog(this.db, {
      userId,
      sessionId,
      action: 'session.revoked',
      success: true,
      metadata: { reason },
    });
  }
  
  /**
   * Revoke all sessions for user
   */
  async revokeAllSessions(userId: string): Promise<void> {
    // Get all sessions
    const sessions = await getValidSession(this.db, userId);
    
    for (const session of sessions) {
      await revokeSession(this.db, session.id, 'logout_all');
    }
    
    await createAuditLog(this.db, {
      userId,
      action: 'auth.logout_all',
      success: true,
      metadata: { sessionsRevoked: sessions.length },
    });
  }
  
  /**
   * Build token response object
   */
  buildTokenResponse(pair: TokenPair): TokenResponse {
    return {
      accessToken: pair.accessToken,
      refreshToken: pair.refreshToken,
      expiresIn: pair.expiresAt - Math.floor(Date.now() / 1000),
      tokenType: 'Bearer',
    };
  }
}

/**
 * Token error class
 */
export class TokenError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'TokenError';
  }
}

/**
 * Create token service instance
 */
export function createTokenService(db: D1Database): TokenService {
  return new TokenService(db);
}
