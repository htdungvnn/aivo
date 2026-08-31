/**
 * Validation Utilities
 * Zod schemas and validation helpers for health types
 */

import { z } from 'zod';
import {
  TRAINING_INTENSITY,
  DATA_SOURCES,
  CHART_RANGES,
  HEALTH_METRICS,
} from './constants.js';
import {
  READINESS_LEVELS,
} from './readiness.js';
import {
  ReadinessInputSchema,
  ReadinessOutputSchema,
  ReadinessFactorSchema,
  MeasuredValueSchema,
} from './readiness.js';
import {
  DailyHealthDataSchema,
  UserCheckInSchema,
} from './health-data.js';
import {
  ChartDataSchema,
  ChartRequestSchema,
} from './charts.js';
import {
  TodayIntelligenceSchema,
  CheckInRequestSchema,
  AdaptationRequestSchema,
  DailyActionSchema,
  PlanAdaptationSchema,
} from './daily-intelligence.js';

// =============================================================================
// Readiness Validation
// =============================================================================

/**
 * Validate readiness input
 */
export function validateReadinessInput(input: unknown) {
  return ReadinessInputSchema.safeParse(input);
}

/**
 * Validate readiness output
 */
export function validateReadinessOutput(output: unknown) {
  return ReadinessOutputSchema.safeParse(output);
}

/**
 * Validate measured value
 */
export function validateMeasuredValue(value: unknown) {
  return MeasuredValueSchema.safeParse(value);
}

/**
 * Validate readiness factor
 */
export function validateReadinessFactor(factor: unknown) {
  return ReadinessFactorSchema.safeParse(factor);
}

// =============================================================================
// Health Data Validation
// =============================================================================

/**
 * Validate daily health data
 */
export function validateDailyHealthData(data: unknown) {
  return DailyHealthDataSchema.safeParse(data);
}

/**
 * Validate user check-in
 */
export function validateUserCheckIn(checkIn: unknown) {
  return UserCheckInSchema.safeParse(checkIn);
}

// =============================================================================
// Chart Validation
// =============================================================================

/**
 * Validate chart data
 */
export function validateChartData(data: unknown) {
  return ChartDataSchema.safeParse(data);
}

/**
 * Validate chart request
 */
export function validateChartRequest(request: unknown) {
  return ChartRequestSchema.safeParse(request);
}

// =============================================================================
// Daily Intelligence Validation
// =============================================================================

/**
 * Validate today intelligence
 */
export function validateTodayIntelligence(data: unknown) {
  return TodayIntelligenceSchema.safeParse(data);
}

/**
 * Validate check-in request
 */
export function validateCheckInRequest(request: unknown) {
  return CheckInRequestSchema.safeParse(request);
}

/**
 * Validate adaptation request
 */
export function validateAdaptationRequest(request: unknown) {
  return AdaptationRequestSchema.safeParse(request);
}

/**
 * Validate daily action
 */
export function validateDailyAction(action: unknown) {
  return DailyActionSchema.safeParse(action);
}

/**
 * Validate plan adaptation
 */
export function validatePlanAdaptation(adaptation: unknown) {
  return PlanAdaptationSchema.safeParse(adaptation);
}

// =============================================================================
// Input Validation
// =============================================================================

/**
 * Validate numeric input is within range
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): { valid: boolean; error?: string } {
  if (!(typeof value === 'number' && Number.isFinite(value))) {
    return { valid: false, error: `${fieldName} must be a finite number` };
  }
  if (value < min || value > max) {
    return { valid: false, error: `${fieldName} must be between ${min} and ${max}` };
  }
  return { valid: true };
}

/**
 * Validate date string format
 */
export function validateDateString(
  dateStr: string,
  fieldName: string
): { valid: boolean; error?: string } {
  if (typeof dateStr !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }
  
  // Check format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    return { valid: false, error: `${fieldName} must be in YYYY-MM-DD format` };
  }
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return { valid: false, error: `${fieldName} is not a valid date` };
  }
  
  return { valid: true };
}

/**
 * Validate timezone string
 */
export function validateTimezone(
  timezone: string,
  fieldName: string
): { valid: boolean; error?: string } {
  if (typeof timezone !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }
  
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return { valid: true };
  } catch {
    return { valid: false, error: `${fieldName} is not a valid timezone` };
  }
}

/**
 * Validate UUID string
 */
