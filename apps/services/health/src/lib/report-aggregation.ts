/**
 * Health Report Data Aggregation
 * Aggregates and summarizes health data for report generation
 * 
 * Collects data from:
 * - Health service (readiness, sleep, activity)
 * - Nutrition service (calories, macros, hydration)
 * - Coach service (workouts, training)
 * - Health metrics (weight, body composition)
 */

import type { D1Database } from '@cloudflare/workers-types';
import type {
  SupportedLocale,
  ReportType,
  DataCompleteness,
} from '@aivo/report-types';
import { roundTo } from '@aivo/health-types';

// =============================================================================
// Types
// =============================================================================

export interface ReportAggregatedData {
  readiness: ReadinessSummary;
  sleep: SleepSummary;
  nutrition: NutritionSummary;
  hydration: HydrationSummary;
  fitness: FitnessSummary;
  activity: ActivitySummary;
  bodyMetrics: BodyMetricsSummary;
  habits: HabitsSummary;
  goals: GoalsSummary;
  dataSources: string[];
  dataCompleteness: DataCompleteness;
}

export interface ReadinessSummary {
  averageScore: number | null;
  minScore: number | null;
  maxScore: number | null;
  scores: Array<{ date: string; score: number }>;
  levels: Record<string, number>; // Count by level
  bestDay: { date: string; score: number } | null;
  lowestDay: { date: string; score: number } | null;
  trend: 'improving' | 'stable' | 'declining' | null;
  dataAvailable: boolean;
}

export interface SleepSummary {
  averageDuration: number | null; // Hours
  averageQuality: number | null; // 1-10
  durationByDay: Array<{ date: string; hours: number | null }>;
  qualityByDay: Array<{ date: string; quality: number | null }>;
  consistency: number | null; // 0-100%
  targetAdherence: number | null; // % of nights meeting target
  dataAvailable: boolean;
}

export interface NutritionSummary {
  averageCalories: number | null;
  targetCalories: number | null;
  calorieByDay: Array<{ date: string; consumed: number | null; target: number | null }>;
  protein: { average: number | null; target: number | null; adherence: number | null };
  carbs: { average: number | null; target: number | null; adherence: number | null };
  fat: { average: number | null; target: number | null; adherence: number | null };
  mealCount: number;
  daysWithData: number;
  dataAvailable: boolean;
}

export interface HydrationSummary {
  averageMl: number | null;
  targetMl: number | null;
  byDay: Array<{ date: string; ml: number | null; target: number | null }>;
  adherence: number | null; // % of days meeting target
  dataAvailable: boolean;
}

export interface FitnessSummary {
  completedWorkouts: number;
  plannedWorkouts: number;
  workoutDuration: {
    total: number | null; // minutes
    average: number | null;
  };
  trainingVolume: Array<{ date: string; volume: number }>;
  exerciseProgression: Record<string, Array<{ date: string; value: number }>>;
  formQualityTrend: 'improving' | 'stable' | 'declining' | null;
  formQualityScores: Array<{ date: string; score: number }>;
  recoveryDays: number;
  dataAvailable: boolean;
}

export interface ActivitySummary {
  averageSteps: number | null;
  stepsByDay: Array<{ date: string; steps: number | null }>;
  activeDays: number; // Days with 100% of target
  totalDays: number;
  activeMinutes: number | null;
  trends: {
    steps: 'improving' | 'stable' | 'declining' | null;
  };
  dataAvailable: boolean;
}

export interface BodyMetricsSummary {
  weight: {
    latest: number | null;
    start: number | null;
    change: number | null;
    unit: 'kg' | 'lb';
  };
  bodyFat: {
    latest: number | null;
    start: number | null;
    change: number | null;
  };
  byDay: Array<{ date: string; weight: number | null; bodyFat: number | null }>;
  dataAvailable: boolean;
}

export interface HabitsSummary {
  overallCompletion: number | null; // 0-100%
  byHabit: Array<{
    name: string;
    completionRate: number;
    streak: number;
  }>;
  consistency: number | null;
  dataAvailable: boolean;
}

