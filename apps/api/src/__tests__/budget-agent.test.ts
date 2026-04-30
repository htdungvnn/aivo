/// <reference types="jest" />
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { invokeBudgetAgent } from '../services/nutrition/budget-agent';

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

describe('Budget Agent', () => {
  const baseContext = {
    budget: undefined as any,
    dietaryRestrictions: [] as string[],
    allergies: [] as string[],
    intolerances: [] as string[],
    householdSize: undefined as number | undefined,
    mealFrequency: undefined as string | undefined,
    preferredCuisines: [] as string[],
    cookingSkills: [] as string[],
    availableAppliances: [] as string[],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('invokeBudgetAgent', () => {
    it('returns successful cost analysis with savings tips', async () => {
      const mockAnalysis = {
        costAnalysis: {
          estimatedTotalCost: 20,
          costPerServing: 5,
          servings: 4,
          costBreakdown: [
            { ingredient: 'chicken', cost: 10, percentage: 50, notes: '' },
            { ingredient: 'rice', cost: 5, percentage: 25, notes: '' },
            { ingredient: 'vegetables', cost: 5, percentage: 25, notes: '' },
          ],
        },
        savingsOpportunities: [
          {
            strategy: 'Bulk Purchase',
            potentialSavings: 5,
            notes: 'Buying in bulk reduces cost per unit',
          },
          {
            strategy: 'Seasonal',
            potentialSavings: 3,
            notes: 'Seasonal produce is cheaper',
          },
        ],
        groceryList: [
          { item: 'chicken', quantity: '1 kg', estimatedCost: 15, cheaperAlternative: 'turkey', buyInBulk: false },
          { item: 'rice', quantity: '2 kg', estimatedCost: 10, cheaperAlternative: 'pasta', buyInBulk: true },
        ],
        budgetFriendlyAlternatives: [
          {
            original: 'beef',
            alternative: 'chicken',
            savings: 8,
            notes: 'Chicken is typically less expensive',
          },
        ],
        mealPrepTips: [
          'Cook large batches and freeze',
          'Plan meals ahead to reduce waste',
        ],
        confidence: 0.85,
      };

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockAnalysis) } }],
      });

      const result = await invokeBudgetAgent({
        query: 'cheap meal ideas',
        context: {
          ...baseContext,
          budget: 100,
          householdSize: 2,
        },
      });

      expect(result.agentType).toBe('budget');
      expect(result.success).toBe(true);
      expect(result.content).toContain('# Budget Nutrition Analysis');
      expect(result.content).toContain('## Cost Summary');
      expect(result.content).toContain('$20.00'); // total recipe cost
      expect(result.content).toContain('4'); // servings
      expect(result.content).toContain('$5.00'); // per serving
      expect(result.content).toContain('Bulk Purchase');
      expect(result.content).toContain('seasonal');
      expect(result.content).toContain('chicken');
      expect(result.confidence).toBe(0.85);
      expect(result.warnings).toEqual([]);
      expect(result.metadata).toHaveProperty('analysis');
      expect(result.metadata.totalWeeklyEstimate).toHaveProperty('min');
      expect(result.metadata.totalWeeklyEstimate).toHaveProperty('max');
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('handles minimal context with no budget specified', async () => {
      const mockAnalysis = {
        costAnalysis: {
          estimatedTotalCost: 15,
          costPerServing: 3.75,
          servings: 4,
          costBreakdown: [],
        },
        savingsOpportunities: [],
        groceryList: [],
        budgetFriendlyAlternatives: [],
        mealPrepTips: [],
        confidence: 0.6,
      };

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockAnalysis) } }],
      });

      const result = await invokeBudgetAgent({
        query: 'budget tips',
        context: baseContext,
      });

      expect(result.success).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.content).toContain('# Budget Nutrition Analysis');
    });

    it('handles OpenAI API errors gracefully', async () => {
      mockCreate.mockRejectedValue(new Error('OpenAI timeout'));

      const result = await invokeBudgetAgent({
        query: 'budget tips',
        context: baseContext,
      });

      expect(result.success).toBe(false);
      expect(result.content).toContain('Unable to provide budget analysis');
      expect(result.confidence).toBe(0);
      expect(result.warnings).toContain('Budget analysis unavailable - please try again');
      expect(result.metadata).toHaveProperty('error');
    });

    it('handles invalid JSON response', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'not json' } }],
      });

      const result = await invokeBudgetAgent({
        query: 'budget tips',
        context: baseContext,
      });

      expect(result.success).toBe(false);
      expect(result.metadata.error).toContain('not json');
    });

    it('formats analysis with all sections when data provided', async () => {
      const mockAnalysis = {
        costAnalysis: {
          estimatedTotalCost: 25,
          costPerServing: 6.25,
          servings: 4,
          costBreakdown: [
            { ingredient: 'proteins', cost: 12, percentage: 48, notes: 'chicken and beans' },
          ],
        },
        savingsOpportunities: [
          {
            strategy: 'Coupon',
            potentialSavings: 2,
            notes: 'Weekly coupons available',
          },
        ],
        groceryList: [
          { item: 'beans', quantity: '2 cans', estimatedCost: 3, cheaperAlternative: 'lentils', buyInBulk: false },
        ],
        budgetFriendlyAlternatives: [
          {
            original: 'steak',
            alternative: 'chicken',
            savings: 10,
            notes: 'Chicken is cheaper',
          },
        ],
        mealPrepTips: [
          'Plan meals ahead',
        ],
        confidence: 0.75,
      };

      const contentStr = JSON.stringify(mockAnalysis);
      console.log('CONTENT SENT:', contentStr);
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: contentStr } }],
      });

      const result = await invokeBudgetAgent({
        query: 'budget tips',
        context: baseContext,
      });

      // Debug: log the analysis to see budgetFriendlyAlternatives structure
      console.log('DEBUG budgetFriendlyAlternatives:', JSON.stringify(result.metadata.analysis.budgetFriendlyAlternatives, null, 2));

      const content = result.content;
      expect(content).toContain('# Budget Nutrition Analysis');
      expect(content).toContain('## Cost Summary');
      expect(content).toContain('$25.00');
      expect(content).toContain('$6.25');
      expect(content).toContain('proteins');
      expect(content).toContain('## 💰 Savings Opportunities');
      expect(content).toContain('Coupon');
      expect(content).toContain('## 🛒 Grocery List');
      expect(content).toContain('beans');
      expect(content).toContain('## 🔄 Budget Swaps');
      expect(content).toContain('steak');
      expect(content).toContain('chicken');
      expect(content).toContain('## 🥘 Meal Prep Tips');
      expect(content).toContain('Plan meals ahead');
      expect(content).toContain('## Weekly Budget Estimate');
      expect(content).toContain('---');
      expect(content).toContain('*Confidence: 75%*');
    });
  });
});
