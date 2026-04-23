import { Hono } from "hono";
import { z } from "zod";
import type { Context } from "hono";
import type { D1Database } from "@cloudflare/workers-types";
import { LiveWorkoutService } from "../services/live-workout";
import { authenticate, getUserFromContext, type AuthUser } from "../middleware/auth";

// Validation schemas
const StartLiveWorkoutSchema = z.object({
  workoutTemplateId: z.string().optional(),
  name: z.string().min(1).max(100),
  targetRPE: z.number().min(1).max(10).optional(),
  idealRestSeconds: z.number().int().positive().optional(),
  hasSpotter: z.boolean().optional(),
});

const LogRPESchema = z.object({
  sessionId: z.string().min(1),
  setNumber: z.number().int().positive(),
  exerciseName: z.string().min(1),
  weight: z.number().positive().optional().nullable(),
  plannedReps: z.number().int().positive(),
  completedReps: z.number().int().positive(),
  rpe: z.number().min(1).max(10),
  restTimeSeconds: z.number().int().nonnegative(),
  notes: z.string().optional(),
});

const LiveAdjustmentSchema = z.object({
  sessionId: z.string().min(1),
  currentWeight: z.number().positive(),
  targetReps: z.number().int().positive(),
  remainingSets: z.number().int().nonnegative(),
  exerciseType: z.enum([
    "squat",
    "deadlift",
    "bench_press",
    "overhead_press",
    "lunge",
    "pull_up",
    "row",
    "other",
  ]),
  isWarmup: z.boolean(),
  hasSpotter: z.boolean(),
  recentRPERecords: z.array(
    z.object({
      rpe: z.number().min(1).max(10),
      weight: z.number().positive().optional(),
      repsCompleted: z.number().int().positive().optional(),
      restTimeSeconds: z.number().int().nonnegative().optional(),
      setNumber: z.number().int().positive(),
    })
  ),
});

interface Env {
  DB: D1Database;
}

export const liveWorkoutRouter = () => {
  const router = new Hono<{ Bindings: Env }>();

  // Apply authentication to all live workout routes
  router.use("*", authenticate);

  // POST /api/live-workout/start - Start a new live workout session
  router.post("/start", async (c: Context) => {
    try {
      const authUser = getUserFromContext(c) as AuthUser;
      const userId = authUser.id;

      const body = await c.req.json();
      const validation = StartLiveWorkoutSchema.safeParse(body);
      if (!validation.success) {
        return c.json(
          { success: false, error: "Invalid request", details: validation.error.flatten() },
          400
        );
      }

      const service = new LiveWorkoutService(c.env.DB);
      const session = await service.startSession(userId, validation.data);

      return c.json({ success: true, data: session });
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging is intentional
      console.error("Start live workout error:", error);
      return c.json(
        { success: false, error: "Failed to start session: " + String(error) },
        500
      );
    }
  });

  // GET /api/live-workout/session/:id - Get session state
  router.get("/session/:id", async (c: Context) => {
    try {
      const authUser = getUserFromContext(c) as AuthUser;
      const userId = authUser.id;

      const sessionId = c.req.param("id");
      const service = new LiveWorkoutService(c.env.DB);
      const session = await service.getSession(sessionId, userId);

      if (!session) {
        return c.json({ success: false, error: "Session not found" }, 404);
      }

      return c.json({ success: true, data: session });
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging is intentional
      console.error("Get session error:", error);
      return c.json(
        { success: false, error: "Failed to get session: " + String(error) },
        500
      );
    }
  });

  // POST /api/live-workout/log-rpe - Log RPE for a set
  router.post("/log-rpe", async (c: Context) => {
    try {
      const authUser = getUserFromContext(c) as AuthUser;
      const userId = authUser.id;

      const body = await c.req.json();
      const validation = LogRPESchema.safeParse(body);
      if (!validation.success) {
        return c.json(
          { success: false, error: "Invalid request", details: validation.error.flatten() },
          400
        );
      }

      const log: SetRPELog = {
        id: `rpe_${crypto.randomUUID()}`,
        sessionId: validation.data.sessionId,
        userId,
        setNumber: validation.data.setNumber,
        exerciseName: validation.data.exerciseName,
        weight: validation.data.weight,
        plannedReps: validation.data.plannedReps,
        completedReps: validation.data.completedReps,
        rpe: validation.data.rpe,
        restTimeSeconds: validation.data.restTimeSeconds,
        timestamp: Math.floor(Date.now() / 1000 * 1000),
        notes: validation.data.notes,
        createdAt: Math.floor(Date.now() / 1000 * 1000),
      };

      const service = new LiveWorkoutService(c.env.DB);
      await service.logRPE(log);

      return c.json({ success: true, data: log });
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging is intentional
      console.error("Log RPE error:", error);
      return c.json(
        { success: false, error: "Failed to log RPE: " + String(error) },
        500
      );
    }
  });

  // POST /api/live-workout/adjust - Get AI adjustment recommendation
  router.post("/adjust", async (c: Context) => {
    try {
      const authUser = getUserFromContext(c) as AuthUser;
      const userId = authUser.id;

      const body = await c.req.json();
      const validation = LiveAdjustmentSchema.safeParse(body);
      if (!validation.success) {
        return c.json(
          { success: false, error: "Invalid request", details: validation.error.flatten() },
          400
        );
      }

      const service = new LiveWorkoutService(c.env.DB);
      const result = await service.getLiveAdjustment(
        validation.data.sessionId,
        userId,
        validation.data
      );

      return c.json(result);
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging is intentional
      console.error("Live adjustment error:", error);
      return c.json(
        { success: false, error: "Failed to calculate adjustment: " + String(error) },
        500
      );
    }
  });

  // POST /api/live-workout/end - End a live workout session
  router.post("/session/:id/end", async (c: Context) => {
    try {
      const authUser = getUserFromContext(c) as AuthUser;
      const userId = authUser.id;

      const sessionId = c.req.param("id");
      const body = await c.req.json().catch(() => ({}));

      const service = new LiveWorkoutService(c.env.DB);
      const session = await service.endSession(
        sessionId,
        userId,
        body.reason,
        body.suggestion
      );

      if (!session) {
        return c.json({ success: false, error: "Session not found" }, 404);
      }

      return c.json({ success: true, data: session });
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging is intentional
      console.error("End session error:", error);
      return c.json(
        { success: false, error: "Failed to end session: " + String(error) },
        500
      );
    }
  });

  return router;
};
