/**
 * Login routes
 * Handles email/password authentication
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthEnv } from '../middleware/auth';
import { getClientIP, getUserAgent } from '../middleware/auth';
import { getUserByEmail, getUserIdentities, createAuditLog } from '../db/queries';
import { verifyPassword } from '../utils/crypto';
import { createTokenService } from '../lib/tokens';
import type { ClientType } from '../types';

const login = new Hono<{ Bindings: AuthEnv }>();

// Validation schema for login
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  clientType: z.enum(['web', 'ios', 'android']).optional().default('web'),
});

// Rate limiting (simple implementation - can be enhanced with KV)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // 10 login attempts per 15 minutes per IP
const RATE_WINDOW = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  
  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return { allowed: true };
  }
  
  if (record.count >= RATE_LIMIT) {
    return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
  }
  
  record.count++;
  return { allowed: true };
}

/**
 * POST /login
 * Authenticate user with email/password
 */
login.post('/', async (c) => {
  const request = c.req.raw;
  const ipAddress = getClientIP(request);
  const userAgent = getUserAgent(request);
  
  // Check rate limit
  const rateCheck = checkRateLimit(ipAddress || 'unknown');
  if (!rateCheck.allowed) {
    c.header('Retry-After', String(rateCheck.retryAfter));
    return c.json(
      {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many login attempts. Please try again later.',
          requestId: c.get('requestId'),
        },
      },
      429
    );
  }
  
  // Parse and validate body
  const body = await request.json().catch(() => ({}));
  const result = loginSchema.safeParse(body);
  
  if (!result.success) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid login data',
          requestId: c.get('requestId'),
          details: result.error.flatten(),
        },
      },
      400
    );
  }
  
  const { email, password, clientType } = result.data;
  const normalizedEmail = email.toLowerCase().trim();
  
  try {
    // Find user by email
    const user = await getUserByEmail(c.env.DB, normalizedEmail);
    
    if (!user) {
      // Don't reveal whether email exists for security
      await createAuditLog(c.env.DB, {
        action: 'auth.login.failed',
        success: false,
        ipAddress,
        userAgent,
        metadata: { email: normalizedEmail, reason: 'user_not_found' },
      });
      
      return c.json(
        {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            requestId: c.get('requestId'),
          },
        },
        401
      );
    }
    
    // Check user status
    if (user.status === 'pending_verification') {
      await createAuditLog(c.env.DB, {
        userId: user.id,
        action: 'auth.login.failed',
        success: false,
        ipAddress,
        userAgent,
        metadata: { email: normalizedEmail, reason: 'email_not_verified' },
      });
      
      return c.json(
        {
          error: {
            code: 'EMAIL_VERIFICATION_REQUIRED',
            message: 'Please verify your email address before logging in',
            requestId: c.get('requestId'),
          },
        },
        403
      );
    }
    
    if (user.status === 'suspended') {
      await createAuditLog(c.env.DB, {
        userId: user.id,
        action: 'auth.login.failed',
        success: false,
        ipAddress,
        userAgent,
        metadata: { email: normalizedEmail, reason: 'account_suspended' },
      });
      
      return c.json(
        {
          error: {
            code: 'ACCOUNT_SUSPENDED',
            message: 'Your account has been suspended. Please contact support.',
            requestId: c.get('requestId'),
          },
        },
        403
      );
    }
    
    if (user.status === 'deleted') {
      await createAuditLog(c.env.DB, {
        action: 'auth.login.failed',
        success: false,
        ipAddress,
        userAgent,
        metadata: { email: normalizedEmail, reason: 'account_deleted' },
      });
      
      return c.json(
        {
          error: {
            code: 'ACCOUNT_DELETED',
            message: 'This account has been deleted.',
            requestId: c.get('requestId'),
          },
        },
        403
      );
    }
    
    // Get user identities to find password provider
    const identities = await getUserIdentities(c.env.DB, user.id);
    const passwordIdentity = identities.find(identity => identity.provider === 'password');
    
    if (!passwordIdentity) {
      // User exists but has no password identity (OAuth-only user)
      await createAuditLog(c.env.DB, {
        userId: user.id,
        action: 'auth.login.failed',
        success: false,
        ipAddress,
        userAgent,
        metadata: { email: normalizedEmail, reason: 'no_password_identity' },
      });
      
      return c.json(
        {
          error: {
            code: 'NO_PASSWORD_SET',
            message: 'No password is set for this account. Please use OAuth login or reset your password.',
            requestId: c.get('requestId'),
          },
        },
        401
      );
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(password, passwordIdentity.provider_user_id);
    
    if (!isValidPassword) {
      await createAuditLog(c.env.DB, {
        userId: user.id,
        action: 'auth.login.failed',
        success: false,
        ipAddress,
        userAgent,
        metadata: { email: normalizedEmail, reason: 'invalid_password' },
      });
      
      return c.json(
        {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            requestId: c.get('requestId'),
          },
        },
        401
      );
    }
    
    // Password verified - create session and tokens
    const tokenService = createTokenService(c.env.DB);
    
    // Detect platform from user agent if not specified
    let platform: string | undefined;
    if (userAgent) {
      if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
        platform = 'iOS';
      } else if (userAgent.includes('Android')) {
        platform = 'Android';
      } else {
        platform = 'Web';
      }
    }
    
    const tokenPair = await tokenService.createTokenPair(user.id, clientType as ClientType, {
      deviceName: request.headers.get('sec-ch-ua-mobile') ? undefined : 'Web Browser',
      platform,
      userAgent,
      ipAddress,
    });
    
    // Audit log successful login
    await createAuditLog(c.env.DB, {
      userId: user.id,
      action: 'auth.login',
      success: true,
      ipAddress,
      userAgent,
      metadata: { email: normalizedEmail, clientType },
    });
    
    return c.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          avatarUrl: user.avatar_url,
          status: user.status,
        },
        ...tokenService.buildTokenResponse(tokenPair),
      },
      requestId: c.get('requestId'),
    });
    
  } catch (error) {
    console.error('Login error:', error);
    
    await createAuditLog(c.env.DB, {
      action: 'auth.login.error',
      success: false,
      ipAddress,
      userAgent,
      metadata: { email: normalizedEmail, error: String(error) },
    });
    
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during login. Please try again.',
          requestId: c.get('requestId'),
        },
      },
      500
    );
  }
});

