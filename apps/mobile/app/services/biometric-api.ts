import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = __DEV__ ? "http://localhost:8787" : "https://api.aivo.app";
const TOKEN_KEY = "aivo.auth.token";

// Sleep Log types (re-exported from shared-types would be ideal but keeping local)
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

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

async function getToken(): Promise<string | null> {
  return await AsyncStorage.getItem(TOKEN_KEY);
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || error.message || "Request failed");
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/**
 * Sleep Log API
 */
export async function createSleepLog(data: SleepLogCreate): Promise<SleepLog> {
  return await fetchApi<SleepLog>("/api/biometric/sleep", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSleepLog(id: string, data: SleepLogUpdate): Promise<SleepLog> {
  return await fetchApi<SleepLog>(`/api/biometric/sleep/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function getSleepLogs(
  limit: number = 30,
  offset: number = 0
): Promise<SleepLog[]> {
  return await fetchApi<SleepLog[]>(
    `/api/biometric/sleep/history?limit=${limit}&offset=${offset}`
  );
}

export async function getSleepSummary(period: "7d" | "30d" = "30d"): Promise<{
  totalLogs: number;
  avgDuration: number;
  avgQuality?: number;
  avgConsistency: number;
  logs: SleepLog[];
}> {
  return await fetchApi<{
    totalLogs: number;
    avgDuration: number;
    avgQuality?: number;
    avgConsistency: number;
    logs: SleepLog[];
  }>(`/api/biometric/sleep/summary?period=${period}`);
}

/**
 * Biometric Snapshots API
 */
export async function generateBiometricSnapshot(): Promise<BiometricSnapshot> {
  return await fetchApi<BiometricSnapshot>("/api/biometric/snapshot/generate", {
    method: "POST",
  });
}

export async function getBiometricSnapshot(period: "7d" | "30d" = "7d"): Promise<BiometricSnapshot | null> {
  try {
    return await fetchApi<BiometricSnapshot>(`/api/biometric/snapshot/${period}`);
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
  return await fetchApi<CorrelationFinding[]>(
    `/api/biometric/correlations?limit=${limit}`
  );
}

export async function dismissCorrelationFinding(id: string): Promise<void> {
  await fetchApi<void>(`/api/biometric/correlations/${id}/dismiss`, {
    method: "PATCH",
  });
}

/**
 * Recovery Score API
 */
export async function getRecoveryScore(): Promise<RecoveryScoreResult> {
  return await fetchApi<RecoveryScoreResult>("/api/biometric/recovery-score");
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
        bodyMetrics: 75,
        hydration: 80,
      },
      warnings: snapshot.warnings,
    };
  } catch {
    return null;
  }
}
