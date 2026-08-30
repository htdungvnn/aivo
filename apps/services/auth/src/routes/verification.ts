/**
 * Email verification routes
 * Handles verification email sending and verification
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthEnv } from '../middleware/auth';
import { requireAuth, getAuthUser, getClientIP, getUserAgent } from '../middleware/auth';
import { createAuthService, AuthServiceError } from '../services/auth';
import { createAuditLog } from '../db/queries';

const verification = new Hono<{ Bindings: AuthEnv }>();

/**
 * POST /verification/send
 * Send or resend verification email
 */
verification.post('/send', requireAuth(), async (c) => {
  const user = getAuthUser(c)!;
  
  // Only allow resending for pending verification users
  if (user.status !== 'pending_verification') {
    return c.json(
      {
        error: {
          code: 'INVALID_REQUEST',
          message: 'Email already verified or account not in verification state',
          requestId: c.get('requestId'),
        },
      },
      400
    );
  }
  
  const authService = createAuthService(c.env.DB);
  
  try {
    await authService.sendVerificationEmail(user);
    
    return c.json({
      data: {
        message: 'Verification email sent',
        email: user.email,
      },
      requestId: c.get('requestId'),
    });
  } catch (error) {
    console.error('Verification email error:', error);
    
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to send verification email',
          requestId: c.get('requestId'),
        },
      },
      500
    );
  }
});

/**
 * POST /verification/verify
 * Verify email with token
 */
verification.post('/verify', async (c) => {
  const request = c.req.raw;
  const body = await request.json().catch(() => ({}));
  
  const schema = z.object({
    token: z.string().min(1, 'Token is required'),
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
  
  const { token } = result.data;
  const authService = createAuthService(c.env.DB);
  
  try {
    const user = await authService.verifyEmail(token, getClientIP(request), getUserAgent(request));
    
    return c.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          status: user.status,
        },
        message: 'Email verified successfully',
      },
      requestId: c.get('requestId'),
    });
  } catch (error) {
    if (error instanceof AuthServiceError) {
      return c.json(
        {
          error: {
            code: error.code,
            message: error.message,
            requestId: c.get('requestId'),
          },
        },
        error.statusCode
      );
    }
    
    console.error('Email verification error:', error);
    
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to verify email',
          requestId: c.get('requestId'),
        },
      },
      500
    );
  }
});

export default verification;
