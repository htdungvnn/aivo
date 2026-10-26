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
import { apiBaseUrl } from '@/lib/auth-actions';
import { parseAuthUser, type AuthUser } from '@repo/auth';

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
      const session = await fetchSession();

      setUser(session);
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
    void fetchSession()
      .then((session) => {
        if (active) {
          setUser(session);
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
 * Reads the current session from the API.
 *
 * The API is the source of truth for the session *and* for the sign-in
 * method, so the app asks it rather than the provider client. The session
 * cookie lives in the device's secure store, so it is attached explicitly.
 */
async function fetchSession(): Promise<AuthUser | null> {
  const cookie = await authClient.getCookie();

  const response = await fetch(`${apiBaseUrl()}/auth/session`, {
    headers: {
      Accept: 'application/json',
      ...(cookie ? { cookie } : {}),
    },
  });

  if (!response.ok) {
    return null;
  }

  const body = (await response.json()) as { user?: unknown };

  return parseAuthUser(body.user);
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
