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
  const r = row as any;
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    age: r.age,
    gender: r.gender,
    height: r.height,
    weight: r.weight,
    restingHeartRate: r.resting_heart_rate,
    maxHeartRate: r.max_heart_rate,
    fitnessLevel: r.fitness_level,
    goals: r.goals ? (JSON.parse(r.goals) as UserGoal[]) : undefined,
    picture: r.picture ?? undefined,
    createdAt: toDate(r.created_at) ?? new Date(),
    updatedAt: toDate(r.updated_at) ?? new Date(),
  };
};

// Transform DB row to Workout (exercises added separately)
const transformWorkout = (row: unknown): Workout => {
  const r = row as any;
  return {
    id: r.id,
    userId: r.user_id,
    type: r.type,
    name: r.name ?? undefined,
    duration: r.duration,
    caloriesBurned: r.calories_burned ?? undefined,
    startTime: toDate(r.start_time) ?? new Date(),
    endTime: toDate(r.end_time) ?? new Date(),
    notes: r.notes ?? undefined,
    metrics: r.metrics ? JSON.parse(r.metrics) : undefined,
    exercises: undefined,
    createdAt: toDate(r.created_at) ?? new Date(),
    completedAt: r.completed_at ? toDate(r.completed_at) : undefined,
    status: r.status,
  };
};

// Transform DB row to WorkoutExercise
const transformWorkoutExercise = (row: unknown): SharedWorkoutExercise => {
  const r = row as any;
  return {
    id: r.id,
    workoutId: r.workout_id,
    name: r.name,
    sets: r.sets,
    reps: r.reps,
    weight: r.weight ?? undefined,
    restTime: r.rest_time ?? undefined,
    notes: r.notes ?? undefined,
    order: r.order,
    rpe: r.rpe ?? undefined,
  };
};

// Transform DB row to ScheduledWorkout (from daily_schedules with joined workout)
const transformScheduledWorkout = (schedule: unknown, workout: unknown | null): ScheduledWorkout => {
  const s = schedule as any;
  if (!workout) {
    return {
      workoutId: s.workout_id ?? undefined,
      templateId: undefined,
      customName: "Untitled",
      type: s.type ?? "other",
      duration: s.duration ?? 0,
      estimatedCalories: s.estimated_calories ?? 0,
      exercises: [],
      notes: undefined,
    };
  }
  const w = workout as any;
  return {
    workoutId: w.id,
    templateId: undefined,
    customName: w.name ?? w.type,
    type: w.type,
    duration: w.duration,
    estimatedCalories: w.calories_burned ?? 0,
    exercises: [],
    notes: w.notes ?? undefined,
  };
};

// Transform DB row to DailySchedule
const transformDailySchedule = (row: unknown, workout: unknown | null = null): DailySchedule => {
  const r = row as any;
  return {
    id: r.id,
    userId: r.user_id,
    date: r.date,
    workout: r.workout_id ? transformScheduledWorkout(row, workout) : undefined,
    recoveryTasks: typeof r.recovery_tasks === 'string' ? JSON.parse(r.recovery_tasks) : [],
    nutritionGoals: typeof r.nutrition_goals === 'string' ? JSON.parse(r.nutrition_goals) : [],
    sleepGoal: typeof r.sleep_goal === 'string' ? JSON.parse(r.sleep_goal) : undefined,
    generatedBy: r.generated_by,
    optimizationScore: r.optimization_score,
    adjustmentsMade: typeof r.adjustments_made === 'string' ? JSON.parse(r.adjustments_made) : [],
  };
};

// Transform DB row to BodyMetric
const transformBodyMetric = (row: unknown): BodyMetric => {
  const r = row as any;
  return {
    id: r.id,
    userId: r.user_id,
    timestamp: r.timestamp * 1000,
    weight: r.weight,
    bodyFatPercentage: r.body_fat_percentage,
    muscleMass: r.muscle_mass,
    boneMass: r.bone_mass,
    waterPercentage: r.water_percentage,
    bmi: r.bmi,
    waistCircumference: r.waist_circumference,
    chestCircumference: r.chest_circumference,
    hipCircumference: r.hip_circumference,
    source: r.source,
    notes: r.notes,
  };
};

// Transform DB row to BodyHeatmapData
const transformBodyHeatmap = (row: unknown): BodyHeatmapData => {
  const r = row as any;
  return {
    id: r.id,
    userId: r.user_id,
    timestamp: r.timestamp * 1000,
    imageUrl: r.image_url,
    vectorData: typeof r.vector_data === 'string' ? JSON.parse(r.vector_data) : [],
    metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : undefined,
  };
};

// Transform DB row to VisionAnalysis
const transformVisionAnalysis = (row: unknown): VisionAnalysis => {
  const r = row as any;
  return {
    id: r.id,
    userId: r.user_id,
    imageUrl: r.image_url,
    processedUrl: r.processed_url,
    analysis: typeof r.analysis === 'string' ? JSON.parse(r.analysis) : { muscleDevelopment: [], riskFactors: [] },
    confidence: r.confidence ?? 0,
    createdAt: r.created_at * 1000,
  };
};

// Transform DB row to Conversation
const transformConversation = (row: unknown): Conversation => {
  const r = row as any;
  return {
    id: r.id,
    userId: r.user_id,
    message: r.message,
    response: r.response,
    context: r.context ? (JSON.parse(r.context) as string[]) : undefined,
    tokensUsed: r.tokens_used,
    model: r.model,
    createdAt: toDate(r.created_at) ?? new Date(),
  };
};

