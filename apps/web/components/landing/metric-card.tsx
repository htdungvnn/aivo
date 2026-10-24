import type { ReactNode } from "react";

export function MetricCard({
  label,
  value,
  unit,
  hint,
  children,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-card p-4 transition-colors duration-200 hover:border-hairline-strong">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-text">
        {value}
        {unit ? <span className="ml-1 text-sm font-medium text-text-muted">{unit}</span> : null}
      </p>
      {hint ? <p className="mt-1 text-xs text-text-secondary">{hint}</p> : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}
