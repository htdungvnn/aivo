import { AICoach } from "@/components/landing/ai-coach";
import { Benefits } from "@/components/landing/benefits";
import { FinalCTA } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Navbar } from "@/components/landing/navbar";
import { NutritionPreview } from "@/components/landing/nutrition-preview";
import { ProductPreview } from "@/components/landing/product-preview";
import { ProgressPreview } from "@/components/landing/progress-preview";
import { WorkoutPreview } from "@/components/landing/workout-preview";

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-ink">
      <Navbar />
      <main>
        <Hero />
        <ProductPreview />
        <Benefits />
        <HowItWorks />
        <AICoach />
        <WorkoutPreview />
        <NutritionPreview />
        <ProgressPreview />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
