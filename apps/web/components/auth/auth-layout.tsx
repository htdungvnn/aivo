import type { ReactNode } from "react";

/**
 * The two-column authentication layout.
 *
 * Desktop shows the brand panel on the left and the form on the right;
 * mobile drops the panel entirely so the form gets the full width.
 */
export function AuthLayout({
  children,
  aside,
}: {
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-ink text-text lg:flex-row">
      {aside ? (
        <aside className="relative hidden w-[45%] shrink-0 overflow-hidden border-r border-hairline lg:flex lg:flex-col lg:justify-between">
          <div className="aivo-grid pointer-events-none absolute inset-0 opacity-70" />
          <div className="aivo-glow pointer-events-none absolute inset-x-0 top-0 h-96" />
          {aside}
        </aside>
      ) : null}

      <main className="flex flex-1 items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-[440px]">{children}</div>
      </main>
    </div>
  );
}
