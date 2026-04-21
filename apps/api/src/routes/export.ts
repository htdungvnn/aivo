import { Hono } from "hono";
import { OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import { createDrizzleInstance } from "@aivo/db";
import { ExcelGenerator, generateCSV, generateJSON } from "@aivo/excel-export";
import type {
  User,
  Workout,
  WorkoutExercise,
  DailySchedule,
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
} from "@aivo/shared-types";

interface EnvWithR2 {
  DB: D1Database;
}

type ExportFormat = "xlsx" | "csv" | "json" | "pdf";

const ExportQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  format: z.enum(["xlsx", "csv", "json"]).default("xlsx"),
});

export const ExportRouter = () => {
  const router = new Hono<{ Bindings: EnvWithR2 }>();

  /**
   * @swagger
   * /api/export:
   *   post:
   *     summary: Export user data
   *     description: Generate and download user's complete fitness data in various formats
   *     tags: [export]
   *     security:
   *       - bearer: []
   *     requestBody:
   *       required: false
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               startDate:
   *                 type: string
   *                 format: date-time
   *               endDate:
   *                 type: string
   *                 format: date-time
   *               format:
   *                 type: string
   *                 enum: [xlsx, csv, json]
   *                 default: xlsx
   *     responses:
   *       200:
   *         description: Exported file
   *         content:
   *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
   *             schema:
   *               type: string
   *               format: binary
   *           text/csv:
   *             schema:
   *               type: string
   *           application/json:
   *             schema:
   *               type: object
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Server error
   */
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

      // Verify user exists
      const user = await drizzle.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, userId),
      });

      if (!user) {
        return c.json({ success: false, error: "User not found" }, 404);
      }

      // Fetch all user data with date filters if provided
      const dateFilter = startDate || endDate
        ? (where: any) => {
            if (startDate) where.timestamp = { gte: new Date(startDate).getTime() };
            if (endDate) {
              where.timestamp = where.timestamp || {};
              where.timestamp.lte = new Date(endDate).getTime();
            }
          }
        : undefined;

      // Fetch data in parallel
      const [
        workouts,
        bodyMetrics,
        bodyHeatmaps,
        visionAnalyses,
        conversations,
        aiRecommendations,
        dailySchedules,
        gamificationProfile,
        badges,
        achievements,
        socialProofCards,
        activityEvents,
      ] = await Promise.all([
        // Workouts
        drizzle.query.workouts.findMany({
          where: { userId },
          orderBy: (w, { desc }) => desc(w.createdAt),
        }).then((w) => w as Workout[]),

        // Body Metrics
        dateFilter
          ? drizzle.query.bodyMetrics.findMany({
              where: (bm, { and }) =>
                and(
                  (bm, { eq }) => eq(bm.userId, userId),
                  (bm, { gte }) => gte(bm.timestamp, new Date(startDate!).getTime()),
                  (bm, { lte }) => lte(bm.timestamp, new Date(endDate!).getTime())
                ),
              orderBy: (bm, { desc }) => desc(bm.timestamp),
            }).then((m) => m as BodyMetric[])
          : drizzle.query.bodyMetrics.findMany({
              where: (bm, { eq }) => eq(bm.userId, userId),
              orderBy: (bm, { desc }) => desc(bm.timestamp),
            }).then((m) => m as BodyMetric[]),

        // Body Heatmaps
        drizzle.query.bodyHeatmaps.findMany({
          where: (bh, { eq }) => eq(bh.userId, userId),
          orderBy: (bh, { desc }) => desc(bh.timestamp),
        }).then((h) =>
          h.map((h) => ({
            ...h,
            vectorData: h.vectorData ? JSON.parse(h.vectorData) : [],
            metadata: h.metadata ? JSON.parse(h.metadata) : undefined,
          })) as BodyHeatmapData[]
        ),

        // Vision Analyses
        drizzle.query.visionAnalyses.findMany({
          where: (va, { eq }) => eq(va.userId, userId),
          orderBy: (va, { desc }) => desc(va.createdAt),
        }).then((v) => v as VisionAnalysis[]),

        // Conversations
        drizzle.query.conversations.findMany({
          where: (c, { eq }) => eq(c.userId, userId),
          orderBy: (c, { desc }) => desc(c.createdAt),
        }).then((c) => c as Conversation[]),

        // AI Recommendations
        drizzle.query.aiRecommendations.findMany({
          where: (ar, { eq }) => eq(ar.userId, userId),
          orderBy: (ar, { desc }) => desc(ar.createdAt),
        }).then((r) => r as AIRecommendation[]),

        // Daily Schedules
        drizzle.query.dailySchedules.findMany({
          where: (ds, { eq }) => eq(ds.userId, userId),
          orderBy: (ds, { desc }) => desc(ds.id), // Using ID as proxy for date
        }).then((s) => s as DailySchedule[]),

        // Gamification Profile
        drizzle.query.gamificationProfiles.findFirst({
          where: (gp, { eq }) => eq(gp.userId, userId),
        }).then((p) => p as GamificationProfile | undefined),

        // Badges
        drizzle.query.badges.findMany({
          where: (b, { eq }) => eq(b.userId, userId),
          orderBy: (b, { desc }) => desc(b.earnedAt),
        }).then((b) => b as Badge[]),

        // Achievements
        drizzle.query.achievements.findMany({
          where: (a, { eq }) => eq(a.userId, userId),
        }).then((a) => a as Achievement[]),

        // Social Proof Cards
        drizzle.query.socialProofCards.findMany({
          where: (spc, { eq }) => eq(spc.userId, userId),
          orderBy: (spc, { desc }) => desc(spc.createdAt),
        }).then((c) => c as SocialProofCard[]),

        // Activity Events
        drizzle.query.activityEvents.findMany({
          where: (ae, { eq }) => eq(ae.userId, userId),
          orderBy: (ae, { desc }) => desc(ae.serverTimestamp),
        }).then((e) => e as ActivityEvent[]),
      ]);

      // Enrich workouts with exercises
      const workoutIds = workouts.map((w) => w.id);
      const workoutExercises = await drizzle.query.workoutExercices.findMany({
        where: (we, { inArray }) => inArray(we.workoutId, workoutIds),
        orderBy: (we, { asc }) => asc(we.order),
      }).then((e) => e as WorkoutExercise[]);

      const workoutsWithExercises = workouts.map((workout) => ({
        ...workout,
        exercises: workoutExercises.filter((e) => e.workoutId === workout.id),
      }));

      // Prepare comprehensive data
      const exportData = {
        user,
        workouts: workoutsWithExercises,
        dailySchedules,
        bodyMetrics,
        bodyHeatmaps,
        visionAnalyses,
        conversations,
        aiRecommendations,
        gamificationProfile,
        badges,
        achievements,
        socialProofCards,
        activityEvents,
      };

      // Generate file based on format
      let buffer: Buffer;
      let contentType: string;
      let filename: string;

      const dateStr = new Date().toISOString().split("T")[0];

      switch (format) {
        case "csv":
          // For CSV, we'll generate a ZIP of multiple CSVs (simplified: JSON for now)
          contentType = "application/json";
          filename = `aivo-export-${userId}-${dateStr}.json`;
          buffer = Buffer.from(generateJSON(exportData));
          break;

        case "json":
          contentType = "application/json";
          filename = `aivo-export-${userId}-${dateStr}.json`;
          buffer = Buffer.from(generateJSON(exportData));
          break;

        case "xlsx":
        default:
          const generator = new ExcelGenerator();
          buffer = generator.generateAll(exportData);
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
      console.error("Export error:", error);
      return c.json({ success: false, error: "Export failed" }, 500);
    }
  });

  /**
   * @swagger
   * /api/export/template:
   *   get:
   *     summary: Download export template
   *     description: Get an empty template file with all column headers for data import
   *     tags: [export]
   *     parameters:
   *       - in: query
   *         name: format
   *         schema:
   *           type: string
   *           enum: [xlsx, csv, json]
   *           default: xlsx
   *     responses:
   *       200:
   *         description: Template file
   *         content:
   *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
   *             schema:
   *               type: string
   *               format: binary
   *       401:
   *         description: Unauthorized
   */
  router.get("/template", async (c) => {
    const userId = c.req.header("X-User-Id");
    const authHeader = c.req.header("Authorization");

    if (!userId || !authHeader?.startsWith("Bearer ")) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    const format = c.req.query("format") as ExportFormat || "xlsx";
    const dateStr = new Date().toISOString().split("T")[0];

    let buffer: Buffer;
    let contentType: string;
    let filename: string;

    switch (format) {
      case "csv":
        contentType = "text/csv";
        filename = `aivo-template-${dateStr}.csv`;
        // Simple CSV template with headers only
        const csvHeaders = [
          "User ID",
          "Workout ID",
          "Type",
          "Duration (min)",
          "Weight (kg)",
          "Body Fat (%)",
        ].join(",");
        buffer = Buffer.from(csvHeaders + "\n");
        break;

      case "json":
        contentType = "application/json";
        filename = `aivo-template-${dateStr}.json`;
        buffer = Buffer.from(JSON.stringify({ template: "aivo_export", version: "1.0", sheets: [] }, null, 2));
        break;

      case "xlsx":
      default:
        const generator = new ExcelGenerator();
        // Create empty template with headers only
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
        buffer = generator.generateAll(emptyData);
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

// Helper function for Drizzle where clauses (replicated from other routes)
function and(...conditions: any[]) {
  return { and: conditions };
}
function gte(field: any, value: any) {
  return { gte: value };
}
function lte(field: any, value: any) {
  return { lte: value };
}
