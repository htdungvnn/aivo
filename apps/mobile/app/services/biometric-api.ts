import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS, API_CONFIG } from "@/config";
import type {
  SleepLog,
  SleepLogCreate,
  BiometricSnapshot,
  CorrelationFinding,
  RecoveryScoreResult,
  BiometricReading,
  SensorDataSnapshot,
  ApiResponse
} from "@aivo/shared-types";

// API URL from config
const API_URL = API_CONFIG.BASE_URL;

// Partial update for SleepLog
export type SleepLogUpdate = Partial<Omit<SleepLog, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>;

// Re-export types for consumers of this module
export type {
  SleepLog,
  SleepLogCreate,
  SleepLogUpdate,
  BiometricSnapshot,
  CorrelationFinding,
  RecoveryScoreResult,
  BiometricReading,
  SensorDataSnapshot,
};

async function getToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);
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

  const response = await fetch(`${API_URL}${endpoint}`, {
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

  const json = await response.json();

  // Unwrap data envelope if present (API returns { data: T })
  if (json && typeof json === 'object' && 'data' in json) {
    return json.data as T;
  }

  return json as T;
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

/**
 * Get sleep history with pagination
 */
export async function getSleepHistory(
  limit: number = 30,
  offset: number = 0
): Promise<SleepLog[]> {
  return await fetchApi<SleepLog[]>(
    `/api/biometric/sleep/history?limit=${limit}&offset=${offset}`
  );
}

/**
 * Dismiss a correlation finding
 */
export async function dismissCorrelation(id: string): Promise<void> {
  await fetchApi<void>(`/api/biometric/correlations/${id}/dismiss`, {
    method: "PATCH",
  });
}
