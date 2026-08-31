/**
 * AIVO Health Types
 * Shared type definitions for the Daily Intelligence system
 */

// =============================================================================
// Constants (must be defined before re-exports)
// =============================================================================

/**
 * Algorithm version for version tracking
 */
export const HEALTH_ALGORITHM_VERSION = '1.0.0';

/**
 * Readiness thresholds (0-100)
 */
export const READINESS_THRESHOLDS = {
  LOW_MAX: 39,
  MODERATE_MAX: 59,
  GOOD_MAX: 79,
  HIGH_MAX: 100,
} as const;

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

export type DailyAction = (typeof DAILY_ACTIONS)[keyof typeof DAILY_ACTIONS];

/**
 * Action status
 */
export const ACTION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  SKIPPED: 'skipped',
} as const;

export type ActionStatus = (typeof ACTION_STATUS)[keyof typeof ACTION_STATUS];

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

export type TrainingIntensity = (typeof TRAINING_INTENSITY)[keyof typeof TRAINING_INTENSITY];

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

export type DataSource = (typeof DATA_SOURCES)[keyof typeof DATA_SOURCES];

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

export type AdaptationType = (typeof ADAPTATION_TYPES)[keyof typeof ADAPTATION_TYPES];

/**
 * Adaptation status
 */
export const ADAPTATION_STATUS = {
  RECOMMENDED: 'recommended',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  RESTORED: 'restored',
} as const;

export type AdaptationStatus = (typeof ADAPTATION_STATUS)[keyof typeof ADAPTATION_STATUS];

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

// =============================================================================
// Re-export all types (after constants are defined)
// =============================================================================

export * from './readiness.js';
export * from './health-data.js';
export * from './charts.js';
export * from './daily-intelligence.js';
export * from './validation.js';

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a value is a valid readiness level
 */
export function isReadinessLevel(value: unknown): value is ReadinessLevel {
  return Object.values(READINESS_LEVELS).includes(value as ReadinessLevel);
}

/**
 * Get readiness level from score
 */
export function getReadinessLevel(score: number): ReadinessLevel {
  if (score <= READINESS_THRESHOLDS.LOW_MAX) return READINESS_LEVELS.LOW;
  if (score <= READINESS_THRESHOLDS.MODERATE_MAX) return READINESS_LEVELS.MODERATE;
  if (score <= READINESS_THRESHOLDS.GOOD_MAX) return READINESS_LEVELS.GOOD;
  return READINESS_LEVELS.HIGH;
}

/**
 * Round to specified decimal places
 */
export function roundTo(value: number, decimals: number = 0): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Normalize value to 0-1 range
 */
export function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return clamp((value - min) / (max - min), 0, 1);
}

/**
 * Check if a value is a valid finite number
 */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(current: number, previous: number): number | null {
  if (!isFiniteNumber(current) || !isFiniteNumber(previous) || previous === 0) {
    return null;
  }
  return roundTo(((current - previous) / previous) * 100, 1);
}

/**
 * Calculate simple moving average
 */
export function calculateSMA(values: number[], window: number): number {
  const validValues = values.filter(isFiniteNumber);
  if (validValues.length === 0) return 0;
  
  const windowValues = validValues.slice(-window);
  return roundTo(
    windowValues.reduce((sum, val) => sum + val, 0) / windowValues.length,
    2
  );
}

/**
 * Get data freshness label
 */
export function getFreshnessLabel(hoursOld: number): string {
  if (hoursOld <= FRESHNESS_THRESHOLDS.REAL_TIME) return 'real_time';
  if (hoursOld <= FRESHNESS_THRESHOLDS.RECENT) return 'recent';
  if (hoursOld <= FRESHNESS_THRESHOLDS.STALE) return 'stale';
  return 'very_stale';
}

/**
 * Parse date string to Date object
 */
export function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get start of day in user timezone
 */
export function getStartOfDay(timezone: string = 'UTC'): Date {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: timezone }));
}

/**
 * Get local date string
 */
export function getLocalDateStr(timezone: string = 'UTC'): string {
  return formatDate(getStartOfDay(timezone));
}

/**
 * Validate date range
 */
export function isValidDateRange(startDate: string, endDate: string): boolean {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end;
}

/**
 * Calculate days between dates
 */
export function daysBetween(startDate: string, endDate: string): number {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
