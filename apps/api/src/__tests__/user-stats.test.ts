/// <reference types="jest" />
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { aggregateUserStats, generateInfographicR2Key } from '../services/user-stats';
import type { DB } from '../services/user-stats';

// Mock DB with necessary table structures
const createMockDb = () => {
  const db: any = {
    query: {
      workouts: { findMany: jest.fn() },
      gamificationProfiles: { findFirst: jest.fn() },
      bodyMetrics: { findMany: jest.fn() },
      biometricSnapshots: { findFirst: jest.fn() },
      users: { findFirst: jest.fn() },
      workoutExercises: { findMany: jest.fn() },
      badges: { count: jest.fn() },
      visionAnalyses: { findMany: jest.fn() },
    },
    execute: jest.fn(), // for getTotalUserCount
    // Table schemas with column placeholders
    workouts: { userId: {}, status: {}, startTime: {}, endTime: {}, type: {}, exercises: {} },
    bodyMetrics: { userId: {}, timestamp: {}, weight: {}, bodyFatPercentage: {}, muscleMass: {} },
    biometricSnapshots: { userId: {}, date: {}, recoveryScore: {} },
    users: { id: {}, email: {} },
    workoutExercises: { workoutId: {}, name: {}, sets: {}, reps: {}, weight: {} },
    gamificationProfiles: { userId: {} },
    badges: { userId: {} },
    visionAnalyses: { userId: {}, analysisDate: {}, muscleDevelopment: {} },
  };
  return db;
};

