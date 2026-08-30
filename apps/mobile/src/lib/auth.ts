/**
 * Auth API client for mobile (Expo)
 * Handles authentication, token management, and API calls using Expo SecureStore
 */

import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { generateCodeVerifierAsync, generateStateAsync } from 'expo-crypto';

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: string;
  emailVerifiedAt?: number | null;
  createdAt?: number;
}

export interface Session {
  id: string;
  clientType: string;
  deviceName: string | null;
  platform: string | null;
  createdAt: number;
  lastActiveAt: number;
  expiresAt: number;
  isCurrent?: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface AuthResponse {
  user: User;
  tokens: TokenPair;
  isNewUser: boolean;
  emailVerificationRequired: boolean;
}

const TOKEN_KEYS = {
  ACCESS: 'auth_access_token',
  REFRESH: 'auth_refresh_token',
  USER: 'auth_user',
};

export class AuthApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

export class MobileAuthClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
    this.loadTokens();
  }

  /**
   * Load tokens from secure storage
   */
  private async loadTokens(): Promise<void> {
    try {
      this.accessToken = await SecureStore.getItemAsync(TOKEN_KEYS.ACCESS);
      this.refreshToken = await SecureStore.getItemAsync(TOKEN_KEYS.REFRESH);
    } catch (error) {
      console.error('Failed to load tokens:', error);
    }
  }

  /**
   * Save tokens to secure storage
   */
  private async saveTokens(tokens: TokenPair): Promise<void> {
    try {
      await SecureStore.setItemAsync(TOKEN_KEYS.ACCESS, tokens.accessToken);
      await SecureStore.setItemAsync(TOKEN_KEYS.REFRESH, tokens.refreshToken);
      this.accessToken = tokens.accessToken;
      this.refreshToken = tokens.refreshToken;
    } catch (error) {
      console.error('Failed to save tokens:', error);
    }
  }

  /**
   * Clear tokens from secure storage
   */
  async clearTokens(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEYS.ACCESS);
      await SecureStore.deleteItemAsync(TOKEN_KEYS.REFRESH);
      await SecureStore.deleteItemAsync(TOKEN_KEYS.USER);
      this.accessToken = null;
      this.refreshToken = null;
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  /**
   * Start OAuth flow with PKCE
   */
  async startOAuth(provider: 'google' | 'facebook'): Promise<{ authUrl: string; state: string }> {
    // Generate PKCE parameters
    const state = generateStateAsync(32);
    const codeVerifier = generateCodeVerifierAsync(64);
    
    // Generate code challenge (SHA256)
    const codeChallengeArray = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      codeVerifier,
      { encoding: Crypto.CryptoEncoding.BASE64_URL }
    );

    // Store for callback
    await SecureStore.setItemAsync('oauth_state', state);
    await SecureStore.setItemAsync('oauth_code_verifier', codeVerifier);

    // Call backend to get authorization URL
    const response = await this.request('/oauth/start', {
      method: 'POST',
      body: { provider },
    });

    return response as { authUrl: string; state: string };
  }

  /**
   * Complete OAuth flow
   */
  async completeOAuth(provider: 'google' | 'facebook', code: string, state: string): Promise<AuthResponse> {
    // Verify state
    const storedState = await SecureStore.getItemAsync('oauth_state');
    if (state !== storedState) {
      throw new AuthApiError('Invalid OAuth state', 'INVALID_STATE', 400);
    }

    // Get code verifier
    const codeVerifier = await SecureStore.getItemAsync('oauth_code_verifier');
    if (!codeVerifier) {
      throw new AuthApiError('Missing code verifier', 'INVALID_REQUEST', 400);
    }

    // Clear stored OAuth data
    await SecureStore.deleteItemAsync('oauth_state');
    await SecureStore.deleteItemAsync('oauth_code_verifier');

    // Determine redirect URI
    const redirectUri = Linking.createURL('oauth/callback');

    // Exchange code for tokens
    const response = await this.request('/oauth/mobile/callback', {
      method: 'POST',
      body: {
        provider,
        code,
        state,
        redirectUri,
      },
    });

    const authResponse = response as AuthResponse;

    // Save tokens
    await this.saveTokens(authResponse.tokens);

    // Save user
    await SecureStore.setItemAsync(TOKEN_KEYS.USER, JSON.stringify(authResponse.user));

    return authResponse;
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<{ user: User; roles: string[]; session: Session }> {
    const response = await this.request('/auth/me');
    return response as { user: User; roles: string[]; session: Session };
  }

  /**
   * Refresh tokens
   */
  async refreshTokens(): Promise<TokenPair> {
    if (this.isRefreshing) {
      return new Promise((resolve) => {
        this.refreshSubscribers.push((token) => {
          resolve({ ...this.getTokens()!, accessToken: token } as TokenPair);
        });
      });
    }

    this.isRefreshing = true;

    try {
      const response = await this.request('/auth/refresh', {
        method: 'POST',
        body: { refreshToken: this.refreshToken },
      });

      const tokens = response as TokenPair;
      await this.saveTokens(tokens);

      // Notify waiting requests
      this.refreshSubscribers.forEach((cb) => cb(tokens.accessToken));
      this.refreshSubscribers = [];

      return tokens;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      await this.clearTokens();
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(): Promise<void> {
    await this.request('/verification/send', { method: 'POST' });
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<{ user: User; message: string }> {
    const response = await this.request('/verification/verify', {
      method: 'POST',
      body: { token },
    });
    return response as { user: User; message: string };
  }

  /**
   * Get all user sessions
   */
  async getSessions(): Promise<{ sessions: Session[]; total: number }> {
    const response = await this.request('/sessions');
    return response as { sessions: Session[]; total: number };
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.request(`/sessions/${sessionId}`, { method: 'DELETE' });
  }

  /**
   * Revoke all sessions except current
   */
  async revokeOtherSessions(): Promise<void> {
    await this.request('/sessions', { method: 'DELETE' });
  }

  /**
   * Logout from all devices
   */
  async logoutAll(): Promise<void> {
    try {
      await this.request('/auth/logout-all', { method: 'POST' });
    } finally {
      await this.clearTokens();
    }
  }

  /**
   * Delete account
   */
  async deleteAccount(): Promise<void> {
    await this.request('/account', { method: 'DELETE' });
    await this.clearTokens();
  }

  /**
   * Get account info with identities
   */
  async getAccountInfo(): Promise<{ user: User; identities: any[] }> {
    const response = await this.request('/account');
    return response as { user: User; identities: any[] };
  }

  /**
   * Get stored user
   */
  async getStoredUser(): Promise<User | null> {
    try {
      const userJson = await SecureStore.getItemAsync(TOKEN_KEYS.USER);
      return userJson ? JSON.parse(userJson) : null;
    } catch {
      return null;
    }
  }

  /**
   * Make API request
   */
  private async request(endpoint: string, options: { method?: string; body?: unknown } = {}): Promise<any> {
    const { method = 'GET', body } = options;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add access token if available
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let url = `${this.baseUrl}/api/v1${endpoint}`;

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, fetchOptions);
      const data = await response.json();

      if (!response.ok) {
        const error = data.error || { code: 'UNKNOWN_ERROR', message: 'An error occurred' };

        // Handle token expiration
        if (error.code === 'INVALID_TOKEN' || error.code === 'TOKEN_EXPIRED') {
          if (this.refreshToken && !endpoint.includes('/auth/')) {
            try {
              await this.refreshTokens();
              return this.request(endpoint, options);
            } catch {
              await this.clearTokens();
            }
          }
        }

        throw new AuthApiError(error.message, error.code, response.status);
      }

      return data.data ?? data;
    } catch (error) {
      if (error instanceof AuthApiError) {
        throw error;
      }
      throw new AuthApiError('Network error', 'NETWORK_ERROR', 0);
    }
  }

  /**
   * Get current tokens
   */
  private getTokens(): TokenPair | null {
    if (!this.accessToken || !this.refreshToken) return null;
    return {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      expiresIn: 0,
      tokenType: 'Bearer',
    };
  }
}

// Singleton instance
let clientInstance: MobileAuthClient | null = null;

export function getAuthClient(baseUrl?: string): MobileAuthClient {
  if (!clientInstance) {
    clientInstance = new MobileAuthClient(baseUrl || process.env.EXPO_PUBLIC_AUTH_API_URL || '');
  }
  return clientInstance;
}

export function resetAuthClient(): void {
  clientInstance = null;
}
