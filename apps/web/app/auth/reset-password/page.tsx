import type { Metadata } from "next";

import { AuthBrandPanel, AuthHeader } from "@/components/auth/auth-header";
import { AuthLayout } from "@/components/auth/auth-layout";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password — AIVO",
  description: "Choose a new password for your AIVO account.",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return (
    <AuthLayout aside={<AuthBrandPanel />}>
      <AuthHeader
        title="Reset your password"
        subtitle="Choose a new password to secure your account."
      />
      <ResetPasswordFormWithToken searchParams={searchParams} />
    </AuthLayout>
  );
}

/**
 * The token lives in the query string, so the page reads it on the server
 * and hands it to the client form.
 */
async function ResetPasswordFormWithToken({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;

  return (
    <ResetPasswordForm token={params.token ?? null} />
  );
}