export interface GoalsSummary {
  current: Array<{
    type: string;
    description: string;
    target: number;
    current: number;
    progress: number; // 0-100%
  }>;
  milestones: Array<{
    id: string;
    description: string;
    achieved: boolean;
    achievedAt: number | null;
  }>;
  adherence: number | null;
  dataAvailable: boolean;
}

// =============================================================================
// Main Aggregation Function
// =============================================================================

export interface AggregateReportDataParams {
  userId: string;
  periodStart: string;
  periodEnd: string;
  timezone: string;
  locale: SupportedLocale;
}

/**
 * Aggregate all health data for a report period
 */
export async function aggregateReportData(
  db: D1Database,
  params: AggregateReportDataParams
): Promise<ReportAggregatedData> {
  const { userId, periodStart, periodEnd } = params;
  
  // Get all data in parallel
  const [
    readiness,
    sleep,
    nutrition,
    hydration,
    fitness,
    activity,
    bodyMetrics,
    habits,
    goals,
  ] = await Promise.all([
    aggregateReadinessData(db, userId, periodStart, periodEnd),
    aggregateSleepData(db, userId, periodStart, periodEnd),
    aggregateNutritionData(db, userId, periodStart, periodEnd),
    aggregateHydrationData(db, userId, periodStart, periodEnd),
    aggregateFitnessData(db, userId, periodStart, periodEnd),
    aggregateActivityData(db, userId, periodStart, periodEnd),
    aggregateBodyMetricsData(db, userId, periodStart, periodEnd),
    aggregateHabitsData(db, userId, periodStart, periodEnd),
    aggregateGoalsData(db, userId),
  ]);
  
  // Determine data sources
  const dataSources: string[] = [];
  if (readiness.dataAvailable) dataSources.push('health_service');
  if (nutrition.dataAvailable) dataSources.push('nutrition_service');
  if (fitness.dataAvailable) dataSources.push('coach_service');
  if (activity.dataAvailable) dataSources.push('wearable');
  
  return {
    readiness,
    sleep,
    nutrition,
    hydration,
    fitness,
    activity,
    bodyMetrics,
    habits,
    goals,
    dataSources,
    dataCompleteness: calculateDataCompleteness({
      readiness,
      sleep,
      nutrition,
      hydration,
      fitness,
      activity,
      habits,
      goals,
    }),
  };
}

// =============================================================================
// Individual Aggregators
// =============================================================================

/**
 * Aggregate readiness data
 */
async function aggregateReadinessData(
  db: D1Database,
  userId: string,
  startDate: string,
  endDate: string
): Promise<ReadinessSummary> {
  const result = await db
    .prepare(`
      SELECT date, score, level
      FROM daily_readiness_snapshots
      WHERE user_id = ? AND date >= ? AND date <= ?
      ORDER BY date ASC
    `)
    .bind(userId, startDate, endDate)
    .all();
  
  if (result.results.length === 0) {
    return {
      averageScore: null,
      minScore: null,
      maxScore: null,
      scores: [],
      levels: {},
      bestDay: null,
      lowestDay: null,
      trend: null,
      dataAvailable: false,
    };
  }
  
  const scores = result.results.map(row => ({
    date: row.date as string,
    score: row.score as number,
  }));
  
  const scoreValues = scores.map(s => s.score);
  const averageScore = roundTo(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length, 0);
  const minScore = Math.min(...scoreValues);
  const maxScore = Math.max(...scoreValues);
  
  const levels: Record<string, number> = {};
  for (const row of result.results) {
    const level = row.level as string;
    levels[level] = (levels[level] || 0) + 1;
  }
  
  const bestDay = scores.reduce((best, current) => 
    current.score > best.score ? current : best, scores[0]);
  
  const lowestDay = scores.reduce((lowest, current) => 
    current.score < lowest.score ? current : lowest, scores[0]);
  
  const trend = calculateTrend(scoreValues);
  
  return {
    averageScore,
    minScore,
    maxScore,
    scores,
    levels,
    bestDay,
    lowestDay,
    trend,
    dataAvailable: true,
  };
}

