import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthBrandPanel, AuthHeader } from "@/components/auth/auth-header";
import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthLoadingState } from "@/components/auth/auth-loading";
import { OtpForm } from "@/components/auth/otp-form";

export const metadata: Metadata = {
  title: "Sign In — AIVO",
  description: "Sign in to continue your personalized fitness journey with AIVO.",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <AuthLayout aside={<AuthBrandPanel />}>
      <AuthHeader
        title="Welcome back"
        subtitle="Continue your journey with AIVO."
      />
      {/*
        The form reads the query string to learn where to send the user after
        signing in. Reading the query string forces a client-side render, so
        it needs a Suspense boundary — without one the server render bails
        out and the route fails.
      */}
      <Suspense fallback={<AuthLoadingState label="Loading" />}>
        <OtpForm mode="sign-in" />
      </Suspense>
    </AuthLayout>
  );
}
