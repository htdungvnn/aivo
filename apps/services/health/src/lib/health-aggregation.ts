/**
 * Health Data Aggregation
 * Functions to aggregate health data from various sources
 * 
 * This module handles:
 * - Fetching data from multiple sources
 * - Normalizing and combining measurements
 * - Calculating daily summaries
 * - Computing trends and baselines
 */

import {
  DailyHealthData,
  HealthDataSummary,
  MeasuredValue,
  DATA_SOURCES,
  isFiniteNumber,
  roundTo,
  getLocalDateStr,
} from '@aivo/health-types';

// =============================================================================
// Data Source Interfaces
// =============================================================================

/**
 * Nutrition data for a day
 */
export interface NutritionDayData {
  date: string;
  caloriesConsumed: number;
  caloriesTarget: number;
  proteinG: number;
  proteinTarget: number;
  carbsG: number;
  carbsTarget: number;
  fatG: number;
  fatTarget: number;
  hydrationMl: number;
  hydrationTarget: number;
  mealCount: number;
  lastMealAt: number | null;
}

/**
 * Workout data for a day
 */
export interface WorkoutDayData {
  date: string;
  completed: boolean;
  plannedDuration: number | null;
  actualDuration: number | null;
  exercises: string[];
  totalSets: number;
  completedSets: number;
  totalReps: number;
  averageQualityScore: number | null;
  formCorrections: number;
  caloriesBurned: number | null;
}

/**
 * Sleep data from wearable
 */
export interface SleepDayData {
  date: string;
  durationMinutes: number | null;
  quality: number | null;
  consistency: number | null;
  timeInBed: number | null;
  timeAsleep: number | null;
  remMinutes: number | null;
  deepMinutes: number | null;
  lightMinutes: number | null;
  awakenings: number | null;
  bedtime: string | null;
  wakeTime: string | null;
  source: string;
}

/**
 * Activity data from wearable
 */
export interface ActivityDayData {
  date: string;
  steps: number | null;
  activeMinutes: number | null;
  moderateMinutes: number | null;
  vigorousMinutes: number | null;
  caloriesBurned: number | null;
  distanceKm: number | null;
  floors: number | null;
  source: string;
}

/**
 * Cardiovascular data from wearable
 */
export interface CardiovascularDayData {
  date: string;
  restingHeartRate: number | null;
  hrv: number | null;
  averageHeartRate: number | null;
  maxHeartRate: number | null;
  bloodOxygen: number | null;
  source: string;
}

/**
 * Body measurement data
 */
export interface BodyDayData {
  date: string;
  weight: number | null;
  bodyFat: number | null;
  bmi: number | null;
  muscleMass: number | null;
  waterPercent: number | null;
  source: string;
}

/**
 * Self-reported data from check-in
 */
export interface SelfReportedDayData {
  date: string;
  energy: number | null; // 1-10
  stress: number | null; // 1-10
  muscleSoreness: number | null; // 0-10
  mood: number | null; // 1-10
  sleepQuality: number | null; // 1-10
  completedAt: number | null;
}

/**
 * Combined daily health data
 */
export interface CombinedDayData {
  date: string;
  timezone: string;
  
  sleep: SleepDayData | null;
  activity: ActivityDayData | null;
  cardiovascular: CardiovascularDayData | null;
  body: BodyDayData | null;
  nutrition: NutritionDayData | null;
  workouts: WorkoutDayData[];
  selfReported: SelfReportedDayData | null;
  
  // Timestamps for freshness tracking
  timestamps: {
    sleep: number | null;
    activity: number | null;
    cardiovascular: number | null;
    body: number | null;
    nutrition: number | null;
    workouts: number | null;
    selfReported: number | null;
  };
}

// =============================================================================
// Aggregation Functions
// =============================================================================

/**
 * Combine data from multiple sources into a unified daily view
 */
