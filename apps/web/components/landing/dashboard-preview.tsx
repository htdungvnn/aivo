import { AiDot } from "./ai-dot";
import { ProgressBar } from "./progress-bar";

function StatRow({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="text-xs font-semibold text-text">
        {value}
        {unit ? <span className="ml-0.5 font-medium text-text-muted">{unit}</span> : null}
      </span>
    </div>
  );
}

export function DashboardPreview() {
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-text">Good morning</p>
        <span className="text-base" aria-hidden="true">
          👋
        </span>
      </div>

      <div className="rounded-xl border border-hairline bg-card p-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            Today&apos;s Workout
          </span>
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
            45 min
          </span>
        </div>
        <p className="mt-1.5 text-sm font-semibold leading-tight text-text">Upper Body Strength</p>
        <div className="mt-2 flex gap-1">
          {[68, 92, 54, 78, 40].map((width, index) => (
            <span
              key={index}
              className="h-1 flex-1 rounded-full bg-white/10"
              style={{
                background: `linear-gradient(to right, rgba(163,255,18,${width / 100}), rgba(163,255,18,${width / 100}))`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-hairline bg-card p-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            Daily Nutrition
          </span>
          <p className="mt-1 text-base font-bold tracking-tight text-text">
            1,540
            <span className="text-[11px] font-medium text-text-muted"> / 2,200 kcal</span>
          </p>
          <div className="mt-2">
            <ProgressBar value={1540} max={2200} label="Daily calories" />
          </div>
        </div>

        <div className="rounded-xl border border-hairline bg-card p-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            Protein
          </span>
          <p className="mt-1 text-base font-bold tracking-tight text-text">
            112
            <span className="text-[11px] font-medium text-text-muted"> / 160g</span>
          </p>
          <div className="mt-2">
            <ProgressBar value={112} max={160} label="Protein" tone="secondary" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-hairline bg-card p-3">
        <StatRow label="Steps" value="7,842" />
        <StatRow label="Active minutes" value="38 min" />
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-primary/25 bg-primary/8 p-3">
        <AiDot className="mt-1.5 shrink-0" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            AI Insight
          </p>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">
            You&apos;re maintaining good workout consistency this week.
          </p>
        </div>
      </div>
    </div>
  );
}