/**
 * POST /login/resend-verification
 * Resend verification email for unverified users
 */
login.post('/resend-verification', async (c) => {
  const request = c.req.raw;
  const ipAddress = getClientIP(request);
  const userAgent = getUserAgent(request);
  
  // Rate limit resend requests (3 per hour per IP)
  const resendAttempts = new Map<string, { count: number; resetAt: number }>();
  const RATE_LIMIT = 3;
  const RATE_WINDOW = 60 * 60 * 1000; // 1 hour
  
  const now = Date.now();
  const record = resendAttempts.get(ipAddress || 'unknown');
  
  if (record && now < record.resetAt && record.count >= RATE_LIMIT) {
    return c.json(
      {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many verification email requests. Please try again later.',
          requestId: c.get('requestId'),
        },
      },
      429
    );
  }
  
  // Parse body
  const body = await request.json().catch(() => ({}));
  const emailSchema = z.object({
    email: z.string().email('Invalid email address'),
  });
  
  const result = emailSchema.safeParse(body);
  if (!result.success) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email address',
          requestId: c.get('requestId'),
        },
      },
      400
    );
  }
  
  const { email } = result.data;
  const normalizedEmail = email.toLowerCase().trim();
  
  // Find user
  const user = await getUserByEmail(c.env.DB, normalizedEmail);
  
  if (!user || user.status !== 'pending_verification') {
    // Don't reveal whether email exists
    return c.json({
      data: {
        message: 'If an unverified account exists with this email, a verification email has been sent.',
      },
      requestId: c.get('requestId'),
    });
  }
  
  // Generate new verification code
  const verificationCode = generateVerificationCode();
  const verificationCodeExpiresAt = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours
  
  await c.env.DB
    .prepare(
      'UPDATE users SET verification_code = ?, verification_code_expires_at = ?, updated_at = ? WHERE id = ?'
    )
    .bind(verificationCode, verificationCodeExpiresAt, Math.floor(Date.now() / 1000), user.id)
    .run();
  
  // TODO: Send verification email
  console.log(`[Resend Verification] Code for ${email}: ${verificationCode}`);
  
  await createAuditLog(c.env.DB, {
    userId: user.id,
    action: 'auth.verification.resent',
    success: true,
    ipAddress,
    userAgent,
  });
  
  return c.json({
    data: {
      message: 'If an unverified account exists with this email, a verification email has been sent.',
    },
    requestId: c.get('requestId'),
  });
});

/**
 * Generate a 6-digit verification code
 */
function generateVerificationCode(): string {
  const chars = '0123456789';
  let code = '';
  const randomValues = new Uint8Array(6);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < 6; i++) {
    code += chars[randomValues[i] % chars.length];
  }
  return code;
}

export default login;
