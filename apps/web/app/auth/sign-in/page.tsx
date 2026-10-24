import type { Metadata } from "next";

import { AuthBrandPanel, AuthHeader } from "@/components/auth/auth-header";
import { AuthLayout } from "@/components/auth/auth-layout";
import { SignInForm } from "@/components/auth/sign-in-form";

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
      <SignInForm />
    </AuthLayout>
  );
}
