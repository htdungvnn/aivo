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
  Role,
} from '../types';
import { TokenPair } from '../types';
import {
  createUser,
  getUserById,
  getUserByEmail,
  getUserByVerificationCode,
  getUserIdentityByProvider,
  getUserIdentities,
  createUserIdentity,
  getRoleByCode,
  assignRoleToUser,
  getUserRoles,
  createAuditLog,
  updateUser,
  softDeleteUser,
} from '../db/queries';
import { normalizeEmail, generateSecureToken, generateOAuthState, generateCodeVerifier, generateCodeChallenge, generateUUID } from '../utils/crypto';
import { isTrustedEmailDomain } from '../providers/base';
import { TokenService, createTokenService } from '../lib/tokens';
import { OAuthProvider, getGoogleProvider, getFacebookProvider, OAuthError } from '../providers';

const EMAIL_VERIFICATION_TTL = 60 * 60; // 1 hour
const OAUTH_STATE_TTL = 10 * 60; // 10 minutes (in seconds for D1)

// Module-level OAuth state storage (survives across requests in the same worker instance)
// This is a fallback for local development when D1 is not available or not working
const oauthStateStore = new Map<string, OAuthStateData>();

interface OAuthStateData {
  state: string;
  codeVerifier: string;
  redirectUri: string;
  clientType: ClientType;
  provider: Provider;
  createdAt: number;
  expiresAt: number;
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
  private emailVerificationCodes: Map<string, { userId: string; email: string }> = new Map();
  
  constructor(db: D1Database) {
    this.db = db;
    this.tokenService = createTokenService(db);
  }
  
  /**
   * Store OAuth state in D1 database
   */
  private async storeOAuthState(data: OAuthStateData): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = Math.floor(Date.now() / 1000) + OAUTH_STATE_TTL;
    
