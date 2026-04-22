import { Hono } from "hono";
import { z } from "zod";
import { createDrizzleInstance, workouts } from "@aivo/db";
import { eq, desc } from "drizzle-orm";
import type { D1Database } from "@cloudflare/workers-types";

export interface Env {
  DB: D1Database;
}

const WorkoutCreateSchema = z.object({
  userId: z.string(),
  type: z.enum(["strength", "cardio", "hiit", "yoga", "running", "cycling"]),
  duration: z.number().positive(),
  caloriesBurned: z.number().nonnegative().optional(),
  metrics: z.record(z.string(), z.number()).optional(),
});

export const WorkoutsRouter = () => {
  const router = new Hono<{ Bindings: Env }>();

  // List workouts
  /**
   * @swagger
   * /workouts:
   *   get:
   *     summary: List workouts
   *     description: Retrieve workouts, optionally filtered by user ID
   *     tags: [workouts]
   *     parameters:
   *       - in: query
   *         name: userId
   *         schema:
   *           type: string
   *         description: Filter workouts by user ID
   *     responses:
   *       200:
   *         description: List of workouts
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: "#/components/schemas/Workout"
   */
  router.get("/", async (c) => {
    const userId = c.req.query("userId");
    const drizzle = createDrizzleInstance(c.env.DB);
    const queryOptions: Parameters<typeof drizzle.query.workouts.findMany>[0] = {
      orderBy: desc(workouts.createdAt),
    };
    if (userId) {
      queryOptions.where = eq(workouts.userId, userId);
    }
    const workoutList = await drizzle.query.workouts.findMany(queryOptions);
    return c.json(workoutList);
  });

  // Create workout
  /**
   * @swagger
   * /workouts:
   *   post:
   *     summary: Create workout
   *     description: Log a new workout for a user
   *     tags: [workouts]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: "#/components/schemas/WorkoutCreate"
   *     responses:
   *       201:
   *         description: Workout created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/Workout"
   */
  router.post("/", async (c) => {
    const body = await c.req.json();
    const validated = WorkoutCreateSchema.parse(body);

    const drizzle = createDrizzleInstance(c.env.DB);
    const [workout] = await drizzle
      .insert(workouts)
      .values({
        ...validated,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        completedAt: null,
        metrics: validated.metrics ? JSON.stringify(validated.metrics) : null,
      })
      .returning();

    return c.json(workout, 201);
  });

  return router;
};
