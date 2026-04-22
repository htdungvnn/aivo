import { Hono } from "hono";
import { z } from "zod";
import { createDrizzleInstance, workouts } from "@aivo/db";
import { eq, desc } from "drizzle-orm";
import type { D1Database } from "@cloudflare/workers-types";
import { authenticate, getUserFromContext, type AuthUser } from "../middleware/auth";

export interface Env {
  DB: D1Database;
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

  // List workouts for authenticated user only
  router.get("/", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;
    const drizzle = createDrizzleInstance(c.env.DB);
    const workoutList = await drizzle.query.workouts.findMany({
      where: eq(workouts.userId, userId),
      orderBy: desc(workouts.createdAt),
    });
    return c.json(workoutList);
  });

  // Create workout - userId must match authenticated user
  router.post("/", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;
    const body = await c.req.json();
    const validated = WorkoutCreateSchema.parse(body);

    const drizzle = createDrizzleInstance(c.env.DB);
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

    return c.json(workout, 201);
  });

  return router;
};
