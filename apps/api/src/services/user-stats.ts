/**
 * User Stats Aggregation Service
 *
 * Aggregates workout, gamification, and body data into UserStats structure
 * for infographic generation.
 */

import {
  and,
  desc,
  eq,
  gte,
  lte,
  sql,
} from "drizzle-orm";
import type { UserStats, WorkoutType, MuscleDevelopment, MuscleGroup } from "@aivo/shared-types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Using any to bypass Drizzle type issues in Workers environment
type DB = any;

// Define intermediate types inline
interface WorkoutStats {
  count: number;
  totalMinutes: number;
  totalCalories: number;
  avgDuration: number;
  types: Record<WorkoutType, number>;
  personalRecords: PersonalRecord[];
}

interface StrengthStats {
  totalVolume: number;
  topExercises: Array<{ name: string; volume: number }>;
  estimatedOneRMs: Record<string, number>;
}

interface GamificationStats {
  streak: number;
  longestStreak: number;
  points: number;
  level: number;
  badges: number;
  leaderboardRank?: number;
  percentile?: number;
}

interface BodyStats {
  weightChange?: number;
  bodyFatChange?: number;
  muscleGain?: number;
  bmi?: number;
  healthScore?: number;
  muscleDevelopment?: MuscleDevelopment[];
}

interface Comparisons {
  vsAverage: Record<string, number>;
  personalBests: Array<{ metric: string; improvement: number }>;
}

interface PersonalRecord {
  exercise: string;
  weight: number;
  reps: number;
  date: string;
  previous?: number;
  improvementPercent?: number;
}

/**
 * Aggregate user statistics for infographic generation
 *
 * @param db - Drizzle database instance
 * @param userId - User ID
 * @param period - Time period (weekly, monthly, or all_time)
 * @returns UserStats object
 */
export async function aggregateUserStats(
  db: DB,
  userId: string,
  period: { type: "weekly" | "monthly" | "all_time"; start: string; end?: string }
): Promise<UserStats> {
  // Calculate date range
  const { startDate, endDate } = calculateDateRange(period);

  // Fetch completed workouts in period
  const workouts = await fetchWorkoutsInPeriod(db, userId, startDate, endDate);

  // Calculate workout stats
  const workoutStats = calculateWorkoutStats(workouts);

  // Calculate strength stats from workout exercises
  const strengthStats = await calculateStrengthStats(workouts);

  // Fetch gamification profile
  const gamificationStats = await fetchGamificationStats(db, userId);

  // Fetch body metrics for changes
  const bodyStats = await calculateBodyStats(db, userId, startDate, endDate);

  // Generate comparisons
  const comparisons = await generateComparisons(db, userId, period, workoutStats);

  return {
    period: {
      startDate,
      endDate,
      type: period.type,
    },
    workouts: workoutStats,
    strength: strengthStats,
    gamification: gamificationStats,
    body: bodyStats,
    comparisons,
  };
}

/**
 * Calculate date range from period specification
 */
function calculateDateRange(
  period: { type: "weekly" | "monthly" | "all_time"; start: string; end?: string }
): { startDate: string; endDate: string } {
  const end = period.end || new Date().toISOString().split("T")[0];
  const start = period.start;

  return {
    startDate: start,
    endDate: end,
  };
}

/**
 * Fetch workouts in date range
 */
async function fetchWorkoutsInPeriod(
  db: DB,
  userId: string,
  startDate: string,
  endDate: string
) {
  const startTime = new Date(startDate).getTime() / 1000;
  const endTime = new Date(endDate).getTime() / 1000;

  return await db.query.workouts.findMany({
    where: and(
      eq(db.workouts.userId, userId),
      eq(db.workouts.status, "completed"),
      gte(db.workouts.startTime, startTime),
      lte(db.workouts.endTime, endTime)
    ),
    orderBy: desc(db.workouts.startTime),
  });
}

/**
 * Calculate workout statistics from workout array
 */
