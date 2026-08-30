/**
 * Readiness Calculation Engine
 * Pure deterministic functions for readiness score calculation
 * 
 * This module contains no I/O, no network calls, and no database access.
 * All functions are pure and deterministic.
 */

import {
  ReadinessInput,
  ReadinessOutput,
  ReadinessFactorInput,
  ReadinessFactor,
  MeasuredValue,
  READINESS_FACTORS,
  READINESS_LEVELS,
  TRAINING_INTENSITY,
  HEALTH_ALGORITHM_VERSION,
  getReadinessLevel,
  roundTo,
  clamp,
  isFiniteNumber,
  DEFAULT_READINESS_WEIGHTS,
} from '@repo/health-types';

// =============================================================================
// Constants
// =============================================================================

/**
 * Default algorithm version
 */
const ALGORITHM_VERSION = HEALTH_ALGORITHM_VERSION;

/**
 * Minimum confidence for high-quality data
 */
const HIGH_CONFIDENCE_THRESHOLD = 0.85;

/**
 * Medium confidence threshold
 */
const MEDIUM_CONFIDENCE_THRESHOLD = 0.70;

/**
 * Neutral score when factor is missing
 */
const NEUTRAL_SCORE = 50;

/**
 * Maximum contribution per factor
 */
const MAX_FACTOR_CONTRIBUTION = 25;

/**
 * Readiness score thresholds
 */
const SCORE_THRESHOLDS = {
  LOW_MAX: 39,
  MODERATE_MAX: 59,
  GOOD_MAX: 79,
  HIGH_MAX: 100,
} as const;

// =============================================================================
// Normalization Functions
// =============================================================================

/**
 * Normalize sleep duration to 0-100 score
 * Optimal range: 7-9 hours
 */
export function normalizeSleepDuration(hours: number | null): number | null {
  if (hours === null || !isFiniteNumber(hours)) return null;
  if (hours <= 0) return 0;
  
  // Optimal sleep: 7-9 hours
  if (hours >= 7 && hours <= 9) return 100;
  
  // Below optimal
  if (hours < 7) {
    // Linear from 0 at 0h to 100 at 7h
    return clamp(roundTo((hours / 7) * 100, 1), 0, 100);
  }
  
  // Above optimal (penalize overtime)
  if (hours > 9) {
    // Slight penalty for oversleeping
    const excess = hours - 9;
    return clamp(roundTo(100 - excess * 10, 1), 50, 100);
  }
  
  return NEUTRAL_SCORE;
}

/**
 * Normalize sleep quality to 0-100 score
 */
export function normalizeSleepQuality(quality: number | null): number | null {
  if (quality === null || !isFiniteNumber(quality)) return null;
  return clamp(roundTo(quality, 1), 0, 100);
}

/**
 * Normalize training load (acute:chronic ratio) to 0-100 score
 * Optimal range: 0.8-1.3 (fresh to moderately fatigued)
 */
export function normalizeTrainingLoad(load: number | null): number | null {
  if (load === null || !isFiniteNumber(load)) return null;
  if (load <= 0) return 0;
  
  // Optimal range: 0.8-1.3
  if (load >= 0.8 && load <= 1.3) return 100;
  
  // Too low (under-trained)
  if (load < 0.8) {
    return clamp(roundTo((load / 0.8) * 100, 1), 0, 100);
  }
  
  // Too high (over-trained)
  if (load > 1.3) {
    // Exponential penalty as load increases
    const excess = load - 1.3;
    const penalty = 100 * (1 - Math.exp(-excess * 2));
    return clamp(roundTo(100 - penalty, 1), 0, 50);
  }
  
  return NEUTRAL_SCORE;
}

/**
 * Normalize workout completion to 0-100 score
 */
export function normalizeWorkoutCompletion(completion: number | null): number | null {
  if (completion === null || !isFiniteNumber(completion)) return null;
  return clamp(roundTo(completion, 1), 0, 100);
}

/**
 * Normalize form quality to 0-100 score
 */
export function normalizeFormQuality(quality: number | null): number | null {
  if (quality === null || !isFiniteNumber(quality)) return null;
  return clamp(roundTo(quality, 1), 0, 100);
}

/**
 * Normalize muscle soreness to 0-100 score (inverted - low soreness is good)
 * Input: 0-10 (0 = no soreness, 10 = very sore)
 * Output: 0-100 (0 = very sore, 100 = no soreness)
 */
