import { Hono } from "hono";
import { z } from "zod";
import { createDrizzleInstance } from "@aivo/db";
import { ExcelGenerator, generateJSON } from "@aivo/excel-export";
import type { D1Database } from "@cloudflare/workers-types";
// Import Drizzle tables for runtime
import {
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
  activityEvents,
  gamificationProfiles,
} from "@aivo/db";

// Silence unused variable warnings for Drizzle table imports
// They are used via drizzle.query.{tableName}
void users; void workouts; void workoutExercises; void dailySchedules; void bodyMetrics; void bodyHeatmaps; void visionAnalyses; void conversations; void aiRecommendations; void badges; void achievements; void socialProofCards; void activityEvents; void gamificationProfiles;

import { authenticate, getUserFromContext, type AuthUser } from "../middleware/auth";

// Type imports for row data interfaces
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

interface EnvWithR2 {
  DB: D1Database;
}

type ExportFormat = "xlsx" | "csv" | "json";

const ExportQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  format: z.enum(["xlsx", "csv", "json"]).default("xlsx"),
});

// Helper: Convert timestamp to Date
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
const transformUser = (row: unknown): User => {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    email: r.email as string,
    name: r.name as string,
    age: r.age ?? undefined,
    gender: r.gender ?? undefined,
    height: r.height ?? undefined,
    weight: r.weight ?? undefined,
    restingHeartRate: r.resting_heart_rate ?? undefined,
    maxHeartRate: r.max_heart_rate ?? undefined,
    fitnessLevel: r.fitness_level ?? undefined,
    goals: r.goals ? (parseJson<string[]>(r.goals, []) as UserGoal[]) : undefined,
    picture: r.picture ?? undefined,
    createdAt: toDate(r.created_at)!,
    updatedAt: toDate(r.updated_at)!,
  };
};

// Transform DB row to Workout (exercises added separately)
const transformWorkout = (row: unknown): Workout => {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    userId: r.user_id as string,
    type: r.type as Workout['type'],
    name: r.name ?? undefined,
    duration: r.duration as number,
    caloriesBurned: r.calories_burned ?? undefined,
    startTime: toDate(r.start_time)!,
    endTime: toDate(r.end_time)!,
    notes: r.notes ?? undefined,
    metrics: r.metrics ? parseJson(r.metrics, {}) : undefined,
    exercises: undefined,
    createdAt: toDate(r.created_at)!,
    completedAt: r.completed_at ? toDate(r.completed_at) : undefined,
    status: r.status as Workout['status'],
  };
};

// Transform DB row to WorkoutExercise
const transformWorkoutExercise = (row: unknown): SharedWorkoutExercise => {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    workoutId: r.workout_id as string,
    name: r.name as string,
    sets: r.sets as number,
    reps: r.reps as number,
    weight: r.weight ?? undefined,
    restTime: r.rest_time ?? undefined,
    notes: r.notes ?? undefined,
    order: r.order as number,
    rpe: r.rpe ?? undefined,
  };
};

// Transform DB row to ScheduledWorkout (from daily_schedules with joined workout)
const transformScheduledWorkout = (schedule: unknown, workout: unknown | null): ScheduledWorkout => {
  const s = schedule as Record<string, unknown>;
  if (!workout) {
    return {
      workoutId: s.workout_id ?? undefined,
      templateId: undefined,
      customName: "Untitled",
      type: (s.type as string) ?? "other",
      duration: s.duration ?? 0,
      estimatedCalories: s.estimated_calories ?? 0,
      exercises: [],
      notes: undefined,
    };
  }
  const w = workout as Record<string, unknown>;
  return {
    workoutId: w.id as string,
    templateId: undefined,
    customName: w.name ?? (w.type as string),
    type: w.type as string,
    duration: w.duration as number,
    estimatedCalories: w.calories_burned ?? 0,
    exercises: [],
    notes: w.notes ?? undefined,
  };
};

