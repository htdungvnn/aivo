/**
 * AIVO Health Types
 * Shared type definitions for the Daily Intelligence system
 * 
 * IMPORTANT: Constants are defined in constants.ts to avoid circular dependencies.
 * Re-exports from constants.ts must come first.
 */

// =============================================================================
// Re-export ALL constants from constants.ts (no circular dependencies)
// =============================================================================

export * from './constants.js';

// =============================================================================
// Re-export all types (these don't cause circular dependencies at module load time)
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
