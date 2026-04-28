import { Hono } from "hono";
import { z } from "zod";
import type { Context } from "hono";
import type { D1Database } from "@cloudflare/workers-types";
import { LiveWorkoutService } from "../services/live-workout";
import { authenticate, getUserFromContext, type AuthUser } from "../middleware/auth";
import type { SetRPELog } from "@aivo/shared-types";

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

export interface Env {
  DB: D1Database;
}

export const LiveWorkoutRouter = () => {
  const router = new Hono<{ Bindings: Env }>();

  // Apply authentication to all live workout routes
  router.use("*", authenticate);

  // POST /api/live-workout/start - Start a new live workout session
  /**
   * @swagger
   * /live-workout/start:
   *   post:
   *     summary: Start live workout session
   *     description: Initialize a new live workout session with optional template and RPE target
   *     tags: [live-workout]
   *     security:
   *       - bearer: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               workoutTemplateId:
   *                 type: string
   *                 description: Optional template ID to base session on
   *               name:
   *                 type: string
   *                 minLength: 1
   *                 maxLength: 100
   *                 description: Session name
   *               targetRPE:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 10
   *                 description: Target rate of perceived exertion
   *               idealRestSeconds:
   *                 type: integer
   *                 minimum: 1
   *                 description: Target rest time between sets
   *               hasSpotter:
   *                 type: boolean
   *                 description: Whether spotter is available
   *     responses:
   *       200:
   *         description: Session started successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/LiveWorkoutSession'
   *       400:
   *         description: Invalid request data
   *       401:
   *         description: Unauthorized
   */
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
  /**
   * @swagger
   * /live-workout/session/{id}:
   *   get:
   *     summary: Get live workout session
   *     description: Retrieve the current state of a live workout session
   *     tags: [live-workout]
   *     security:
   *       - bearer: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Session ID
   *     responses:
   *       200:
   *         description: Session state retrieved
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/LiveWorkoutSession'
   *       404:
   *         description: Session not found
   *       401:
   *         description: Unauthorized
   */
  router.get("/session/:id", async (c: Context) => {
    try {
      const authUser = getUserFromContext(c) as AuthUser;
      const userId = authUser.id;

      const sessionId = c.req.param("id");
      const service = new LiveWorkoutService(c.env.DB);
      const session = await service.getSession(sessionId!, userId);

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
  /**
   * @swagger
   * /live-workout/log-rpe:
   *   post:
   *     summary: Log RPE (Rate of Perceived Exertion)
   *     description: Record the perceived exertion for a completed set during a live workout
   *     tags: [live-workout]
   *     security:
   *       - bearer: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - sessionId
   *               - setNumber
   *               - exerciseName
   *               - completedReps
   *               - rpe
   *               - restTimeSeconds
   *             properties:
   *               sessionId:
   *                 type: string
   *                 description: Live workout session ID
   *               setNumber:
   *                 type: integer
   *                 minimum: 1
   *                 description: Set number in the workout
   *               exerciseName:
   *                 type: string
   *                 description: Name of the exercise
   *               weight:
   *                 type: number
   *                 minimum: 0
   *                 description: Weight used (optional)
   *               plannedReps:
   *                 type: integer
   *                 minimum: 1
   *                 description: Planned repetitions
   *               completedReps:
   *                 type: integer
   *                 minimum: 1
   *                 description: Actual repetitions completed
   *               rpe:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 10
   *                 description: Rate of Perceived Exertion (1-10)
   *               restTimeSeconds:
   *                 type: integer
   *                 minimum: 0
   *                 description: Rest time before next set
   *               notes:
   *                 type: string
   *                 description: Optional notes about the set
   *     responses:
   *       200:
   *         description: RPE logged successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/SetRPELog'
   *       400:
   *         description: Invalid request data
   *       401:
   *         description: Unauthorized
   */
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
        weight: validation.data.weight ?? null,
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
  /**
   * @swagger
   * /live-workout/adjust:
   *   post:
   *     summary: Get live workout adjustment
   *     description: AI-powered recommendation for weight/reps adjustments based on RPE history
   *     tags: [live-workout]
   *     security:
   *       - bearer: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - sessionId
   *               - currentWeight
   *               - targetReps
   *               - remainingSets
   *               - exerciseType
   *               - isWarmup
   *               - hasSpotter
   *               - recentRPERecords
   *             properties:
   *               sessionId:
   *                 type: string
   *               currentWeight:
   *                 type: number
   *                 minimum: 0
   *               targetReps:
   *                 type: integer
   *                 minimum: 1
   *               remainingSets:
   *                 type: integer
   *                 minimum: 0
   *               exerciseType:
   *                 type: string
   *                 enum: [squat, deadlift, bench_press, overhead_press, lunge, pull_up, row, other]
   *               isWarmup:
   *                 type: boolean
   *               hasSpotter:
   *                 type: boolean
   *               recentRPERecords:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     rpe:
   *                       type: integer
   *                       minimum: 1
   *                       maximum: 10
   *                     weight:
   *                       type: number
   *                     repsCompleted:
   *                       type: integer
   *                     restTimeSeconds:
   *                       type: integer
   *                     setNumber:
   *                       type: integer
   *     responses:
   *       200:
   *         description: Adjustment recommendation calculated
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/LiveAdjustment'
   *       400:
   *         description: Invalid request data
   *       401:
   *         description: Unauthorized
   */
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
  /**
   * @swagger
   * /live-workout/session/{id}/end:
   *   post:
   *     summary: End live workout session
   *     description: Complete a live workout session with optional summary
   *     tags: [live-workout]
   *     security:
   *       - bearer: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Session ID to end
   *     requestBody:
   *       required: false
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               reason:
   *                 type: string
   *                 description: Reason for ending (e.g., completed, early_stop, injury)
   *               suggestion:
   *                 type: string
   *                 description: AI suggestion for next session
   *     responses:
   *       200:
   *         description: Session ended successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/LiveWorkoutSession'
   *       404:
   *         description: Session not found
   *       401:
   *         description: Unauthorized
   */
  router.post("/session/:id/end", async (c: Context) => {
    try {
      const authUser = getUserFromContext(c) as AuthUser;
      const userId = authUser.id;

      const sessionId = c.req.param("id");
      const body = await c.req.json().catch(() => ({}));

      const service = new LiveWorkoutService(c.env.DB);
      const session = await service.endSession(
        sessionId!,
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
