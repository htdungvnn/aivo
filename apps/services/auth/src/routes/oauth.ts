/**
 * OAuth routes
 * Handles OAuth initiation and callbacks
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { D1Database } from '@cloudflare/workers-types';
import type { AuthEnv } from '../middleware/auth';
import { requireAuth } from '../middleware/auth';
import { createAuthService } from '../services/auth';
import { getGoogleProvider, getFacebookProvider } from '../providers';
import { createAuditLog } from '../db/queries';
import { getClientIP, getUserAgent } from '../middleware/auth';

const oauth = new Hono<{ Bindings: AuthEnv }>();

// Validation schemas
const oauthStartSchema = z.object({
  provider: z.enum(['google', 'facebook']),
  redirectUri: z.string().optional(),
});

// Environment config
interface OAuthEnv extends AuthEnv {
  WEB_APP_URL?: string;
  MOBILE_REDIRECT_URI?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  FACEBOOK_CLIENT_ID?: string;
  FACEBOOK_CLIENT_SECRET?: string;
  FACEBOOK_REDIRECT_URI?: string;
}

/**
 * POST /oauth/start
 * Start OAuth flow
 */
oauth.post('/start', async (c) => {
  const env = c.env as OAuthEnv;
  const request = c.req.raw;
  
  // Parse and validate body
  const body = await request.json().catch(() => ({}));
  const result = oauthStartSchema.safeParse(body);
  
  if (!result.success) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          requestId: c.get('requestId'),
          details: result.error.flatten(),
        },
      },
      400
    );
  }
  
  const { provider } = result.data;
  
  // Determine client type and redirect URI
  const userAgent = getUserAgent(request) || '';
  const clientType = userAgent.includes('Mozilla/5.0') ? 'web' : 'mobile';
  
  let redirectUri = result.data.redirectUri;
  
  if (!redirectUri) {
    // Use configured redirect URIs
    if (provider === 'google') {
      redirectUri = env.GOOGLE_REDIRECT_URI || `${env.WEB_APP_URL}/auth/callback/google`;
    } else {
      redirectUri = env.FACEBOOK_REDIRECT_URI || `${env.WEB_APP_URL}/auth/callback/facebook`;
    }
  }
  
  // Initialize auth service and OAuth flow
  const authService = createAuthService(c.env.DB);
  
  try {
    const { authUrl, state } = await authService.initOAuthFlow(provider, clientType, redirectUri);
    
    // Audit log
    await createAuditLog(c.env.DB, {
      action: 'oauth.start',
      success: true,
      ipAddress: getClientIP(request),
      userAgent,
      metadata: { provider, clientType },
    });
    
    return c.json({
      data: {
        authUrl,
        state,
        provider,
      },
      requestId: c.get('requestId'),
    });
  } catch (error) {
    console.error('OAuth start error:', error);
    
    // Check if it's our auth service error
    const isAuthError = error instanceof Error && 'code' in error;
    const errorCode = isAuthError ? (error as any).code : 'OAUTH_ERROR';
    const errorMessage = error instanceof Error ? error.message : 'Failed to start OAuth flow';
    
    return c.json(
      {
        error: {
          code: errorCode,
          message: errorMessage,
          requestId: c.get('requestId'),
        },
      },
      500
    );
  }
});

/**
 * GET /oauth/callback/:provider
 * Handle OAuth callback (for web)
 */
oauth.get('/callback/:provider', async (c) => {
  const env = c.env as OAuthEnv;
  const request = c.req.raw;
  const provider = c.req.param('provider') as 'google' | 'facebook';
  
  const code = c.req.query('code');
  const state = c.req.query('state');
  const error = c.req.query('error');
  const errorDescription = c.req.query('error_description');
  
  // Handle OAuth errors from provider
  if (error) {
    await createAuditLog(c.env.DB, {
      action: 'oauth.error',
      success: false,
      ipAddress: getClientIP(request),
      userAgent: getUserAgent(request),
      metadata: { provider, error, errorDescription },
    });
    
    return c.json(
      {
        error: {
          code: 'OAUTH_ERROR',
          message: errorDescription || error,
          requestId: c.get('requestId'),
        },
      },
      400
    );
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
  
  const authService = createAuthService(c.env.DB);
  
  try {
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
    
    // For web, we'll redirect with tokens in secure cookies
    // The client will extract tokens and store them
    return c.json({
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          displayName: result.user.display_name,
          avatarUrl: result.user.avatar_url,
          status: result.user.status,
        },
        tokens: result.tokens,
        isNewUser: result.isNewUser,
        emailVerificationRequired: result.emailVerificationRequired,
        redirectUrl,
      },
      requestId: c.get('requestId'),
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    
    return c.json(
      {
        error: {
          code: 'OAUTH_ERROR',
          message: error instanceof Error ? error.message : 'OAuth authentication failed',
          requestId: c.get('requestId'),
        },
      },
      400
    );
  }
});

/**
 * POST /oauth/mobile/callback
 * Handle mobile OAuth callback (exchanges code from native app)
 */
oauth.post('/mobile/callback', async (c) => {
  const env = c.env as OAuthEnv;
  const request = c.req.raw;
  
  const body = await request.json().catch(() => ({}));
  
  const schema = z.object({
    provider: z.enum(['google', 'facebook']),
    code: z.string(),
    state: z.string(),
    redirectUri: z.string(),
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
  
  const { provider, code, state, redirectUri } = result.data;
  
  const authService = createAuthService(c.env.DB);
  
  try {
    const authResult = await authService.handleOAuthCallback({
      provider,
      code,
      state,
      redirectUri,
      ipAddress: getClientIP(request),
      userAgent: getUserAgent(request),
    });
    
    return c.json({
      data: {
        user: {
          id: authResult.user.id,
          email: authResult.user.email,
          displayName: authResult.user.display_name,
          avatarUrl: authResult.user.avatar_url,
          status: authResult.user.status,
        },
        tokens: authResult.tokens,
        isNewUser: authResult.isNewUser,
        emailVerificationRequired: authResult.emailVerificationRequired,
      },
      requestId: c.get('requestId'),
    });
  } catch (error) {
    console.error('Mobile OAuth callback error:', error);
    
    return c.json(
      {
        error: {
          code: 'OAUTH_ERROR',
          message: error instanceof Error ? error.message : 'Authentication failed',
          requestId: c.get('requestId'),
        },
      },
      400
    );
  }
});

export default oauth;
