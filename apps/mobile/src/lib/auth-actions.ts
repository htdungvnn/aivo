import {
  toSafeAuthError,
  toSafeOtpError,
  trackAuthEvent,
  type AuthError,
  type AuthProvider,
} from '@repo/auth';

import { authClient } from '@/lib/auth-client';

/**
 * The base URL of the API.
 *
 * The deployed API is the default so a release build authenticates against
 * production. Set `EXPO_PUBLIC_API_URL` to point at a local Worker instead.
 */
export function apiBaseUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL ?? 'https://api.htdung-aivo.workers.dev';
}

/**
 * Sends a one-time password to an email address.
 *
 * The response never reveals whether an account exists: the code is sent
 * either way, and the account is created the first time a valid code is
 * submitted.
 */
export async function requestOtpCode(email: string): Promise<AuthError | null> {
  trackAuthEvent('auth_otp_requested', { method: 'email' });

  try {
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: 'sign-in',
    });

    if (error) {
      trackAuthEvent('auth_otp_failed', { method: 'email' });
      return toSafeAuthError(error);
    }

    return null;
  } catch (caught) {
    trackAuthEvent('auth_otp_failed', { method: 'email' });
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
  otp: string
): Promise<AuthError | null> {
  trackAuthEvent('auth_sign_in_started', { method: 'email' });

  try {
    const { error } = await authClient.signIn.emailOtp({ email, otp });

    if (error) {
      trackAuthEvent('auth_otp_failed', { method: 'email' });
      trackAuthEvent('auth_sign_in_failed', { method: 'email' });
      return toSafeOtpError(error);
    }

    trackAuthEvent('auth_otp_verified', { method: 'email' });
    trackAuthEvent('auth_sign_in_succeeded', { method: 'email' });
    return null;
  } catch (caught) {
    trackAuthEvent('auth_otp_failed', { method: 'email' });
    trackAuthEvent('auth_sign_in_failed', { method: 'email' });
    return toSafeOtpError(caught);
  }
}

/**
 * Starts a social sign-in flow.
 *
 * The Expo client plugin opens the system browser and stores the session
 * cookie when the provider redirects back.
 */
export async function signInWithProvider(
  provider: Exclude<AuthProvider, 'email'>
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
