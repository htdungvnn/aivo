/**
 * Unit tests for Nutrition Calculator
 */

import { describe, it, expect } from 'vitest';
import { NutritionCalculator, MealPlanCalculator } from '../src/services/calculations';
import type { NutritionValues, MealType } from '@aivo/nutrition-types';

describe('NutritionCalculator', () => {
  describe('calculateFromPer100g', () => {
    it('should calculate nutrition for 100g serving', () => {
      const nutritionPer100g: NutritionValues = {
        caloriesKcal: 165,
        proteinG: 31,
        carbsG: 0,
        fatG: 3.6,
        fiberG: 0,
        sugarG: 0,
        sodiumMg: 74,
      };
      
      const result = NutritionCalculator.calculateFromPer100g(nutritionPer100g, 100, 'g');
      
      expect(result.caloriesKcal).toBe(165);
      expect(result.proteinG).toBe(31);
      expect(result.fatG).toBe(3.6);
    });
    
    it('should scale nutrition for different quantities', () => {
      const nutritionPer100g: NutritionValues = {
        caloriesKcal: 165,
        proteinG: 31,
        carbsG: 0,
        fatG: 3.6,
        fiberG: 0,
        sugarG: 0,
        sodiumMg: 74,
      };
      
      const result = NutritionCalculator.calculateFromPer100g(nutritionPer100g, 200, 'g');
      
      expect(result.caloriesKcal).toBe(330);
      expect(result.proteinG).toBe(62);
    });
    
    it('should handle different units', () => {
      const nutritionPer100g: NutritionValues = {
        caloriesKcal: 100,
        proteinG: 10,
        carbsG: 20,
        fatG: 5,
        fiberG: 2,
        sugarG: 10,
        sodiumMg: 50,
      };
      
      // 1 cup = 240ml
      const result = NutritionCalculator.calculateFromPer100g(nutritionPer100g, 1, 'cup');
      
      expect(result.caloriesKcal).toBe(240);
      expect(result.proteinG).toBe(24);
    });
    
    it('should round values correctly', () => {
      const nutritionPer100g: NutritionValues = {
        caloriesKcal: 100,
        proteinG: 10.555,
        carbsG: 20.333,
        fatG: 5.777,
        fiberG: 2.111,
        sugarG: 10.999,
        sodiumMg: 50,
      };
      
      const result = NutritionCalculator.calculateFromPer100g(nutritionPer100g, 150, 'g');
      
      expect(result.proteinG).toBe(15.8); // Rounded to 1 decimal
      expect(result.carbsG).toBe(30.5);
      expect(result.fatG).toBe(8.7);
    });
  });
  
  describe('aggregateNutrition', () => {
    it('should sum nutrition from multiple items', () => {
      const items = [
        {
          nutrition: {
            caloriesKcal: 165,
            proteinG: 31,
            carbsG: 0,
            fatG: 3.6,
            fiberG: 0,
            sugarG: 0,
            sodiumMg: 74,
          },
        },
        {
          nutrition: {
            caloriesKcal: 130,
            proteinG: 2.7,
            carbsG: 28,
            fatG: 0.3,
            fiberG: 0.4,
            sugarG: 0,
            sodiumMg: 1,
          },
        },
      ];
      
      const result = NutritionCalculator.aggregateNutrition(items);
      
      expect(result.caloriesKcal).toBe(295);
      expect(result.proteinG).toBe(33.7);
      expect(result.carbsG).toBe(28);
      expect(result.fatG).toBe(3.9);
    });
    
    it('should handle empty array', () => {
      const result = NutritionCalculator.aggregateNutrition([]);
      
      expect(result.caloriesKcal).toBe(0);
      expect(result.proteinG).toBe(0);
      expect(result.carbsG).toBe(0);
    });
  });
  
  describe('calculateMacroPercentages', () => {
    it('should calculate correct macro percentages', () => {
      const nutrition: NutritionValues = {
        caloriesKcal: 500,
        proteinG: 50,  // 25g
        carbsG: 50,    // 50g
        fatG: 25,       // 25g
        fiberG: 0,
        sugarG: 0,
        sodiumMg: 0,
      };
      
      const result = NutritionCalculator.calculateMacroPercentages(nutrition);
      
      // Total macro grams = 125
      expect(result.proteinPercent).toBe(40);
      expect(result.carbsPercent).toBe(40);
      expect(result.fatPercent).toBe(20);
    });
    
    it('should handle zero macros', () => {
      const nutrition: NutritionValues = {
        caloriesKcal: 0,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
        fiberG: 0,
        sugarG: 0,
        sodiumMg: 0,
      };
      
      const result = NutritionCalculator.calculateMacroPercentages(nutrition);
      
      expect(result.proteinPercent).toBe(0);
      expect(result.carbsPercent).toBe(0);
      expect(result.fatPercent).toBe(0);
    });
  });
  
  describe('calculateRemainingNutrition', () => {
    it('should calculate remaining nutrition correctly', () => {
      const consumed: NutritionValues = {
        caloriesKcal: 800,
        proteinG: 30,
        carbsG: 100,
        fatG: 25,
        fiberG: 10,
        sugarG: 30,
        sodiumMg: 1000,
      };
      
      const targets = {
        caloriesKcal: 2000,
        proteinG: 50,
        carbsG: 275,
        fatG: 78,
        fiberG: 28,
        sugarG: 50,
        sodiumMg: 2300,
        hydrationMl: 2000,
        weightKg: null,
      };
      
      const result = NutritionCalculator.calculateRemainingNutrition(consumed, targets);
      
      expect(result.caloriesKcal).toBe(1200);
      expect(result.proteinG).toBe(20);
      expect(result.carbsG).toBe(175);
      expect(result.fatG).toBe(53);
    });
    
    it('should not return negative values', () => {
      const consumed: NutritionValues = {
        caloriesKcal: 2500,
        proteinG: 60,
        carbsG: 300,
        fatG: 100,
        fiberG: 30,
        sugarG: 60,
        sodiumMg: 3000,
      };
      
      const targets = {
        caloriesKcal: 2000,
        proteinG: 50,
        carbsG: 275,
        fatG: 78,
        fiberG: 28,
        sugarG: 50,
        sodiumMg: 2300,
        hydrationMl: 2000,
        weightKg: null,
      };
      
      const result = NutritionCalculator.calculateRemainingNutrition(consumed, targets);
      
      expect(result.caloriesKcal).toBe(0);
      expect(result.proteinG).toBe(0);
      expect(result.carbsG).toBe(0);
    });
  });
  
  describe('validateNutrition', () => {
    it('should validate plausible nutrition values', () => {
      const nutrition: NutritionValues = {
        caloriesKcal: 500,
        proteinG: 30,
        carbsG: 50,
        fatG: 20,
        fiberG: 10,
        sugarG: 15,
        sodiumMg: 500,
      };
      
      const result = NutritionCalculator.validateNutrition(nutrition);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should reject implausible values', () => {
      const nutrition: NutritionValues = {
        caloriesKcal: 10000, // Too high
        proteinG: 30,
        carbsG: 50,
        fatG: 20,
        fiberG: 10,
        sugarG: 15,
        sodiumMg: 500,
      };
      
      const result = NutritionCalculator.validateNutrition(nutrition);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
    
    it('should reject negative values', () => {
      const nutrition: NutritionValues = {
        caloriesKcal: -100,
        proteinG: 30,
        carbsG: 50,
        fatG: 20,
        fiberG: 10,
        sugarG: 15,
        sodiumMg: 500,
      };
      
      const result = NutritionCalculator.validateNutrition(nutrition);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('negative'))).toBe(true);
    });
    
    it('should reject non-finite values', () => {
      const nutrition: NutritionValues = {
        caloriesKcal: Infinity,
        proteinG: 30,
        carbsG: 50,
        fatG: 20,
        fiberG: 10,
        sugarG: 15,
        sodiumMg: 500,
      };
      
      const result = NutritionCalculator.validateNutrition(nutrition);
      
      expect(result.valid).toBe(false);
    });
  });
  
  describe('mergeUserOverride', () => {
    it('should merge user override with calculated values', () => {
      const calculated: NutritionValues = {
        caloriesKcal: 200,
        proteinG: 30,
        carbsG: 20,
        fatG: 5,
        fiberG: 2,
        sugarG: 10,
        sodiumMg: 400,
      };
      
      const userOverride: Partial<NutritionValues> = {
        caloriesKcal: 220,
        proteinG: 35,
      };
      
      const result = NutritionCalculator.mergeUserOverride(calculated, userOverride);
      
      expect(result.caloriesKcal).toBe(220);
      expect(result.proteinG).toBe(35);
      expect(result.carbsG).toBe(20); // Unchanged
      expect(result.fatG).toBe(5);   // Unchanged
    });
  });
});

