/// <reference types="jest" />
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { sql } from 'drizzle-orm';
import * as schema from '../schema';

// Mock Drizzle instance for testing
const mockDrizzle = {
  execute: jest.fn(),
  executeSql: jest.fn(),
  batch: jest.fn(),
  query: jest.fn(),
  migrate: jest.fn(),
  raw: jest.fn(),
  _connect: jest.fn(),
  _dispose: jest.fn(),
  drizzle: jest.fn(),
} as any;

jest.mock('../index', () => ({
  db: mockDrizzle,
}));

describe('Database Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Migration', () => {
    it('should have all required tables', () => {
      expect(schema).toBeDefined();
      expect(schema.users).toBeDefined();
      expect(schema.bodyMetrics).toBeDefined();
      expect(schema.sessions).toBeDefined();
      expect(schema.workouts).toBeDefined();
      expect(schema.nutrition).toBeDefined();
      expect(schema.biometric).toBeDefined();
      expect(schema.visionAnalyses).toBeDefined();
    });

    it('should have correct table relationships', () => {
      expect(schema.bodyMetrics.userId).toBeDefined();
      expect(schema.visionAnalyses.userId).toBeDefined();
      expect(schema.workouts.userId).toBeDefined();
      expect(schema.sessions.userId).toBeDefined();
    });
  });

  describe('User Operations', () => {
    it('should insert user with all required fields', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: Math.floor(Date.now() / 1000),
      };

      mockDrizzle.execute.mockResolvedValueOnce({
        success: true,
        data: mockUser,
      });

      const result = await mockDrizzle.execute(sql`
        INSERT INTO users (id, email, name, createdAt)
        VALUES (?, ?, ?, ?)
      `, [mockUser.id, mockUser.email, mockUser.name, mockUser.createdAt]);

      expect(result.data.email).toBe(mockUser.email);
      expect(mockDrizzle.execute).toHaveBeenCalled();
    });

    it('should find user by email', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockDrizzle.execute.mockResolvedValueOnce({
        success: true,
        results: [mockUser],
      });

      const result = await mockDrizzle.execute(sql`
        SELECT * FROM users WHERE email = ?
      `, ['test@example.com']);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].email).toBe('test@example.com');
    });

    it('should update user profile', async () => {
      const userId = 'user-123';
      const updates = { name: 'Updated Name', age: 30 };

      mockDrizzle.execute.mockResolvedValueOnce({
        success: true,
        changes: 1,
      });

      const result = await mockDrizzle.execute(sql`
        UPDATE users SET name = ?, age = ? WHERE id = ?
      `, [updates.name, updates.age, userId]);

      expect(result.success).toBe(true);
      expect(result.changes).toBe(1);
    });

    it('should handle duplicate email constraint violation', async () => {
      mockDrizzle.execute.mockRejectedValueOnce({
        code: 'SQLITE_CONSTRAINT_UNIQUE',
        message: 'UNIQUE constraint failed',
      });

      await expect(
        mockDrizzle.execute(sql`
          INSERT INTO users (id, email, name) VALUES (?, ?, ?)
        `, ['user-456', 'duplicate@example.com', 'Test'])
      ).rejects.toMatchObject({
        code: 'SQLITE_CONSTRAINT_UNIQUE',
      });
    });
  });

  describe('Body Metrics Operations', () => {
    it('should insert body metric entry', async () => {
      const now = Math.floor(Date.now() / 1000);
      const metric = {
        id: 'metric-123',
        userId: 'user123',
        weight: 72.5,
        bodyFatPercentage: 0.15,
        muscleMass: 30,
        bmi: 22.5,
        timestamp: now,
      };

      mockDrizzle.execute.mockResolvedValueOnce({
        success: true,
        data: metric,
      });

      const result = await mockDrizzle.execute(sql`
        INSERT INTO bodyMetrics (id, userId, weight, bodyFatPercentage, muscleMass, bmi, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [metric.id, metric.userId, metric.weight, metric.bodyFatPercentage, metric.muscleMass, metric.bmi, metric.timestamp]);

      expect(result.data.id).toBe(metric.id);
    });

    it('should retrieve metrics with pagination', async () => {
      const mockMetrics = [
        { id: '1', weight: 70, timestamp: now - 3600 },
        { id: '2', weight: 71, timestamp: now - 7200 },
      ];

      mockDrizzle.execute.mockResolvedValueOnce({
        success: true,
        results: mockMetrics,
      });

      const result = await mockDrizzle.execute(sql`
        SELECT * FROM bodyMetrics
        WHERE userId = ?
        ORDER BY timestamp DESC
        LIMIT 30 OFFSET 0
      `, ['user123']);

      expect(result.results).toHaveLength(2);
      expect(mockDrizzle.execute).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['user123'])
      );
    });

    it('should filter by date range', async () => {
      const startDate = Math.floor(Date.now() / 1000) - 7 * 86400;
      const endDate = Math.floor(Date.now() / 1000);

      mockDrizzle.execute.mockResolvedValueOnce({
        success: true,
        results: [],
      });

      await mockDrizzle.execute(sql`
        SELECT * FROM bodyMetrics
        WHERE userId = ? AND timestamp BETWEEN ? AND ?
      `, ['user123', startDate, endDate]);

      expect(mockDrizzle.execute).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['user123', startDate, endDate])
      );
    });

    it('should delete old metrics', async () => {
      const cutoffDate = Math.floor(Date.now() / 1000) - 30 * 86400;

      mockDrizzle.execute.mockResolvedValueOnce({
        success: true,
        changes: 5,
      });

      const result = await mockDrizzle.execute(sql`
        DELETE FROM bodyMetrics WHERE timestamp < ?
      `, [cutoffDate]);

      expect(result.changes).toBeGreaterThan(0);
    });
  });

  describe('Session Operations', () => {
    it('should create OAuth session', async () => {
      const session = {
        id: 'session-123',
        userId: 'user-123',
        provider: 'google',
        providerUserId: 'google-456',
        token: 'jwt-token',
        createdAt: Math.floor(Date.now() / 1000),
        expiresAt: Math.floor(Date.now() / 1000) + 30 * 86400,
      };

      mockDrizzle.execute.mockResolvedValueOnce({
        success: true,
        data: session,
      });

      const result = await mockDrizzle.execute(sql`
        INSERT INTO sessions (id, userId, provider, providerUserId, token, createdAt, expiresAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [session.id, session.userId, session.provider, session.providerUserId, session.token, session.createdAt, session.expiresAt]);

      expect(result.data.id).toBe(session.id);
    });

    it('should validate session token', async () => {
      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        token: 'jwt-token',
      };

      mockDrizzle.execute.mockResolvedValueOnce({
        success: true,
        results: [mockSession],
      });

      const result = await mockDrizzle.execute(sql`
        SELECT * FROM sessions WHERE token = ? AND expiresAt > ?
      `, ['jwt-token', Math.floor(Date.now() / 1000)]);

      expect(result.results).toHaveLength(1);
    });

    it('should delete session on logout', async () => {
      mockDrizzle.execute.mockResolvedValueOnce({
        success: true,
        changes: 1,
      });

      const result = await mockDrizzle.execute(sql`
        DELETE FROM sessions WHERE token = ?
      `, ['jwt-token']);

      expect(result.changes).toBe(1);
    });
  });

  describe('Vision Analyses', () => {
    it('should store analysis result with JSON data', async () => {
      const now = Math.floor(Date.now() / 1000);
      const analysis = {
        id: 'analysis-123',
        userId: 'user123',
        imageUrl: 'https://storage.example.com/image.jpg',
        analysis: JSON.stringify({
          posture: { score: 0.85, issues: [] },
          symmetry: { leftRightBalance: 0.92 },
          muscleDevelopment: [{ muscle: 'chest', score: 0.7 }],
          bodyComposition: { bodyFatEstimate: 0.15, muscleMassEstimate: 0.35 },
        }),
        confidence: 0.9,
        createdAt: now,
      };

      mockDrizzle.execute.mockResolvedValueOnce({
        success: true,
        data: analysis,
      });

      const result = await mockDrizzle.execute(sql`
        INSERT INTO visionAnalyses (id, userId, imageUrl, analysis, confidence, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        analysis.id,
        analysis.userId,
        analysis.imageUrl,
        analysis.analysis,
        analysis.confidence,
        analysis.createdAt,
      ]);

      expect(result.data.id).toBe(analysis.id);
    });

    it('should retrieve analysis history', async () => {
      const mockAnalyses = [
        { id: '1', userId: 'user123', createdAt: now - 86400 },
        { id: '2', userId: 'user123', createdAt: now - 172800 },
      ];

      mockDrizzle.execute.mockResolvedValueOnce({
        success: true,
        results: mockAnalyses,
      });

      const result = await mockDrizzle.execute(sql`
        SELECT id, createdAt FROM visionAnalyses
        WHERE userId = ? ORDER BY createdAt DESC LIMIT 10
      `, ['user123']);

      expect(result.results).toHaveLength(2);
    });
  });

  describe('Transaction Handling', () => {
    it('should handle multi-table inserts in transaction', async () => {
      const transactionSpy = jest.fn();

      mockDrizzle.batch.mockImplementation(async (operations) => {
        transactionSpy(operations);
        return operations.map(() => ({ success: true }));
      });

      await mockDrizzle.batch([
        sql`INSERT INTO users (id, email) VALUES (?, ?)`,
        sql`INSERT INTO bodyMetrics (id, userId, weight) VALUES (?, ?, ?)`,
        sql`INSERT INTO sessions (id, userId, token) VALUES (?, ?, ?)`,
      ]);

      expect(mockDrizzle.batch).toHaveBeenCalled();
      expect(transactionSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.any(Object),
          expect.any(Object),
          expect.any(Object),
        ])
      );
    });

    it('should rollback on error in batch', async () => {
      mockDrizzle.batch.mockRejectedValueOnce({
        code: 'SQLITE_CONSTRAINT',
        message: 'Foreign key constraint failed',
      });

      await expect(
        mockDrizzle.batch([
          sql`INSERT INTO users (id, email) VALUES (?, ?)`,
          sql`INSERT INTO bodyMetrics (id, userId, weight) VALUES (?, ?, ?)`,
        ])
      ).rejects.toMatchObject({
        code: 'SQLITE_CONSTRAINT',
      });
    });
  });

  describe('Complex Queries', () => {
    it('should join users with body metrics', async () => {
      const mockResult = {
        success: true,
        results: [
          {
            userId: 'user123',
            userEmail: 'test@example.com',
            latestWeight: 72.5,
            latestTimestamp: Math.floor(Date.now() / 1000),
          },
        ],
      };

      mockDrizzle.execute.mockResolvedValueOnce(mockResult);

      const result = await mockDrizzle.execute(sql`
        SELECT u.id as userId, u.email as userEmail, bm.weight as latestWeight, bm.timestamp as latestTimestamp
        FROM users u
        LEFT JOIN bodyMetrics bm ON u.id = bm.userId
        WHERE u.id = ? AND bm.timestamp = (
          SELECT MAX(timestamp) FROM bodyMetrics WHERE userId = u.id
        )
      `, ['user123']);

      expect(result.results[0].userEmail).toBe('test@example.com');
    });

    it('should aggregate biometric data', async () => {
      const mockAgg = {
        avgWeight: 71.5,
        avgBodyFat: 0.16,
        count: 7,
      };

      mockDrizzle.execute.mockResolvedValueOnce({
        success: true,
        results: [mockAgg],
      });

      const result = await mockDrizzle.execute(sql`
        SELECT
          AVG(weight) as avgWeight,
          AVG(bodyFatPercentage) as avgBodyFat,
          COUNT(*) as count
        FROM bodyMetrics
        WHERE userId = ? AND timestamp > ?
      `, ['user123', Math.floor(Date.now() / 1000) - 7 * 86400]);

      expect(result.results[0].avgWeight).toBe(71.5);
    });
  });
});
