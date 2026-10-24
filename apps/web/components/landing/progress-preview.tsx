import { Container } from "./container";
import { MetricCard } from "./metric-card";
import { ProgressBar } from "./progress-bar";
import { SectionHeading } from "./section-heading";

const WEEK = [
  { day: "Mon", level: 55 },
  { day: "Tue", level: 32 },
  { day: "Wed", level: 68 },
  { day: "Thu", level: 45 },
  { day: "Fri", level: 85 },
] as const;

const METRICS = [
  { label: "Weight", value: "78.4", unit: "kg", hint: "−1.2 kg this month" },
  { label: "Consistency", value: "86", unit: "%", hint: "6 of 7 sessions" },
  { label: "Strength", value: "+18", unit: "%", hint: "Bench press, 8 weeks" },
  { label: "Activity", value: "8.4", unit: "k steps", hint: "Daily average" },
] as const;

export function ProgressPreview() {
  return (
    <section id="progress" className="relative py-16 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow="Progress"
          title="See progress beyond the scale."
          description="Simple visuals for weight, consistency, strength, calories, macros, and activity — readable in seconds."
          align="center"
          className="mx-auto"
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {METRICS.map((metric) => (
            <MetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              unit={metric.unit}
              hint={metric.hint}
            />
          ))}
        </div>

        <div className="mt-6 rounded-3xl border border-hairline bg-surface p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-semibold tracking-tight text-text">Weekly Activity</p>
            <span className="text-xs font-medium text-text-muted">Mon — Fri</span>
          </div>

          <div className="mt-6 flex items-end gap-2 sm:gap-4">
            {WEEK.map((entry) => (
              <div key={entry.day} className="flex flex-1 flex-col items-center gap-3">
                <div className="flex h-28 w-full items-end sm:h-36">
                  <div
                    className="w-full rounded-t-lg bg-primary/80 transition-[height] duration-500 ease-out"
                    style={{ height: `${entry.level}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-text-muted">{entry.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-hairline bg-surface p-6">
            <p className="text-sm font-semibold tracking-tight text-text">Calories</p>
            <p className="mt-1.5 text-2xl font-bold tracking-tight text-text">
              1,540
              <span className="text-sm font-medium text-text-muted"> / 2,200 kcal</span>
            </p>
            <div className="mt-4">
              <ProgressBar value={1540} max={2200} label="Daily calories" />
            </div>
          </div>
          <div className="rounded-3xl border border-hairline bg-surface p-6">
            <p className="text-sm font-semibold tracking-tight text-text">Macros</p>
            <p className="mt-1.5 text-2xl font-bold tracking-tight text-text">
              112
              <span className="text-sm font-medium text-text-muted"> / 160g protein</span>
            </p>
            <div className="mt-4">
              <ProgressBar value={112} max={160} label="Protein intake" />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
