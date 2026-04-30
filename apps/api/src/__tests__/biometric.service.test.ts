/// <reference types="jest" />
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as biometric from '../services/biometric';
import { FitnessCalculator } from '@aivo/compute/aivo_compute_bg.js';

// Mock the WASM module with manual factory to provide object methods
jest.mock('@aivo/compute/aivo_compute_bg.js', () => ({
  FitnessCalculator: {
    calculateRecoveryScore: jest.fn(),
    analyzeCorrelations: jest.fn(),
    generateSnapshot: jest.fn(),
  },
}));

// Helper to access mocked methods
const mockCalculateRecoveryScore = FitnessCalculator.calculateRecoveryScore as jest.Mock;
const mockAnalyzeCorrelations = FitnessCalculator.analyzeCorrelations as jest.Mock;
const mockGenerateSnapshot = FitnessCalculator.generateSnapshot as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Biometric Service', () => {
  const mockDrizzle = {
    query: {
      sleepLogs: { findMany: jest.fn() },
      workouts: { findMany: jest.fn() },
      dailyNutritionSummaries: { findMany: jest.fn() },
      bodyMetrics: { findMany: jest.fn() },
      biometricSnapshots: { findFirst: jest.fn() },
    },
  };

  const mockKV = {
    get: jest.fn(),
    put: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Set default implementations for KV (non-cached)
    mockKV.get.mockResolvedValue(null);
    mockKV.put.mockResolvedValue(undefined);
  });

  describe('getBiometricCacheKey', () => {
    it('generates key with userId and operation', () => {
      const key = biometric.getBiometricCacheKey('user-123', 'snapshot');
      expect(key).toBe('biometric:user-123:snapshot');
    });

    it('includes params when provided', () => {
      const key = biometric.getBiometricCacheKey('user-123', 'recovery', '7d');
      expect(key).toBe('biometric:user-123:recovery:7d');
    });
  });

  describe('getCachedBiometricData', () => {
    it('returns data with hit:true when cache has value', async () => {
      const mockData = { score: 85 };
      mockKV.get.mockResolvedValue(JSON.stringify(mockData));

      const result = await biometric.getCachedBiometricData(mockKV, 'key');

      expect(result.data).toEqual(mockData);
      expect(result.hit).toBe(true);
    });

    it('returns null with hit:false when cache miss', async () => {
      mockKV.get.mockResolvedValue(null);

      const result = await biometric.getCachedBiometricData(mockKV, 'key');

      expect(result.data).toBeNull();
      expect(result.hit).toBe(false);
    });

    it('handles invalid JSON gracefully', async () => {
      mockKV.get.mockResolvedValue('invalid json');

      const result = await biometric.getCachedBiometricData(mockKV, 'key');

      expect(result.data).toBeNull();
      expect(result.hit).toBe(false);
    });
  });

  describe('setCachedBiometricData', () => {
    it('stores data with correct TTL', async () => {
      const data = { test: 'value' };
      await biometric.setCachedBiometricData(mockKV, 'key', data, 3600);

      expect(mockKV.put).toHaveBeenCalledWith('key', JSON.stringify(data), { expirationTtl: 3600 });
    });

    it('does not throw on cache failure', async () => {
      mockKV.put.mockRejectedValue(new Error('KV error'));
      const data = { test: 'value' };

      await expect(biometric.setCachedBiometricData(mockKV, 'key', data, 3600)).resolves.not.toThrow();
    });
  });

  describe('invalidateBiometricCache', () => {
    it('is a no-op (TTL-based expiration)', async () => {
      const kv = { delete: jest.fn() };
      await biometric.invalidateBiometricCache(kv, 'user-123');
      expect(kv.delete).not.toHaveBeenCalled();
    });
  });

  describe('generateBiometricSnapshot', () => {
    const userId = 'user-123';

    beforeEach(() => {
      mockDrizzle.query.sleepLogs.findMany.mockResolvedValue([]);
      mockDrizzle.query.workouts.findMany.mockResolvedValue([]);
      mockDrizzle.query.dailyNutritionSummaries.findMany.mockResolvedValue([]);
      mockDrizzle.query.bodyMetrics.findMany.mockResolvedValue([]);
      mockCalculateRecoveryScore.mockReturnValue(85);
      mockGenerateSnapshot.mockReturnValue({
        recoveryScore: 85,
        warnings: [],
      });
    });

    it('generates snapshot with aggregated data', async () => {
      const mockSleepLogs = [
        { durationHours: 7, qualityScore: 80, deepSleepMinutes: 120, remSleepMinutes: 90, consistencyScore: 0.85, bedtime: '22:00', waketime: '06:00' },
        { durationHours: 8, qualityScore: 85, deepSleepMinutes: 130, remSleepMinutes: 100, consistencyScore: 0.9, bedtime: '21:30', waketime: '05:30' },
      ];
      const mockWorkouts = [
        { caloriesBurned: 5000, metrics: '0.8', reps: 50 },
        { caloriesBurned: 4000, metrics: '0.7', reps: 40 },
      ];
      const mockNutrition = [
        { totalCalories: 2000, totalProtein_g: 100, totalCarbs_g: 250, totalFat_g: 70, consistencyScore: 0.9 },
        { totalCalories: 2100, totalProtein_g: 110, totalCarbs_g: 240, totalFat_g: 75, consistencyScore: 0.95 },
      ];
      const mockBodyMetrics = [
        { weight: 80, bodyFatPercentage: 0.15, muscleMass: 30 },
      ];

      mockDrizzle.query.sleepLogs.findMany.mockResolvedValue(mockSleepLogs);
      mockDrizzle.query.workouts.findMany.mockResolvedValue(mockWorkouts);
      mockDrizzle.query.dailyNutritionSummaries.findMany.mockResolvedValue(mockNutrition);
      mockDrizzle.query.bodyMetrics.findMany.mockResolvedValue(mockBodyMetrics);

      const result = await biometric.generateBiometricSnapshot(mockDrizzle, userId, '7d');

      expect(result).toHaveProperty('userId', userId);
      expect(result.period).toBe('7d');
      expect(result.sleep.avgDuration).toBeCloseTo(7.5, 1);
      expect(result.sleep.avgQuality).toBeGreaterThan(0);
      expect(result.exerciseLoad.totalWorkouts).toBe(2);
      expect(result.exerciseLoad.weeklyVolume).toBeGreaterThan(0);
      expect(result.nutrition.avgDailyCalories).toBeGreaterThan(0);
      expect(result.nutrition.avgProtein).toBeGreaterThan(0);
      expect(result.bodyMetrics.weightChange).toBeCloseTo(0, 0); // depends on calculation, but should be defined
      expect(result.recoveryScore).toBeGreaterThan(0);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('handles empty data sets', async () => {
      mockDrizzle.query.sleepLogs.findMany.mockResolvedValue([]);
      mockDrizzle.query.workouts.findMany.mockResolvedValue([]);
      mockDrizzle.query.dailyNutritionSummaries.findMany.mockResolvedValue([]);
      mockDrizzle.query.bodyMetrics.findMany.mockResolvedValue([]);

      mockCalculateRecoveryScore.mockReturnValue(50);

      const result = await biometric.generateBiometricSnapshot(mockDrizzle, userId, '30d');

      expect(result.exerciseLoad.totalWorkouts).toBe(0);
      expect(result.sleep.avgDuration).toBe(7); // default when no data
      expect(result.nutrition.avgDailyCalories).toBe(2000); // default
      expect(result.recoveryScore).toBe(50);
      // With empty nutrition, consistencyScore becomes 0, triggering warning
      expect(result.warnings).toContain('Inconsistent nutrition intake - aim for steady daily targets');
    });

    it('propagates DB errors', async () => {
      mockDrizzle.query.sleepLogs.findMany.mockRejectedValue(new Error('DB connection failed'));

      await expect(biometric.generateBiometricSnapshot(mockDrizzle, userId, '7d')).rejects.toThrow('DB connection failed');
    });
  });

  describe('analyzeCorrelations', () => {
    const userId = 'user-123';
    const snapshotId = 'snap-123';

    beforeEach(() => {
      mockDrizzle.query.biometricSnapshots.findFirst.mockResolvedValue(null);
    });

    it('returns empty array when snapshot not found', async () => {
      const result = await biometric.analyzeCorrelations(mockDrizzle, userId, snapshotId);
      expect(result).toEqual([]);
      expect(mockDrizzle.query.biometricSnapshots.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object),
        })
      );
    });

    it('identifies correlations when snapshot exists', async () => {
      const mockSnapshot = {
        id: snapshotId,
        userId,
        recoveryScore: 85,
        sleep: JSON.stringify({ consistencyScore: 0.9 }),
        nutrition: JSON.stringify({ consistencyScore: 0.85 }),
        warnings: [],
      };
      mockDrizzle.query.biometricSnapshots.findFirst.mockResolvedValue(mockSnapshot);

      const result = await biometric.analyzeCorrelations(mockDrizzle, userId, snapshotId);

      // Both sleep and nutrition correlations should be detected
      expect(result).toHaveLength(2);
      const sleepCorr = result.find(f => f.factorA === 'sleep_consistency');
      const nutritionCorr = result.find(f => f.factorA === 'nutrition_consistency');
      expect(sleepCorr).toBeDefined();
      expect(sleepCorr?.correlationCoefficient).toBeGreaterThan(0.5);
      expect(sleepCorr?.actionableInsight).toContain('consistent bedtime');
      expect(nutritionCorr).toBeDefined();
      expect(nutritionCorr?.actionableInsight).toContain('macro targets');
    });

    it('handles invalid JSON in snapshot fields', async () => {
      const mockSnapshot = {
        id: snapshotId,
        userId,
        recoveryScore: 80,
        sleep: 'invalid json', // Invalid JSON
        nutrition: JSON.stringify({ consistencyScore: 0.8 }),
        warnings: [],
      };
      mockDrizzle.query.biometricSnapshots.findFirst.mockResolvedValue(mockSnapshot);

      const result = await biometric.analyzeCorrelations(mockDrizzle, userId, snapshotId);

      // Should handle gracefully and return empty array
      expect(result).toEqual([]);
    });
  });
});
