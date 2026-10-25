"use client";

import { resolvePostAuthDestination } from "@repo/auth";
import { useCallback, useEffect, useRef, useState } from "react";

import { AuthError, AuthSubmitButton, Spinner } from "@/components/auth/auth-controls";
import {
  resendVerificationEmail,
  verifyEmailToken,
} from "@/lib/auth-actions";

type VerifyState = "verifying" | "waiting" | "verified" | "error";

/**
 * The email verification screen.
 *
 * The user arrives here in two ways:
 *
 * - after signing up, where the address is not verified yet; or
 * - by opening the verification link that was emailed to them, in which
 *   case the URL carries the verification token.
 *
 * When the token is exchanged successfully the screen routes on to the
 * authenticated destination.
 *
 * The navigation happens here rather than through a callback prop: this is
 * a client component, and a server component cannot hand an event handler
 * across the server/client boundary.
 */
export function VerifyEmailView({
  email,
  token,
}: {
  email: string | null;
  token: string | null;
}) {
  const [state, setState] = useState<VerifyState>(
    token ? "verifying" : "waiting",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const hasVerified = useRef(false);

  const complete = useCallback(() => {
    if (hasVerified.current) {
      return;
    }
    hasVerified.current = true;
    setState("verified");

    // A full navigation is used so the destination is rendered from
    // scratch with the new session cookie in place.
    window.location.replace(resolvePostAuthDestination(null, false));
  }, []);

  // Exchange the token from the verification link for a verified session.
  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    async function verify(verificationToken: string) {
      const error = await verifyEmailToken(verificationToken);

      if (cancelled) {
        return;
      }

      if (error) {
        setState("error");
        setMessage(error.message);
        return;
      }

      complete();
    }

    void verify(token);

    return () => {
      cancelled = true;
    };
  }, [token, complete]);

  // Resending is rate limited by the server; the client keeps a matching
  // cooldown so the button cannot be hammered.
  useEffect(() => {
    if (!canResend) {
      return;
    }
    const timeout = setTimeout(() => setCanResend(false), 30_000);
    return () => clearTimeout(timeout);
  }, [canResend]);

  async function handleResend() {
    if (isResending || !email || !canResend) {
      return;
    }

    setIsResending(true);
    setMessage(null);

    const error = await resendVerificationEmail(email);

    if (error) {
      setMessage(error.message);
      setIsResending(false);
      return;
    }

    setMessage("We've sent another verification link to your email.");
    setCanResend(false);
    setIsResending(false);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-hairline bg-card p-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3.5 7l8.5 6 8.5-6" />
          </svg>
        </div>

        <h2 className="mt-4 text-xl font-semibold tracking-tight">
          {state === "verified"
            ? "Email verified"
            : state === "error"
              ? "Verification failed"
              : "Verify your email"}
        </h2>

        <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
          {state === "verified"
            ? "Your email is verified. Taking you to your account."
            : "We've sent a verification link to:"}
        </p>

        {state !== "verified" && email ? (
          <p className="mt-1 font-medium break-all text-text">{email}</p>
        ) : null}

        {state === "verifying" || state === "waiting" ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-text-muted">
            <Spinner />
            <span>
              {state === "verifying" ? "Verifying your email" : "Waiting for verification"}
            </span>
          </div>
        ) : null}
      </div>

      <AuthError message={message} />

      {state === "verified" ? (
        <AuthSubmitButton type="button" loading loadingLabel="Redirecting...">
          Continue
        </AuthSubmitButton>
      ) : (
        <div className="space-y-3">
          <AuthSubmitButton
            type="button"
            loading={isResending}
            loadingLabel="Sending..."
            onClick={handleResend}
            disabled={!canResend || !email}
          >
            {canResend ? "Resend Email" : "Please wait before resending"}
          </AuthSubmitButton>

          <a
            href="/auth/sign-up"
            className="flex h-12 w-full items-center justify-center rounded-xl border border-hairline-strong bg-white/5 text-[15px] font-medium text-text transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Change Email
          </a>
        </div>
      )}

      <p className="text-center text-xs text-text-muted">
        Verification links expire after a short time. Request a new one if needed.
      </p>
    </div>
  );
}
