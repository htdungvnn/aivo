import { Container } from "./container";
import { ProgressBar } from "./progress-bar";
import { SaladIcon } from "./icons";
import { SectionHeading } from "./section-heading";

const MACROS = [
  { label: "Protein", value: 112, max: 160, unit: "g" },
  { label: "Carbs", value: 170, max: 250, unit: "g" },
  { label: "Fat", value: 48, max: 70, unit: "g" },
] as const;

const MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks"] as const;

export function NutritionPreview() {
  return (
    <section id="nutrition" className="relative py-16 sm:py-24">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <SectionHeading
            eyebrow="Nutrition"
            title="Nutrition without the guesswork."
            description="Track calories, macros, and meals in one simple experience."
          />

          <div className="rounded-3xl border border-hairline bg-surface p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                  Calories
                </p>
                <p className="mt-1.5 text-2xl font-bold tracking-tight text-text">
                  1,540
                  <span className="text-sm font-medium text-text-muted"> / 2,200 kcal</span>
                </p>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                <SaladIcon />
              </span>
            </div>

            <div className="mt-4">
              <ProgressBar value={1540} max={2200} label="Daily calories" />
            </div>

            <div className="mt-6 space-y-4">
              {MACROS.map((macro) => (
                <div key={macro.label}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm text-text-secondary">{macro.label}</span>
                    <span className="text-sm font-semibold text-text">
                      {macro.value}
                      <span className="font-medium text-text-muted">
                        {" "}
                        / {macro.max}
                        {macro.unit}
                      </span>
                    </span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar
                      value={macro.value}
                      max={macro.max}
                      label={`${macro.label} intake`}
                      tone={macro.label === "Protein" ? "primary" : "secondary"}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7 border-t border-hairline pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                Meals
              </p>
              <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {MEALS.map((meal) => (
                  <li
                    key={meal}
                    className="rounded-xl border border-hairline bg-card px-3 py-2.5 text-center text-xs font-medium text-text-secondary"
                  >
                    {meal}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
