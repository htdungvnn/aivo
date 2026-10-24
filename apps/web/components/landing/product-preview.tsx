import { Container } from "./container";
import { DashboardPanel } from "./dashboard-panel";
import { SectionHeading } from "./section-heading";

export function ProductPreview() {
  return (
    <section id="product" className="relative py-16 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow="The Product"
          title="Everything you need, in one app."
          description="AIVO turns your goal into a daily routine — training, nutrition, and coaching that all point in the same direction."
          align="center"
          className="mx-auto"
        />

        <div className="relative mt-14">
          <div
            aria-hidden="true"
            className="absolute -inset-x-10 -top-10 bottom-0 -z-10 rounded-[3rem] bg-primary/8 blur-[100px]"
          />
          <div className="animate-aivo-float">
            <DashboardPanel />
          </div>
        </div>
      </Container>
    </section>
  );
}
