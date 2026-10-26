import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthBrandPanel, AuthHeader } from "@/components/auth/auth-header";
import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthLoadingState } from "@/components/auth/auth-loading";
import { OtpForm } from "@/components/auth/otp-form";

export const metadata: Metadata = {
  title: "Create your account — AIVO",
  description:
    "Create your AIVO account and start your personalized fitness journey.",
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return (
    <AuthLayout aside={<AuthBrandPanel />}>
      <AuthHeader
        title="Create your AIVO account"
        subtitle="Your personalized fitness journey starts here."
      />
      <Suspense fallback={<AuthLoadingState label="Loading" />}>
        <OtpForm mode="sign-up" />
      </Suspense>
    </AuthLayout>
  );
}