// Transform DB row to AIRecommendation
const transformAIRecommendation = (row: unknown): AIRecommendation => {
  const r = row as any;
  return {
    id: r.id,
    userId: r.user_id,
    type: r.type,
    title: r.title,
    description: r.description,
    confidence: r.confidence ?? 0,
    reasoning: r.reasoning,
    actions: typeof r.actions === 'string' ? JSON.parse(r.actions) : [],
    expiresAt: r.expires_at ? toDate(r.expires_at) : undefined,
    isRead: toBool(r.is_read),
    isDismissed: toBool(r.is_dismissed),
    feedback: r.feedback && typeof r.feedback === 'string' ? JSON.parse(r.feedback) : undefined,
    createdAt: toDate(r.created_at) ?? new Date(),
  };
};

// Transform DB row to Badge
const transformBadge = (row: unknown): Badge => {
  const r = row as any;
  return {
    id: r.id,
    type: r.type,
    name: r.name,
    description: r.description,
    icon: r.icon,
    earnedAt: toDate(r.earned_at) ?? new Date(),
    tier: r.tier,
  };
};

// Transform DB row to Achievement
const transformAchievement = (row: unknown): Achievement => {
  const r = row as any;
  return {
    id: r.id,
    userId: r.user_id,
    type: r.type,
    progress: r.progress ?? 0,
    target: r.target,
    reward: r.reward,
    completed: toBool(r.completed),
    completedAt: r.completed_at ? toDate(r.completed_at) : undefined,
    claimed: toBool(r.claimed),
  };
};

// Transform DB row to SocialProofCard
const transformSocialProofCard = (row: unknown): SocialProofCard => {
  const r = row as any;
  return {
    id: r.id,
    userId: r.user_id,
    type: r.type,
    title: r.title,
    subtitle: r.subtitle ?? "",
    data: typeof r.data === 'string' ? JSON.parse(r.data) : { value: 0, label: "", icon: "", color: "" },
    shareableImageUrl: r.shareable_image_url,
    createdAt: toDate(r.created_at) ?? new Date(),
    isPublic: toBool(r.is_public),
  };
};

// Transform DB row to ActivityEvent
const transformActivityEvent = (row: unknown): ActivityEvent => {
  const r = row as any;
  return {
    id: r.id,
    userId: r.user_id,
    workoutId: r.workout_id,
    type: r.type,
    payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : {},
    clientTimestamp: toDate(r.client_timestamp) ?? new Date(),
    serverTimestamp: toDate(r.server_timestamp) ?? new Date(),
    deviceInfo: r.device_info && typeof r.device_info === 'string' ? JSON.parse(r.device_info) : undefined,
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
      }) as any;
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
        }) as any,
        // Body Metrics with optional date range
        drizzle.query.bodyMetrics.findMany({
          where: (bm, { and, gte, lte, eq }) =>
            and(eq(bm.userId, userId), ...(startTimeMs && endTimeMs ? [gte(bm.timestamp, startTimeMs), lte(bm.timestamp, endTimeMs)] : [])),
          orderBy: (bm, { desc }) => desc(bm.timestamp),
        }) as any,
        // Body Heatmaps
        drizzle.query.bodyHeatmaps.findMany({
          where: (bh, { eq }) => eq(bh.userId, userId),
          orderBy: (bh, { desc }) => desc(bh.createdAt),
        }) as any,
        // Vision Analyses
        drizzle.query.visionAnalyses.findMany({
          where: (va, { eq }) => eq(va.userId, userId),
          orderBy: (va, { desc }) => desc(va.createdAt),
        }) as any,
        // Conversations
        drizzle.query.conversations.findMany({
          where: (c, { eq }) => eq(c.userId, userId),
          orderBy: (c, { desc }) => desc(c.createdAt),
        }) as any,
        // AI Recommendations
        drizzle.query.aiRecommendations.findMany({
          where: (ar, { eq }) => eq(ar.userId, userId),
          orderBy: (ar, { desc }) => desc(ar.createdAt),
        }) as any,
        // Daily Schedules
        drizzle.query.dailySchedules.findMany({
          where: (ds, { eq }) => eq(ds.userId, userId),
          orderBy: (ds, { desc }) => desc(ds.id),
        }) as any,
        // Gamification Profile
        drizzle.query.gamificationProfiles.findFirst({
          where: (gp, { eq }) => eq(gp.userId, userId),
        }) as any,
        // Badges
        drizzle.query.badges.findMany({
          where: (b, { eq }) => eq(b.userId, userId),
          orderBy: (b, { desc }) => desc(b.earnedAt),
        }) as any,
        // Achievements
        drizzle.query.achievements.findMany({
          where: (a, { eq }) => eq(a.userId, userId),
        }) as any,
        // Social Proof Cards
        drizzle.query.socialProofCards.findMany({
          where: (spc, { eq }) => eq(spc.userId, userId),
          orderBy: (spc, { desc }) => desc(spc.createdAt),
        }) as any,
        // Activity Events
        drizzle.query.activityEvents.findMany({
          where: (ae, { eq }) => eq(ae.userId, userId),
          orderBy: (ae, { desc }) => desc(ae.serverTimestamp),
        }) as any,
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
          }) as any[];
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

      return c.body(buffer as any);
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

    return c.body(buffer as any);
  });

  return router;
};
