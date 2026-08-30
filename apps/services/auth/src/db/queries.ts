/**
 * Database client and query builders for D1
 */

import type {
  User,
  UserIdentity,
  Role,
  Session,
  RefreshToken,
  EmailVerificationToken,
  AuditLog,
  UserStatus,
  Provider,
  ClientType,
} from '../types';
import { generateUUID } from '../utils/crypto';

/**
 * Create a new user
 */
export async function createUser(
  db: D1Database,
  data: {
    email: string;
    normalizedEmail: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    status?: UserStatus;
  }
): Promise<User> {
  const id = generateUUID();
  const now = Math.floor(Date.now() / 1000);
  
  await db
    .prepare(
      `INSERT INTO users (id, email, normalized_email, display_name, avatar_url, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      data.email,
      data.normalizedEmail,
      data.displayName ?? null,
      data.avatarUrl ?? null,
      data.status ?? 'pending_verification',
      now,
      now
    )
    .run();
  
  const result = await getUserById(db, id);
  if (!result) throw new Error('Failed to create user');
  return result;
}

/**
 * Get user by ID
 */
export async function getUserById(db: D1Database, id: string): Promise<User | null> {
  const result = await db
    .prepare('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL')
    .bind(id)
    .first<User>();
  return result ?? null;
}

/**
 * Get user by email
 */
export async function getUserByEmail(db: D1Database, email: string): Promise<User | null> {
  const normalizedEmail = email.toLowerCase().trim();
  const result = await db
    .prepare('SELECT * FROM users WHERE normalized_email = ? AND deleted_at IS NULL')
    .bind(normalizedEmail)
    .first<User>();
  return result ?? null;
}

/**
 * Update user
 */
export async function updateUser(
  db: D1Database,
  id: string,
  data: Partial<{
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    status: UserStatus;
    emailVerifiedAt: number | null;
    authVersion: number;
  }>
): Promise<User | null> {
  const updates: string[] = [];
  const bindings: (string | number | null)[] = [];
  
  if (data.email !== undefined) {
    updates.push('email = ?');
    bindings.push(data.email);
    updates.push('normalized_email = ?');
    bindings.push(data.email.toLowerCase().trim());
  }
  if (data.displayName !== undefined) {
    updates.push('display_name = ?');
    bindings.push(data.displayName);
  }
  if (data.avatarUrl !== undefined) {
    updates.push('avatar_url = ?');
    bindings.push(data.avatarUrl);
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    bindings.push(data.status);
  }
  if (data.emailVerifiedAt !== undefined) {
    updates.push('email_verified_at = ?');
    bindings.push(data.emailVerifiedAt);
  }
  if (data.authVersion !== undefined) {
    updates.push('auth_version = ?');
    bindings.push(data.authVersion);
  }
  
  if (updates.length === 0) return getUserById(db, id);
  
  updates.push('updated_at = ?');
  bindings.push(Math.floor(Date.now() / 1000));
  bindings.push(id);
  
  await db
    .prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...bindings)
    .run();
  
  return getUserById(db, id);
}

/**
 * Soft delete user
 */
export async function softDeleteUser(db: D1Database, id: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare('UPDATE users SET status = ?, deleted_at = ?, updated_at = ? WHERE id = ?')
    .bind('deleted', now, now, id)
    .run();
}

/**
 * Create user identity
 */
export async function createUserIdentity(
  db: D1Database,
  data: {
    userId: string;
    provider: Provider;
    providerUserId: string;
    providerEmail?: string | null;
    providerEmailVerified?: boolean;
  }
): Promise<UserIdentity> {
  const id = generateUUID();
  const now = Math.floor(Date.now() / 1000);
  
  await db
    .prepare(
      `INSERT INTO user_identities (id, user_id, provider, provider_user_id, provider_email, provider_email_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      data.userId,
      data.provider,
      data.providerUserId,
      data.providerEmail ?? null,
      data.providerEmailVerified ? 1 : 0,
      now,
      now
    )
    .run();
  
  return getUserIdentityById(db, id)!;
}

/**
 * Get user identity by ID
 */
export async function getUserIdentityById(db: D1Database, id: string): Promise<UserIdentity | null> {
  const result = await db
    .prepare('SELECT * FROM user_identities WHERE id = ?')
    .bind(id)
    .first();
  
  if (!result) return null;
  
  const row = result as Record<string, unknown>;
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    provider: row.provider as Provider,
    provider_user_id: row.provider_user_id as string,
    provider_email: row.provider_email as string | null,
    provider_email_verified: Boolean(row.provider_email_verified),
    created_at: row.created_at as number,
    updated_at: row.updated_at as number,
  };
}

/**
 * Get user identity by provider and provider user ID
 */
