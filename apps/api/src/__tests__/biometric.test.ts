/// <reference types="jest" />
import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { Hono } from 'hono';
import { z } from 'zod';

// Import the biometric routes
import { biometricRouter } from '../src/routes/biometric';

// Mock environment
const mockEnv = {
  DB: {
    execute: vi.fn(),
    executeSql: vi.fn(),
    batch: vi.fn(),
    query: vi.fn(),
    migrate: vi.fn(),
    raw: vi.fn(),
    _connect: vi.fn(),
    _dispose: vi.fn(),
    drizzle: vi.fn(),
  },
  AUTH_SECRET: 'test-secret',
  BIOMETRIC_CRON_SECRET: 'test-cron-secret',
};

describe('Biometric API Routes', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route('/api/biometric', biometricRouter);

    // Mock DB queries
    mockEnv.DB.query = vi.fn().mockResolvedValue({
      success: true,
      results: [],
    });
    mockEnv.DB.execute = vi.fn().mockResolvedValue({
      success: true,
      changes: 1,
    });
  });

  describe('POST /api/biometric/sleep', () => {
    it('should create a sleep log', async () => {
      const mockDate = '2025-04-22';
      const requestBody = {
        date: mockDate,
        durationHours: 7.5,
        qualityScore: 85,
        notes: 'Good sleep',
      };

      mockEnv.DB.execute = vi.fn().mockResolvedValue({
        success: true,
        changes: 1,
      });

      const request = new Request('http://localhost:8787/api/biometric/sleep', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(requestBody),
      });

      const response = await app.fetch(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });

    it('should validate required fields', async () => {
      const requestBody = {
        // Missing date and durationHours
        qualityScore: 85,
      };

      const request = new Request('http://localhost:8787/api/biometric/sleep', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const response = await app.fetch(request);
      expect(response.status).toBe(400);
    });

    it('should validate durationHours is positive', async () => {
      const requestBody = {
        date: '2025-04-22',
        durationHours: -5, // Invalid
      };

      const request = new Request('http://localhost:8787/api/biometric/sleep', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const response = await app.fetch(request);
      expect(response.status).toBe(400);
    });

    it('should validate qualityScore range', async () => {
      const requestBody = {
        date: '2025-04-22',
        durationHours: 7.5,
        qualityScore: 150, // Invalid > 100
      };

      const request = new Request('http://localhost:8787/api/biometric/sleep', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const response = await app.fetch(request);
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/biometric/sleep/history', () => {
    it('should return sleep logs with pagination', async () => {
      const mockLogs = [
        {
          id: '1',
          userId: 'user-123',
          date: '2025-04-22',
          durationHours: 7.5,
          qualityScore: 85,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      mockEnv.DB.query = vi.fn().mockResolvedValue({
        success: true,
        results: mockLogs,
      });

      const request = new Request('http://localhost:8787/api/biometric/sleep/history?limit=10&offset=0', {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      const response = await app.fetch(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
    });

    it('should use default pagination values', async () => {
      const request = new Request('http://localhost:8787/api/biometric/sleep/history', {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      await app.fetch(request);
      expect(mockEnv.DB.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          $1: 'user-123',
          $2: 30,
          $3: 0,
        })
      );
    });
  });

  describe('GET /api/biometric/sleep/summary', () => {
    it('should return sleep summary for 7d period', async () => {
      const mockSummary = {
        totalLogs: 7,
        avgDuration: 7.5,
        avgQuality: 82,
        avgConsistency: 78,
        logs: [],
      };

      mockEnv.DB.query = vi.fn().mockResolvedValue({
        success: true,
        results: [mockSummary],
      });

      const request = new Request('http://localhost:8787/api/biometric/sleep/summary?period=7d', {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      const response = await app.fetch(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.avgDuration).toBe(7.5);
    });

    it('should default to 30d period', async () => {
      const request = new Request('http://localhost:8787/api/biometric/sleep/summary', {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      await app.fetch(request);
      expect(mockEnv.DB.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          $1: 'user-123',
          $2: '30d',
        })
      );
    });
  });

  describe('POST /api/biometric/snapshot/generate', () => {
    it('should generate a new snapshot', async () => {
      mockEnv.DB.execute = vi.fn()
        .mockResolvedValueOnce({ success: true, changes: 1 }) // Insert snapshot
        .mockResolvedValueOnce({ success: true, changes: 2 }) // Insert correlations
        .mockResolvedValueOnce({ success: true, results: [{ id: 'snap-1', period: '7d' }] }); // Get snapshot

      const request = new Request('http://localhost:8787/api/biometric/snapshot/generate', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      const response = await app.fetch(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.recoveryScore).toBeDefined();
      expect(data.data.exerciseLoad).toBeDefined();
      expect(data.data.sleep).toBeDefined();
      expect(data.data.nutrition).toBeDefined();
    });

    it('should validate user has enough data', async () => {
      // Return empty results
      mockEnv.DB.query = vi.fn().mockResolvedValue({
        success: true,
        results: [],
      });

      const request = new Request('http://localhost:8787/api/biometric/snapshot/generate', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      const response = await app.fetch(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Insufficient data');
    });
  });

  describe('GET /api/biometric/snapshot/:period', () => {
    it('should return latest snapshot', async () => {
      const mockSnapshot = {
        id: 'snap-1',
        userId: 'user-123',
        period: '7d',
        recoveryScore: 75.5,
        exerciseLoad: { totalWorkouts: 5, avgIntensity: 7.2 },
        sleep: { avgDuration: 7.5, consistencyScore: 82 },
        nutrition: { avgDailyCalories: 2200, consistencyScore: 78 },
        bodyMetrics: { weightChange: -0.5 },
        warnings: [],
      };

      mockEnv.DB.query = vi.fn().mockResolvedValue({
        success: true,
        results: [mockSnapshot],
      });

      const request = new Request('http://localhost:8787/api/biometric/snapshot/7d', {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      const response = await app.fetch(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.recoveryScore).toBe(75.5);
    });

    it('should return 404 when no snapshot exists', async () => {
      mockEnv.DB.query = vi.fn().mockResolvedValue({
        success: true,
        results: [],
      });

      const request = new Request('http://localhost:8787/api/biometric/snapshot/7d', {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      const response = await app.fetch(request);
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/biometric/correlations', () => {
    it('should return correlation findings', async () => {
      const mockCorrelations = [
        {
          id: 'corr-1',
          factorA: 'sleep_duration',
          factorB: 'recovery_score',
          correlationCoefficient: 0.78,
          pValue: 0.001,
          confidence: 0.85,
          anomalyCount: 2,
          outlierDates: ['2025-04-15', '2025-04-18'],
          explanation: 'Better sleep correlates with higher recovery',
          actionableInsight: 'Aim for 7+ hours of sleep to improve recovery',
          detectedAt: Date.now(),
        },
      ];

      mockEnv.DB.query = vi.fn().mockResolvedValue({
        success: true,
        results: mockCorrelations,
      });

      const request = new Request('http://localhost:8787/api/biometric/correlations?limit=10', {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      const response = await app.fetch(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].correlationCoefficient).toBe(0.78);
    });

    it('should use default limit of 10', async () => {
      const request = new Request('http://localhost:8787/api/biometric/correlations', {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      await app.fetch(request);
      expect(mockEnv.DB.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          $1: 'user-123',
          $2: 10,
        })
      );
    });
  });

  describe('PATCH /api/biometric/correlations/:id/dismiss', () => {
    it('should dismiss a correlation finding', async () => {
      mockEnv.DB.execute = vi.fn().mockResolvedValue({
        success: true,
        changes: 1,
      });

      const request = new Request('http://localhost:8787/api/biometric/correlations/corr-1/dismiss', {
        method: 'PATCH',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      const response = await app.fetch(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle non-existent finding', async () => {
      mockEnv.DB.execute = vi.fn().mockResolvedValue({
        success: true,
        changes: 0,
      });

      const request = new Request('http://localhost:8787/api/biometric/correlations/nonexistent/dismiss', {
        method: 'PATCH',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      const response = await app.fetch(request);
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/biometric/recovery-score', () => {
    it('should return recovery score', async () => {
      const mockScore = {
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
      };

      mockEnv.DB.query = vi.fn()
        .mockResolvedValueOnce({
          success: true,
          results: [[{
            avgDuration: 7.5,
            avgQuality: 82,
            avgConsistency: 80,
            consistencyScore: 80,
          }]],
        }) // Sleep summary
        .mockResolvedValueOnce({
          success: true,
          results: [{
            recoveryScore: 75.5,
            sleep: { consistencyScore: 80 },
            exerciseLoad: { intensityStdDev: 0.5 },
            nutrition: { consistencyScore: 78 },
            bodyMetrics: { weightChange: -0.5 },
            warnings: [],
          }],
        }); // Snapshot

      const request = new Request('http://localhost:8787/api/biometric/recovery-score', {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      const response = await app.fetch(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.score).toBeDefined();
      expect(data.data.grade).toBeDefined();
      expect(data.data.factors).toBeDefined();
    });

    it('should calculate grade based on score', async () => {
      // Test score >= 80 -> excellent
      mockEnv.DB.query = vi.fn()
        .mockResolvedValueOnce({ success: true, results: [[{ avgDuration: 8, avgQuality: 90, avgConsistency: 85, consistencyScore: 85 }]] })
        .mockResolvedValueOnce({ success: true, results: [{ recoveryScore: 85, sleep: { consistencyScore: 85 }, exerciseLoad: { intensityStdDev: 0.5 }, nutrition: { consistencyScore: 80 }, bodyMetrics: { weightChange: -1 }, warnings: [] }] });

      const request = new Request('http://localhost:8787/api/biometric/recovery-score', {
        headers: { 'Authorization': 'Bearer test-token' },
      });
      const response = await app.fetch(request);
      const data = await response.json();
      expect(data.data.grade).toBe('excellent');
    });
  });

  describe('Authentication', () => {
    it('should reject request without auth header', async () => {
      const request = new Request('http://localhost:8787/api/biometric/sleep/history', {
        method: 'GET',
      });

      const response = await app.fetch(request);
      expect(response.status).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      mockEnv.DB.query = vi.fn().mockRejectedValue(new Error('Invalid token'));

      const request = new Request('http://localhost:8787/api/biometric/sleep/history', {
        headers: {
          'Authorization': 'Bearer invalid-token',
        },
      });

      const response = await app.fetch(request);
      expect(response.status).toBe(401);
    });
  });
});