export function normalizeMuscleSoreness(soreness: number | null): number | null {
  if (soreness === null || !isFiniteNumber(soreness)) return null;
  // Invert: 0 soreness -> 100 score, 10 soreness -> 0 score
  return clamp(roundTo((10 - soreness) * 10, 1), 0, 100);
}

/**
 * Normalize energy level to 0-100 score
 */
export function normalizeEnergy(energy: number | null): number | null {
  if (energy === null || !isFiniteNumber(energy)) return null;
  return clamp(roundTo(energy, 1), 0, 100);
}

/**
 * Normalize stress level to 0-100 score (inverted - low stress is good)
 * Input: 0-100 (0 = no stress, 100 = very stressed)
 * Output: 0-100 (0 = very stressed, 100 = no stress)
 */
export function normalizeStress(stress: number | null): number | null {
  if (stress === null || !isFiniteNumber(stress)) return null;
  // Invert: 0 stress -> 100 score, 100 stress -> 0 score
  return clamp(roundTo(100 - stress, 1), 0, 100);
}

/**
 * Normalize resting heart rate to 0-100 score
 * Lower is generally better, but too low can be concerning
 * Optimal range: 50-70 bpm for adults
 */
export function normalizeRestingHR(hr: number | null, baseline?: number): number | null {
  if (hr === null || !isFiniteNumber(hr)) return null;
  if (hr <= 0) return 0;
  
  // Use baseline if available
  const optimalLow = baseline ? baseline - 5 : 50;
  const optimalHigh = baseline ? baseline + 10 : 70;
  
  // Optimal range
  if (hr >= optimalLow && hr <= optimalHigh) return 100;
  
  // Below optimal (potentially too low)
  if (hr < optimalLow) {
    const deficit = optimalLow - hr;
    return clamp(roundTo(100 - deficit * 5, 1), 70, 100);
  }
  
  // Above optimal (elevated)
  if (hr > optimalHigh) {
    const excess = hr - optimalHigh;
    return clamp(roundTo(100 - excess * 3, 1), 30, 100);
  }
  
  return NEUTRAL_SCORE;
}

/**
 * Normalize HRV to 0-100 score
 * Higher is generally better for recovery
 * Optimal: >50ms for adults
 */
export function normalizeHRV(hrv: number | null, baseline?: number): number | null {
  if (hrv === null || !isFiniteNumber(hrv)) return null;
  if (hrv <= 0) return 0;
  
  // Use baseline if available
  const optimalMin = baseline ? baseline * 0.8 : 30;
  const optimalMinGood = baseline ? baseline * 0.9 : 50;
  
  // Above optimal
  if (hrv >= optimalMinGood) return 100;
  
  // Below optimal
  if (hrv >= optimalMin) {
    return clamp(roundTo(((hrv - optimalMin) / (optimalMinGood - optimalMin)) * 50 + 50, 1), 50, 100);
  }
  
  // Too low
  return clamp(roundTo((hrv / optimalMin) * 50, 1), 0, 50);
}

/**
 * Normalize steps to 0-100 score
 * Target: 10,000 steps
 */
export function normalizeSteps(steps: number | null, target: number = 10000): number | null {
  if (steps === null || !isFiniteNumber(steps)) return null;
  if (steps <= 0) return 0;
  
  // Above target
  if (steps >= target) return 100;
  
  // Below target
  return clamp(roundTo((steps / target) * 100, 1), 0, 100);
}

/**
 * Normalize hydration to 0-100 score
 * Target: user's target (default 2000ml)
 */
export function normalizeHydration(ml: number | null, target: number = 2000): number | null {
  if (ml === null || !isFiniteNumber(ml)) return null;
  if (ml <= 0) return 0;
  
  // Above target
  if (ml >= target) return 100;
  
  // Below target
  return clamp(roundTo((ml / target) * 100, 1), 0, 100);
}

/**
 * Normalize nutrition adherence to 0-100 score
 */
export function normalizeNutritionAdherence(adherence: number | null): number | null {
  if (adherence === null || !isFiniteNumber(adherence)) return null;
  return clamp(roundTo(adherence, 1), 0, 100);
}

/**
 * Normalize recovery days to 0-100 score
 * More recovery days generally means better readiness
 */
