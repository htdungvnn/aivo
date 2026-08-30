/**
 * Registration routes
 * Handles new user registration with email/password
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthEnv } from '../middleware/auth';
import { createAuditLog, getUserByEmail, createUser, createUserIdentity } from '../db/queries';
import { getClientIP, getUserAgent } from '../middleware/auth';
import { hashPassword } from '../utils/crypto';

const register = new Hono<{ Bindings: AuthEnv }>();

// Validation schema for registration
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and number'
    ),
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(100, 'Display name must be at most 100 characters')
    .optional(),
});

// Rate limiting (simple implementation - can be enhanced with KV)
const registrationAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5; // 5 registrations per hour per IP
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = registrationAttempts.get(ip);
  
  if (!record || now > record.resetAt) {
    registrationAttempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return { allowed: true };
  }
  
  if (record.count >= RATE_LIMIT) {
    return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
  }
  
  record.count++;
  return { allowed: true };
}

/**
 * POST /register
 * Register a new user account
 */
register.post('/', async (c) => {
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
          message: 'Too many registration attempts. Please try again later.',
          requestId: c.get('requestId'),
        },
      },
      429
    );
  }
  
  // Parse and validate body
  const body = await request.json().catch(() => ({}));
  const result = registerSchema.safeParse(body);
  
  if (!result.success) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid registration data',
          requestId: c.get('requestId'),
          details: result.error.flatten(),
        },
      },
      400
    );
  }
  
  const { email, password, displayName } = result.data;
  const normalizedEmail = email.toLowerCase().trim();
  
  // Check if user already exists
  const existingUser = await getUserByEmail(c.env.DB, email);
  
  if (existingUser) {
    // Don't reveal whether email exists for security
    await createAuditLog(c.env.DB, {
      action: 'auth.register.duplicate',
      success: false,
      ipAddress,
      userAgent,
      metadata: { email: normalizedEmail },
    });
    
    // Return success anyway to prevent email enumeration
    return c.json({
      data: {
        message: 'Account created. Please check your email to verify your account.',
        requiresEmailVerification: true,
      },
      requestId: c.get('requestId'),
    });
  }
  
  // Hash password
  const { hash: passwordHash, version: passwordVersion } = await hashPassword(password);
  
  // Generate verification code
  const verificationCode = generateVerificationCode();
  const verificationCodeExpiresAt = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours
  
  try {
    // Create user
    const user = await createUser(c.env.DB, {
      email: normalizedEmail,
      normalizedEmail: normalizedEmail,
      displayName: displayName || email.split('@')[0],
      status: 'pending_verification',
    });
    
    // Create password identity (store the hashed password as provider_user_id with format: version$hash)
    await createUserIdentity(c.env.DB, {
      userId: user.id,
      provider: 'password',
      providerUserId: `${passwordVersion}$${passwordHash}`,
      providerEmail: normalizedEmail,
      providerEmailVerified: false,
    });
    
    // Update user with verification code
    // Note: For simplicity, we're storing verification code directly on user
    // In production, use a separate verification_tokens table
    await c.env.DB
      .prepare(
        'UPDATE users SET verification_code = ?, verification_code_expires_at = ?, updated_at = ? WHERE id = ?'
      )
      .bind(verificationCode, verificationCodeExpiresAt, Math.floor(Date.now() / 1000), user.id)
      .run();
    
    // TODO: Send verification email
    // For now, log the verification code (in production, send email via Queue)
    console.log(`[Registration] Verification code for ${email}: ${verificationCode}`);
    
    // Audit log
    await createAuditLog(c.env.DB, {
      userId: user.id,
      action: 'auth.register',
      success: true,
      ipAddress,
      userAgent,
      metadata: { email: normalizedEmail },
    });
    
    return c.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          status: user.status,
        },
        message: 'Account created. Please check your email to verify your account.',
        requiresEmailVerification: true,
      },
      requestId: c.get('requestId'),
    }, 201);
    
  } catch (error) {
    console.error('Registration error:', error);
    
    await createAuditLog(c.env.DB, {
      action: 'auth.register.error',
      success: false,
      ipAddress,
      userAgent,
      metadata: { email: normalizedEmail, error: String(error) },
    });
    
    return c.json(
      {
        error: {
          code: 'REGISTRATION_ERROR',
          message: 'Failed to create account. Please try again.',
          requestId: c.get('requestId'),
        },
      },
      500
    );
  }
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

export default register;
