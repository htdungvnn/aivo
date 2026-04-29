// ============================================
// BIOMETRIC CORRELATION - STRESS & RECOVERY ANALYSIS
// ACOUSTIC MYOGRAPHY - MUSCLE FATIGUE ANALYSIS
// ============================================
import type { WorkoutType } from "./workout";
import type { MuscleGroup } from "./body";

/**
 * Aggregated statistics for a time period (used in BiometricSnapshot)
 */
export interface ExerciseLoadAggregate {
  totalWorkouts: number;
  totalDurationMinutes: number;
  totalCalories: number;
  avgDurationMinutes: number;
  workoutsByType: Record<WorkoutType, number>;
  intensityDistribution: {
    low: number; // % of workouts at low intensity
    moderate: number;
    high: number;
  };
  consecutiveDays: number;
  restDays: number;
  avgRpe?: number; // Average Rate of Perceived Exertion
}

export interface SleepAggregate {
  avgDurationHours: number;
  avgQualityScore?: number;
  avgDeepSleepMinutes?: number;
  avgRemSleepMinutes?: number;
  consistencyScore?: number;
  bedtimeConsistency: number; // 0-1, lower variance = higher score
  qualityVsDurationCorrelation?: number; // Correlation coefficient
  daysWithData: number;
  totalDays: number;
}

export interface NutritionAggregate {
  avgDailyCalories: number;
  targetCalories: number;
  avgDailyProtein: number;
  targetProtein: number;
  avgDailyCarbs: number;
  targetCarbs: number;
  avgDailyFat: number;
  targetFat: number;
  avgDailyFiber?: number;
  targetFiber?: number;
  proteinGoalPct: number; // % of target achieved
  carbsGoalPct: number;
  fatGoalPct: number;
  consistencyScore: number; // 0-100 based on variance
  avgMealCount: number;
  lateNightEatingIncidents: number; // Meals after 9 PM
  hydration?: {
    avgWaterMl: number;
    targetWaterMl: number;
    goalPct: number;
  };
  macroBalanceScore: number; // 0-100 based on ratio balance
}

export interface BodyMetricsAggregate {
  weightChange: number; // kg change over period
  bodyFatChange: number; // percentage points change
  muscleMassChange?: number; // kg change
  bmiChange?: number;
  avgWeight: number;
  avgBodyFat: number;
  measurementsCompleteness: number; // 0-1
}

/**
 * Pre-computed biometric snapshot for a time period
 * Used to avoid expensive on-the-fly correlations for every API call
 * Corresponds to biometric_snapshots table
 */
export interface BiometricSnapshot {
  id: string;
  userId: string;
  period: "7d" | "30d";
  generatedAt: Date;
  validUntil?: Date;
  exerciseLoad: ExerciseLoadAggregate;
  sleep: SleepAggregate;
  nutrition: NutritionAggregate;
  bodyMetrics: BodyMetricsAggregate;
  recoveryScore: number; // 0-100 composite score
  warnings: string[]; // e.g., ["low_sleep", "nutrient_deficit", "overtraining_risk"]
}

/**
 * Correlation finding between two factors
 * Identifies patterns like "recovery drops when eating after 9 PM"
 * Corresponds to correlation_findings table
 */
export interface CorrelationFinding {
  id: string;
  userId: string;
  snapshotId: string;
  factorA: BiometricFactor; // e.g., "sleep_quality" or "late_nutrition"
  factorB: BiometricFactor; // e.g., "recovery_score" or "workout_intensity"
  correlationCoefficient: number; // -1 to 1 (Pearson's r)
  pValue: number; // Statistical significance (0-1, lower = more significant)
  confidence: number; // Combined confidence score (0-1)
  anomalyThreshold: number; // Z-score threshold used for anomaly detection
  anomalyCount: number; // Number of outlier points
  outlierDates: string[]; // ISO dates where anomalies occurred
  explanation: string; // AI-generated plain-language explanation
  actionableInsight: string; // AI-generated recommendation
  detectedAt: Date;
  validUntil?: Date; // Correlations expire after data gets stale
  isDismissed: boolean;
}

/**
 * Factor types that can be correlated
 */
export type BiometricFactor =
  // Sleep factors
  | "sleep_duration"
  | "sleep_quality"
  | "deep_sleep"
  | "rem_sleep"
  | "sleep_consistency"
  | "bedtime"
  // Exercise factors
  | "workout_intensity"
  | "workout_duration"
  | "consecutive_days"
  | "rest_days"
  | "exercise_variety"
  | "rpe_average"
  // Nutrition factors
  | "calorie_deficit"
  | "protein_intake"
  | "carb_intake"
  | "fat_intake"
  | "macro_balance"
  | "late_nutrition"
  | "hydration"
  | "meal_consistency"
  // Recovery factors
  | "recovery_score"
  | "subjective_fatigue"
  | "readiness_score"
  // Body metrics
  | "body_weight"
  | "body_fat"
  | "muscle_mass"
  | "bmi";

/**
 * Request to trigger correlation analysis on demand
 */
export interface CorrelationAnalysisRequest {
  period: "7d" | "30d";
  factors?: BiometricFactor[]; // If empty, analyze all factors
  minimumConfidence: number; // 0-1, default 0.7
  includeOutlierDetails: boolean; // Include specific dates for anomalies
}

