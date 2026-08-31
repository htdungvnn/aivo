/**
 * Readiness Types
 * Readiness score calculation types and interfaces
 */

import { z } from 'zod';

// =============================================================================
// Enums and Constants
// =============================================================================

/**
 * Readiness score levels
 */
export const READINESS_LEVELS = {
  LOW: 'low',
  MODERATE: 'moderate',
  GOOD: 'good',
  HIGH: 'high',
} as const;

export type ReadinessLevel = (typeof READINESS_LEVELS)[keyof typeof READINESS_LEVELS];

/**
 * Factor codes for readiness calculation
 */
export const READINESS_FACTORS = {
  SLEEP: 'sleep',
  TRAINING_LOAD: 'training_load',
  WORKOUT_COMPLETION: 'workout_completion',
  FORM_QUALITY: 'form_quality',
  MUSCLE_SORENESS: 'muscle_soreness',
  ENERGY: 'energy',
  STRESS: 'stress',
  RESTING_HR: 'resting_hr',
  HRV: 'hrv',
  STEPS: 'steps',
  HYDRATION: 'hydration',
  NUTRITION: 'nutrition',
  RECOVERY_DAYS: 'recovery_days',
} as const;

export type ReadinessFactorCode = (typeof READINESS_FACTORS)[keyof typeof READINESS_FACTORS];

/**
 * Factor contribution status
 */
export const FACTOR_STATUS = {
  NEGATIVE: 'negative',
  NEUTRAL: 'neutral',
  POSITIVE: 'positive',
} as const;

export type FactorStatus = (typeof FACTOR_STATUS)[keyof typeof FACTOR_STATUS];

// =============================================================================
// Value Objects
// =============================================================================

/**
 * Measured value with metadata
 */
export interface MeasuredValue {
  value: number;
  unit: string;
  timestamp: number;
  source: string;
  confidence: number;
  freshness: number; // Hours since measurement
  available: boolean;
}

/**
 * Factor input for readiness calculation
 */
export interface ReadinessFactorInput {
  code: ReadinessFactorCode;
  value: MeasuredValue | null;
  weight: number;
  normalizedScore: number | null;
  contribution: number;
  status: FactorStatus;
  messageKey: string;
}

/**
 * Factor output after calculation
 */
export interface ReadinessFactor {
  code: ReadinessFactorCode;
  score: number;
  weight: number;
  contribution: number;
  status: FactorStatus;
  messageKey: string;
}

// =============================================================================
// Readiness Score Types
// =============================================================================

/**
 * Input data for readiness calculation
 */
export interface ReadinessInput {
  date: string;
  userId: string;
  timezone: string;
  
  // Sleep data
  sleepDuration?: MeasuredValue; // hours
  sleepQuality?: MeasuredValue; // 0-100
  sleepConsistency?: MeasuredValue; // 0-100
  
  // Workout data
  recentWorkoutLoad?: MeasuredValue; // acute:chronic ratio or training load
  workoutCompletion?: MeasuredValue; // 0-100
  formQuality?: MeasuredValue; // 0-100
  muscleSoreness?: MeasuredValue; // 0-10 (0 = no soreness, 10 = very sore)
  
  // Self-reported data
  energy?: MeasuredValue; // 0-100
  stress?: MeasuredValue; // 0-100 (inverted - lower is better)
  
  // Wearable data
  restingHeartRate?: MeasuredValue; // bpm
  hrv?: MeasuredValue; // ms
  
  // Activity data
  steps?: MeasuredValue;
  activityLevel?: MeasuredValue; // minutes of moderate activity
  
  // Nutrition data
  hydration?: MeasuredValue; // ml
  calorieAdherence?: MeasuredValue; // 0-100
  proteinAdherence?: MeasuredValue; // 0-100
  
  // Recovery data
  recoveryDays?: MeasuredValue; // days since last intense workout
  
  // Goals and preferences
  userGoal?: 'fat_loss' | 'muscle_gain' | 'general_fitness' | 'maintenance';
  
