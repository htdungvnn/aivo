/**
 * Authentication hooks for Expo React Native
 */

import { useState, useEffect, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { getAuthClient, MobileAuthClient, User, Session, AuthApiError } from '@/lib/auth';

interface AuthState {
  user: User | null;
  session: Session | null;
  roles: string[];
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface UseAuthReturn extends AuthState {
  login: (provider: 'google' | 'facebook') => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    roles: [],
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  const authClient = getAuthClient();

  /**
   * Restore session on mount
   */
  const restoreSession = useCallback(async () => {
    if (!authClient.isAuthenticated()) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const { user, roles, session } = await authClient.getCurrentUser();
      setState({
        user,
        session,
        roles,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });
    } catch (error) {
      console.error('Failed to restore session:', error);
      await authClient.clearTokens();
      setState({
        user: null,
        session: null,
        roles: [],
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  /**
   * Login with OAuth
   */
  const login = async (provider: 'google' | 'facebook') => {
    try {
      const { authUrl } = await authClient.startOAuth(provider);
      
      // Open browser for OAuth
      const result = await WebBrowser.openAuthSessionAsync(authUrl, Linking.createURL('oauth/callback'));
      
      if (result.type === 'success' && result.url) {
        // Parse callback URL
        const url = new URL(result.url);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const error = url.searchParams.get('error');
        
        if (error) {
          throw new Error(url.searchParams.get('error_description') || error);
        }
        
        if (!code || !state) {
          throw new Error('Missing OAuth parameters');
        }
        
        // Complete OAuth flow
        const authResponse = await authClient.completeOAuth(provider, code, state);
        
        setState({
          user: authResponse.user,
          session: null,
          roles: [],
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Login failed',
      }));
    }
  };

  /**
   * Logout
   */
  const logout = async () => {
    try {
      await authClient.logout();
    } finally {
      setState({
        user: null,
        session: null,
        roles: [],
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });
    }
  };

  /**
   * Logout all sessions
   */
  const logoutAll = async () => {
    try {
      // This would require a separate API call
      await authClient.logout();
    } finally {
      setState({
        user: null,
        session: null,
        roles: [],
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });
    }
  };

  /**
   * Refresh session
   */
  const refreshSession = async () => {
    try {
      const { user, roles, session } = await authClient.getCurrentUser();
      setState({
        user,
        session,
        roles,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });
    } catch (error) {
      console.error('Refresh session error:', error);
      setState((prev) => ({
        ...prev,
        isAuthenticated: false,
      }));
    }
  };

  /**
   * Clear error
   */
  const clearError = () => {
    setState((prev) => ({ ...prev, error: null }));
  };

  return {
    ...state,
    login,
    logout,
    logoutAll,
    refreshSession,
    clearError,
  };
}

/**
 * Hook to require active account
 */
export function useRequireActiveAccount() {
  const { user, isAuthenticated } = useAuth();

  const isActive = user?.status === 'active';
  const needsVerification = user?.status === 'pending_verification';
  const isSuspended = user?.status === 'suspended';

  return {
    isActive,
    needsVerification,
    isSuspended,
    canAccess: isAuthenticated && isActive,
  };
}

/**
 * Hook to require specific role
 */
export function useRequireRole(role: string) {
  const { roles, isAuthenticated } = useAuth();

  const hasRole = roles.includes(role);

  return {
    hasRole,
    canAccess: isAuthenticated && hasRole,
  };
}

/**
 * Hook to require admin
 */
export function useRequireAdmin() {
  return useRequireRole('admin');
}
