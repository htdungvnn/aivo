import type { ReactNode } from "react";

import { Logo } from "../landing/logo";

/**
 * The branding panel shown on the left of the desktop authentication layout.
 *
 * Hidden on small screens, where the layout is single-column.
 */
export function AuthBrandPanel() {
  return (
    <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
      <div className="flex items-center gap-3">
        <Logo size={36} />
        <span className="text-lg font-semibold tracking-tight">AIVO</span>
      </div>

      <div className="max-w-md">
        <p className="text-4xl font-semibold leading-[1.1] tracking-tight xl:text-5xl">
          Your AI coach
          <br />
          for a healthier you.
        </p>
        <p className="mt-5 text-base leading-relaxed text-text-secondary">
          Personalized workouts, smarter nutrition, and AI-powered insights
          built around your goals, lifestyle, and progress.
        </p>
      </div>

      <div className="flex items-center gap-6 text-xs text-text-muted">
        <span>© {new Date().getFullYear()} AIVO</span>
        <span>Privacy</span>
        <span>Terms</span>
      </div>
    </div>
  );
}

/**
 * The header shown above every authentication form.
 */
export function AuthHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-8">
      <div className="mb-8 flex items-center gap-3 lg:hidden">
        <Logo size={32} />
        <span className="text-base font-semibold tracking-tight">AIVO</span>
      </div>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-[34px]">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
          {subtitle}
        </p>
      ) : null}
      {children}
    </header>
  );
}
