/**
 * Test Fixtures for AIVO Integration Tests
 *
 * Provides reusable test data factories for common entities.
 */

import { v4 as uuidv4 } from "uuid";

/**
 * Factory for creating user test data.
 */
export const userFactory = {
  default: (overrides: Partial<{
    id: string;
    email: string;
    name: string;
    fitnessLevel: string;
    weight: number;
    height: number;
    age: number;
    gender: "male" | "female";
    goals: string[];
  }> = {}) => ({
    id: overrides.id || uuidv4(),
    email: overrides.email || `test-${Date.now()}@example.com`,
    name: overrides.name || "Test User",
    fitness_level: overrides.fitnessLevel || "beginner",
    weight: overrides.weight ?? 70,
    height: overrides.height ?? 175,
    age: overrides.age ?? 25,
    gender: overrides.gender ?? "male",
    goals: overrides.goals || ["lose_weight"],
    created_at: Date.now(),
    updated_at: Date.now(),
  }),

  withProfile: (overrides?: Partial<Parameters<typeof userFactory.default>[0]>) =>
    userFactory.default(overrides),
};

/**
 * Factory for creating body metrics test data.
 */
export const bodyMetricFactory = {
  default: (overrides: Partial<{
    id: string;
    userId: string;
    timestamp: number;
    weight: number;
    bodyFatPercentage: number;
    muscleMass: number;
    bmi: number;
    notes: string;
    source: string;
  }> = {}) => ({
    id: overrides.id || uuidv4(),
    user_id: overrides.userId || uuidv4(),
    timestamp: overrides.timestamp ?? Date.now(),
    weight: overrides.weight,
    body_fat_percentage: overrides.bodyFatPercentage,
    muscle_mass: overrides.muscleMass,
    bmi: overrides.bmi,
    notes: overrides.notes,
    source: overrides.source || "manual",
  }),

  recent: (userId: string, daysAgo: number = 0) =>
    bodyMetricFactory.default({
      userId,
      timestamp: Date.now() - daysAgo * 24 * 60 * 60 * 1000,
      weight: 70 + daysAgo * 0.1,
      bodyFatPercentage: 0.15,
      muscleMass: 30,
    }),
};

/**
 * Factory for creating sleep log test data.
 */
export const sleepLogFactory = {
  default: (overrides: Partial<{
    id: string;
    userId: string;
    date: string;
    durationHours: number;
    qualityScore: number;
    deepSleepMinutes: number;
    remSleepMinutes: number;
    awakeMinutes: number;
    bedtime: string;
    waketime: string;
    consistencyScore: number;
    notes: string;
    source: string;
  }> = {}) => ({
    id: overrides.id || uuidv4(),
    user_id: overrides.userId || uuidv4(),
    date: overrides.date || "2026-04-30",
    duration_hours: overrides.durationHours ?? 7.5,
    quality_score: overrides.qualityScore ?? 85,
    deep_sleep_minutes: overrides.deepSleepMinutes ?? 90,
    rem_sleep_minutes: overrides.remSleepMinutes ?? 90,
    awake_minutes: overrides.awakeMinutes ?? 15,
    bedtime: overrides.bedtime || "23:00",
    waketime: overrides.waketime || "06:30",
    consistency_score: overrides.consistencyScore ?? 90,
    notes: overrides.notes,
    source: overrides.source || "manual",
    created_at: Date.now(),
    updated_at: Date.now(),
  }),

  goodNight: (userId: string) =>
    sleepLogFactory.default({
      userId,
      durationHours: 8,
      qualityScore: 90,
      deepSleepMinutes: 120,
      remSleepMinutes: 100,
      awakeMinutes: 5,
    }),
};

/**
 * Factory for creating workout test data.
 */
export const workoutFactory = {
  default: (overrides: Partial<{
    id: string;
    userId: string;
    name: string;
    description: string;
    routineId: string;
    startedAt: number;
    completedAt: number | null;
    caloriesBurned: number | null;
  }> = {}) => ({
    id: overrides.id || uuidv4(),
    user_id: overrides.userId || uuidv4(),
    name: overrides.name || "Test Workout",
    description: overrides.description || "Test workout description",
    routine_id: overrides.routineId || null,
    started_at: overrides.startedAt ?? Date.now(),
    completed_at: overrides.completedAt,
    calories_burned: overrides.caloriesBurned,
    created_at: Date.now(),
    updated_at: Date.now(),
  }),

  completed: (userId: string, minutesAgo: number = 0) => {
    const completedAt = Date.now() - minutesAgo * 60 * 1000;
    return workoutFactory.default({
      userId,
      startedAt: completedAt - 60 * 60 * 1000, // 1 hour workout
      completedAt,
      caloriesBurned: 400,
    });
  },
};

/**
 * Predefined test scenarios.
 */
export const testScenarios = {
  // User with complete profile
  completeUser: () => ({
    user: userFactory.withProfile({
      fitnessLevel: "intermediate",
      weight: 75,
      height: 180,
      age: 30,
      gender: "male",
      goals: ["build_muscle", "improve_endurance"],
    }),
    bodyMetrics: [
      bodyMetricFactory.recent(uuidv4(), 0),
      bodyMetricFactory.recent(uuidv4(), 1),
      bodyMetricFactory.recent(uuidv4(), 7),
    ],
    sleepLogs: [
      sleepLogFactory.goodNight(uuidv4()),
    ],
  }),

  // User with recent workout completion (triggers AI scheduler)
  activeUser: (userId: string) => ({
    user: userFactory.withProfile({ id: userId }),
    workouts: [
      workoutFactory.completed(userId, minutesAgo: 60),
      workoutFactory.completed(userId, minutesAgo: 60 * 24), // 1 day ago
    ],
  }),
};
