// ============================================
// API CONTRACT TYPES - MOBILE & BACKEND
// These types represent the exact JSON shapes returned by the AIVO API
// They are used by mobile app and should be kept in sync with API responses
// ============================================

/**
 * Sleep log entry
 */
export interface SleepLog {
  id: string;
  userId: string;
  date: string; // ISO date YYYY-MM-DD
  durationHours?: number | null;
  qualityScore?: number | null;
  deepSleepMinutes?: number | null;
  remSleepMinutes?: number | null;
  awakeMinutes?: number | null;
  bedtime?: string | null;
  waketime?: string | null;
  consistencyScore?: number | null;
  notes?: string | null;
  source?: "manual" | "wearable" | "imported";
  createdAt: number;
  updatedAt: number;
}

/**
 * Create sleep log request
 */
export interface SleepLogCreate {
  date: string;
  durationHours: number;
  qualityScore?: number;
  deepSleepMinutes?: number;
  remSleepMinutes?: number;
  awakeMinutes?: number;
  bedtime?: string;
  waketime?: string;
  notes?: string;
  source?: "manual" | "wearable" | "imported";
}

/**
 * Update sleep log request (PATCH)
 */
export type SleepLogUpdate = Partial<Omit<SleepLog, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>;

/**
 * Individual biometric reading from wearable device
 */
export interface BiometricReading {
  timestamp: number;
  type: 'hrv' | 'heart_rate' | 'resting_hr' | 'steps' | 'active_minutes' | 'sleep';
  value: number;
  unit: string;
  confidence?: number;
  source: 'apple_health' | 'google_fit' | 'manual';
}

/**
 * Wearable sensor data snapshot
 */
export interface SensorDataSnapshot {
  id: string;
  userId: string;
  timestamp: number; // Unix timestamp in milliseconds
  period: "hourly" | "daily" | "weekly";
  steps?: number;
  activeMinutes?: number;
  avgHeartRate?: number;
  restingHeartRate?: number;
  hrvMs?: number;
  hrvRmssd?: number;
  stressScore?: number;
  source: "apple_health" | "google_fit" | "manual";
  rawData?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Pre-computed biometric snapshot for a time period
 */
export interface BiometricSnapshot {
  id: string;
  userId: string;
  period: "7d" | "30d";
  exerciseLoad: {
    totalWorkouts: number;
    avgIntensity: number;
    intensityStdDev: number;
    weeklyVolume: number;
    totalReps: number;
  };
  sleep: {
    avgDuration: number;
    durationStdDev: number;
    avgQuality?: number;
    consistencyScore: number;
    avgDeepSleepMinutes?: number;
    avgRemSleepMinutes?: number;
  };
  nutrition: {
    avgDailyCalories: number;
    targetCalories: number;
    consistencyScore: number;
    avgProtein?: number;
    avgCarbs?: number;
    avgFat?: number;
    avgWater?: number;
  };
  bodyMetrics: {
    weightChange: number;
    bodyFatChange?: number;
    muscleMassChange?: number;
  };
  recoveryScore: number;
  warnings: string[];
}

/**
 * Correlation finding between two factors
 */
export interface CorrelationFinding {
  id: string;
  factorA: string;
  factorB: string;
  correlationCoefficient: number;
  pValue: number;
  confidence: number;
  anomalyThreshold: number;
  anomalyCount: number;
  outlierDates: string[];
  explanation: string;
  actionableInsight: string;
  detectedAt: number;
  validUntil?: number;
}

/**
 * Recovery score calculation result
 */
export interface RecoveryScoreResult {
  score: number;
  grade: "excellent" | "good" | "fair" | "poor";
  factors: {
    sleep: number;
    exercise: number;
    nutrition: number;
    bodyMetrics: number;
    hydration: number;
  };
  warnings: string[];
}
