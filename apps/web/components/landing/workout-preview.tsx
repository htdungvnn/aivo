import { Button } from "./button";
import { Container } from "./container";
import { DumbbellIcon } from "./icons";
import { SectionHeading } from "./section-heading";

const EXERCISES = [
  { name: "Bench Press", sets: "4 × 8" },
  { name: "Lat Pulldown", sets: "3 × 10" },
  { name: "Shoulder Press", sets: "3 × 10" },
] as const;

export function WorkoutPreview() {
  return (
    <section id="workout" className="relative py-16 sm:py-24">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 rounded-3xl border border-hairline bg-surface p-6 sm:p-8 lg:order-1">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                  Today&apos;s Workout
                </p>
                <p className="mt-1.5 text-xl font-bold tracking-tight text-text">
                  Upper Body Strength
                </p>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                <DumbbellIcon />
              </span>
            </div>

            <ul className="mt-6 divide-y divide-hairline">
              {EXERCISES.map((exercise, index) => (
                <li key={exercise.name} className="flex items-center justify-between py-3.5">
                  <span className="flex items-center gap-3 text-sm text-text-secondary">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/5 text-[11px] font-semibold text-text-muted">
                      {index + 1}
                    </span>
                    {exercise.name}
                  </span>
                  <span className="rounded-lg bg-white/5 px-2.5 py-1 text-xs font-semibold text-text">
                    {exercise.sets}
                  </span>
                </li>
              ))}
            </ul>

            <Button href="/sign-up" size="md" className="mt-6 w-full">
              View Workout
            </Button>
          </div>

          <SectionHeading
            eyebrow="Workout"
            title="Workouts built around you."
            description="Get structured training plans aligned with your goals, fitness level, and available schedule — then get on with it."
            className="order-1 lg:order-2"
          />
        </div>
      </Container>
    </section>
  );
}
