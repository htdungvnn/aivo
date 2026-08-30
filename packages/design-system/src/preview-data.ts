/**
 * AIVO Design System - Product Preview Data
 * Realistic but explicitly synthetic preview data for landing page and demos
 * DO NOT use real personal or health information
 */

export interface DailyMetric {
  date: string;
  value: number;
  label?: string;
}

export interface NutritionSummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface HealthScore {
  overall: number;
  sleep: number;
  nutrition: number;
  activity: number;
  hydration: number;
}

export interface ReadinessLevel {
  label: string;
  value: number;
  message: string;
}

export interface WeightTrend {
  date: string;
  weight: number;
  goal?: number;
}

export interface HabitStreak {
  name: string;
  current: number;
  best: number;
  completed: boolean;
}

// Health Score Data
export const sampleHealthScore: HealthScore = {
  overall: 87,
  sleep: 82,
  nutrition: 91,
  activity: 85,
  hydration: 78,
};

// Daily Readiness Data
export const sampleReadiness: ReadinessLevel = {
  label: "High",
  value: 92,
  message: "You're energized and ready for an active day!",
};

// Nutrition Summary (Today's Log)
export const sampleNutrition: NutritionSummary = {
  calories: 1847,
  protein: 124,
  carbs: 198,
  fat: 62,
  fiber: 28,
};

// Macro Goals and Progress
export const sampleMacros = {
  protein: { current: 124, goal: 150, unit: "g" },
  carbs: { current: 198, goal: 250, unit: "g" },
  fat: { current: 62, goal: 80, unit: "g" },
  fiber: { current: 28, goal: 35, unit: "g" },
  calories: { current: 1847, goal: 2200, unit: "kcal" },
};

// Weekly Activity Data (steps)
export const sampleWeeklyActivity: DailyMetric[] = [
  { date: "Mon", value: 8420 },
  { date: "Tue", value: 12350 },
  { date: "Wed", value: 6800 },
  { date: "Thu", value: 10200 },
  { date: "Fri", value: 9870 },
  { date: "Sat", value: 14560 },
  { date: "Sun", value: 5230 },
];

// Sleep Quality Data (hours)
export const sampleSleepData: DailyMetric[] = [
  { date: "Mon", value: 7.2 },
  { date: "Tue", value: 8.1 },
  { date: "Wed", value: 6.8 },
  { date: "Thu", value: 7.5 },
  { date: "Fri", value: 7.8 },
  { date: "Sat", value: 8.5 },
  { date: "Sun", value: 7.0 },
];

// Weight Trend (last 30 days)
export const sampleWeightTrend: WeightTrend[] = [
  { date: "Aug 1", weight: 185.2 },
  { date: "Aug 3", weight: 184.5 },
  { date: "Aug 5", weight: 184.0 },
  { date: "Aug 7", weight: 183.8 },
  { date: "Aug 9", weight: 183.2 },
  { date: "Aug 11", weight: 182.9 },
  { date: "Aug 13", weight: 182.1 },
  { date: "Aug 15", weight: 181.8 },
  { date: "Aug 17", weight: 181.5 },
  { date: "Aug 19", weight: 181.0 },
  { date: "Aug 21", weight: 180.7 },
  { date: "Aug 23", weight: 180.2 },
  { date: "Aug 25", weight: 179.8 },
  { date: "Aug 27", weight: 179.5 },
  { date: "Aug 29", weight: 179.2, goal: 170 },
];

// Hydration Tracking (glasses per day)
export const sampleHydration: DailyMetric[] = [
  { date: "Mon", value: 6 },
  { date: "Tue", value: 8 },
  { date: "Wed", value: 5 },
  { date: "Thu", value: 7 },
  { date: "Fri", value: 9 },
  { date: "Sat", value: 8 },
  { date: "Sun", value: 6 },
];

// Habit Streaks
export const sampleHabits: HabitStreak[] = [
  { name: "Morning Walk", current: 23, best: 45, completed: true },
  { name: "Drink 8 Glasses Water", current: 18, best: 18, completed: true },
  { name: "Log Meals", current: 21, best: 30, completed: true },
  { name: "Sleep Before 11pm", current: 12, best: 25, completed: false },
];

// AI Coach Sample Prompts & Responses
export interface SampleAIConversation {
  prompt: string;
  response: string;
  category: "nutrition" | "fitness" | "wellness" | "motivation";
}