describe('MealPlanCalculator', () => {
  describe('recalculatePlan', () => {
    it('should update plan entry with confirmed meal nutrition', () => {
      const planEntries = [
        {
          id: '1',
          planId: 'plan1',
          mealType: 'breakfast' as MealType,
          targetTime: '08:00',
          targetNutrition: { caloriesKcal: 400, proteinG: 20, carbsG: 50, fatG: 15, fiberG: 5, sugarG: 10, sodiumMg: 300 },
          suggestedFoods: ['Oatmeal', 'Eggs'],
          isLocked: false,
          lockedBy: null as 'user' | 'system' | null,
          orderIndex: 0,
          createdAt: 0,
          updatedAt: 0,
        },
        {
          id: '2',
          planId: 'plan1',
          mealType: 'lunch' as MealType,
          targetTime: '12:00',
          targetNutrition: { caloriesKcal: 600, proteinG: 30, carbsG: 75, fatG: 20, fiberG: 10, sugarG: 15, sodiumMg: 500 },
          suggestedFoods: ['Salad', 'Chicken'],
          isLocked: false,
          lockedBy: null as 'user' | 'system' | null,
          orderIndex: 1,
          createdAt: 0,
          updatedAt: 0,
        },
      ];
      
      const confirmedMealNutrition: NutritionValues = {
        caloriesKcal: 450,
        proteinG: 25,
        carbsG: 45,
        fatG: 18,
        fiberG: 6,
        sugarG: 8,
        sodiumMg: 350,
      };
      
      const result = MealPlanCalculator.recalculatePlan(
        planEntries,
        confirmedMealNutrition,
        'breakfast'
      );
      
      expect(result[0].targetNutrition.caloriesKcal).toBe(450);
      expect(result[1].targetNutrition.caloriesKcal).toBe(600); // Unchanged
    });
    
    it('should not update locked entries', () => {
      const planEntries = [
        {
          id: '1',
          planId: 'plan1',
          mealType: 'breakfast' as MealType,
          targetTime: '08:00',
          targetNutrition: { caloriesKcal: 400, proteinG: 20, carbsG: 50, fatG: 15, fiberG: 5, sugarG: 10, sodiumMg: 300 },
          suggestedFoods: ['Oatmeal'],
          isLocked: true,
          lockedBy: 'user' as 'user' | 'system',
          orderIndex: 0,
          createdAt: 0,
          updatedAt: 0,
        },
      ];
      
      const confirmedMealNutrition: NutritionValues = {
        caloriesKcal: 450,
        proteinG: 25,
        carbsG: 45,
        fatG: 18,
        fiberG: 6,
        sugarG: 8,
        sodiumMg: 350,
      };
      
      const result = MealPlanCalculator.recalculatePlan(
        planEntries,
        confirmedMealNutrition,
        'breakfast'
      );
      
      expect(result[0].targetNutrition.caloriesKcal).toBe(400); // Unchanged
    });
  });
});
