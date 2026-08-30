/**
 * Email verification routes
 * Handles 6-digit verification code sending and verification via Queue
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthEnv } from '../middleware/auth';
import { requireAuth, getAuthUser, getClientIP, getUserAgent } from '../middleware/auth';
import { createAuditLog } from '../db/queries';
import {
  createVerificationCode,
  verifyVerificationCode,
  checkRateLimit,
} from '../services/verification';
import { updateUser, getUserById } from '../db/queries';

const verification = new Hono<{ Bindings: AuthEnv }>();

/**
 * POST /verification/send
 * Send or resend 6-digit verification code via Queue
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
  
  // Check rate limit
  const rateLimit = await checkRateLimit({
    db: c.env.DB,
    userId: user.id,
  });
  
  if (!rateLimit.allowed) {
    const retryAfter = rateLimit.cooldownExpiresAt
      ? Math.ceil((rateLimit.cooldownExpiresAt - Date.now()) / 1000)
      : 60;
    
    c.header('Retry-After', String(retryAfter));
    
    return c.json(
      {
        error: {
          code: 'RATE_LIMITED',
          message: 'Please wait before requesting another verification code',
          requestId: c.get('requestId'),
        },
      },
      429
    );
  }
  
  try {
    // Create verification code and publish to Queue
    const { code, correlationId } = await createVerificationCode({
      db: c.env.DB,
      emailQueue: c.env.EMAIL_QUEUE,
      userId: user.id,
      email: user.email,
      displayName: user.display_name ?? undefined,
    });
    
    // Audit log (code is never logged)
    await createAuditLog(c.env.DB, {
      userId: user.id,
      action: 'verification.email_sent',
      success: true,
      ipAddress: getClientIP(c.req.raw),
      userAgent: getUserAgent(c.req.raw),
      metadata: {
        email: user.email, // Log email for audit trail
        correlationId,
      },
    });
    
    // Generic response to prevent enumeration
    return c.json({
      data: {
        message: 'Verification code sent',
      },
      requestId: c.get('requestId'),
    });
  } catch (error) {
    console.error('Verification email error:', error);
    
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to send verification code',
          requestId: c.get('requestId'),
        },
      },
      500
    );
  }
});

/**
 * POST /verification/verify
 * Verify email with 6-digit code
 */
verification.post('/verify', async (c) => {
  const request = c.req.raw;
  const body = await request.json().catch(() => ({}));
  
  const schema = z.object({
    userId: z.string().uuid({ message: 'User ID is required' }),
    code: z
      .string()
      .length(6, { message: 'Verification code must be 6 digits' })
      .regex(/^\d{6}$/, { message: 'Verification code must be numeric' }),
  });
  
  const result = schema.safeParse(body);
  
  if (!result.success) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request format',
          requestId: c.get('requestId'),
        },
      },
      400
    );
  }
  
  const { userId, code } = result.data;
  const ipAddress = getClientIP(request);
  const userAgent = getUserAgent(request);
  
  // Verify the code
  const verificationResult = await verifyVerificationCode({
    db: c.env.DB,
    userId,
    code,
    ipAddress,
    userAgent,
  });
  
  if (!verificationResult.valid) {
    // Generic error message to prevent enumeration
    return c.json(
      {
        error: {
          code: 'VERIFICATION_FAILED',
          message: verificationResult.reason ?? 'Verification failed',
          requestId: c.get('requestId'),
        },
      },
      400
    );
  }
  
  // Get user and update status
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
  
  // Activate user if pending
  const now = Math.floor(Date.now() / 1000);
  await updateUser(c.env.DB, userId, {
    status: 'active',
    emailVerifiedAt: now,
  });
  
  await createAuditLog(c.env.DB, {
    userId,
    action: 'verification.email_verified',
    success: true,
    ipAddress,
    userAgent,
    metadata: { email: user.email },
  });
  
  // Get updated user
  const updatedUser = await getUserById(c.env.DB, userId);
  
  return c.json({
    data: {
      user: updatedUser
        ? {
            id: updatedUser.id,
            email: updatedUser.email,
            status: updatedUser.status,
          }
        : null,
      message: 'Email verified successfully',
    },
    requestId: c.get('requestId'),
  });
});

export default verification;
