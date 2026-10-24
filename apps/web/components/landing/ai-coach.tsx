import { Button } from "./button";
import { Container } from "./container";
import { AiDot } from "./ai-dot";
import { SectionHeading } from "./section-heading";

const INSIGHTS = [
  {
    message: "You completed 4 workouts this week.",
    tone: "default" as const,
  },
  {
    message: "Your protein intake is below your current target.",
    tone: "warning" as const,
  },
] as const;

export function AICoach() {
  return (
    <section id="ai-coach" className="relative overflow-hidden py-16 sm:py-24">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-1/2 -z-10 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-primary/8 blur-[130px]"
      />
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <SectionHeading
            eyebrow="AIVO AI"
            title="A coach that understands your progress."
            description="AIVO analyzes your fitness and nutrition data to surface useful insights and help you decide what to focus on next."
          />

          <div className="rounded-3xl border border-hairline bg-surface p-6 sm:p-8">
            <div className="flex items-center gap-2.5">
              <AiDot />
              <span className="text-sm font-semibold tracking-tight text-text">AI Coach</span>
            </div>

            <div className="mt-6 space-y-3">
              {INSIGHTS.map((insight) => (
                <div
                  key={insight.message}
                  className={`rounded-2xl border p-4 text-sm leading-relaxed ${
                    insight.tone === "warning"
                      ? "border-primary/25 bg-primary/8 text-text-secondary"
                      : "border-hairline bg-card text-text-secondary"
                  }`}
                >
                  &ldquo;{insight.message}&rdquo;
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <Button href="/sign-up" variant="secondary" size="sm">
                Adjust Meal Plan
              </Button>
              <Button href="/sign-up" variant="secondary" size="sm">
                View Progress
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