  // Data quality
  dataCompleteness: number; // 0-1
  dataFreshness: number; // Average hours old of data
}

/**
 * Output from readiness calculation
 */
export interface ReadinessOutput {
  date: string;
  score: number;
  level: 'low' | 'moderate' | 'good' | 'high';
  confidence: number;
  dataCompleteness: number;
  factors: ReadinessFactor[];
  recommendation: {
    action: 'rest' | 'recovery' | 'light_training' | 'normal_training' | 'high_intensity';
    intensityModifier: number;
    volumeModifier: number;
  };
  algorithmVersion: string;
  calculatedAt: number;
  inputSnapshot: string; // JSON string of key inputs
}

/**
 * Readiness snapshot stored in database
 */
export interface ReadinessSnapshot {
  id: string;
  userId: string;
  date: string;
  timezone: string;
  score: number;
  level: string;
  confidence: number;
  dataCompleteness: number;
  factorsJson: string; // JSON array of ReadinessFactor
  recommendationJson: string; // JSON object
  inputSnapshotJson: string;
  algorithmVersion: string;
  sourceDataTimestampsJson: string; // JSON object of factor -> timestamp
  idempotencyKey: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Factor snapshot stored in database
 */
export interface ReadinessFactorSnapshot {
  id: string;
  readinessSnapshotId: string;
  factorCode: string;
  score: number;
  weight: number;
  contribution: number;
  status: string;
  messageKey: string;
  value: number | null;
  unit: string | null;
  source: string | null;
  confidence: number;
  createdAt: number;
}

// =============================================================================
// Zod Schemas
// =============================================================================

/**
 * MeasuredValue schema
 */
export const MeasuredValueSchema = z.object({
  value: z.number(),
  unit: z.string(),
  timestamp: z.number(),
  source: z.string(),
  confidence: z.number().min(0).max(1),
  freshness: z.number().min(0),
  available: z.boolean(),
});

/**
 * ReadinessFactor schema
 */
export const ReadinessFactorSchema = z.object({
  code: z.string(),
  score: z.number().min(0).max(100),
  weight: z.number().min(0).max(1),
  contribution: z.number().min(-50).max(50),
  status: z.enum(['negative', 'neutral', 'positive']),
  messageKey: z.string(),
});

/**
 * Recommendation schema
 */
export const RecommendationSchema = z.object({
  action: z.enum(['rest', 'recovery', 'light_training', 'normal_training', 'high_intensity']),
  intensityModifier: z.number().min(-1).max(1),
  volumeModifier: z.number().min(-1).max(1),
});

/**
 * ReadinessOutput schema
 */
export const ReadinessOutputSchema = z.object({
  date: z.string(),
  score: z.number().min(0).max(100),
  level: z.enum(['low', 'moderate', 'good', 'high']),
  confidence: z.number().min(0).max(1),
  dataCompleteness: z.number().min(0).max(1),
  factors: z.array(ReadinessFactorSchema),
  recommendation: RecommendationSchema,
  algorithmVersion: z.string(),
  calculatedAt: z.number(),
  inputSnapshot: z.string(),
});

/**
 * ReadinessInput schema
 */
export const ReadinessInputSchema = z.object({
  date: z.string(),
  userId: z.string(),
  timezone: z.string(),
  
  // Sleep
  sleepDuration: MeasuredValueSchema.optional(),
  sleepQuality: MeasuredValueSchema.optional(),
  sleepConsistency: MeasuredValueSchema.optional(),
  
  // Workout
  recentWorkoutLoad: MeasuredValueSchema.optional(),
  workoutCompletion: MeasuredValueSchema.optional(),
  formQuality: MeasuredValueSchema.optional(),
  muscleSoreness: MeasuredValueSchema.optional(),
  
  // Self-reported
  energy: MeasuredValueSchema.optional(),
  stress: MeasuredValueSchema.optional(),
  
  // Wearable
  restingHeartRate: MeasuredValueSchema.optional(),
  hrv: MeasuredValueSchema.optional(),
  
  // Activity
  steps: MeasuredValueSchema.optional(),
  activityLevel: MeasuredValueSchema.optional(),
  
  // Nutrition
  hydration: MeasuredValueSchema.optional(),
  calorieAdherence: MeasuredValueSchema.optional(),
  proteinAdherence: MeasuredValueSchema.optional(),
  
  // Recovery
  recoveryDays: MeasuredValueSchema.optional(),
  
  // Goals
  userGoal: z.enum(['fat_loss', 'muscle_gain', 'general_fitness', 'maintenance']).optional(),
  
  // Data quality
  dataCompleteness: z.number().min(0).max(1),
  dataFreshness: z.number().min(0),
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get default weight for factor
 */
export function getDefaultWeight(factorCode: ReadinessFactorCode): number {
  const weights: Record<ReadinessFactorCode, number> = {
    [READINESS_FACTORS.SLEEP]: 0.20,
    [READINESS_FACTORS.TRAINING_LOAD]: 0.15,
    [READINESS_FACTORS.WORKOUT_COMPLETION]: 0.10,
    [READINESS_FACTORS.FORM_QUALITY]: 0.08,
    [READINESS_FACTORS.MUSCLE_SORENESS]: 0.08,
    [READINESS_FACTORS.ENERGY]: 0.10,
    [READINESS_FACTORS.STRESS]: 0.08,
    [READINESS_FACTORS.RESTING_HR]: 0.06,
    [READINESS_FACTORS.HRV]: 0.05,
    [READINESS_FACTORS.STEPS]: 0.05,
    [READINESS_FACTORS.HYDRATION]: 0.05,
    [READINESS_FACTORS.NUTRITION]: 0.05,
    [READINESS_FACTORS.RECOVERY_DAYS]: 0.05,
  };
  
  return weights[factorCode] ?? 0.05;
}

/**
 * Get message key for factor status
 */
export function getFactorMessageKey(
  factorCode: ReadinessFactorCode,
  status: FactorStatus,
  score: number
): string {
  const prefix = `readiness.factor.${factorCode}`;
  
  if (status === 'positive') {
    return `${prefix}.positive`;
  }
  if (status === 'negative') {
    return `${prefix}.negative`;
  }
  return `${prefix}.neutral`;
}

/**
 * Calculate total weights for available factors
 */
export function calculateAvailableWeight(
  inputs: ReadinessFactorInput[]
): number {
  return inputs
    .filter(input => input.value?.available)
    .reduce((sum, input) => sum + input.weight, 0);
}

/**
 * Redistribute weights for missing factors
 */
export function redistributeWeights(
  inputs: ReadinessFactorInput[]
): ReadinessFactorInput[] {
  const availableInputs = inputs.filter(input => input.value?.available);
  const missingInputs = inputs.filter(input => !input.value?.available);
  
  if (availableInputs.length === 0) {
    // All factors missing - use neutral defaults
    return inputs.map(input => ({
      ...input,
      normalizedScore: 50,
      contribution: 0,
      status: 'neutral' as FactorStatus,
      messageKey: getFactorMessageKey(input.code, 'neutral', 50),
    }));
  }
  
  const totalAvailableWeight = availableInputs.reduce(
    (sum, input) => sum + input.weight,
    0
  );
  
  // Redistribute missing weights proportionally
  return inputs.map(input => {
    if (input.value?.available) {
      // Scale weight to account for missing factors
      const scaledWeight = input.weight / totalAvailableWeight;
      return { ...input, weight: scaledWeight };
    }
    // Missing factor - contributes nothing
    return {
      ...input,
      weight: 0,
      normalizedScore: null,
      contribution: 0,
      status: 'neutral' as FactorStatus,
      messageKey: getFactorMessageKey(input.code, 'neutral', 50),
    };
  });
}
