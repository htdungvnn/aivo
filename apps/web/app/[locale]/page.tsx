"use client";

import {
  Navigation,
  Hero,
  ValueStrip,
  Features,
  ProductShowcase,
  HowItWorks,
  AICoaching,
  Platform,
  Pricing,
  Privacy,
  FAQ,
  Testimonials,
  FinalCTA,
  Footer,
} from "@/components/landing";

export default function Home() {
  return (
    <>
      <Navigation />
      <main>
        <Hero />
        <ValueStrip />
        <Features />
        <ProductShowcase />
        <HowItWorks />
        <AICoaching />
        <Platform />
        <Pricing />
        <Privacy />
        <FAQ />
        <Testimonials />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
