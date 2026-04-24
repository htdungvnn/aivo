import { Hono } from "hono";
import { z } from "zod";
import { createDrizzleInstance } from "@aivo/db";
import { eq } from "drizzle-orm";
import { schema } from "@aivo/db/schema";
import {
  getCachedBiometricData,
  getBiometricCacheKey,
  storeSensorReadings,
  type BiometricReading,
  type BiometricSnapshot,
} from "../services/biometric";
import {
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
import type { D1Database } from "@cloudflare/workers-types";
import type { KVNamespace } from "@cloudflare/workers-types";
import { authenticate, getUserFromContext, type AuthUser } from "../middleware/auth";

interface EnvWithKV {
  DB: D1Database;
  BIOMETRIC_CACHE: KVNamespace;
}

export const BiometricRouter = () => {
  const router = new Hono<{ Bindings: EnvWithKV }>();

  // Apply authentication to all biometric routes
  router.use("*", authenticate);

  // ============================================
  // SLEEP LOGS
  // ============================================

  /**
   * Create or update sleep log
   * POST /api/biometric/sleep
   */
  router.post("/sleep", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;
    const drizzle = createDrizzleInstance(c.env.DB);

    try {
      const body = await c.req.json();

      const schema = z.object({
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

      const validated = schema.parse(body);

      const sleepLog = await createSleepLog(drizzle, userId, validated);

      return c.json({ success: true, data: sleepLog }, 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({ success: false, error: "Validation error", details: error.errors }, 400);
      }
      return c.json({ success: false, error: "Failed to create sleep log" }, 500);
    }
  });

  /**
   * Update sleep log
   * PATCH /api/biometric/sleep/:id
   */
  router.patch("/sleep/:id", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;
    const drizzle = createDrizzleInstance(c.env.DB);
    const logId = c.req.param("id");

    try {
      const body = await c.req.json();

      const schema = z.object({
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

      const validated = schema.parse(body);

      const sleepLog = await updateSleepLog(drizzle, userId, logId, validated);

      if (!sleepLog) {
        return c.json({ success: false, error: "Sleep log not found" }, 404);
      }

      return c.json({ success: true, data: sleepLog });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({ success: false, error: "Validation error", details: error.errors }, 400);
      }
      return c.json({ success: false, error: "Failed to update sleep log" }, 500);
    }
  });

  /**
   * Get sleep logs with pagination
   * GET /api/biometric/sleep/history?limit=30&offset=0
   */
  router.get("/sleep/history", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;
    const drizzle = createDrizzleInstance(c.env.DB);

    const limit = parseInt(c.req.query("limit") || "30");
    const offset = parseInt(c.req.query("offset") || "0");

    const logs = await getSleepLogs(drizzle, userId, limit, offset);

    return c.json({ success: true, data: logs });
  });

  /**
   * Get sleep summary statistics
   * GET /api/biometric/sleep/summary?period=30d
   */
  router.get("/sleep/summary", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;
    const drizzle = createDrizzleInstance(c.env.DB);

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
  router.post("/snapshot/generate", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;
    const drizzle = createDrizzleInstance(c.env.DB);

    try {
      const body = await c.req.json();

      const schema = z.object({
        period: z.enum(["7d", "30d"]).default("7d"),
      });

      const { period } = schema.parse(body);

      // Generate snapshot (this will also store in DB)
      const snapshot = await getOrGenerateSnapshot(drizzle, userId, period, c.env.BIOMETRIC_CACHE);

      return c.json({ success: true, data: snapshot }, 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({ success: false, error: "Validation error", details: error.errors }, 400);
      }
      return c.json({ success: false, error: "Failed to generate snapshot" }, 500);
    }
  });

  /**
   * Get latest snapshot for period
   * GET /api/biometric/snapshot/:period
   */
  router.get("/snapshot/:period", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;
    const drizzle = createDrizzleInstance(c.env.DB);
    const period = c.req.param("period") as "7d" | "30d";

    if (period !== "7d" && period !== "30d") {
      return c.json({ success: false, error: "Period must be 7d or 30d" }, 400);
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
  router.get("/correlations", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;
    const drizzle = createDrizzleInstance(c.env.DB);

    const limit = parseInt(c.req.query("limit") || "10");
    const includeDismissed = c.req.query("includeDismissed") === "true";

    const findings = await getCorrelationFindings(drizzle, userId, limit, includeDismissed);

    return c.json({ success: true, data: findings });
  });

  /**
   * Dismiss correlation finding
   * PATCH /api/biometric/correlations/:id/dismiss
   */
  router.patch("/correlations/:id/dismiss", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;
    const drizzle = createDrizzleInstance(c.env.DB);
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
  router.get("/recovery-score", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;
    const drizzle = createDrizzleInstance(c.env.DB);

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
  router.get("/nutrition/targets", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;
    const drizzle = createDrizzleInstance(c.env.DB);

    // Get user profile for calculation if needed
    const user = await drizzle.query.users.findFirst({
      where: eq(schema.users.id, userId),
      columns: {
        weight: true,
        height: true,
        age: true,
        gender: true,
        goals: true,
      },
    });

    const targets = await getUserMacroTargets(drizzle, userId, user || undefined);

    return c.json({ success: true, data: targets });
  });

  /**
   * Set/update macro targets (persisted override)
   * POST /nutrition/targets
   */
  router.post("/nutrition/targets", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;
    const drizzle = createDrizzleInstance(c.env.DB);

    try {
      const body = await c.req.json();

      const schema = z.object({
        calories: z.number().positive(),
        protein_g: z.number().nonnegative(),
        carbs_g: z.number().nonnegative(),
        fat_g: z.number().nonnegative(),
        water_ml: z.number().positive().optional(),
      });

      const validated = schema.parse(body);

      await upsertUserMacroTargets(drizzle, userId, validated);

      // Invalidate any cached targets
      const cacheKey = getBiometricCacheKey(userId, "macro_targets");
      await c.env.BIOMETRIC_CACHE.delete(cacheKey);

      return c.json({ success: true, data: validated });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({ success: false, error: "Validation error", details: error.errors }, 400);
      }
      return c.json({ success: false, error: "Failed to set macro targets" }, 500);
    }
  });

  // ============================================
  // SENSOR READINGS (Mobile Data Ingestion)
  // ============================================

  /**
   * Receive batch sensor readings from mobile device
   * POST /readings/batch
   */
  router.post("/readings/batch", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;
    const drizzle = createDrizzleInstance(c.env.DB);

    try {
      const body = await c.req.json();

      const schema = z.array(z.object({
        timestamp: z.number().int(),
        type: z.enum(['hrv', 'heart_rate', 'resting_hr', 'steps', 'active_minutes', 'sleep']),
        value: z.number(),
        unit: z.string(),
        confidence: z.number().min(0).max(1).optional(),
        source: z.enum(['apple_health', 'google_fit', 'manual']),
      }));

      const readings = schema.parse(body);

      // Store readings in sensor snapshots table
      await storeSensorReadings(drizzle, userId, readings as BiometricReading[]);

      return c.json({ success: true, received: readings.length });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({ success: false, error: "Validation error", details: error.errors }, 400);
      }
      return c.json({ success: false, error: "Failed to store sensor readings" }, 500);
    }
  });

  return router;
};