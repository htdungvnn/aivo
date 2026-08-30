/**
 * Nutrition Calculation Service
 * Deterministic nutrition calculations for meals and meal plans
 */

import type {
  NutritionValues,
  NutritionTargets,
  MacroTargets,
  MealItem,
  MealPlanEntry,
  MealType,
  NUTRITION_UNITS,
  NUTRITION_PRECISION,
} from '@repo/nutrition-types';

/**
 * Nutrition calculator class
 */
export class NutritionCalculator {
  /**
   * Calculate nutrition for a quantity of food based on per-100g values
   */
  static calculateFromPer100g(
    nutritionPer100g: NutritionValues,
    quantity: number,
    unit: string
  ): NutritionValues {
    // If unit is grams or ml, we can directly scale
    // For other units, we'd need conversion factors (not implemented)
    const factor = this.getConversionFactor(unit);
    const scaledQuantity = quantity * factor;
    const scaleFactor = scaledQuantity / 100;
    
    return {
      caloriesKcal: this.round(this.scale(nutritionPer100g.caloriesKcal, scaleFactor), 0),
      proteinG: this.round(this.scale(nutritionPer100g.proteinG, scaleFactor), 1),
      carbsG: this.round(this.scale(nutritionPer100g.carbsG, scaleFactor), 1),
      fatG: this.round(this.scale(nutritionPer100g.fatG, scaleFactor), 1),
      fiberG: this.round(this.scale(nutritionPer100g.fiberG, scaleFactor), 1),
      sugarG: this.round(this.scale(nutritionPer100g.sugarG, scaleFactor), 1),
      sodiumMg: this.round(this.scale(nutritionPer100g.sodiumMg, scaleFactor), 0),
    };
  }
  
  /**
   * Get conversion factor for unit to base unit (grams or ml)
   */
  private static getConversionFactor(unit: string): number {
    const unitLower = unit.toLowerCase().trim();
    
    // Direct conversion for common units
    if (unitLower === 'g' || unitLower === 'gram' || unitLower === 'grams') return 1;
    if (unitLower === 'ml' || unitLower === 'milliliter' || unitLower === 'milliliters') return 1;
    if (unitLower === 'kg' || unitLower === 'kilogram' || unitLower === 'kilograms') return 1000;
    if (unitLower === 'l' || unitLower === 'liter' || unitLower === 'liters') return 1000;
    
    // Volume approximations for liquids (assuming density ~1g/ml)
    if (unitLower === 'cup' || unitLower === 'cups') return 240;
    if (unitLower === 'tbsp' || unitLower === 'tablespoon' || unitLower === 'tablespoons') return 15;
    if (unitLower === 'tsp' || unitLower === 'teaspoon' || unitLower === 'teaspoons') return 5;
    if (unitLower === 'oz' || unitLower === 'ounce' || unitLower === 'ounces') return 28.35;
    
    // Piece-based approximations (e.g., 1 egg ≈ 50g)
    if (unitLower === 'piece' || unitLower === 'pieces' || unitLower === 'whole') return 50;
    if (unitLower === 'slice' || unitLower === 'slices') return 30;
    if (unitLower === 'medium' || unitLower === 'mediums') return 100;
    if (unitLower === 'large') return 150;
    if (unitLower === 'small') return 75;
    
    // Default: assume 1 unit = 1 gram
    return 1;
  }
  
  /**
   * Scale a value by a factor
   */
  private static scale(value: number, factor: number): number {
    return value * factor;
  }
  
  /**
   * Round to specified precision
   */
  static round(value: number, precision: number): number {
    const multiplier = Math.pow(10, precision);
    return Math.round(value * multiplier) / multiplier;
  }
  
  /**
   * Aggregate nutrition values from multiple items
   */
  static aggregateNutrition(items: { nutrition: NutritionValues }[]): NutritionValues {
    const totals: NutritionValues = {
      caloriesKcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
      sugarG: 0,
      sodiumMg: 0,
    };
    
    for (const item of items) {
      totals.caloriesKcal += item.nutrition.caloriesKcal;
      totals.proteinG += item.nutrition.proteinG;
      totals.carbsG += item.nutrition.carbsG;
      totals.fatG += item.nutrition.fatG;
      totals.fiberG += item.nutrition.fiberG;
      totals.sugarG += item.nutrition.sugarG;
      totals.sodiumMg += item.nutrition.sodiumMg;
    }
    
    return {
      caloriesKcal: this.round(totals.caloriesKcal, 0),
      proteinG: this.round(totals.proteinG, 1),
      carbsG: this.round(totals.carbsG, 1),
      fatG: this.round(totals.fatG, 1),
      fiberG: this.round(totals.fiberG, 1),
      sugarG: this.round(totals.sugarG, 1),
      sodiumMg: this.round(totals.sodiumMg, 0),
    };
  }
  