/**
 * Aggregate sleep data
 */
async function aggregateSleepData(
  db: D1Database,
  userId: string,
  startDate: string,
  endDate: string
): Promise<SleepSummary> {
  // Get sleep metrics from health_metric_daily_summaries
  const durationResult = await db
    .prepare(`
      SELECT date, value, target
      FROM health_metric_daily_summaries
      WHERE user_id = ? AND date >= ? AND date <= ? AND metric_code = 'sleep_duration'
      ORDER BY date ASC
    `)
    .bind(userId, startDate, endDate)
    .all();
  
  const qualityResult = await db
    .prepare(`
      SELECT date, value
      FROM health_metric_daily_summaries
      WHERE user_id = ? AND date >= ? AND date <= ? AND metric_code = 'sleep_quality'
      ORDER BY date ASC
    `)
    .bind(userId, startDate, endDate)
    .all();
  
  // Also check readiness factors for sleep quality
  const checkInResult = await db
    .prepare(`
      SELECT date, sleep_quality
      FROM user_check_ins
      WHERE user_id = ? AND date >= ? AND date <= ? AND completed = 1
      ORDER BY date ASC
    `)
    .bind(userId, startDate, endDate)
    .all();
  
  // Merge data sources
  const durationByDay = new Map<string, number | null>();
  const qualityByDay = new Map<string, number | null>();
  
  for (const row of durationResult.results) {
    durationByDay.set(row.date as string, row.value as number | null);
  }
  
  for (const row of qualityResult.results) {
    qualityByDay.set(row.date as string, row.value as number | null);
  }
  
  // Fill in from check-ins if no metric data
  for (const row of checkInResult.results) {
    if (!qualityByDay.has(row.date as string)) {
      qualityByDay.set(row.date as string, row.sleep_quality as number | null);
    }
  }
  
  const durationValues = Array.from(durationByDay.values()).filter((v): v is number => v !== null);
  const qualityValues = Array.from(qualityByDay.values()).filter((v): v is number => v !== null);
  
  const averageDuration = durationValues.length > 0
    ? roundTo(durationValues.reduce((a, b) => a + b, 0) / durationValues.length, 1)
    : null;
  
  const averageQuality = qualityValues.length > 0
    ? roundTo(qualityValues.reduce((a, b) => a + b, 0) / qualityValues.length, 1)
    : null;
  
  // Calculate consistency (standard deviation of bedtime/wake time would be ideal)
  // For now, use variance in duration as proxy
  let consistency: number | null = null;
  if (durationValues.length > 1) {
    const avg = durationValues.reduce((a, b) => a + b, 0) / durationValues.length;
    const variance = durationValues.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / durationValues.length;
    const stdDev = Math.sqrt(variance);
    // Lower std dev = more consistent
    consistency = roundTo(Math.max(0, 100 - stdDev * 10), 0);
  }
  
  // Target adherence (nights with 7+ hours)
  const targetAdherence = durationValues.length > 0
    ? roundTo((durationValues.filter(v => v >= 7).length / durationValues.length) * 100, 0)
    : null;
  
  return {
    averageDuration,
    averageQuality,
    durationByDay: Array.from(durationByDay.entries()).map(([date, hours]) => ({ date, hours })),
    qualityByDay: Array.from(qualityByDay.entries()).map(([date, quality]) => ({ date, quality })),
    consistency,
    targetAdherence,
    dataAvailable: durationValues.length > 0 || qualityValues.length > 0,
  };
}

/**
 * Aggregate nutrition data
 */
