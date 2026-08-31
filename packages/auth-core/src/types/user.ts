/**
 * User Types for Authentication
 */

// =============================================================================
// Enums
// =============================================================================

/**
 * User account status
 */
export const USER_STATUS = {
  PENDING_VERIFICATION: 'pending_verification',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  DELETED: 'deleted',
} as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

/**
 * Client types for sessions
 */
export const CLIENT_TYPE = {
  WEB: 'web',
  IOS: 'ios',
  ANDROID: 'android',
} as const;

export type ClientType = (typeof CLIENT_TYPE)[keyof typeof CLIENT_TYPE];

/**
 * OAuth providers
 */
export const PROVIDER = {
  GOOGLE: 'google',
  FACEBOOK: 'facebook',
  APPLE: 'apple',
} as const;

export type Provider = (typeof PROVIDER)[keyof typeof PROVIDER];

// =============================================================================
// Database Models
// =============================================================================

/**
 * User entity
 */
export interface User {
  id: string;
  email: string;
  normalized_email: string;
  display_name: string | null;
  avatar_url: string | null;
  status: UserStatus;
  email_verified_at: number | null;
  verification_code: string | null;
  verification_code_expires_at: number | null;
  auth_version: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

/**
 * User identity for OAuth providers
 */
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

/**
 * Role entity
 */
export interface Role {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: number;
  updated_at: number;
}

/**
 * User role association
 */
export interface UserRole {
  user_id: string;
  role_id: string;
  assigned_at: number;
  assigned_by: string | null;
}

/**
 * Normalized provider profile from OAuth
 */
export interface ProviderProfile {
  provider: Provider;
  providerUserId: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  avatarUrl: string | null;
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Minimal user info for auth context
 */
export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  authVersion: number;
}

/**
 * User with roles
 */
export interface AuthUserWithRoles extends AuthUser {
  roles: string[];
}

/**
 * Convert full User to AuthUser
 */
export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    status: user.status,
    authVersion: user.auth_version,
  };
}
