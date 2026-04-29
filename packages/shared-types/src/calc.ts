// ============================================
// CALCULATION UTILITIES
// ============================================
// Pure functions for common fitness calculations
import type { ActivityLevel, Goal } from "./compute";

export interface BMICalculationInput {
  weightKg: number;
  heightCm: number;
}

export interface BMICalculationResult {
  bmi: number;
  category: "underweight" | "normal" | "overweight" | "obese";
}

export function calculateBMI({ weightKg, heightCm }: BMICalculationInput): BMICalculationResult {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);

  let category: BMICalculationResult["category"];
  if (bmi < 18.5) category = "underweight";
  else if (bmi < 25) category = "normal";
  else if (bmi < 30) category = "overweight";
  else category = "obese";

  return { bmi: Math.round(bmi * 10) / 10, category };
}

export interface CalorieCalculationInput {
  bmr: number;
  activityLevel: ActivityLevel;
  goal: Goal;
}

export interface CalorieCalculationResult {
  maintenance: number;
  target: number;
  adjustment: number; // % difference from maintenance
}

export function calculateTargetCalories({ bmr, activityLevel, goal }: CalorieCalculationInput): CalorieCalculationResult {
  const activityMultipliers: Record<ActivityLevel, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  const maintenance = bmr * activityMultipliers[activityLevel];

  let target: number;
  switch (goal) {
    case "lose":
      target = maintenance - 500; // 500 calorie deficit
      break;
    case "gain":
      target = maintenance + 500; // 500 calorie surplus
      break;
    case "maintain":
    default:
      target = maintenance;
  }

  const adjustment = ((target - maintenance) / maintenance) * 100;

  return {
    maintenance: Math.round(maintenance),
    target: Math.round(target),
    adjustment: Math.round(adjustment * 10) / 10,
  };
}

export interface OneRepMaxInput {
  weightLifted: number;
  reps: number;
}

export interface OneRepMaxResult {
  epley: number;
  brzycki: number;
  average: number;
}

export function calculateOneRepMax({ weightLifted, reps }: OneRepMaxInput): OneRepMaxResult {
  if (reps === 1) {
    return { epley: weightLifted, brzycki: weightLifted, average: weightLifted };
  }

  // Epley formula
  const epley = weightLifted * (1 + reps / 30);

  // Brzycki formula
  const brzycki = weightLifted * (36 / (37 - reps));

  return {
    epley: Math.round(epley * 10) / 10,
    brzycki: Math.round(brzycki * 10) / 10,
    average: Math.round(((epley + brzycki) / 2) * 10) / 10,
  };
}

// Type guards
export function isActivityLevel(value: string): value is ActivityLevel {
  return ["sedentary", "light", "moderate", "active", "very_active"].includes(value);
}

export function isGoal(value: string): value is Goal {
  return ["lose", "maintain", "gain"].includes(value);
}
