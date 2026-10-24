"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { AuthBrandPanel, AuthHeader } from "@/components/auth/auth-header";
import { AuthLayout } from "@/components/auth/auth-layout";
import { VerifyEmailView } from "@/components/auth/verify-email-view";

/**
 * The email verification screen.
 *
 * The token from the verification link is exchanged for a session, and the
 * visitor is routed on to the authenticated destination.
 */
export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  return (
    <AuthLayout aside={<AuthBrandPanel />}>
      <AuthHeader
        title="Verify your email"
        subtitle="Confirm your address to activate your AIVO account."
      />
      <VerifyEmailView
        email={email}
        token={token}
        onVerified={() => router.replace("/dashboard")}
      />
    </AuthLayout>
  );
}