function calculateWorkoutStats(workouts: Array<{
  id: string;
  duration: number;
  caloriesBurned: number | null;
  startTime: number;
  endTime: number;
  type: string | null;
  exercises?: Array<{ name: string; sets: number; reps: number; weight: number }>;
}>): WorkoutStats {
  const count = workouts.length;
  const totalMinutes = workouts.reduce((sum, w) => sum + w.duration, 0);
  const totalCalories = workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
  const avgDuration = count > 0 ? totalMinutes / count : 0;

  // Aggregate by workout type
  const types: Record<WorkoutType, number> = {
    strength: 0,
    cardio: 0,
    hiit: 0,
    yoga: 0,
    running: 0,
    cycling: 0,
    swimming: 0,
    pilates: 0,
    mobility: 0,
    sports: 0,
    other: 0,
  };

  workouts.forEach(w => {
    const type = (w.type as WorkoutType) || "other";
    if (types[type] !== undefined) {
      types[type]++;
    } else {
      types.other++;
    }
  });

  // Find personal records
  const personalRecords = calculatePersonalRecords(workouts);

  return {
    count,
    totalMinutes,
    totalCalories,
    avgDuration,
    types,
    personalRecords,
  };
}

/**
 * Calculate personal records from workouts
 */
function calculatePersonalRecords(
  workouts: Array<{ startTime: number; exercises?: Array<{ name: string; weight: number; reps: number }> }>
): PersonalRecord[] {
  const prs: Map<string, { weight: number; reps: number; date: string }> = new Map();

  workouts.forEach(workout => {
    if (!workout.exercises) {return;}

    workout.exercises.forEach(ex => {
      const key = ex.name.toLowerCase();
      const currentPR = prs.get(key);

      // Simple 1RM estimate using Epley formula
      const estimated1RM = ex.weight * (1 + ex.reps / 30);

      if (!currentPR || estimated1RM > currentPR.weight) {
        prs.set(key, {
          weight: estimated1RM,
          reps: ex.reps,
          date: new Date(workout.startTime * 1000).toISOString().split("T")[0],
        });
      }
    });
  });

  return Array.from(prs.entries()).map(([exercise, data]) => ({
    exercise: exercise.charAt(0).toUpperCase() + exercise.slice(1),
    weight: data.weight,
    reps: data.reps,
    date: data.date,
  }));
}

/**
 * Calculate strength statistics from workouts
 */
async function calculateStrengthStats(
  workouts: Array<{ id: string; startTime: number; exercises?: Array<{ name: string; sets: number; reps: number; weight: number }> }>
): Promise<StrengthStats> {
  let totalVolume = 0;
  const exerciseVolumes: Map<string, number> = new Map();
  const estimatedOneRMs: Map<string, number> = new Map();

  workouts.forEach(workout => {
    if (!workout.exercises) {return;}

    workout.exercises.forEach(ex => {
      const volume = ex.weight * ex.reps * ex.sets;
      totalVolume += volume;

      const currentVolume = exerciseVolumes.get(ex.name) || 0;
      exerciseVolumes.set(ex.name, currentVolume + volume);

      // Track best 1RM estimate
      const estimated1RM = ex.weight * (1 + ex.reps / 30);
      const currentBest = estimatedOneRMs.get(ex.name) || 0;
      if (estimated1RM > currentBest) {
        estimatedOneRMs.set(ex.name, estimated1RM);
      }
    });
  });

  // Get top exercises by volume
  const topExercises: { name: string; volume: number }[] = Array.from(exerciseVolumes.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, volume]) => ({ name, volume }));

  return {
    totalVolume,
    topExercises,
    estimatedOneRMs: Object.fromEntries(estimatedOneRMs),
  };
}

/**
 * Fetch gamification statistics
 */
async function fetchGamificationStats(db: DB, userId: string): Promise<GamificationStats> {
  const profile = await db.query.gamificationProfiles.findFirst({
    where: eq(db.gamificationProfiles.userId, userId),
  });

  if (!profile) {
    return {
      streak: 0,
      longestStreak: 0,
      points: 0,
      level: 1,
      badges: 0,
    };
  }

  // Count badges
  const badgeCount = await db.query.badges.count({
    where: eq(db.badges.userId, userId),
  });

  const totalUsers = await getTotalUserCount(db);

  return {
    streak: profile.streakCurrent,
    longestStreak: profile.streakLongest,
    points: profile.totalPoints,
    level: profile.level,
    badges: badgeCount,
    leaderboardRank: profile.leaderboardPosition,
    percentile: profile.leaderboardPosition
      ? ((profile.leaderboardPosition / totalUsers) * 100)
      : undefined,
  };
}

/**
 * Calculate body statistics and changes
 */
