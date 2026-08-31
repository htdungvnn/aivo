/**
 * Health Data Types
 * Types for health metrics aggregation
 */

import { z } from 'zod';

// =============================================================================
// Health Data Types
// =============================================================================

/**
 * Daily health data from various sources
 */
export interface DailyHealthData {
  date: string;
  timezone: string;
  
  // Sleep
  sleep: {
    durationHours: number | null;
    quality: number | null; // 0-100
    consistency: number | null; // 0-100
    timeInBed: number | null;
    timeAsleep: number | null;
    remMinutes: number | null;
    deepMinutes: number | null;
    lightMinutes: number | null;
    awakenings: number | null;
    bedtime: string | null;
    wakeTime: string | null;
  };
  
  // Activity
  activity: {
    steps: number | null;
    activeMinutes: number | null;
    moderateMinutes: number | null;
    vigorousMinutes: number | null;
    caloriesBurned: number | null;
    distanceKm: number | null;
    floors: number | null;
  };
  
  // Cardiovascular
  cardiovascular: {
    restingHeartRate: number | null;
    hrv: number | null;
    bloodOxygen: number | null;
    heartRateVariability: number | null;
  };
  
  // Body
  body: {
    weight: number | null;
    bodyFat: number | null;
    bmi: number | null;
    muscleMass: number | null;
    waterPercent: number | null;
  };
  
  // Recovery
  recovery: {
    hrvRecovery: number | null;
    sleepRecovery: number | null;
    stressRecovery: number | null;
    overallRecovery: number | null;
  };
  
  // Self-reported
  selfReported: {
    energy: number | null; // 0-100
    stress: number | null; // 0-100
    muscleSoreness: number | null; // 0-10
    mood: number | null; // 0-100
    sleepQuality: number | null; // 0-100
  };
  
  // Timestamps for data freshness
  timestamps: {
    sleep: number | null;
    activity: number | null;
    cardiovascular: number | null;
    body: number | null;
    selfReported: number | null;
  };
  
  // Confidence scores
  confidence: {
    sleep: number;
    activity: number;
    cardiovascular: number;
    body: number;
    selfReported: number;
  };
  
  // Data sources
  sources: {
    sleep: string[];
    activity: string[];
    cardiovascular: string[];
    body: string[];
    selfReported: string[];
  };
}

/**
 * Health data aggregation result
 */
export interface HealthDataSummary {
  date: string;
  timezone: string;
  
  // Aggregated metrics
  metrics: {
    sleepHours: number | null;
    sleepQuality: number | null;
    steps: number | null;
    activeMinutes: number | null;
    caloriesBurned: number | null;
    restingHeartRate: number | null;
    hrv: number | null;
    weight: number | null;
    energy: number | null;
    stress: number | null;
    muscleSoreness: number | null;
    hydration: number | null;
  };
  
  // Quality indicators
  quality: {
    dataCompleteness: number;
    dataFreshness: number;
    overallConfidence: number;
  };
  
  // Source information
  sources: {
    primary: string;
    all: string[];
  };
}

/**
 * User check-in data
 */
export interface UserCheckIn {
  id: string;
  userId: string;
  date: string;
  timezone: string;
  
  // Self-reported values
  energy: number | null; // 1-10
  stress: number | null; // 1-10
  sleepQuality: number | null; // 1-10
  muscleSoreness: number | null; // 0-10
  
  // Optional notes
  notes: string | null;
  
  // Completion status
  completed: boolean;
  completedAt: number | null;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
}

/**
 * Hydration tracking
 */
export interface HydrationData {
  date: string;
  userId: string;
  
  totalMl: number;
  targetMl: number;
  
  entries: HydrationEntry[];
  
  percentageComplete: number;
  lastDrinkAt: number | null;
}

export interface HydrationEntry {
  id: string;
  amountMl: number;
  timestamp: number;
  source: string;
}

/**
 * Habit tracking
 */
export interface HabitData {
  date: string;
  userId: string;
  
  habits: HabitEntry[];
  
