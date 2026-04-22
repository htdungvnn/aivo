import { Hono } from "hono";
import { z } from "zod";
import { createDrizzleInstance } from "@aivo/db";
import { ExcelGenerator, generateJSON } from "@aivo/excel-export";
import type { D1Database } from "drizzle-orm/d1";
import type { Body } from "hono";
// Import Drizzle tables for runtime (needed for queries and typeof)
import type {
  users,
  workouts,
  workoutExercises,
  dailySchedules,
  bodyMetrics,
  bodyHeatmaps,
  visionAnalyses,
  conversations,
  aiRecommendations,
  badges,
  achievements,
  socialProofCards,
  activityEvents} from "@aivo/db";
import {
  gamificationProfiles
} from "@aivo/db";

// Type imports for row data interfaces (optional, but helpful)
import type {
  User,
  Workout,
  DailySchedule,
  ScheduledWorkout,
  BodyMetric,
  BodyHeatmapData,
  VisionAnalysis,
  Conversation,
  AIRecommendation,
  GamificationProfile,
  Badge,
  Achievement,
  SocialProofCard,
  ActivityEvent,
  WorkoutExercise as SharedWorkoutExercise,
  UserGoal,
} from "@aivo/shared-types";

// Type aliases for Drizzle row types
type UserRow = typeof users.$TypedSelect;
type WorkoutRow = typeof workouts.$TypedSelect;
type WorkoutExerciseRow = typeof workoutExercises.$TypedSelect;
type DailyScheduleRow = typeof dailySchedules.$TypedSelect;
type BodyMetricRow = typeof bodyMetrics.$TypedSelect;
type BodyHeatmapRow = typeof bodyHeatmaps.$TypedSelect;
type VisionAnalysisRow = typeof visionAnalyses.$TypedSelect;
type ConversationRow = typeof conversations.$TypedSelect;
type AIRecommendationRow = typeof aiRecommendations.$TypedSelect;
type BadgeRow = typeof badges.$TypedSelect;
type AchievementRow = typeof achievements.$TypedSelect;
type SocialProofCardRow = typeof socialProofCards.$TypedSelect;
type ActivityEventRow = typeof activityEvents.$TypedSelect;

interface EnvWithR2 {
  DB: D1Database;
}

type ExportFormat = "xlsx" | "csv" | "json";

const ExportQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  format: z.enum(["xlsx", "csv", "json"]).default("xlsx"),
});

// Helper: Convert Unix timestamp (seconds) to Date
const toDate = (timestamp: number | null | undefined): Date | undefined => {
  if (timestamp === null || timestamp === undefined) { return undefined; }
  return new Date(timestamp * 1000);
};

// Helper: Parse JSON string safely
const parseJson = <T>(str: string | null | undefined, fallback: T): T => {
  if (str === null || str === undefined) { return fallback; }
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
};

// Helper: Convert integer flag to boolean
const toBool = (val: number | null | undefined): boolean => {
  if (val === null || val === undefined) { return false; }
  return val === 1;
};

// Transform DB row to User
const transformUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  name: row.name,
  age: row.age ?? undefined,
  gender: row.gender ?? undefined,
  height: row.height ?? undefined,
  weight: row.weight ?? undefined,
  restingHeartRate: row.resting_heart_rate ?? undefined,
  maxHeartRate: row.max_heart_rate ?? undefined,
  fitnessLevel: row.fitness_level ?? undefined,
  goals: row.goals ? (parseJson<string[]>(row.goals, []) as UserGoal[]) : undefined,
  picture: row.picture ?? undefined,
  createdAt: toDate(row.created_at)!,
  updatedAt: toDate(row.updated_at)!,
});

// Transform DB row to Workout (exercises added separately)
const transformWorkout = (row: WorkoutRow): Workout => ({
  id: row.id,
  userId: row.user_id,
  type: row.type,
  name: row.name ?? undefined,
  duration: row.duration,
  caloriesBurned: row.calories_burned ?? undefined,
  startTime: toDate(row.start_time)!,
  endTime: toDate(row.end_time)!,
  notes: row.notes ?? undefined,
  metrics: row.metrics ? parseJson(row.metrics, {}) : undefined,
  exercises: undefined,
  createdAt: toDate(row.created_at)!,
  completedAt: row.completed_at ? toDate(row.completed_at) : undefined,
  status: row.status,
});

