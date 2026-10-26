import {
  OTP_EXPIRY_SECONDS_FALLBACK,
  OTP_LENGTH_FALLBACK,
  type AuthProvider,
} from '@repo/auth';
import { useEffect, useState } from 'react';

import { apiBaseUrl } from '@/lib/auth-actions';

/**
 * The authentication policy served by the API.
 *
 * The one-time password rules and the available providers live on the
 * server — the client renders what the server enforces rather than restating
 * a policy of its own.
 */
export type AuthPolicy = {
  otpLength: number;
  otpExpirySeconds: number;
  providers: readonly Exclude<AuthProvider, 'email'>[];
};

const FALLBACK_POLICY: AuthPolicy = {
  otpLength: OTP_LENGTH_FALLBACK,
  otpExpirySeconds: OTP_EXPIRY_SECONDS_FALLBACK,
  providers: [],
};

type PolicyState = {
  policy: AuthPolicy;
  isLoading: boolean;
};

/**
 * Loads the authentication policy.
 *
 * A failure falls back to the conservative defaults: no social providers,
 * so the UI never offers a provider the server has not configured.
 */
export function useAuthPolicy(): PolicyState {
  const [state, setState] = useState<PolicyState>({
    policy: FALLBACK_POLICY,
    isLoading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`${apiBaseUrl()}/auth/policy`, {
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Policy request failed with ${response.status}`);
        }

        const body = (await response.json()) as {
          otpLength?: number;
          otpExpirySeconds?: number;
          providers?: string[];
        };

        if (cancelled) {
          return;
        }

        setState({
          policy: {
            otpLength: body.otpLength ?? OTP_LENGTH_FALLBACK,
            otpExpirySeconds: body.otpExpirySeconds ?? OTP_EXPIRY_SECONDS_FALLBACK,
            providers: (body.providers ?? []).filter(isSocialProvider),
          },
          isLoading: false,
        });
      } catch {
        if (!cancelled) {
          setState({ policy: FALLBACK_POLICY, isLoading: false });
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

function isSocialProvider(provider: string): provider is Exclude<
  AuthProvider,
  'email'
> {
  return provider === 'google' || provider === 'facebook';
}
