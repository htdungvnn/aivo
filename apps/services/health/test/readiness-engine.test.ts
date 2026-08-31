/**
 * Tests for Readiness Calculation Engine
 * Pure unit tests with no I/O dependencies
 */

import { describe, it, expect } from 'vitest';
import {
  // Normalization functions
  normalizeSleepDuration,
  normalizeSleepQuality,
  normalizeTrainingLoad,
  normalizeWorkoutCompletion,
  normalizeFormQuality,
  normalizeMuscleSoreness,
  normalizeEnergy,
  normalizeStress,
  normalizeRestingHR,
  normalizeHRV,
  normalizeSteps,
  normalizeHydration,
  normalizeNutritionAdherence,
  normalizeRecoveryDays,
  
  // Factor processing
  processFactors,
  redistributeWeights,
  
  // Score calculation
  calculateReadinessScore,
  calculateConfidence,
  determineRecommendation,
  
  // Main calculation
  calculateReadiness,
  isValidReadinessOutput,
  areOutputsEqual,
} from '../src/lib/readiness-engine';

describe('Normalization Functions', () => {
  describe('normalizeSleepDuration', () => {
    it('should return 100 for optimal sleep (7-9 hours)', () => {
      expect(normalizeSleepDuration(7)).toBe(100);
      expect(normalizeSleepDuration(8)).toBe(100);
      expect(normalizeSleepDuration(9)).toBe(100);
    });

    it('should return lower scores for below optimal sleep', () => {
      expect(normalizeSleepDuration(0)).toBe(0);
      expect(normalizeSleepDuration(3.5)).toBeCloseTo(50, 0);
      expect(normalizeSleepDuration(5)).toBeCloseTo(71.4, 0);
    });

    it('should penalize overtime sleep slightly', () => {
      expect(normalizeSleepDuration(10)).toBe(90);
      expect(normalizeSleepDuration(12)).toBe(70);
    });

    it('should return null for null input', () => {
      expect(normalizeSleepDuration(null)).toBeNull();
    });

    it('should return null for non-finite values', () => {
      expect(normalizeSleepDuration(NaN)).toBeNull();
      expect(normalizeSleepDuration(Infinity)).toBeNull();
    });
  });

  describe('normalizeSleepQuality', () => {
    it('should clamp values to 0-100 range', () => {
      expect(normalizeSleepQuality(50)).toBe(50);
      expect(normalizeSleepQuality(0)).toBe(0);
      expect(normalizeSleepQuality(100)).toBe(100);
      expect(normalizeSleepQuality(-10)).toBe(0);
      expect(normalizeSleepQuality(150)).toBe(100);
    });

    it('should return null for null input', () => {
      expect(normalizeSleepQuality(null)).toBeNull();
    });
  });

  describe('normalizeTrainingLoad', () => {
    it('should return 100 for optimal range (0.8-1.3)', () => {
      expect(normalizeTrainingLoad(0.8)).toBe(100);
      expect(normalizeTrainingLoad(1.0)).toBe(100);
      expect(normalizeTrainingLoad(1.3)).toBe(100);
    });

    it('should penalize under-training', () => {
      expect(normalizeTrainingLoad(0.4)).toBe(50);
      expect(normalizeTrainingLoad(0.6)).toBeCloseTo(75, 0);
    });

    it('should penalize over-training with exponential decay', () => {
      expect(normalizeTrainingLoad(1.5)).toBeLessThan(100);
      expect(normalizeTrainingLoad(2.0)).toBeLessThan(50);
    });

    it('should return null for null input', () => {
      expect(normalizeTrainingLoad(null)).toBeNull();
    });
  });

  describe('normalizeMuscleSoreness', () => {
    it('should invert soreness (0 = 100 score, 10 = 0 score)', () => {
      expect(normalizeMuscleSoreness(0)).toBe(100);
      expect(normalizeMuscleSoreness(5)).toBe(50);
      expect(normalizeMuscleSoreness(10)).toBe(0);
    });

    it('should return null for null input', () => {
      expect(normalizeMuscleSoreness(null)).toBeNull();
    });
  });

  describe('normalizeStress', () => {
    it('should invert stress (0 stress = 100 score, 100 stress = 0 score)', () => {
      expect(normalizeStress(0)).toBe(100);
      expect(normalizeStress(50)).toBe(50);
      expect(normalizeStress(100)).toBe(0);
    });

    it('should return null for null input', () => {
      expect(normalizeStress(null)).toBeNull();
    });
  });

  describe('normalizeRestingHR', () => {
    it('should return 100 for optimal range (50-70 bpm)', () => {
      expect(normalizeRestingHR(60)).toBe(100);
      expect(normalizeRestingHR(50)).toBe(100);
      expect(normalizeRestingHR(70)).toBe(100);
    });

    it('should penalize elevated heart rate', () => {
      expect(normalizeRestingHR(80)).toBe(70);
      expect(normalizeRestingHR(90)).toBe(40);
    });

    it('should use baseline when provided', () => {
      // With baseline of 60, optimal is 55-70
      expect(normalizeRestingHR(65, 60)).toBe(100);
      expect(normalizeRestingHR(75, 60)).toBeLessThan(100);
    });
  });

  describe('normalizeHRV', () => {
    it('should return higher scores for higher HRV', () => {
      expect(normalizeHRV(50)).toBe(100);
      expect(normalizeHRV(40)).toBeLessThan(100);
      expect(normalizeHRV(30)).toBeLessThan(50);
    });

    it('should use baseline when provided', () => {
      // With baseline of 60, optimal is 48-54
      expect(normalizeHRV(55, 60)).toBeCloseTo(100, 0);
    });
  });

  describe('normalizeSteps', () => {
    it('should return 100 when reaching target', () => {
      expect(normalizeSteps(10000)).toBe(100);
      expect(normalizeSteps(15000)).toBe(100);
    });

    it('should scale proportionally below target', () => {
      expect(normalizeSteps(0)).toBe(0);
      expect(normalizeSteps(5000)).toBe(50);
      expect(normalizeSteps(7500)).toBe(75);
    });

    it('should respect custom targets', () => {
      expect(normalizeSteps(5000, 5000)).toBe(100);
    });
  });

  describe('normalizeHydration', () => {
    it('should return 100 when reaching target', () => {
      expect(normalizeHydration(2000)).toBe(100);
      expect(normalizeHydration(2500)).toBe(100);
    });

    it('should scale proportionally below target', () => {
      expect(normalizeHydration(0)).toBe(0);
      expect(normalizeHydration(1000)).toBe(50);
    });
  });

  describe('normalizeRecoveryDays', () => {
    it('should return 100 for optimal recovery (1-3 days)', () => {
      expect(normalizeRecoveryDays(1)).toBe(100);
      expect(normalizeRecoveryDays(2)).toBe(100);
      expect(normalizeRecoveryDays(3)).toBe(100);
    });

    it('should penalize insufficient recovery', () => {
      expect(normalizeRecoveryDays(0)).toBe(0);
      expect(normalizeRecoveryDays(0.5)).toBe(50);
    });

    it('should penalize excessive recovery (deconditioning risk)', () => {
      expect(normalizeRecoveryDays(5)).toBe(70);
      expect(normalizeRecoveryDays(7)).toBe(40);
    });
  });
});