  completionRate: number;
  totalHabits: number;
  completedHabits: number;
}

export interface HabitEntry {
  id: string;
  habitId: string;
  name: string;
  completed: boolean;
  completedAt: number | null;
  target: string;
}

/**
 * Weekly health summary
 */
export interface WeeklyHealthSummary {
  startDate: string;
  endDate: string;
  timezone: string;
  
  // Averages
  averages: {
    readiness: number | null;
    sleepHours: number | null;
    sleepQuality: number | null;
    steps: number | null;
    activeMinutes: number | null;
    restingHeartRate: number | null;
    hrv: number | null;
    energy: number | null;
    stress: number | null;
  };
  
  // Totals
  totals: {
    workouts: number;
    activeDays: number;
    caloriesBurned: number;
    caloriesConsumed: number;
    steps: number;
    activeMinutes: number;
  };
  
  // Trends
  trends: {
    readiness: 'improving' | 'stable' | 'declining' | null;
    sleep: 'improving' | 'stable' | 'declining' | null;
    energy: 'improving' | 'stable' | 'declining' | null;
    activity: 'improving' | 'stable' | 'declining' | null;
  };
  
  // Highlights
  highlights: {
    bestDay: string | null;
    bestReadiness: number | null;
    mostActiveDay: string | null;
    mostSteps: number | null;
  };
  
  // Insights
  insights: string[];
}

// =============================================================================
// Zod Schemas
// =============================================================================

/**
 * DailyHealthData schema
 */
export const DailyHealthDataSchema = z.object({
  date: z.string(),
  timezone: z.string(),
  
  sleep: z.object({
    durationHours: z.number().nullable(),
    quality: z.number().min(0).max(100).nullable(),
    consistency: z.number().min(0).max(100).nullable(),
    timeInBed: z.number().nullable(),
    timeAsleep: z.number().nullable(),
    remMinutes: z.number().nullable(),
    deepMinutes: z.number().nullable(),
    lightMinutes: z.number().nullable(),
    awakenings: z.number().nullable(),
    bedtime: z.string().nullable(),
    wakeTime: z.string().nullable(),
  }),
  
  activity: z.object({
    steps: z.number().nullable(),
    activeMinutes: z.number().nullable(),
    moderateMinutes: z.number().nullable(),
    vigorousMinutes: z.number().nullable(),
    caloriesBurned: z.number().nullable(),
    distanceKm: z.number().nullable(),
    floors: z.number().nullable(),
  }),
  
  cardiovascular: z.object({
    restingHeartRate: z.number().nullable(),
    hrv: z.number().nullable(),
    bloodOxygen: z.number().nullable(),
    heartRateVariability: z.number().nullable(),
  }),
  
  body: z.object({
    weight: z.number().nullable(),
    bodyFat: z.number().nullable(),
    bmi: z.number().nullable(),
    muscleMass: z.number().nullable(),
    waterPercent: z.number().nullable(),
  }),
  
  recovery: z.object({
    hrvRecovery: z.number().nullable(),
    sleepRecovery: z.number().nullable(),
    stressRecovery: z.number().nullable(),
    overallRecovery: z.number().nullable(),
  }),
  
  selfReported: z.object({
    energy: z.number().min(0).max(100).nullable(),
    stress: z.number().min(0).max(100).nullable(),
    muscleSoreness: z.number().min(0).max(10).nullable(),
    mood: z.number().min(0).max(100).nullable(),
    sleepQuality: z.number().min(0).max(100).nullable(),
  }),
  
  timestamps: z.object({
    sleep: z.number().nullable(),
    activity: z.number().nullable(),
    cardiovascular: z.number().nullable(),
    body: z.number().nullable(),
    selfReported: z.number().nullable(),
  }),
  
  confidence: z.object({
    sleep: z.number().min(0).max(1),
    activity: z.number().min(0).max(1),
    cardiovascular: z.number().min(0).max(1),
    body: z.number().min(0).max(1),
    selfReported: z.number().min(0).max(1),
  }),
  
  sources: z.object({
    sleep: z.array(z.string()),
    activity: z.array(z.string()),
    cardiovascular: z.array(z.string()),
    body: z.array(z.string()),
    selfReported: z.array(z.string()),
  }),
});

