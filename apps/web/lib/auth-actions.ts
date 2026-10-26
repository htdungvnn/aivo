"use client";

import {
  parseAuthUser,
  toSafeAuthError,
  toSafeOtpError,
  trackAuthEvent,
  type AuthError,
  type AuthProvider,
} from "@repo/auth";
import { useCallback, useEffect, useState } from "react";

import { apiBaseUrl } from "@/lib/api-url";
import { authClient } from "@/lib/auth-client";

/**
 * The authentication state exposed to the application.
 *
 * `isLoading` covers the initial session restoration, so the UI can show a
 * splash screen instead of flashing the sign-in form.
 */
export type AuthState = {
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    displayName: string | null;
    avatarUrl: string | null;
    authProvider: AuthProvider;
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  onboardingCompleted: boolean;
};
const INITIAL_STATE: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  onboardingCompleted: false,
};

/**
 * The base URL of the API.
 */
export { apiBaseUrl };

/**
 * Restores and exposes the authentication session.
 *
 * The session is fetched from the API — the auth provider is the source of
 * truth for authentication state.
 */
export function useAuthSession() {
  const [state, setState] = useState<AuthState>(INITIAL_STATE);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`${apiBaseUrl()}/auth/session`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        setState({ ...INITIAL_STATE, isLoading: false });
        return;
      }

      const body = (await response.json()) as {
        user?: unknown;
        onboarding?: { onboardingCompleted?: boolean };
      };

      const user = parseAuthUser(body.user);

      setState({
        user,
        isAuthenticated: Boolean(user),
        isLoading: false,
        onboardingCompleted: body.onboarding?.onboardingCompleted ?? false,
      });
    } catch {
      setState({ ...INITIAL_STATE, isLoading: false });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, refresh };
}

/**
 * Sends a one-time password to an email address.
 *
 * The response never reveals whether an account exists: the code is sent
 * either way, and the account is created the first time a valid code is
 * submitted.
 */
export async function requestOtpCode(email: string): Promise<AuthError | null> {
  trackAuthEvent("auth_otp_requested", { method: "email" });

  try {
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    });

    if (error) {
      trackAuthEvent("auth_otp_failed", { method: "email" });
      return toSafeAuthError(error);
    }

    return null;
  } catch (caught) {
    trackAuthEvent("auth_otp_failed", { method: "email" });
    return toSafeAuthError(caught);
  }
}

/**
 * Exchanges a one-time password for a session.
 *
 * A valid code for an unknown address registers the account, so this single
 * call covers both sign-up and sign-in.
 */
export async function verifyOtpCode(
  email: string,
  otp: string,
): Promise<AuthError | null> {
  trackAuthEvent("auth_sign_in_started", { method: "email" });

  try {
    const { error } = await authClient.signIn.emailOtp({ email, otp });

    if (error) {
      trackAuthEvent("auth_otp_failed", { method: "email" });
      trackAuthEvent("auth_sign_in_failed", { method: "email" });
      return toSafeOtpError(error);
    }

    trackAuthEvent("auth_otp_verified", { method: "email" });
    trackAuthEvent("auth_sign_in_succeeded", { method: "email" });
    return null;
  } catch (caught) {
    trackAuthEvent("auth_otp_failed", { method: "email" });
    trackAuthEvent("auth_sign_in_failed", { method: "email" });
    return toSafeOtpError(caught);
  }
}

/**
 * Starts a social sign-in flow.
 *
 * The browser navigates to the provider, so this resolves only when the
 * flow cannot be started.
 */
export async function signInWithProvider(
  provider: Exclude<AuthProvider, "email">,
): Promise<AuthError | null> {
  trackAuthEvent("auth_sign_in_started", { method: provider });

  try {
    const { error } = await authClient.signIn.social({
      provider,
      callbackURL: "/auth/callback",
      errorCallbackURL: "/auth/callback?error=social",
    });

    if (error) {
      const safeError = toSafeAuthError(error);
      trackAuthEvent("auth_sign_in_failed", { method: provider });
      return safeError;
    }

    return null;
  } catch (caught) {
    trackAuthEvent("auth_sign_in_failed", { method: provider });
    return toSafeAuthError(caught);
  }
}

/**
 * Signs the user out.
 */
export async function signOut(): Promise<void> {
  try {
    await authClient.signOut();
    trackAuthEvent("auth_logout");
  } catch {
    // Signing out is best-effort: the local session is cleared either way.
  }
}
