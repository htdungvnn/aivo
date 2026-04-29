import { Hono, type Context } from "hono";
import { z } from "zod";
import { createDrizzleInstance, workouts } from "@aivo/db";
import { eq, desc } from "drizzle-orm";
import type { D1Database } from "@cloudflare/workers-types";
import { authenticate, getUserFromContext, type AuthUser } from "../middleware/auth";
import { buildCacheKey, CACHE_TTL, createCacheHelper } from "../lib/cache-service";

export interface Env {
  DB: D1Database;
  QUERY_CACHE?: KVNamespace;
}

const WorkoutCreateSchema = z.object({
  type: z.enum(["strength", "cardio", "hiit", "yoga", "running", "cycling"]),
  duration: z.number().positive(),
  caloriesBurned: z.number().nonnegative().optional(),
  metrics: z.record(z.string(), z.number()).optional(),
});

export const WorkoutsRouter = () => {
  const router = new Hono<{ Bindings: Env }>();

  // Apply authentication to all workout routes
  router.use("*", authenticate);

  // Helper to get cache helper if available
  const getCacheHelper = (c: Context<{ Bindings: Env }>) => {
    return c.env.QUERY_CACHE ? createCacheHelper(c.env.QUERY_CACHE) : null;
  };

  // List workouts for authenticated user only
  /**
   * @swagger
   * /workouts:
   *   get:
   *     summary: List user workouts
   *     description: Retrieve all workout entries for the authenticated user
   *     tags: [workouts]
   *     security:
   *       - bearer: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 50
   *         description: Number of workouts to return
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           minimum: 0
   *           default: 0
   *         description: Offset for pagination
   *     responses:
   *       200:
   *         description: List of workouts
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Workout'
   *       401:
   *         description: Unauthorized
   */
  router.get("/", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;
    const drizzle = createDrizzleInstance(c.env.DB);
    const cacheHelper = getCacheHelper(c);

    const cacheKey = buildCacheKey("WORKOUTS", userId);

    // Try cache first if available
    if (cacheHelper) {
      const cachedWorkouts = await cacheHelper.get(cacheKey);
      if (cachedWorkouts) {
        return c.json(cachedWorkouts as unknown);
      }
    }

    const workoutList = await drizzle.query.workouts.findMany({
      where: eq(workouts.userId, userId),
      orderBy: desc(workouts.createdAt),
    });

    // Cache the result if cache is available
    if (cacheHelper) {
      await cacheHelper.set(cacheKey, workoutList, CACHE_TTL.WORKOUTS);
    }

    return c.json(workoutList);
  });

  // Create workout - userId must match authenticated user
  /**
   * @swagger
   * /workouts:
   *   post:
   *     summary: Create workout
   *     description: Log a new workout for the authenticated user
   *     tags: [workouts]
   *     security:
   *       - bearer: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - type
   *               - duration
   *             properties:
   *               type:
   *                 type: string
   *                 enum: [strength, cardio, hiit, yoga, running, cycling]
   *                 description: Workout type
   *               duration:
   *                 type: number
   *                 description: Duration in minutes
   *               caloriesBurned:
   *                 type: number
   *                 minimum: 0
   *                 description: Calories burned (optional)
   *               metrics:
   *                 type: object
   *                 additionalProperties:
   *                   type: number
   *                 description: Additional workout metrics (sets, reps, distance, etc.)
   *     responses:
   *       201:
   *         description: Workout created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Workout'
   *       400:
   *         description: Invalid request data
   *       401:
   *         description: Unauthorized
   */
  router.post("/", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;
    const body = await c.req.json();
    const validated = WorkoutCreateSchema.parse(body);
    const drizzle = createDrizzleInstance(c.env.DB);
    const cacheHelper = getCacheHelper(c);
    const cacheKey = buildCacheKey("WORKOUTS", userId);

    const [workout] = await drizzle
      .insert(workouts)
      .values({
        userId,
        ...validated,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        completedAt: null,
        metrics: validated.metrics ? JSON.stringify(validated.metrics) : null,
      })
      .returning();

    // Invalidate workout cache for this user
    if (cacheHelper) {
      await cacheHelper.invalidate(cacheKey);
    }

    return c.json(workout, 201);
  });

  return router;
};
