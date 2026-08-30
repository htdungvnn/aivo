/**
 * Core types for the authentication service
 */

// User status enum
export const USER_STATUS = {
  PENDING_VERIFICATION: 'pending_verification',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  DELETED: 'deleted',
} as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

// Client types for sessions
export const CLIENT_TYPE = {
  WEB: 'web',
  IOS: 'ios',
  ANDROID: 'android',
} as const;

export type ClientType = (typeof CLIENT_TYPE)[keyof typeof CLIENT_TYPE];

// OAuth providers
export const PROVIDER = {
  GOOGLE: 'google',
  FACEBOOK: 'facebook',
} as const;

export type Provider = (typeof PROVIDER)[keyof typeof PROVIDER];

// Database models
export interface User {
  id: string;
  email: string;
  normalized_email: string;
  display_name: string | null;
  avatar_url: string | null;
  status: UserStatus;
  email_verified_at: number | null;
  auth_version: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export interface UserIdentity {
  id: string;
  user_id: string;
  provider: Provider;
  provider_user_id: string;
  provider_email: string | null;
  provider_email_verified: boolean;
  created_at: number;
  updated_at: number;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: number;
  updated_at: number;
}

export interface UserRole {
  user_id: string;
  role_id: string;
  assigned_at: number;
  assigned_by: string | null;
}

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

export interface EmailVerificationToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: number;
  consumed_at: number | null;
  created_at: number;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  session_id: string | null;
  action: string;
  success: boolean;
  ip_address: string | null;
  user_agent: string | null;
  metadata: string | null;
  created_at: number;
}

// Normalized provider profile
export interface ProviderProfile {
  provider: Provider;
  providerUserId: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  avatarUrl: string | null;
}

// OAuth state for PKCE flow
export interface OAuthState {
  state: string;
  codeVerifier: string;
  redirectUri: string;
  clientType: ClientType;
  provider: Provider;
  createdAt: number;
}

// JWT Claims
export interface JWTPayload {
  iss: string; // Issuer
  aud: string; // Audience
  sub: string; // User ID
  iat: number; // Issued at
  exp: number; // Expiration
  jti: string; // JWT ID
  sid: string; // Session ID
  ver: number; // Auth version
  roles: string[]; // Role codes
}

// Token response
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

// Session with user info
export interface SessionWithUser extends Session {
  user: Pick<User, 'id' | 'email' | 'display_name' | 'avatar_url' | 'status' | 'auth_version'>;
  roles: string[];
}

// API Error codes
export const ERROR_CODES = {
  // OAuth errors
  INVALID_STATE: 'INVALID_STATE',
  INVALID_PKCE: 'INVALID_PKCE',
  OAUTH_ERROR: 'OAUTH_ERROR',
  UNSUPPORTED_PROVIDER: 'UNSUPPORTED_PROVIDER',
  
  // Account errors
  EMAIL_VERIFICATION_REQUIRED: 'EMAIL_VERIFICATION_REQUIRED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  ACCOUNT_DELETED: 'ACCOUNT_DELETED',
  ACCOUNT_LINKING_REQUIRED: 'ACCOUNT_LINKING_REQUIRED',
  
  // Token errors
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  REFRESH_TOKEN_REUSED: 'REFRESH_TOKEN_REUSED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_REVOKED: 'SESSION_REVOKED',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  
  // Authorization errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // Rate limiting
  RATE_LIMITED: 'RATE_LIMITED',
  
  // Not found
  NOT_FOUND: 'NOT_FOUND',
  
  // Generic
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// API Response types
export interface ApiError {
  error: {
    code: ErrorCode;
    message: string;
    requestId: string;
  };
}

export interface ApiSuccess<T> {
  data: T;
  requestId: string;
}

// Audit action types
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
