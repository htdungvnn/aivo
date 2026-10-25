import type { Metadata } from "next";

import { AuthBrandPanel, AuthHeader } from "@/components/auth/auth-header";
import { AuthLayout } from "@/components/auth/auth-layout";
import { VerifyEmailView } from "@/components/auth/verify-email-view";

export const metadata: Metadata = {
  title: "Verify Email — AIVO",
  description: "Confirm your email address to activate your AIVO account.",
  robots: { index: false, follow: false },
};

/**
 * The email verification screen.
 *
 * The token from the verification link is exchanged for a session, and the
 * visitor is routed on to the authenticated destination.
 */
export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  return (
    <AuthLayout aside={<AuthBrandPanel />}>
      <AuthHeader
        title="Verify your email"
        subtitle="Confirm your address to activate your AIVO account."
      />
      {/*
        The token lives in the query string, so the page reads it on the
        server and hands it to the client view. Reading it in a client
        component would force a client-side render that needs a Suspense
        boundary.
      */}
      <VerifyEmailScreen searchParams={searchParams} />
    </AuthLayout>
  );
}

async function VerifyEmailScreen({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const params = await searchParams;

  return (
    <VerifyEmailView
      email={params.email ?? null}
      token={params.token ?? null}
    />
  );
}
