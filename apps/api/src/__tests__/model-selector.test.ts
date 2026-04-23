/**
 * Tests for AI Model Selector
 * Run with: pnpm test -- model-selector.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  selectModel,
  analyzeTaskRequirements,
  getModel,
  getModelsByProvider,
  compareModels,
  MODELS,
  type TaskRequirements,
} from '../src/utils/model-selector';

describe('Model Selector', () => {
  describe('analyzeTaskRequirements', () => {
    it('should identify simple tasks', () => {
      const req = analyzeTaskRequirements('Hello, how are you?');
      expect(req.complexity).toBe('simple');
      expect(req.estimatedInputTokens).toBeGreaterThan(0);
    });

    it('should identify complex tasks', () => {
      const req = analyzeTaskRequirements('Analyze this multi-step problem and provide a detailed solution with reasoning');
      expect(req.complexity).toBe('complex');
      expect(req.needsReasoning).toBe(true);
    });

    it('should identify expert tasks', () => {
      const req = analyzeTaskRequirements('Provide a novel research-level analysis of machine learning architectures for edge deployment');
      expect(req.complexity).toBe('expert');
    });

    it('should detect vision requirements', () => {
      const req = analyzeTaskRequirements('Analyze this image and describe what you see');
      expect(req.needsVision).toBe(true);
    });

    it('should detect code requirements', () => {
      const req = analyzeTaskRequirements('Write a TypeScript function to calculate BMI');
      expect(req.needsCode).toBe(true);
    });

    it('should detect JSON mode requirements', () => {
      const req = analyzeTaskRequirements('Return the result as JSON with fields: name, age, score');
      expect(req.needsJsonMode).toBe(true);
    });
  });

  describe('selectModel', () => {
    it('should select cheapest capable model for simple tasks', () => {
      const req: TaskRequirements = {
        complexity: 'simple',
        needsVision: false,
        needsFunctionCalling: false,
        needsJsonMode: false,
        estimatedInputTokens: 100,
        estimatedOutputTokens: 200,
        needsReasoning: false,
        needsCode: false,
        needsCreative: false,
      };

      const selection = selectModel(req, { preferLowestCost: true });
      expect(selection.model).toBeDefined();
      expect(selection.estimatedCost).toBeGreaterThan(0);
      expect(selection.confidence).toBeGreaterThan(0);
    });

    it('should select high-quality model for expert tasks', () => {
      const req: TaskRequirements = {
        complexity: 'expert',
        needsVision: false,
        needsFunctionCalling: true,
        needsJsonMode: true,
        estimatedInputTokens: 3000,
        estimatedOutputTokens: 2000,
        needsReasoning: true,
        needsCode: true,
        needsCreative: false,
      };

      const selection = selectModel(req, { preferLowestCost: false });
      expect(selection.model.qualityScore).toBeGreaterThanOrEqual(9);
      expect(selection.model.capabilities.highComplexity).toBe(true);
    });

    it('should filter out models that do not meet requirements', () => {
      const req: TaskRequirements = {
        complexity: 'moderate',
        needsVision: true,
        needsFunctionCalling: false,
        needsJsonMode: false,
        estimatedInputTokens: 500,
        estimatedOutputTokens: 1000,
        needsReasoning: true,
        needsCode: false,
        needsCreative: false,
      };

      const selection = selectModel(req);
      expect(selection.model.capabilities.vision).toBe(true);
    });

    it('should throw when no models meet requirements', () => {
      const req: TaskRequirements = {
        complexity: 'expert',
        needsVision: true,
        needsFunctionCalling: false,
        needsJsonMode: false,
        estimatedInputTokens: 500000, // Exceeds all context windows
        estimatedOutputTokens: 1000,
        needsReasoning: true,
        needsCode: false,
        needsCreative: false,
      };

      expect(() => selectModel(req)).toThrow('No models available');
    });
  });

  describe('MODELS', () => {
    it('should have both OpenAI and Gemini models', () => {
      const openaiModels = getModelsByProvider('openai');
      const geminiModels = getModelsByProvider('gemini');

      expect(openaiModels.length).toBeGreaterThan(0);
      expect(geminiModels.length).toBeGreaterThan(0);
    });

    it('should have correct pricing structure', () => {
      Object.values(MODELS).forEach(model => {
        expect(model.inputPricePer1M).toBeGreaterThanOrEqual(0);
        expect(model.outputPricePer1M).toBeGreaterThanOrEqual(model.inputPricePer1M);
        expect(model.qualityScore).toBeGreaterThanOrEqual(1);
        expect(model.qualityScore).toBeLessThanOrEqual(10);
      });
    });

    it('should have Gemini models priced lower than OpenAI equivalents', () => {
      const geminiFlash = MODELS['gemini-1.5-flash'];
      const gpt4oMini = MODELS['gpt-4o-mini'];

      expect(geminiFlash.inputPricePer1M).toBeLessThan(gpt4oMini.inputPricePer1M);
      expect(geminiFlash.outputPricePer1M).toBeLessThan(gpt4oMini.outputPricePer1M);
    });
  });

  describe('compareModels', () => {
    it('should compare models for a given task', () => {
      const req: TaskRequirements = {
        complexity: 'moderate',
        needsVision: false,
        needsFunctionCalling: true,
        needsJsonMode: true,
        estimatedInputTokens: 1000,
        estimatedOutputTokens: 500,
        needsReasoning: true,
        needsCode: false,
        needsCreative: false,
      };

      const comparison = compareModels(req, ['gpt-4o-mini', 'gemini-1.5-flash', 'gpt-4o']);

      expect(comparison.length).toBe(3);
      comparison.forEach(c => {
        expect(c.model).toBeDefined();
        expect(typeof c.cost).toBe('number');
        expect(typeof c.capable).toBe('boolean');
      });
    });
  });

  describe('Cost calculations', () => {
    it('should calculate cost correctly', () => {
      const model = MODELS['gpt-4o-mini'];
      const cost = (1000000 / 1_000_000) * model.inputPricePer1M + (1000000 / 1_000_000) * model.outputPricePer1M;

      expect(cost).toBe(model.inputPricePer1M + model.outputPricePer1M);
    });

    it('should show Gemini is cheaper for same token count', () => {
      const inputTokens = 100000;
      const outputTokens = 50000;

      const geminiCost = (inputTokens / 1_000_000) * MODELS['gemini-1.5-flash'].inputPricePer1M +
                         (outputTokens / 1_000_000) * MODELS['gemini-1.5-flash'].outputPricePer1M;

      const openAICost = (inputTokens / 1_000_000) * MODELS['gpt-4o-mini'].inputPricePer1M +
                         (outputTokens / 1_000_000) * MODELS['gpt-4o-mini'].outputPricePer1M;

      expect(geminiCost).toBeLessThan(openAICost);
    });
  });
});
