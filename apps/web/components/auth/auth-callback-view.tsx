"use client";

import { resolvePostAuthDestination } from "@repo/auth";
import { useEffect, useRef, useState } from "react";

import { AuthError, Spinner } from "@/components/auth/auth-controls";
import { apiBaseUrl } from "@/lib/api-url";

type CallbackState = "loading" | "success" | "error";

/**
 * The authentication callback screen.
 *
 * Social providers return the user here after the redirect. The screen
 * waits for the session to be established, then routes on to the
 * authenticated destination. Provider errors are never shown verbatim —
 * only a short, actionable message.
 *
 * The navigation happens here rather than through a callback prop: this is
 * a client component, and a server component cannot hand an event handler
 * across the server/client boundary.
 */
export function AuthCallbackView({ hasError }: { hasError: boolean }) {
  const [state, setState] = useState<CallbackState>(
    hasError ? "error" : "loading",
  );
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (hasError || hasNavigated.current) {
      return;
    }

    let cancelled = false;

    async function waitForSession() {
      try {
        const response = await fetch(`${apiBaseUrl()}/auth/session`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(`Session request failed with ${response.status}`);
        }

        const body = (await response.json()) as {
          user?: unknown;
          onboarding?: { onboardingCompleted?: boolean };
        };

        if (cancelled) {
          return;
        }

        if (!body.user) {
          setState("error");
          return;
        }

        hasNavigated.current = true;
        setState("success");

        // A full navigation is used so the destination is rendered from
        // scratch with the new session cookie in place.
        window.location.replace(
          resolvePostAuthDestination(
            null,
            body.onboarding?.onboardingCompleted ?? false,
          ),
        );
      } catch {
        if (!cancelled) {
          setState("error");
        }
      }
    }

    // Give the provider redirect a moment to settle before polling.
    const timeout = setTimeout(() => void waitForSession(), 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [hasError]);

  if (state === "loading") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center gap-4 py-10 text-center"
      >
        <Spinner />
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Authenticating...
          </h2>
          <p className="mt-2 text-[15px] text-text-secondary">
            One moment while we finish signing you in.
          </p>
        </div>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center gap-4 py-10 text-center"
      >
        <Spinner />
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            You're signed in
          </h2>
          <p className="mt-2 text-[15px] text-text-secondary">
            Taking you to your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AuthError message="We couldn't complete authentication." />

      <div className="flex flex-col gap-3 sm:flex-row">
        <a
          href="/auth/sign-in"
          className="flex h-12 flex-1 items-center justify-center rounded-xl bg-primary font-semibold tracking-tight text-primary-ink transition-colors hover:bg-primary-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Try Again
        </a>
        <a
          href="/auth/sign-in"
          className="flex h-12 flex-1 items-center justify-center rounded-xl border border-hairline-strong bg-white/5 text-[15px] font-medium text-text transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Back to Sign In
        </a>
      </div>
    </div>
  );
}
