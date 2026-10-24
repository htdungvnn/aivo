import { Button } from "./button";
import { Container } from "./container";
import { DashboardPreview } from "./dashboard-preview";
import { PhoneMockup } from "./phone-mockup";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-24 lg:pt-44 lg:pb-32">
      <div aria-hidden="true" className="aivo-glow absolute inset-x-0 top-0 h-[560px]" />
      <div aria-hidden="true" className="aivo-grid absolute inset-x-0 top-0 h-[620px]" />

      <Container className="relative">
        <div className="grid items-center gap-12 lg:grid-cols-[45fr_55fr] lg:gap-16">
          <div className="animate-fade-up flex flex-col items-start">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-primary">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-ring" />
              AI Coach · Nutrition · Workouts
            </span>

            <h1 className="mt-6 text-[40px] font-bold leading-[1.05] tracking-[-0.02em] text-text sm:text-[52px] lg:text-[68px]">
              Your{" "}
              <span className="bg-gradient-to-br from-primary to-[#d7ff7a] bg-clip-text text-transparent">
                AI Coach
              </span>{" "}
              for a Healthier, Stronger You.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg">
              Personalized workouts, smarter nutrition, and AI-powered insights designed around
              your goals.
            </p>

            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button href="/sign-up" size="lg" className="w-full sm:w-auto">
                Start Free
              </Button>
              <Button href="#how-it-works" variant="secondary" size="lg" className="w-full sm:w-auto">
                See How It Works
              </Button>
            </div>

            <p className="mt-6 text-sm text-text-muted">
              No complicated setup. Just tell AIVO your goal and start improving.
            </p>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 mx-auto h-[420px] w-[520px] rounded-full bg-primary/12 blur-[120px]"
            />
            <div className="animate-aivo-float">
              <PhoneMockup className="animate-fade-up-slow">
                <DashboardPreview />
              </PhoneMockup>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
