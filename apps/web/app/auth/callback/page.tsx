import type { Metadata } from "next";

import { AuthCallbackView } from "@/components/auth/auth-callback-view";
import { AuthBrandPanel, AuthHeader } from "@/components/auth/auth-header";
import { AuthLayout } from "@/components/auth/auth-layout";

export const metadata: Metadata = {
  title: "Signing In — AIVO",
  description: "Completing your AIVO sign in.",
  robots: { index: false, follow: false },
};

/**
 * The authentication callback screen.
 *
 * Social providers return the visitor here after the redirect. The screen
 * waits for the session, then routes on to the authenticated destination.
 */
export default function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <AuthLayout aside={<AuthBrandPanel />}>
      {/*
        The provider reports failures through the query string, so the page
        reads it on the server and hands it to the client view. Reading it in
        a client component would force a client-side render that needs a
        Suspense boundary.
      */}
      <AuthCallbackScreen searchParams={searchParams} />
    </AuthLayout>
  );
}

async function AuthCallbackScreen({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const hasError = Boolean(params.error);

  return (
    <>
      <AuthHeader
        title={hasError ? "Sign-in failed" : "Signing you in"}
        subtitle={
          hasError
            ? "We couldn't complete authentication."
            : "One moment while we finish signing you in."
        }
      />
      <AuthCallbackView hasError={hasError} />
    </>
  );
}
