"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { AuthCallbackView } from "@/components/auth/auth-callback-view";
import { AuthBrandPanel, AuthHeader } from "@/components/auth/auth-header";
import { AuthLayout } from "@/components/auth/auth-layout";

/**
 * The authentication callback screen.
 *
 * Social providers return the visitor here after the redirect. The screen
 * waits for the session, then routes on to the authenticated destination.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const hasError = searchParams.has("error");

  return (
    <AuthLayout aside={<AuthBrandPanel />}>
      <AuthHeader
        title={hasError ? "Sign-in failed" : "Signing you in"}
        subtitle={
          hasError
            ? "We couldn't complete authentication."
            : "One moment while we finish signing you in."
        }
      />
      <AuthCallbackView
        hasError={hasError}
        onSuccess={() => router.replace("/dashboard")}
      />
    </AuthLayout>
  );
}
