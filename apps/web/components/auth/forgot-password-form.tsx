"use client";

import { emailSchema } from "@repo/auth";
import { useState } from "react";

import { AuthError, AuthSubmitButton } from "@/components/auth/auth-controls";
import { TextField } from "@/components/auth/auth-fields";
import { requestPasswordReset } from "@/lib/auth-actions";

/**
 * The forgot-password form.
 *
 * The success state never reveals whether an account exists.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message);
      setFormError(null);
      return;
    }

    setFieldError(undefined);
    setFormError(null);
    setIsSubmitting(true);

    const error = await requestPasswordReset(parsed.data);

    if (error) {
      setFormError(error.message);
      setIsSubmitting(false);
      return;
    }

    setIsSent(true);
    setIsSubmitting(false);
  }

  if (isSent) {
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
            Check your email
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
            If an account is associated with this email, password reset
            instructions have been sent.
          </p>
        </div>

        <a
          href="/auth/sign-in"
          className="flex h-12 w-full items-center justify-center rounded-xl border border-hairline-strong bg-white/5 text-[15px] font-medium text-text transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Back to Sign In
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <AuthError message={formError} />

      <TextField
        label="Email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={setEmail}
        error={fieldError}
        disabled={isSubmitting}
        required
      />

      <AuthSubmitButton loading={isSubmitting} loadingLabel="Sending email...">
        Send Reset Link
      </AuthSubmitButton>

      <div className="text-center">
        <a
          href="/auth/sign-in"
          className="text-sm text-text-secondary underline-offset-4 transition-colors hover:text-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Back to Sign In
        </a>
      </div>
    </form>
  );
}
