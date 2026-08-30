/**
 * Facebook OAuth 2.0 provider implementation
 */

import type { ProviderProfile, Provider } from '../types';
import {
  buildProviderProfile,
  OAuthProvider,
  OAuthConfig,
  OAuthTokens,
  OAuthError as BaseOAuthError,
} from './base';

const FACEBOOK_PROVIDER: Provider = 'facebook';
const FACEBOOK_AUTH_URL = 'https://www.facebook.com/v18.0/dialog/oauth';
const FACEBOOK_TOKEN_URL = 'https://graph.facebook.com/v18.0/oauth/access_token';
const FACEBOOK_USERINFO_URL = 'https://graph.facebook.com/v18.0/me';
const FACEBOOK_PICTURE_URL = 'https://graph.facebook.com/v18.0/me/picture';

interface FacebookTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface FacebookUserResponse {
  id: string;
  email?: string;
  name?: string;
  picture?: {
    data: {
      url?: string;
    };
  };
}

/**
 * Facebook OAuth provider
 */
export class FacebookProvider implements OAuthProvider {
  readonly provider: Provider = FACEBOOK_PROVIDER;
  private config: OAuthConfig | null = null;
  
  /**
   * Configure with environment variables
   */
  static fromEnv(env: {
    FACEBOOK_CLIENT_ID?: string;
    FACEBOOK_CLIENT_SECRET?: string;
    FACEBOOK_REDIRECT_URI?: string;
  }): FacebookProvider {
    const provider = new FacebookProvider();
    
    if (env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET && env.FACEBOOK_REDIRECT_URI) {
      provider.config = {
        clientId: env.FACEBOOK_CLIENT_ID,
        clientSecret: env.FACEBOOK_CLIENT_SECRET,
        redirectUri: env.FACEBOOK_REDIRECT_URI,
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
      throw new BaseOAuthError('Facebook OAuth not configured', 'OAUTH_ERROR', 500, FACEBOOK_PROVIDER);
    }
    
    // Note: Facebook doesn't support PKCE natively, so we store code_verifier in state
    // In production, you'd want to use a more secure method
    const url = new URL(FACEBOOK_AUTH_URL);
    url.searchParams.set('client_id', this.config.clientId);
    url.searchParams.set('redirect_uri', params.redirectUri || this.config.redirectUri);
    url.searchParams.set('state', JSON.stringify({
      state: params.state,
      codeChallenge: params.codeChallenge,
    }));
    url.searchParams.set('scope', 'email,public_profile');
    
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
      throw new BaseOAuthError('Facebook OAuth not configured', 'OAUTH_ERROR', 500, FACEBOOK_PROVIDER);
    }
    
    const response = await fetch(
      `${FACEBOOK_TOKEN_URL}?` +
        new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          redirect_uri: params.redirectUri || this.config.redirectUri,
          code: params.code,
        }).toString()
    );
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new BaseOAuthError(
        error.error?.message || 'Failed to exchange code',
        'OAUTH_ERROR',
        response.status,
        FACEBOOK_PROVIDER
      );
    }
    
    const data: FacebookTokenResponse = await response.json();
    
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
    };
  }
  
  /**
   * Get user profile from Facebook
   */
  async getUserProfile(accessToken: string): Promise<ProviderProfile> {
    // Get user info and picture in parallel
    const [userResponse, pictureResponse] = await Promise.all([
      fetch(
        `${FACEBOOK_USERINFO_URL}?` +
          new URLSearchParams({
            fields: 'id,name,email',
            access_token: accessToken,
          }).toString()
      ),
      fetch(
        `${FACEBOOK_PICTURE_URL}?` +
          new URLSearchParams({
            redirect: 'false',
            access_token: accessToken,
          }).toString()
      ),
    ]);
    
    if (!userResponse.ok) {
      throw new BaseOAuthError(
        'Failed to get user profile',
        'OAUTH_ERROR',
        userResponse.status,
        FACEBOOK_PROVIDER
      );
    }
    
    const userData: FacebookUserResponse = await userResponse.json();
    let pictureUrl: string | null = null;
    
    if (pictureResponse.ok) {
      const pictureData = await pictureResponse.json();
      pictureUrl = pictureData.data?.url ?? null;
    }
    
    // Note: Facebook doesn't provide email_verified flag
    // Email is only available if user granted email permission
    return buildProviderProfile(FACEBOOK_PROVIDER, {
      id: userData.id,
      email: userData.email,
      emailVerified: false, // Facebook doesn't provide this
      name: userData.name,
      picture: pictureUrl,
    });
  }
}

// Singleton instance
let facebookProviderInstance: FacebookProvider | null = null;

/**
 * Get or create Facebook provider instance
 */
export function getFacebookProvider(env?: {
  FACEBOOK_CLIENT_ID?: string;
  FACEBOOK_CLIENT_SECRET?: string;
  FACEBOOK_REDIRECT_URI?: string;
}): FacebookProvider {
  if (!facebookProviderInstance) {
    facebookProviderInstance = FacebookProvider.fromEnv(env || {});
  }
  return facebookProviderInstance;
}

/**
 * Set Facebook provider instance
 */
export function setFacebookProvider(provider: FacebookProvider): void {
  facebookProviderInstance = provider;
}
