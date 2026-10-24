import { Container } from "./container";
import { SectionHeading } from "./section-heading";

const STEPS = [
  {
    number: "01",
    title: "Tell AIVO Your Goal",
    description:
      "Lose weight, build muscle, get stronger, or stay healthy — pick what matters and AIVO meets you there.",
    goals: ["Lose Weight", "Build Muscle", "Get Stronger", "Stay Healthy"],
  },
  {
    number: "02",
    title: "Get Your Personal Plan",
    description:
      "AIVO creates personalized guidance based on your profile, your schedule, and your goal.",
    goals: ["Daily workout plan", "Calorie & macro targets"],
  },
  {
    number: "03",
    title: "Improve Every Day",
    description:
      "Track progress and receive AI recommendations as your data changes week to week.",
    goals: ["Adaptive targets", "Weekly insights"],
  },
] as const;

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-16 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow="How It Works"
          title="Your plan. Your progress. Powered by AI."
          description="Three steps between you and a routine that actually sticks."
          align="center"
          className="mx-auto"
        />

        <ol className="mt-14 grid gap-5 md:grid-cols-3">
          {STEPS.map((step) => (
            <li
              key={step.number}
              className="group relative flex flex-col gap-4 rounded-3xl border border-hairline bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:bg-elevated"
            >
              <span className="text-sm font-bold tracking-[0.2em] text-primary">{step.number}</span>
              <h3 className="text-xl font-semibold tracking-tight text-text">{step.title}</h3>
              <p className="text-[15px] leading-relaxed text-text-secondary">{step.description}</p>
              <ul className="mt-auto flex flex-wrap gap-2 pt-2">
                {step.goals.map((goal) => (
                  <li
                    key={goal}
                    className="rounded-full border border-hairline bg-white/5 px-3 py-1 text-xs font-medium text-text-secondary"
                  >
                    {goal}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
