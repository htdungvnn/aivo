import {
  toSafeAuthError,
  toSafeSignInError,
  trackAuthEvent,
  type AuthError,
  type AuthProvider,
} from '@repo/auth';

import { authClient } from '@/lib/auth-client';

/**
 * The base URL of the API.
 */
export function apiBaseUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
}

/**
 * Signs in with an email and password.
 *
 * The returned error is safe to display: it never reveals whether an
 * account exists.
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthError | null> {
  trackAuthEvent('auth_sign_in_started', { method: 'credential' });

  try {
    const { error } = await authClient.signIn.email({ email, password });

    if (error) {
      trackAuthEvent('auth_sign_in_failed', { method: 'credential' });
      return toSafeSignInError(error);
    }

    trackAuthEvent('auth_sign_in_succeeded', { method: 'credential' });
    return null;
  } catch (caught) {
    trackAuthEvent('auth_sign_in_failed', { method: 'credential' });
    return toSafeSignInError(caught);
  }
}

/**
 * Signs up with an email and password.
 */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<AuthError | null> {
  trackAuthEvent('auth_sign_up_started', { method: 'credential' });

  try {
    const { error } = await authClient.signUp.email({
      email,
      password,
      name: email.split('@')[0] ?? email,
    });

    if (error) {
      trackAuthEvent('auth_sign_up_failed', { method: 'credential' });
      return toSafeAuthError(error);
    }

    trackAuthEvent('auth_sign_up_succeeded', { method: 'credential' });
    return null;
  } catch (caught) {
    trackAuthEvent('auth_sign_up_failed', { method: 'credential' });
    return toSafeAuthError(caught);
  }
}

/**
 * Starts a social sign-in flow.
 *
 * The Expo client plugin opens the system browser and stores the session
 * cookie when the provider redirects back.
 */
export async function signInWithProvider(
  provider: Exclude<AuthProvider, 'credential'>
): Promise<AuthError | null> {
  trackAuthEvent('auth_sign_in_started', { method: provider });

  try {
    const { error } = await authClient.signIn.social({
      provider,
      callbackURL: '/auth/callback',
      errorCallbackURL: '/auth/callback?error=social',
    });

    if (error) {
      trackAuthEvent('auth_sign_in_failed', { method: provider });
      return toSafeAuthError(error);
    }

    return null;
  } catch (caught) {
    trackAuthEvent('auth_sign_in_failed', { method: provider });
    return toSafeAuthError(caught);
  }
}

/**
 * Requests a password reset link.
 *
 * The response never reveals whether an account exists.
 */
export async function requestPasswordReset(email: string): Promise<AuthError | null> {
  trackAuthEvent('auth_password_reset_requested');

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
  token: string
): Promise<AuthError | null> {
  try {
    const { error } = await authClient.resetPassword({ newPassword, token });

    if (error) {
      return toSafeAuthError(error);
    }

    trackAuthEvent('auth_password_reset_succeeded');
    return null;
  } catch (caught) {
    return toSafeAuthError(caught);
  }
}

/**
 * Sends another verification email.
 */
export async function resendVerificationEmail(email: string): Promise<AuthError | null> {
  trackAuthEvent('auth_email_verification_requested');

  try {
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: '/auth/verify-email',
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
    trackAuthEvent('auth_logout');
  } catch {
    // Signing out is best-effort: the local session is cleared either way.
  }
}
