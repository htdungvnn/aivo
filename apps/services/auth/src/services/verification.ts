/**
 * Verification Code Service
 * Handles 6-digit code generation, hashing, and verification
 * Uses the users table columns for storage:
 * - verification_code_hash
 * - verification_code_expires_at
 * - verification_code_attempts
 * 
 * Security:
 * - Raw codes are never logged or stored
 * - Only SHA-256 hashes are stored in the database
 * - Rate limiting prevents abuse
 */

import type { D1Database } from '@cloudflare/workers-types';
import type { Queue, MessageSendFailure } from '@cloudflare/workers-types';
import { generateUUID } from '../utils/crypto';
import { sha256Hash } from '../utils/crypto';
import { createAuditLog } from '../db/queries';
import {
  createEmailVerificationMessage,
  EmailVerificationQueueMessage,
  SCHEMA_VERSION,
  SupportedLocale,
} from '@repo/queue-types';

// Configuration
const VERIFICATION_CODE_TTL_SECONDS = 10 * 60; // 10 minutes
const MAX_VERIFICATION_ATTEMPTS = 10; // Per code
const RESEND_COOLDOWN_SECONDS = 60; // 1 minute between resends

export interface RateLimitInfo {
  allowed: boolean;
  remainingAttempts: number;
  cooldownExpiresAt: number | null;
}

export interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  verification_code_hash: string | null;
  verification_code_expires_at: number | null;
  verification_code_attempts: number | null;
}

/**
 * Generate a cryptographically secure 6-digit verification code
 */
export function generateVerificationCode(): string {
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += (array[i] % 10).toString();
  }
  
  return code;
}

/**
 * Hash a verification code using SHA-256
 */
export async function hashVerificationCode(code: string): Promise<string> {
  return sha256Hash(code);
}

/**
 * Verify a code against a stored hash using constant-time comparison
 */
