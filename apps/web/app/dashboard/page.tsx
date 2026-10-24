"use client";

import { useAuthSession } from "@/lib/auth-actions";

import { AuthSessionGuard } from "@/components/auth/auth-guard";

/**
 * The protected dashboard shell.
 *
 * The session check happens in the browser — the backend enforces
 * authorization independently, so this is UX, not security.
 */
export default function DashboardPage() {
  return (
    <AuthSessionGuard>
      <DashboardContent />
    </AuthSessionGuard>
  );
}

function DashboardContent() {
  const { user, onboardingCompleted } = useAuthSession();

  return (
    <main className="min-h-dvh bg-ink px-5 py-12 text-text sm:px-8">
      <div className="mx-auto w-full max-w-[720px]">
        <p className="text-sm text-text-secondary">AIVO</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Welcome{user?.displayName ? `, ${user.displayName}` : ""}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
          {onboardingCompleted
            ? "Your personalized plan is ready."
            : "Finish onboarding to unlock your personalized plan."}
        </p>

        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-hairline bg-card p-5">
            <dt className="text-sm text-text-secondary">Email</dt>
            <dd className="mt-1 font-medium break-all">{user?.email}</dd>
          </div>
          <div className="rounded-2xl border border-hairline bg-card p-5">
            <dt className="text-sm text-text-secondary">Sign-in method</dt>
            <dd className="mt-1 font-medium capitalize">{user?.authProvider}</dd>
          </div>
        </dl>

        {!onboardingCompleted ? (
          <a
            href="/onboarding"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 font-semibold tracking-tight text-primary-ink transition-colors hover:bg-primary-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Start Onboarding
          </a>
        ) : null}
      </div>
    </main>
  );
}
