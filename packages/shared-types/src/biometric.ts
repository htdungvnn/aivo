// ============================================
// BIOMETRIC CORRELATION - STRESS & RECOVERY ANALYSIS
// ACOUSTIC MYOGRAPHY - MUSCLE FATIGUE ANALYSIS
// ============================================

import type { MuscleGroup } from "./body";
import type { CorrelationFinding } from "./api-contracts";
export type { BiometricSnapshot, CorrelationFinding, RecoveryScoreResult } from "./api-contracts";

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
