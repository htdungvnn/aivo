/**
 * AIVO Design System - How It Works Steps
 * Typed workflow steps for landing page
 */

export interface HowItWorksStep {
  id: string;
  number: number;
  title: string;
  description: string;
  icon: string;
}

export const howItWorksSteps: HowItWorksStep[] = [
  {
    id: "sign-in",
    number: 1,
    title: "Sign in with Google or Facebook",
    description:
      "Create your account in seconds using your existing Google or Facebook account. No new password to remember.",
    icon: "UserPlus",
  },
  {
    id: "onboarding",
    number: 2,
    title: "Complete health onboarding",
    description:
      "Answer a few questions about your health goals, dietary preferences, fitness level, and any constraints. This takes about 5 minutes.",
    icon: "ClipboardList",
  },
  {
    id: "plan",
    number: 3,
    title: "Receive your personalized plan",
    description:
      "Get an AI-generated daily plan tailored to your goals, including suggested meals, workouts, and health targets.",
    icon: "Sparkles",
  },
  {
    id: "track",
    number: 4,
    title: "Track your daily activity",
    description:
      "Log meals, workouts, weight, sleep, and habits throughout your day. Quick and easy entries take under 2 minutes.",
    icon: "CheckCircle",
  },
  {
    id: "improve",
    number: 5,
    title: "Improve with weekly insights",
    description:
      "Every week, receive AI-powered insights about your progress, patterns, and personalized recommendations to help you reach your goals.",
    icon: "TrendingUp",
  },
];

export const stepConnector = {
  enabled: true,
  label: "Then",
} as const;
