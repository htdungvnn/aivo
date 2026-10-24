"use client";

import { buildPasswordRequirements, passwordsMatch } from "@repo/auth";
import { useMemo, useState } from "react";

import {
  AuthError,
  AuthSubmitButton,
  PasswordRequirements,
} from "@/components/auth/auth-controls";
import { PasswordField } from "@/components/auth/auth-fields";
import { useAuthPolicy } from "@/components/auth/auth-policy";
import { resetPassword } from "@/lib/auth-actions";

type FieldErrors = {
  newPassword?: string;
  confirmPassword?: string;
};

/**
 * The reset-password form.
 *
 * The token comes from the reset link. An invalid or expired token is
 * reported as a generic message, and the user is offered a way to request a
 * new link.
 */
export function ResetPasswordForm({ token }: { token: string | null }) {
  const { policy } = useAuthPolicy();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const requirements = useMemo(
    () => buildPasswordRequirements(newPassword, policy.minPasswordLength),
    [newPassword, policy.minPasswordLength],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || !token) {
      return;
    }

    if (newPassword.length === 0) {
      setFieldErrors({ newPassword: "Password is required" });
      setFormError(null);
      return;
    }

    if (!passwordsMatch(newPassword, confirmPassword)) {
      setFieldErrors({ confirmPassword: "Passwords do not match" });
      setFormError(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    const error = await resetPassword(newPassword, token);

    if (error) {
      setFormError(error.message);
      setIsSubmitting(false);
      return;
    }

    setIsDone(true);
    setIsSubmitting(false);
  }

  if (!token) {
    return <InvalidResetLink />;
  }

  if (isDone) {
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
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-semibold tracking-tight">
            Password updated
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
            Your password has been changed successfully.
          </p>
        </div>

        <a
          href="/auth/sign-in"
          className="flex h-12 w-full items-center justify-center rounded-xl bg-primary font-semibold tracking-tight text-primary-ink transition-colors hover:bg-primary-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Continue to Sign In
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <AuthError message={formError} />

      <div className="space-y-2">
        <PasswordField
          label="New Password"
          name="newPassword"
          autoComplete="new-password"
          placeholder="Create a new password"
          value={newPassword}
          onChange={setNewPassword}
          error={fieldErrors.newPassword}
          disabled={isSubmitting}
          required
        />
        <PasswordRequirements requirements={requirements.requirements} />
      </div>

      <PasswordField
        label="Confirm New Password"
        name="confirmPassword"
        autoComplete="new-password"
        placeholder="Repeat your new password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        error={fieldErrors.confirmPassword}
        disabled={isSubmitting}
        required
      />

      <AuthSubmitButton
        loading={isSubmitting}
        loadingLabel="Resetting password..."
      >
        Reset Password
      </AuthSubmitButton>
    </form>
  );
}

/**
 * The state shown when the reset link is missing, invalid or expired.
 */
export function InvalidResetLink() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-hairline bg-card p-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500/15 text-red-400">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4.5M12 16h.01" />
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-tight">
          This reset link is no longer valid.
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
          Reset links expire after a short time. Request a new one to continue.
        </p>
      </div>

      <a
        href="/auth/forgot-password"
        className="flex h-12 w-full items-center justify-center rounded-xl bg-primary font-semibold tracking-tight text-primary-ink transition-colors hover:bg-primary-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Request New Link
      </a>
    </div>
  );
}