// Transform DB row to WorkoutExercise
const transformWorkoutExercise = (row: WorkoutExerciseRow): SharedWorkoutExercise => ({
  id: row.id,
  workoutId: row.workout_id,
  name: row.name,
  sets: row.sets,
  reps: row.reps,
  weight: row.weight ?? undefined,
  restTime: row.rest_time ?? undefined,
  notes: row.notes ?? undefined,
  order: row.order,
  rpe: row.rpe ?? undefined,
});

// Transform DB row to ScheduledWorkout (from daily_schedules with joined workout)
const transformScheduledWorkout = (schedule: DailyScheduleRow, workout: WorkoutRow | null): ScheduledWorkout => {
  if (!workout) {
    return {
      workoutId: schedule.workout_id ?? undefined,
      templateId: undefined,
      customName: "Untitled",
      type: schedule.type ?? "other",
      duration: schedule.duration ?? 0,
      estimatedCalories: schedule.estimated_calories ?? 0,
      exercises: [],
      notes: undefined,
    };
  }
  return {
    workoutId: workout.id,
    templateId: undefined,
    customName: workout.name ?? (workout.type as string),
    type: workout.type,
    duration: workout.duration,
    estimatedCalories: workout.calories_burned ?? 0,
    exercises: [],
    notes: workout.notes ?? undefined,
  };
};

// Transform DB row to DailySchedule
const transformDailySchedule = (row: DailyScheduleRow, workout: WorkoutRow | null = null): DailySchedule => ({
  id: row.id,
  userId: row.user_id,
  date: row.date,
  workout: row.workout_id ? transformScheduledWorkout(row, workout) : undefined,
  recoveryTasks: parseJson(row.recovery_tasks, []),
  nutritionGoals: parseJson(row.nutrition_goals, []),
  sleepGoal: parseJson(row.sleep_goal, undefined),
  generatedBy: row.generated_by as string,
  optimizationScore: row.optimization_score ?? undefined,
  adjustmentsMade: parseJson(row.adjustments_made, []),
});

// Transform DB row to BodyMetric
const transformBodyMetric = (row: BodyMetricRow): BodyMetric => ({
  id: row.id,
  userId: row.user_id,
  timestamp: row.timestamp * 1000,
  weight: row.weight ?? undefined,
  bodyFatPercentage: row.body_fat_percentage ?? undefined,
  muscleMass: row.muscle_mass ?? undefined,
  boneMass: row.bone_mass ?? undefined,
  waterPercentage: row.water_percentage ?? undefined,
  bmi: row.bmi ?? undefined,
  waistCircumference: row.waist_circumference ?? undefined,
  chestCircumference: row.chest_circumference ?? undefined,
  hipCircumference: row.hip_circumference ?? undefined,
  source: row.source ?? undefined,
  notes: row.notes ?? undefined,
});

// Transform DB row to BodyHeatmapData
const transformBodyHeatmap = (row: BodyHeatmapRow): BodyHeatmapData => ({
  id: row.id,
  userId: row.user_id,
  timestamp: row.timestamp * 1000,
  imageUrl: row.image_url ?? undefined,
  vectorData: parseJson(row.vector_data, []),
  metadata: parseJson(row.metadata, undefined),
});

// Transform DB row to VisionAnalysis
const transformVisionAnalysis = (row: VisionAnalysisRow): VisionAnalysis => ({
  id: row.id,
  userId: row.user_id,
  imageUrl: row.image_url,
  processedUrl: row.processed_url ?? undefined,
  analysis: parseJson(row.analysis, { muscleDevelopment: [], riskFactors: [] }),
  confidence: row.confidence ?? 0,
  createdAt: row.created_at * 1000,
});

// Transform DB row to Conversation
const transformConversation = (row: ConversationRow): Conversation => ({
  id: row.id,
  userId: row.user_id,
  message: row.message,
  response: row.response,
  context: row.context ? (parseJson<string[]>(row.context, []) as string[]) : undefined,
  tokensUsed: row.tokens_used,
  model: row.model ?? undefined,
  createdAt: toDate(row.created_at)!,
});