export async function getUserIdentityByProvider(
  db: D1Database,
  provider: Provider,
  providerUserId: string
): Promise<UserIdentity | null> {
  const result = await db
    .prepare('SELECT * FROM user_identities WHERE provider = ? AND provider_user_id = ?')
    .bind(provider, providerUserId)
    .first();
  
  if (!result) return null;
  
  const row = result as Record<string, unknown>;
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    provider: row.provider as Provider,
    provider_user_id: row.provider_user_id as string,
    provider_email: row.provider_email as string | null,
    provider_email_verified: Boolean(row.provider_email_verified),
    created_at: row.created_at as number,
    updated_at: row.updated_at as number,
  };
}

/**
 * Get all identities for a user
 */
export async function getUserIdentities(db: D1Database, userId: string): Promise<UserIdentity[]> {
  const results = await db
    .prepare('SELECT * FROM user_identities WHERE user_id = ?')
    .bind(userId)
    .all();
  
  return (results.results as Record<string, unknown>[]).map(row => ({
    id: row.id as string,
    user_id: row.user_id as string,
    provider: row.provider as Provider,
    provider_user_id: row.provider_user_id as string,
    provider_email: row.provider_email as string | null,
    provider_email_verified: Boolean(row.provider_email_verified),
    created_at: row.created_at as number,
    updated_at: row.updated_at as number,
  }));
}

/**
 * Get role by code
 */
export async function getRoleByCode(db: D1Database, code: string): Promise<Role | null> {
  const result = await db
    .prepare('SELECT * FROM roles WHERE code = ?')
    .bind(code)
    .first();
  
  if (!result) return null;
  
  const row = result as Record<string, unknown>;
  return {
    id: row.id as string,
    code: row.code as string,
    name: row.name as string,
    description: row.description as string | null,
    is_system: Boolean(row.is_system),
    created_at: row.created_at as number,
    updated_at: row.updated_at as number,
  };
}

/**
 * Assign role to user
 */
export async function assignRoleToUser(
  db: D1Database,
  userId: string,
  roleId: string,
  assignedBy?: string
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  
  await db
    .prepare(
      `INSERT OR IGNORE INTO user_roles (user_id, role_id, assigned_at, assigned_by)
       VALUES (?, ?, ?, ?)`
    )
    .bind(userId, roleId, now, assignedBy ?? null)
    .run();
  
  // Increment auth version
  await db
    .prepare('UPDATE users SET auth_version = auth_version + 1, updated_at = ? WHERE id = ?')
    .bind(now, userId)
    .run();
}

/**
 * Remove role from user
 */
export async function removeRoleFromUser(db: D1Database, userId: string, roleId: string): Promise<void> {
  await db
    .prepare('DELETE FROM user_roles WHERE user_id = ? AND role_id = ?')
    .bind(userId, roleId)
    .run();
  
  // Increment auth version
  await db
    .prepare('UPDATE users SET auth_version = auth_version + 1, updated_at = ? WHERE id = ?')
    .bind(Math.floor(Date.now() / 1000), userId)
    .run();
}

/**
 * Get user roles
 */
export async function getUserRoles(db: D1Database, userId: string): Promise<Role[]> {
  const results = await db
    .prepare(
      `SELECT r.* FROM roles r
       INNER JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = ?`
    )
    .bind(userId)
    .all();
  
  return (results.results as Record<string, unknown>[]).map(row => ({
    id: row.id as string,
    code: row.code as string,
    name: row.name as string,
    description: row.description as string | null,
    is_system: Boolean(row.is_system),
    created_at: row.created_at as number,
    updated_at: row.updated_at as number,
  }));
}

/**
 * Check if user has role
 */
export async function userHasRole(db: D1Database, userId: string, roleCode: string): Promise<boolean> {
  const result = await db
    .prepare(
      `SELECT 1 FROM user_roles ur
       INNER JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = ? AND r.code = ?`
    )
    .bind(userId, roleCode)
    .first();
  
  return result !== null;
}

/**
 * Create session
 */
