/**
 * Auth API client for web and mobile
 * Handles authentication, token management, and API calls
 */

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
  userAgent: string | null;
  ipAddress: string | null;
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
  redirectUrl?: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
}

export interface ApiResponse<T> {
  data: T;
  requestId?: string;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
};

export class AuthApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public requestId?: string
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

export class AuthApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];
  
  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
    this.loadTokensFromCookies();
  }
  
  /**
   * Load tokens from cookies
   */
  private loadTokensFromCookies(): void {
    if (typeof document === 'undefined') return;
    
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'aivo_access_token') {
        this.accessToken = value;
      } else if (name === 'aivo_refresh_token') {
        this.refreshToken = value;
      }
    }
  }
  
  /**
   * Save tokens to cookies (for web)
   */
  private saveTokensToCookies(tokens: TokenPair): void {
    if (typeof document === 'undefined') return;
    
    // Access token - session cookie
    document.cookie = `aivo_access_token=${tokens.accessToken}; path=/; SameSite=Lax; secure`;
    
    // Refresh token - secure, httpOnly cookie (but we can't set httpOnly from JS)
    // In production, this should be set by the server
    document.cookie = `aivo_refresh_token=${tokens.refreshToken}; path=/; SameSite=Strict; secure; max-age=${tokens.expiresIn}`;
  }
  
  /**
   * Clear tokens from cookies
   */
  private clearTokens(): void {
    if (typeof document === 'undefined') return;
    
    document.cookie = 'aivo_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'aivo_refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    this.accessToken = null;
    this.refreshToken = null;
  }
  
  /**
   * Set tokens (after OAuth callback)
   */
  setTokens(tokens: TokenPair): void {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.saveTokensToCookies(tokens);
  }
  
  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }
  
  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }
  
  /**
   * Start OAuth flow
   */
  async startOAuth(provider: 'google' | 'facebook', redirectUri?: string): Promise<{ authUrl: string; state: string }> {
    const response = await this.request('/oauth/start', {
      method: 'POST',
      body: { provider, redirectUri },
    });
    
    return response as { authUrl: string; state: string };
  }
  
  /**
   * Handle OAuth callback (for web - server returns tokens)
   */
  async handleOAuthCallback(provider: 'google' | 'facebook', code: string, state: string): Promise<AuthResponse> {
    const response = await this.request(`/oauth/callback/${provider}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
    
    const data = response as AuthResponse;
    
    // Save tokens
    if (data.tokens) {
      this.setTokens(data.tokens);
    }
    
    return data;
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
      // Wait for the current refresh to complete
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
      this.setTokens(tokens);
      
      // Notify waiting requests
      this.refreshSubscribers.forEach((cb) => cb(tokens.accessToken));
      this.refreshSubscribers = [];
      
      return tokens;
    } finally {
      this.isRefreshing = false;
    }
  }
  
  /**
   * Logout current session
   */
  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearTokens();
    }
  }
  
  /**
   * Logout all sessions
   */
  async logoutAll(): Promise<void> {
    try {
      await this.request('/auth/logout-all', { method: 'POST' });
    } finally {
      this.clearTokens();
    }
  }
  
  /**
   * Send verification email
   */
  async sendVerificationEmail(): Promise<void> {
    await this.request('/verification/send', { method: 'POST' });
  }
  
  /**
   * Verify email token
   */
  async verifyEmail(token: string): Promise<{ user: User; message: string }> {
    const response = await this.request('/verification/verify', {
      method: 'POST',
      body: { token },
    });
    return response as { user: User; message: string };
  }
  
  /**
   * Get user sessions
   */
  async getSessions(): Promise<{ sessions: Session[] }> {
    const response = await this.request('/sessions');
    return response as { sessions: Session[] };
  }
  
  /**
   * Revoke a session
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.request(`/sessions/${sessionId}`, { method: 'DELETE' });
  }
  
  /**
   * Revoke all sessions except current
   */
  async revokeAllSessions(): Promise<{ success: boolean; revokedCount: number }> {
    const response = await this.request('/sessions', { method: 'DELETE' });
    return response as { success: boolean; revokedCount: number };
  }
  
  /**
   * Delete account
   */
  async deleteAccount(): Promise<void> {
    try {
      await this.request('/account', { method: 'DELETE' });
    } finally {
      this.clearTokens();
    }
  }
  
  /**
   * Admin: Get user info
   */
  async adminGetUser(userId: string): Promise<any> {
    const response = await this.request(`/admin/users/${userId}`);
    return response;
  }
  
  /**
   * Admin: Suspend user
   */
  async adminSuspendUser(userId: string): Promise<void> {
    await this.request(`/admin/users/${userId}/suspend`, { method: 'POST' });
  }
  
  /**
   * Admin: Reactivate user
   */
  async adminReactivateUser(userId: string): Promise<void> {
    await this.request(`/admin/users/${userId}/reactivate`, { method: 'POST' });
  }
  
  /**
   * Admin: Assign role
   */
  async adminAssignRole(userId: string, role: string): Promise<void> {
    await this.request(`/admin/users/${userId}/roles`, {
      method: 'POST',
      body: { role },
    });
  }
  
  /**
   * Admin: Remove role
   */
  async adminRemoveRole(userId: string, role: string): Promise<void> {
    await this.request(`/admin/users/${userId}/roles/${role}`, { method: 'DELETE' });
  }
  
  /**
   * Make authenticated request
   */
  private async request(endpoint: string, options: RequestOptions = {}): Promise<any> {
    const { method = 'GET', body, headers = {} } = options;
    
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };
    
    // Add access token if available and not a refresh request
    if (this.accessToken && !endpoint.includes('/auth/refresh')) {
      requestHeaders['Authorization'] = `Bearer ${this.accessToken}`;
    }
    
    let url = `${this.baseUrl}/api/v1${endpoint}`;
    
    // For GET requests, add query params
    if (method === 'GET' && body) {
      const params = new URLSearchParams();
      Object.entries(body as Record<string, string>).forEach(([key, value]) => {
        params.append(key, value);
      });
      url += `?${params.toString()}`;
    }
    
    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body && method !== 'GET' ? JSON.stringify(body) : undefined,
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        const error = data.error || { code: 'UNKNOWN_ERROR', message: 'An error occurred' };
        
        // Handle token expiration
        if (error.code === 'INVALID_TOKEN' || error.code === 'TOKEN_EXPIRED') {
          // Try to refresh
          if (this.refreshToken && !endpoint.includes('/auth/')) {
            try {
              await this.refreshTokens();
              // Retry the original request
              return this.request(endpoint, options);
            } catch {
              this.clearTokens();
              // Redirect to login
              if (typeof window !== 'undefined') {
                window.location.href = '/login';
              }
            }
          }
        }
        
        throw new AuthApiError(
          error.message,
          error.code,
          response.status,
          error.requestId
        );
      }
      
      return data.data ?? data;
    } catch (error) {
      if (error instanceof AuthApiError) {
        throw error;
      }
      
      throw new AuthApiError(
        'Network error',
        'NETWORK_ERROR',
        0
      );
    }
  }
  
  /**
   * Get current tokens (for internal use)
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
let clientInstance: AuthApiClient | null = null;

/**
 * Get or create the auth API client
 */
export function getAuthClient(baseUrl?: string): AuthApiClient {
  if (!clientInstance) {
    const url = baseUrl || process.env.NEXT_PUBLIC_AUTH_API_URL || '';
    clientInstance = new AuthApiClient(url);
  }
  return clientInstance;
}

/**
 * Reset the auth client (for testing)
 */
export function resetAuthClient(): void {
  clientInstance = null;
}
