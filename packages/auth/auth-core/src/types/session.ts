/**
 * Session Types for Authentication
 */

import type { ClientType } from './user.js';

/**
 * Session entity
 */
export interface Session {
  id: string;
  user_id: string;
  client_type: ClientType;
  device_name: string | null;
  platform: string | null;
  user_agent: string | null;
  ip_address: string | null;
  created_at: number;
  last_active_at: number;
  expires_at: number;
  revoked_at: number | null;
  revoke_reason: string | null;
}

/**
 * Refresh token entity
 */
export interface RefreshToken {
  id: string;
  session_id: string;
  token_family_id: string;
  token_hash: string;
  parent_token_id: string | null;
  expires_at: number;
  consumed_at: number | null;
  revoked_at: number | null;
  created_at: number;
}

/**
 * Session with user info
 */
export interface SessionWithUser extends Session {
  user: {
    id: string;
    email: string;
    display_name: string | null;
    avatar_url: string | null;
    status: string;
    auth_version: number;
  };
  roles: string[];
}

/**
 * Token response for API
 */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

/**
 * Token pair with expiration
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * OAuth state for PKCE flow
 */
export interface OAuthState {
  state: string;
  codeVerifier: string;
  redirectUri: string;
  clientType: ClientType;
  provider: string;
  createdAt: number;
}

/**
 * Audit action types
 */
export const AUDIT_ACTIONS = {
  // OAuth
  OAUTH_START: 'oauth.start',
  OAUTH_CALLBACK: 'oauth.callback',
  OAUTH_ERROR: 'oauth.error',

  // Auth
  LOGIN: 'auth.login',
  LOGOUT: 'auth.logout',
  LOGOUT_ALL: 'auth.logout_all',
  TOKEN_REFRESH: 'auth.token_refresh',
  TOKEN_REFRESH_ERROR: 'auth.token_refresh_error',

  // Verification
  EMAIL_VERIFICATION_SENT: 'verification.email_sent',
  EMAIL_VERIFIED: 'verification.email_verified',

  // Session
  SESSION_CREATED: 'session.created',
  SESSION_REVOKED: 'session.revoked',
  SESSION_EXPIRED: 'session.expired',

  // Account
  ACCOUNT_CREATED: 'account.created',
  ACCOUNT_SUSPENDED: 'account.suspended',
  ACCOUNT_REACTIVATED: 'account.reactivated',
  ACCOUNT_DELETED: 'account.deleted',
  ACCOUNT_LINKED: 'account.linked',

  // Role
  ROLE_ASSIGNED: 'role.assigned',
  ROLE_REMOVED: 'role.removed',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
