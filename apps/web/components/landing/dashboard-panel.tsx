import { AiDot } from "./ai-dot";
import { ProgressBar } from "./progress-bar";

const WEEK = [
  { day: "Mon", level: 62 },
  { day: "Tue", level: 38 },
  { day: "Wed", level: 74 },
  { day: "Thu", level: 51 },
  { day: "Fri", level: 88 },
] as const;

export function DashboardPanel() {
  return (
    <div className="w-full overflow-hidden rounded-3xl border border-hairline bg-surface shadow-[0_50px_140px_-50px_rgba(0,0,0,0.9)]">
      <div className="flex items-center gap-2 border-b border-hairline px-5 py-3.5">
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" aria-hidden="true" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" aria-hidden="true" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" aria-hidden="true" />
        <span className="ml-2 text-xs font-medium text-text-muted">AIVO — Dashboard</span>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
        <div className="sm:col-span-2 flex items-center justify-between">
          <div>
            <p className="text-xl font-bold tracking-tight text-text">Good morning</p>
            <p className="mt-0.5 text-sm text-text-muted">Here is where you stand today.</p>
          </div>
          <span className="text-2xl" aria-hidden="true">
            👋
          </span>
        </div>

        <div className="rounded-2xl border border-hairline bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              Today&apos;s Workout
            </span>
            <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              45 min
            </span>
          </div>
          <p className="mt-2 text-lg font-semibold tracking-tight text-text">
            Upper Body Strength
          </p>
          <p className="mt-1 text-xs text-text-secondary">4 exercises · Chest, back, shoulders</p>
          <div className="mt-4 flex items-end gap-1.5">
            {[40, 68, 52, 84, 60, 74].map((height, index) => (
              <span
                key={index}
                className="flex-1 rounded-sm bg-primary/25"
                style={{ height: `${height * 0.4}px` }}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-hairline bg-card p-5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            Daily Nutrition
          </span>
          <p className="mt-2 text-lg font-semibold tracking-tight text-text">
            1,540
            <span className="text-sm font-medium text-text-muted"> / 2,200 kcal</span>
          </p>
          <div className="mt-4">
            <ProgressBar value={1540} max={2200} label="Daily calories" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-text-muted">Protein</p>
              <p className="text-sm font-semibold text-text">
                112 <span className="text-text-muted">/ 160g</span>
              </p>
            </div>
            <div>
              <p className="text-[11px] text-text-muted">Steps</p>
              <p className="text-sm font-semibold text-text">7,842</p>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/8 p-5 sm:col-span-2">
          <AiDot className="mt-1.5 shrink-0" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              AI Insight
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
              You&apos;re maintaining good workout consistency this week.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-hairline bg-card p-5 sm:col-span-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            Weekly Progress
          </span>
          <div className="mt-4 flex items-end justify-between gap-3">
            {WEEK.map((entry) => (
              <div key={entry.day} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-16 w-full items-end">
                  <div
                    className="w-full rounded-md bg-primary/80"
                    style={{ height: `${entry.level}%` }}
                  />
                </div>
                <span className="text-[11px] text-text-muted">{entry.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
