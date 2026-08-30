/**
 * Unit tests for AI Response Validation
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { AIResponseSchema, type AIResponse } from '../src/services/ai-analysis';

describe('AIResponseSchema', () => {
  describe('valid responses', () => {
    it('should validate a correct AI response', () => {
      const validResponse = {
        schemaVersion: 1,
        mealName: 'Grilled chicken with rice',
        mealType: 'lunch',
        foods: [
          {
            name: 'Grilled chicken breast',
            normalizedName: 'chicken_breast_grilled',
            estimatedQuantity: 150,
            unit: 'g',
            confidence: 0.9,
            caloriesKcal: 248,
            proteinG: 46,
            carbsG: 0,
            fatG: 5.4,
            fiberG: 0,
            sugarG: 0,
            sodiumMg: 110,
          },
        ],
        overallConfidence: 0.85,
        warnings: [],
        needsUserReview: false,
      };
      
      const result = AIResponseSchema.safeParse(validResponse);
      
      expect(result.success).toBe(true);
    });
    
    it('should allow null normalizedName', () => {
      const responseWithNullName = {
        schemaVersion: 1,
        mealName: 'Unknown dish',
        mealType: 'dinner',
        foods: [
          {
            name: 'Some food',
            normalizedName: null,
            estimatedQuantity: 100,
            unit: 'g',
            confidence: 0.5,
            caloriesKcal: 150,
            proteinG: 10,
            carbsG: 15,
            fatG: 5,
            fiberG: 2,
            sugarG: 5,
            sodiumMg: 200,
          },
        ],
        overallConfidence: 0.5,
        warnings: ['Unable to identify food with high confidence'],
        needsUserReview: true,
      };
      
      const result = AIResponseSchema.safeParse(responseWithNullName);
      
      expect(result.success).toBe(true);
    });
    
    it('should validate multiple foods', () => {
      const multiFoodResponse = {
        schemaVersion: 1,
        mealName: 'Complete breakfast',
        mealType: 'breakfast',
        foods: [
          {
            name: 'Scrambled eggs',
            normalizedName: 'egg_scrambled',
            estimatedQuantity: 100,
            unit: 'g',
            confidence: 0.95,
            caloriesKcal: 166,
            proteinG: 14,
            carbsG: 2,
            fatG: 12,
            fiberG: 0,
            sugarG: 2,
            sodiumMg: 190,
          },
          {
            name: 'Whole wheat toast',
            normalizedName: 'bread_whole_wheat',
            estimatedQuantity: 30,
            unit: 'g',
            confidence: 0.9,
            caloriesKcal: 69,
            proteinG: 3.6,
            carbsG: 12,
            fatG: 1.1,
            fiberG: 2,
            sugarG: 1.4,
            sodiumMg: 132,
          },
          {
            name: 'Orange juice',
            normalizedName: 'orange_juice',
            estimatedQuantity: 240,
            unit: 'ml',
            confidence: 0.85,
            caloriesKcal: 110,
            proteinG: 2,
            carbsG: 26,
            fatG: 0,
            fiberG: 0,
            sugarG: 21,
            sodiumMg: 0,
          },
        ],
        overallConfidence: 0.9,
        warnings: [],
        needsUserReview: false,
      };
      
      const result = AIResponseSchema.safeParse(multiFoodResponse);
      
      expect(result.success).toBe(true);
    });
  });
  
  describe('invalid responses', () => {
    it('should reject missing schemaVersion', () => {
      const invalidResponse = {
        mealName: 'Test meal',
        mealType: 'lunch',
        foods: [],
        overallConfidence: 0.8,
        warnings: [],
        needsUserReview: false,
      };
      
      const result = AIResponseSchema.safeParse(invalidResponse);
      
      expect(result.success).toBe(false);
    });
    
    it('should reject invalid schemaVersion', () => {
      const invalidResponse = {
        schemaVersion: 2,
        mealName: 'Test meal',
        mealType: 'lunch',
        foods: [],
        overallConfidence: 0.8,
        warnings: [],
        needsUserReview: false,
      };
      
      const result = AIResponseSchema.safeParse(invalidResponse);
      
      expect(result.success).toBe(false);
    });
    
    it('should reject invalid mealType', () => {
      const invalidResponse = {
        schemaVersion: 1,
        mealName: 'Test meal',
        mealType: 'brunch', // Invalid
        foods: [],
        overallConfidence: 0.8,
        warnings: [],
        needsUserReview: false,
      };
      
      const result = AIResponseSchema.safeParse(invalidResponse);
      
      expect(result.success).toBe(false);
    });
    
    it('should reject empty foods array', () => {
      const invalidResponse = {
        schemaVersion: 1,
        mealName: 'Test meal',
        mealType: 'lunch',
        foods: [],
        overallConfidence: 0.8,
        warnings: [],
        needsUserReview: false,
      };
      
      const result = AIResponseSchema.safeParse(invalidResponse);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least one');
      }
    });
    
    it('should reject negative quantity', () => {
      const invalidResponse = {
        schemaVersion: 1,
        mealName: 'Test meal',
        mealType: 'lunch',
        foods: [
          {
            name: 'Food',
            normalizedName: null,
            estimatedQuantity: -50, // Invalid
            unit: 'g',
            confidence: 0.9,
            caloriesKcal: 100,
            proteinG: 10,
            carbsG: 10,
            fatG: 5,
            fiberG: 2,
            sugarG: 5,
            sodiumMg: 100,
          },
        ],
        overallConfidence: 0.9,
        warnings: [],
        needsUserReview: false,
      };
      
      const result = AIResponseSchema.safeParse(invalidResponse);
      
      expect(result.success).toBe(false);
    });
    
    it('should reject negative nutrition values', () => {
      const invalidResponse = {
        schemaVersion: 1,
        mealName: 'Test meal',
        mealType: 'lunch',
        foods: [
          {
            name: 'Food',
            normalizedName: null,
            estimatedQuantity: 100,
            unit: 'g',
            confidence: 0.9,
            caloriesKcal: -100, // Invalid
            proteinG: 10,
            carbsG: 10,
            fatG: 5,
            fiberG: 2,
            sugarG: 5,
            sodiumMg: 100,
          },
        ],
        overallConfidence: 0.9,
        warnings: [],
        needsUserReview: false,
      };
      
      const result = AIResponseSchema.safeParse(invalidResponse);
      
      expect(result.success).toBe(false);
    });
    
    it('should reject confidence outside 0-1 range', () => {
      const invalidResponse = {
        schemaVersion: 1,
        mealName: 'Test meal',
        mealType: 'lunch',
        foods: [
          {
            name: 'Food',
            normalizedName: null,
            estimatedQuantity: 100,
            unit: 'g',
            confidence: 1.5, // Invalid
            caloriesKcal: 100,
            proteinG: 10,
            carbsG: 10,
            fatG: 5,
            fiberG: 2,
            sugarG: 5,
            sodiumMg: 100,
          },
        ],
        overallConfidence: 0.9,
        warnings: [],
        needsUserReview: false,
      };
      
      const result = AIResponseSchema.safeParse(invalidResponse);
      
      expect(result.success).toBe(false);
    });
    
    it('should reject implausibly high calorie values', () => {
      const invalidResponse = {
        schemaVersion: 1,
        mealName: 'Test meal',
        mealType: 'lunch',
        foods: [
          {
            name: 'Food',
            normalizedName: null,
            estimatedQuantity: 100,
            unit: 'g',
            confidence: 0.9,
            caloriesKcal: 5000, // Implausible
            proteinG: 10,
            carbsG: 10,
            fatG: 5,
            fiberG: 2,
            sugarG: 5,
            sodiumMg: 100,
          },
        ],
        overallConfidence: 0.9,
        warnings: [],
        needsUserReview: false,
      };
      
      const result = AIResponseSchema.safeParse(invalidResponse);
      
      expect(result.success).toBe(false);
    });
    
    it('should reject food name over 200 characters', () => {
      const invalidResponse = {
        schemaVersion: 1,
        mealName: 'Test meal',
        mealType: 'lunch',
        foods: [
          {
            name: 'A'.repeat(201), // Too long
            normalizedName: null,
            estimatedQuantity: 100,
            unit: 'g',
            confidence: 0.9,
            caloriesKcal: 100,
            proteinG: 10,
            carbsG: 10,
            fatG: 5,
            fiberG: 2,
            sugarG: 5,
            sodiumMg: 100,
          },
        ],
        overallConfidence: 0.9,
        warnings: [],
        needsUserReview: false,
      };
      
      const result = AIResponseSchema.safeParse(invalidResponse);
      
      expect(result.success).toBe(false);
    });
  });
  
  describe('edge cases', () => {
    it('should accept boundary confidence values (0 and 1)', () => {
      const boundaryResponse = {
        schemaVersion: 1,
        mealName: 'Test',
        mealType: 'snack',
        foods: [
          {
            name: 'Food',
            normalizedName: null,
            estimatedQuantity: 100,
            unit: 'g',
            confidence: 0,
            caloriesKcal: 0,
            proteinG: 0,
            carbsG: 0,
            fatG: 0,
            fiberG: 0,
            sugarG: 0,
            sodiumMg: 0,
          },
        ],
        overallConfidence: 1,
        warnings: [],
        needsUserReview: false,
      };
      
      const result = AIResponseSchema.safeParse(boundaryResponse);
      
      expect(result.success).toBe(true);
    });
    
    it('should accept 50 foods (max allowed)', () => {
      const maxFoodsResponse = {
        schemaVersion: 1,
        mealName: 'Big meal',
        mealType: 'dinner',
        foods: Array.from({ length: 50 }, (_, i) => ({
          name: `Food ${i + 1}`,
          normalizedName: null,
          estimatedQuantity: 50,
          unit: 'g',
          confidence: 0.8,
          caloriesKcal: 50,
          proteinG: 5,
          carbsG: 5,
          fatG: 2.5,
          fiberG: 1,
          sugarG: 2,
          sodiumMg: 50,
        })),
        overallConfidence: 0.8,
        warnings: [],
        needsUserReview: true,
      };
      
      const result = AIResponseSchema.safeParse(maxFoodsResponse);
      
      expect(result.success).toBe(true);
    });
    
    it('should reject more than 50 foods', () => {
      const tooManyFoodsResponse = {
        schemaVersion: 1,
        mealName: 'Too big',
        mealType: 'dinner',
        foods: Array.from({ length: 51 }, (_, i) => ({
          name: `Food ${i + 1}`,
          normalizedName: null,
          estimatedQuantity: 50,
          unit: 'g',
          confidence: 0.8,
          caloriesKcal: 50,
          proteinG: 5,
          carbsG: 5,
          fatG: 2.5,
          fiberG: 1,
          sugarG: 2,
          sodiumMg: 50,
        })),
        overallConfidence: 0.8,
        warnings: [],
        needsUserReview: true,
      };
      
      const result = AIResponseSchema.safeParse(tooManyFoodsResponse);
      
      expect(result.success).toBe(false);
    });
  });
});
