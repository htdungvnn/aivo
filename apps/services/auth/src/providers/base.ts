/**
 * Base OAuth provider interface and utilities
 */

import type { ProviderProfile, Provider } from '../types';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface OAuthTokens {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
}

export interface OAuthProvider {
  readonly provider: Provider;
  
  /**
   * Get the authorization URL for starting OAuth flow
   */
  getAuthorizationUrl(params: {
    state: string;
    codeChallenge: string;
    redirectUri: string;
  }): string;
  
  /**
   * Exchange authorization code for tokens
   */
  exchangeCode(params: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<OAuthTokens>;
  
  /**
   * Get user profile from the provider
   */
  getUserProfile(accessToken: string): Promise<ProviderProfile>;
}

/**
 * Trusted email domains for automatic account activation
 * Add your organization's verified domains here
 */
const TRUSTED_EMAIL_DOMAINS = new Set([
  // Add trusted domains here
  // 'company.com',
]);

/**
 * Check if an email is from a trusted domain
 */
export function isTrustedEmailDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? TRUSTED_EMAIL_DOMAINS.has(domain) : false;
}

/**
 * OAuth error class
 */
export class OAuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public provider?: Provider
  ) {
    super(message);
    this.name = 'OAuthError';
  }
}

/**
 * Validate redirect URI against allowlist
 */
export function validateRedirectUri(
  redirectUri: string,
  allowedUris: string[]
): boolean {
  // In development, allow localhost
  if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
    if (redirectUri.includes('localhost')) {
      return true;
    }
  }
  
  return allowedUris.some(uri => {
    if (uri.endsWith('/*')) {
      const base = uri.slice(0, -2);
      return redirectUri.startsWith(base);
    }
    return redirectUri === uri;
  });
}

/**
 * Build provider profile from normalized data
 */
export function buildProviderProfile(
  provider: Provider,
  data: {
    id: string;
    email?: string | null;
    emailVerified?: boolean;
    name?: string | null;
    picture?: string | null;
  }
): ProviderProfile {
  return {
    provider,
    providerUserId: data.id,
    email: data.email?.toLowerCase().trim() ?? null,
    emailVerified: data.emailVerified ?? false,
    displayName: data.name ?? null,
    avatarUrl: data.picture ?? null,
  };
}