export function combineDailyData(
  date: string,
  timezone: string,
  sources: {
    sleep?: SleepDayData | null;
    activity?: ActivityDayData | null;
    cardiovascular?: CardiovascularDayData | null;
    body?: BodyDayData | null;
    nutrition?: NutritionDayData | null;
    workouts?: WorkoutDayData[];
    selfReported?: SelfReportedDayData | null;
  }
): CombinedDayData {
  return {
    date,
    timezone,
    sleep: sources.sleep ?? null,
    activity: sources.activity ?? null,
    cardiovascular: sources.cardiovascular ?? null,
    body: sources.body ?? null,
    nutrition: sources.nutrition ?? null,
    workouts: sources.workouts ?? [],
    selfReported: sources.selfReported ?? null,
    timestamps: {
      sleep: sources.sleep?.date ? new Date(sources.sleep.date).getTime() : null,
      activity: sources.activity?.date ? new Date(sources.activity.date).getTime() : null,
      cardiovascular: sources.cardiovascular?.date ? new Date(sources.cardiovascular.date).getTime() : null,
      body: sources.body?.date ? new Date(sources.body.date).getTime() : null,
      nutrition: sources.nutrition?.date ? new Date(sources.nutrition.date).getTime() : null,
      workouts: sources.workouts?.[0]?.date ? new Date(sources.workouts[0].date).getTime() : null,
      selfReported: sources.selfReported?.completedAt ?? null,
    },
  };
}

/**
 * Convert combined data to readiness input format
 */