    try {
      await this.db
        .prepare(`
          INSERT INTO oauth_states (id, state, code_verifier, redirect_uri, client_type, provider, created_at, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          generateUUID(),
          data.state,
          data.codeVerifier,
          data.redirectUri,
          data.clientType,
          data.provider,
          now,
          expiresAt
        )
        .run();
    } catch (error) {
      console.error('Failed to store OAuth state in D1, using module-level memory store:', error);
      // Fallback to module-level memory store (for local dev without D1)
      oauthStateStore.set(data.state, data);
    }
  }
  
  /**
   * Get OAuth state from D1 database
   */
  private async getOAuthState(state: string): Promise<OAuthStateData | null> {
    try {
      const result = await this.db
        .prepare('SELECT * FROM oauth_states WHERE state = ? AND expires_at > ?')
        .bind(state, Math.floor(Date.now() / 1000))
        .first();
      
      if (result) {
        return {
          state: result.state as string,
          codeVerifier: result.code_verifier as string,
          redirectUri: result.redirect_uri as string,
          clientType: result.client_type as ClientType,
          provider: result.provider as Provider,
          createdAt: (result.created_at as number) * 1000,
          expiresAt: result.expires_at as number,
        };
      }
    } catch (error) {
      console.error('Failed to get OAuth state from D1, falling back to memory store:', error);
    }
    
    // Fallback to module-level memory store (for local dev without D1)
    const memoryState = oauthStateStore.get(state);
    if (memoryState && Date.now() - memoryState.createdAt < OAUTH_STATE_TTL * 1000) {
      return memoryState;
    }
    
    return null;
  }
  
  /**
   * Delete OAuth state from D1 database
   */
  private async deleteOAuthState(state: string): Promise<void> {
    // Always remove from memory store first (it's instant)
    oauthStateStore.delete(state);
    
    try {
      await this.db
        .prepare('DELETE FROM oauth_states WHERE state = ?')
        .bind(state)
        .run();
    } catch (error) {
      console.error('Failed to delete OAuth state from D1:', error);
    }
  }
  
  /**
   * Cleanup expired OAuth states (D1)
   */
  private async cleanupExpiredOAuthStates(): Promise<void> {
    // Clean up expired states from memory store
    const now = Date.now();
    for (const [state, data] of oauthStateStore.entries()) {
      if (now - data.createdAt >= OAUTH_STATE_TTL * 1000) {
        oauthStateStore.delete(state);
      }
    }
    
    try {
      await this.db
        .prepare('DELETE FROM oauth_states WHERE expires_at < ?')
        .bind(Math.floor(Date.now() / 1000))
        .run();
    } catch (error) {
      console.error('Failed to cleanup OAuth states:', error);
    }
  }
  
  // Memory fallback for local development when D1 is not available
  private _memoryStates?: Map<string, OAuthStateData>;
  
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
    
    // Store state data in D1
    const stateData: OAuthStateData = {
      state,
      codeVerifier,
      redirectUri,
      clientType,
      provider,
      createdAt: Date.now(),
      expiresAt: Date.now() + OAUTH_STATE_TTL * 1000,
    };
    
    await this.storeOAuthState(stateData);
    
    // Clean up old states
    await this.cleanupExpiredOAuthStates();
    
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
    
    // Validate state from D1
    const stateData = await this.getOAuthState(state);
    if (!stateData) {
      throw new AuthServiceError('Invalid or expired state', 'INVALID_STATE', 400);
    }
    
    // Verify provider matches
    if (stateData.provider !== provider) {
      throw new AuthServiceError('Provider mismatch', 'INVALID_STATE', 400);
    }
    
    // Clean up state
    await this.deleteOAuthState(state);
    
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
      
      // Log login (don't include sessionId - it's stored separately in tokens)
      await createAuditLog(this.db, {
        userId: user.id,
        sessionId: null, // Session ID not available in this context
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
        
        // Don't let audit log failure break the auth flow
        try {
          await createAuditLog(this.db, {
            userId: user.id,
            action: 'account.linked',
            success: true,
            ipAddress: options?.ipAddress,
            userAgent: options?.userAgent,
            metadata: { provider: profile.provider },
          });
        } catch (auditError) {
          console.error('[OAuth] WARNING: Failed to create account.linked audit log:', auditError);
        }
        
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
    
    // For OAuth providers, trust their email verification since users
    // verify email ownership during OAuth consent flow
    // For email/password registration, still require verification
    if (profile.emailVerified) {
      status = 'active';
    }
    
    // Create user with detailed error tracking
    console.log('[OAuth] Creating user with email:', profile.email, 'status:', status);
    console.log('[OAuth] Profile:', JSON.stringify({
      provider: profile.provider,
      providerUserId: profile.providerUserId,
      emailVerified: profile.emailVerified,
      displayName: profile.displayName,
    }));
    
    let user: User;
    try {
      user = await createUser(this.db, {
        email: profile.email,
        normalizedEmail,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        status,
      });
      console.log('[OAuth] User created successfully:', user.id);
    } catch (error) {
      console.error('[OAuth] ERROR creating user:', error);
      console.error('[OAuth] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown',
        cause: error instanceof Error && 'cause' in error ? (error as any).cause : undefined,
        code: error instanceof Error && 'code' in error ? (error as any).code : undefined,
      });
      throw error;
    }

    // Create identity
    console.log('[OAuth] Creating identity for user:', user.id);
    try {
      await createUserIdentity(this.db, {
        userId: user.id,
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        providerEmail: profile.email,
        providerEmailVerified: profile.emailVerified,
      });
      console.log('[OAuth] Identity created successfully');
    } catch (error) {
      console.error('[OAuth] ERROR creating identity:', error);
      console.error('[OAuth] Error details:', {
        userId: user.id,
        provider: profile.provider,
        providerUserId: profile.providerUserId,
      });
      throw error;
    }

    // Assign default role
    console.log('[OAuth] Assigning role to user:', user.id);
    const userRole = await getRoleByCode(this.db, 'user');
    console.log('[OAuth] Got user role:', userRole);
    
    if (!userRole) {
      console.error('[OAuth] ERROR: User role not found in database!');
      throw new AuthServiceError(
        'System role not configured. Please run database migrations.',
        'CONFIGURATION_ERROR',
        500
      );
    }
    
    try {
      await assignRoleToUser(this.db, user.id, userRole.id);
      console.log('[OAuth] Role assigned successfully');
    } catch (error) {
      console.error('[OAuth] ERROR assigning role:', error);
      console.error('[OAuth] Role assignment details:', {
        userId: user.id,
        roleId: userRole.id,
        roleCode: userRole.code,
      });
      throw error;
    }

    // Audit - do NOT include userId here because D1 might not have committed the user yet
    // We'll create an audit log without userId for account creation
    try {
      await createAuditLog(this.db, {
        userId: null, // Don't reference user until we confirm it exists
        action: 'account.created',
        success: true,
        metadata: { provider: profile.provider, isNewUser: true, email: profile.email },
      });
      console.log('[OAuth] Audit log created');
    } catch (auditError) {
      // Log the error but don't fail the request - account creation succeeded
      console.error('[OAuth] WARNING: Failed to create audit log:', auditError);
    }
    
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
    const code = generateSecureToken(8); // 8 character code
    const expiresAt = Math.floor(Date.now() / 1000) + EMAIL_VERIFICATION_TTL;

    await updateUser(this.db, user.id, {
      verificationCode: code,
      verificationCodeExpiresAt: expiresAt,
    });

    // Store code for dev/testing
    const nodeEnv = typeof process !== 'undefined' ? process.env.NODE_ENV : undefined;
    if (nodeEnv === 'development' || !nodeEnv) {
      this.emailVerificationCodes.set(code, {
        userId: user.id,
        email: user.email,
      });
    }

    // In production, send actual email
    // For now, we just log it
    console.log(`[DEV] Verification code for ${user.email}: ${code}`);

    await createAuditLog(this.db, {
      userId: user.id,
      action: 'verification.email_sent',
      success: true,
      metadata: { email: user.email },
    });
  }
  
  /**
   * Verify email code
   */
  async verifyEmail(code: string, ipAddress?: string, userAgent?: string): Promise<User> {
    const user = await getUserByVerificationCode(this.db, code);
    
    if (!user) {
      throw new AuthServiceError('Invalid verification code', 'INVALID_TOKEN', 400);
    }

    const now = Math.floor(Date.now() / 1000);
    if (user.verification_code_expires_at && user.verification_code_expires_at < now) {
      throw new AuthServiceError('Verification code expired', 'TOKEN_EXPIRED', 400);
    }

    // Clear the code
    await updateUser(this.db, user.id, {
      verificationCode: null,
      verificationCodeExpiresAt: null,
    });

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
    let oauthProvider: OAuthProvider;
    
    switch (provider) {
      case 'google':
        oauthProvider = getGoogleProvider();
        break;
      case 'facebook':
        oauthProvider = getFacebookProvider();
        break;
      default:
        throw new AuthServiceError('Unsupported provider', 'UNSUPPORTED_PROVIDER', 400);
    }
    
    // Check if the provider is properly configured
    if (!oauthProvider.isConfigured()) {
      throw new AuthServiceError(
        `${provider} OAuth is not configured. Please set the required environment variables (${provider.toUpperCase()}_CLIENT_ID, ${provider.toUpperCase()}_CLIENT_SECRET, ${provider.toUpperCase()}_REDIRECT_URI)`,
        'OAUTH_NOT_CONFIGURED',
        500
      );
    }
    
    return oauthProvider;
  }
  
  /**
   * Get user with roles
   */
  async getUserWithRoles(userId: string): Promise<{ user: User; roles: Role[] } | null> {
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
