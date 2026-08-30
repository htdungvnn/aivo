/**
 * Main authentication service
 * Handles user creation, identity linking, and authentication flows
 */

import type { D1Database } from '@cloudflare/workers-types';
import type {
  Provider,
  ProviderProfile,
  ClientType,
  User,
  UserStatus,
  TokenPair,
  UserRole,
} from '../types';
import {
  createUser,
  getUserById,
  getUserByEmail,
  getUserIdentityByProvider,
  getUserIdentities,
  createUserIdentity,
  getRoleByCode,
  assignRoleToUser,
  getUserRoles,
  createAuditLog,
  createEmailVerificationToken,
  getEmailVerificationTokenByHash,
  consumeEmailVerificationToken,
  updateUser,
  softDeleteUser,
} from '../db/queries';
import { hashToken, normalizeEmail, generateSecureToken, generateOAuthState, generateCodeVerifier, generateCodeChallenge } from '../utils/crypto';
import { isTrustedEmailDomain } from '../providers/base';
import { TokenService, createTokenService } from '../lib/tokens';
import { OAuthProvider, getGoogleProvider, getFacebookProvider, OAuthError } from '../providers';

const EMAIL_VERIFICATION_TTL = 60 * 60; // 1 hour
const OAUTH_STATE_TTL = 10 * 60; // 10 minutes

interface OAuthStateData {
  state: string;
  codeVerifier: string;
  redirectUri: string;
  clientType: ClientType;
  provider: Provider;
  createdAt: number;
}

export interface AuthResult {
  user: User;
  tokens: TokenPair;
  isNewUser: boolean;
  emailVerificationRequired: boolean;
}

export interface AccountLinkingResult {
  requiresLinking: boolean;
  existingUser?: User;
  message?: string;
}

/**
 * Main authentication service
 */
export class AuthService {
  private db: D1Database;
  private tokenService: TokenService;
  private oauthStates: Map<string, OAuthStateData> = new Map();
  private emailVerificationCodes: Map<string, { userId: string; email: string }> = new Map();
  
  constructor(db: D1Database) {
    this.db = db;
    this.tokenService = createTokenService(db);
  }
  
