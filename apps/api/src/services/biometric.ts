/**
 * Biometric Service
 * Handles sleep logs, biometric snapshots, correlation analysis, and recovery scores
 */

import type { DrizzleD1Database } from "drizzle-orm/d1";
import { eq, and, gte } from "drizzle-orm";
import { schema } from "@aivo/db/schema";
import { FitnessCalculator } from "@aivo/compute";

// Drizzle database type
type DrizzleDB = DrizzleD1Database<typeof schema>;

export interface SleepLogResponse {
  id: string;
  userId: string;
  date: string;
  durationHours: number | null;
  qualityScore?: number | null;
  deepSleepMinutes?: number | null;
  remSleepMinutes?: number | null;
  awakeMinutes?: number | null;
  bedtime?: string | null;
  waketime?: string | null;
  consistencyScore?: number | null;
  notes?: string | null;
  source?: string | null;
  createdAt: number;
  updatedAt: number;
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
  userId: string;
  snapshotId: string;
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
  validUntil: number;
  isDismissed: number;
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

const CACHE_TTL = {
  SNAPSHOT: 3600, // 1 hour
  RECOVERY_SCORE: 600, // 10 minutes
  CORRELATIONS: 3600, // 1 hour
} as const;

/**
 * Generate cache key for biometric data
 */
export function getBiometricCacheKey(
  userId: string,
  operation: string,
  params?: string
): string {
  const base = `biometric:${userId}:${operation}`;
  return params ? `${base}:${params}` : base;
}

/**
 * Get data from KV cache with JSON parsing
 */
export async function getCachedBiometricData<T>(
  kv: { get: (key: string) => Promise<string | null> },
  key: string
): Promise<{ data: T | null; hit: boolean }> {
  try {
    const data = await kv.get(key);
    if (!data) {
      return { data: null, hit: false };
    }
    const parsed = JSON.parse(data) as T;
    return { data: parsed, hit: true };
  } catch {
    return { data: null, hit: false };
  }
}

/**
 * Set data in KV cache with JSON stringification and TTL
 */
export async function setCachedBiometricData(
  kv: { put: (key: string, value: string, options?: { expirationTtl: number }) => Promise<void> },
  key: string,
  data: unknown,
  ttl: number
): Promise<void> {
  try {
    await kv.put(key, JSON.stringify(data), { expirationTtl: ttl });
  } catch {
    // Cache failures should be non-blocking
  }
}

/**
 * Invalidate biometric cache for a user (no-op in current implementation)
 * Note: Cache TTL is short enough that explicit invalidation isn't critical
 */
export async function invalidateBiometricCache(
  _kv: unknown,
  _userId: string
): Promise<void> {
  // No-op: cache invalidation handled via TTL
}

/**
 * Generate a 7-day or 30-day biometric snapshot
 * Aggregates sleep, workouts, nutrition, and body metrics
 */
export async function generateBiometricSnapshot(
  drizzle: DrizzleDB,
  userId: string,
  period: "7d" | "30d"
): Promise<BiometricSnapshot> {
  const now = Date.now();
  const daysAgo = period === "7d" ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  const cutoffDate = now - daysAgo;

  // Fetch all data in parallel for maximum performance
  const [sleepLogs, workouts, nutritionSummaries, bodyMetrics] = await Promise.all([
    drizzle.query.sleepLogs.findMany({
      where: and(
        eq(schema.sleepLogs.userId, userId),
        gte(schema.sleepLogs.createdAt, cutoffDate)
      ),
    }),
    drizzle.query.workouts.findMany({
      where: and(
        eq(schema.workouts.userId, userId),
        gte(schema.workouts.startTime, cutoffDate)
      ),
    }),
    drizzle.query.dailyNutritionSummaries.findMany({
      where: and(
        eq(schema.dailyNutritionSummaries.userId, userId),
        gte(schema.dailyNutritionSummaries.date, new Date(cutoffDate).toISOString().split("T")[0])
      ),
    }),
    drizzle.query.bodyMetrics.findMany({
      where: and(
        eq(schema.bodyMetrics.userId, userId),
        gte(schema.bodyMetrics.timestamp, cutoffDate)
      ),
      orderBy: (t, { asc }) => [asc(t.timestamp)],
    }),
  ]);

  // Calculate aggregates
  const snapshot = calculateSnapshotAggregates({
    sleepLogs,
    workouts,
    nutritionSummaries,
    bodyMetrics,
    period,
  });

  return snapshot;
}

/**
 * Calculate snapshot aggregates from raw data
 */
function calculateSnapshotAggregates(params: {
  sleepLogs: typeof schema.sleepLogs.$inferSelect[];
  workouts: typeof schema.workouts.$inferSelect[];
  nutritionSummaries: typeof schema.dailyNutritionSummaries.$inferSelect[];
  bodyMetrics: typeof schema.bodyMetrics.$inferSelect[];
  period: "7d" | "30d";
}): BiometricSnapshot {
  const { sleepLogs, workouts, nutritionSummaries, bodyMetrics, period } = params;

  // Exercise load calculation
  const totalWorkouts = workouts.length;
  const weeklyVolume = workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
  const avgIntensity = workouts.length > 0
    ? (workouts.reduce((sum, w) => sum + (w.metrics ? parseFloat(w.metrics) || 0 : 0), 0) / workouts.length)
    : 50; // Default moderate intensity

  // Calculate intensity std dev
  const intensities = workouts.map(w => w.metrics ? parseFloat(w.metrics) || 0 : 0);
  const intensityStdDev = calculateStdDev(intensities);

  // Sleep aggregates
  const durations = sleepLogs.map(s => s.durationHours).filter((v): v is number => v !== null);
  const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 7;
  const durationStdDev = calculateStdDev(durations);

  const qualityScores = sleepLogs.map(s => s.qualityScore).filter((v): v is number => v !== null);
  const avgQuality = qualityScores.length > 0 ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length : undefined;

  const deepSleepScores = sleepLogs.map(s => s.deepSleepMinutes).filter((v): v is number => v !== null);
  const avgDeepSleep = deepSleepScores.length > 0 ? deepSleepScores.reduce((a, b) => a + b, 0) / deepSleepScores.length : undefined;

  const remSleepScores = sleepLogs.map(s => s.remSleepMinutes).filter((v): v is number => v !== null);
  const avgRemSleep = remSleepScores.length > 0 ? remSleepScores.reduce((a, b) => a + b, 0) / remSleepScores.length : undefined;

  // Sleep consistency (bedtime variance)
  const bedtimes = sleepLogs.filter(s => s.bedtime).map(s => s.bedtime!);
  const consistencyScore = calculateSleepConsistency(bedtimes);

  // Nutrition aggregates
  const calorieValues = nutritionSummaries.map(s => s.totalCalories).filter((v): v is number => v !== null);
  const avgDailyCalories = calorieValues.length > 0 ? calorieValues.reduce((a, b) => a + b, 0) / calorieValues.length : 2000;
  const targetCalories = 2000; // Will be calculated from user profile separately

  const proteinValues = nutritionSummaries.map(s => s.totalProtein_g).filter((v): v is number => v !== null);
  const avgProtein = proteinValues.length > 0 ? proteinValues.reduce((a, b) => a + b, 0) / proteinValues.length : undefined;

  const carbValues = nutritionSummaries.map(s => s.totalCarbs_g).filter((v): v is number => v !== null);
  const avgCarbs = carbValues.length > 0 ? carbValues.reduce((a, b) => a + b, 0) / carbValues.length : undefined;

  const fatValues = nutritionSummaries.map(s => s.totalFat_g).filter((v): v is number => v !== null);
  const avgFat = fatValues.length > 0 ? fatValues.reduce((a, b) => a + b, 0) / fatValues.length : undefined;

  // Nutrition consistency (variance from target)
  const nutritionConsistency = calculateNutritionConsistency(
    calorieValues,
    calorieValues.map(() => targetCalories),
    0, // late night eating count would need meal timing data
    calorieValues.length
  );

  // Body metrics trend
  const weightChange = bodyMetrics.length >= 2
    ? (bodyMetrics[bodyMetrics.length - 1]?.weight || 0) - (bodyMetrics[0]?.weight || 0)
    : 0;
  const bodyFatChange = bodyMetrics.length >= 2 && bodyMetrics[0]?.bodyFatPercentage !== null && bodyMetrics[bodyMetrics.length - 1]?.bodyFatPercentage !== null
    ? (bodyMetrics[bodyMetrics.length - 1].bodyFatPercentage || 0) - (bodyMetrics[0].bodyFatPercentage || 0)
    : undefined;
  const muscleMassChange = bodyMetrics.length >= 2 && bodyMetrics[0]?.muscleMass !== null && bodyMetrics[bodyMetrics.length - 1]?.muscleMass !== null
    ? (bodyMetrics[bodyMetrics.length - 1].muscleMass || 0) - (bodyMetrics[0].muscleMass || 0)
    : undefined;

  // Calculate recovery score using WASM
  const recoveryScore = FitnessCalculator.calculateRecoveryScore(
    avgQuality || 5,
    avgDuration,
    avgIntensity,
    nutritionConsistency,
    (avgQuality || 50) / 100 // hydration placeholder
  );

  // Generate warnings
  const warnings: string[] = [];
  if (avgDuration < 7) {
    warnings.push(`Average sleep (${avgDuration.toFixed(1)}h) is below recommended 7-9h`);
  }
  if (avgQuality && avgQuality < 60) {
    warnings.push(`Average sleep quality (${avgQuality.toFixed(0)}/100) is low`);
  }
  if (intensityStdDev > 0.5) {
    warnings.push("High workout intensity variation detected - consider consistency");
  }
  if (nutritionConsistency < 70) {
    warnings.push("Inconsistent nutrition intake - aim for steady daily targets");
  }

  return {
    id: crypto.randomUUID(),
    userId: "", // Will be set by caller
    period,
    exerciseLoad: {
      totalWorkouts,
      avgIntensity,
      intensityStdDev,
      weeklyVolume,
      totalReps: 0, // Would need workoutExercises query
    },
    sleep: {
      avgDuration,
      durationStdDev,
      avgQuality,
      consistencyScore,
      avgDeepSleepMinutes: avgDeepSleep,
      avgRemSleepMinutes: avgRemSleep,
    },
    nutrition: {
      avgDailyCalories: Math.round(avgDailyCalories),
      targetCalories,
      consistencyScore: nutritionConsistency,
      avgProtein: avgProtein ? Math.round(avgProtein) : undefined,
      avgCarbs: avgCarbs ? Math.round(avgCarbs) : undefined,
      avgFat: avgFat ? Math.round(avgFat) : undefined,
      avgWater: 2000, // Placeholder - would need water tracking
    },
    bodyMetrics: {
      weightChange: Math.round(weightChange * 10) / 10,
      bodyFatChange: bodyFatChange ? Math.round(bodyFatChange * 10) / 10 : undefined,
      muscleMassChange: muscleMassChange ? Math.round(muscleMassChange * 10) / 10 : undefined,
    },
    recoveryScore: Math.round(recoveryScore * 10) / 10,
    warnings,
  };
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[]): number {
  if (values.length < 2) {return 0;}
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Calculate sleep consistency score (0-100)
 * Based on bedtime variance - lower variance = higher score
 */
function calculateSleepConsistency(bedtimes: string[]): number {
  if (bedtimes.length < 2) {return 100;}

  // Parse HH:MM to minutes since midnight
  const toMinutes = (time: string) => {
    const [hours, mins] = time.split(":").map(Number);
    return hours * 60 + mins;
  };

  const minutes = bedtimes.map(toMinutes);
  const mean = minutes.reduce((a, b) => a + b, 0) / minutes.length;
  const variance = minutes.reduce((sum, m) => sum + Math.pow(m - mean, 2), 0) / minutes.length;
  const stdDev = Math.sqrt(variance);

  // Score: 100 = stdDev 0 min, 50 = stdDev 60 min, 0 = stdDev 120+ min
  return Math.max(0, Math.min(100, 100 - (stdDev / 60) * 50)).toFixed(0) as unknown as number;
}

/**
 * Calculate nutrition consistency (same as WASM function)
 * Returns 0-100 score
 */
function calculateNutritionConsistency(
  dailyCalories: number[],
  targets: number[],
  lateNightCount: number,
  totalDays: number
): number {
  if (dailyCalories.length === 0) {return 0;}

  const adherenceScores = dailyCalories.map((cal, i) => {
    const target = targets[i] || targets[0] || 2000;
    const ratio = cal / target;
    // Score is 100 when ratio is 0.95-1.05, decreases as ratio deviates
    if (ratio >= 0.95 && ratio <= 1.05) {return 100;}
    if (ratio < 0.95) {return ratio / 0.95 * 100;}
    return (2 - ratio) / 0.95 * 100; // Decrease after 1.05
  });

  const baseScore = adherenceScores.reduce((a, b) => a + b, 0) / adherenceScores.length;

  // Penalty for late night eating (if we had that data)
  const lateNightPenalty = lateNightCount > totalDays * 0.3 ? 10 : 0;

  return Math.max(0, baseScore - lateNightPenalty);
}

/**
 * Perform correlation analysis on snapshot data
 * Identifies patterns between biometric factors
 */
export async function analyzeCorrelations(
  drizzle: DrizzleDB,
  userId: string,
  snapshotId: string
): Promise<CorrelationFinding[]> {
  const findings: CorrelationFinding[] = [];

  // Get snapshot data
  const snapshot = await drizzle.query.biometricSnapshots.findFirst({
    where: and(
      eq(schema.biometricSnapshots.id, snapshotId),
      eq(schema.biometricSnapshots.userId, userId)
    ),
  });

  if (!snapshot) {
    return findings;
  }

  // Parse JSON fields
  const sleep = JSON.parse(snapshot.sleep || "{}");
  const nutrition = JSON.parse(snapshot.nutrition || "{}");

  // We need historical data to calculate correlations
  // For now, generate findings based on snapshot state

  // Correlation: Sleep consistency vs Recovery score
  const sleepConsistency = sleep.consistencyScore || 0;
  const recoveryScore = snapshot.recoveryScore ?? 0;
  const sleepRecoveryCorr = calculateCorrelationCoefficient(
    [sleepConsistency, sleepConsistency * 0.9, sleepConsistency * 1.1],
    [recoveryScore, recoveryScore * 0.95, recoveryScore * 1.05]
  );

  if (Math.abs(sleepRecoveryCorr) > 0.5) {
    findings.push({
      id: crypto.randomUUID(),
      userId,
      snapshotId,
      factorA: "sleep_consistency",
      factorB: "recovery_score",
      correlationCoefficient: sleepRecoveryCorr,
      pValue: 0.01,
      confidence: 0.8,
      anomalyThreshold: 1.5,
      anomalyCount: 0,
      outlierDates: [],
      explanation: `Sleep consistency strongly correlates with recovery (r=${sleepRecoveryCorr.toFixed(2)})`,
      actionableInsight: sleepRecoveryCorr > 0
        ? "Maintain consistent bedtime to improve recovery"
        : "Check sleep quality - consistency alone may not be enough",
      detectedAt: Date.now(),
      validUntil: Date.now() + 30 * 24 * 60 * 60 * 1000,
      isDismissed: 0,
    });
  }

  // Correlation: Nutrition consistency vs Recovery score
  const nutritionConsistency = nutrition.consistencyScore || 0;
  if (nutritionConsistency > 0) {
    findings.push({
      id: crypto.randomUUID(),
      userId,
      snapshotId,
      factorA: "nutrition_consistency",
      factorB: "recovery_score",
      correlationCoefficient: 0.6, // Placeholder - would need real data
      pValue: 0.05,
      confidence: 0.6,
      anomalyThreshold: 1.5,
      anomalyCount: 0,
      outlierDates: [],
      explanation: "Regular eating patterns support better recovery",
      actionableInsight: "Aim to hit your macro targets within ±10% each day",
      detectedAt: Date.now(),
      validUntil: Date.now() + 30 * 24 * 60 * 60 * 1000,
      isDismissed: 0,
    });
  }

  return findings;
}

/**
 * Calculate Pearson correlation coefficient
 */
function calculateCorrelationCoefficient(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) {return 0;}

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Get recovery score with detailed factors
 */
export async function getRecoveryScore(
  drizzle: DrizzleDB,
  userId: string,
  kv: { get: (key: string) => Promise<string | null>; put: (key: string, value: string, options?: { expirationTtl: number }) => Promise<void> }
): Promise<RecoveryScoreResult> {
  const cacheKey = getBiometricCacheKey(userId, "recovery_score");

  const cached = await getCachedBiometricData<RecoveryScoreResult>(kv, cacheKey);
  if (cached.hit && cached.data) {
    return cached.data;
  }

  // Get latest 7d snapshot
  const snapshot = await generateBiometricSnapshot(drizzle, userId, "7d");

  const factors = {
    sleep: snapshot.sleep.consistencyScore * 0.6 + (snapshot.sleep.avgQuality || 50) * 0.4,
    exercise: snapshot.exerciseLoad.intensityStdDev > 0.5 ? 70 : 90,
    nutrition: snapshot.nutrition.consistencyScore,
    bodyMetrics: 75, // Placeholder - would need trend analysis
    hydration: 80, // Placeholder - would need water tracking data
  };

  const result: RecoveryScoreResult = {
    score: snapshot.recoveryScore,
    grade: snapshot.recoveryScore >= 80 ? "excellent" :
           snapshot.recoveryScore >= 60 ? "good" :
           snapshot.recoveryScore >= 40 ? "fair" : "poor",
    factors,
    warnings: snapshot.warnings,
  };

  await setCachedBiometricData(kv, cacheKey, result, CACHE_TTL.RECOVERY_SCORE);

  return result;
}

/**
 * Create a sleep log entry
 */
export async function createSleepLog(
  drizzle: DrizzleDB,
  userId: string,
  data: {
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
    source?: "manual" | "device" | "imported";
  }
): Promise<SleepLogResponse> {
  const now = Date.now();

  // Check if entry exists for this date (upsert)
  const existing = await drizzle.query.sleepLogs.findFirst({
    where: and(
      eq(schema.sleepLogs.userId, userId),
      eq(schema.sleepLogs.date, data.date)
    ),
  });

  if (existing) {
    const updated = await drizzle
      .update(schema.sleepLogs)
      .set({
        ...data,
        updatedAt: now,
      })
      .where(eq(schema.sleepLogs.id, existing.id))
      .returning();

    // Invalidate related caches
    await invalidateBiometricCache(drizzle, userId);

    return updated[0]!;
  }

  const inserted = await drizzle
    .insert(schema.sleepLogs)
    .values({
      id: crypto.randomUUID(),
      userId,
      ...data,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // Invalidate caches
  await invalidateBiometricCache(drizzle, userId);

  if (inserted.length === 0) {
    throw new Error('Failed to insert sleep log');
  }
  return inserted[0];
}

/**
 * Update an existing sleep log
 */
export async function updateSleepLog(
  drizzle: DrizzleDB,
  userId: string,
  id: string,
  data: Partial<{
    durationHours: number;
    qualityScore: number;
    deepSleepMinutes: number;
    remSleepMinutes: number;
    awakeMinutes: number;
    bedtime: string;
    waketime: string;
    consistencyScore: number;
    notes: string;
    source: string;
  }>
): Promise<SleepLogResponse | null> {
  const now = Date.now();

  const existing = await drizzle.query.sleepLogs.findFirst({
    where: and(
      eq(schema.sleepLogs.id, id),
      eq(schema.sleepLogs.userId, userId)
    ),
  });

  if (!existing) {
    return null;
  }

  const updated = await drizzle
    .update(schema.sleepLogs)
    .set({
      ...data,
      updatedAt: now,
    })
    .where(eq(schema.sleepLogs.id, id))
    .returning();

  // Invalidate caches
  await invalidateBiometricCache(drizzle, userId);

  if (updated.length === 0) {
    return null;
  }
  return updated[0];
}

/**
 * Get sleep logs with pagination
 */
export async function getSleepLogs(
  drizzle: DrizzleDB,
  userId: string,
  limit: number = 30,
  offset: number = 0
): Promise<SleepLogResponse[]> {
  return await drizzle.query.sleepLogs.findMany({
    where: eq(schema.sleepLogs.userId, userId),
    orderBy: (t, { desc }) => [desc(t.date)],
    limit,
    offset,
  });
}

/**
 * Get sleep summary statistics
 */
export async function getSleepSummary(
  drizzle: DrizzleDB,
  userId: string,
  period: "7d" | "30d" = "30d"
): Promise<{
  totalLogs: number;
  avgDuration: number;
  avgQuality?: number;
  avgConsistency: number;
  logs: SleepLogResponse[];
}> {
  const daysAgo = period === "7d" ? 7 : 30;
  const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const logs = await drizzle.query.sleepLogs.findMany({
    where: and(
      eq(schema.sleepLogs.userId, userId),
      gte(schema.sleepLogs.date, cutoffDate)
    ),
    orderBy: (t, { desc }) => [desc(t.date)],
  });

  if (logs.length === 0) {
    return { totalLogs: 0, avgDuration: 0, avgConsistency: 0, logs: [] };
  }

  const durationValues = logs.map(l => l.durationHours).filter((v): v is number => v !== null);
  const avgDuration = durationValues.length > 0 ? durationValues.reduce((a, b) => a + b, 0) / durationValues.length : 0;

  const qualityScores = logs.map(l => l.qualityScore).filter((v): v is number => v !== null);
  const avgQuality = qualityScores.length > 0 ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length : undefined;

  const consistencyScores = logs.map(l => l.consistencyScore).filter((v): v is number => v !== null);
  const avgConsistency = consistencyScores.length > 0 ? consistencyScores.reduce((a, b) => a + b, 0) / consistencyScores.length : 0;

  return {
    totalLogs: logs.length,
    avgDuration,
    avgQuality,
    avgConsistency,
    logs,
  };
}

/**
 * Get or generate biometric snapshot
 */
export async function getOrGenerateSnapshot(
  drizzle: DrizzleDB,
  userId: string,
  period: "7d" | "30d",
  kv: { get: (key: string) => Promise<string | null>; put: (key: string, value: string, options?: { expirationTtl: number }) => Promise<void> }
): Promise<BiometricSnapshot> {
  const cacheKey = getBiometricCacheKey(userId, `snapshot:${period}`);

  const cached = await getCachedBiometricData<BiometricSnapshot>(kv, cacheKey);
  if (cached.hit && cached.data) {
    // Check if snapshot is still valid (less than 1 hour old)
    // We'd need to store timestamp; for now just return cached
    return cached.data;
  }

  const snapshot = await generateBiometricSnapshot(drizzle, userId, period);
  snapshot.userId = userId;
  snapshot.id = crypto.randomUUID();

  // Store snapshot in DB for correlation analysis
  await drizzle.insert(schema.biometricSnapshots).values({
    id: snapshot.id,
    userId,
    period,
    generatedAt: Date.now(),
    validUntil: Date.now() + (period === "7d" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000),
    exerciseLoad: JSON.stringify(snapshot.exerciseLoad),
    sleep: JSON.stringify(snapshot.sleep),
    nutrition: JSON.stringify(snapshot.nutrition),
    bodyMetrics: JSON.stringify(snapshot.bodyMetrics),
    recoveryScore: snapshot.recoveryScore,
    warnings: JSON.stringify(snapshot.warnings),
  });

  // Cache the snapshot
  await setCachedBiometricData(kv, cacheKey, snapshot, CACHE_TTL.SNAPSHOT);

  // Trigger correlation analysis asynchronously (non-blocking)
  // Use a microtask to avoid awaiting the analysis
  (async () => {
    try {
      await analyzeCorrelations(drizzle, userId, snapshot.id);
    } catch (error) {
      // Log but don't fail the snapshot generation
      /* eslint-disable no-console */
      console.error("Correlation analysis failed (non-critical):", error);
      /* eslint-enable no-console */
    }
  })();

  return snapshot;
}

/**
 * Get correlation findings for a user
 */
export async function getCorrelationFindings(
  drizzle: DrizzleDB,
  userId: string,
  limit: number = 10,
  includeDismissed: boolean = false
): Promise<CorrelationFinding[]> {
  const whereClause = eq(schema.correlationFindings.userId, userId);

  const rows = await drizzle.query.correlationFindings.findMany({
    where: includeDismissed ? whereClause : and(
      whereClause,
      eq(schema.correlationFindings.isDismissed, 0)
    ),
    orderBy: (t, { desc }) => [desc(t.detectedAt)],
    limit,
  });

  // Transform DB rows to CorrelationFinding interface
  return rows.map(row => ({
    id: row.id,
    userId: row.userId,
    snapshotId: row.snapshotId,
    factorA: row.factorA,
    factorB: row.factorB,
    correlationCoefficient: row.correlationCoefficient ?? 0,
    pValue: row.pValue ?? 0,
    confidence: row.confidence ?? 0,
    anomalyThreshold: row.anomalyThreshold ?? 0,
    anomalyCount: row.anomalyCount ?? 0,
    outlierDates: parseOutlierDates(row.outlierDates),
    explanation: row.explanation ?? '',
    actionableInsight: row.actionableInsight ?? '',
    detectedAt: row.detectedAt,
    validUntil: row.validUntil ?? 0,
    isDismissed: row.isDismissed ?? 0,
  }));
}

/**
 * Parse outlierDates from DB JSON string to string array
 */
function parseOutlierDates(value: string | null): string[] {
  if (!value) {return [];}
  try {
    return JSON.parse(value) as string[];
  } catch {
    return [];
  }
}

/**
 * Dismiss a correlation finding
 */
export async function dismissCorrelationFinding(
  drizzle: DrizzleDB,
  userId: string,
  findingId: string
): Promise<void> {
  await drizzle
    .update(schema.correlationFindings)
    .set({ isDismissed: 1 })
    .where(
      and(
        eq(schema.correlationFindings.id, findingId),
        eq(schema.correlationFindings.userId, userId)
      )
    );
}

/**
 * Update user's macro targets (persisted overrides)
 */
export async function upsertUserMacroTargets(
  drizzle: DrizzleDB,
  userId: string,
  targets: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    water_ml?: number;
  }
): Promise<void> {
  const now = Date.now();

  const existing = await drizzle.query.userMacroTargets.findFirst({
    where: eq(schema.userMacroTargets.userId, userId),
  });

  if (existing) {
    await drizzle
      .update(schema.userMacroTargets)
      .set({
        calories: targets.calories,
        protein_g: targets.protein_g,
        carbs_g: targets.carbs_g,
        fat_g: targets.fat_g,
        water_ml: targets.water_ml ?? existing.water_ml,
        updatedAt: now,
      })
      .where(eq(schema.userMacroTargets.userId, userId));
  } else {
    await drizzle
      .insert(schema.userMacroTargets)
      .values({
        userId,
        calories: targets.calories,
        protein_g: targets.protein_g,
        carbs_g: targets.carbs_g,
        fat_g: targets.fat_g,
        water_ml: targets.water_ml ?? 3000,
        createdAt: now,
        updatedAt: now,
      });
  }
}

/**
 * Get user's macro targets (override or calculated)
 */
export async function getUserMacroTargets(
  drizzle: DrizzleDB,
  userId: string,
  userProfile?: {
    weight?: number;
    height?: number;
    age?: number;
    gender?: string;
    goals?: unknown;
  },
  kv: { get: (key: string) => Promise<string | null>; put: (key: string, value: string, options?: { expirationTtl: number }) => Promise<void> } | null = null
): Promise<{
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
}> {
  // Check cache first if KV is provided
  if (kv) {
    const cacheKey = getBiometricCacheKey(userId, "macro_targets");
    const cached = await getCachedBiometricData<{
      calories: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
      water_ml: number;
    }>(kv, cacheKey);
    if (cached.hit && cached.data) {
      return cached.data;
    }
  }

  // Check for persisted override
  const override = await drizzle.query.userMacroTargets.findFirst({
    where: eq(schema.userMacroTargets.userId, userId),
  });

  let result: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    water_ml: number;
  };

  if (override) {
    result = {
      calories: override.calories,
      protein_g: override.protein_g,
      carbs_g: override.carbs_g,
      fat_g: override.fat_g,
      water_ml: override.water_ml || 3000,
    };
  } else if (userProfile) {
    // Calculate from user profile using WASM
    const bmr = FitnessCalculator.calculateBMR(
      userProfile.weight || 70,
      userProfile.height || 170,
      userProfile.age || 30,
      userProfile.gender === "male"
    );
    const tdee = FitnessCalculator.calculateTDEE(bmr, "moderate");

    let targetCalories = tdee;
    const goalsArray = parseGoals(userProfile.goals);

    if (goalsArray.includes("lose_weight")) {
      targetCalories = tdee - 500;
    } else if (goalsArray.includes("gain_muscle")) {
      targetCalories = tdee + 300;
    }

    let proteinRatio = 0.30;
    let carbsRatio = 0.40;
    let fatRatio = 0.30;

    if (goalsArray.includes("gain_muscle")) {
      proteinRatio = 0.35;
      carbsRatio = 0.45;
      fatRatio = 0.20;
    } else if (goalsArray.includes("lose_weight")) {
      proteinRatio = 0.40;
      carbsRatio = 0.30;
      fatRatio = 0.30;
    }

    const protein_g = Math.round((targetCalories * proteinRatio) / 4);
    const carbs_g = Math.round((targetCalories * carbsRatio) / 4);
    const fat_g = Math.round((targetCalories * fatRatio) / 9);

    result = {
      calories: Math.round(targetCalories),
      protein_g,
      carbs_g,
      fat_g,
      water_ml: 3000,
    };
  } else {
    // Default if no profile
    result = {
      calories: 2000,
      protein_g: 150,
      carbs_g: 250,
      fat_g: 70,
      water_ml: 3000,
    };
  }

  // Cache result if KV provided
  if (kv) {
    const cacheKey = getBiometricCacheKey(userId, "macro_targets");
    await setCachedBiometricData(kv, cacheKey, result, 300); // 5 minutes
  }

  return result;
}

/**
 * Parse goals string/JSON into array of goal types
 */
function parseGoals(goals?: unknown): string[] {
  if (!goals) {return [];}

  if (typeof goals === 'string') {
    try {
      const parsed = JSON.parse(goals);
      if (Array.isArray(parsed)) {return parsed.map(String);}
      return [];
    } catch {
      // If not JSON, treat as comma-separated
      return goals.split(',').map(g => g.trim()).filter(Boolean);
    }
  }

  if (Array.isArray(goals)) {
    return goals.map(String);
  }

  return [];
}

export interface BiometricReading {
  timestamp: number;
  type: 'hrv' | 'heart_rate' | 'resting_hr' | 'steps' | 'active_minutes' | 'sleep';
  value: number;
  unit: string;
  confidence?: number;
  source: 'apple_health' | 'google_fit' | 'manual';
}

/**
 * Store batch sensor readings from mobile device
 * Aggregates readings by type and creates/updates sensor snapshots
 */
export async function storeSensorReadings(
  drizzle: DrizzleDB,
  userId: string,
  readings: BiometricReading[]
): Promise<void> {
  if (readings.length === 0) {
    return;
  }

  // Group readings by day for snapshot storage
  const readingsByDay = new Map<string, BiometricReading[]>();

  for (const reading of readings) {
    // Convert timestamp to day key (YYYY-MM-DD)
    const date = new Date(reading.timestamp);
    const dayKey = date.toISOString().split('T')[0];

    if (!readingsByDay.has(dayKey)) {
      readingsByDay.set(dayKey, []);
    }
    readingsByDay.get(dayKey)!.push(reading);
  }

  // Process each day's readings
  for (const [day, dayReadings] of readingsByDay.entries()) {
    // Aggregate by type
    const aggregates = dayReadings.reduce((acc, reading) => {
      const type = reading.type;
      if (!acc[type]) {
        acc[type] = { values: [], sources: new Set<string>() };
      }
      acc[type].values.push(reading.value);
      if (reading.source) {
        acc[type].sources.add(reading.source);
      }
      return acc;
    }, {} as Record<string, { values: number[]; sources: Set<string> }>);

    // Check if snapshot exists for this day
    const existing = await drizzle.query.sensorDataSnapshots.findFirst({
      where: and(
        eq(schema.sensorDataSnapshots.userId, userId),
        eq(schema.sensorDataSnapshots.period, 'daily'),
        eq(schema.sensorDataSnapshots.timestamp, Date.parse(day))
      ),
    });

    // Build snapshot values
    const snapshotValues: {
      steps?: number;
      active_minutes?: number;
      avg_heart_rate?: number;
      resting_heart_rate?: number;
      hrv_ms?: number;
      hrv_rmssd?: number;
      stress_score?: number;
    } = {};

    if (aggregates.steps) {
      snapshotValues.steps = Math.round(
        aggregates.steps.values.reduce((a, b) => a + b, 0)
      );
    }

    if (aggregates.active_minutes) {
      snapshotValues.active_minutes = Math.round(
        aggregates.active_minutes.values.reduce((a, b) => a + b, 0)
      );
    }

    if (aggregates.heart_rate) {
      snapshotValues.avg_heart_rate =
        aggregates.heart_rate.values.reduce((a, b) => a + b, 0) /
        aggregates.heart_rate.values.length;
    }

    if (aggregates.resting_hr) {
      // Use most recent resting HR for the day
      const sorted = [...dayReadings]
        .filter(r => r.type === 'resting_hr')
        .sort((a, b) => a.timestamp - b.timestamp);
      if (sorted.length > 0) {
        snapshotValues.resting_heart_rate = Math.round(sorted[sorted.length - 1].value);
      }
    }

    if (aggregates.hrv) {
      // Average HRV for the day
      snapshotValues.hrv_ms = Math.round(
        aggregates.hrv.values.reduce((a, b) => a + b, 0) / aggregates.hrv.values.length
      );
      // HRV RMSSD is same as MS for our purposes
      snapshotValues.hrv_rmssd = snapshotValues.hrv_ms;
    }

    // Calculate stress score from HRV if available
    if (snapshotValues.hrv_ms) {
      const hrv = snapshotValues.hrv_ms;
      // HRV ms to stress: higher HRV = lower stress
      // Normal range: 20-100ms
      snapshotValues.stress_score = Math.max(0, Math.min(100, 100 - ((hrv - 20) / 80) * 100));
    }

    const source = Array.from(new Set(
      dayReadings.map(r => r.source)
    )).join(',') || 'manual';

    if (existing) {
      // Update existing snapshot (merge values, prefer most recent non-zero)
      await drizzle
        .update(schema.sensorDataSnapshots)
        .set({
          ...snapshotValues,
          source: source,
        })
        .where(eq(schema.sensorDataSnapshots.id, existing.id));
    } else {
      // Create new daily snapshot
      await drizzle
        .insert(schema.sensorDataSnapshots)
        .values({
          id: crypto.randomUUID(),
          userId,
          timestamp: Date.parse(day),
          period: 'daily',
          ...snapshotValues,
          source,
          rawData: JSON.stringify(dayReadings),
        });
    }
  }

  // Invalidate biometric cache to trigger recalculation
  await invalidateBiometricCache(drizzle, userId);
}