// Transform DB row to DailySchedule
const transformDailySchedule = (row: unknown, workout: unknown | null = null): DailySchedule => {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    userId: r.user_id as string,
    date: r.date as string,
    workout: r.workout_id ? transformScheduledWorkout(row, workout) : undefined,
    recoveryTasks: parseJson(r.recovery_tasks, []),
    nutritionGoals: parseJson(r.nutrition_goals, []),
    sleepGoal: parseJson(r.sleep_goal, undefined),
    generatedBy: r.generated_by as string,
    optimizationScore: r.optimization_score ?? undefined,
    adjustmentsMade: parseJson(r.adjustments_made, []),
  };
};

// Transform DB row to BodyMetric
const transformBodyMetric = (row: unknown): BodyMetric => {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    userId: r.user_id as string,
    timestamp: (r.timestamp as number) * 1000,
    weight: r.weight ?? undefined,
    bodyFatPercentage: r.body_fat_percentage ?? undefined,
    muscleMass: r.muscle_mass ?? undefined,
    boneMass: r.bone_mass ?? undefined,
    waterPercentage: r.water_percentage ?? undefined,
    bmi: r.bmi ?? undefined,
    waistCircumference: r.waist_circumference ?? undefined,
    chestCircumference: r.chest_circumference ?? undefined,
    hipCircumference: r.hip_circumference ?? undefined,
    source: r.source ?? undefined,
    notes: r.notes ?? undefined,
  };
};

// Transform DB row to BodyHeatmapData
const transformBodyHeatmap = (row: unknown): BodyHeatmapData => {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    userId: r.user_id as string,
    timestamp: (r.timestamp as number) * 1000,
    imageUrl: r.image_url ?? undefined,
    vectorData: parseJson(r.vector_data, []),
    metadata: parseJson(r.metadata, undefined),
  };
};

// Transform DB row to VisionAnalysis
const transformVisionAnalysis = (row: unknown): VisionAnalysis => {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    userId: r.user_id as string,
    imageUrl: r.image_url as string,
    processedUrl: r.processed_url ?? undefined,
    analysis: parseJson(r.analysis, { muscleDevelopment: [], riskFactors: [] }),
    confidence: r.confidence ?? 0,
    createdAt: (r.created_at as number) * 1000,
  };
};

// Transform DB row to Conversation
const transformConversation = (row: unknown): Conversation => {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    userId: r.user_id as string,
    message: r.message as string,
    response: r.response as string,
    context: r.context ? (parseJson<string[]>(r.context, []) as string[]) : undefined,
    tokensUsed: r.tokens_used as number,
    model: r.model ?? undefined,
    createdAt: toDate(r.created_at)!,
  };
};

// Transform DB row to AIRecommendation
const transformAIRecommendation = (row: unknown): AIRecommendation => {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    userId: r.user_id as string,
    type: r.type as AIRecommendation['type'],
    title: r.title as string,
    description: r.description as string,
    confidence: r.confidence ?? 0,
    reasoning: r.reasoning ?? undefined,
    actions: parseJson(r.actions, []),
    expiresAt: r.expires_at ? toDate(r.expires_at) : undefined,
    isRead: toBool(r.is_read),
    isDismissed: toBool(r.is_dismissed),
    feedback: r.feedback ? (parseJson(r.feedback, {}) as Record<string, unknown>) : undefined,
    createdAt: toDate(r.created_at)!,
  };
};

// Transform DB row to Badge
const transformBadge = (row: unknown): Badge => {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    type: r.type as Badge['type'],
    name: r.name as string,
    description: r.description as string,
    icon: r.icon as string,
    earnedAt: toDate(r.earned_at)!,
    tier: r.tier as Badge['tier'],
  };
};

// Transform DB row to Achievement
const transformAchievement = (row: unknown): Achievement => {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    userId: r.user_id as string,
    type: r.type as Achievement['type'],
    progress: r.progress ?? 0,
    target: r.target as number,
    reward: r.reward as string,
    completed: toBool(r.completed),
    completedAt: r.completed_at ? toDate(r.completed_at) : undefined,
    claimed: toBool(r.claimed),
  };
};

// Transform DB row to SocialProofCard
const transformSocialProofCard = (row: unknown): SocialProofCard => {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    userId: r.user_id as string,
    type: r.type as SocialProofCard['type'],
    title: r.title as string,
    subtitle: r.subtitle ?? "",
    data: parseJson(r.data, { value: 0, label: "", icon: "", color: "" }),
    shareableImageUrl: r.shareable_image_url ?? undefined,
    createdAt: toDate(r.created_at)!,
    isPublic: toBool(r.is_public),
  };
};