/**
 * Response from correlation analysis
 */
export interface CorrelationAnalysisResult {
  snapshotId: string;
  generatedAt: Date;
  dataCoverage: number; // 0-1, percentage of days with complete data
  findings: CorrelationFinding[];
  summary: {
    totalFactorsAnalyzed: number;
    significantCorrelations: number;
    primaryConcern?: string;
    recommendedAction?: string;
    warnings: string[];
  };
  recoveryScore: number;
  dataGaps: {
    sleep: number; // days missing
    workouts: number;
    nutrition: number;
    bodyMetrics: number;
  };
}

/**
 * Recovery score factors for detailed breakdown
 */
export interface RecoveryScoreFactors {
  sleep: {
    duration: number; // 0-100 score
    quality: number;
    consistency: number;
    weight: number; // Overall weight for this factor
  };
  exercise: {
    load: number; // 0-100 (balanced = high, under/over = low)
    recoveryTime: number; // Days of rest
    intensityBalance: number;
    weight: number;
  };
  nutrition: {
    adequacy: number; // Meeting targets
    timing: number; // Meal timing quality
    hydration: number;
    weight: number;
  };
  bodyMetrics: {
    weightChange: number; // Score based on healthy rate
    bodyFatChange: number;
    trend: number; // Direction of change
    weight: number;
  };
}

/**
 * Recovery score calculation result
 */
export interface RecoveryScoreResult {
  score: number; // 0-100 overall score
  factors: RecoveryScoreFactors;
  grade: "excellent" | "good" | "fair" | "poor" | "critical";
  trend: "improving" | "stable" | "declining";
  comparedToLastPeriod: {
    change: number;
    direction: "up" | "down" | "same";
  };
  primaryRiskFactor: BiometricFactor | null;
  recommendations: string[];
}

// ============================================
// ACOUSTIC MYOGRAPHY - MUSCLE FATIGUE ANALYSIS
// ============================================

/**
 * Frequency band energy distribution for muscle sound analysis
 */
export interface BandEnergy {
  band: "very_low" | "low" | "mid" | "high";
  minHz: number;
  maxHz: number;
  energy: number;
  normalized: number; // 0-1 proportion of total energy
}

/**
 * Features extracted from a single audio chunk (500ms)
 * Represents the acoustic signature of muscle activity
 */
export interface AcousticFeatures {
  rmsAmplitude: number; // Root mean square amplitude (0-1 normalized)
  medianFrequency: number; // F50 - median frequency in Hz (primary fatigue indicator)
  frequencyBands: BandEnergy[]; // Energy distribution across frequency bands
  spectralEntropy: number; // Shannon entropy (0-1), higher = more random/noisy
  motorUnitRecruitment: number; // 0-1 estimate of motor unit firing rate
  contractionCount: number; // Detected muscle contractions in the chunk
  signalToNoiseRatio: number; // SNR in dB
  confidence: number; // 0-1 overall signal quality confidence
  isValid: boolean; // True if signal meets minimum quality thresholds
}

/**
 * Baseline measurement from rested muscle
 * Used as reference for fatigue detection
 */
export interface BaselineData {
  medianFrequency: number; // Baseline median freq (Hz) for fresh muscle
  rmsAmplitude: number; // Baseline amplitude
  spectralEntropy: number; // Baseline entropy
  contractionRate: number; // Baseline contractions per second
  qualityScore: number; // 0-1 baseline quality assessment
}

/**
 * Fatigue assessment result
 * Combines current features with baseline to determine fatigue level
 */
export interface FatigueResult {
  fatigueLevel: number; // 0-100 composite fatigue score
  fatigueCategory: "fresh" | "moderate" | "fatigued" | "exhausted";
  medianFreqShift: number; // Hz shift from baseline (negative = fatigued)
  confidence: number; // 0-1 confidence in this assessment
  recommendations: string[]; // User-facing recommendations based on fatigue
}

/**
 * Acoustic myography configuration
 */
export interface AcousticConfig {
  sampleRate: number; // Hz, typically 8000
  chunkDurationMs: number; // Duration of audio chunks to process
  lowCutoff: number; // Band-pass filter low cutoff (Hz)
  highCutoff: number; // Band-pass filter high cutoff (Hz)
  minContractionSeparationMs: number; // Minimum time between contractions
  bands: BandEnergy[]; // Frequency band definitions
}

/**
 * Complete acoustic session data for storage/analysis
 */
export interface AcousticSession {
  id: string;
  userId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  startTime: number; // Unix timestamp ms
  endTime?: number;
  totalChunks: number;
  validChunks: number;
  avgFatigueLevel: number;
  peakFatigueLevel: number;
  fatigueTrend: "improving" | "stable" | "declining";
  baselineUsed?: string; // Baseline ID
  metadata: {
    deviceType: "iphone" | "android" | "web";
    sampleRate: number;
    ambientNoiseLevel?: number;
    notes?: string;
  };
  createdAt: number;
}

/**
 * Audio chunk storage (for potential re-analysis)
 */
export interface AudioChunk {
  id: string;
  sessionId: string;
  chunkIndex: number;
  timestamp: number; // Relative to session start (ms)
  pcmData?: string; // Base64 encoded PCM (optional, may be in R2)
  r2Key?: string; // R2 storage key if audio persisted
  features?: AcousticFeatures; // Cached features from processing
}
