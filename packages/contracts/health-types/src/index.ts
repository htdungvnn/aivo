/**
 * AIVO Health Types
 * Shared type definitions for the Daily Intelligence system
 *
 * IMPORTANT: Constants are defined in constants.ts to avoid circular dependencies.
 */

// =============================================================================
// Import constants from constants.ts
// =============================================================================

import {
  CHART_RANGES,
  type ChartRange,
  ChartRangesSchema,
  HEALTH_METRICS,
  type HealthMetric,
  DAILY_ACTIONS,
  type DailyActionType,
  ACTION_STATUS,
  type ActionStatusType,
  TRAINING_INTENSITY,
  type TrainingIntensityType,
  DATA_SOURCES,
  type DataSourceType,
  ADAPTATION_TYPES,
  type AdaptationTypeType,
  ADAPTATION_STATUS,
  type AdaptationStatusType,
  HEALTH_ALGORITHM_VERSION,
  PRIVACY_NOTICE,
  DEFAULT_READINESS_WEIGHTS,
  DEFAULT_HEALTH_TARGETS,
  CONFIDENCE_THRESHOLDS,
  FRESHNESS_THRESHOLDS,
  BASELINE_SETTINGS,
  READINESS_THRESHOLDS,
} from './constants.js';

// =============================================================================
// Import types and functions from readiness.ts
// =============================================================================

import {
  READINESS_LEVELS,
  type ReadinessLevel,
  READINESS_FACTORS,
  type ReadinessFactorCode,
  FACTOR_STATUS,
  type FactorStatus,
  type MeasuredValue,
  type ReadinessFactorInput,
  type ReadinessFactor,
  type ReadinessInput,
  type ReadinessOutput,
  type ReadinessSnapshot,
  type ReadinessFactorSnapshot,
  MeasuredValueSchema,
  ReadinessFactorSchema,
  RecommendationSchema,
  ReadinessOutputSchema,
  ReadinessInputSchema,
  getDefaultWeight,
  getFactorMessageKey,
  calculateAvailableWeight,
  redistributeWeights,
} from './readiness.js';

// =============================================================================
// Import remaining modules
// =============================================================================

export * from './health-data.js';
export * from './charts.js';
export * from './daily-intelligence.js';
export * from './validation.js';

// =============================================================================
// Re-export all constants
// =============================================================================

export {
  CHART_RANGES,
  type ChartRange,
  ChartRangesSchema,
  HEALTH_METRICS,
  type HealthMetric,
  DAILY_ACTIONS,
  type DailyActionType,
  ACTION_STATUS,
  type ActionStatusType,
  TRAINING_INTENSITY,
  type TrainingIntensityType,
  DATA_SOURCES,
  type DataSourceType,
  ADAPTATION_TYPES,
  type AdaptationTypeType,
  ADAPTATION_STATUS,
  type AdaptationStatusType,
  HEALTH_ALGORITHM_VERSION,
  PRIVACY_NOTICE,
  DEFAULT_READINESS_WEIGHTS,
  DEFAULT_HEALTH_TARGETS,
  CONFIDENCE_THRESHOLDS,
  FRESHNESS_THRESHOLDS,
  BASELINE_SETTINGS,
  READINESS_THRESHOLDS,
  READINESS_LEVELS,
};

// =============================================================================
// Re-export readiness types
// =============================================================================

export {
  type ReadinessLevel,
  type ReadinessFactorCode,
  type FactorStatus,
  type MeasuredValue,
  type ReadinessFactorInput,
  type ReadinessFactor,
  type ReadinessInput,
  type ReadinessOutput,
  type ReadinessSnapshot,
  type ReadinessFactorSnapshot,
  MeasuredValueSchema,
  ReadinessFactorSchema,
  RecommendationSchema,
  ReadinessOutputSchema,
  ReadinessInputSchema,
  getDefaultWeight,
  getFactorMessageKey,
  calculateAvailableWeight,
  redistributeWeights,
};

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
