import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  orchestrateNutritionConsult,
  selectAgents,
  identifyPrimaryAgent,
  synthesizeResponse,
} from '../services/nutrition/orchestrator';

// Mock the individual agents
jest.mock('../services/nutrition/chef-agent', () => ({
  invokeChefAgent: jest.fn(),
}));

jest.mock('../services/nutrition/medical-agent', () => ({
  invokeMedicalAgent: jest.fn(),
}));

jest.mock('../services/nutrition/budget-agent', () => ({
  invokeBudgetAgent: jest.fn(),
}));

import { invokeChefAgent } from '../services/nutrition/chef-agent';
import { invokeMedicalAgent } from '../services/nutrition/medical-agent';
import { invokeBudgetAgent } from '../services/nutrition/budget-agent';

describe('Nutrition Orchestrator', () => {
  const baseRequest = {
    query: 'I want to eat healthier',
    context: {
      medicalConditions: [] as string[],
      medications: [] as string[],
      budget: undefined,
      availableIngredients: undefined,
    } as any,
    sessionId: undefined,
    preferredAgents: undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('selectAgents', () => {
    it('includes preferred agents when specified', () => {
      const result = selectAgents('query', {}, ['chef', 'budget']);
      expect(result).toEqual(['chef', 'budget']);
    });

    it('deduplicates preferred agents', () => {
      const result = selectAgents('query', {}, ['chef', 'chef', 'budget']);
      expect(result).toEqual(['chef', 'budget']);
    });

    it('includes medical agent for medical conditions', () => {
      const result = selectAgents('query', { medicalConditions: ['diabetes'] }, undefined);
      expect(result).toContain('medical');
    });

    it('includes medical agent for medications', () => {
      const result = selectAgents('query', { medications: ['metformin'] }, undefined);
      expect(result).toContain('medical');
    });

    it('includes medical agent for medication-related queries', () => {
      const result = selectAgents('What medication should I take?', {}, undefined);
      expect(result).toContain('medical');
    });

    it('includes medical agent for condition-related queries', () => {
      const result = selectAgents('Is this safe for my diabetes?', {}, undefined);
      expect(result).toContain('medical');
    });

    it('includes chef agent for recipe queries', () => {
      const result = selectAgents('Can you give me a recipe?', {}, undefined);
      expect(result).toContain('chef');
    });

    it('includes chef agent for meal queries', () => {
      const result = selectAgents('What should I cook for dinner?', {}, undefined);
      expect(result).toContain('chef');
    });

    it('includes chef agent when ingredients available', () => {
      const result = selectAgents('query', { availableIngredients: ['chicken', 'rice'] }, undefined);
      expect(result).toContain('chef');
    });

    it('includes budget agent for budget concerns', () => {
      const result = selectAgents('I need cheap meal ideas', {}, undefined);
      expect(result).toContain('budget');
    });

    it('includes all agents when no specific context', () => {
      const result = selectAgents('Just a general question', {}, undefined);
      expect(result).toContain('chef');
      expect(result).toContain('medical');
      expect(result).toContain('budget');
    });

    it('returns deduplicated list', () => {
      const result = selectAgents('recipe for cheap diabetes-friendly meals', {
        medicalConditions: ['diabetes'],
        availableIngredients: ['rice'],
      }, undefined);
      expect(result).toEqual(['medical', 'chef', 'budget']);
    });
  });

  describe('identifyPrimaryAgent', () => {
    it('returns undefined for no successful responses', () => {
      const result = identifyPrimaryAgent([
        { agentType: 'chef' as const, success: false, confidence: 0, processingTimeMs: 100 },
      ]);
      expect(result).toBeUndefined();
    });

    it('returns agent with highest confidence', () => {
      const result = identifyPrimaryAgent([
        { agentType: 'chef' as const, success: true, confidence: 0.7, processingTimeMs: 100 },
        { agentType: 'medical' as const, success: true, confidence: 0.9, processingTimeMs: 200 },
        { agentType: 'budget' as const, success: true, confidence: 0.5, processingTimeMs: 50 },
      ]);
      expect(result).toBe('medical');
    });

    it('breaks ties by processing time (faster wins)', () => {
      const result = identifyPrimaryAgent([
        { agentType: 'chef' as const, success: true, confidence: 0.9, processingTimeMs: 200 },
        { agentType: 'medical' as const, success: true, confidence: 0.9, processingTimeMs: 100 },
      ]);
      expect(result).toBe('medical');
    });

    it('ignores failed responses', () => {
      const result = identifyPrimaryAgent([
        { agentType: 'chef' as const, success: true, confidence: 0.6, processingTimeMs: 100 },
        { agentType: 'medical' as const, success: false, confidence: 0.9, processingTimeMs: 200 },
      ]);
      expect(result).toBe('chef');
    });

    it('ignores responses with zero confidence', () => {
      const result = identifyPrimaryAgent([
        { agentType: 'chef' as const, success: true, confidence: 0, processingTimeMs: 100 },
        { agentType: 'medical' as const, success: true, confidence: 0.5, processingTimeMs: 200 },
      ]);
      expect(result).toBe('medical');
    });
  });

  describe('synthesizeResponse', () => {
    it('returns default message for no responses', () => {
      const result = synthesizeResponse([], 'query');
      expect(result).toContain('Unable to provide nutrition consultation');
    });

    it('returns single agent content with disclaimer', () => {
      const responses = [{
        agentType: 'chef' as const,
        success: true,
        content: 'Here is a healthy recipe...',
        confidence: 0.9,
        warnings: [],
        metadata: {},
        processingTimeMs: 100,
      }];
      const result = synthesizeResponse(responses, 'recipe?');
      expect(result).toContain('Here is a healthy recipe...');
      expect(result).toContain('Always consult with healthcare professionals');
    });

    it('synthesizes multiple agents in logical order', () => {
      const responses = [
        {
          agentType: 'chef' as const,
          success: true,
          content: '# Chef Response\n\nCook this...',
          confidence: 0.9,
          warnings: [],
          metadata: {},
          processingTimeMs: 100,
        },
        {
          agentType: 'medical' as const,
          success: true,
          content: '# Medical Analysis\n\nCheck with doctor...',
          confidence: 0.8,
          warnings: [],
          metadata: {},
          processingTimeMs: 150,
        },
        {
          agentType: 'budget' as const,
          success: true,
          content: '# Budget Tips\n\nSave money...',
          confidence: 0.7,
          warnings: [],
          metadata: {},
          processingTimeMs: 80,
        },
      ];
      const result = synthesizeResponse(responses, 'healthy eating');

      expect(result).toContain('## 🏥 Medical Safety Analysis');
      expect(result).toContain('## 👨‍🍳 Recipe & Nutrition');
      expect(result).toContain('## 💰 Budget Planning');
      expect(result).toContain('Check with doctor');
      expect(result).toContain('Cook this');
      expect(result).toContain('Save money');
    });

    it('removes agent headings from content', () => {
      const responses = [{
        agentType: 'medical' as const,
        success: true,
        content: '## Medical Analysis\n\nConsult doctor first...',
        confidence: 0.9,
        warnings: [],
        metadata: {},
        processingTimeMs: 100,
      }];
      const result = synthesizeResponse(responses, 'query');
      expect(result).not.toContain('## Medical Analysis');
      expect(result).toContain('Consult doctor first...');
    });

    it('includes disclaimer', () => {
      const responses = [{
        agentType: 'chef' as const,
        success: true,
        content: 'Recipe...',
        confidence: 0.9,
        warnings: [],
        metadata: {},
        processingTimeMs: 100,
      }];
      const result = synthesizeResponse(responses, 'query');
      expect(result).toContain('Always consult with healthcare professionals');
    });
  });

  describe('orchestrateNutritionConsult', () => {
    it('handles individual agent failure without overall failure', async () => {
      (invokeChefAgent as any).mockRejectedValue(new Error('Agent failed'));

      const result = await orchestrateNutritionConsult({
        ...baseRequest,
        query: 'recipe',
      });

      // Orchestration itself succeeded (no unhandled exception)
      expect(result.success).toBe(true);
      // Chef was attempted
      expect(result.agentsConsulted).toContain('chef');
      // No successful responses from chef
      expect(result.responses).toHaveLength(0);
      // Default message due to no successful responses
      expect(result.synthesizedAdvice).toContain('Unable to provide nutrition consultation');
      // Warning about chef failure should be recorded
      expect(result.warnings.some(w => w.includes('chef agent failed') && w.includes('Agent failed'))).toBe(true);
    });

    it('handles successful single agent response', async () => {
      (invokeChefAgent as any).mockResolvedValue({
        agentType: 'chef',
        success: true,
        content: 'Healthy recipe...',
        confidence: 0.9,
        warnings: [],
        metadata: {},
        processingTimeMs: 100,
      });

      const result = await orchestrateNutritionConsult({
        ...baseRequest,
        query: 'recipe',
        context: { availableIngredients: ['chicken'] },
      });

      expect(result.success).toBe(true);
      expect(result.agentsConsulted).toContain('chef');
      // Single agent response includes original content plus disclaimer
      expect(result.synthesizedAdvice).toContain('Healthy recipe...');
      expect(result.synthesizedAdvice).toContain('Always consult with healthcare professionals');
      expect(result.primaryAgent).toBe('chef');
    });

    it('invokes multiple agents in parallel', async () => {
      const mockChef = Promise.resolve({
        agentType: 'chef',
        success: true,
        content: 'Recipe',
        confidence: 0.9,
        warnings: [],
        metadata: {},
        processingTimeMs: 100,
      });
      const mockMedical = Promise.resolve({
        agentType: 'medical',
        success: true,
        content: 'Medical advice',
        confidence: 0.85,
        warnings: [],
        metadata: {},
        processingTimeMs: 150,
      });

      (invokeChefAgent as any).mockReturnValue(mockChef);
      (invokeMedicalAgent as any).mockReturnValue(mockMedical);

      const result = await orchestrateNutritionConsult({
        ...baseRequest,
        query: 'healthy recipe for diabetes',
        context: { medicalConditions: ['diabetes'] },
      });

      expect(result.success).toBe(true);
      expect(result.agentsConsulted).toContain('chef');
      expect(result.agentsConsulted).toContain('medical');
      expect(result.responses).toHaveLength(2);
      expect(result.synthesizedAdvice).toContain('Recipe');
      expect(result.synthesizedAdvice).toContain('Medical advice');
    });

    it('handles agent failure gracefully', async () => {
      (invokeChefAgent as any).mockRejectedValue(new Error('Chef failed'));
      (invokeMedicalAgent as any).mockResolvedValue({
        agentType: 'medical',
        success: true,
        content: 'Medical advice',
        confidence: 0.9,
        warnings: [],
        metadata: {},
        processingTimeMs: 100,
      });
      (invokeBudgetAgent as any).mockResolvedValue({
        agentType: 'budget',
        success: true,
        content: 'Budget tips',
        confidence: 0.7,
        warnings: [],
        metadata: {},
        processingTimeMs: 80,
      });

      const result = await orchestrateNutritionConsult({
        ...baseRequest,
        query: 'cheap healthy meals',
        context: { medicalConditions: ['diabetes'] },
      });

      expect(result.success).toBe(true);
      expect(result.responses).toHaveLength(2); // Only medical and budget succeeded
      // Chef failed, so it should not be in the successful responses
      expect(result.responses.some(r => r.agentType === 'chef')).toBe(false);
      // Warning about chef failure should be recorded
      expect(result.warnings.some(w => w.includes('chef agent failed') && w.includes('Chef failed'))).toBe(true);
    });

    it('generates unique sessionId if not provided', async () => {
      (invokeChefAgent as any).mockResolvedValue({
        agentType: 'chef',
        success: true,
        content: '...',
        confidence: 0.9,
        warnings: [],
        metadata: {},
        processingTimeMs: 100,
      });

      const result = await orchestrateNutritionConsult({
        ...baseRequest,
        sessionId: undefined,
      });

      expect(result.sessionId).toMatch(/^nutr_\d+_[a-z0-9]+$/);
    });

    it('preserves provided sessionId', async () => {
      (invokeChefAgent as any).mockResolvedValue({
        agentType: 'chef',
        success: true,
        content: '...',
        confidence: 0.9,
        warnings: [],
        metadata: {},
        processingTimeMs: 100,
      });

      const result = await orchestrateNutritionConsult({
        ...baseRequest,
        sessionId: 'my-session-123',
      });

      expect(result.sessionId).toBe('my-session-123');
    });

    it('collects warnings from all agents', async () => {
      (invokeChefAgent as any).mockResolvedValue({
        agentType: 'chef',
        success: true,
        content: '...',
        confidence: 0.9,
        warnings: ['Warning 1'],
        metadata: {},
        processingTimeMs: 100,
      });
      (invokeMedicalAgent as any).mockResolvedValue({
        agentType: 'medical',
        success: true,
        content: '...',
        confidence: 0.8,
        warnings: ['Warning 2'],
        metadata: {},
        processingTimeMs: 150,
      });

      const result = await orchestrateNutritionConsult({
        ...baseRequest,
        query: 'recipe for diabetes',
        context: { medicalConditions: ['diabetes'] },
      });

      expect(result.warnings).toContain('Warning 1');
      expect(result.warnings).toContain('Warning 2');
    });

    it('returns processingTimeMs', async () => {
      (invokeChefAgent as any).mockResolvedValue({
        agentType: 'chef',
        success: true,
        content: '...',
        confidence: 0.9,
        warnings: [],
        metadata: {},
        processingTimeMs: 100,
      });

      const result = await orchestrateNutritionConsult({
        ...baseRequest,
        query: 'recipe',
      });

      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });
});
