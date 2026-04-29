// ============================================
// HEALTH SCORE - SHARED CALCULATIONS
// ============================================

export interface HealthScoreFactors {
  bmi: number;
  bodyFat: number;
  muscleMass: number;
  fitnessLevel: number;
}

export interface HealthScoreResult {
  score: number;
  category: "excellent" | "good" | "fair" | "poor";
  factors: HealthScoreFactors;
  recommendations: string[];
}

/**
 * Calculate health score from metrics and user profile
 * Pure function - no side effects
 */
export function calculateHealthScore(params: {
  bmi?: number;
  bodyFatPercentage?: number;
  muscleMass?: number;
  weight?: number;
  fitnessLevel?: string;
}): HealthScoreResult {
  const factors: HealthScoreFactors = {
    bmi: 0.5,
    bodyFat: 0.5,
    muscleMass: 0.5,
    fitnessLevel: 0.4,
  };

  // BMI scoring (0-1)
  if (params.bmi !== undefined) {
    const bmi = params.bmi;
    if (bmi >= 18.5 && bmi <= 24.9) {
      factors.bmi = 1;
    } else if (bmi >= 25 && bmi <= 29.9) {
      factors.bmi = 0.7;
    } else if (bmi >= 30) {
      factors.bmi = 0.3;
    } else {
      factors.bmi = 0.5;
    }
  }

  // Body fat scoring (0-1)
  if (params.bodyFatPercentage !== undefined) {
    const bf = params.bodyFatPercentage / 100; // Convert to decimal
    if (bf < 0.12) {
      factors.bodyFat = 0.8;
    } else if (bf >= 0.12 && bf <= 0.25) {
      factors.bodyFat = 1;
    } else if (bf > 0.25 && bf <= 0.30) {
      factors.bodyFat = 0.7;
    } else {
      factors.bodyFat = 0.3;
    }
  }

  // Muscle mass scoring (0-1)
  if (params.muscleMass !== undefined && params.weight !== undefined) {
    const muscleRatio = params.muscleMass / params.weight;
    if (muscleRatio >= 0.35 && muscleRatio <= 0.45) {
      factors.muscleMass = 1;
    } else if (muscleRatio >= 0.30 && muscleRatio < 0.35) {
      factors.muscleMass = 0.8;
    } else if (muscleRatio > 0.45 && muscleRatio <= 0.50) {
      factors.muscleMass = 0.9;
    } else {
      factors.muscleMass = 0.5;
    }
  }

  // Fitness level scoring
  const fitnessMap: Record<string, number> = {
    beginner: 0.4,
    intermediate: 0.7,
    advanced: 0.9,
    elite: 1.0,
  };
  factors.fitnessLevel = fitnessMap[params.fitnessLevel || "beginner"] || 0.4;

  // Weighted average
  const weights = { bmi: 0.25, bodyFat: 0.3, muscleMass: 0.3, fitnessLevel: 0.15 };
  const score =
    (factors.bmi * weights.bmi +
      factors.bodyFat * weights.bodyFat +
      factors.muscleMass * weights.muscleMass +
      factors.fitnessLevel * weights.fitnessLevel) *
    100;

  // Determine category
  let category: HealthScoreResult["category"];
  if (score >= 80) {
    category = "excellent";
  } else if (score >= 60) {
    category = "good";
  } else if (score >= 40) {
    category = "fair";
  } else {
    category = "poor";
  }

  // Generate recommendations
  const recommendations: string[] = [];
  if (factors.bmi < 0.7) {
    recommendations.push("Focus on maintaining a healthy weight range through balanced nutrition");
  }
  if (factors.bodyFat < 0.7) {
    recommendations.push("Consider adjusting macronutrient intake to optimize body composition");
  }
  if (factors.muscleMass < 0.7) {
    recommendations.push("Incorporate resistance training to build lean muscle mass");
  }
  if (recommendations.length === 0) {
    recommendations.push("Keep up your excellent health trajectory!");
  }

  return {
    score: Math.round(score * 10) / 10,
    category,
    factors,
    recommendations,
  };
}
