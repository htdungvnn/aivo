/// <reference types="jest" />
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { invokeChefAgent } from '../services/nutrition/chef-agent';

// Mock the OpenAI utility
const mockCreate = jest.fn();
const mockOpenAI = {
  chat: {
    completions: {
      create: mockCreate,
    },
  },
};

jest.mock('../utils/openai', () => ({
  openai: mockOpenAI,
}));

describe('Chef Agent', () => {
  const baseContext = {
    availableIngredients: [] as Array<{ name: string; quantity: number; unit: string }>,
    allergies: [] as string[],
    intolerances: [] as string[],
    skillLevel: 'beginner' as const,
    kitchenTools: [] as string[],
    dietType: 'omnivore' as const,
    macroPreferences: undefined as any,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('invokeChefAgent', () => {
    it('returns successful response with recipe', async () => {
      const mockRecipe = {
        name: 'Chicken Stir Fry',
        description: 'A healthy stir fry',
        ingredients: [
          { name: 'chicken', quantity: 500, unit: 'g', notes: '' },
          { name: 'rice', quantity: 2, unit: 'cup', notes: '' },
        ],
        instructions: [
          { step: 1, text: 'Cook chicken', durationMinutes: 10, tips: [] },
          { step: 2, text: 'Add rice', tips: ['Use brown rice'] },
        ],
        tips: ['Serve hot'],
        warnings: [],
        allergenAlerts: [],
        estimatedPrepTimeMinutes: 15,
        estimatedCookTimeMinutes: 20,
      };

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockRecipe) } }],
      });

      const result = await invokeChefAgent({
        query: 'Give me a recipe',
        context: baseContext,
      });

      expect(result.agentType).toBe('chef');
      expect(result.success).toBe(true);
      expect(result.content).toContain('Chicken Stir Fry');
      expect(result.content).toContain('A healthy stir fry');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.warnings).toEqual([]);
      expect(result.metadata).toHaveProperty('recipe');
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('calculates confidence based on ingredient match', async () => {
      const mockRecipe = {
        name: 'Test Recipe',
        description: '',
        ingredients: [
          { name: 'chicken', quantity: 500, unit: 'g', notes: '' },
          { name: 'rice', quantity: 2, unit: 'cup', notes: '' },
          { name: 'vegetables', quantity: 1, unit: 'cup', notes: '' },
        ],
        instructions: [],
        tips: [],
        warnings: [],
        allergenAlerts: [],
        estimatedPrepTimeMinutes: 10,
        estimatedCookTimeMinutes: 10,
      };

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockRecipe) } }],
      });

      const context = {
        ...baseContext,
        availableIngredients: [
          { name: 'chicken', quantity: 500, unit: 'g' },
          { name: 'rice', quantity: 2, unit: 'cup' },
        ],
      };

      const result = await invokeChefAgent({
        query: 'recipe',
        context,
      });

      // 2 out of 3 ingredients matched => match ratio 0.667, confidence = 0.3 + 0.667*0.7 = 0.767
      expect(result.confidence).toBeCloseTo(0.767, 1);
    });

    it('returns 0.5 confidence when no ingredients provided', async () => {
      const mockRecipe = {
        name: 'Generic Recipe',
        description: '',
        ingredients: [{ name: 'something', quantity: 1, unit: '', notes: '' }],
        instructions: [],
        tips: [],
        warnings: [],
        allergenAlerts: [],
        estimatedPrepTimeMinutes: 10,
        estimatedCookTimeMinutes: 10,
      };

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockRecipe) } }],
      });

      const result = await invokeChefAgent({
        query: 'recipe',
        context: baseContext, // no availableIngredients
      });

      expect(result.confidence).toBe(0.5);
    });

    it('adds warnings for allergen matches', async () => {
      const mockRecipe = {
        name: 'Peanut Butter Toast',
        description: '',
        ingredients: [{ name: 'bread', quantity: 2, unit: 'slice', notes: '' }],
        instructions: [],
        tips: [],
        warnings: [],
        allergenAlerts: ['Peanuts'],
        estimatedPrepTimeMinutes: 5,
        estimatedCookTimeMinutes: 0,
      };

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockRecipe) } }],
      });

      const context = {
        ...baseContext,
        allergies: ['peanut'], // use 'peanut' to match 'Peanuts'
      };

      const result = await invokeChefAgent({
        query: 'recipe',
        context,
      });

      expect(result.warnings.some(w => w.includes('CRITICAL') && w.includes('peanut'))).toBe(true);
    });

    it('handles OpenAI API errors gracefully', async () => {
      mockCreate.mockRejectedValue(new Error('OpenAI rate limit'));

      const result = await invokeChefAgent({
        query: 'recipe',
        context: baseContext,
      });

      expect(result.success).toBe(false);
      expect(result.content).toContain('Unable to generate recipe');
      expect(result.confidence).toBe(0);
      expect(result.metadata).toHaveProperty('error');
    });

    it('handles invalid recipe structure after parsing', async () => {
      // Return valid JSON but not an object (e.g., a string)
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: '"just a string"' } }],
      });

      const result = await invokeChefAgent({
        query: 'recipe',
        context: baseContext,
      });

      expect(result.success).toBe(false);
      expect(result.metadata.error).toContain('Invalid recipe response');
    });

    it('formats recipe as readable text with all sections', async () => {
      const mockRecipe = {
        name: 'Test Dish',
        description: 'A delicious meal',
        ingredients: [
          { name: 'ing1', quantity: 100, unit: 'g', notes: 'fresh' },
        ],
        instructions: [
          { step: 1, text: 'Do something', tips: ['Be careful'] },
        ],
        tips: ['Tip 1', 'Tip 2'],
        warnings: ['High sodium'],
        allergenAlerts: [],
        estimatedPrepTimeMinutes: 20,
        estimatedCookTimeMinutes: 30,
      };

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockRecipe) } }],
      });

      const result = await invokeChefAgent({
        query: 'recipe',
        context: baseContext,
      });

      expect(result.content).toContain('# Test Dish');
      expect(result.content).toContain('**Prep Time:** 20 min');
      expect(result.content).toContain('**Cook Time:** 30 min');
      expect(result.content).toContain('## Ingredients');
      expect(result.content).toContain('1. ing1: 100 g');
      expect(result.content).toContain('## Instructions');
      expect(result.content).toContain('1. Do something');
      expect(result.content).toContain('## Tips');
      expect(result.content).toContain('• Tip 1');
      expect(result.content).toContain('## ⚠️ Warnings');
      expect(result.content).toContain('• High sodium');
    });
  });
});