describe('Weight Redistribution', () => {
  it('should redistribute weights proportionally for available factors', () => {
    const factors = [
      { code: 'sleep', value: { value: 8, unit: 'hours' }, weight: 0.20, normalizedScore: 100, contribution: 10, status: 'positive' as const },
      { code: 'training_load', value: null, weight: 0.15, normalizedScore: null, contribution: 0, status: 'neutral' as const },
      { code: 'energy', value: { value: 75, unit: '%' }, weight: 0.10, normalizedScore: 75, contribution: 2.5, status: 'positive' as const },
    ] as any;

    const redistributed = redistributeWeights(factors);

    // Available weights: 0.20 + 0.10 = 0.30
    // redistributed sleep weight: 0.20 / 0.30 = 0.667
    expect(redistributed[0].weight).toBeCloseTo(0.667, 2);
    // redistributed energy weight: 0.10 / 0.30 = 0.333
    expect(redistributed[2].weight).toBeCloseTo(0.333, 2);
    // missing factor should have 0 weight
    expect(redistributed[1].weight).toBe(0);
  });

  it('should use neutral defaults when all factors are missing', () => {
    const factors = [
      { code: 'sleep', value: null, weight: 0.20, normalizedScore: null, contribution: 0, status: 'neutral' as const },
      { code: 'energy', value: null, weight: 0.10, normalizedScore: null, contribution: 0, status: 'neutral' as const },
    ] as any;

    const redistributed = redistributeWeights(factors);

    // All should have neutral score of 50
    expect(redistributed[0].normalizedScore).toBe(50);
    expect(redistributed[1].normalizedScore).toBe(50);
  });
});

