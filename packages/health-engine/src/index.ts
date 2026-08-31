/**
 * Health Engine - TypeScript Package
 * Provides type declarations and wrapper for WASM health calculations
 */

export const HEALTH_ENGINE_VERSION = '1.0.0';
export const FORMULA_VERSION = '2026.1';

export interface HealthMetricsInput {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: 'male' | 'female';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  bodyFatPercent?: number;
}

export interface HealthMetricsOutput {
  bmi: number;
  bmiCategory: 'underweight' | 'normal' | 'overweight' | 'obese';
  bmr: number;
  bmrUnit: 'kcal/day';
  tdee: number;
  tdeeUnit: 'kcal/day';
  bodyFatEstimated?: number;
  vo2MaxEstimated?: number;
  formulaVersion: string;
}

export function calculateHealthMetrics(input: HealthMetricsInput): HealthMetricsOutput {
  const { weightKg, heightCm, age, sex, activityLevel } = input;
  
  // BMI Calculation
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  const bmiCategory = getBmiCategory(bmi);
  
  // BMR using Mifflin-St Jeor Equation
  let bmr: number;
  if (sex === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }
  
  // TDEE using activity multiplier
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  const tdee = bmr * activityMultipliers[activityLevel];
  
  // Body fat estimation (if not provided)
  let bodyFatEstimated: number | undefined;
  if (input.bodyFatPercent !== undefined) {
    bodyFatEstimated = input.bodyFatPercent;
  } else {
    // Boer formula estimation
    if (sex === 'male') {
      bodyFatEstimated = (1.20 * bmi) + (0.23 * age) - 16.2;
    } else {
      bodyFatEstimated = (1.20 * bmi) + (0.23 * age) - 5.4;
    }
  }
  
  // VO2 Max estimation (Cooper formula variant)
  let vo2MaxEstimated: number | undefined;
  if (bodyFatEstimated !== undefined) {
    // Using revised formula with body fat
    if (sex === 'male') {
      vo2MaxEstimated = 60 - (1.14 * bodyFatEstimated) - (0.56 * age);
    } else {
      vo2MaxEstimated = 48 - (0.73 * bodyFatEstimated) - (0.42 * age);
    }
  }
  
  return {
    bmi: Math.round(bmi * 10) / 10,
    bmiCategory,
    bmr: Math.round(bmr),
    bmrUnit: 'kcal/day',
    tdee: Math.round(tdee),
    tdeeUnit: 'kcal/day',
    bodyFatEstimated: bodyFatEstimated !== undefined ? Math.round(bodyFatEstimated * 10) / 10 : undefined,
    vo2MaxEstimated: vo2MaxEstimated !== undefined ? Math.round(vo2MaxEstimated * 10) / 10 : undefined,
    formulaVersion: FORMULA_VERSION,
  };
}

function getBmiCategory(bmi: number): 'underweight' | 'normal' | 'overweight' | 'obese' {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  return 'obese';
}

export function calculateTrainingLoad(acuteLoad: number, chronicLoad: number): {
  ratio: number;
  category: 'fresh' | 'optimal' | 'fatigued' | 'high_risk';
} {
  if (chronicLoad === 0) {
    return { ratio: 0, category: 'fresh' };
  }
  
  const ratio = acuteLoad / chronicLoad;
  
  let category: 'fresh' | 'optimal' | 'fatigued' | 'high_risk';
  if (ratio < 0.8) {
    category = 'fresh';
  } else if (ratio <= 1.3) {
    category = 'optimal';
  } else if (ratio <= 1.5) {
    category = 'fatigued';
  } else {
    category = 'high_risk';
  }
  
  return {
    ratio: Math.round(ratio * 100) / 100,
    category,
  };
}