// Transform DB row to AIRecommendation
const transformAIRecommendation = (row: AIRecommendationRow): AIRecommendation => ({
  id: row.id,
  userId: row.user_id,
  type: row.type,
  title: row.title,
  description: row.description,
  confidence: row.confidence ?? 0,
  reasoning: row.reasoning ?? undefined,
  actions: parseJson(row.actions, []),
  expiresAt: row.expires_at ? toDate(row.expires_at) : undefined,
  isRead: toBool(row.is_read),
  isDismissed: toBool(row.is_dismissed),
  feedback: row.feedback ? (parseJson(row.feedback, {}) as Record<string, unknown>) : undefined,
  createdAt: toDate(row.created_at)!,
});

// Transform DB row to Badge
const transformBadge = (row: BadgeRow): Badge => ({
  id: row.id,
  type: row.type as string,
  name: row.name,
  description: row.description,
  icon: row.icon,
  earnedAt: toDate(row.earned_at)!,
  tier: row.tier as string,
});

// Transform DB row to Achievement
const transformAchievement = (row: AchievementRow): Achievement => ({
  id: row.id,
  userId: row.user_id,
  type: row.type as string,
  progress: row.progress ?? 0,
  target: row.target,
  reward: row.reward,
  completed: toBool(row.completed),
  completedAt: row.completed_at ? toDate(row.completed_at) : undefined,
  claimed: toBool(row.claimed),
});

// Transform DB row to SocialProofCard
const transformSocialProofCard = (row: SocialProofCardRow): SocialProofCard => ({
  id: row.id,
  userId: row.user_id,
  type: row.type as string,
  title: row.title,
  subtitle: row.subtitle ?? "",
  data: parseJson(row.data, { value: 0, label: "", icon: "", color: "" }),
  shareableImageUrl: row.shareable_image_url ?? undefined,
  createdAt: toDate(row.created_at)!,
  isPublic: toBool(row.is_public),
});

// Transform DB row to ActivityEvent
const transformActivityEvent = (row: ActivityEventRow): ActivityEvent => ({
  id: row.id,
  userId: row.user_id,
  workoutId: row.workout_id ?? undefined,
  type: row.type as string,
  payload: parseJson(row.payload, {}),
  clientTimestamp: toDate(row.client_timestamp)!,
  serverTimestamp: toDate(row.server_timestamp)!,
  deviceInfo: row.device_info ? (parseJson(row.device_info, {}) as Record<string, unknown>) : undefined,
});