describe('Confidence Calculation', () => {
  it('should return high confidence for recent, complete data', () => {
    const confidence = calculateConfidence(1.0, 1); // 100% complete, 1 hour old
    expect(confidence).toBeGreaterThan(0.9);
  });

  it('should return lower confidence for incomplete data', () => {
    const confidence = calculateConfidence(0.5, 1);
    expect(confidence).toBeLessThan(0.7);
  });

  it('should return lower confidence for stale data', () => {
    const confidence = calculateConfidence(1.0, 30); // 100% complete, 30 hours old
    expect(confidence).toBeLessThan(0.6);
  });

  it('should return very low confidence for very stale data', () => {
    const confidence = calculateConfidence(1.0, 72); // 100% complete, 72 hours old
    expect(confidence).toBeLessThan(0.2);
  });
});

describe('Recommendation Determination', () => {
  it('should recommend rest for low readiness', () => {
    const rec = determineRecommendation(30, 'low', 0.8);
    expect(rec.action).toBe('rest');
    expect(rec.intensityModifier).toBeLessThan(0);
    expect(rec.volumeModifier).toBeLessThan(0);
  });

  it('should recommend light training for moderate readiness', () => {
    const rec = determineRecommendation(50, 'moderate', 0.8);
    expect(rec.action).toBe('light_training');
    expect(rec.intensityModifier).toBeLessThan(0);
  });

  it('should recommend normal training for good readiness', () => {
    const rec = determineRecommendation(70, 'good', 0.8);
    expect(rec.action).toBe('normal_training');
    expect(rec.intensityModifier).toBe(0);
    expect(rec.volumeModifier).toBe(0);
  });

  it('should recommend high intensity for high readiness', () => {
    const rec = determineRecommendation(90, 'high', 0.8);
    expect(rec.action).toBe('high_intensity');
    expect(rec.intensityModifier).toBeGreaterThan(0);
  });

  it('should reduce modifiers for low data completeness', () => {
    const recLowData = determineRecommendation(70, 'good', 0.5);
    const recHighData = determineRecommendation(70, 'good', 0.9);
    expect(Math.abs(recLowData.intensityModifier)).toBeLessThan(Math.abs(recHighData.intensityModifier));
  });
});