  /**
   * Calculate macro percentages from nutrition values
   */
  static calculateMacroPercentages(nutrition: NutritionValues): MacroTargets {
    const totalMacroGrams = nutrition.proteinG + nutrition.carbsG + nutrition.fatG;
    
    if (totalMacroGrams === 0) {
      return {
        proteinPercent: 0,
        carbsPercent: 0,
        fatPercent: 0,
      };
    }
    
    return {
      proteinPercent: Math.round((nutrition.proteinG / totalMacroGrams) * 100),
      carbsPercent: Math.round((nutrition.carbsG / totalMacroGrams) * 100),
      fatPercent: Math.round((nutrition.fatG / totalMacroGrams) * 100),
    };
  }
  
  /**
   * Calculate remaining nutrition from consumed and targets
   */
  static calculateRemainingNutrition(
    consumed: NutritionValues,
    targets: NutritionTargets
  ): NutritionValues {
    return {
      caloriesKcal: Math.max(0, this.round(targets.caloriesKcal - consumed.caloriesKcal, 0)),
      proteinG: Math.max(0, this.round(targets.proteinG - consumed.proteinG, 1)),
      carbsG: Math.max(0, this.round(targets.carbsG - consumed.carbsG, 1)),
      fatG: Math.max(0, this.round(targets.fatG - consumed.fatG, 1)),
      fiberG: Math.max(0, this.round(targets.fiberG - consumed.fiberG, 1)),
      sugarG: Math.max(0, this.round(targets.sugarG - consumed.sugarG, 1)),
      sodiumMg: Math.max(0, this.round(targets.sodiumMg - consumed.sodiumMg, 0)),
    };
  }
  
  /**
   * Calculate target adherence percentage
   */
  static calculateTargetAdherence(
    consumed: NutritionValues,
    targets: NutritionTargets
  ): { caloriesPercent: number; proteinPercent: number; carbsPercent: number; fatPercent: number } {
    return {
      caloriesPercent: targets.caloriesKcal > 0
        ? Math.round((consumed.caloriesKcal / targets.caloriesKcal) * 100)
        : 0,
      proteinPercent: targets.proteinG > 0
        ? Math.round((consumed.proteinG / targets.proteinG) * 100)
        : 0,
      carbsPercent: targets.carbsG > 0
        ? Math.round((consumed.carbsG / targets.carbsG) * 100)
        : 0,
      fatPercent: targets.fatG > 0
        ? Math.round((consumed.fatG / targets.fatG) * 100)
        : 0,
    };
  }
  
  /**
   * Validate nutrition values
   */
  static validateNutrition(nutrition: NutritionValues): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    const implausibleValues = {
      caloriesKcal: { min: 0, max: 5000 },
      proteinG: { min: 0, max: 500 },
      carbsG: { min: 0, max: 800 },
      fatG: { min: 0, max: 400 },
      fiberG: { min: 0, max: 150 },
      sugarG: { min: 0, max: 300 },
      sodiumMg: { min: 0, max: 10000 },
    };
    
    for (const [key, threshold] of Object.entries(implausibleValues)) {
      const value = nutrition[key as keyof NutritionValues];
      if (value < threshold.min || value > threshold.max) {
        errors.push(`${key} value ${value} is outside plausible range (${threshold.min}-${threshold.max})`);
      }
    }
    
    // Check for negative values
    for (const [key, value] of Object.entries(nutrition)) {
      if (typeof value === 'number' && value < 0) {
        errors.push(`${key} cannot be negative`);
      }
    }
    
