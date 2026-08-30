/**
 * AIVO Design System - Feature Metadata
 * Typed feature definitions for landing page and marketing
 */

export interface Feature {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  category: "core" | "ai" | "tracking" | "analytics" | "platform";
  highlights: string[];
  badge?: string;
}

export const features: Feature[] = [
  {
    id: "ai-coach",
    name: "AI Health Coach",
    tagline: "Your personal AI wellness guide",
    description:
      "Get personalized guidance from our AI coach trained on evidence-based wellness practices. Ask questions, get motivation, and receive tailored recommendations.",
    icon: "Brain",
    category: "ai",
    highlights: [
      "24/7 availability for health questions",
      "Personalized wellness recommendations",
      "Evidence-based guidance (not medical advice)",
      "Adaptive learning from your progress",
    ],
    badge: "Popular",
  },
  {
    id: "nutrition",
    name: "Smart Nutrition",
    tagline: "AI-powered meal analysis",
    description:
      "Log meals with photos and get instant nutritional breakdown. Our AI analyzes your food and provides macro tracking, calorie insights, and personalized meal suggestions.",
    icon: "Apple",
    category: "core",
    highlights: [
      "Photo-based meal logging",
      "Automatic macro and micronutrient tracking",
      "Personalized meal recommendations",
      "Food sensitivity insights",
    ],
  },
  {
    id: "workouts",
    name: "Workout Planning",
    tagline: "Adaptive fitness programs",
    description:
      "Receive personalized workout plans that adapt to your schedule, fitness level, and goals. Track your exercises and see your progress over time.",
    icon: "Dumbbell",
    category: "core",
    highlights: [
      "Personalized workout routines",
      "Exercise library with video guides",
      "Progress tracking and adjustments",
      "Rest day recommendations",
    ],
  },
  {
    id: "daily-tracking",
    name: "Daily Health Tracking",
    tagline: "All-in-one health metrics",
    description:
      "Track weight, sleep, hydration, energy levels, and daily habits in one place. Build healthy routines with gentle reminders and streak tracking.",
    icon: "Activity",
    category: "tracking",
    highlights: [
      "Weight and body metrics",
      "Sleep quality and duration",
      "Hydration tracking",
      "Habit streaks and goals",
    ],
  },
  {
    id: "analytics",
    name: "Progress Analytics",
    tagline: "Weekly insights and trends",
    description:
      "Visualize your health journey with beautiful charts and weekly summaries. Understand patterns, celebrate wins, and identify areas for improvement.",
    icon: "TrendingUp",
    category: "analytics",
    highlights: [
      "Interactive progress charts",
      "Weekly and monthly summaries",
      "Trend identification",
      "Goal progress tracking",
    ],
  },
  {
    id: "cross-platform",
    name: "Web & Mobile Sync",
    tagline: "Access your health anywhere",
    description:
      "Seamlessly switch between web and mobile. Your health data syncs in real-time so you can track on the go and analyze on the big screen.",
    icon: "Smartphone",
    category: "platform",
    highlights: [
      "Native iOS and Android apps",
      "Full-featured web dashboard",
      "Real-time data synchronization",
      "Offline tracking support",
    ],
  },
  {
    id: "privacy",
    name: "Privacy-First Design",
    tagline: "Your data, your control",
    description:
      "Your health data is sensitive. We use encryption, never sell your data, and give you complete control over your information.",
    icon: "Shield",
    category: "platform",
    highlights: [
      "End-to-end encryption",
      "No data selling, ever",
      "Export your data anytime",
      "Account deletion on demand",
    ],
    badge: "Important",
  },
  {
    id: "onboarding",
    name: "Smart Onboarding",
    tagline: "Personalized from day one",
    description:
      "Tell us about your health goals, preferences, and constraints. We'll create a customized experience tailored just for you.",
    icon: "UserCheck",
    category: "core",
    highlights: [
      "Health goal assessment",
      "Dietary preferences and restrictions",
      "Fitness level evaluation",
      "Personalized initial plan",
    ],
  },
];

export const featureCategories = {
  core: {
    name: "Core Features",
    description: "Essential tools for your health journey",
  },
  ai: {
    name: "AI Features",
    description: "Intelligent assistance powered by AI",
  },
  tracking: {
    name: "Tracking",
    description: "Monitor your daily health metrics",
  },
  analytics: {
    name: "Analytics",
    description: "Insights and progress visualization",
  },
  platform: {
    name: "Platform",
    description: "Access anywhere, stay secure",
  },
} as const;

export function getFeaturesByCategory(category: Feature["category"]): Feature[] {
  return features.filter((f) => f.category === category);
}

export function getFeatureById(id: string): Feature | undefined {
  return features.find((f) => f.id === id);
}