async function aggregateNutritionData(
  db: D1Database,
  userId: string,
  startDate: string,
  endDate: string
): Promise<NutritionSummary> {
  // Get nutrition targets
  const targetsResult = await db
    .prepare(`
      SELECT targets FROM nutrition_targets
      WHERE user_id = ? AND is_active = 1
      LIMIT 1
    `)
    .bind(userId)
    .first();
  
  const targets = targetsResult ? JSON.parse(targetsResult.targets as string) : null;
  const targetCalories = targets?.caloriesKcal ?? null;
  const targetProtein = targets?.proteinG ?? null;
  const targetCarbs = targets?.carbsG ?? null;
  const targetFat = targets?.fatG ?? null;
  
  // Get daily nutrition summaries
  const summaryResult = await db
    .prepare(`
      SELECT date, total_nutrition, meal_count
      FROM daily_nutrition_summaries
      WHERE user_id = ? AND date >= ? AND date <= ?
      ORDER BY date ASC
    `)
    .bind(userId, startDate, endDate)
    .all();
  
  const calorieByDay: Array<{ date: string; consumed: number | null; target: number | null }> = [];
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let daysWithData = 0;
  let mealCount = 0;
  
  for (const row of summaryResult.results) {
    const nutrition = JSON.parse(row.total_nutrition as string);
    const calories = nutrition.caloriesKcal ?? null;
    const protein = nutrition.proteinG ?? 0;
    const carbs = nutrition.carbsG ?? 0;
    const fat = nutrition.fatG ?? 0;
    
    calorieByDay.push({
      date: row.date as string,
      consumed: calories,
      target: targetCalories,
    });
    
    if (calories !== null) {
      totalCalories += calories;
      totalProtein += protein;
      totalCarbs += carbs;
      totalFat += fat;
      daysWithData++;
    }
    
    mealCount += (row.meal_count as number) || 0;
  }
  
  const averageCalories = daysWithData > 0 ? roundTo(totalCalories / daysWithData, 0) : null;
  
  const proteinAdherence = targetProtein && daysWithData > 0
    ? roundTo((totalProtein / daysWithData / targetProtein) * 100, 0)
    : null;
  
  const carbsAdherence = targetCarbs && daysWithData > 0
    ? roundTo((totalCarbs / daysWithData / targetCarbs) * 100, 0)
    : null;
  
  const fatAdherence = targetFat && daysWithData > 0
    ? roundTo((totalFat / daysWithData / targetFat) * 100, 0)
    : null;
  
  return {
    averageCalories,
    targetCalories,
    calorieByDay,
    protein: { average: daysWithData > 0 ? roundTo(totalProtein / daysWithData, 0) : null, target: targetProtein, adherence: proteinAdherence },
    carbs: { average: daysWithData > 0 ? roundTo(totalCarbs / daysWithData, 0) : null, target: targetCarbs, adherence: carbsAdherence },
    fat: { average: daysWithData > 0 ? roundTo(totalFat / daysWithData, 0) : null, target: targetFat, adherence: fatAdherence },
    mealCount,
    daysWithData,
    dataAvailable: daysWithData > 0,
  };
}

/**
 * Aggregate hydration data
 */
async function aggregateHydrationData(
  db: D1Database,
  userId: string,
  startDate: string,
  endDate: string
): Promise<HydrationSummary> {
  // Get hydration targets
  const targetsResult = await db
    .prepare(`
      SELECT hydration_ml_target FROM user_health_targets
      WHERE user_id = ?
    `)
    .bind(userId)
    .first();
  
  const targetMl = (targetsResult?.hydration_ml_target as number) || 2000;
  
  // Get hydration entries
  const result = await db
    .prepare(`
      SELECT date, SUM(amount_ml) as total_ml
      FROM hydration_entries
      WHERE user_id = ? AND date >= ? AND date <= ?
      GROUP BY date
      ORDER BY date ASC
    `)
    .bind(userId, startDate, endDate)
    .all();
  
  // Also check daily summaries for hydration
  const summaryResult = await db
    .prepare(`
      SELECT date, value
      FROM health_metric_daily_summaries
      WHERE user_id = ? AND date >= ? AND date <= ? AND metric_code = 'hydration'
      ORDER BY date ASC
    `)
    .bind(userId, startDate, endDate)
    .all();
  
  // Merge data
  const byDay = new Map<string, number | null>();
  
  for (const row of result.results) {
    byDay.set(row.date as string, row.total_ml as number);
  }
  
  for (const row of summaryResult.results) {
    if (!byDay.has(row.date as string)) {
      byDay.set(row.date as string, row.value as number | null);
    }
  }
  
  const values = Array.from(byDay.values()).filter((v): v is number => v !== null);
  const averageMl = values.length > 0
    ? roundTo(values.reduce((a, b) => a + b, 0) / values.length, 0)
    : null;
  
  const adherence = targetMl && values.length > 0
    ? roundTo((values.filter(v => v >= targetMl).length / values.length) * 100, 0)
    : null;
  
  return {
    averageMl,
    targetMl,
    byDay: Array.from(byDay.entries()).map(([date, ml]) => ({ date, ml, target: targetMl })),
    adherence,
    dataAvailable: values.length > 0,
  };
}