describe('User Stats Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('aggregateUserStats', () => {
    const userId = 'user-123';
    const mockWorkouts = [
      {
        id: 'w1',
        userId,
        startTime: new Date('2024-01-01T10:00:00Z').getTime() / 1000,
        endTime: new Date('2024-01-01T11:00:00Z').getTime() / 1000,
        duration: 60,
        caloriesBurned: 500,
        status: 'completed',
        type: 'strength',
        exercises: [
          { name: 'Squat', sets: 3, reps: 10, weight: 100 },
          { name: 'Bench', sets: 3, reps: 8, weight: 80 },
        ],
      },
      {
        id: 'w2',
        userId,
        startTime: new Date('2024-01-02T08:00:00Z').getTime() / 1000,
        endTime: new Date('2024-01-02T09:00:00Z').getTime() / 1000,
        duration: 45,
        caloriesBurned: 300,
        status: 'completed',
        type: 'cardio',
        exercises: [],
      },
    ];

    const mockGamification = {
      userId,
      streakCurrent: 5,
      streakLongest: 10,
      totalPoints: 1000,
      level: 3,
      leaderboardPosition: 50,
    };

    const mockBodyMetrics = [
      { userId, timestamp: new Date('2024-01-15').getTime(), weight: 78, bodyFatPercentage: 0.13 },
      { userId, timestamp: new Date('2024-01-01').getTime(), weight: 80, bodyFatPercentage: 0.15 },
    ];

    it('aggregates stats correctly with full data', async () => {
      const db = createMockDb();
      db.query.workouts.findMany.mockResolvedValue(mockWorkouts);
      db.query.gamificationProfiles.findFirst.mockResolvedValue(mockGamification);
      db.query.bodyMetrics.findMany.mockResolvedValue(mockBodyMetrics);
      db.query.biometricSnapshots.findFirst.mockResolvedValue(null);
      db.query.users.findFirst.mockResolvedValue(null);
      db.query.workoutExercises.findMany.mockResolvedValue([]);
      db.query.visionAnalyses.findMany.mockResolvedValue([]);
      db.query.badges.count.mockResolvedValue(5);
      db.execute.mockResolvedValue({ count: 100 });

      const result = await aggregateUserStats(db as unknown as DB, userId, {
        type: 'weekly',
        start: '2024-01-01',
        end: '2024-01-07',
      });

      // Period
      expect(result.period.type).toBe('weekly');
      expect(result.period.startDate).toBe('2024-01-01');
      expect(result.period.endDate).toBe('2024-01-07');

      // Workouts
      expect(result.workouts.count).toBe(2);
      expect(result.workouts.totalMinutes).toBe(105);
      expect(result.workouts.totalCalories).toBe(800);
      expect(result.workouts.avgDuration).toBeCloseTo(52.5);
      expect(result.workouts.types.strength).toBe(1);
      expect(result.workouts.types.cardio).toBe(1);
      expect(result.workouts.personalRecords).toHaveLength(2); // squat and bench

      // Strength (top exercises, estimated 1RM)
      expect(result.strength.totalVolume).toBeGreaterThan(0);
      expect(result.strength.topExercises.length).toBeGreaterThan(0);
      expect(result.strength.estimatedOneRMs['Squat']).toBeGreaterThan(0);
      expect(result.strength.estimatedOneRMs['Bench']).toBeGreaterThan(0);

      // Gamification
      expect(result.gamification.streak).toBe(5);
      expect(result.gamification.longestStreak).toBe(10);
      expect(result.gamification.points).toBe(1000);
      expect(result.gamification.level).toBe(3);
      expect(result.gamification.badges).toBe(5); // from db.query.badges.count
      expect(result.gamification.leaderboardRank).toBe(50);
      expect(result.gamification.percentile).toBe(50); // 50/100 * 100 = 50%

      // Body
      expect(result.body.weightChange).toBeCloseTo(-2, 1); // 78 - 80 = -2
      expect(result.body.bodyFatChange).toBeCloseTo(-0.02, 2);
      expect(result.body.muscleGain).toBeUndefined(); // not calculated

      // Comparisons
      expect(result.comparisons).toBeDefined();
      expect(result.comparisons.vsAverage).toBeDefined();
    });

    it('handles no workouts', async () => {
      const db = createMockDb();
      db.query.workouts.findMany.mockResolvedValue([]);
      db.query.gamificationProfiles.findFirst.mockResolvedValue(null);
      db.query.bodyMetrics.findMany.mockResolvedValue([]);
      db.query.biometricSnapshots.findFirst.mockResolvedValue(null);
      db.query.users.findFirst.mockResolvedValue(null);
      db.query.workoutExercises.findMany.mockResolvedValue([]);

      const result = await aggregateUserStats(db as unknown as DB, userId, {
        type: 'all_time',
        start: '2020-01-01',
      });

      expect(result.workouts.count).toBe(0);
      expect(result.workouts.totalMinutes).toBe(0);
      expect(result.workouts.totalCalories).toBe(0);
      expect(result.workouts.avgDuration).toBe(0);
      expect(result.workouts.types.strength).toBe(0);
      expect(result.strength.totalVolume).toBe(0);
      expect(result.strength.topExercises).toEqual([]);
      expect(result.gamification.streak).toBe(0); // default when no profile
      expect(result.body.weightChange).toBeUndefined();
    });

    it('calculates personal records correctly', async () => {
      const db = createMockDb();
      const workoutsWithPR = [
        {
          id: 'w1',
          userId,
          startTime: 1000,
          endTime: 2000,
          duration: 60,
          caloriesBurned: 500,
          status: 'completed',
          type: 'strength',
          exercises: [
            { name: 'Squat', sets: 3, reps: 5, weight: 200 },
            { name: 'Squat', sets: 3, reps: 8, weight: 180 }, // lower 1RM
          ],
        },
        {
          id: 'w2',
          userId,
          startTime: 2000,
          endTime: 3000,
          duration: 60,
          caloriesBurned: 500,
          status: 'completed',
          type: 'strength',
          exercises: [
            { name: 'Squat', sets: 3, reps: 3, weight: 225 }, // higher 1RM
          ],
        },
      ];

      db.query.workouts.findMany.mockResolvedValue(workoutsWithPR);
      db.query.gamificationProfiles.findFirst.mockResolvedValue(null);
      db.query.bodyMetrics.findMany.mockResolvedValue([]);
      db.query.biometricSnapshots.findFirst.mockResolvedValue(null);
      db.query.users.findFirst.mockResolvedValue(null);
      db.query.workoutExercises.findMany.mockResolvedValue([]);
      db.query.visionAnalyses.findMany.mockResolvedValue([]);
      db.query.badges.count.mockResolvedValue(5);
      db.execute.mockResolvedValue({ count: 100 });

      const result = await aggregateUserStats(db as unknown as DB, userId, {
        type: 'monthly',
        start: '2024-01-01',
        end: '2024-01-31',
      });

      const squatPR = result.workouts.personalRecords.find(pr => pr.exercise === 'Squat');
      expect(squatPR).toBeDefined();
      expect(squatPR.weight).toBeCloseTo(247.5, 1); // Epley formula: 225 * (1 + 3/30) = 247.5
      expect(squatPR.reps).toBe(3);
      // improvementPercent is not currently calculated, so it may be undefined
    });
  });

  describe('generateInfographicR2Key', () => {
    it('generates correct key format', () => {
      const userId = 'user-123';
      const infographicId = 'weekly';
      const format: const = 'svg';
      const key = generateInfographicR2Key(userId, infographicId, format);
      expect(key).toMatch(/^infographics\/user-123\/svg\/weekly-\d+\.svg$/);
    });

    it('handles different formats', () => {
      const keySvg = generateInfographicR2Key('u1', 'monthly', 'svg');
      expect(keySvg).toContain('/svg/monthly-');
      expect(keySvg).toMatch(/\.svg$/);

      const keyPng = generateInfographicR2Key('u2', 'all_time', 'png');
      expect(keyPng).toContain('/png/all_time-');
      expect(keyPng).toMatch(/\.png$/);
    });
  });
});