  /**
   * Initialize OAuth state for auth flow
   */
  async initOAuthFlow(
    provider: Provider,
    clientType: ClientType,
    redirectUri: string
  ): Promise<{ authUrl: string; state: string; codeVerifier: string }> {
    // Get the appropriate provider
    const oauthProvider = this.getOAuthProvider(provider);
    
    // Generate state and PKCE
    const state = generateOAuthState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    
    // Store state data
    this.oauthStates.set(state, {
      state,
      codeVerifier,
      redirectUri,
      clientType,
      provider,
      createdAt: Date.now(),
    });
    
    // Clean up old states
    this.cleanupExpiredStates();
    
    // Get auth URL
    const authUrl = oauthProvider.getAuthorizationUrl({
      state,
      codeChallenge,
      redirectUri,
    });
    
    return { authUrl, state, codeVerifier };
  }
  
  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(params: {
    provider: Provider;
    code: string;
    state: string;
    redirectUri: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuthResult> {
    const { provider, code, state, redirectUri, ipAddress, userAgent } = params;
    
    // Validate state
    const stateData = this.oauthStates.get(state);
    if (!stateData) {
      throw new AuthServiceError('Invalid or expired state', 'INVALID_STATE', 400);
    }
    
    // Check state TTL
    if (Date.now() - stateData.createdAt > OAUTH_STATE_TTL * 1000) {
      this.oauthStates.delete(state);
      throw new AuthServiceError('State expired', 'INVALID_STATE', 400);
    }
    
    // Verify provider matches
    if (stateData.provider !== provider) {
      throw new AuthServiceError('Provider mismatch', 'INVALID_STATE', 400);
    }
    
    // Clean up state
    this.oauthStates.delete(state);
    
    // Get OAuth provider
    const oauthProvider = this.getOAuthProvider(provider);
    
    // Exchange code for tokens
    let tokens;
    try {
      tokens = await oauthProvider.exchangeCode({
        code,
        codeVerifier: stateData.codeVerifier,
        redirectUri: redirectUri || stateData.redirectUri,
      });
    } catch (error) {
      await createAuditLog(this.db, {
        action: 'oauth.error',
        success: false,
        ipAddress,
        userAgent,
        metadata: {
          provider,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw error;
    }
    
    // Get user profile
    const profile = await oauthProvider.getUserProfile(tokens.accessToken);
    
    // Log the callback
    await createAuditLog(this.db, {
      action: 'oauth.callback',
      success: true,
      ipAddress,
      userAgent,
      metadata: { provider },
    });
    
    // Find or create user
    const result = await this.findOrCreateUser(profile, stateData.clientType, {
      ipAddress,
      userAgent,
    });
    
    return result;
  }
  
  /**
   * Find existing identity or create new user
   */
  private async findOrCreateUser(
    profile: ProviderProfile,
    clientType: ClientType,
    options?: { ipAddress?: string; userAgent?: string }
  ): Promise<AuthResult> {
    // Check for existing identity
    const existingIdentity = await getUserIdentityByProvider(
      this.db,
      profile.provider,
      profile.providerUserId
    );
    
    if (existingIdentity) {
      // Existing user - just login
      const user = await getUserById(this.db, existingIdentity.user_id);
      if (!user) {
        throw new AuthServiceError('User not found', 'INVALID_TOKEN', 400);
      }
      
      // Create tokens
      const tokens = await this.tokenService.createTokenPair(user.id, clientType, {
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
      });
      
      // Log login
      await createAuditLog(this.db, {
        userId: user.id,
        sessionId: tokens.refreshToken, // Not quite right but for audit
        action: 'auth.login',
        success: true,
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
        metadata: { provider: profile.provider, isNewUser: false },
      });
      
      return {
        user,
        tokens,
        isNewUser: false,
        emailVerificationRequired: user.status === 'pending_verification',
      };
    }
    
    // New identity - check if we need to link accounts
    if (profile.email) {
      const linkingResult = await this.checkAccountLinking(profile);
      
      if (linkingResult.requiresLinking && linkingResult.existingUser) {
        // Link the identity to existing user
        await this.linkIdentityToUser(linkingResult.existingUser.id, profile);
        
        const user = await getUserById(this.db, linkingResult.existingUser.id)!;
        const tokens = await this.tokenService.createTokenPair(user.id, clientType, {
          ipAddress: options?.ipAddress,
          userAgent: options?.userAgent,
        });
        
        await createAuditLog(this.db, {
          userId: user.id,
          action: 'account.linked',
          success: true,
          ipAddress: options?.ipAddress,
          userAgent: options?.userAgent,
          metadata: { provider: profile.provider },
        });
        
        return {
          user,
          tokens,
          isNewUser: false,
          emailVerificationRequired: user.status === 'pending_verification',
        };
      }
    }
    
    // Create new user
    const user = await this.createUserFromProfile(profile);
    
    // Create tokens
    const tokens = await this.tokenService.createTokenPair(user.id, clientType, {
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
    });
    
    // Send verification email if needed
    let emailVerificationRequired = false;
    if (user.status === 'pending_verification') {
      await this.sendVerificationEmail(user);
      emailVerificationRequired = true;
    }
    
    return {
      user,
      tokens,
      isNewUser: true,
      emailVerificationRequired,
    };
  }
  
  /**
   * Check if email already exists and account linking is needed
   */
  private async checkAccountLinking(profile: ProviderProfile): Promise<AccountLinkingResult> {
    if (!profile.email) {
      return { requiresLinking: false };
    }
    
    const existingUser = await getUserByEmail(this.db, profile.email);
    
    if (!existingUser) {
      return { requiresLinking: false };
    }
    
    // Check if the provider identity already exists
    const existingIdentity = await getUserIdentityByProvider(
      this.db,
      profile.provider,
      profile.providerUserId
    );
    
    if (existingIdentity) {
      // Already linked - shouldn't happen but handle it
      return { requiresLinking: false };
    }
    
    // We have an existing user with this email
    // Only link if the provider email is verified
    if (profile.emailVerified) {
      return { requiresLinking: true, existingUser };
    }
    
    // Can't safely link - email not verified
    return {
      requiresLinking: true,
      existingUser,
      message: 'Email verification required to link accounts',
    };
  }
  
  /**
   * Create user from OAuth profile
   */
  private async createUserFromProfile(profile: ProviderProfile): Promise<User> {
    if (!profile.email) {
      throw new AuthServiceError(
        'Email is required to create an account',
        'VALIDATION_ERROR',
        400
      );
    }
    
    const normalizedEmail = normalizeEmail(profile.email);
    
    // Check if user already exists by email (race condition protection)
    const existingUser = await getUserByEmail(this.db, profile.email);
    if (existingUser) {
      // Link identity to existing user
      await this.linkIdentityToUser(existingUser.id, profile);
      return existingUser;
    }
    
    // Determine initial status
    let status: UserStatus = 'pending_verification';
    
    // Activate if provider email is verified AND from trusted domain
    if (profile.emailVerified && isTrustedEmailDomain(profile.email)) {
      status = 'active';
    }
    
    // Create user
    const user = await createUser(this.db, {
      email: profile.email,
      normalizedEmail,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      status,
    });
    
    // Create identity
    await createUserIdentity(this.db, {
      userId: user.id,
      provider: profile.provider,
      providerUserId: profile.providerUserId,
      providerEmail: profile.email,
      providerEmailVerified: profile.emailVerified,
    });
    
    // Assign default role
    const userRole = await getRoleByCode(this.db, 'user');
    if (userRole) {
      await assignRoleToUser(this.db, user.id, userRole.id);
    }
    
    // Audit
    await createAuditLog(this.db, {
      userId: user.id,
      action: 'account.created',
      success: true,
      metadata: { provider: profile.provider, isNewUser: true },
    });
    
    return user;
  }
  
  /**
   * Link identity to existing user
   */
  private async linkIdentityToUser(userId: string, profile: ProviderProfile): Promise<void> {
    await createUserIdentity(this.db, {
      userId,
      provider: profile.provider,
      providerUserId: profile.providerUserId,
      providerEmail: profile.email,
      providerEmailVerified: profile.emailVerified,
    });
    
    // If linking a verified email and user was pending, activate
    if (profile.emailVerified && profile.email) {
      const user = await getUserById(this.db, userId);
      if (user && user.status === 'pending_verification' && isTrustedEmailDomain(profile.email)) {
        await updateUser(this.db, userId, {
          status: 'active',
          emailVerifiedAt: Math.floor(Date.now() / 1000),
        });
      }
    }
  }
  
  /**
   * Send verification email
   */
  async sendVerificationEmail(user: User): Promise<void> {
    const token = generateSecureToken(32);
    const tokenHash = await hashToken(token);
    const expiresAt = Math.floor(Date.now() / 1000) + EMAIL_VERIFICATION_TTL;
    
    await createEmailVerificationToken(this.db, {
      userId: user.id,
      tokenHash,
      expiresAt,
    });
    
    // Store code for dev/testing
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      this.emailVerificationCodes.set(token.slice(0, 8), {
        userId: user.id,
        email: user.email,
      });
    }
    
    // In production, send actual email
    // For now, we just log it
    console.log(`[DEV] Verification email for ${user.email}: ${token}`);
    
    await createAuditLog(this.db, {
      userId: user.id,
      action: 'verification.email_sent',
      success: true,
      metadata: { email: user.email },
    });
  }
  
  /**
   * Verify email token
   */
  async verifyEmail(token: string, ipAddress?: string, userAgent?: string): Promise<User> {
    const tokenHash = await hashToken(token);
    const storedToken = await getEmailVerificationTokenByHash(this.db, tokenHash);
    
    if (!storedToken) {
      throw new AuthServiceError('Invalid verification token', 'INVALID_TOKEN', 400);
    }
    
    const now = Math.floor(Date.now() / 1000);
    if (storedToken.expires_at < now) {
      throw new AuthServiceError('Verification token expired', 'TOKEN_EXPIRED', 400);
    }
    
    if (storedToken.consumed_at) {
      throw new AuthServiceError('Verification token already used', 'INVALID_TOKEN', 400);
    }
    
    // Get user
    const user = await getUserById(this.db, storedToken.user_id);
    if (!user) {
      throw new AuthServiceError('User not found', 'INVALID_TOKEN', 400);
    }
    
    // Consume token
    await consumeEmailVerificationToken(this.db, storedToken.id);
    
    // Activate user if pending
    if (user.status === 'pending_verification') {
      await updateUser(this.db, user.id, {
        status: 'active',
        emailVerifiedAt: now,
      });
    }
    
    // Audit
    await createAuditLog(this.db, {
      userId: user.id,
      action: 'verification.email_verified',
      success: true,
      ipAddress,
      userAgent,
    });
    
    return (await getUserById(this.db, user.id))!;
  }
  
  /**
   * Get OAuth provider by name
   */
  private getOAuthProvider(provider: Provider): OAuthProvider {
    switch (provider) {
      case 'google':
        return getGoogleProvider();
      case 'facebook':
        return getFacebookProvider();
      default:
        throw new AuthServiceError('Unsupported provider', 'UNSUPPORTED_PROVIDER', 400);
    }
  }
  
  /**
   * Clean up expired OAuth states
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    for (const [key, value] of this.oauthStates.entries()) {
      if (now - value.createdAt > OAUTH_STATE_TTL * 1000) {
        this.oauthStates.delete(key);
      }
    }
  }
  
  /**
   * Get user with roles
   */
  async getUserWithRoles(userId: string): Promise<{ user: User; roles: UserRole[] } | null> {
    const user = await getUserById(this.db, userId);
    if (!user) return null;
    
    const roles = await getUserRoles(this.db, userId);
    return { user, roles };
  }
  
  /**
   * Suspend user
   */
  async suspendUser(
    userId: string,
    adminId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<User> {
    const user = await getUserById(this.db, userId);
    if (!user) {
      throw new AuthServiceError('User not found', 'NOT_FOUND', 404);
    }
    
    if (user.status === 'deleted') {
      throw new AuthServiceError('Cannot suspend deleted user', 'INVALID_REQUEST', 400);
    }
    
    await updateUser(this.db, userId, { status: 'suspended' });
    
    await createAuditLog(this.db, {
      userId,
      action: 'account.suspended',
      success: true,
      ipAddress,
      userAgent,
      metadata: { adminId },
    });
    
    return (await getUserById(this.db, userId))!;
  }
  
  /**
   * Reactivate user
   */
  async reactivateUser(
    userId: string,
    adminId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<User> {
    const user = await getUserById(this.db, userId);
    if (!user) {
      throw new AuthServiceError('User not found', 'NOT_FOUND', 404);
    }
    
    if (user.status !== 'suspended') {
      throw new AuthServiceError('User is not suspended', 'INVALID_REQUEST', 400);
    }
    
    await updateUser(this.db, userId, { status: 'active' });
    
    await createAuditLog(this.db, {
      userId,
      action: 'account.reactivated',
      success: true,
      ipAddress,
      userAgent,
      metadata: { adminId },
    });
    
    return (await getUserById(this.db, userId))!;
  }
  
  /**
   * Assign role to user
   */
  async assignRole(
    userId: string,
    roleCode: string,
    adminId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const user = await getUserById(this.db, userId);
    if (!user) {
      throw new AuthServiceError('User not found', 'NOT_FOUND', 404);
    }
    
    const role = await getRoleByCode(this.db, roleCode);
    if (!role) {
      throw new AuthServiceError('Role not found', 'NOT_FOUND', 404);
    }
    
    // Prevent assigning admin role via OAuth claims
    if (roleCode === 'admin' && !role.is_system) {
      // Allow only system admin role
    }
    
    await assignRoleToUser(this.db, userId, role.id, adminId);
    
    await createAuditLog(this.db, {
      userId,
      action: 'role.assigned',
      success: true,
      ipAddress,
      userAgent,
      metadata: { roleCode, adminId },
    });
  }
  
  /**
   * Remove role from user
   */
  async removeRole(
    userId: string,
    roleCode: string,
    adminId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const user = await getUserById(this.db, userId);
    if (!user) {
      throw new AuthServiceError('User not found', 'NOT_FOUND', 404);
    }
    
    const role = await getRoleByCode(this.db, roleCode);
    if (!role) {
      throw new AuthServiceError('Role not found', 'NOT_FOUND', 404);
    }
    
    await (await import('../db/queries')).removeRoleFromUser(this.db, userId, role.id);
    
    await createAuditLog(this.db, {
      userId,
      action: 'role.removed',
      success: true,
      ipAddress,
      userAgent,
      metadata: { roleCode, adminId },
    });
  }
  
  /**
   * Soft delete user account
   */
  async deleteAccount(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const user = await getUserById(this.db, userId);
    if (!user) {
      throw new AuthServiceError('User not found', 'NOT_FOUND', 404);
    }
    
    // Revoke all sessions
    await this.tokenService.revokeAllSessions(userId);
    
    // Soft delete user
    await softDeleteUser(this.db, userId);
    
    await createAuditLog(this.db, {
      userId,
      action: 'account.deleted',
      success: true,
      ipAddress,
      userAgent,
    });
  }
}

/**
 * Auth service error class
 */
export class AuthServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AuthServiceError';
  }
}

/**
 * Create auth service instance
 */
export function createAuthService(db: D1Database): AuthService {
  return new AuthService(db);
}