/**
 * Aggregate fitness/workout data
 */
async function aggregateFitnessData(
  db: D1Database,
  userId: string,
  startDate: string,
  endDate: string
): Promise<FitnessSummary> {
  // Get workout summaries
  const summaryResult = await db
    .prepare(`
      SELECT 
        DATE(completed_at, 'unixepoch') as date,
        completed_sets,
        total_sets,
        duration_ms,
        overall_quality_score,
        completion_percentage
      FROM workout_summaries
      WHERE user_id = ? 
        AND completed_at >= ? 
        AND completed_at <= ?
      ORDER BY completed_at ASC
    `)
    .bind(userId, Math.floor(new Date(startDate).getTime() / 1000), Math.floor(new Date(endDate).getTime() / 1000))
    .all();
  
  // Get planned workouts (sessions with status 'planned')
  const plannedResult = await db
    .prepare(`
      SELECT COUNT(*) as count
      FROM workout_sessions
      WHERE user_id = ? 
        AND created_at >= ? 
        AND created_at <= ?
        AND status IN ('planned', 'in_progress', 'completed')
    `)
    .bind(userId, Math.floor(new Date(startDate).getTime() / 1000), Math.floor(new Date(endDate).getTime() / 1000))
    .first();
  
  const completedWorkouts = summaryResult.results.length;
  const plannedWorkouts = (plannedResult?.count as number) || completedWorkouts;
  
  let totalDuration = 0;
  let qualityScores: number[] = [];
  
  for (const row of summaryResult.results) {
    if (row.duration_ms) {
      totalDuration += (row.duration_ms as number) / 60000; // Convert to minutes
    }
    if (row.overall_quality_score) {
      qualityScores.push(row.overall_quality_score as number);
    }
  }
  
  const averageDuration = completedWorkouts > 0 ? roundTo(totalDuration / completedWorkouts, 0) : null;
  
  const formQualityTrend = calculateTrend(qualityScores);
  
  const trainingVolume = summaryResult.results.map(row => ({
    date: row.date as string,
    volume: (row.completed_sets as number) || 0,
  }));
  
  return {
    completedWorkouts,
    plannedWorkouts,
    workoutDuration: {
      total: roundTo(totalDuration, 0),
      average: averageDuration,
    },
    trainingVolume,
    exerciseProgression: {}, // Would need exercise-specific data
    formQualityTrend,
    formQualityScores: qualityScores.length > 0
      ? summaryResult.results.map(row => ({
          date: row.date as string,
          score: row.overall_quality_score as number,
        }))
      : [],
    recoveryDays: 0, // Would need recovery-specific tracking
    dataAvailable: completedWorkouts > 0 || plannedWorkouts > 0,
  };
}

/**
 * Aggregate activity data
 */