// Transform DB row to ActivityEvent
const transformActivityEvent = (row: unknown): ActivityEvent => {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    userId: r.user_id as string,
    workoutId: r.workout_id ?? undefined,
    type: r.type as ActivityEvent['type'],
    payload: parseJson(r.payload, {}),
    clientTimestamp: toDate(r.client_timestamp)!,
    serverTimestamp: toDate(r.server_timestamp)!,
    deviceInfo: r.device_info ? (parseJson(r.device_info, {}) as Record<string, unknown>) : undefined,
  };
};

export const ExportRouter = () => {
  const router = new Hono<{ Bindings: EnvWithR2 }>();

  // Apply authentication to all export routes
  router.use("*", authenticate);

  router.post("/", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;

    try {
      const body = await c.req.json().catch(() => ({}));
      const { startDate, endDate, format = "xlsx" } = ExportQuerySchema.parse(body);

      const drizzle = createDrizzleInstance(c.env.DB);

      // Verify user exists using new Drizzle 0.45 API
      const userRows = await drizzle.query.users.findFirst({
        where: (u, { eq }) => eq(u.id, userId),
      }) as unknown;
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
        }) as unknown,
        // Body Metrics with optional date range
        drizzle.query.bodyMetrics.findMany({
          where: (bm, { and, gte, lte, eq }) =>
            and(eq(bm.userId, userId), ...(startTimeMs && endTimeMs ? [gte(bm.timestamp, startTimeMs), lte(bm.timestamp, endTimeMs)] : [])),
          orderBy: (bm, { desc }) => desc(bm.timestamp),
        }) as unknown,
        // Body Heatmaps
        drizzle.query.bodyHeatmaps.findMany({
          where: (bh, { eq }) => eq(bh.userId, userId),
          orderBy: (bh, { desc }) => desc(bh.createdAt),
        }) as unknown,
        // Vision Analyses
        drizzle.query.visionAnalyses.findMany({
          where: (va, { eq }) => eq(va.userId, userId),
          orderBy: (va, { desc }) => desc(va.createdAt),
        }) as unknown,
        // Conversations
        drizzle.query.conversations.findMany({
          where: (c, { eq }) => eq(c.userId, userId),
          orderBy: (c, { desc }) => desc(c.createdAt),
        }) as unknown,
        // AI Recommendations
        drizzle.query.aiRecommendations.findMany({
          where: (ar, { eq }) => eq(ar.userId, userId),
          orderBy: (ar, { desc }) => desc(ar.createdAt),
        }) as unknown,
        // Daily Schedules
        drizzle.query.dailySchedules.findMany({
          where: (ds, { eq }) => eq(ds.userId, userId),
          orderBy: (ds, { desc }) => desc(ds.id),
        }) as unknown,
        // Gamification Profile
        drizzle.query.gamificationProfiles.findFirst({
          where: (gp, { eq }) => eq(gp.userId, userId),
        }) as unknown,
        // Badges
        drizzle.query.badges.findMany({
          where: (b, { eq }) => eq(b.userId, userId),
          orderBy: (b, { desc }) => desc(b.earnedAt),
        }) as unknown,
        // Achievements
        drizzle.query.achievements.findMany({
          where: (a, { eq }) => eq(a.userId, userId),
        }) as unknown,
        // Social Proof Cards
        drizzle.query.socialProofCards.findMany({
          where: (spc, { eq }) => eq(spc.userId, userId),
          orderBy: (spc, { desc }) => desc(spc.createdAt),
        }) as unknown,
        // Activity Events
        drizzle.query.activityEvents.findMany({
          where: (ae, { eq }) => eq(ae.userId, userId),
          orderBy: (ae, { desc }) => desc(ae.serverTimestamp),
        }) as unknown,
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
          }) as unknown;
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

      return c.body(buffer);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Export error:", error);
      return c.json({ success: false, error: "Export failed" }, 500);
    }
  });

  router.get("/template", async (c) => {
    // Authentication verified by middleware, no userId needed for template
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
