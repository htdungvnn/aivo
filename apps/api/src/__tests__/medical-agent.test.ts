/// <reference types="jest" />
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { invokeMedicalAgent } from '../services/nutrition/medical-agent';

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

describe('Medical Agent', () => {
  const baseContext = {
    medicalConditions: [] as string[],
    medications: [] as Array<{ name: string; dosage?: string; frequency?: string }>,
    allergies: [] as string[],
    intolerances: [] as string[],
    age: undefined as number | undefined,
    weight: undefined as number | undefined,
    height: undefined as number | undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('invokeMedicalAgent', () => {
    it('returns successful analysis with safety alerts and guidance', async () => {
      const mockAnalysis = {
        safetyAlerts: [
          {
            severity: 'high' as const,
            category: 'drug_interaction',
            title: 'Drug Interaction',
            description: 'Potential interaction with metformin',
            recommendation: 'Consult your doctor',
            affectedMedications: ['metformin'],
            affectedConditions: [],
          },
        ],
        nutrientWarnings: [
          {
            nutrient: 'sodium',
            concern: 'High sodium intake can affect blood pressure',
            targetRange: '1500-2300mg',
            foodsToLimit: ['processed foods'],
          },
        ],
        dietaryModifications: [
          {
            condition: 'diabetes',
            modification: 'Limit carbohydrate intake',
            rationale: 'Helps control blood sugar',
            foodsToEmphasize: ['vegetables'],
            foodsToAvoid: ['sugary drinks'],
          },
        ],
        consultationNeeded: true,
        consultationReason: 'Complex medication regimen',
        generalGuidance: 'Focus on whole foods',
        confidence: 0.85,
      };

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockAnalysis) } }],
      } as any);

      const result = await invokeMedicalAgent({
        query: 'Is this safe?',
        context: {
          ...baseContext,
          medicalConditions: ['diabetes'],
          medications: [{ name: 'metformin' }],
        },
      });

      expect(result.agentType).toBe('medical');
      expect(result.success).toBe(true);
      expect(result.content).toContain('Drug Interaction');
      expect(result.content).toContain('Potential interaction with metformin');
      expect(result.content).toContain('sodium');
      expect(result.content).toContain('Limit carbohydrate intake');
      expect(result.content).toContain('Focus on whole foods');
      // Confidence calculated from context: 0.3 + 0.25 (conditions) + 0.25 (medications) = 0.8
      expect(result.confidence).toBeGreaterThan(0.7);
      // Consultation needed adds a warning
      expect(result.warnings.some(w => w.includes('Medical consultation recommended'))).toBe(true);
      expect(result.metadata).toHaveProperty('analysis');
      expect((result.metadata as any).analysis.safetyAlerts).toHaveLength(1);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('calculates confidence based on context completeness', async () => {
      const mockAnalysis = {
        safetyAlerts: [],
        nutrientWarnings: [],
        dietaryModifications: [],
        consultationNeeded: false,
        generalGuidance: 'Eat healthy',
        confidence: 0.99,
      };

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockAnalysis) } }],
      } as any);

      // Context with medical conditions and medications: 0.3 + 0.25 + 0.25 = 0.8
      const result = await invokeMedicalAgent({
        query: 'query',
        context: {
          ...baseContext,
          medicalConditions: ['hypertension'],
          medications: [{ name: 'lisinopril' }],
        },
      });

      expect(result.confidence).toBe(0.8);
    });

    it('adds warnings for critical safety alerts', async () => {
      const mockAnalysis = {
        safetyAlerts: [
          {
            severity: 'critical' as const,
            category: 'allergy',
            title: 'Severe Allergy Risk',
            description: 'Recipe contains allergen',
            recommendation: 'Avoid completely',
            affectedMedications: [],
            affectedConditions: [],
          },
        ],
        nutrientWarnings: [],
        dietaryModifications: [],
        consultationNeeded: false,
        generalGuidance: '',
        confidence: 0.9,
      };

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockAnalysis) } }],
      } as any);

      const result = await invokeMedicalAgent({
        query: 'query',
        context: baseContext,
      });

      // Critical alerts produce a warning: "⚠️ CRITICAL: ..."
      expect(result.warnings.some(w => w.includes('CRITICAL') && w.includes('Contains important safety warnings'))).toBe(true);
    });

    it('adds warnings for high-risk medication interactions', async () => {
      const mockAnalysis = {
        safetyAlerts: [
          {
            severity: 'high' as const,
            category: 'drug_interaction',
            title: 'Interaction',
            description: 'Warning',
            recommendation: 'Consult',
            affectedMedications: ['warfarin'],
            affectedConditions: [],
          },
        ],
        nutrientWarnings: [],
        dietaryModifications: [],
        consultationNeeded: false,
        generalGuidance: '',
        confidence: 0.8,
      };

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockAnalysis) } }],
      } as any);

      const result = await invokeMedicalAgent({
        query: 'query',
        context: baseContext,
      });

      // High-risk meds include warfarin
      expect(result.warnings.some(w => w.includes('CRITICAL') && w.includes('warfarin'))).toBe(true);
    });

    it('adds warnings when consultation is recommended', async () => {
      const mockAnalysis = {
        safetyAlerts: [],
        nutrientWarnings: [],
        dietaryModifications: [],
        consultationNeeded: true,
        consultationReason: 'Complex conditions',
        generalGuidance: '',
        confidence: 0.7,
      };

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockAnalysis) } }],
      } as any);

      const result = await invokeMedicalAgent({
        query: 'query',
        context: baseContext,
      });

      expect(result.warnings.some(w => w.includes('Medical consultation recommended') && w.includes('Complex conditions'))).toBe(true);
    });

    it('handles OpenAI API errors gracefully', async () => {
      mockCreate.mockRejectedValue(new Error('OpenAI timeout'));

      const result = await invokeMedicalAgent({
        query: 'query',
        context: baseContext,
      });

      expect(result.success).toBe(false);
      expect(result.content).toContain('Unable to complete medical safety analysis');
      expect(result.confidence).toBe(0);
      expect(result.warnings).toContain('Medical analysis unavailable - please consult a healthcare provider');
      expect(result.metadata).toHaveProperty('error');
    });

    it('handles invalid JSON response from OpenAI', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'not json' } }],
      });

      const result = await invokeMedicalAgent({
        query: 'query',
        context: baseContext,
      });

      expect(result.success).toBe(false);
      // The error will be from JSON.parse, which contains the raw content in message
      expect(result.metadata.error).toContain('not json');
    });

    it('formats analysis as readable text with all sections', async () => {
      const mockAnalysis = {
        safetyAlerts: [],
        nutrientWarnings: [
          {
            nutrient: 'sugar',
            concern: 'High sugar intake',
            targetRange: '<25g',
            foodsToLimit: ['soda', 'candy'],
          },
        ],
        dietaryModifications: [
          {
            condition: 'hypertension',
            modification: 'Low sodium diet',
            rationale: 'Reduces blood pressure',
            foodsToEmphasize: ['fruits', 'vegetables'],
            foodsToAvoid: ['salt'],
          },
        ],
        consultationNeeded: false,
        generalGuidance: 'Balanced diet with portion control',
        confidence: 0.8,
      };

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockAnalysis) } }],
      } as any);

      const result = await invokeMedicalAgent({
        query: 'query',
        context: baseContext,
      });

      const content = result.content;
      expect(content).toContain('# Medical Nutrition Safety Analysis');
      // No safety alerts, so that section is skipped
      expect(content).toContain('## Nutrient Considerations');
      expect(content).toContain('sugar');
      expect(content).toContain('## Recommended Dietary Modifications');
      expect(content).toContain('For hypertension');
      expect(content).toContain('## Overall Guidance');
      expect(content).toContain('Balanced diet with portion control');
      expect(content).toContain('---');
      expect(content).toContain('*Confidence: 80%*');
      expect(content).toContain('informational purposes');
    });

    it('includes safety alerts section when present', async () => {
      const mockAnalysis = {
        safetyAlerts: [
          {
            severity: 'warning' as const,
            category: 'dietary',
            title: 'High Sodium',
            description: 'Watch salt intake',
            recommendation: 'Reduce processed foods',
            affectedMedications: [],
            affectedConditions: [],
          },
        ],
        nutrientWarnings: [],
        dietaryModifications: [],
        consultationNeeded: false,
        generalGuidance: '',
        confidence: 0.7,
      };

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockAnalysis) } }],
      } as any);

      const result = await invokeMedicalAgent({
        query: 'query',
        context: baseContext,
      });

      expect(result.content).toContain('## ⚠️ Safety Alerts');
      expect(result.content).toContain('High Sodium');
      expect(result.content).toContain('Watch salt intake');
    });
  });
});
