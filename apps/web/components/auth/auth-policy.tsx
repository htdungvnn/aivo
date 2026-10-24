"use client";

import {
  MIN_PASSWORD_LENGTH_FALLBACK,
  type AuthProvider,
} from "@repo/auth";
import { useEffect, useState } from "react";

import { apiBaseUrl } from "@/lib/auth-actions";

/**
 * The authentication policy served by the API.
 *
 * The password rules live on the server — the client renders what the
 * server enforces rather than restating a policy of its own.
 */
export type AuthPolicy = {
  minPasswordLength: number;
  requireEmailVerification: boolean;
  providers: readonly Exclude<AuthProvider, "credential">[];
};

const FALLBACK_POLICY: AuthPolicy = {
  minPasswordLength: MIN_PASSWORD_LENGTH_FALLBACK,
  requireEmailVerification: true,
  providers: [],
};

type PolicyState = {
  policy: AuthPolicy;
  isLoading: boolean;
};

/**
 * Loads the authentication policy.
 *
 * A failure falls back to the conservative defaults: the shortest password
 * the provider may accept and no social providers, so the UI never offers a
 * provider the server has not configured.
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
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(`Policy request failed with ${response.status}`);
        }

        const body = (await response.json()) as {
          minPasswordLength?: number;
          requireEmailVerification?: boolean;
          providers?: string[];
        };

        if (cancelled) {
          return;
        }

        setState({
          policy: {
            minPasswordLength:
              body.minPasswordLength ?? MIN_PASSWORD_LENGTH_FALLBACK,
            requireEmailVerification: body.requireEmailVerification ?? true,
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
  "credential"
> {
  return provider === "google" || provider === "apple";
}
