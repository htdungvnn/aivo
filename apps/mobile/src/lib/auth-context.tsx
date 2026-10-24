import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { authClient } from '@/lib/auth-client';
import { toAuthUser, type AuthUser } from '@repo/auth';

/**
 * The authentication context.
 *
 * The session is restored once at start-up and shared by the route guards
 * and the screens, so the app never flashes the sign-in form before the
 * session state is known.
 */
export type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await authClient.getSession();

      setUser(data?.user ? toAuthUser(data.user) : null);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authClient.signOut();
    } finally {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let active = true;

    // The session is restored asynchronously; the guard renders nothing
    // until the request settles, so no auth screen ever flashes.
    void authClient
      .getSession()
      .then(({ data }) => {
        if (active) {
          setUser(data?.user ? toAuthUser(data.user) : null);
        }
      })
      .catch(() => {
        if (active) {
          setUser(null);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      refresh,
      signOut,
    }),
    [user, isLoading, refresh, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Reads the authentication context.
 *
 * Throws when used outside the provider, which is a programming error
 * rather than a runtime condition to handle.
 */
export function useAuthContext(): AuthContextValue {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuthContext must be used inside the AuthProvider');
  }

  return value;
}