export function normalizeRecoveryDays(days: number | null): number | null {
  if (days === null || !isFiniteNumber(days)) return null;
  if (days < 0) return 0;
  
  // Optimal: 1-3 days
  if (days >= 1 && days <= 3) return 100;
  
  // Less than optimal
  if (days < 1) {
    return clamp(roundTo(days * 100, 1), 0, 100);
  }
  
  // More than optimal (deconditioning risk)
  if (days > 3) {
    const penalty = (days - 3) * 15;
    return clamp(roundTo(100 - penalty, 1), 40, 100);
  }
  
  return NEUTRAL_SCORE;
}

// =============================================================================
// Factor Processing
// =============================================================================

/**
 * Normalize a factor value based on its type
 */
export function normalizeFactorValue(
  factorCode: string,
  value: MeasuredValue | null | undefined,
  userBaseline?: {
    restingHR?: number;
    hrv?: number;
    steps?: number;
  }
): number | null {
  if (!value || !value.available) return null;
  
  switch (factorCode) {
    case READINESS_FACTORS.SLEEP:
      // Use duration primarily, quality as fallback
      return (
        normalizeSleepDuration(value.value) ??
        normalizeSleepQuality(value.value)
      );
    
    case READINESS_FACTORS.TRAINING_LOAD:
      return normalizeTrainingLoad(value.value);
    
    case READINESS_FACTORS.WORKOUT_COMPLETION:
      return normalizeWorkoutCompletion(value.value);
    
    case READINESS_FACTORS.FORM_QUALITY:
      return normalizeFormQuality(value.value);
    
    case READINESS_FACTORS.MUSCLE_SORENESS:
      return normalizeMuscleSoreness(value.value);
    
    case READINESS_FACTORS.ENERGY:
      return normalizeEnergy(value.value);
    
    case READINESS_FACTORS.STRESS:
      return normalizeStress(value.value);
    
    case READINESS_FACTORS.RESTING_HR:
      return normalizeRestingHR(value.value, userBaseline?.restingHR);
    
    case READINESS_FACTORS.HRV:
      return normalizeHRV(value.value, userBaseline?.hrv);
    
    case READINESS_FACTORS.STEPS:
      return normalizeSteps(value.value, userBaseline?.steps);
    
    case READINESS_FACTORS.HYDRATION:
      return normalizeHydration(value.value);
    
    case READINESS_FACTORS.NUTRITION:
      return normalizeNutritionAdherence(value.value);
    
    case READINESS_FACTORS.RECOVERY_DAYS:
      return normalizeRecoveryDays(value.value);
    
    default:
      return null;
  }
}

/**
 * Get factor status based on score
 */
export function getFactorStatus(score: number | null): 'negative' | 'neutral' | 'positive' {
  if (score === null) return 'neutral';
  if (score < 40) return 'negative';
  if (score > 60) return 'positive';
  return 'neutral';
}

/**
 * Calculate factor contribution to overall score
 */
export function calculateFactorContribution(
  score: number,
  weight: number
): number {
  // Contribution = (score - 50) * weight
  // Positive scores above 50 add, below 50 subtract
  const deviation = score - NEUTRAL_SCORE;
  return roundTo(deviation * weight, 2);
}

/**
 * Process all factors from input
 */