export const sampleAIConversations: SampleAIConversation[] = [
  {
    prompt: "I'm feeling tired after work. What's a quick healthy snack?",
    response:
      "Great question! After a long day, opt for something with protein and healthy fats to sustain energy. Try apple slices with almond butter, Greek yogurt with berries, or hummus with veggie sticks. These combos provide lasting energy without the crash from sugary snacks. Want me to suggest some quick meal prep ideas for busy weekdays?",
    category: "nutrition",
  },
  {
    prompt: "I missed my workout today. Should I double up tomorrow?",
    response:
      "Don't worry about occasional missed workouts — life happens! Rather than doubling up (which can lead to injury or burnout), just get back on track tomorrow with your regular routine. Consistency over intensity is key. If you want extra movement, a 20-minute walk is a gentle way to stay active without adding stress. Remember, one missed workout doesn't define your journey.",
    category: "fitness",
  },
  {
    prompt: "How can I sleep better?",
    response:
      "Quality sleep supports everything from weight management to mental clarity. Try these evidence-based tips: 1) Keep a consistent sleep schedule, even weekends. 2) Avoid screens 1 hour before bed. 3) Keep your room cool (65-68°F). 4) Limit caffeine after 2pm. 5) Try a relaxing pre-bed routine like reading or gentle stretching. Your recent sleep logs show some variability — want me to help identify patterns?",
    category: "wellness",
  },
  {
    prompt: "I'm not seeing progress. What should I do?",
    response:
      "Progress isn't always visible on the scale. Looking at your data: your energy levels have improved, you're sleeping better, and you've maintained an 18-day hydration streak. These are significant wins! If the scale is stuck, consider non-scale victories: how are your clothes fitting? Your energy? Your strength? Sometimes a recalibration of goals or a deload week helps. Want to discuss adjusting your targets?",
    category: "motivation",
  },
];

// Workout Plan Sample
export interface WorkoutExercise {
  name: string;
  sets: number;
  reps: string;
  duration?: string;
  rest: string;
}

export interface WorkoutDay {
  day: string;
  focus: string;
  exercises: WorkoutExercise[];
  completed: boolean;
}

export const sampleWorkoutPlan: WorkoutDay[] = [
  {
    day: "Monday",
    focus: "Upper Body Strength",
    completed: true,
    exercises: [
      { name: "Push-ups", sets: 3, reps: "10-12", rest: "60s" },
      { name: "Dumbbell Rows", sets: 3, reps: "10 each arm", rest: "60s" },
      { name: "Shoulder Press", sets: 3, reps: "10", rest: "60s" },
      { name: "Plank", sets: 3, reps: "30 seconds", rest: "45s" },
    ],
  },
  {
    day: "Tuesday",
    focus: "Cardio & Core",
    completed: false,
    exercises: [
      { name: "Brisk Walking", sets: 1, reps: "20 minutes", rest: "N/A" },
      { name: "Russian Twists", sets: 3, reps: "20 total", rest: "45s" },
      { name: "Bicycle Crunches", sets: 3, reps: "20 total", rest: "45s" },
      { name: "Leg Raises", sets: 3, reps: "12", rest: "45s" },
    ],
  },
  {
    day: "Wednesday",
    focus: "Active Recovery",
    completed: false,
    exercises: [
      { name: "Gentle Stretching", sets: 1, reps: "15 minutes", rest: "N/A" },
      { name: "Foam Rolling", sets: 1, reps: "10 minutes", rest: "N/A" },
      { name: "Light Yoga", sets: 1, reps: "15 minutes", rest: "N/A" },
    ],
  },
];

// Weekly Summary Sample
export interface WeeklyInsight {
  type: "achievement" | "tip" | "trend" | "goal";
  title: string;
  description: string;
}

export const sampleWeeklyInsights: WeeklyInsight[] = [
  {
    type: "achievement",
    title: "Best Sleep Week Yet!",
    description: "Your average sleep duration increased by 32 minutes. Great job prioritizing rest!",
  },
  {
    type: "trend",
    title: "Hydration Opportunity",
    description: "You hit your water goal on 3 out of 7 days. Try keeping a water bottle at your desk.",
  },
  {
    type: "tip",
    title: "Protein Boost",
    description: "Your protein intake has been below target. Try adding Greek yogurt or a handful of almonds as snacks.",
  },
  {
    type: "goal",
    title: "Keep the Streak Going",
    description: "You're 3 days away from your longest workout streak. You've got this!",
  },
];

// Dashboard Stats Summary
export const dashboardStats = {
  currentStreak: 23,
  weeklyWorkouts: 4,
  avgSleepHours: 7.5,
  avgDailySteps: 9656,
  weightChange: -6.0,
  waterGoalMet: 3,
};

// Platform Features
export interface PlatformFeature {
  platform: "ios" | "android" | "web";
  features: string[];
}

export const platformFeatures: PlatformFeature[] = [
  {
    platform: "ios",
    features: [
      "Native iOS experience",
      "Face ID & Touch ID unlock",
      "Apple Health integration",
      "Haptic feedback",
      "Offline mode",
      "Widget support",
      "Siri shortcuts",
    ],
  },
  {
    platform: "android",
    features: [
      "Native Android experience",
      "Fingerprint & Face unlock",
      "Google Fit integration",
      "Haptic feedback",
      "Offline mode",
      "Wear OS companion",
      "Widget support",
    ],
  },
  {
    platform: "web",
    features: [
      "Full-screen analytics",
      "Keyboard navigation",
      "Export data easily",
      "Detailed meal logging",
      "Weekly reports",
      "Coach messaging",
      "Goal setting",
    ],
  },
];
