import { createApiClient } from "@aivo/api-client";

const apiClient = createApiClient();

export interface SleepLog {
  id: string;
  userId: string;
  date: string;
  durationHours: number;
  qualityScore?: number;
  deepSleepMinutes?: number;
  remSleepMinutes?: number;
  awakeMinutes?: number;
  bedtime?: string;
  waketime?: string;
  consistencyScore?: number;
  notes?: string;
  source: "manual" | "wearable" | "imported";
  createdAt: number;
  updatedAt: number;
}

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

export interface SleepLogUpdate {
  durationHours?: number;
  qualityScore?: number;
  deepSleepMinutes?: number;
  remSleepMinutes?: number;
  awakeMinutes?: number;
  bedtime?: string;
  waketime?: string;
  consistencyScore?: number;
  notes?: string;
  source?: string;
}

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

/**
 * Sleep Log API
 */
export async function createSleepLog(data: SleepLogCreate): Promise<SleepLog> {
  const response = await apiClient.post("/api/biometric/sleep", data);
  return response.data;
}

export async function updateSleepLog(id: string, data: SleepLogUpdate): Promise<SleepLog> {
  const response = await apiClient.patch(`/api/biometric/sleep/${id}`, data);
  return response.data;
}

export async function getSleepLogs(
  limit: number = 30,
  offset: number = 0
): Promise<SleepLog[]> {
  const response = await apiClient.get(`/api/biometric/sleep/history?limit=${limit}&offset=${offset}`);
  return response.data;
}

export async function getSleepSummary(period: "7d" | "30d" = "30d"): Promise<{
  totalLogs: number;
  avgDuration: number;
  avgQuality?: number;
  avgConsistency: number;
  logs: SleepLog[];
}> {
  const response = await apiClient.get(`/api/biometric/sleep/summary?period=${period}`);
  return response.data;
}

/**
 * Biometric Snapshots API
 */
export async function generateBiometricSnapshot(): Promise<BiometricSnapshot> {
  const response = await apiClient.post("/api/biometric/snapshot/generate");
  return response.data;
}

export async function getBiometricSnapshot(period: "7d" | "30d" = "7d"): Promise<BiometricSnapshot | null> {
  try {
    const response = await apiClient.get(`/api/biometric/snapshot/${period}`);
    return response.data;
  } catch {
    return null;
  }
}

/**
 * Correlation Findings API
 */
export async function getCorrelationFindings(
  limit: number = 10
): Promise<CorrelationFinding[]> {
  const response = await apiClient.get(`/api/biometric/correlations?limit=${limit}`);
  return response.data;
}

export async function dismissCorrelationFinding(id: string): Promise<void> {
  await apiClient.patch(`/api/biometric/correlations/${id}/dismiss`);
}

/**
 * Recovery Score API
 */
export async function getRecoveryScore(): Promise<RecoveryScoreResult> {
  const response = await apiClient.get("/api/biometric/recovery-score");
  return response.data;
}

/**
 * Helper: Generate recovery score from recent data
 */
export async function generateAndGetRecoveryScore(): Promise<RecoveryScoreResult | null> {
  try {
    const snapshot = await generateBiometricSnapshot();
    return {
      score: snapshot.recoveryScore,
      grade: snapshot.recoveryScore >= 80 ? "excellent" :
            snapshot.recoveryScore >= 60 ? "good" :
            snapshot.recoveryScore >= 40 ? "fair" : "poor",
      factors: {
        sleep: snapshot.sleep.consistencyScore * 0.35 + (snapshot.sleep.avgQuality || 50) * 0.35,
        exercise: snapshot.exerciseLoad.intensityStdDev > 0.5 ? 70 : 90,
        nutrition: snapshot.nutrition.consistencyScore,
        bodyMetrics: snapshot.bodyMetrics.weightChange < 0 ? 80 : 60,
        hydration: 70, // Placeholder - would come from nutrition data
      },
      warnings: snapshot.warnings,
    };
  } catch {
    return null;
  }
}
