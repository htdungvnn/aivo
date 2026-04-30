import { z } from "zod";
import { createDrizzleInstance } from "@aivo/db";
import { eq } from "drizzle-orm";
import { schema as dbSchema } from "@aivo/db/schema";
import {
  getCachedBiometricData,
  getBiometricCacheKey,
  storeSensorReadings,
  type BiometricReading,
  type BiometricSnapshot,
  getSleepLogs,
  getSleepSummary,
  createSleepLog,
  updateSleepLog,
  getOrGenerateSnapshot,
  getCorrelationFindings,
  dismissCorrelationFinding,
  getRecoveryScore,
  getUserMacroTargets,
  upsertUserMacroTargets,
} from "../services/biometric";
import type { D1Database, KVNamespace } from "@cloudflare/workers-types";
import { BaseRouter, type BaseEnv } from "../lib/base-router";
import { APIError } from "../utils/errors";

interface Env extends BaseEnv {
  BIOMETRIC_CACHE: KVNamespace;
}

export const BiometricRouter = () => {
  const baseRouter = new BaseRouter<Env>();
  const router = baseRouter.getRouter();

  // ============================================
  // SLEEP LOGS
  // ============================================

  /**
   * Create or update sleep log
   * POST /api/biometric/sleep
   */
  /**
   * @swagger
   * /biometric/sleep:
   *   post:
   *     summary: Create sleep log
   *     description: Record a new sleep log with duration, quality, and sleep stage breakdown
   *     tags: [biometric, sleep]
   *     security:
   *       - bearer: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - date
   *               - durationHours
   *             properties:
   *               date:
   *                 type: string
   *                 pattern: ^\d{4}-\d{2}-\d{2}$
   *                 description: Sleep date in YYYY-MM-DD format
   *               durationHours:
   *                 type: number
   *                 minimum: 0
   *                 description: Total sleep duration in hours
   *               qualityScore:
   *                 type: integer
   *                 minimum: 0
   *                 maximum: 100
   *                 description: Subjective sleep quality (0-100)
   *               deepSleepMinutes:
   *                 type: integer
   *                 minimum: 0
   *                 description: Deep sleep duration in minutes
   *               remSleepMinutes:
   *                 type: integer
   *                 minimum: 0
   *                 description: REM sleep duration in minutes
   *               awakeMinutes:
   *                 type: integer
   *                 minimum: 0
   *                 description: Time awake during night
   *               bedtime:
   *                 type: string
   *                 pattern: ^\d{2}:\d{2}$
   *                 description: Bedtime in HH:MM format
   *               waketime:
   *                 type: string
   *                 pattern: ^\d{2}:\d{2}$
   *                 description: Wake time in HH:MM format
   *               consistencyScore:
   *                 type: integer
   *                 minimum: 0
   *                 maximum: 100
   *                 description: Sleep schedule consistency
   *               notes:
   *                 type: string
   *                 maxLength: 1000
   *                 description: Optional notes about sleep
   *               source:
   *                 type: string
   *                 enum: [manual, device, imported]
   *                 default: manual
   *                 description: Data source
   *     responses:
   *       201:
   *         description: Sleep log created
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/SleepLog'
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Failed to create sleep log
   */
  router.post("/sleep", async (c) => {
    const authUser = baseRouter.getAuthUser(c);
    const userId = authUser.id;
    const drizzle = baseRouter.getDrizzle(c.env.DB);

    try {
      const body = await c.req.json();

      const validationSchema = z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        durationHours: z.number().positive(),
        qualityScore: z.number().min(0).max(100).optional(),
        deepSleepMinutes: z.number().int().positive().optional(),
        remSleepMinutes: z.number().int().positive().optional(),
        awakeMinutes: z.number().int().nonnegative().optional(),
        bedtime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        waketime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        consistencyScore: z.number().min(0).max(100).optional(),
        notes: z.string().max(1000).optional(),
        source: z.enum(["manual", "device", "imported"]).default("manual"),
      });

      const validated = validationSchema.parse(body);

      const sleepLog = await createSleepLog(drizzle, userId, validated);

      return c.json({ success: true, data: sleepLog }, 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new APIError(400, "VALIDATION_ERROR", "Validation error", { details: error.errors });
      }
      throw new APIError(500, "CREATE_SLEEP_LOG_FAILED", "Failed to create sleep log");
    }
  });

  /**
   * Update sleep log
   * PATCH /api/biometric/sleep/:id
   */
  /**
   * @swagger
   * /biometric/sleep/{id}:
   *   patch:
   *     summary: Update sleep log
   *     description: Update an existing sleep log by ID
   *     tags: [biometric, sleep]
   *     security:
   *       - bearer: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Sleep log ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               durationHours:
   *                 type: number
   *                 minimum: 0
   *               qualityScore:
   *                 type: integer
   *                 minimum: 0
   *                 maximum: 100
   *               deepSleepMinutes:
   *                 type: integer
   *                 minimum: 0
   *               remSleepMinutes:
   *                 type: integer
   *                 minimum: 0
   *               awakeMinutes:
   *                 type: integer
   *                 minimum: 0
   *               bedtime:
   *                 type: string
   *                 pattern: ^\d{2}:\d{2}$
   *               waketime:
   *                 type: string
   *                 pattern: ^\d{2}:\d{2}$
   *               consistencyScore:
   *                 type: integer
   *                 minimum: 0
   *                 maximum: 100
   *               notes:
   *                 type: string
   *                 maxLength: 1000
   *               source:
   *                 type: string
   *     responses:
   *       200:
   *         description: Sleep log updated
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/SleepLog'
   *       404:
   *         description: Sleep log not found
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Failed to update sleep log
   */
  router.patch("/sleep/:id", async (c) => {
    const authUser = baseRouter.getAuthUser(c);
    const userId = authUser.id;
    const drizzle = baseRouter.getDrizzle(c.env.DB);
    const logId = c.req.param("id");

    try {
      const body = await c.req.json();

      const validationSchema = z.object({
        durationHours: z.number().positive().optional(),
        qualityScore: z.number().min(0).max(100).optional(),
        deepSleepMinutes: z.number().int().positive().optional(),
        remSleepMinutes: z.number().int().positive().optional(),
        awakeMinutes: z.number().int().nonnegative().optional(),
        bedtime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        waketime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        consistencyScore: z.number().min(0).max(100).optional(),
        notes: z.string().max(1000).optional(),
        source: z.string().optional(),
      });

      const validated = validationSchema.parse(body);

      const sleepLog = await updateSleepLog(drizzle, userId, logId, validated);

      if (!sleepLog) {
        throw new APIError(404, "SLEEP_LOG_NOT_FOUND", "Sleep log not found");
      }

      return c.json({ success: true, data: sleepLog });
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new APIError(400, "VALIDATION_ERROR", "Validation error", { details: error.errors });
      }
      throw new APIError(500, "UPDATE_SLEEP_LOG_FAILED", "Failed to update sleep log");
    }
  });

  /**
   * Get sleep logs with pagination
   * GET /api/biometric/sleep/history?limit=30&offset=0
   */
  /**
   * @swagger
   * /biometric/sleep/history:
   *   get:
   *     summary: Get sleep history
   *     description: Retrieve paginated sleep log history for the authenticated user
   *     tags: [biometric, sleep]
   *     security:
   *       - bearer: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 30
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           minimum: 0
   *           default: 0
   *     responses:
   *       200:
   *         description: Sleep logs retrieved
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/SleepLog'
   *       401:
   *         description: Unauthorized
   */
  router.get("/sleep/history", async (c) => {
    const authUser = baseRouter.getAuthUser(c);
    const userId = authUser.id;
    const drizzle = baseRouter.getDrizzle(c.env.DB);

    const limit = parseInt(c.req.query("limit") || "30");
    const offset = parseInt(c.req.query("offset") || "0");

    const logs = await getSleepLogs(drizzle, userId, limit, offset);

    return c.json({ success: true, data: logs });
  });

  /**
   * Get sleep summary statistics
   * GET /api/biometric/sleep/summary?period=30d
   */
  /**
   * @swagger
   * /biometric/sleep/summary:
   *   get:
   *     summary: Get sleep summary
   *     description: Retrieve aggregated sleep statistics for a given period (7d or 30d)
   *     tags: [biometric, sleep]
   *     security:
   *       - bearer: []
   *     parameters:
   *       - in: query
   *         name: period
   *         schema:
   *           type: string
   *           enum: [7d, 30d]
   *           default: 30d
   *         description: Summary period (7 days or 30 days)
   *     responses:
   *       200:
   *         description: Sleep summary retrieved
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/SleepSummary'
   *       401:
   *         description: Unauthorized
   */
  router.get("/sleep/summary", async (c) => {
    const authUser = baseRouter.getAuthUser(c);
    const userId = authUser.id;
    const drizzle = baseRouter.getDrizzle(c.env.DB);

    const period = c.req.query("period") === "7d" ? "7d" : "30d";

    const summary = await getSleepSummary(drizzle, userId, period);

    return c.json({ success: true, data: summary });
  });

  // ============================================
  // BIOMETRIC SNAPSHOTS
  // ============================================

  /**
   * Generate biometric snapshot
   * POST /api/biometric/snapshot/generate
   */
  /**
   * @swagger
   * /biometric/snapshot/generate:
   *   post:
   *     summary: Generate biometric snapshot
   *     description: Generate a comprehensive biometric snapshot aggregating recent health data (sleep, activity, heart rate, etc.)
   *     tags: [biometric]
   *     security:
   *       - bearer: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               period:
   *                 type: string
   *                 enum: [7d, 30d]
   *                 default: 7d
   *                 description: Lookback period for data aggregation
   *     responses:
   *       201:
   *         description: Snapshot generated
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/BiometricSnapshot'
   *       400:
   *         description: Invalid period
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Failed to generate snapshot
   */
  router.post("/snapshot/generate", async (c) => {
    const authUser = baseRouter.getAuthUser(c);
    const userId = authUser.id;
    const drizzle = baseRouter.getDrizzle(c.env.DB);

    try {
      const body = await c.req.json();

      const validationSchema = z.object({
        period: z.enum(["7d", "30d"]).default("7d"),
      });

      const { period } = validationSchema.parse(body);

      // Generate snapshot (this will also store in DB)
      const snapshot = await getOrGenerateSnapshot(drizzle, userId, period, c.env.BIOMETRIC_CACHE);

      return c.json({ success: true, data: snapshot }, 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new APIError(400, "VALIDATION_ERROR", "Validation error", { details: error.errors });
      }
      throw new APIError(500, "GENERATE_SNAPSHOT_FAILED", "Failed to generate snapshot");
    }
  });

  /**
   * Get latest snapshot for period
   * GET /api/biometric/snapshot/:period
   */
  /**
   * @swagger
   * /biometric/snapshot/{period}:
   *   get:
   *     summary: Get biometric snapshot
   *     description: Retrieve the latest biometric snapshot for a specific period (7d or 30d). Generates a new snapshot if none exists or cache expired.
   *     tags: [biometric]
   *     security:
   *       - bearer: []
   *     parameters:
   *       - in: path
   *         name: period
   *         required: true
   *         schema:
   *           type: string
   *           enum: [7d, 30d]
   *         description: Snapshot period
   *     responses:
   *       200:
   *         description: Snapshot retrieved
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/BiometricSnapshot'
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Failed to get or generate snapshot
   */
  router.get("/snapshot/:period", async (c) => {
    const authUser = baseRouter.getAuthUser(c);
    const userId = authUser.id;
    const drizzle = baseRouter.getDrizzle(c.env.DB);
    const period = c.req.param("period") as "7d" | "30d";

    if (period !== "7d" && period !== "30d") {
      throw new APIError(400, "INVALID_PERIOD", "Period must be 7d or 30d");
    }

    // Check cache first
    const cacheKey = getBiometricCacheKey(userId, `snapshot:${period}`);
    const cached = await getCachedBiometricData<BiometricSnapshot>(
      c.env.BIOMETRIC_CACHE,
      cacheKey
    );

    if (cached.hit && cached.data) {
      return c.json({ success: true, data: cached.data });
    }

    // Generate fresh snapshot
    const snapshot = await getOrGenerateSnapshot(drizzle, userId, period, c.env.BIOMETRIC_CACHE);

    return c.json({ success: true, data: snapshot });
  });

  // ============================================
  // CORRELATION ANALYSIS
  // ============================================

  /**
   * Get correlation findings
   * GET /api/biometric/correlations?limit=10
   */
  /**
   * @swagger
   * /biometric/correlations:
   *   get:
   *     summary: Get biometric correlations
   *     description: Retrieve AI-generated correlation findings between biometric metrics (e.g., sleep quality affecting workout performance)
   *     tags: [biometric]
   *     security:
   *       - bearer: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 50
   *           default: 10
   *       - in: query
   *         name: includeDismissed
   *         schema:
   *           type: boolean
   *     responses:
   *       200:
   *         description: Correlations retrieved
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/CorrelationFinding'
   *       401:
   *         description: Unauthorized
   */
  router.get("/correlations", async (c) => {
    const authUser = baseRouter.getAuthUser(c);
    const userId = authUser.id;
    const drizzle = baseRouter.getDrizzle(c.env.DB);

    const limit = parseInt(c.req.query("limit") || "10");
    const includeDismissed = c.req.query("includeDismissed") === "true";

    const findings = await getCorrelationFindings(drizzle, userId, limit, includeDismissed);

    return c.json({ success: true, data: findings });
  });

  /**
   * Dismiss correlation finding
   * PATCH /api/biometric/correlations/:id/dismiss
   */
  /**
   * @swagger
   * /biometric/correlations/{id}/dismiss:
   *   patch:
   *     summary: Dismiss correlation finding
   *     description: Mark a correlation finding as dismissed so it no longer appears in the list
   *     tags: [biometric]
   *     security:
   *       - bearer: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Correlation finding ID to dismiss
   *     responses:
   *       200:
   *         description: Finding dismissed
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *       404:
   *         description: Finding not found
   *       401:
   *         description: Unauthorized
   */
  router.patch("/correlations/:id/dismiss", async (c) => {
    const authUser = baseRouter.getAuthUser(c);
    const userId = authUser.id;
    const drizzle = baseRouter.getDrizzle(c.env.DB);
    const findingId = c.req.param("id");

    await dismissCorrelationFinding(drizzle, userId, findingId);

    return c.json({ success: true });
  });

  // ============================================
  // RECOVERY SCORE
  // ============================================

  /**
   * Get current recovery score with factor breakdown
   * GET /api/biometric/recovery-score
   */
  /**
   * @swagger
   * /biometric/recovery-score:
   *   get:
   *     summary: Get recovery score
   *     description: Calculate overall recovery score based on sleep, biometric data, and recent activity. Returns factor breakdown and recommendations.
   *     tags: [biometric]
   *     security:
   *       - bearer: []
   *     responses:
   *       200:
   *         description: Recovery score calculated
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/RecoveryScore'
   *       401:
   *         description: Unauthorized
   */
  router.get("/recovery-score", async (c) => {
    const authUser = baseRouter.getAuthUser(c);
    const userId = authUser.id;
    const drizzle = baseRouter.getDrizzle(c.env.DB);

    const result = await getRecoveryScore(drizzle, userId, c.env.BIOMETRIC_CACHE);

    return c.json({ success: true, data: result });
  });

  // ============================================
  // MACRO TARGETS
  // ============================================

  /**
   * Get user's macro targets (override or calculated)
   * GET /nutrition/targets
   */
  /**
   * @swagger
   * /biometric/nutrition/targets:
   *   get:
   *     summary: Get nutrition targets
   *     description: Retrieve user's daily macronutrient and calorie targets. Returns either user-set overrides or calculated targets based on profile.
   *     tags: [biometric, nutrition]
   *     security:
   *       - bearer: []
   *     responses:
   *       200:
   *         description: Nutrition targets retrieved
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/MacroTargets'
   *       401:
   *         description: Unauthorized
   */
  router.get("/nutrition/targets", async (c) => {
    const authUser = baseRouter.getAuthUser(c);
    const userId = authUser.id;
    const drizzle = baseRouter.getDrizzle(c.env.DB);

    // Get user profile for calculation if needed
    const user = await drizzle.query.users.findFirst({
      where: eq(dbSchema.users.id, userId),
      columns: {
        weight: true,
        height: true,
        age: true,
        gender: true,
        goals: true,
      },
    });

    const normalizedUser = user ? {
      weight: user.weight ?? undefined,
      height: user.height ?? undefined,
      age: user.age ?? undefined,
      gender: user.gender ?? undefined,
      goals: user.goals ?? undefined,
    } : undefined;

    const targets = await getUserMacroTargets(drizzle, userId, normalizedUser, c.env.BIOMETRIC_CACHE);

    return c.json({ success: true, data: targets });
  });

  /**
   * Set/update macro targets (persisted override)
   * POST /nutrition/targets
   */
  /**
   * @swagger
   * /biometric/nutrition/targets:
   *   post:
   *     summary: Set nutrition targets
   *     description: Set or update custom macronutrient and calorie targets. These overrides will be used instead of auto-calculated values.
   *     tags: [biometric, nutrition]
   *     security:
   *       - bearer: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - calories
   *             properties:
   *               calories:
   *                 type: number
   *                 minimum: 1
   *               protein_g:
   *                 type: number
   *                 minimum: 0
   *               carbs_g:
   *                 type: number
   *                 minimum: 0
   *               fat_g:
   *                 type: number
   *                 minimum: 0
   *               water_ml:
   *                 type: number
   *                 minimum: 1
   *     responses:
   *       200:
   *         description: Targets set successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/MacroTargets'
   *       400:
   *         description: Invalid data
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Failed to set targets
   */
  router.post("/nutrition/targets", async (c) => {
    const authUser = baseRouter.getAuthUser(c);
    const userId = authUser.id;
    const drizzle = baseRouter.getDrizzle(c.env.DB);

    try {
      const body = await c.req.json();

      const validationSchema = z.object({
        calories: z.number().positive(),
        protein_g: z.number().nonnegative(),
        carbs_g: z.number().nonnegative(),
        fat_g: z.number().nonnegative(),
        water_ml: z.number().positive().optional(),
      });

      const validated = validationSchema.parse(body);

      await upsertUserMacroTargets(drizzle, userId, validated);

      // Invalidate any cached targets
      const cacheKey = getBiometricCacheKey(userId, "macro_targets");
      await c.env.BIOMETRIC_CACHE.delete(cacheKey);

      return c.json({ success: true, data: validated });
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new APIError(400, "VALIDATION_ERROR", "Validation error", { details: error.errors });
      }
      throw new APIError(500, "SET_MACRO_TARGETS_FAILED", "Failed to set macro targets");
    }
  });

  // ============================================
  // SENSOR READINGS (Mobile Data Ingestion)
  // ============================================

  /**
   * Receive batch sensor readings from mobile device
   * POST /readings/batch
   */
  /**
   * @swagger
   * /biometric/readings/batch:
   *   post:
   *     summary: Upload sensor readings batch
   *     description: Ingest multiple sensor readings (heart rate, steps, calories, etc.) from mobile devices. Used for HealthKit/Google Fit sync.
   *     tags: [biometric]
   *     security:
   *       - bearer: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - readings
   *             properties:
   *               readings:
   *                 type: array
   *                 description: Array of biometric sensor readings
   *                 items:
   *                   type: object
   *                   required:
   *                     - type
   *                     - value
   *                     - unit
   *                     - timestamp
   *                   properties:
   *                     type:
   *                       type: string
   *                       enum: [heart_rate, steps, calories, distance, active_minutes, blood_pressure_systolic, blood_pressure_diastolic, oxygen_saturation, respiratory_rate, blood_glucose, temperature, weight, body_fat_percentage, muscle_mass, hydration]
   *                     value:
   *                       type: number
   *                     unit:
   *                       type: string
   *                       description: Unit of measure (bpm, steps, kcal, m, %, mmHg, mg/dL, °C, kg, etc.)
   *                     timestamp:
   *                       type: number
   *                       format: int64
   *                     confidence:
   *                       type: number
   *                       minimum: 0
   *                       maximum: 1
   *                     source:
   *                       type: string
   *                       enum: [apple_health, google_fit, manual, wearable]
   *     responses:
   *       200:
   *         description: Readings received and stored
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 count:
   *                   type: integer
   *       400:
   *         description: Invalid request data
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Failed to store readings
   */
  router.post("/readings/batch", async (c) => {
    const authUser = baseRouter.getAuthUser(c);
    const userId = authUser.id;
    const drizzle = baseRouter.getDrizzle(c.env.DB);

    try {
      const body = await c.req.json();

      const validationSchema = z.array(z.object({
        timestamp: z.number().int(),
        type: z.enum(['hrv', 'heart_rate', 'resting_hr', 'steps', 'active_minutes', 'sleep']),
        value: z.number(),
        unit: z.string(),
        confidence: z.number().min(0).max(1).optional(),
        source: z.enum(['apple_health', 'google_fit', 'manual']),
      }));

      const readings = validationSchema.parse(body);

      // Store readings in sensor snapshots table
      await storeSensorReadings(drizzle, userId, readings as BiometricReading[]);

      return c.json({ success: true, received: readings.length });
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new APIError(400, "VALIDATION_ERROR", "Validation error", { details: error.errors });
      }
      throw new APIError(500, "STORE_READINGS_FAILED", "Failed to store sensor readings");
    }
  });

  return router;
};
