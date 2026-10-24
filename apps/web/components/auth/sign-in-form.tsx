"use client";

import {
  emailSchema,
  readRedirectParam,
  resolvePostSignInDestination,
  type AuthProvider,
} from "@repo/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import {
  AuthDivider,
  AuthError,
  AuthSubmitButton,
  SocialAuthButtons,
} from "@/components/auth/auth-controls";
import { PasswordField, TextField } from "@/components/auth/auth-fields";
import { useAuthPolicy } from "@/components/auth/auth-policy";
import { signInWithEmail, signInWithProvider, useAuthSession } from "@/lib/auth-actions";

type FieldErrors = {
  email?: string;
  password?: string;
};

/**
 * The sign-in form.
 *
 * Only one primary action per state: the submit button, with the social
 * buttons above it.
 */
export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { policy } = useAuthPolicy();
  const { onboardingCompleted } = useAuthSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProvider, setLoadingProvider] =
    useState<Exclude<AuthProvider, "credential"> | null>(null);

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

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    const error = await signInWithEmail(parsedEmail.data, password);

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
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={setPassword}
            error={fieldErrors.password}
            disabled={isSubmitting}
            required
          />
          <div className="flex justify-end">
            <a
              href="/auth/forgot-password"
              className="text-sm text-text-secondary underline-offset-4 transition-colors hover:text-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Forgot password?
            </a>
          </div>
        </div>
      </div>

      <AuthSubmitButton loading={isSubmitting} loadingLabel="Signing in...">
        Sign In
      </AuthSubmitButton>
    </form>
  );
}