export function validateUUID(
  id: string,
  fieldName: string
): { valid: boolean; error?: string } {
  if (typeof id !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return { valid: false, error: `${fieldName} must be a valid UUID` };
  }
  
  return { valid: true };
}

/**
 * Validate metric name
 */
export function validateMetric(
  metric: string
): { valid: boolean; error?: string } {
  if (!Object.values(HEALTH_METRICS).includes(metric as (typeof HEALTH_METRICS)[keyof typeof HEALTH_METRICS])) {
    return {
      valid: false,
      error: `Unknown metric: ${metric}. Valid metrics: ${Object.values(HEALTH_METRICS).join(', ')}`,
    };
  }
  return { valid: true };
}

/**
 * Validate chart range
 */
export function validateChartRange(
  range: string
): { valid: boolean; error?: string } {
  if (!Object.values(CHART_RANGES).includes(range as (typeof CHART_RANGES)[keyof typeof CHART_RANGES])) {
    return {
      valid: false,
      error: `Unknown range: ${range}. Valid ranges: ${Object.values(CHART_RANGES).join(', ')}`,
    };
  }
  return { valid: true };
}

// =============================================================================
// Sanitization
// =============================================================================

/**
 * Sanitize string input
 */
export function sanitizeString(input: string, maxLength: number = 500): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength);
}

/**
 * Sanitize notes (remove potential injection)
 */
export function sanitizeNotes(input: string): string {
  if (typeof input !== 'string') return '';
  
  // Remove control characters except newlines and tabs
  const sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  return sanitized.trim().slice(0, 500);
}

/**
 * Sanitize JSON string for logging
 */
export function sanitizeForLogging(obj: Record<string, unknown>, sensitiveFields: string[] = []): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveFields.includes(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value as Record<string, unknown>, sensitiveFields);
    } else if (typeof value === 'string' && value.length > 1000) {
      sanitized[key] = value.slice(0, 1000) + '...[TRUNCATED]';
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// =============================================================================
// Batch Validation
// =============================================================================

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate multiple items
 */
export function validateBatch<T>(
  items: T[],
  validator: (item: T) => { valid: boolean; error?: string }
): ValidationResult {
  const errors: string[] = [];
  
  for (let i = 0; i < items.length; i++) {
    const result = validator(items[i]);
    if (!result.valid && result.error) {
      errors.push(`[${i}]: ${result.error}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate readiness inputs batch
 */
export function validateReadinessInputsBatch(inputs: unknown[]): ValidationResult {
  const errors: string[] = [];
  
  for (let i = 0; i < inputs.length; i++) {
    const result = ReadinessInputSchema.safeParse(inputs[i]);
    if (!result.success) {
      errors.push(
        `[${i}]: ${result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      );
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate chart requests batch
 */
export function validateChartRequestsBatch(requests: unknown[]): ValidationResult {
  const errors: string[] = [];
  
  for (let i = 0; i < requests.length; i++) {
    const result = ChartRequestSchema.safeParse(requests[i]);
    if (!result.success) {
      errors.push(
        `[${i}]: ${result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      );
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// Error Messages
// =============================================================================

/**
 * Standard error messages
 */
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: (field: string) => `${field} is required`,
  INVALID_TYPE: (field: string, expected: string) => `${field} must be ${expected}`,
  OUT_OF_RANGE: (field: string, min: number, max: number) =>
    `${field} must be between ${min} and ${max}`,
  INVALID_DATE: (field: string) => `${field} must be a valid date in YYYY-MM-DD format`,
  INVALID_TIMEZONE: (field: string) => `${field} must be a valid timezone`,
  INVALID_UUID: (field: string) => `${field} must be a valid UUID`,
  INVALID_ENUM: (field: string, validValues: string[]) =>
    `${field} must be one of: ${validValues.join(', ')}`,
  STRING_TOO_LONG: (field: string, maxLength: number) =>
    `${field} must not exceed ${maxLength} characters`,
  ARRAY_TOO_SHORT: (field: string, minLength: number) =>
    `${field} must have at least ${minLength} items`,
  ARRAY_TOO_LONG: (field: string, maxLength: number) =>
    `${field} must not exceed ${maxLength} items`,
  INVALID_JSON: (field: string) => `${field} must be valid JSON`,
};

/**
 * Get validation error message
 */
export function getValidationError(field: string, error: z.ZodError): string[] {
  return error.issues
    .filter(e => e.path[0] === field)
    .map(e => `${field}: ${e.message}`);
}