export async function verifyCode(code: string, storedHash: string): Promise<boolean> {
  const codeHash = await hashVerificationCode(code);
  
  if (codeHash.length !== storedHash.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < codeHash.length; i++) {
    result |= codeHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Get user with verification code data
 */
async function getUserWithVerificationData(
  db: D1Database,
  userId: string
): Promise<UserRow | null> {
  const result = await db
    .prepare('SELECT id, email, display_name, verification_code_hash, verification_code_expires_at, verification_code_attempts FROM users WHERE id = ? AND deleted_at IS NULL')
    .bind(userId)
    .first<UserRow>();
  return result ?? null;
}

/**
 * Create a new verification code for a user
 * - Updates the user's verification_code_hash column
 * - Stores only the hash
 * - Publishes to the email Queue
 */
export async function createVerificationCode(params: {
  db: D1Database;
  emailQueue: Queue<EmailVerificationQueueMessage>;
  userId: string;
  email: string;
  displayName?: string;
  locale?: SupportedLocale;
}): Promise<{ code: string; correlationId: string }> {
  const { db, emailQueue, userId, email, displayName, locale = 'en' } = params;
  
  const now = Math.floor(Date.now() / 1000);
  const code = generateVerificationCode();
  const codeHash = await hashVerificationCode(code);
  const messageId = generateUUID();
  const expiresAt = now + VERIFICATION_CODE_TTL_SECONDS;
  
  // Update user's verification code columns
  await db
    .prepare(
      `UPDATE users SET 
        verification_code_hash = ?,
        verification_code_expires_at = ?,
        verification_code_attempts = 0,
        updated_at = ?
       WHERE id = ?`
    )
    .bind(codeHash, expiresAt, now, userId)
    .run();
  
  // Create and publish Queue message
  const queueMessage = createEmailVerificationMessage({
    messageId,
    recipient: { email, displayName },
    locale,
    verificationCode: code, // Code is only in the Queue message, never persisted
    expiresInMinutes: Math.floor(VERIFICATION_CODE_TTL_SECONDS / 60),
    userId,
  });
  
  // Publish to Queue
  const publishResult = await emailQueue.send([queueMessage]);
  
  if (publishResult && publishResult.failures) {
    const failures = publishResult.failures as MessageSendFailure<EmailVerificationQueueMessage>[];
    if (failures.length > 0) {
      console.error('Failed to publish email verification message to queue');
      await createAuditLog(db, {
        userId,
        action: 'verification.queue_publish_failed',
        success: false,
        metadata: { messageId },
      });
      throw new Error('Failed to queue verification email');
    }
  }
  
  // Audit log (without the raw code)
  await createAuditLog(db, {
    userId,
    action: 'verification.code_created',
    success: true,
    metadata: {
      messageId,
      expiresAt,
      schemaVersion: SCHEMA_VERSION,
    },
  });
  
  return {
    code, // Only returned to caller, never logged or stored
    correlationId: queueMessage.metadata.correlationId,
  };
}

/**
 * Verify a verification code
 * - Checks expiration
 * - Checks attempt limit
 * - Single use: clears code after successful verification
 */
export async function verifyVerificationCode(params: {
  db: D1Database;
  userId: string;
  code: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ valid: boolean; reason?: string }> {
  const { db, userId, code, ipAddress, userAgent } = params;
  
  const now = Math.floor(Date.now() / 1000);
  
  // Get user with verification code data
  const user = await getUserWithVerificationData(db, userId);
  
  if (!user) {
    await createAuditLog(db, {
      userId,
      action: 'verification.verify_failed',
      success: false,
      ipAddress,
      userAgent,
      metadata: { reason: 'user_not_found' },
    });
    return { valid: false, reason: 'User not found' };
  }
  
  // Check if code exists
  if (!user.verification_code_hash || !user.verification_code_expires_at) {
    await createAuditLog(db, {
      userId,
      action: 'verification.verify_failed',
      success: false,
      ipAddress,
      userAgent,
      metadata: { reason: 'no_active_code' },
    });
    return { valid: false, reason: 'No active verification code found' };
  }
  
  // Check expiration
  if (user.verification_code_expires_at < now) {
    await createAuditLog(db, {
      userId,
      action: 'verification.verify_failed',
      success: false,
      ipAddress,
      userAgent,
      metadata: { reason: 'code_expired' },
    });
    return { valid: false, reason: 'Verification code has expired' };
  }
  
  // Get current attempt count
  const currentAttempts = user.verification_code_attempts ?? 0;
  
  // Check max attempts
  if (currentAttempts >= MAX_VERIFICATION_ATTEMPTS) {
    await createAuditLog(db, {
      userId,
      action: 'verification.verify_failed',
      success: false,
      ipAddress,
      userAgent,
      metadata: { reason: 'max_attempts_exceeded' },
    });
    return { valid: false, reason: 'Maximum verification attempts exceeded' };
  }
  
  // Increment attempt count
  await db
    .prepare('UPDATE users SET verification_code_attempts = verification_code_attempts + 1, updated_at = ? WHERE id = ?')
    .bind(now, userId)
    .run();
  
  // Verify the code against stored hash
  const isValid = await verifyCode(code, user.verification_code_hash);
  
  if (!isValid) {
    const remainingAttempts = Math.max(0, MAX_VERIFICATION_ATTEMPTS - currentAttempts - 1);
    
    await createAuditLog(db, {
      userId,
      action: 'verification.verify_failed',
      success: false,
      ipAddress,
      userAgent,
      metadata: { 
        reason: 'invalid_code',
        remainingAttempts,
      },
    });
    
    return { 
      valid: false, 
      reason: `Invalid verification code. ${remainingAttempts} attempts remaining.`,
    };
  }
  
  // Clear the code (single use)
  await db
    .prepare('UPDATE users SET verification_code_hash = NULL, verification_code_expires_at = NULL, verification_code_attempts = 0, updated_at = ? WHERE id = ?')
    .bind(now, userId)
    .run();
  
  await createAuditLog(db, {
    userId,
    action: 'verification.verify_success',
    success: true,
    ipAddress,
    userAgent,
  });
  
  return { valid: true };
}

/**
 * Check rate limit for sending/resending verification codes
 */
export async function checkRateLimit(params: {
  db: D1Database;
  userId: string;
}): Promise<RateLimitInfo> {
  const { db, userId } = params;
  const now = Math.floor(Date.now() / 1000);
  
  const user = await getUserWithVerificationData(db, userId);
  
  if (!user) {
    return { allowed: true, remainingAttempts: 5, cooldownExpiresAt: null };
  }
  
  // If no verification code exists, allow
  if (!user.verification_code_expires_at) {
    return { allowed: true, remainingAttempts: 5, cooldownExpiresAt: null };
  }
  
  // Check if within cooldown period
  const codeAge = now - (user.verification_code_expires_at - VERIFICATION_CODE_TTL_SECONDS);
  
  if (codeAge < RESEND_COOLDOWN_SECONDS) {
    const cooldownExpiresAt = (user.verification_code_expires_at - VERIFICATION_CODE_TTL_SECONDS) + RESEND_COOLDOWN_SECONDS;
    return {
      allowed: false,
      remainingAttempts: 0,
      cooldownExpiresAt,
    };
  }
  
  return { allowed: true, remainingAttempts: 5, cooldownExpiresAt: null };
}
