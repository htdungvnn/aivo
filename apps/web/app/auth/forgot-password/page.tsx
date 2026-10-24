import type { Metadata } from "next";

import { AuthBrandPanel, AuthHeader } from "@/components/auth/auth-header";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { AuthLayout } from "@/components/auth/auth-layout";

export const metadata: Metadata = {
  title: "Forgot password — AIVO",
  description: "Request a link to reset your AIVO password.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout aside={<AuthBrandPanel />}>
      <AuthHeader
        title="Forgot your password?"
        subtitle="Enter your email and we'll send you instructions to reset your password."
      />
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
