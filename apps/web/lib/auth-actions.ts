"use client";

import {
  toSafeAuthError,
  toSafeSignInError,
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

type SessionResponse = {
  user: AuthState["user"];
  onboarding: { onboardingCompleted: boolean };
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

      const body = (await response.json()) as SessionResponse;

      setState({
        user: body.user,
        isAuthenticated: Boolean(body.user),
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
 * Signs in with an email and password.
 *
 * The returned error is safe to display: it never reveals whether an
 * account exists.
 */
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthError | null> {
  trackAuthEvent("auth_sign_in_started", { method: "credential" });

  try {
    const { error } = await authClient.signIn.email({ email, password });

    if (error) {
      const safeError = toSafeSignInError(error);
      trackAuthEvent("auth_sign_in_failed", { method: "credential" });
      return safeError;
    }

    trackAuthEvent("auth_sign_in_succeeded", { method: "credential" });
    return null;
  } catch (caught) {
    trackAuthEvent("auth_sign_in_failed", { method: "credential" });
    return toSafeSignInError(caught);
  }
}

/**
 * Signs up with an email and password.
 */
export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<AuthError | null> {
  trackAuthEvent("auth_sign_up_started", { method: "credential" });

  try {
    const { error } = await authClient.signUp.email({
      email,
      password,
      name: email.split("@")[0] ?? email,
    });

    if (error) {
      const safeError = toSafeAuthError(error);
      trackAuthEvent("auth_sign_up_failed", { method: "credential" });
      return safeError;
    }

    trackAuthEvent("auth_sign_up_succeeded", { method: "credential" });
    return null;
  } catch (caught) {
    trackAuthEvent("auth_sign_up_failed", { method: "credential" });
    return toSafeAuthError(caught);
  }
}

/**
 * Starts a social sign-in flow.
 *
 * The browser navigates to the provider, so this resolves only when the
 * flow cannot be started.
 */
export async function signInWithProvider(
  provider: Exclude<AuthProvider, "credential">,
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
 * Requests a password reset link.
 *
 * The response never reveals whether an account exists.
 */
export async function requestPasswordReset(
  email: string,
): Promise<AuthError | null> {
  trackAuthEvent("auth_password_reset_requested");

  try {
    const { error } = await authClient.requestPasswordReset({ email });

    if (error) {
      return toSafeAuthError(error);
    }

    return null;
  } catch (caught) {
    return toSafeAuthError(caught);
  }
}

/**
 * Sets a new password using the token from the reset link.
 */
export async function resetPassword(
  newPassword: string,
  token: string,
): Promise<AuthError | null> {
  try {
    const { error } = await authClient.resetPassword({ newPassword, token });

    if (error) {
      return toSafeAuthError(error);
    }

    trackAuthEvent("auth_password_reset_succeeded");
    return null;
  } catch (caught) {
    return toSafeAuthError(caught);
  }
}

/**
 * Verifies an email address using the token from the verification link.
 *
 * The link the user clicks lands on the app with the token attached; the
 * token is exchanged for a verified session here.
 */
export async function verifyEmailToken(
  token: string,
): Promise<AuthError | null> {
  try {
    const { error } = await authClient.verifyEmail({
      query: { token, callbackURL: "/auth/verify-email" },
    });

    if (error) {
      return toSafeAuthError(error);
    }

    trackAuthEvent("auth_email_verified");
    return null;
  } catch (caught) {
    return toSafeAuthError(caught);
  }
}

/**
 * Sends another verification email.
 */
export async function resendVerificationEmail(
  email: string,
): Promise<AuthError | null> {
  trackAuthEvent("auth_email_verification_requested");

  try {
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: "/auth/verify-email",
    });

    if (error) {
      return toSafeAuthError(error);
    }

    return null;
  } catch (caught) {
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