    // Check for non-finite values
    for (const [key, value] of Object.entries(nutrition)) {
      if (typeof value === 'number' && !Number.isFinite(value)) {
        errors.push(`${key} must be a finite number`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  /**
   * Merge user override with calculated nutrition
   */
  static mergeUserOverride(
    calculated: NutritionValues,
    userOverride: Partial<NutritionValues>
  ): NutritionValues {
    return {
      caloriesKcal: userOverride.caloriesKcal ?? calculated.caloriesKcal,
      proteinG: userOverride.proteinG ?? calculated.proteinG,
      carbsG: userOverride.carbsG ?? calculated.carbsG,
      fatG: userOverride.fatG ?? calculated.fatG,
      fiberG: userOverride.fiberG ?? calculated.fiberG,
      sugarG: userOverride.sugarG ?? calculated.sugarG,
      sodiumMg: userOverride.sodiumMg ?? calculated.sodiumMg,
    };
  }
  
  /**
   * Calculate meal plan target nutrition based on remaining and meal distribution
   */
  static calculateMealPlanTargets(
    remainingNutrition: NutritionValues,
    mealType: MealType,
    allMealTypes: MealType[]
  ): NutritionValues {
    // Distribute remaining nutrition across remaining meals
    const mealCount = allMealTypes.length;
    const remainingMealCount = allMealTypes.length - allMealTypes.indexOf(mealType);
    const factor = mealCount / remainingMealCount;
    
    return {
      caloriesKcal: Math.round(remainingNutrition.caloriesKcal * factor),
      proteinG: this.round(remainingNutrition.proteinG * factor, 1),
      carbsG: this.round(remainingNutrition.carbsG * factor, 1),
      fatG: this.round(remainingNutrition.fatG * factor, 1),
      fiberG: this.round(remainingNutrition.fiberG * factor, 1),
      sugarG: this.round(remainingNutrition.sugarG * factor, 1),
      sodiumMg: Math.round(remainingNutrition.sodiumMg * factor),
    };
  }
  
  /**
   * Get unit label for display
   */
  static getUnitLabel(unit: string): string {
    const unitLower = unit.toLowerCase();
    const labels: Record<string, string> = {
      g: 'g',
      gram: 'g',
      grams: 'g',
      ml: 'ml',
      milliliter: 'ml',
      milliliters: 'ml',
      kcal: 'kcal',
      mg: 'mg',
      kilogram: 'kg',
      kilograms: 'kg',
      piece: 'pc',
      pieces: 'pcs',
      slice: 'slice',
      slices: 'slices',
      cup: 'cup',
      cups: 'cups',
      tbsp: 'tbsp',
      tablespoon: 'tbsp',
      tablespoons: 'tbsp',
      tsp: 'tsp',
      teaspoon: 'tsp',
      teaspoons: 'tsp',
    };
    
    return labels[unitLower] || unit;
  }
}

/**
 * Meal plan calculator
 */
export class MealPlanCalculator {
  /**
   * Recalculate meal plan after meal confirmation
   */
  static recalculatePlan(
    planEntries: MealPlanEntry[],
    confirmedMealNutrition: NutritionValues,
    confirmedMealType: MealType
  ): MealPlanEntry[] {
    // Update the confirmed meal entry with actual nutrition
    return planEntries.map(entry => {
      if (entry.mealType === confirmedMealType && !entry.isLocked) {
        return {
          ...entry,
          targetNutrition: confirmedMealNutrition,
          updatedAt: Math.floor(Date.now() / 1000),
        };
      }
      return entry;
    });
  }
  
  /**
   * Suggest foods for remaining meals based on remaining nutrition
   */
  static suggestFoodsForRemaining(
    remainingNutrition: NutritionValues,
    mealType: MealType,
    foodSuggestions: string[]
  ): string[] {
    // Simple suggestion logic - in production this would use more sophisticated matching
    const suggestions: string[] = [];
    
    if (remainingNutrition.caloriesKcal > 500) {
      if (remainingNutrition.proteinG > 20) {
        suggestions.push('Lean protein source');
      }
      if (remainingNutrition.carbsG > 50) {
        suggestions.push('Complex carbohydrates');
      }
      if (remainingNutrition.fatG > 15) {
        suggestions.push('Healthy fats');
      }
    }
    
    // Add user's favorite foods if available
    suggestions.push(...foodSuggestions.slice(0, 3));
    
    return [...new Set(suggestions)];
  }
}