export async function createSession(
  db: D1Database,
  data: {
    userId: string;
    clientType: ClientType;
    deviceName?: string | null;
    platform?: string | null;
    userAgent?: string | null;
    ipAddress?: string | null;
    expiresAt: number;
  }
): Promise<Session> {
  const id = generateUUID();
  const now = Math.floor(Date.now() / 1000);
  
  await db
    .prepare(
      `INSERT INTO sessions (id, user_id, client_type, device_name, platform, user_agent, ip_address, created_at, last_active_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      data.userId,
      data.clientType,
      data.deviceName ?? null,
      data.platform ?? null,
      data.userAgent ?? null,
      data.ipAddress ?? null,
      now,
      now,
      data.expiresAt
    )
    .run();
  
  return getSessionById(db, id)!;
}

/**
 * Get session by ID
 */
export async function getSessionById(db: D1Database, id: string): Promise<Session | null> {
  const result = await db
    .prepare('SELECT * FROM sessions WHERE id = ?')
    .bind(id)
    .first<Session & { revoked_at: number | null }>();
  
  if (!result) return null;
  
  return {
    ...result,
    revoked_at: result.revoked_at,
  };
}

/**
 * Get valid (non-expired, non-revoked) session
 */
export async function getValidSession(db: D1Database, id: string): Promise<Session | null> {
  const now = Math.floor(Date.now() / 1000);
  const result = await db
    .prepare(
      `SELECT * FROM sessions 
       WHERE id = ? 
       AND expires_at > ? 
       AND revoked_at IS NULL`
    )
    .bind(id, now)
    .first();
  
  if (!result) return null;
  
  const row = result as Record<string, unknown>;
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    client_type: row.client_type as ClientType,
    device_name: row.device_name as string | null,
    platform: row.platform as string | null,
    user_agent: row.user_agent as string | null,
    ip_address: row.ip_address as string | null,
    created_at: row.created_at as number,
    last_active_at: row.last_active_at as number,
    expires_at: row.expires_at as number,
    revoked_at: row.revoked_at as number | null,
    revoke_reason: row.revoke_reason as string | null,
  };
}

/**
 * Update session last active time
 */
export async function updateSessionActivity(db: D1Database, id: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare('UPDATE sessions SET last_active_at = ? WHERE id = ?')
    .bind(now, id)
    .run();
}

/**
 * Revoke session
 */
export async function revokeSession(
  db: D1Database,
  id: string,
  reason?: string
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare('UPDATE sessions SET revoked_at = ?, revoke_reason = ? WHERE id = ?')
    .bind(now, reason ?? null, id)
    .run();
  
  // Also revoke all refresh tokens for this session
  await db
    .prepare('UPDATE refresh_tokens SET revoked_at = ? WHERE session_id = ? AND revoked_at IS NULL')
    .bind(now, id)
    .run();
}

/**
 * Get user sessions
 */
export async function getUserSessions(
  db: D1Database,
  userId: string,
  includeRevoked: boolean = false
): Promise<Session[]> {
  const now = Math.floor(Date.now() / 1000);
  let query = 'SELECT * FROM sessions WHERE user_id = ?';
  
  if (!includeRevoked) {
    query += ' AND revoked_at IS NULL';
  }
  
  query += ' ORDER BY last_active_at DESC';
  
  const results = await db
    .prepare(query)
    .bind(userId)
    .all<Session>();
  
  return results.results;
}

/**
 * Create refresh token
 */
export async function createRefreshToken(
  db: D1Database,
  data: {
    sessionId: string;
    tokenFamilyId: string;
    tokenHash: string;
    parentTokenId?: string | null;
    expiresAt: number;
  }
): Promise<RefreshToken> {
  const id = generateUUID();
  const now = Math.floor(Date.now() / 1000);
  
  await db
    .prepare(
      `INSERT INTO refresh_tokens (id, session_id, token_family_id, token_hash, parent_token_id, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      data.sessionId,
      data.tokenFamilyId,
      data.tokenHash,
      data.parentTokenId ?? null,
      data.expiresAt,
      now
    )
    .run();
  
  return getRefreshTokenById(db, id)!;
}

/**
 * Get refresh token by ID
 */
export async function getRefreshTokenById(db: D1Database, id: string): Promise<RefreshToken | null> {
  const result = await db
    .prepare('SELECT * FROM refresh_tokens WHERE id = ?')
    .bind(id)
    .first();
  
  if (!result) return null;
  
  const row = result as Record<string, unknown>;
  return {
    id: row.id as string,
    session_id: row.session_id as string,
    token_family_id: row.token_family_id as string,
    token_hash: row.token_hash as string,
    parent_token_id: row.parent_token_id as string | null,
    expires_at: row.expires_at as number,
    consumed_at: row.consumed_at as number | null,
    revoked_at: row.revoked_at as number | null,
    created_at: row.created_at as number,
  };
}

/**
 * Get refresh token by hash
 */
export async function getRefreshTokenByHash(
  db: D1Database,
  tokenHash: string
): Promise<RefreshToken | null> {
  const result = await db
    .prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?')
    .bind(tokenHash)
    .first();
  
  if (!result) return null;
  
  const row = result as Record<string, unknown>;
  return {
    id: row.id as string,
    session_id: row.session_id as string,
    token_family_id: row.token_family_id as string,
    token_hash: row.token_hash as string,
    parent_token_id: row.parent_token_id as string | null,
    expires_at: row.expires_at as number,
    consumed_at: row.consumed_at as number | null,
    revoked_at: row.revoked_at as number | null,
    created_at: row.created_at as number,
  };
}

/**
 * Consume (mark as used) a refresh token
 */
export async function consumeRefreshToken(db: D1Database, id: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare('UPDATE refresh_tokens SET consumed_at = ? WHERE id = ?')
    .bind(now, id)
    .run();
}

/**
 * Revoke all tokens in a token family
 */
export async function revokeTokenFamily(db: D1Database, tokenFamilyId: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare('UPDATE refresh_tokens SET revoked_at = ? WHERE token_family_id = ? AND revoked_at IS NULL')
    .bind(now, tokenFamilyId)
    .run();
}

/**
 * Revoke all refresh tokens for a session
 */
export async function revokeSessionTokens(db: D1Database, sessionId: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare('UPDATE refresh_tokens SET revoked_at = ? WHERE session_id = ? AND revoked_at IS NULL')
    .bind(now, sessionId)
    .run();
}

/**
 * Create email verification token
 */
export async function createEmailVerificationToken(
  db: D1Database,
  data: {
    userId: string;
    tokenHash: string;
    expiresAt: number;
  }
): Promise<EmailVerificationToken> {
  const id = generateUUID();
  const now = Math.floor(Date.now() / 1000);
  
  // Invalidate any existing active tokens for this user
  await db
    .prepare('UPDATE email_verification_tokens SET consumed_at = ? WHERE user_id = ? AND consumed_at IS NULL')
    .bind(now, data.userId)
    .run();
  
  await db
    .prepare(
      `INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(id, data.userId, data.tokenHash, data.expiresAt, now)
    .run();
  
  return getEmailVerificationTokenById(db, id)!;
}

/**
 * Get email verification token by ID
 */
export async function getEmailVerificationTokenById(
  db: D1Database,
  id: string
): Promise<EmailVerificationToken | null> {
  const result = await db
    .prepare('SELECT * FROM email_verification_tokens WHERE id = ?')
    .bind(id)
    .first();
  
  if (!result) return null;
  
  const row = result as Record<string, unknown>;
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    token_hash: row.token_hash as string,
    expires_at: row.expires_at as number,
    consumed_at: row.consumed_at as number | null,
    created_at: row.created_at as number,
  };
}

/**
 * Get email verification token by hash
 */
export async function getEmailVerificationTokenByHash(
  db: D1Database,
  tokenHash: string
): Promise<EmailVerificationToken | null> {
  const result = await db
    .prepare('SELECT * FROM email_verification_tokens WHERE token_hash = ?')
    .bind(tokenHash)
    .first();
  
  if (!result) return null;
  
  const row = result as Record<string, unknown>;
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    token_hash: row.token_hash as string,
    expires_at: row.expires_at as number,
    consumed_at: row.consumed_at as number | null,
    created_at: row.created_at as number,
  };
}

/**
 * Consume email verification token
 */
export async function consumeEmailVerificationToken(db: D1Database, id: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare('UPDATE email_verification_tokens SET consumed_at = ? WHERE id = ?')
    .bind(now, id)
    .run();
}

/**
 * Create audit log
 */
export async function createAuditLog(
  db: D1Database,
  data: {
    userId?: string | null;
    sessionId?: string | null;
    action: string;
    success?: boolean;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown> | null;
  }
): Promise<void> {
  const id = generateUUID();
  const now = Math.floor(Date.now() / 1000);
  
  await db
    .prepare(
      `INSERT INTO audit_logs (id, user_id, session_id, action, success, ip_address, user_agent, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      data.userId ?? null,
      data.sessionId ?? null,
      data.action,
      data.success !== false ? 1 : 0,
      data.ipAddress ?? null,
      data.userAgent ?? null,
      data.metadata ? JSON.stringify(data.metadata) : null,
      now
    )
    .run();
}

/**
 * Clean up expired tokens and sessions
 */
export async function cleanupExpiredRecords(db: D1Database): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  
  // Clean up expired refresh tokens (keep for 7 days after expiry for audit)
  const refreshTokenExpiry = now - (7 * 24 * 60 * 60);
  await db
    .prepare('DELETE FROM refresh_tokens WHERE expires_at < ?')
    .bind(refreshTokenExpiry)
    .run();
  
  // Clean up consumed/expired verification tokens
  await db
    .prepare('DELETE FROM email_verification_tokens WHERE expires_at < ? OR consumed_at IS NOT NULL')
    .bind(now)
    .run();
  
  // Clean up expired sessions older than 30 days
  const sessionExpiry = now - (30 * 24 * 60 * 60);
  await db
    .prepare('DELETE FROM sessions WHERE expires_at < ? AND revoked_at IS NOT NULL')
    .bind(sessionExpiry)
    .run();
}