export function toReadinessInput(
  combined: CombinedDayData,
  options?: {
    trainingLoadHistory?: number[];
    userGoal?: 'fat_loss' | 'muscle_gain' | 'general_fitness' | 'maintenance';
  }
): {
  sleepDuration: MeasuredValue | null;
  sleepQuality: MeasuredValue | null;
  recentWorkoutLoad: MeasuredValue | null;
  workoutCompletion: MeasuredValue | null;
  formQuality: MeasuredValue | null;
  muscleSoreness: MeasuredValue | null;
  energy: MeasuredValue | null;
  stress: MeasuredValue | null;
  restingHeartRate: MeasuredValue | null;
  hrv: MeasuredValue | null;
  steps: MeasuredValue | null;
  hydration: MeasuredValue | null;
  calorieAdherence: MeasuredValue | null;
  proteinAdherence: MeasuredValue | null;
  recoveryDays: MeasuredValue | null;
  dataCompleteness: number;
  dataFreshness: number;
} {
  const now = Date.now();
  
  // Sleep
  const sleepDuration = combined.sleep?.durationMinutes !== null
    ? createMeasuredValue(
        combined.sleep.durationMinutes / 60, // Convert to hours
        'hours',
        combined.sleep.date,
        combined.sleep.source,
        0.9,
        now
      )
    : null;
  
  const sleepQuality = combined.sleep?.quality !== null
    ? createMeasuredValue(
        combined.sleep.quality,
        '%',
        combined.sleep.date,
        combined.sleep.source,
        0.85,
        now
      )
    : null;
  
  // Calculate training load (acute:chronic ratio)
  const recentWorkoutLoad = calculateTrainingLoad(
    combined.workouts,
    options?.trainingLoadHistory
  );
  
  // Workout completion
  const workoutCompletion = combined.workouts.length > 0
    ? createMeasuredValue(
        calculateWorkoutCompletion(combined.workouts),
        '%',
        combined.date,
        'calculated',
        0.9,
        now
      )
    : null;
  
  // Form quality
  const formQuality = combined.workouts.length > 0
    ? createMeasuredValue(
        calculateAverageQuality(combined.workouts),
        'score',
        combined.date,
        'calculated',
        0.85,
        now
      )
    : null;
  
  // Muscle soreness (from self-reported)
  const muscleSoreness = combined.selfReported?.muscleSoreness !== null
    ? createMeasuredValue(
        combined.selfReported.muscleSoreness,
        'level',
        combined.date,
        'manual',
        0.7,
        now
      )
    : null;
  
  // Energy (convert 1-10 to 0-100)
  const energy = combined.selfReported?.energy !== null
    ? createMeasuredValue(
        (combined.selfReported.energy - 1) * 11.11, // 1-10 -> 0-100
        '%',
        combined.date,
        'manual',
        0.7,
        now
      )
    : null;
  
  // Stress (convert 1-10 to 0-100, then invert)
  const stress = combined.selfReported?.stress !== null
    ? createMeasuredValue(
        100 - (combined.selfReported.stress - 1) * 11.11, // 1-10 -> 100-0
        '%',
        combined.date,
        'manual',
        0.7,
        now
      )
    : null;
  
  // Resting heart rate
  const restingHeartRate = combined.cardiovascular?.restingHeartRate !== null
    ? createMeasuredValue(
        combined.cardiovascular.restingHeartRate,
        'bpm',
        combined.date,
        combined.cardiovascular.source,
        0.9,
        now
      )
    : null;
  
  // HRV
  const hrv = combined.cardiovascular?.hrv !== null
    ? createMeasuredValue(
        combined.cardiovascular.hrv,
        'ms',
        combined.date,
        combined.cardiovascular.source,
        0.85,
        now
      )
    : null;
  
  // Steps
  const steps = combined.activity?.steps !== null
    ? createMeasuredValue(
        combined.activity.steps,
        'steps',
        combined.date,
        combined.activity.source,
        0.9,
        now
      )
    : null;
  
  // Hydration
  const hydration = combined.nutrition?.hydrationMl !== null
    ? createMeasuredValue(
        combined.nutrition.hydrationMl,
        'ml',
        combined.date,
        'nutrition',
        0.8,
        now
      )
    : null;
  
  // Calorie adherence
  const calorieAdherence = combined.nutrition
    ? createMeasuredValue(
        calculateAdherence(
          combined.nutrition.caloriesConsumed,
          combined.nutrition.caloriesTarget
        ),
        '%',
        combined.date,
        'nutrition',
        0.85,
        now
      )
    : null;
  
  // Protein adherence
  const proteinAdherence = combined.nutrition
    ? createMeasuredValue(
        calculateAdherence(
          combined.nutrition.proteinG,
          combined.nutrition.proteinTarget
        ),
        '%',
        combined.date,
        'nutrition',
        0.85,
        now
      )
    : null;
  
  // Recovery days
  const recoveryDays = calculateRecoveryDays(combined.workouts);
  
  // Data completeness
  const dataCompleteness = calculateDataCompleteness(combined);
  
  // Data freshness
  const dataFreshness = calculateDataFreshness(combined, now);
  
  return {
    sleepDuration,
    sleepQuality,
    recentWorkoutLoad,
    workoutCompletion,
    formQuality,
    muscleSoreness,
    energy,
    stress,
    restingHeartRate,
    hrv,
    steps,
    hydration,
    calorieAdherence,
    proteinAdherence,
    recoveryDays,
    dataCompleteness,
    dataFreshness,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a measured value object
 */
function createMeasuredValue(
  value: number,
  unit: string,
  dateStr: string,
  source: string,
  confidence: number,
  now: number
): MeasuredValue {
  const timestamp = new Date(dateStr).getTime();
  const freshnessHours = (now - timestamp) / (1000 * 60 * 60);
  
  return {
    value,
    unit,
    timestamp,
    source,
    confidence,
    freshness: freshnessHours,
    available: true,
  };
}

/**
 * Calculate training load (acute:chronic ratio)
 */
function calculateTrainingLoad(
  workouts: WorkoutDayData[],
  history?: number[]
): MeasuredValue | null {
  const now = Date.now();
  
  // Calculate recent load (last 7 days)
  const recentLoad = workouts.reduce((sum, w) => {
    if (w.actualDuration) {
      // Simple load: duration * intensity factor
      const intensity = w.exercises.length > 0 ? 1.2 : 1.0;
      return sum + (w.actualDuration / 60) * intensity;
    }
    return sum;
  }, 0);
  
  // Calculate chronic load (average of history or assume 5 sessions/week)
  const chronicLoad = history && history.length > 0
    ? history.reduce((a, b) => a + b, 0) / history.length
    : 5; // Default assumption
  
  // Calculate ratio
  const ratio = chronicLoad > 0 ? recentLoad / chronicLoad : 1.0;
  
  return {
    value: roundTo(ratio, 2),
    unit: 'ratio',
    timestamp: now,
    source: 'calculated',
    confidence: workouts.length > 0 ? 0.85 : 0.5,
    freshness: 0,
    available: true,
  };
}

/**
 * Calculate workout completion percentage
 */
function calculateWorkoutCompletion(workouts: WorkoutDayData[]): number {
  if (workouts.length === 0) return 0;
  
  const totalSets = workouts.reduce((sum, w) => sum + w.totalSets, 0);
  const completedSets = workouts.reduce((sum, w) => sum + w.completedSets, 0);
  
  if (totalSets === 0) {
    // Fall back to binary completion
    return workouts.some(w => w.completed) ? 100 : 0;
  }
  
  return roundTo((completedSets / totalSets) * 100, 0);
}

/**
 * Calculate average form quality
 */
function calculateAverageQuality(workouts: WorkoutDayData[]): number {
  const workoutsWithQuality = workouts.filter(w => w.averageQualityScore !== null);
  
  if (workoutsWithQuality.length === 0) return 50; // Neutral
  
  const sum = workoutsWithQuality.reduce(
    (s, w) => s + (w.averageQualityScore ?? 50),
    0
  );
  
  return roundTo(sum / workoutsWithQuality.length, 0);
}

/**
 * Calculate adherence percentage
 */
function calculateAdherence(actual: number, target: number): number {
  if (target <= 0) return 0;
  return clamp(roundTo((actual / target) * 100, 0), 0, 200);
}

/**
 * Calculate recovery days since last intense workout
 */
function calculateRecoveryDays(workouts: WorkoutDayData[]): MeasuredValue | null {
  const now = Date.now();
  
  // Find most recent workout
  const sortedWorkouts = [...workouts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  if (sortedWorkouts.length === 0) {
    return {
      value: 7, // Default to 7 days if no history
      unit: 'days',
      timestamp: now,
      source: 'default',
      confidence: 0.5,
      freshness: 0,
      available: true,
    };
  }
  
  const lastWorkoutDate = new Date(sortedWorkouts[0].date).getTime();
  const daysSince = Math.floor((now - lastWorkoutDate) / (1000 * 60 * 60 * 24));
  
  return {
    value: daysSince,
    unit: 'days',
    timestamp: now,
    source: 'calculated',
    confidence: 0.9,
    freshness: 0,
    available: true,
  };
}

/**
 * Calculate data completeness (0-1)
 */
function calculateDataCompleteness(combined: CombinedDayData): number {
  const categories = [
    combined.sleep !== null,
    combined.activity !== null,
    combined.cardiovascular !== null,
    combined.selfReported !== null,
    combined.nutrition !== null,
  ];
  
  return roundTo(
    categories.filter(Boolean).length / categories.length,
    2
  );
}

/**
 * Calculate average data freshness in hours
 */
function calculateDataFreshness(combined: CombinedDayData, now: number): number {
  const timestamps = Object.values(combined.timestamps).filter(
    (t): t is number => t !== null
  );
  
  if (timestamps.length === 0) return Infinity;
  
  const totalAge = timestamps.reduce((sum, t) => sum + (now - t), 0);
  const avgAgeMs = totalAge / timestamps.length;
  
  return roundTo(avgAgeMs / (1000 * 60 * 60), 1);
}

// =============================================================================
// Trend Calculations
// =============================================================================

/**
 * Calculate moving average
 */
export function calculateMovingAverage(
  values: number[],
  window: number
): number {
  const valid = values.filter(isFiniteNumber);
  if (valid.length === 0) return 0;
  
  const windowValues = valid.slice(-window);
  return roundTo(
    windowValues.reduce((s, v) => s + v, 0) / windowValues.length,
    2
  );
}

/**
 * Calculate trend direction
 */
export function calculateTrend(
  values: number[]
): 'improving' | 'stable' | 'declining' | null {
  const valid = values.filter(isFiniteNumber);
  if (valid.length < 3) return null;
  
  const recent = valid.slice(-3);
  const earlier = valid.slice(-6, -3);
  
  if (earlier.length === 0) return null;
  
  const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length;
  const earlierAvg = earlier.reduce((s, v) => s + v, 0) / earlier.length;
  
  const changePercent = ((recentAvg - earlierAvg) / earlierAvg) * 100;
  
  if (changePercent > 5) return 'improving';
  if (changePercent < -5) return 'declining';
  return 'stable';
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(
  current: number,
  previous: number
): number | null {
  if (!isFiniteNumber(current) || !isFiniteNumber(previous) || previous === 0) {
    return null;
  }
  
  return roundTo(((current - previous) / previous) * 100, 1);
}

/**
 * Clamp value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
