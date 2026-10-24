"use client";

import {
  buildPasswordRequirements,
  emailSchema,
  passwordsMatch,
  type AuthProvider,
} from "@repo/auth";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  AuthDivider,
  AuthError,
  AuthSubmitButton,
  PasswordRequirements,
  SocialAuthButtons,
} from "@/components/auth/auth-controls";
import { PasswordField, TextField } from "@/components/auth/auth-fields";
import { useAuthPolicy } from "@/components/auth/auth-policy";
import { signInWithProvider, signUpWithEmail } from "@/lib/auth-actions";

type FieldErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
};

/**
 * The sign-up form.
 *
 * The password requirements come from the backend policy, so the checklist
 * shown here can never disagree with what the server enforces.
 */
export function SignUpForm() {
  const router = useRouter();
  const { policy } = useAuthPolicy();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProvider, setLoadingProvider] =
    useState<Exclude<AuthProvider, "credential"> | null>(null);

  const requirements = useMemo(
    () => buildPasswordRequirements(password, policy.minPasswordLength),
    [password, policy.minPasswordLength],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const parsedEmail = emailSchema.safeParse(email);
    if (!parsedEmail.success) {
      setFieldErrors({ email: parsedEmail.error.issues[0]?.message });
      setFormError(null);
      return;
    }

    if (password.length === 0) {
      setFieldErrors({ password: "Password is required" });
      setFormError(null);
      return;
    }

    if (!passwordsMatch(password, confirmPassword)) {
      setFieldErrors({ confirmPassword: "Passwords do not match" });
      setFormError(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    const error = await signUpWithEmail(parsedEmail.data, password);

    if (error) {
      setFormError(error.message);
      setIsSubmitting(false);
      return;
    }

    // When email verification is required, the user confirms their address
    // before a session is created. Otherwise the account is usable right
    // away.
    if (policy.requireEmailVerification) {
      router.push(`/auth/verify-email?email=${encodeURIComponent(parsedEmail.data)}`);
      return;
    }

    router.push("/dashboard");
  }

  async function handleSocial(provider: Exclude<AuthProvider, "credential">) {
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
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <SocialAuthButtons
        providers={policy.providers}
        onSelect={handleSocial}
        disabled={isSubmitting}
        loadingProvider={loadingProvider}
      />

      {policy.providers.length > 0 ? <AuthDivider /> : null}

      <AuthError message={formError} />

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

        <div className="space-y-2">
          <PasswordField
            label="Password"
            name="password"
            autoComplete="new-password"
            placeholder="Create a password"
            value={password}
            onChange={setPassword}
            error={fieldErrors.password}
            disabled={isSubmitting}
            required
          />
          <PasswordRequirements requirements={requirements.requirements} />
        </div>

        <PasswordField
          label="Confirm Password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Repeat your password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          error={fieldErrors.confirmPassword}
          disabled={isSubmitting}
          required
        />
      </div>

      <AuthSubmitButton loading={isSubmitting} loadingLabel="Creating account...">
        Create Account
      </AuthSubmitButton>
    </form>
  );
}
