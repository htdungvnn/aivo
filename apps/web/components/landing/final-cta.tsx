import { Button } from "./button";
import { Container } from "./container";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      <Container>
        <div className="relative overflow-hidden rounded-4xl border border-hairline bg-surface px-6 py-16 text-center sm:px-12 sm:py-24">
          <div aria-hidden="true" className="aivo-glow absolute inset-0" />
          <div aria-hidden="true" className="aivo-grid absolute inset-0" />

          <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-6">
            <h2 className="text-3xl font-bold leading-[1.1] tracking-tight text-text sm:text-5xl">
              Ready to build a healthier you?
            </h2>
            <p className="max-w-lg text-base leading-relaxed text-text-secondary sm:text-lg">
              Start building better fitness and nutrition habits with AIVO.
            </p>

            <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button href="/sign-up" size="lg" className="w-full sm:w-auto">
                Start Free
              </Button>
              <Button href="#product" variant="secondary" size="lg" className="w-full sm:w-auto">
                Explore AIVO
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
