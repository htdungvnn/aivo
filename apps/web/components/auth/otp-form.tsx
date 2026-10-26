"use client";

import {
  OTP_RESEND_COOLDOWN_SECONDS,
  emailSchema,
  otpSchema,
  readRedirectParam,
  resolvePostSignInDestination,
  type AuthProvider,
} from "@repo/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  AuthDivider,
  AuthError,
  AuthSubmitButton,
  SocialAuthButtons,
} from "@/components/auth/auth-controls";
import { OtpField, TextField } from "@/components/auth/auth-fields";
import { useAuthPolicy } from "@/components/auth/auth-policy";
import {
  requestOtpCode,
  signInWithProvider,
  useAuthSession,
  verifyOtpCode,
} from "@/lib/auth-actions";

type FieldErrors = {
  email?: string;
  otp?: string;
};

export type OtpFormMode = "sign-in" | "sign-up";

/**
 * The email one-time-password form.
 *
 * AIVO has no passwords: the user enters their email address, receives a
 * one-time password, and exchanges it for a session. The same flow creates
 * the account when the address is new, so sign-in and sign-up differ only in
 * their wording and share this component.
 *
 * Only one primary action per state: the submit button, with the social
 * buttons above it.
 */
export function OtpForm({ mode }: { mode: OtpFormMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { policy } = useAuthPolicy();
  const { onboardingCompleted } = useAuthSession();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProvider, setLoadingProvider] =
    useState<Exclude<AuthProvider, "email"> | null>(null);
  const [cooldown, setCooldown] = useState(0);

  /**
   * The resend cooldown keeps the UI in step with the server-side rate
   * limit, so the user is never left hitting an error.
   */
  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timeout = setTimeout(() => setCooldown((current) => current - 1), 1000);

    return () => clearTimeout(timeout);
  }, [cooldown]);

  const resendLabel = useMemo(() => {
    if (cooldown > 0) {
      return `Resend in ${cooldown}s`;
    }
    return "Resend code";
  }, [cooldown]);

  async function handleEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setFieldErrors({ email: parsed.error.issues[0]?.message });
      setFormError(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    const error = await requestOtpCode(parsed.data);

    setIsSubmitting(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    setEmail(parsed.data);
    setStep("code");
    setCooldown(OTP_RESEND_COOLDOWN_SECONDS);
    setNotice(`We sent a ${policy.otpLength}-digit code to ${parsed.data}.`);
  }

  async function handleCodeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const parsed = otpSchema.safeParse(otp);
    if (!parsed.success) {
      setFieldErrors({ otp: parsed.error.issues[0]?.message });
      setFormError(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    const error = await verifyOtpCode(email, parsed.data);

    if (error) {
      setFormError(error.message);
      setIsSubmitting(false);
      return;
    }

    // The destination is resolved server-side too; this only decides where
    // the browser navigates next.
    const requested = readRedirectParam(searchParams.toString());
    router.push(resolvePostSignInDestination(requested, onboardingCompleted));
  }

  async function handleResend() {
    if (cooldown > 0 || isSubmitting) {
      return;
    }

    setFormError(null);
    setNotice(null);
    setIsSubmitting(true);

    const error = await requestOtpCode(email);

    setIsSubmitting(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    setCooldown(OTP_RESEND_COOLDOWN_SECONDS);
    setNotice(`We sent a new code to ${email}.`);
  }

  async function handleSocial(provider: Exclude<AuthProvider, "email">) {
    if (isSubmitting || loadingProvider) {
      return;
    }

    setFormError(null);
    setLoadingProvider(provider);

    const error = await signInWithProvider(provider);

    if (error) {
      setFormError(error.message);
      setLoadingProvider(null);
    }
  }

  return (
    <div className="space-y-6">
      <SocialAuthButtons
        providers={policy.providers}
        onSelect={handleSocial}
        disabled={isSubmitting}
        loadingProvider={loadingProvider}
      />

      {policy.providers.length > 0 ? <AuthDivider /> : null}

      <AuthError message={formError} />

      {step === "email" ? (
        <form onSubmit={handleEmailSubmit} noValidate className="space-y-6">
          <div className="space-y-4">
            <TextField
              label="Email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={setEmail}
              error={fieldErrors.email}
              disabled={isSubmitting}
              required
            />
          </div>

          <AuthSubmitButton loading={isSubmitting} loadingLabel="Sending code...">
            {mode === "sign-up" ? "Create Account" : "Continue with Email"}
          </AuthSubmitButton>
        </form>
      ) : (
        <form onSubmit={handleCodeSubmit} noValidate className="space-y-6">
          {notice ? (
            <p
              role="status"
              aria-live="polite"
              className="rounded-xl border border-hairline bg-card px-4 py-3 text-sm text-text-secondary"
            >
              {notice}
            </p>
          ) : null}

          <div className="space-y-4">
            <OtpField
              label="Verification code"
              name="otp"
              value={otp}
              onChange={setOtp}
              placeholder="000000"
              length={policy.otpLength}
              error={fieldErrors.otp}
              disabled={isSubmitting}
              required
            />

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setFieldErrors({});
                  setFormError(null);
                  setNotice(null);
                }}
                className="text-sm text-text-secondary underline-offset-4 transition-colors hover:text-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Change email
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || isSubmitting}
                className="text-sm text-text-secondary underline-offset-4 transition-colors hover:text-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resendLabel}
              </button>
            </div>
          </div>

          <AuthSubmitButton loading={isSubmitting} loadingLabel="Verifying...">
            {mode === "sign-up" ? "Create Account" : "Verify and Sign In"}
          </AuthSubmitButton>
        </form>
      )}
    </div>
  );
}
