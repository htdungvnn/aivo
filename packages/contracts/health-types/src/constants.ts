/**
 * Health Type Constants
 * Basic constants that don't depend on other modules
 * This file MUST NOT import from other local files to avoid circular dependencies
 */

import { z } from 'zod';

// =============================================================================
// Chart Constants
// =============================================================================

/**
 * Chart ranges
 */
export const CHART_RANGES = {
  DAY: '1d',
  WEEK: '7d',
  MONTH: '30d',
  THREE_MONTHS: '90d',
  YEAR: '1y',
} as const;

export type ChartRange = (typeof CHART_RANGES)[keyof typeof CHART_RANGES];

/**
 * Chart ranges schema
 */
export const ChartRangesSchema = z.enum(['1d', '7d', '30d', '90d', '1y']);

// =============================================================================
// Health Metrics
// =============================================================================

/**
 * Health metrics
 */
export const HEALTH_METRICS = {
  READINESS: 'readiness',
  SLEEP_DURATION: 'sleep_duration',
  SLEEP_QUALITY: 'sleep_quality',
  SLEEP_CONSISTENCY: 'sleep_consistency',
  RESTING_HR: 'resting_hr',
  HRV: 'hrv',
  STEPS: 'steps',
  ACTIVITY: 'activity',
  HYDRATION: 'hydration',
  CALORIES: 'calories',
  PROTEIN: 'protein',
  CARBS: 'carbs',
  FAT: 'fat',
  WORKOUT_COMPLETION: 'workout_completion',
  TRAINING_LOAD: 'training_load',
  FORM_QUALITY: 'form_quality',
  ENERGY: 'energy',
  STRESS: 'stress',
  MUSCLE_SORENESS: 'muscle_soreness',
  RECOVERY_DAYS: 'recovery_days',
  WEIGHT: 'weight',
  BODY_FAT: 'body_fat',
  HABITS: 'habits',
} as const;

export type HealthMetric = (typeof HEALTH_METRICS)[keyof typeof HEALTH_METRICS];

// =============================================================================
// Action Constants
// =============================================================================

/**
 * Action types
 */
export const DAILY_ACTIONS = {
  START_WORKOUT: 'start_workout',
  LIGHT_WORKOUT: 'light_workout',
  RECOVERY: 'recovery',
  REST: 'rest',
  ADD_PROTEIN: 'add_protein',
  DRINK_WATER: 'drink_water',
  SHORT_WALK: 'short_walk',
  PREPARE_SLEEP: 'prepare_sleep',
  COMPLETE_CHECKIN: 'complete_checkin',
} as const;

export type DailyActionType = (typeof DAILY_ACTIONS)[keyof typeof DAILY_ACTIONS];

/**
 * Action status
 */
export const ACTION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  SKIPPED: 'skipped',
} as const;

export type ActionStatusType = (typeof ACTION_STATUS)[keyof typeof ACTION_STATUS];

// =============================================================================
// Training Constants
// =============================================================================

/**
 * Training intensity recommendations
 */
export const TRAINING_INTENSITY = {
  REST: 'rest',
  RECOVERY: 'recovery',
  LIGHT_TRAINING: 'light_training',
  NORMAL_TRAINING: 'normal_training',
  HIGH_INTENSITY: 'high_intensity',
} as const;

export type TrainingIntensityType = (typeof TRAINING_INTENSITY)[keyof typeof TRAINING_INTENSITY];

// =============================================================================
// Data Source Constants
// =============================================================================

/**
 * Data sources
 */
export const DATA_SOURCES = {
  MANUAL: 'manual',
  WEARABLE: 'wearable',
  AI: 'ai',
  CALCULATED: 'calculated',
  DERIVED: 'derived',
} as const;

export type DataSourceType = (typeof DATA_SOURCES)[keyof typeof DATA_SOURCES];

// =============================================================================
// Adaptation Constants
// =============================================================================

/**
 * Plan adaptation types
 */
export const ADAPTATION_TYPES = {
  INTENSITY: 'intensity',
  VOLUME: 'volume',
  EXERCISE_SELECTION: 'exercise_selection',
  TIMING: 'timing',
  RECOVERY: 'recovery',
} as const;

export type AdaptationTypeType = (typeof ADAPTATION_TYPES)[keyof typeof ADAPTATION_TYPES];

/**
 * Adaptation status
 */
export const ADAPTATION_STATUS = {
  RECOMMENDED: 'recommended',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  RESTORED: 'restored',
} as const;

export type AdaptationStatusType = (typeof ADAPTATION_STATUS)[keyof typeof ADAPTATION_STATUS];

// =============================================================================
// Other Constants
// =============================================================================

/**
 * Algorithm version for version tracking
 */
export const HEALTH_ALGORITHM_VERSION = '1.0.0';

/**
 * Privacy notice for health data
 */
export const PRIVACY_NOTICE = {
  en: "AIVO Readiness is an estimated wellness indicator based on available data. It does not provide medical advice or replace professional guidance.",
  vi: "Chỉ số Sẵn Sàng AIVO là chỉ số ước tính về sức khỏe dựa trên dữ liệu hiện có. Nó không cung cấp lời khuyên y tế hoặc thay thế hướng dẫn chuyên môn.",
} as const;

/**
 * Default readiness weights for each factor
 */
export const DEFAULT_READINESS_WEIGHTS: Record<string, number> = {
  sleep: 0.20,
  training_load: 0.15,
  workout_completion: 0.10,
  form_quality: 0.08,
  muscle_soreness: 0.08,
  energy: 0.10,
  stress: 0.08,
  resting_hr: 0.06,
  hrv: 0.05,
  steps: 0.05,
  hydration: 0.05,
  nutrition: 0.05,
  recovery_days: 0.05,
};

/**
 * Default health targets
 */
export const DEFAULT_HEALTH_TARGETS = {
  steps: 10000,
  hydrationMl: 2000,
  sleepHours: 8,
  caloriesKcal: 2000,
  proteinG: 150,
  carbsG: 250,
  fatG: 65,
  restingHrMax: 70,
  restingHrMin: 50,
  hrvMin: 30,
};

/**
 * Confidence thresholds
 */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.85,
  MEDIUM: 0.70,
  LOW: 0.50,
} as const;

/**
 * Data freshness thresholds (in hours)
 */
export const FRESHNESS_THRESHOLDS = {
  REAL_TIME: 1,
  RECENT: 6,
  STALE: 24,
  VERY_STALE: 48,
} as const;

/**
 * Baseline calculation settings
 */
export const BASELINE_SETTINGS = {
  MIN_HISTORY_DAYS: 7,
  OPTIMAL_HISTORY_DAYS: 14,
  ROLLING_WINDOW_DAYS: 7,
  SEASONAL_ADJUSTMENT_DAYS: 0, // Disabled by default
} as const;

/**
 * Readiness thresholds based on scores (0-100)
 * Used by readiness calculation to determine readiness levels
 */
export const READINESS_THRESHOLDS = {
  LOW_MAX: 40,
  MODERATE_MAX: 60,
  GOOD_MAX: 80,
} as const;
