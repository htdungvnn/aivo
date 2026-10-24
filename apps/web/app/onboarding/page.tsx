import type { Metadata } from "next";

import { AuthSessionGuard } from "@/components/auth/auth-guard";

export const metadata: Metadata = {
  title: "Onboarding — AIVO",
  robots: { index: false, follow: false },
};

/**
 * The onboarding shell.
 *
 * Onboarding is a separate feature; this page only holds the protected
 * route so the authentication flow has a destination to land on.
 */
export default function OnboardingPage() {
  return (
    <AuthSessionGuard>
      <main className="min-h-dvh bg-ink px-5 py-12 text-text sm:px-8">
        <div className="mx-auto w-full max-w-[720px]">
          <p className="text-sm text-text-secondary">AIVO</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Let's personalize AIVO
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
            Tell us about your goals and we'll shape your plan around them.
          </p>
        </div>
      </main>
    </AuthSessionGuard>
  );
}
