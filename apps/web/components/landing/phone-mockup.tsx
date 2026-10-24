import type { ReactNode } from "react";

export function PhoneMockup({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative w-[290px] shrink-0 rounded-[2.5rem] border border-hairline-strong bg-surface p-2 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] sm:w-[320px] ${className}`}
    >
      <div className="absolute inset-x-0 top-3 z-10 mx-auto h-6 w-28 rounded-full bg-black/80" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-[2rem] bg-ink">{children}</div>
    </div>
  );
}
