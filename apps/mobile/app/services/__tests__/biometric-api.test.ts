import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as biometricApi from '../biometric-api';

// Mock fetch globally
global.fetch = vi.fn();

describe('Mobile Biometric API Service', () => {
  const mockToken = 'test-jwt-token';
  const mockBaseUrl = 'http://localhost:8787';

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock cookie-based auth - for mobile we might use AsyncStorage token
    vi.spyOn(global, 'fetch');
  });

  describe('createSleepLog', () => {
    it('should create a sleep log successfully', async () => {
      const mockResponse = {
        data: {
          id: 'sleep-1',
          date: '2025-04-22',
          durationHours: 7.5,
          qualityScore: 85,
          notes: 'Good sleep',
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await biometricApi.createSleepLog({
        date: '2025-04-22',
        durationHours: 7.5,
        qualityScore: 85,
        notes: 'Good sleep',
      });

      expect(result).toEqual(mockResponse.data);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/biometric/sleep`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockToken}`,
          },
          body: expect.any(String),
        })
      );
    });

    it('should throw error when network fails', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(
        biometricApi.createSleepLog({
          date: '2025-04-22',
          durationHours: 7.5,
          qualityScore: 85,
        })
      ).rejects.toThrow('Network error');
    });

    it('should handle server error response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Validation failed' }),
      });

      await expect(
        biometricApi.createSleepLog({
          date: '2025-04-22',
          durationHours: -1, // Invalid
          qualityScore: 85,
        })
      ).rejects.toThrow('Validation failed');
    });
  });

  describe('getSleepSummary', () => {
    it('should fetch sleep summary for 7d period', async () => {
      const mockResponse = {
        data: {
          avgDuration: 7.5,
          avgQuality: 82,
          avgConsistency: 78,
          logsCount: 7,
          logs: [],
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await biometricApi.getSleepSummary('7d');

      expect(result).toEqual(mockResponse.data);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/biometric/sleep/summary?period=7d`,
        expect.objectContaining({
          headers: {
            'Authorization': `Bearer ${mockToken}`,
          },
        })
      );
    });

    it('should fetch sleep summary for 30d period', async () => {
      const mockResponse = {
        data: {
          avgDuration: 7.3,
          avgQuality: 80,
          avgConsistency: 75,
          logsCount: 30,
          logs: [],
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await biometricApi.getSleepSummary('30d');

      expect(result).toEqual(mockResponse.data);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/biometric/sleep/summary?period=30d`,
        expect.anything()
      );
    });

    it('should default to 30d period if not specified', async () => {
      // This test would be for the getter function, not a direct API call
      // The API itself requires a period parameter
    });
  });

  describe('getSleepHistory', () => {
    it('should fetch sleep history with pagination', async () => {
      const mockResponse = {
        data: [
          {
            id: '1',
            date: '2025-04-22',
            durationHours: 7.5,
            qualityScore: 85,
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await biometricApi.getSleepHistory(10, 0);

      expect(result).toEqual(mockResponse.data);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/biometric/sleep/history?limit=10&offset=0`,
        expect.anything()
      );
    });
  });

  describe('getCorrelationFindings', () => {
    it('should fetch correlation findings', async () => {
      const mockResponse = {
        data: [
          {
            id: 'corr-1',
            factorA: 'sleep_duration',
            factorB: 'recovery_score',
            correlationCoefficient: 0.78,
            pValue: 0.001,
            confidence: 0.85,
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await biometricApi.getCorrelationFindings(10);

      expect(result).toEqual(mockResponse.data);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/biometric/correlations?limit=10`,
        expect.anything()
      );
    });

    it('should use default limit of 10', async () => {
      // The function already has a default of 10, this is just verifying
      const mockResponse = { data: [] };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await biometricApi.getCorrelationFindings();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.anything()
      );
    });
  });

  describe('dismissCorrelation', () => {
    it('should dismiss a correlation finding', async () => {
      const mockResponse = {
        data: { success: true },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await biometricApi.dismissCorrelation('corr-1');

      expect(result).toEqual(mockResponse.data);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/biometric/correlations/corr-1/dismiss`,
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });
  });

  describe('generateBiometricSnapshot', () => {
    it('should generate a new snapshot', async () => {
      const mockResponse = {
        data: {
          id: 'snap-1',
          period: '7d',
          recoveryScore: 75.5,
          exerciseLoad: { totalWorkouts: 5 },
          sleep: { avgDuration: 7.5 },
          nutrition: { avgDailyCalories: 2200 },
          bodyMetrics: { weightChange: -0.5 },
          warnings: [],
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await biometricApi.generateBiometricSnapshot();

      expect(result).toEqual(mockResponse.data);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/biometric/snapshot/generate`,
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('getBiometricSnapshot', () => {
    it('should fetch latest snapshot for period', async () => {
      const mockResponse = {
        data: {
          id: 'snap-1',
          period: '7d',
          recoveryScore: 75.5,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await biometricApi.getBiometricSnapshot('7d');

      expect(result).toEqual(mockResponse.data);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/biometric/snapshot/7d`,
        expect.anything()
      );
    });

    it('should throw when snapshot not found', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(biometricApi.getBiometricSnapshot('7d')).rejects.toThrow();
    });
  });

  describe('getRecoveryScore', () => {
    it('should fetch recovery score with factors', async () => {
      const mockResponse = {
        data: {
          score: 75.5,
          grade: 'good',
          factors: {
            sleep: 82,
            exercise: 70,
            nutrition: 78,
            bodyMetrics: 65,
            hydration: 72,
          },
          warnings: [],
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await biometricApi.getRecoveryScore();

      expect(result).toEqual(mockResponse.data);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/biometric/recovery-score`,
        expect.anything()
      );
    });
  });
});
