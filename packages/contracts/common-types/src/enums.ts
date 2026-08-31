/**
 * Common Enums and Constants
 * 
 * Shared enums used across AIVO services.
 * Consolidated from health-types, nutrition-types, and fitness-types.
 * 
 * @module @aivo/common-types/enums
 */

/**
 * Chart metric types for health and nutrition dashboards.
 * Used by both web and mobile apps.
 */
export const CHART_METRIC = {
  CALORIES: 'calories',
  PROTEIN: 'protein',
  CARBS: 'carbs',
  FAT: 'fat',
  FIBER: 'fiber',
  SUGAR: 'sugar',
  SODIUM: 'sodium',
  CHOLESTEROL: 'cholesterol',
} as const;

export type ChartMetric = typeof CHART_METRIC[keyof typeof CHART_METRIC];

/**
 * Chart time range options.
 */
export const CHART_RANGE = {
  DAY: '1d',
  WEEK: '7d',
  MONTH: '30d',
  QUARTER: '90d',
} as const;

export type ChartRange = typeof CHART_RANGE[keyof typeof CHART_RANGE];

/**
 * Chart aggregation periods.
 */
export const CHART_PERIOD = {
  HOURLY: 'hourly',
  DAILY: 'daily',
  WEEKLY: 'weekly',
} as const;

export type ChartPeriod = typeof CHART_PERIOD[keyof typeof CHART_PERIOD];

/**
 * Client types for authentication.
 */
export const CLIENT_TYPE = {
  WEB: 'web',
  IOS: 'ios',
  ANDROID: 'android',
} as const;

export type ClientType = typeof CLIENT_TYPE[keyof typeof CLIENT_TYPE];

/**
 * OAuth providers supported by AIVO.
 */
export const OAUTH_PROVIDER = {
  GOOGLE: 'google',
  FACEBOOK: 'facebook',
  APPLE: 'apple',
} as const;

export type OAuthProvider = typeof OAUTH_PROVIDER[keyof typeof OAUTH_PROVIDER];

/**
 * Session status types.
 */
export const SESSION_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
} as const;

export type SessionStatus = typeof SESSION_STATUS[keyof typeof SESSION_STATUS];

/**
 * Plan status types.
 */
export const PLAN_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  PAUSED: 'paused',
} as const;

export type PlanStatus = typeof PLAN_STATUS[keyof typeof PLAN_STATUS];

/**
 * Meal types for nutrition tracking.
 */
export const MEAL_TYPE = {
  BREAKFAST: 'breakfast',
  LUNCH: 'lunch',
  DINNER: 'dinner',
  SNACK: 'snack',
} as const;

export type MealType = typeof MEAL_TYPE[keyof typeof MEAL_TYPE];

/**
 * Health score levels.
 */
export const HEALTH_LEVEL = {
  LOW: 'low',
  MODERATE: 'moderate',
  GOOD: 'good',
  HIGH: 'high',
} as const;

export type HealthLevel = typeof HEALTH_LEVEL[keyof typeof HEALTH_LEVEL];

/**
 * Exercise difficulty levels.
 */
export const EXERCISE_DIFFICULTY = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const;

export type ExerciseDifficulty = typeof EXERCISE_DIFFICULTY[keyof typeof EXERCISE_DIFFICULTY];

/**
 * Exercise goals.
 */
export const EXERCISE_GOAL = {
  FAT_LOSS: 'fat_loss',
  MUSCLE_GAIN: 'muscle_gain',
  GENERAL_FITNESS: 'general_fitness',
  MOBILITY: 'mobility',
} as const;

export type ExerciseGoal = typeof EXERCISE_GOAL[keyof typeof EXERCISE_GOAL];

/**
 * Error codes used across AIVO services.
 */
export const ERROR_CODE = {
  // Auth errors (1000-1999)
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  FORBIDDEN: 'FORBIDDEN',
  
  // Validation errors (2000-2999)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  
  // Rate limiting (3000-3999)
  RATE_LIMITED: 'RATE_LIMITED',
  
  // Server errors (5000-5999)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = typeof ERROR_CODE[keyof typeof ERROR_CODE];