export const ExportRouter = () => {
  const router = new Hono<{ Bindings: EnvWithR2 }>();

  router.post("/", async (c) => {
    const userId = c.req.header("X-User-Id");
    const authHeader = c.req.header("Authorization");

    if (!userId || !authHeader?.startsWith("Bearer ")) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    try {
      const body = await c.req.json().catch(() => ({}));
      const { startDate, endDate, format = "xlsx" } = ExportQuerySchema.parse(body);

      const drizzle = createDrizzleInstance(c.env.DB);

      // Verify user exists using new Drizzle 0.45 API
      const userRows = await drizzle.query.users.findFirst({
        where: (u, { eq }) => eq(u.id, userId),
      });
      if (!userRows) {
        return c.json({ success: false, error: "User not found" }, 404);
      }
      const user = transformUser(userRows);

      // Build date filter for timestamp fields (milliseconds)
      const startTimeMs = startDate ? new Date(startDate).getTime() : null;
      const endTimeMs = endDate ? new Date(endDate).getTime() : null;

      // Fetch all user data in parallel using new Drizzle 0.45 API
      const [
        workoutRows,
        bodyMetricRows,
        bodyHeatmapRows,
        visionAnalysisRows,
        conversationRows,
        aiRecommendationRows,
        dailyScheduleRows,
        gamificationProfileRows,
        badgeRows,
        achievementRows,
        socialProofCardRows,
        activityEventRows,
      ] = await Promise.all([
        // Workouts
        drizzle.query.workouts.findMany({
          where: (w, { eq }) => eq(w.userId, userId),
          orderBy: (w, { desc }) => desc(w.createdAt),
        }),
        // Body Metrics with optional date range
        drizzle.query.bodyMetrics.findMany({
          where: (bm, { and, gte, lte, eq }) =>
            and(eq(bm.userId, userId), ...(startTimeMs && endTimeMs ? [gte(bm.timestamp, startTimeMs), lte(bm.timestamp, endTimeMs)] : [])),
          orderBy: (bm, { desc }) => desc(bm.timestamp),
        }),
        // Body Heatmaps
        drizzle.query.bodyHeatmaps.findMany({
          where: (bh, { eq }) => eq(bh.userId, userId),
          orderBy: (bh, { desc }) => desc(bh.createdAt),
        }),
        // Vision Analyses
        drizzle.query.visionAnalyses.findMany({
          where: (va, { eq }) => eq(va.userId, userId),
          orderBy: (va, { desc }) => desc(va.createdAt),
        }),
        // Conversations
        drizzle.query.conversations.findMany({
          where: (c, { eq }) => eq(c.userId, userId),
          orderBy: (c, { desc }) => desc(c.createdAt),
        }),
        // AI Recommendations
        drizzle.query.aiRecommendations.findMany({
          where: (ar, { eq }) => eq(ar.userId, userId),
          orderBy: (ar, { desc }) => desc(ar.createdAt),
        }),
        // Daily Schedules
        drizzle.query.dailySchedules.findMany({
          where: (ds, { eq }) => eq(ds.userId, userId),
          orderBy: (ds, { desc }) => desc(ds.id),
        }),
        // Gamification Profile
        drizzle.query.gamificationProfiles.findFirst({
          where: (gp, { eq }) => eq(gp.userId, userId),
        }),
        // Badges
        drizzle.query.badges.findMany({
          where: (b, { eq }) => eq(b.userId, userId),
          orderBy: (b, { desc }) => desc(b.earnedAt),
        }),
        // Achievements
        drizzle.query.achievements.findMany({
          where: (a, { eq }) => eq(a.userId, userId),
        }),
        // Social Proof Cards
        drizzle.query.socialProofCards.findMany({
          where: (spc, { eq }) => eq(spc.userId, userId),
          orderBy: (spc, { desc }) => desc(spc.createdAt),
        }),
        // Activity Events
        drizzle.query.activityEvents.findMany({
          where: (ae, { eq }) => eq(ae.userId, userId),
          orderBy: (ae, { desc }) => desc(ae.serverTimestamp),
        }),
      ]);

      // Transform DB rows to shared-types
      const transformedWorkouts: Workout[] = workoutRows.map(transformWorkout);
      const bodyMetricsList: BodyMetric[] = bodyMetricRows.map(transformBodyMetric);
      const bodyHeatmapsList: BodyHeatmapData[] = bodyHeatmapRows.map(transformBodyHeatmap);
      const visionAnalysesList: VisionAnalysis[] = visionAnalysisRows.map(transformVisionAnalysis);
      const conversationsList: Conversation[] = conversationRows.map(transformConversation);
      const aiRecommendationsList: AIRecommendation[] = aiRecommendationRows.map(transformAIRecommendation);
      const dailySchedulesList: DailySchedule[] = dailyScheduleRows.map(transformDailySchedule);
      const badgesList: Badge[] = badgeRows.map(transformBadge);
      const achievementsList: Achievement[] = achievementRows.map(transformAchievement);
      const socialProofCardsList: SocialProofCard[] = socialProofCardRows.map(transformSocialProofCard);
      const activityEventsList: ActivityEvent[] = activityEventRows.map(transformActivityEvent);

      // Build gamification profile if user has one
      let gamificationProfile: GamificationProfile | undefined;
      if (gamificationProfileRows) {
        gamificationProfile = {
          id: gamificationProfileRows.id,
          userId: user.id,
          totalPoints: gamificationProfileRows.totalPoints ?? 0,
          level: gamificationProfileRows.level ?? 1,
          currentXp: gamificationProfileRows.currentXp ?? 0,
          xpToNextLevel: gamificationProfileRows.xpToNextLevel ?? 100,
          streak: {
            current: gamificationProfileRows.streakCurrent ?? 0,
            longest: gamificationProfileRows.streakLongest ?? 0,
            lastActivityDate: gamificationProfileRows.lastActivityDate ?? new Date().toISOString().split('T')[0],
          },
          badges: badgesList,
          achievements: achievementsList,
          socialProofCards: socialProofCardsList,
          leaderboardPosition: undefined,
        };
      }

      // Fetch workout exercises separately and enrich workouts
      const workoutIds = transformedWorkouts.map((w) => w.id);
      let workoutExercises: SharedWorkoutExercise[] = [];
      if (workoutIds.length > 0) {
        const exerciseRows = await drizzle
          .query.workoutExercises
          .findMany({
            where: (we, { inArray }) => inArray(we.workoutId, workoutIds),
            orderBy: (we, { asc }) => asc(we.order),
          });
        workoutExercises = exerciseRows.map(transformWorkoutExercise);
      }

      // Enrich workouts with exercises
      const workoutsWithExercises: (Workout & { exercises?: SharedWorkoutExercise[] })[] = transformedWorkouts.map(
        (workout) => ({
          ...workout,
          exercises: workoutExercises.filter((e) => e.workoutId === workout.id),
        })
      );

      // Prepare comprehensive data
      const exportData = {
        user,
        workouts: workoutsWithExercises,
        dailySchedules: dailySchedulesList,
        bodyMetrics: bodyMetricsList,
        bodyHeatmaps: bodyHeatmapsList,
        visionAnalyses: visionAnalysesList,
        conversations: conversationsList,
        aiRecommendations: aiRecommendationsList,
        gamificationProfile,
        badges: badgesList,
        achievements: achievementsList,
        socialProofCards: socialProofCardsList,
        activityEvents: activityEventsList,
      };

      // Generate file based on format
      let buffer: Uint8Array;
      let contentType: string;
      let filename: string;

      const dateStr = new Date().toISOString().split("T")[0];

      switch (format) {
        case "csv":
          contentType = "application/json";
          filename = `aivo-export-${userId}-${dateStr}.json`;
          buffer = new TextEncoder().encode(generateJSON(exportData));
          break;

        case "json":
          contentType = "application/json";
          filename = `aivo-export-${userId}-${dateStr}.json`;
          buffer = new TextEncoder().encode(generateJSON(exportData));
          break;

        case "xlsx":
        default:
          const generator = new ExcelGenerator();
          const xlsxBuffer = generator.generateAll(exportData);
          buffer = Buffer.from(xlsxBuffer);
          contentType =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
          filename = `aivo-export-${userId}-${dateStr}.xlsx`;
          break;
      }

      // Set response headers
      c.header("Content-Type", contentType);
      c.header(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      c.header("Content-Length", buffer.length.toString());

      return c.body(buffer as Body);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Export error:", error);
      return c.json({ success: false, error: "Export failed" }, 500);
    }
  });

  router.get("/template", async (c) => {
    const userId = c.req.header("X-User-Id");
    const authHeader = c.req.header("Authorization");

    if (!userId || !authHeader?.startsWith("Bearer ")) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    const format = c.req.query("format") as ExportFormat || "xlsx";
    const dateStr = new Date().toISOString().split("T")[0];

    let buffer: Uint8Array;
    let contentType: string;
    let filename: string;

    switch (format) {
      case "csv":
        contentType = "text/csv";
        filename = `aivo-template-${dateStr}.csv`;
        const csvHeaders = [
          "User ID",
          "Workout ID",
          "Type",
          "Duration (min)",
          "Weight (kg)",
          "Body Fat (%)",
        ].join(",");
        buffer = new TextEncoder().encode(csvHeaders + "\n");
        break;

      case "json":
        contentType = "application/json";
        filename = `aivo-template-${dateStr}.json`;
        buffer = new TextEncoder().encode(JSON.stringify({ template: "aivo_export", version: "1.0", sheets: [] }, null, 2));
        break;

      case "xlsx":
      default:
        const generator = new ExcelGenerator();
        const emptyData = {
          user: {
            id: "",
            email: "",
            name: "",
            age: undefined,
            gender: undefined,
            height: undefined,
            weight: undefined,
            restingHeartRate: undefined,
            maxHeartRate: undefined,
            fitnessLevel: undefined,
            goals: undefined,
            picture: undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as User,
          workouts: [],
          dailySchedules: [],
          bodyMetrics: [],
          bodyHeatmaps: [],
          visionAnalyses: [],
          conversations: [],
          aiRecommendations: [],
          badges: [],
          achievements: [],
          socialProofCards: [],
          activityEvents: [],
        };
        const xlsxBuffer = generator.generateAll(emptyData);
        buffer = Buffer.from(xlsxBuffer);
        contentType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        filename = `aivo-template-${dateStr}.xlsx`;
        break;
    }

    c.header("Content-Type", contentType);
    c.header("Content-Disposition", `attachment; filename="${filename}"`);
    c.header("Content-Length", buffer.length.toString());

    return c.body(buffer);
  });

  return router;
};
