/**
 * AIVO Design System - Pricing Configuration
 * Typed pricing tiers and feature comparison
 */

export type PricingTier = "free" | "pro" | "earlyAdopter";

export interface PricingFeature {
  name: string;
  description?: string;
  included: boolean;
}

export interface PricingPlan {
  id: PricingTier;
  name: string;
  tagline: string;
  price: {
    monthly: number | null;
    yearly: number | null;
    lifetime?: number | null;
  };
  features: PricingFeature[];
  highlighted?: boolean;
  recommended?: boolean;
  cta: string;
  disabled?: boolean;
}

export const pricingPlans: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Get started with basic health tracking",
    price: {
      monthly: 0,
      yearly: 0,
    },
    features: [
      {
        name: "Basic health profile",
        description: "Set up your profile with key health metrics",
        included: true,
      },
      {
        name: "Daily health tracking",
        description: "Track weight, sleep, hydration, and habits",
        included: true,
      },
      {
        name: "Limited AI coaching",
        description: "3 AI coach interactions per week",
        included: true,
      },
      {
        name: "Basic weekly summary",
        description: "Simple weekly progress overview",
        included: true,
      },
      {
        name: "Meal logging",
        included: false,
      },
      {
        name: "Workout planning",
        included: false,
      },
      {
        name: "Advanced analytics",
        included: false,
      },
      {
        name: "AI meal analysis",
        included: false,
      },
      {
        name: "Personalized meal plans",
        included: false,
      },
      {
        name: "Unlimited history",
        included: false,
      },
      {
        name: "Cross-device sync",
        included: false,
      },
    ],
    cta: "Get Started",
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Complete AI-powered health transformation",
    price: {
      monthly: 7.99,
      yearly: 59.99,
    },
    features: [
      {
        name: "Everything in Free",
        included: true,
      },
      {
        name: "Unlimited AI coaching",
        description: "24/7 personalized AI health guidance",
        included: true,
      },
      {
        name: "AI meal analysis",
        description: "Instant nutritional breakdown and insights",
        included: true,
      },
      {
        name: "Personalized meal plans",
        description: "Customized nutrition based on your goals",
        included: true,
      },
      {
        name: "Workout planning",
        description: "Adaptive workout routines",
        included: true,
      },
      {
        name: "Advanced analytics",
        description: "Deep insights and trend analysis",
        included: true,
      },
      {
        name: "Unlimited history",
        description: "Full access to your health data",
        included: true,
      },
      {
        name: "Cross-device sync",
        description: "Web and mobile synchronization",
        included: true,
      },
      {
        name: "Priority support",
        included: true,
      },
      {
        name: "Early access to new features",
        included: true,
      },
    ],
    highlighted: true,
    recommended: true,
    cta: "Start Pro Trial",
  },
  {
    id: "earlyAdopter",
    name: "Early Adopter",
    tagline: "Limited launch offer - First year only",
    price: {
      monthly: null,
      yearly: null,
      lifetime: 39.99,
    },
    features: [
      {
        name: "Everything in Pro",
        included: true,
      },
      {
        name: "Lifetime access",
        description: "All Pro features forever at this price",
        included: true,
      },
      {
        name: "Founding member badge",
        description: "Exclusive badge on your profile",
        included: true,
      },
      {
        name: "Direct feedback channel",
        description: "Shape the future of AIVO",
        included: true,
      },
      {
        name: "Extended onboarding",
        description: "1-on-1 setup session with our team",
        included: true,
      },
    ],
    cta: "Claim Your Spot",
    disabled: false,
  },
];

export const defaultPricingPlan = pricingPlans.find((p) => p.id === "pro")!;

// Helper functions
export function getPlanById(id: PricingTier): PricingPlan | undefined {
  return pricingPlans.find((plan) => plan.id === id);
}

export function formatPrice(price: number | null): string {
  if (price === null) return "N/A";
  if (price === 0) return "Free";
  return `$${price.toFixed(2)}`;
}

export function getYearlySavings(monthlyPrice: number, yearlyPrice: number): number {
  const yearlyFromMonthly = monthlyPrice * 12;
  return Math.round(((yearlyFromMonthly - yearlyPrice) / yearlyFromMonthly) * 100);
}