async function aggregateActivityData(
  db: D1Database,
  userId: string,
  startDate: string,
  endDate: string
): Promise<ActivitySummary> {
  // Get steps from health metrics
  const stepsResult = await db
    .prepare(`
      SELECT date, value, target
      FROM health_metric_daily_summaries
      WHERE user_id = ? AND date >= ? AND date <= ? AND metric_code = 'steps'
      ORDER BY date ASC
    `)
    .bind(userId, startDate, endDate)
    .all();
  
  // Get targets
  const targetsResult = await db
    .prepare(`
      SELECT steps_target, active_minutes_target FROM user_health_targets
      WHERE user_id = ?
    `)
    .bind(userId)
    .first();
  
  const stepsTarget = (targetsResult?.steps_target as number) || 10000;
  const activeMinutesTarget = (targetsResult?.active_minutes_target as number) || 30;
  
  const stepsByDay = stepsResult.results.map(row => ({
    date: row.date as string,
    steps: row.value as number | null,
  }));
  
  const stepsValues = stepsByDay
    .map(s => s.steps)
    .filter((v): v is number => v !== null);
  
  const averageSteps = stepsValues.length > 0
    ? Math.round(stepsValues.reduce((a, b) => a + b, 0) / stepsValues.length)
    : null;
  
  const activeDays = stepsValues.filter(s => s >= stepsTarget).length;
  
  return {
    averageSteps,
    stepsByDay,
    activeDays,
    totalDays: stepsByDay.length,
    activeMinutes: null, // Would need separate query
    trends: {
      steps: calculateTrend(stepsValues),
    },
    dataAvailable: stepsValues.length > 0,
  };
}

/**
 * Aggregate body metrics
 */
async function aggregateBodyMetricsData(
  db: D1Database,
  userId: string,
  startDate: string,
  endDate: string
): Promise<BodyMetricsSummary> {
  // Get weight data
  const weightResult = await db
    .prepare(`
      SELECT date, value
      FROM health_metric_daily_summaries
      WHERE user_id = ? AND date >= ? AND date <= ? AND metric_code = 'weight'
      ORDER BY date ASC
    `)
    .bind(userId, startDate, endDate)
    .all();
  
  // Get body fat data
  const bodyFatResult = await db
    .prepare(`
      SELECT date, value
      FROM health_metric_daily_summaries
      WHERE user_id = ? AND date >= ? AND date <= ? AND metric_code = 'body_fat'
      ORDER BY date ASC
    `)
    .bind(userId, startDate, endDate)
    .all();
  
  const byDay = new Map<string, { weight: number | null; bodyFat: number | null }>();
  
  for (const row of weightResult.results) {
    byDay.set(row.date as string, { weight: row.value as number | null, bodyFat: null });
  }
  
  for (const row of bodyFatResult.results) {
    const existing = byDay.get(row.date as string) || { weight: null, bodyFat: null };
    existing.bodyFat = row.value as number | null;
    byDay.set(row.date as string, existing);
  }
  
  const weights = weightResult.results.map(r => r.value as number);
  const bodyFats = bodyFatResult.results.map(r => r.value as number);
  
  const latestWeight = weights.length > 0 ? weights[weights.length - 1] : null;
  const startWeight = weights.length > 0 ? weights[0] : null;
  const weightChange = latestWeight && startWeight ? roundTo(latestWeight - startWeight, 1) : null;
  
  const latestBodyFat = bodyFats.length > 0 ? bodyFats[bodyFats.length - 1] : null;
  const startBodyFat = bodyFats.length > 0 ? bodyFats[0] : null;
  const bodyFatChange = latestBodyFat && startBodyFat ? roundTo(latestBodyFat - startBodyFat, 1) : null;
  
  return {
    weight: {
      latest: latestWeight,
      start: startWeight,
      change: weightChange,
      unit: 'kg',
    },
    bodyFat: {
      latest: latestBodyFat,
      start: startBodyFat,
      change: bodyFatChange,
    },
    byDay: Array.from(byDay.entries()).map(([date, metrics]) => ({
      date,
      weight: metrics.weight,
      bodyFat: metrics.bodyFat,
    })),
    dataAvailable: weights.length > 0,
  };
}

/**
 * Aggregate habits data
 */
