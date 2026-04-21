import { FitnessCalculator } from "@aivo/compute";

/**
 * Validate body metrics using WASM-powered validation rules
 * This provides consistent validation across web, mobile, and API
 */
export class BodyMetricsValidator {
  /**
   * Validate weight based on user profile and fitness level
   */
  static validateWeight(
    weight: number,
    height: number,
    age: number,
    gender: "male" | "female",
    _fitnessLevel: string
  ): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic range checks
    if (weight <= 0) {
      errors.push("Weight must be positive");
      return { valid: false, errors, warnings };
    }

    if (weight < 30) {
      errors.push("Weight seems too low for a healthy adult");
    } else if (weight > 300) {
      errors.push("Weight seems too high - please verify");
    }

    // Calculate BMI for contextual validation
    const bmi = FitnessCalculator.calculateBMI(weight, height);
    const bmiCategory = FitnessCalculator.getBMICategory(bmi);

    if (bmiCategory === "underweight") {
      warnings.push("BMI indicates underweight - consider consulting a nutritionist");
    } else if (bmiCategory === "obese") {
      warnings.push("BMI indicates obese category - consider consulting a healthcare provider");
    }

    // Gender-specific reasonable ranges
    const isMale = gender === "male";
    const expectedMin = isMale ? 50 : 40;
    const expectedMax = isMale ? 150 : 120;

    if (weight < expectedMin) {
      warnings.push(`Weight is quite low for a ${isMale ? "male" : "female"}`);
    }
    if (weight > expectedMax) {
      warnings.push(`Weight is quite high for a ${isMale ? "male" : "female"}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate body fat percentage
   */
  static validateBodyFat(
    bodyFat: number,
    age: number,
    gender: "male" | "female",
    _fitnessLevel: string
  ): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (bodyFat < 0 || bodyFat > 100) {
      errors.push("Body fat percentage must be between 0 and 100");
      return { valid: false, errors, warnings };
    }

    // Essential fat thresholds
    const essentialMin = gender === "male" ? 2 : 10;
    const athleticMax = gender === "male" ? 13 : 20;

    if (bodyFat < essentialMin) {
      errors.push(`Body fat cannot be below ${essentialMin}% (essential fat)`);
    }

    if (bodyFat > 35) {
      warnings.push("Body fat percentage is in the obese range");
    } else if (bodyFat > athleticMax) {
      warnings.push("Body fat is above athletic/fitness range");
    }

    // Age-adjusted ranges
    if (age > 40 && bodyFat < 12) {
      warnings.push("Body fat seems very low for your age group");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate muscle mass
   */
  static validateMuscleMass(
    muscleMass: number,
    weight: number,
    height: number,
    gender: "male" | "female"
  ): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (muscleMass <= 0) {
      errors.push("Muscle mass must be positive");
      return { valid: false, errors, warnings };
    }

    if (muscleMass > weight) {
      errors.push("Muscle mass cannot exceed total body weight");
    }

    // Calculate muscle-to-weight ratio
    const ratio = muscleMass / weight;

    // Typical muscle mass ratios by gender
    const typicalMin = gender === "male" ? 0.30 : 0.24;
    const typicalMax = gender === "male" ? 0.50 : 0.40;

    if (ratio < typicalMin * 0.5) {
      warnings.push("Muscle mass seems unusually low");
    }
    if (ratio > typicalMax * 1.2) {
      warnings.push("Muscle mass seems unusually high for your weight");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate complete body metrics entry
   */
  static validateCompleteMetrics(
    metrics: {
      weight?: number;
      bodyFatPercentage?: number;
      muscleMass?: number;
      height: number;
      age: number;
      gender: "male" | "female";
      fitnessLevel: string;
    }
  ): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (metrics.weight !== undefined) {
      const weightValidation = this.validateWeight(
        metrics.weight,
        metrics.height,
        metrics.age,
        metrics.gender,
        metrics.fitnessLevel
      );
      errors.push(...weightValidation.errors);
      warnings.push(...weightValidation.warnings);
    }

    if (metrics.bodyFatPercentage !== undefined) {
      const bfValidation = this.validateBodyFat(
        metrics.bodyFatPercentage,
        metrics.age,
        metrics.gender,
        metrics.fitnessLevel
      );
      errors.push(...bfValidation.errors);
      warnings.push(...bfValidation.warnings);

      // Cross-validation with weight and muscle mass
      if (metrics.weight && metrics.muscleMass && metrics.bodyFatPercentage) {
        const leanMass = metrics.weight * (1 - metrics.bodyFatPercentage / 100);
        const muscleRatio = metrics.muscleMass / leanMass;

        if (muscleRatio < 0.5) {
          suggestions.push(
            "Muscle mass seems low relative to your lean body mass. Consider resistance training."
          );
        }
      }
    }

    if (metrics.muscleMass !== undefined && metrics.weight) {
      const muscleValidation = this.validateMuscleMass(
        metrics.muscleMass,
        metrics.weight,
        metrics.height,
        metrics.gender
      );
      errors.push(...muscleValidation.errors);
      warnings.push(...muscleValidation.warnings);
    }

    // Cross-metric consistency checks
    if (metrics.weight && metrics.bodyFatPercentage && metrics.muscleMass) {
      const estimatedLean = metrics.weight * (1 - metrics.bodyFatPercentage / 100);
      const difference = Math.abs(estimatedLean - metrics.muscleMass);

      if (difference > metrics.weight * 0.1) {
        warnings.push(
          "The combination of weight, body fat, and muscle mass seems inconsistent"
        );
        suggestions.push(
          "Ensure these measurements were taken at the same time with consistent methodology"
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }
}

/**
 * Quick validation function for API use
 */
export async function validateBodyMetrics(
  metrics: Parameters<typeof BodyMetricsValidator.validateCompleteMetrics>["0"]
): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
  const result = BodyMetricsValidator.validateCompleteMetrics(metrics);
  return {
    valid: result.valid,
    errors: result.errors,
    warnings: result.warnings,
  };
}