export function processFactors(
  input: ReadinessInput,
  weights: Record<string, number> = DEFAULT_READINESS_WEIGHTS
): ReadinessFactorInput[] {
  const factorCodes = Object.values(READINESS_FACTORS);
  
  return factorCodes.map(code => {
    // Get the corresponding value from input
    let value: MeasuredValue | null = null;
    
    switch (code) {
      case READINESS_FACTORS.SLEEP:
        value = input.sleepDuration ?? input.sleepQuality ?? null;
        break;
      case READINESS_FACTORS.TRAINING_LOAD:
        value = input.recentWorkoutLoad ?? null;
        break;
      case READINESS_FACTORS.WORKOUT_COMPLETION:
        value = input.workoutCompletion ?? null;
        break;
      case READINESS_FACTORS.FORM_QUALITY:
        value = input.formQuality ?? null;
        break;
      case READINESS_FACTORS.MUSCLE_SORENESS:
        value = input.muscleSoreness ?? null;
        break;
      case READINESS_FACTORS.ENERGY:
        value = input.energy ?? null;
        break;
      case READINESS_FACTORS.STRESS:
        value = input.stress ?? null;
        break;
      case READINESS_FACTORS.RESTING_HR:
        value = input.restingHeartRate ?? null;
        break;
      case READINESS_FACTORS.HRV:
        value = input.hrv ?? null;
        break;
      case READINESS_FACTORS.STEPS:
        value = input.steps ?? null;
        break;
      case READINESS_FACTORS.HYDRATION:
        value = input.hydration ?? null;
        break;
      case READINESS_FACTORS.NUTRITION:
        // Combine calorie and protein adherence
        if (input.calorieAdherence || input.proteinAdherence) {
          const calAdh = input.calorieAdherence?.value ?? NEUTRAL_SCORE;
          const protAdh = input.proteinAdherence?.value ?? NEUTRAL_SCORE;
          value = {
            value: (calAdh + protAdh) / 2,
            unit: '%',
            timestamp: input.calorieAdherence?.timestamp ?? Date.now(),
            source: 'calculated',
            confidence: Math.min(
              input.calorieAdherence?.confidence ?? 0,
              input.proteinAdherence?.confidence ?? 0
            ),
            freshness: Math.max(
              input.calorieAdherence?.freshness ?? Infinity,
              input.proteinAdherence?.freshness ?? Infinity
            ),
            available: true,
          };
        }
        break;
      case READINESS_FACTORS.RECOVERY_DAYS:
        value = input.recoveryDays ?? null;
        break;
    }
    
    const weight = weights[code] ?? 0.05;
    const normalizedScore = normalizeFactorValue(code, value ?? null);
    const contribution = normalizedScore !== null
      ? calculateFactorContribution(normalizedScore, weight)
      : 0;
    const status = getFactorStatus(normalizedScore);
    
    return {
      code,
      value: value ?? null,
      weight,
      normalizedScore,
      contribution,
      status,
      messageKey: `readiness.factor.${code}.${status}`,
    };
  });
}

// =============================================================================
// Weight Redistribution
// =============================================================================

/**
 * Redistribute weights for missing data
 * Available factors get proportionally higher weights
 */
export function redistributeWeights(
  factors: ReadinessFactorInput[]
): ReadinessFactorInput[] {
  const availableFactors = factors.filter(f => f.value?.available);
  const missingFactors = factors.filter(f => !f.value?.available);
  
  if (availableFactors.length === 0) {
    // No data - all factors get neutral contribution
    return factors.map(f => ({
      ...f,
      normalizedScore: NEUTRAL_SCORE,
      contribution: 0,
      status: 'neutral' as const,
    }));
  }
  
  // Calculate total weight of available factors
  const totalAvailableWeight = availableFactors.reduce(
    (sum, f) => sum + f.weight,
    0
  );
  
  // Redistribute missing weights proportionally
  return factors.map(f => {
    if (f.value?.available) {
      // Scale weight to account for missing factors
      const scaledWeight = f.weight / totalAvailableWeight;
      return { ...f, weight: scaledWeight };
    }
    
    // Missing factor - contributes nothing
    return {
      ...f,
      weight: 0,
      normalizedScore: null,
      contribution: 0,
      status: 'neutral' as const,
    };
  });
}

// =============================================================================
// Score Calculation
// =============================================================================

/**
 * Calculate overall readiness score
 */
export function calculateReadinessScore(
  factors: ReadinessFactorInput[]
): number {
  // Sum all contributions
  const totalContribution = factors.reduce(
    (sum, f) => sum + f.contribution,
    0
  );
  
  // Base score is 50, add contributions
  const rawScore = NEUTRAL_SCORE + totalContribution;
  
  // Clamp to 0-100
  return clamp(roundTo(rawScore, 0), 0, 100);
}

/**
 * Calculate confidence based on data completeness and freshness
 */
export function calculateConfidence(
  dataCompleteness: number,
  dataFreshness: number
): number {
  // Completeness contribution (0-0.5)
  const completenessScore = dataCompleteness * 0.5;
  
  // Freshness contribution (0-0.5)
  // Fresh = 0-6 hours, stale >24 hours
  let freshnessScore: number;
  if (dataFreshness <= 6) {
    freshnessScore = 0.5;
  } else if (dataFreshness <= 24) {
    freshnessScore = 0.5 - ((dataFreshness - 6) / 18) * 0.25;
  } else if (dataFreshness <= 48) {
    freshnessScore = 0.25 - ((dataFreshness - 24) / 24) * 0.15;
  } else {
    freshnessScore = 0.1;
  }
  
  return clamp(roundTo(completenessScore + freshnessScore, 2), 0, 1);
}

/**
 * Determine training recommendation based on score
 */