async function aggregateHabitsData(
  db: D1Database,
  userId: string,
  startDate: string,
  endDate: string
): Promise<HabitsSummary> {
  // Get user's habits
  const habitsResult = await db
    .prepare(`
      SELECT id, name FROM user_habits
      WHERE user_id = ? AND is_active = 1
    `)
    .bind(userId)
    .all();
  
  if (habitsResult.results.length === 0) {
    return {
      overallCompletion: null,
      byHabit: [],
      consistency: null,
      dataAvailable: false,
    };
  }
  
  // Get completions for the period
  const completionsResult = await db
    .prepare(`
      SELECT habit_id, COUNT(*) as completed_days
      FROM daily_habit_completions
      WHERE user_id = ? AND date >= ? AND date <= ? AND completed = 1
      GROUP BY habit_id
    `)
    .bind(userId, startDate, endDate)
    .all();
  
  const completionsMap = new Map<string, number>();
  for (const row of completionsResult.results) {
    completionsMap.set(row.habit_id as string, row.completed_days as number);
  }
  
  // Calculate total days in period
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  const byHabit = habitsResult.results.map(row => {
    const completedDays = completionsMap.get(row.id as string) || 0;
    const completionRate = roundTo((completedDays / totalDays) * 100, 0);
    return {
      name: row.name as string,
      completionRate,
      streak: 0, // Would need streak calculation
    };
  });
  
  const totalCompletions = Array.from(completionsMap.values()).reduce((a, b) => a + b, 0);
  const overallCompletion = totalDays > 0
    ? roundTo((totalCompletions / (byHabit.length * totalDays)) * 100, 0)
    : null;
  
  return {
    overallCompletion,
    byHabit,
    consistency: overallCompletion, // Simplified
    dataAvailable: true,
  };
}

/**
 * Aggregate goals data
 */
async function aggregateGoalsData(
  db: D1Database,
  userId: string
): Promise<GoalsSummary> {
  // Get user's health targets as goals
  const targetsResult = await db
    .prepare(`
      SELECT * FROM user_health_targets
      WHERE user_id = ?
    `)
    .bind(userId)
    .first();
  
  if (!targetsResult) {
    return {
      current: [],
      milestones: [],
      adherence: null,
      dataAvailable: false,
    };
  }
  
  const current: GoalsSummary['current'] = [];
  
  if (targetsResult.primary_goal) {
    current.push({
      type: 'primary_goal',
      description: String(targetsResult.primary_goal),
      target: 100,
      current: 0,
      progress: 0,
    });
  }
  
  if (targetsResult.weight_target) {
    current.push({
      type: 'weight',
      description: 'Weight target',
      target: targetsResult.weight_target as number,
      current: 0,
      progress: 0,
    });
  }
  
  return {
    current,
    milestones: [],
    adherence: null,
    dataAvailable: current.length > 0,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate trend from numeric values
 */
function calculateTrend(values: number[]): 'improving' | 'stable' | 'declining' | null {
  if (values.length < 3) return null;
  
  const third = Math.max(1, Math.floor(values.length / 3));
  const early = values.slice(0, third);
  const late = values.slice(-third);
  
  const earlyAvg = early.reduce((a, b) => a + b, 0) / early.length;
  const lateAvg = late.reduce((a, b) => a + b, 0) / late.length;
  
  const change = earlyAvg !== 0 ? ((lateAvg - earlyAvg) / earlyAvg) * 100 : 0;
  
  if (change > 5) return 'improving';
  if (change < -5) return 'declining';
  return 'stable';
}

/**
 * Calculate overall data completeness
 */
function calculateDataCompleteness(data: {
  readiness: { dataAvailable: boolean };
  sleep: { dataAvailable: boolean };
  nutrition: { dataAvailable: boolean };
  hydration: { dataAvailable: boolean };
  fitness: { dataAvailable: boolean };
  activity: { dataAvailable: boolean };
  habits: { dataAvailable: boolean };
  goals: { dataAvailable: boolean };
}): DataCompleteness {
  const available = [
    data.readiness.dataAvailable,
    data.sleep.dataAvailable,
    data.nutrition.dataAvailable,
    data.hydration.dataAvailable,
    data.fitness.dataAvailable,
    data.activity.dataAvailable,
    data.habits.dataAvailable,
    data.goals.dataAvailable,
  ].filter(Boolean).length;
  
  if (available >= 5) return 'full';
  if (available >= 2) return 'partial';
  return 'minimal';
}
