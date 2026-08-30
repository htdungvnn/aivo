/**
 * Auth Guard Provider for mobile
 * Handles authentication state restoration and protected routes
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { router, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { getAuthClient, User, Session } from '../lib/auth';

interface AuthGuardContextValue {
  isReady: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  session: Session | null;
  roles: string[];
  needsVerification: boolean;
  isSuspended: boolean;
  refreshAuth: () => Promise<void>;
}

const AuthGuardContext = createContext<AuthGuardContextValue>({
  isReady: false,
  isAuthenticated: false,
  isLoading: true,
  user: null,
  session: null,
  roles: [],
  needsVerification: false,
  isSuspended: false,
  refreshAuth: async () => {},
});

export function useAuthGuard() {
  return useContext(AuthGuardContext);
}

/**
 * Hook to require authentication - redirects to login if not authenticated
 */
export function useRequireAuth(redirectTo = '/auth/login') {
  const { isReady, isAuthenticated, isLoading } = useAuthGuard();
  const router = useRouter();

  useEffect(() => {
    if (isReady && !isLoading && !isAuthenticated) {
      router.replace(redirectTo as any);
    }
  }, [isReady, isLoading, isAuthenticated]);

  return { isReady, isAuthenticated, isLoading };
}

/**
 * Hook to require active account
 */
export function useRequireActiveAccount() {
  const { isReady, isAuthenticated, user, needsVerification, isSuspended } = useAuthGuard();
  const router = useRouter();

  useEffect(() => {
    if (isReady && !isLoading) {
      if (!isAuthenticated) {
        router.replace('/auth/login');
      } else if (isSuspended) {
        router.replace('/auth/suspended');
      }
    }
  }, [isReady, isAuthenticated, isSuspended]);

  const isLoading = !isReady;
  const isActive = user?.status === 'active';

  return {
    isReady,
    isAuthenticated,
    isLoading,
    isActive,
    needsVerification,
    isSuspended,
    canAccess: isAuthenticated && isActive && !isSuspended,
  };
}

/**
 * Hook to require specific role
 */
export function useRequireRole(role: string) {
  const { isAuthenticated, roles } = useAuthGuard();
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

interface AuthGuardProviderProps {
  children: React.ReactNode;
}

export function AuthGuardProvider({ children }: AuthGuardProviderProps) {
  const [state, setState] = useState({
    isReady: false,
    isAuthenticated: false,
    isLoading: true,
    user: null as User | null,
    session: null as Session | null,
    roles: [] as string[],
  });

  const authClient = getAuthClient();

  const refreshAuth = useCallback(async () => {
    if (!authClient.isAuthenticated()) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        isReady: true,
        isAuthenticated: false,
      }));
      await SplashScreen.hideAsync();
      return;
    }

    try {
      const { user, roles, session } = await authClient.getCurrentUser();
      setState({
        isReady: true,
        isAuthenticated: true,
        isLoading: false,
        user,
        session,
        roles,
      });
    } catch (error) {
      console.error('Failed to restore session:', error);
      await authClient.clearTokens();
      setState({
        isReady: true,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        session: null,
        roles: [],
      });
    } finally {
      await SplashScreen.hideAsync();
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, []);

  const needsVerification = state.user?.status === 'pending_verification';
  const isSuspended = state.user?.status === 'suspended';

  return (
    <AuthGuardContext.Provider
      value={{
        ...state,
        needsVerification,
        isSuspended,
        refreshAuth,
      }}
    >
      {children}
    </AuthGuardContext.Provider>
  );
}