/**
 * UserCheckIn schema
 */
export const UserCheckInSchema = z.object({
  id: z.string(),
  userId: z.string(),
  date: z.string(),
  timezone: z.string(),
  
  energy: z.number().min(1).max(10).nullable(),
  stress: z.number().min(1).max(10).nullable(),
  sleepQuality: z.number().min(1).max(10).nullable(),
  muscleSoreness: z.number().min(0).max(10).nullable(),
  
  notes: z.string().nullable(),
  completed: z.boolean(),
  completedAt: z.number().nullable(),
  
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * HydrationEntry schema
 */
export const HydrationEntrySchema = z.object({
  id: z.string(),
  amountMl: z.number().positive(),
  timestamp: z.number(),
  source: z.string(),
});

/**
 * HabitEntry schema
 */
export const HabitEntrySchema = z.object({
  id: z.string(),
  habitId: z.string(),
  name: z.string(),
  completed: z.boolean(),
  completedAt: z.number().nullable(),
  target: z.string(),
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate data completeness for health data
 */
export function calculateDataCompleteness(data: DailyHealthData): number {
  const categories = [
    data.sleep.durationHours !== null,
    data.activity.steps !== null,
    data.cardiovascular.restingHeartRate !== null || data.cardiovascular.hrv !== null,
    data.selfReported.energy !== null,
    data.selfReported.stress !== null,
  ];
  
  return categories.filter(Boolean).length / categories.length;
}

/**
 * Calculate average data freshness
 */
export function calculateDataFreshness(data: DailyHealthData): number {
  const timestamps = [
    data.timestamps.sleep,
    data.timestamps.activity,
    data.timestamps.cardiovascular,
    data.timestamps.body,
    data.timestamps.selfReported,
  ].filter((t): t is number => t !== null);
  
  if (timestamps.length === 0) return Infinity;
  
  const now = Date.now();
  const avgAge = timestamps.reduce((sum, t) => sum + (now - t), 0) / timestamps.length;
  
  return avgAge / (1000 * 60 * 60); // Convert to hours
}

/**
 * Create empty health data for a date
 */
export function createEmptyHealthData(date: string, timezone: string): DailyHealthData {
  return {
    date,
    timezone,
    
    sleep: {
      durationHours: null,
      quality: null,
      consistency: null,
      timeInBed: null,
      timeAsleep: null,
      remMinutes: null,
      deepMinutes: null,
      lightMinutes: null,
      awakenings: null,
      bedtime: null,
      wakeTime: null,
    },
    
    activity: {
      steps: null,
      activeMinutes: null,
      moderateMinutes: null,
      vigorousMinutes: null,
      caloriesBurned: null,
      distanceKm: null,
      floors: null,
    },
    
    cardiovascular: {
      restingHeartRate: null,
      hrv: null,
      bloodOxygen: null,
      heartRateVariability: null,
    },
    
    body: {
      weight: null,
      bodyFat: null,
      bmi: null,
      muscleMass: null,
      waterPercent: null,
    },
    
    recovery: {
      hrvRecovery: null,
      sleepRecovery: null,
      stressRecovery: null,
      overallRecovery: null,
    },
    
    selfReported: {
      energy: null,
      stress: null,
      muscleSoreness: null,
      mood: null,
      sleepQuality: null,
    },
    
    timestamps: {
      sleep: null,
      activity: null,
      cardiovascular: null,
      body: null,
      selfReported: null,
    },
    
    confidence: {
      sleep: 0,
      activity: 0,
      cardiovascular: 0,
      body: 0,
      selfReported: 0,
    },
    
    sources: {
      sleep: [],
      activity: [],
      cardiovascular: [],
      body: [],
      selfReported: [],
    },
  };
}
