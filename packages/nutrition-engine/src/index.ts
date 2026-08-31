/**
 * Nutrition Engine - TypeScript Package
 * Deterministic nutrition calculations for meals and meal plans
 */

export const NUTRITION_ENGINE_VERSION = '1.0.0';

export interface NutritionValues {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
}

export interface NutritionTargets extends NutritionValues {
  hydrationMl: number | null;
  weightKg: number | null;
}

export interface MacroTargets {
  proteinPercent: number;
  carbsPercent: number;
  fatPercent: number;
}

const MACRO_CALORIES = {
  protein: 4,
  carbs: 4,
  fat: 9,
};

export function calculateFromPer100g(
  nutritionPer100g: NutritionValues,
  quantity: number,
  unit: string
): NutritionValues {
  const factor = getConversionFactor(unit);
  const scaledQuantity = quantity * factor;
  const scaleFactor = scaledQuantity / 100;
  
  return {
    caloriesKcal: Math.round(scale(nutritionPer100g.caloriesKcal, scaleFactor)),
    proteinG: round(scale(nutritionPer100g.proteinG, scaleFactor), 1),
    carbsG: round(scale(nutritionPer100g.carbsG, scaleFactor), 1),
    fatG: round(scale(nutritionPer100g.fatG, scaleFactor), 1),
    fiberG: round(scale(nutritionPer100g.fiberG, scaleFactor), 1),
    sugarG: round(scale(nutritionPer100g.sugarG, scaleFactor), 1),
    sodiumMg: Math.round(scale(nutritionPer100g.sodiumMg, scaleFactor)),
  };
}

function getConversionFactor(unit: string): number {
  const unitLower = unit.toLowerCase().trim();
  
  if (unitLower === 'g' || unitLower === 'gram' || unitLower === 'grams') return 1;
  if (unitLower === 'ml' || unitLower === 'milliliter') return 1;
  if (unitLower === 'kg' || unitLower === 'kilogram') return 1000;
  if (unitLower === 'l' || unitLower === 'liter') return 1000;
  if (unitLower === 'cup' || unitLower === 'cups') return 240;
  if (unitLower === 'tbsp' || unitLower === 'tablespoon') return 15;
  if (unitLower === 'tsp' || unitLower === 'teaspoon') return 5;
  if (unitLower === 'oz' || unitLower === 'ounce') return 28.35;
  if (unitLower === 'piece' || unitLower === 'pieces') return 50;
  if (unitLower === 'slice' || unitLower === 'slices') return 30;
  if (unitLower === 'medium') return 100;
  if (unitLower === 'large') return 150;
  if (unitLower === 'small') return 75;
  
  return 1;
}

function scale(value: number, factor: number): number {
  return value * factor;
}

function round(value: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

export function aggregateNutrition(items: { nutrition: NutritionValues }[]): NutritionValues {
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
    caloriesKcal: Math.round(totals.caloriesKcal),
    proteinG: round(totals.proteinG, 1),
    carbsG: round(totals.carbsG, 1),
    fatG: round(totals.fatG, 1),
    fiberG: round(totals.fiberG, 1),
    sugarG: round(totals.sugarG, 1),
    sodiumMg: Math.round(totals.sodiumMg),
  };
}

export function calculateMacroPercentages(nutrition: NutritionValues): MacroTargets {
  const totalMacroGrams = nutrition.proteinG + nutrition.carbsG + nutrition.fatG;
  
  if (totalMacroGrams === 0) {
    return { proteinPercent: 0, carbsPercent: 0, fatPercent: 0 };
  }
  
  return {
    proteinPercent: Math.round((nutrition.proteinG / totalMacroGrams) * 100),
    carbsPercent: Math.round((nutrition.carbsG / totalMacroGrams) * 100),
    fatPercent: Math.round((nutrition.fatG / totalMacroGrams) * 100),
  };
}

export function calculateRemainingNutrition(
  consumed: NutritionValues,
  targets: NutritionTargets
): NutritionValues {
  return {
    caloriesKcal: Math.max(0, Math.round(targets.caloriesKcal - consumed.caloriesKcal)),
    proteinG: Math.max(0, round(targets.proteinG - consumed.proteinG, 1)),
    carbsG: Math.max(0, round(targets.carbsG - consumed.carbsG, 1)),
    fatG: Math.max(0, round(targets.fatG - consumed.fatG, 1)),
    fiberG: Math.max(0, round(targets.fiberG - consumed.fiberG, 1)),
    sugarG: Math.max(0, round(targets.sugarG - consumed.sugarG, 1)),
    sodiumMg: Math.max(0, Math.round(targets.sodiumMg - consumed.sodiumMg)),
  };
}

export function calculateTargetAdherence(
  consumed: NutritionValues,
  targets: NutritionTargets
): { caloriesPercent: number; proteinPercent: number; carbsPercent: number; fatPercent: number } {
  return {
    caloriesPercent: targets.caloriesKcal > 0 ? Math.round((consumed.caloriesKcal / targets.caloriesKcal) * 100) : 0,
    proteinPercent: targets.proteinG > 0 ? Math.round((consumed.proteinG / targets.proteinG) * 100) : 0,
    carbsPercent: targets.carbsG > 0 ? Math.round((consumed.carbsG / targets.carbsG) * 100) : 0,
    fatPercent: targets.fatG > 0 ? Math.round((consumed.fatG / targets.fatG) * 100) : 0,
  };
}

export function calculateTDEEFromMetrics(bmr: number, activityLevel: keyof typeof activityMultipliers): number {
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  return Math.round(bmr * activityMultipliers[activityLevel]);
}

export function calculateMacroTargetsFromCalories(
  targetCalories: number,
  macroTargets: MacroTargets
): { proteinG: number; carbsG: number; fatG: number } {
  return {
    proteinG: Math.round((targetCalories * (macroTargets.proteinPercent / 100)) / MACRO_CALORIES.protein),
    carbsG: Math.round((targetCalories * (macroTargets.carbsPercent / 100)) / MACRO_CALORIES.carbs),
    fatG: Math.round((targetCalories * (macroTargets.fatPercent / 100)) / MACRO_CALORIES.fat),
  };
}