export function determineRecommendation(
  score: number,
  level: string,
  dataCompleteness: number
): {
  action: 'rest' | 'recovery' | 'light_training' | 'normal_training' | 'high_intensity';
  intensityModifier: number;
  volumeModifier: number;
} {
  // Adjust based on data completeness
  const dataFactor = dataCompleteness >= 0.7 ? 1 : 0.8;
  
  if (level === READINESS_LEVELS.LOW) {
    return {
      action: TRAINING_INTENSITY.REST,
      intensityModifier: -0.5 * dataFactor,
      volumeModifier: -0.5 * dataFactor,
    };
  }
  
  if (level === READINESS_LEVELS.MODERATE) {
    return {
      action: TRAINING_INTENSITY.LIGHT_TRAINING,
      intensityModifier: -0.25 * dataFactor,
      volumeModifier: -0.25 * dataFactor,
    };
  }
  
  if (level === READINESS_LEVELS.GOOD) {
    return {
      action: TRAINING_INTENSITY.NORMAL_TRAINING,
      intensityModifier: 0,
      volumeModifier: 0,
    };
  }
  
  // HIGH
  return {
    action: TRAINING_INTENSITY.HIGH_INTENSITY,
    intensityModifier: 0.1 * dataFactor,
    volumeModifier: 0.05 * dataFactor,
  };
}

// =============================================================================
// Main Calculation Function
// =============================================================================

/**
 * Calculate readiness score from input data
 * This is the main entry point for the calculation engine
 */
export function calculateReadiness(
  input: ReadinessInput,
  options?: {
    weights?: Record<string, number>;
    includeInputSnapshot?: boolean;
  }
): ReadinessOutput {
  // Process all factors
  let factors = processFactors(input, options?.weights);
  
  // Redistribute weights for missing data
  factors = redistributeWeights(factors);
  
  // Recalculate contributions with redistributed weights
  factors = factors.map(f => ({
    ...f,
    contribution: f.normalizedScore !== null
      ? calculateFactorContribution(f.normalizedScore, f.weight)
      : 0,
  }));
  
  // Calculate overall score
  const score = calculateReadinessScore(factors);
  
  // Determine level
  const level = getReadinessLevel(score);
  
  // Calculate confidence
  const confidence = calculateConfidence(
    input.dataCompleteness,
    input.dataFreshness
  );
  
  // Determine recommendation
  const recommendation = determineRecommendation(score, level, input.dataCompleteness);
  
  // Format output factors
  const outputFactors: ReadinessFactor[] = factors.map(f => ({
    code: f.code,
    score: f.normalizedScore ?? NEUTRAL_SCORE,
    weight: f.weight,
    contribution: f.contribution,
    status: f.status,
    messageKey: f.messageKey,
  }));
  
  // Create input snapshot for reproducibility
  const inputSnapshot = options?.includeInputSnapshot !== false
    ? JSON.stringify({
        date: input.date,
        dataCompleteness: input.dataCompleteness,
        factors: factors
          .filter(f => f.value?.available)
          .map(f => ({
            code: f.code,
            value: f.value?.value,
            timestamp: f.value?.timestamp,
          })),
      })
    : '';
  
  return {
    date: input.date,
    score,
    level,
    confidence,
    dataCompleteness: input.dataCompleteness,
    factors: outputFactors,
    recommendation,
    algorithmVersion: ALGORITHM_VERSION,
    calculatedAt: Date.now(),
    inputSnapshot,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Validate readiness output
 */
export function isValidReadinessOutput(output: unknown): output is ReadinessOutput {
  if (!output || typeof output !== 'object') return false;
  
  const o = output as Record<string, unknown>;
  
  return (
    typeof o.date === 'string' &&
    typeof o.score === 'number' &&
    o.score >= 0 &&
    o.score <= 100 &&
    ['low', 'moderate', 'good', 'high'].includes(o.level as string) &&
    typeof o.confidence === 'number' &&
    o.confidence >= 0 &&
    o.confidence <= 1 &&
    typeof o.dataCompleteness === 'number' &&
    Array.isArray(o.factors) &&
    typeof o.recommendation === 'object' &&
    typeof o.algorithmVersion === 'string'
  );
}

/**
 * Compare two readiness outputs for determinism
 */
export function areOutputsEqual(a: ReadinessOutput, b: ReadinessOutput): boolean {
  return (
    a.date === b.date &&
    a.score === b.score &&
    a.level === b.level &&
    a.algorithmVersion === b.algorithmVersion
  );
}
