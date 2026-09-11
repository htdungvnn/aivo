/**
 * Registration routes
 * Handles new user registration with email/password
 * 
 * Complete flow:
 * 1. Validate input (Zod schema)
 * 2. Rate limit check (5/hour per IP)
 * 3. Check if user exists (email enumeration prevention)
 * 4. Hash password with Argon2
 * 5. Create user with status='pending_verification'
 * 6. Generate and hash verification code
 * 7. Send email via Queue
 * 8. Return success response
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthEnv } from '../middleware/auth';
import { createAuditLog, getUserByEmail, createUser, createUserIdentity } from '../db/queries';
import { getClientIP, getUserAgent } from '../middleware/auth';
import { hashPassword, generateVerificationCode, sha256Hash } from '../utils/crypto';
import {
  createEmailVerificationMessage,
  EmailVerificationQueueMessage,
  SCHEMA_VERSION,
} from '@aivo/queue-types';
import { generateUUID } from '../utils/crypto';

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

// Configuration (consistent with verification service)
const VERIFICATION_CODE_TTL_SECONDS = 10 * 60; // 10 minutes

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
 * 
 * @returns 201 - User created successfully, verification email sent
 * @returns 400 - Validation error
 * @returns 429 - Rate limited
 * @returns 500 - Server error
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
  
  // Generate verification code and hash
  const verificationCode = generateVerificationCode();
  const verificationCodeHash = await sha256Hash(verificationCode);
  const verificationCodeExpiresAt = Math.floor(Date.now() / 1000) + VERIFICATION_CODE_TTL_SECONDS;
  
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
    
    // Update user with hashed verification code (NOT storing raw code)
    const updateResult = await c.env.DB
      .prepare(
        'UPDATE users SET verification_code_hash = ?, verification_code_expires_at = ?, verification_code_attempts = 0, updated_at = ? WHERE id = ?'
      )
      .bind(verificationCodeHash, verificationCodeExpiresAt, 0, Math.floor(Date.now() / 1000), user.id)
      .run();
    
    // Check if update was successful
    if (!updateResult.success) {
      console.error(`[Registration] Failed to update verification code for user ${user.id}`);
      throw new Error('Failed to store verification code');
    }
    
    // Send verification email via Queue
    let correlationId: string | undefined;
    try {
      const messageId = generateUUID();
      const queueMessage = createEmailVerificationMessage({
        messageId,
        recipient: { email: normalizedEmail, displayName: displayName || email.split('@')[0] },
        locale: 'en', // TODO: Detect from request or user preference
        verificationCode,
        expiresInMinutes: Math.floor(VERIFICATION_CODE_TTL_SECONDS / 60),
        userId: user.id,
      });
      
      correlationId = queueMessage.metadata.correlationId;
      
      // Publish to Queue
      const publishResult = await c.env.EMAIL_QUEUE.send([queueMessage]);
      
      if (publishResult?.failures?.length) {
        console.error(`[Registration] Failed to queue verification email for ${normalizedEmail}`);
        // Continue - the code is still valid, we can log for manual resend
      } else {
        console.log(`[Registration] Verification email queued for ${normalizedEmail}, correlationId: ${correlationId}`);
      }
    } catch (queueError) {
      // Log but don't fail registration - code is generated
      console.error(`[Registration] Queue error for ${normalizedEmail}:`, queueError);
    }
    
    // Audit log (without the raw code)
    await createAuditLog(c.env.DB, {
      userId: user.id,
      action: 'auth.register',
      success: true,
      ipAddress,
      userAgent,
      metadata: { 
        email: normalizedEmail,
        verificationCodeExpiresAt,
        correlationId,
        schemaVersion: SCHEMA_VERSION,
      },
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

export default register;