describe('Main Readiness Calculation', () => {
  it('should calculate deterministic scores', () => {
    const input = {
      date: '2024-01-15',
      userId: 'test-user',
      timezone: 'UTC',
      dataCompleteness: 0.8,
      dataFreshness: 2,
    };

    const result1 = calculateReadiness(input);
    const result2 = calculateReadiness(input);

    expect(areOutputsEqual(result1, result2)).toBe(true);
    expect(result1.score).toBe(result2.score);
  });

  it('should return valid output structure', () => {
    const input = {
      date: '2024-01-15',
      userId: 'test-user',
      timezone: 'UTC',
      dataCompleteness: 0.8,
      dataFreshness: 2,
    };

    const result = calculateReadiness(input);

    expect(isValidReadinessOutput(result)).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(['low', 'moderate', 'good', 'high']).toContain(result.level);
  });

  it('should handle missing data gracefully', () => {
    const input = {
      date: '2024-01-15',
      userId: 'test-user',
      timezone: 'UTC',
      dataCompleteness: 0.3,
      dataFreshness: 48,
    };

    const result = calculateReadiness(input);

    expect(isValidReadinessOutput(result)).toBe(true);
    expect(result.confidence).toBeLessThan(0.5);
  });

  it('should include factors array in output', () => {
    const input = {
      date: '2024-01-15',
      userId: 'test-user',
      timezone: 'UTC',
      dataCompleteness: 0.8,
      dataFreshness: 2,
    };

    const result = calculateReadiness(input);

    expect(result.factors).toBeDefined();
    expect(Array.isArray(result.factors)).toBe(true);
    expect(result.factors.length).toBeGreaterThan(0);
  });

  it('should include recommendation in output', () => {
    const input = {
      date: '2024-01-15',
      userId: 'test-user',
      timezone: 'UTC',
      dataCompleteness: 0.8,
      dataFreshness: 2,
    };

    const result = calculateReadiness(input);

    expect(result.recommendation).toBeDefined();
    expect(['rest', 'recovery', 'light_training', 'normal_training', 'high_intensity']).toContain(result.recommendation.action);
  });

  it('should produce higher scores with positive factors', () => {
    const inputPositive = {
      date: '2024-01-15',
      userId: 'test-user',
      timezone: 'UTC',
      dataCompleteness: 1,
      dataFreshness: 0,
      sleepDuration: { value: 8, unit: 'hours', timestamp: Date.now(), source: 'wearable', confidence: 0.9, freshness: 0, available: true },
      energy: { value: 90, unit: '%', timestamp: Date.now(), source: 'manual', confidence: 0.8, freshness: 0, available: true },
      stress: { value: 10, unit: '%', timestamp: Date.now(), source: 'manual', confidence: 0.8, freshness: 0, available: true },
    };

    const inputNegative = {
      date: '2024-01-15',
      userId: 'test-user',
      timezone: 'UTC',
      dataCompleteness: 1,
      dataFreshness: 0,
      sleepDuration: { value: 4, unit: 'hours', timestamp: Date.now(), source: 'wearable', confidence: 0.9, freshness: 0, available: true },
      energy: { value: 30, unit: '%', timestamp: Date.now(), source: 'manual', confidence: 0.8, freshness: 0, available: true },
      stress: { value: 80, unit: '%', timestamp: Date.now(), source: 'manual', confidence: 0.8, freshness: 0, available: true },
    };

    const resultPositive = calculateReadiness(inputPositive);
    const resultNegative = calculateReadiness(inputNegative);

    expect(resultPositive.score).toBeGreaterThan(resultNegative.score);
  });
});

describe('Determinism Tests', () => {
  it('should produce identical results for same input', () => {
    const input = {
      date: '2024-01-15',
      userId: 'user-123',
      timezone: 'America/New_York',
      sleepDuration: { value: 7.5, unit: 'hours', timestamp: 1705334400000, source: 'wearable', confidence: 0.9, freshness: 2, available: true },
      energy: { value: 75, unit: '%', timestamp: 1705334400000, source: 'manual', confidence: 0.8, freshness: 2, available: true },
      dataCompleteness: 0.8,
      dataFreshness: 4,
    };

    const results = Array.from({ length: 5 }, () => calculateReadiness(input));

    for (let i = 1; i < results.length; i++) {
      expect(areOutputsEqual(results[0], results[i])).toBe(true);
    }
  });

  it('should produce different results for different inputs', () => {
    const input1 = {
      date: '2024-01-15',
      userId: 'user-123',
      timezone: 'UTC',
      sleepDuration: { value: 8, unit: 'hours', timestamp: Date.now(), source: 'wearable', confidence: 0.9, freshness: 0, available: true },
      dataCompleteness: 1,
      dataFreshness: 0,
    };

    const input2 = {
      date: '2024-01-15',
      userId: 'user-123',
      timezone: 'UTC',
      sleepDuration: { value: 4, unit: 'hours', timestamp: Date.now(), source: 'wearable', confidence: 0.9, freshness: 0, available: true },
      dataCompleteness: 1,
      dataFreshness: 0,
    };

    const result1 = calculateReadiness(input1);
    const result2 = calculateReadiness(input2);

    expect(result1.score).not.toBe(result2.score);
  });
});
