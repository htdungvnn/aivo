'use client';

/**
 * Authentication context and hooks for Next.js
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthClient, AuthApiClient, User, Session, AuthApiError } from '@repo/api-client';

interface AuthState {
  user: User | null;
  session: Session | null;
  roles: string[];
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (provider: 'google' | 'facebook') => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
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
      setState(prev => ({ ...prev, isLoading: false }));
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
      authClient.setTokens({ accessToken: '', refreshToken: '', expiresIn: 0, tokenType: 'Bearer' } as any);
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
   * Login with OAuth provider
   */
  const login = async (provider: 'google' | 'facebook') => {
    try {
      const { authUrl, state: oauthState } = await authClient.startOAuth(provider);
      
      // Store state for callback verification
      sessionStorage.setItem('oauth_state', oauthState);
      sessionStorage.setItem('oauth_provider', provider);
      
      // Redirect to OAuth provider
      window.location.href = authUrl;
    } catch (error) {
      console.error('Login error:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Login failed',
      }));
    }
  };

  /**
   * Logout current session
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
      await authClient.logoutAll();
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
      setState(prev => ({
        ...prev,
        isAuthenticated: false,
      }));
    }
  };

  /**
   * Clear error
   */
  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        logoutAll,
        refreshSession,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to require authentication
 */
export function useRequireAuth(redirectTo?: string) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const loginUrl = redirectTo || '/login';
      const currentUrl = window.location.pathname;
      window.location.href = `${loginUrl}?redirect=${encodeURIComponent(currentUrl)}`;
    }
  }, [isAuthenticated, isLoading, redirectTo]);

  return { isLoading, isAuthenticated };
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
