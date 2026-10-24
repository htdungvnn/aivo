import type { ReactNode } from "react";

export function Badge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-hairline bg-white/5 px-3 py-1 text-xs font-medium tracking-wide text-text-secondary ${className}`}
    >
      {children}
    </span>
  );
}
