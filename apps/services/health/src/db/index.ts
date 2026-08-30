/**
 * Database Access Layer
 * D1 database operations for health service
 */

import {
  ReadinessSnapshot,
  ReadinessFactorSnapshot,
  DailyIntelligenceSnapshot,
  DailyAction,
  PlanAdaptation,
  UserCheckIn,
  ChartDataPoint,
} from '@repo/health-types';
import type { HealthEnv } from '../types/env.js';

// =============================================================================
// Readiness Snapshots
// =============================================================================

/**
 * Save readiness snapshot
 */
export async function saveReadinessSnapshot(
  db: D1Database,
  snapshot: {
    id: string;
    userId: string;
    date: string;
    timezone: string;
    score: number;
    level: string;
    confidence: number;
    dataCompleteness: number;
    factors: Array<{
      code: string;
      score: number;
      weight: number;
      contribution: number;
      status: string;
      messageKey: string;
    }>;
    recommendation: {
      action: string;
      intensityModifier: number;
      volumeModifier: number;
    };
    inputSnapshot: string;
    sourceDataTimestamps: Record<string, number>;
    algorithmVersion: string;
    idempotencyKey: string;
  }
): Promise<void> {
  const now = Date.now();
  
  // Use batch for atomic operation
  await db.batch([
    // Insert/update readiness snapshot
    db
      .prepare(`
        INSERT INTO daily_readiness_snapshots (
          id, user_id, date, timezone, score, level, confidence,
          data_completeness, factors_json, recommendation_json,
          input_snapshot_json, source_data_timestamps_json,
          algorithm_version, idempotency_key, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, date) DO UPDATE SET
          score = excluded.score,
          level = excluded.level,
          confidence = excluded.confidence,
          data_completeness = excluded.data_completeness,
          factors_json = excluded.factors_json,
          recommendation_json = excluded.recommendation_json,
          input_snapshot_json = excluded.input_snapshot_json,
          source_data_timestamps_json = excluded.source_data_timestamps_json,
          algorithm_version = excluded.algorithm_version,
          updated_at = excluded.updated_at
      `)
      .bind(
        snapshot.id,
        snapshot.userId,
        snapshot.date,
        snapshot.timezone,
        snapshot.score,
        snapshot.level,
        snapshot.confidence,
        snapshot.dataCompleteness,
        JSON.stringify(snapshot.factors),
        JSON.stringify(snapshot.recommendation),
        snapshot.inputSnapshot,
        JSON.stringify(snapshot.sourceDataTimestamps),
        snapshot.algorithmVersion,
        snapshot.idempotencyKey,
        now,
        now
      ),
    
    // Delete existing factor snapshots
    db
      .prepare(`
        DELETE FROM readiness_factor_snapshots
        WHERE readiness_snapshot_id = ?
      `)
      .bind(snapshot.id),
  ]);
  
  // Insert factor snapshots
  for (const factor of snapshot.factors) {
    await db
      .prepare(`
        INSERT INTO readiness_factor_snapshots (
          id, readiness_snapshot_id, factor_code, score, weight,
          contribution, status, message_key, value, unit, source,
          confidence, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        crypto.randomUUID(),
        snapshot.id,
        factor.code,
        factor.score,
        factor.weight,
        factor.contribution,
        factor.status,
        factor.messageKey,
        factor.score, // value
        'score', // unit
        'calculated', // source
        0.9, // confidence
        now
      );
  }
}

/**
 * Get readiness snapshot for date
 */
export async function getReadinessSnapshot(
  db: D1Database,
  userId: string,
  date: string
): Promise<ReadinessSnapshot | null> {
  const result = await db
    .prepare(`
      SELECT * FROM daily_readiness_snapshots
      WHERE user_id = ? AND date = ?
    `)
    .bind(userId, date)
    .first();
  
  if (!result) return null;
  
  return {
    id: result.id as string,
    userId: result.user_id as string,
    date: result.date as string,
    timezone: result.timezone as string,
    score: result.score as number,
    level: result.level as string,
    confidence: result.confidence as number,
    dataCompleteness: result.data_completeness as number,
    factorsJson: result.factors_json as string,
    recommendationJson: result.recommendation_json as string,
    inputSnapshotJson: result.input_snapshot_json as string,
    sourceDataTimestampsJson: result.source_data_timestamps_json as string,
    algorithmVersion: result.algorithm_version as string,
    idempotencyKey: result.idempotency_key as string,
    createdAt: result.created_at as number,
    updatedAt: result.updated_at as number,
  };
}

/**
 * Get readiness history
 */
export async function getReadinessHistory(
  db: D1Database,
  userId: string,
  startDate: string,
  endDate: string
): Promise<Array<{ date: string; score: number; level: string }>> {
  const result = await db
    .prepare(`
      SELECT date, score, level
      FROM daily_readiness_snapshots
      WHERE user_id = ? AND date >= ? AND date <= ?
      ORDER BY date DESC
    `)
    .bind(userId, startDate, endDate)
    .all();
  
  return result.results.map(row => ({
    date: row.date as string,
    score: row.score as number,
    level: row.level as string,
  }));
}

/**
 * Get readiness factors for date
 */
export async function getReadinessFactors(
  db: D1Database,
  snapshotId: string
): Promise<ReadinessFactorSnapshot[]> {
  const result = await db
    .prepare(`
      SELECT * FROM readiness_factor_snapshots
      WHERE readiness_snapshot_id = ?
      ORDER BY contribution DESC
    `)
    .bind(snapshotId)
    .all();
  
  return result.results.map(row => ({
    id: row.id as string,
    readinessSnapshotId: row.readiness_snapshot_id as string,
    factorCode: row.factor_code as string,
    score: row.score as number,
    weight: row.weight as number,
    contribution: row.contribution as number,
    status: row.status as string,
    messageKey: row.message_key as string,
    value: row.value as number | null,
    unit: row.unit as string | null,
    source: row.source as string | null,
    confidence: row.confidence as number,
    createdAt: row.created_at as number,
  }));
}

// =============================================================================
// Daily Intelligence Snapshots
// =============================================================================

/**
 * Save daily intelligence snapshot
 */
export async function saveIntelligenceSnapshot(
  db: D1Database,
  snapshot: {
    id: string;
    userId: string;
    date: string;
    timezone: string;
    readinessScore: number;
    readinessLevel: string;
    readinessConfidence: number;
    readinessFactors: Array<{
      code: string;
      score: number;
      contribution: number;
      status: string;
      messageKey: string;
    }>;
    nextAction: {
      type: string;
      title: string;
      description: string;
    };
    todayPlan: Record<string, unknown>;
    currentNutrition: Record<string, number>;
    currentActivity: Record<string, number>;
    currentRecovery: Record<string, number | null>;
    aiInsight: string | null;
    aiInsightPromptVersion: string | null;
    dataCompleteness: number;
    lastSyncAt: number;
    idempotencyKey: string;
    algorithmVersion: string;
  }
): Promise<void> {
  const now = Date.now();
  
  await db
    .prepare(`
      INSERT INTO daily_intelligence_snapshots (
        id, user_id, date, timezone,
        readiness_score, readiness_level, readiness_confidence, readiness_factors_json,
        next_action_json, today_plan_json,
        current_nutrition_json, current_activity_json, current_recovery_json,
        ai_insight_json, ai_insight_prompt_version,
        data_completeness, last_sync_at,
        idempotency_key, algorithm_version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, date) DO UPDATE SET
        readiness_score = excluded.readiness_score,
        readiness_level = excluded.readiness_level,
        readiness_confidence = excluded.readiness_confidence,
        readiness_factors_json = excluded.readiness_factors_json,
        next_action_json = excluded.next_action_json,
        today_plan_json = excluded.today_plan_json,
        current_nutrition_json = excluded.current_nutrition_json,
        current_activity_json = excluded.current_activity_json,
        current_recovery_json = excluded.current_recovery_json,
        ai_insight_json = excluded.ai_insight_json,
        ai_insight_prompt_version = excluded.ai_insight_prompt_version,
        data_completeness = excluded.data_completeness,
        last_sync_at = excluded.last_sync_at,
        updated_at = excluded.updated_at
    `)
    .bind(
      snapshot.id,
      snapshot.userId,
      snapshot.date,
      snapshot.timezone,
      snapshot.readinessScore,
      snapshot.readinessLevel,
      snapshot.readinessConfidence,
      JSON.stringify(snapshot.readinessFactors),
      JSON.stringify(snapshot.nextAction),
      JSON.stringify(snapshot.todayPlan),
      JSON.stringify(snapshot.currentNutrition),
      JSON.stringify(snapshot.currentActivity),
      JSON.stringify(snapshot.currentRecovery),
      snapshot.aiInsight,
      snapshot.aiInsightPromptVersion,
      snapshot.dataCompleteness,
      snapshot.lastSyncAt,
      snapshot.idempotencyKey,
      snapshot.algorithmVersion,
      now,
      now
    )
    .run();
}

/**
 * Get daily intelligence snapshot
 */
export async function getIntelligenceSnapshot(
  db: D1Database,
  userId: string,
  date: string
): Promise<DailyIntelligenceSnapshot | null> {
  const result = await db
    .prepare(`
      SELECT * FROM daily_intelligence_snapshots
      WHERE user_id = ? AND date = ?
    `)
    .bind(userId, date)
    .first();
  
  if (!result) return null;
  
  return {
    id: result.id as string,
    userId: result.user_id as string,
    date: result.date as string,
    timezone: result.timezone as string,
    readinessScore: result.readiness_score as number,
    readinessLevel: result.readiness_level as string,
    readinessConfidence: result.readiness_confidence as number,
    readinessFactorsJson: result.readiness_factors_json as string,
    nextActionJson: result.next_action_json as string,
    todayPlanJson: result.today_plan_json as string,
    currentNutritionJson: result.current_nutrition_json as string,
    currentActivityJson: result.current_activity_json as string,
    currentRecoveryJson: result.current_recovery_json as string,
    aiInsightJson: result.ai_insight_json as string | null,
    aiInsightPromptVersion: result.ai_insight_prompt_version as string | null,
    dataCompleteness: result.data_completeness as number,
    lastSyncAt: result.last_sync_at as number,
    idempotencyKey: result.idempotency_key as string,
    algorithmVersion: result.algorithm_version as string,
    createdAt: result.created_at as number,
    updatedAt: result.updated_at as number,
  };
}

// =============================================================================
// Daily Actions
// =============================================================================

/**
 * Save daily actions
 */
export async function saveDailyActions(
  db: D1Database,
  userId: string,
  date: string,
  actions: Array<{
    id: string;
    type: string;
    priority: number;
    title: string;
    description: string;
    metadata: Record<string, unknown>;
  }>
): Promise<void> {
  const now = Date.now();
  
  // Delete existing pending actions for this date
  await db
    .prepare(`
      DELETE FROM daily_actions
      WHERE user_id = ? AND date = ? AND status = 'pending'
    `)
    .bind(userId, date)
    .run();
  
  // Insert new actions
  for (const action of actions) {
    await db
      .prepare(`
        INSERT INTO daily_actions (
          id, user_id, date, action_type, priority, title, description,
          status, metadata_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
      `)
      .bind(
        action.id,
        userId,
        date,
        action.type,
        action.priority,
        action.title,
        action.description,
        JSON.stringify(action.metadata),
        now,
        now
      )
      .run();
  }
}

/**
 * Get daily actions
 */
export async function getDailyActions(
  db: D1Database,
  userId: string,
  date: string
): Promise<DailyAction[]> {
  const result = await db
    .prepare(`
      SELECT * FROM daily_actions
      WHERE user_id = ? AND date = ?
      ORDER BY priority ASC
    `)
    .bind(userId, date)
    .all();
  
  return result.results.map(row => ({
    id: row.id as string,
    userId: row.user_id as string,
    date: row.date as string,
    type: row.action_type as string,
    priority: row.priority as number,
    title: row.title as string,
    description: row.description as string,
    status: row.status as string,
    completedAt: row.completed_at as number | null,
    skippedAt: row.skipped_at as number | null,
    skipReason: row.skip_reason as string | null,
    metadata: JSON.parse(row.metadata_json as string),
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  }));
}

/**
 * Update action status
 */
export async function updateActionStatus(
  db: D1Database,
  actionId: string,
  userId: string,
  status: 'completed' | 'skipped',
  skipReason?: string
): Promise<boolean> {
  const now = Date.now();
  
  const result = await db
    .prepare(`
      UPDATE daily_actions
      SET status = ?,
          completed_at = CASE WHEN ? = 'completed' THEN ? ELSE NULL END,
          skipped_at = CASE WHEN ? = 'skipped' THEN ? ELSE NULL END,
          skip_reason = ?,
          updated_at = ?
      WHERE id = ? AND user_id = ?
    `)
    .bind(
      status,
      status,
      status === 'completed' ? now : null,
      status,
      status === 'skipped' ? now : null,
      skipReason ?? null,
      now,
      actionId,
      userId
    )
    .run();
  
  return result.success;
}

// =============================================================================
// User Check-ins
// =============================================================================

/**
 * Save check-in
 */
export async function saveCheckIn(
  db: D1Database,
  checkIn: {
    id: string;
    userId: string;
    date: string;
    timezone: string;
    energy?: number;
    stress?: number;
    sleepQuality?: number;
    muscleSoreness?: number;
    notes?: string;
    completed: boolean;
  }
): Promise<void> {
  const now = Date.now();
  
  await db
    .prepare(`
      INSERT INTO daily_check_ins (
        id, user_id, date, timezone,
        energy, stress, sleep_quality, muscle_soreness,
        notes, completed, completed_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, date) DO UPDATE SET
        energy = COALESCE(excluded.energy, energy),
        stress = COALESCE(excluded.stress, stress),
        sleep_quality = COALESCE(excluded.sleep_quality, sleep_quality),
        muscle_soreness = COALESCE(excluded.muscle_soreness, muscle_soreness),
        notes = COALESCE(excluded.notes, notes),
        completed = excluded.completed,
        completed_at = CASE WHEN excluded.completed = 1 THEN ? ELSE completed_at END,
        updated_at = ?
    `)
    .bind(
      checkIn.id,
      checkIn.userId,
      checkIn.date,
      checkIn.timezone,
      checkIn.energy ?? null,
      checkIn.stress ?? null,
      checkIn.sleepQuality ?? null,
      checkIn.muscleSoreness ?? null,
      checkIn.notes ?? null,
      checkIn.completed ? 1 : 0,
      checkIn.completed ? now : null,
      now,
      now
    )
    .run();
}

/**
 * Get check-in for date
 */
export async function getCheckIn(
  db: D1Database,
  userId: string,
  date: string
): Promise<UserCheckIn | null> {
  const result = await db
    .prepare(`
      SELECT * FROM user_check_ins
      WHERE user_id = ? AND date = ?
    `)
    .bind(userId, date)
    .first();
  
  if (!result) return null;
  
  return {
    id: result.id as string,
    userId: result.user_id as string,
    date: result.date as string,
    timezone: result.timezone as string,
    energy: result.energy as number | null,
    stress: result.stress as number | null,
    sleepQuality: result.sleep_quality as number | null,
    muscleSoreness: result.muscle_soreness as number | null,
    notes: result.notes as string | null,
    completed: Boolean(result.completed),
    completedAt: result.completed_at as number | null,
    createdAt: result.created_at as number,
    updatedAt: result.updated_at as number,
  };
}

// =============================================================================
// Plan Adaptations
// =============================================================================

/**
 * Save plan adaptation
 */
export async function savePlanAdaptation(
  db: D1Database,
  adaptation: {
    id: string;
    userId: string;
    date: string;
    originalPlanId: string | null;
    adaptationType: string;
    field: string;
    originalValue: string | number | null;
    adaptedValue: string | number;
    reason: string;
    readinessScore: number;
    contributingFactors: string[];
  }
): Promise<void> {
  const now = Date.now();
  
  await db
    .prepare(`
      INSERT INTO daily_plan_adaptations (
        id, user_id, date, original_plan_id, adaptation_type, status,
        field, original_value, adapted_value,
        reason, readiness_score, contributing_factors_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'recommended', ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      adaptation.id,
      adaptation.userId,
      adaptation.date,
      adaptation.originalPlanId,
      adaptation.adaptationType,
      adaptation.field,
      adaptation.originalValue !== null ? String(adaptation.originalValue) : null,
      String(adaptation.adaptedValue),
      adaptation.reason,
      adaptation.readinessScore,
      JSON.stringify(adaptation.contributingFactors),
      now,
      now
    )
    .run();
}

/**
 * Get plan adaptations for date
 */
export async function getPlanAdaptations(
  db: D1Database,
  userId: string,
  date: string
): Promise<PlanAdaptation[]> {
  const result = await db
    .prepare(`
      SELECT * FROM daily_plan_adaptations
      WHERE user_id = ? AND date = ?
      ORDER BY created_at DESC
    `)
    .bind(userId, date)
    .all();
  
  return result.results.map(row => ({
    id: row.id as string,
    userId: row.user_id as string,
    date: row.date as string,
    originalPlanId: row.original_plan_id as string | null,
    type: row.adaptation_type as string,
    status: row.status as string,
    field: row.field as string,
    originalValue: row.original_value as string | number | null,
    adaptedValue: row.adapted_value as string | number,
    reason: row.reason as string,
    readinessScore: row.readiness_score as number,
    contributingFactors: JSON.parse(row.contributing_factors_json as string),
    acceptedAt: row.accepted_at as number | null,
    rejectedAt: row.rejected_at as number | null,
    restoredAt: row.restored_at as number | null,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  }));
}

/**
 * Update adaptation status
 */
export async function updateAdaptationStatus(
  db: D1Database,
  adaptationId: string,
  userId: string,
  action: 'accept' | 'reject' | 'restore'
): Promise<boolean> {
  const now = Date.now();
  
  const updates: Record<string, { column: string; value: number | null }> = {
    accept: { column: 'accepted_at', value: now },
    reject: { column: 'rejected_at', value: now },
    restore: { column: 'restored_at', value: now },
  };
  
  const update = updates[action];
  const status = action === 'restore' ? 'restored' : action === 'accept' ? 'accepted' : 'rejected';
  
  const result = await db
    .prepare(`
      UPDATE daily_plan_adaptations
      SET status = ?,
          ${update.column} = ?,
          updated_at = ?
      WHERE id = ? AND user_id = ?
    `)
    .bind(status, update.value, now, adaptationId, userId)
    .run();
  
  return result.success;
}

// =============================================================================
// Health Metrics
// =============================================================================

/**
 * Save health metric summary
 */
export async function saveHealthMetricSummary(
  db: D1Database,
  metric: {
    id: string;
    userId: string;
    date: string;
    timezone: string;
    metricCode: string;
    value: number | null;
    unit: string;
    target: number | null;
    confidence: number;
    source: string;
    timestamp: number | null;
  }
): Promise<void> {
  const now = Date.now();
  
  await db
    .prepare(`
      INSERT INTO health_metric_daily_summaries (
        id, user_id, date, timezone, metric_code,
        value, unit, target, confidence, source, timestamp,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, date, metric_code) DO UPDATE SET
        value = excluded.value,
        target = excluded.target,
        confidence = excluded.confidence,
        source = excluded.source,
        timestamp = excluded.timestamp,
        updated_at = excluded.updated_at
    `)
    .bind(
      metric.id,
      metric.userId,
      metric.date,
      metric.timezone,
      metric.metricCode,
      metric.value,
      metric.unit,
      metric.target,
      metric.confidence,
      metric.source,
      metric.timestamp,
      now,
      now
    )
    .run();
}

/**
 * Get health metrics for range
 */
export async function getHealthMetrics(
  db: D1Database,
  userId: string,
  metricCode: string,
  startDate: string,
  endDate: string
): Promise<Array<{ date: string; value: number | null; target?: number }>> {
  const result = await db
    .prepare(`
      SELECT date, value, target
      FROM health_metric_daily_summaries
      WHERE user_id = ? AND metric_code = ? AND date >= ? AND date <= ?
      ORDER BY date ASC
    `)
    .bind(userId, metricCode, startDate, endDate)
    .all();
  
  return result.results.map(row => ({
    date: row.date as string,
    value: row.value as number | null,
    target: row.target as number | undefined,
  }));
}

// =============================================================================
// Chart Aggregation
// =============================================================================

/**
 * Save chart aggregation snapshot
 */
export async function saveChartSnapshot(
  db: D1Database,
  snapshot: {
    id: string;
    userId: string;
    date: string;
    metricCode: string;
    rangeType: string;
    points: ChartDataPoint[];
    summary: Record<string, number | null>;
    target: number | null;
    unit: string;
    generatedAt: number;
    expiresAt: number;
  }
): Promise<void> {
  const now = Date.now();
  
  await db
    .prepare(`
      INSERT INTO chart_aggregation_snapshots (
        id, user_id, date, metric_code, range_type,
        points_json, summary_json, target, unit,
        generated_at, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, date, metric_code, range_type) DO UPDATE SET
        points_json = excluded.points_json,
        summary_json = excluded.summary_json,
        generated_at = excluded.generated_at,
        expires_at = excluded.expires_at
    `)
    .bind(
      snapshot.id,
      snapshot.userId,
      snapshot.date,
      snapshot.metricCode,
      snapshot.rangeType,
      JSON.stringify(snapshot.points),
      JSON.stringify(snapshot.summary),
      snapshot.target,
      snapshot.unit,
      snapshot.generatedAt,
      snapshot.expiresAt,
      now
    )
    .run();
}

/**
 * Get cached chart data
 */
export async function getCachedChartData(
  db: D1Database,
  userId: string,
  metricCode: string,
  rangeType: string
): Promise<{
  points: ChartDataPoint[];
  summary: Record<string, number | null>;
  generatedAt: number;
} | null> {
  const now = Date.now();
  
  const result = await db
    .prepare(`
      SELECT points_json, summary_json, generated_at
      FROM chart_aggregation_snapshots
      WHERE user_id = ? AND metric_code = ? AND range_type = ?
        AND expires_at > ?
      ORDER BY generated_at DESC
      LIMIT 1
    `)
    .bind(userId, metricCode, rangeType, now)
    .first();
  
  if (!result) return null;
  
  return {
    points: JSON.parse(result.points_json as string),
    summary: JSON.parse(result.summary_json as string),
    generatedAt: result.generated_at as number,
  };
}
