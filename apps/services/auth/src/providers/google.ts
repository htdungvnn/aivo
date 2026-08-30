/**
 * Google OAuth 2.0 provider implementation
 */

import type { D1Database } from '@cloudflare/workers-types';
import type { OAuthProvider, OAuthConfig, OAuthTokens, OAuthError } from './base';
import type { ProviderProfile, Provider } from '../types';
import {
  buildProviderProfile,
  OAuthError as BaseOAuthError,
} from './base';

const GOOGLE_PROVIDER: Provider = 'google';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

interface GoogleUserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

/**
 * Google OAuth provider
 */
export class GoogleProvider implements OAuthProvider {
  readonly provider: Provider = GOOGLE_PROVIDER;
  private config: OAuthConfig | null = null;
  
  /**
   * Configure with environment variables
   */
  static fromEnv(env: {
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    GOOGLE_REDIRECT_URI?: string;
  }): GoogleProvider {
    const provider = new GoogleProvider();
    
    if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI) {
      provider.config = {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        redirectUri: env.GOOGLE_REDIRECT_URI,
      };
    }
    
    return provider;
  }
  
  /**
   * Check if provider is configured
   */
  isConfigured(): boolean {
    return this.config !== null;
  }
  
  /**
   * Set configuration
   */
  setConfig(config: OAuthConfig): void {
    this.config = config;
  }
  
  /**
   * Get authorization URL
   */
  getAuthorizationUrl(params: {
    state: string;
    codeChallenge: string;
    redirectUri: string;
  }): string {
    if (!this.config) {
      throw new BaseOAuthError('Google OAuth not configured', 'OAUTH_ERROR', 500, GOOGLE_PROVIDER);
    }
    
    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set('client_id', this.config.clientId);
    url.searchParams.set('redirect_uri', params.redirectUri || this.config.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', params.state);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('code_challenge', params.codeChallenge);
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    
    return url.toString();
  }
  
  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(params: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<OAuthTokens> {
    if (!this.config) {
      throw new BaseOAuthError('Google OAuth not configured', 'OAUTH_ERROR', 500, GOOGLE_PROVIDER);
    }
    
    const body = new URLSearchParams({
      code: params.code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: params.redirectUri || this.config.redirectUri,
      grant_type: 'authorization_code',
      code_verifier: params.codeVerifier,
    });
    
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new BaseOAuthError(
        error.error_description || 'Failed to exchange code',
        'OAUTH_ERROR',
        response.status,
        GOOGLE_PROVIDER
      );
    }
    
    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      idToken: data.id_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
    };
  }
  
  /**
   * Get user profile from Google
   */
  async getUserProfile(accessToken: string): Promise<ProviderProfile> {
    const response = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      throw new BaseOAuthError(
        'Failed to get user profile',
        'OAUTH_ERROR',
        response.status,
        GOOGLE_PROVIDER
      );
    }
    
    const data: GoogleUserInfo = await response.json();
    
    return buildProviderProfile(GOOGLE_PROVIDER, {
      id: data.sub,
      email: data.email,
      emailVerified: data.email_verified,
      name: data.name,
      picture: data.picture,
    });
  }
}

// Singleton instance
let googleProviderInstance: GoogleProvider | null = null;

/**
 * Get or create Google provider instance
 */
export function getGoogleProvider(env?: {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
}): GoogleProvider {
  if (!googleProviderInstance) {
    googleProviderInstance = GoogleProvider.fromEnv(env || {});
  }
  return googleProviderInstance;
}

/**
 * Set Google provider instance
 */
export function setGoogleProvider(provider: GoogleProvider): void {
  googleProviderInstance = provider;
}