async function calculateBodyStats(
  db: DB,
  userId: string,
  startDate: string,
  endDate: string
): Promise<BodyStats> {
  // Fetch body metrics in period (most recent first)
  const metrics = await db.query.bodyMetrics.findMany({
    where: and(
      eq(db.bodyMetrics.userId, userId),
      gte(db.bodyMetrics.timestamp, new Date(startDate).getTime()),
      lte(db.bodyMetrics.timestamp, new Date(endDate).getTime() + 86400000)
    ),
    orderBy: desc(db.bodyMetrics.timestamp),
    limit: 50,
  });

  if (metrics.length === 0) {
    return {
      weightChange: undefined,
      bodyFatChange: undefined,
      muscleGain: undefined,
      bmi: undefined,
      healthScore: undefined,
      muscleDevelopment: undefined,
    };
  }

  const latest = metrics[0];
  const oldest = metrics[metrics.length - 1];

  // Calculate changes
  const weightChange = latest.weight && oldest.weight
    ? latest.weight - oldest.weight
    : undefined;

  const bodyFatChange = latest.bodyFatPercentage && oldest.bodyFatPercentage
    ? latest.bodyFatPercentage - oldest.bodyFatPercentage
    : undefined;

  const muscleGain = latest.muscleMass && oldest.muscleMass
    ? latest.muscleMass - oldest.muscleMass
    : undefined;

  // Get muscle development data (from body insights if available)
  const muscleDevelopment = await fetchMuscleDevelopment(db, userId);

  return {
    weightChange,
    bodyFatChange,
    muscleGain,
    bmi: latest.bmi,
    healthScore: undefined, // Would require health score calculation
    muscleDevelopment,
  };
}

/**
 * Fetch muscle development data from body insights/vision analyses
 */
async function fetchMuscleDevelopment(db: DB, userId: string): Promise<MuscleDevelopment[] | undefined> {
  // Check if we have vision analyses with muscle development data
  const analyses = await db.query.visionAnalyses.findMany({
    where: and(
      eq(db.visionAnalyses.userId, userId),
      // Filter for recent analyses (last 30 days)
      gte(db.visionAnalyses.createdAt, Math.floor(Date.now() / 1000) - 30 * 86400)
    ),
    orderBy: desc(db.visionAnalyses.createdAt),
    limit: 1,
  });

  if (analyses.length === 0) {
    return undefined;
  }

  const latestAnalysis = analyses[0];
  try {
    const analysis = JSON.parse(latestAnalysis.analysis);

    // Extract muscle development from analysis
    const muscleDev = analysis.muscleDevelopment as Array<{
      group: string;
      score: number;
      percentile: number;
    }>;

    if (muscleDev && Array.isArray(muscleDev)) {
      return muscleDev.map(m => ({
        group: m.group as MuscleGroup,
        score: m.score,
        percentile: m.percentile || 50,
      }));
    }
  } catch {
    // Analysis format not as expected
  }

  return undefined;
}

/**
 * Generate comparison data (vs average, personal bests)
 */
async function generateComparisons(
  db: DB,
  userId: string,
  period: { type: string; start: string; end?: string },
  workoutStats: WorkoutStats
): Promise<Comparisons> {
  // For now, return empty comparisons
  // In production, this would:
  // - Query platform averages for users with similar profile
  // - Calculate percentile rankings
  // - Compare to previous periods

  return {
    vsAverage: {},
    personalBests: workoutStats.personalRecords.map(pr => ({
      metric: pr.exercise,
      improvement: pr.improvementPercent || 0,
    })),
  };
}

/**
 * Get total user count (for percentile calculation)
 * In production, this would be cached
 */
async function getTotalUserCount(db: DB): Promise<number> {
  const result = await db.execute(
    sql`SELECT COUNT(*) as count FROM users`
  );
  return result.count || 0;
}

/**
 * Generate R2 key for infographic image
 */
export function generateInfographicR2Key(
  userId: string,
  infographicId: string,
  format: "svg" | "png"
): string {
  const timestamp = Math.floor(Date.now() / 1000);
  return `infographics/${userId}/${format}/${infographicId}-${timestamp}.${format}`;
}

// Export for testing
export {
  calculateDateRange,
  fetchWorkoutsInPeriod,
  calculateWorkoutStats,
  calculatePersonalRecords,
  fetchGamificationStats,
  calculateBodyStats,
  generateComparisons,
};
