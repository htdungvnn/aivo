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

// Environment config for OAuth
interface OAuthEnv extends AuthEnv {
  WEB_APP_URL?: string;
  GOOGLE_REDIRECT_URI?: string;
  FACEBOOK_REDIRECT_URI?: string;
}

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

/**
 * GET /auth/callback/:provider
 * Handle OAuth callback (redirects to /oauth/callback/:provider)
 * This route exists for backward compatibility with existing redirect URIs
 */
auth.get('/callback/:provider', async (c) => {
  const request = c.req.raw;
  const provider = c.req.param('provider') as 'google' | 'facebook';
  
  // Forward to the oauth callback handler by constructing the internal URL
  // The query params are: code, state, error, error_description
  const code = c.req.query('code');
  const state = c.req.query('state');
  const error = c.req.query('error');
  const errorDescription = c.req.query('error_description');
  
  // For web clients, we need to return the callback data in a way the page can handle
  // The web app expects a JSON response with tokens
  const authService = createAuthService(c.env.DB);
  const env = c.env as OAuthEnv;
  
  try {
    // Handle OAuth errors from provider
    if (error) {
      await createAuditLog(c.env.DB, {
        action: 'oauth.error',
        success: false,
        ipAddress: getClientIP(request),
        userAgent: getUserAgent(request),
        metadata: { provider, error, errorDescription },
      });
      
      // Redirect to error page with query params
      const errorPageUrl = new URL('/auth/error', env.WEB_APP_URL || 'http://localhost:3000');
      errorPageUrl.searchParams.set('error', error);
      if (errorDescription) errorPageUrl.searchParams.set('error_description', errorDescription);
      
      return c.redirect(errorPageUrl.toString(), 302);
    }
    
    if (!code || !state) {
      return c.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing code or state parameter',
            requestId: c.get('requestId'),
          },
        },
        400
      );
    }
    
    // Determine redirect URI based on provider
    let redirectUri: string;
    if (provider === 'google') {
      redirectUri = env.GOOGLE_REDIRECT_URI || `${env.WEB_APP_URL}/auth/callback/google`;
    } else {
      redirectUri = env.FACEBOOK_REDIRECT_URI || `${env.WEB_APP_URL}/auth/callback/facebook`;
    }
    
    const result = await authService.handleOAuthCallback({
      provider,
      code,
      state,
      redirectUri,
      ipAddress: getClientIP(request),
      userAgent: getUserAgent(request),
    });
    
    // Determine redirect URL based on email verification
    let redirectUrl = env.WEB_APP_URL || 'http://localhost:3000';
    
    if (result.emailVerificationRequired) {
      redirectUrl += `/verify-email?status=pending&email=${encodeURIComponent(result.user.email)}`;
    } else {
      redirectUrl += '/dashboard';
    }
    
    // Add tokens as query params for the client to extract
    const finalUrl = new URL(redirectUrl);
    finalUrl.searchParams.set('access_token', result.tokens.accessToken);
    finalUrl.searchParams.set('refresh_token', result.tokens.refreshToken);
    finalUrl.searchParams.set('expires_in', String(result.tokens.expiresIn));
    finalUrl.searchParams.set('token_type', result.tokens.tokenType);
    if (result.isNewUser) {
      finalUrl.searchParams.set('new_user', 'true');
    }
    
    return c.redirect(finalUrl.toString(), 302);
  } catch (error) {
    console.error('OAuth callback error:', error);
    
    // Redirect to error page
    const errorPageUrl = new URL('/auth/error', env.WEB_APP_URL || 'http://localhost:3000');
    errorPageUrl.searchParams.set('error', 'oauth_callback_failed');
    errorPageUrl.searchParams.set('error_description', error instanceof Error ? error.message : 'OAuth authentication failed');
    
    return c.redirect(errorPageUrl.toString(), 302);
  }
});

export default auth;
