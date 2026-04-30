import { z } from "zod";
import { createDrizzleInstance, workouts as workoutsTable } from "@aivo/db";
import { eq, desc } from "drizzle-orm";
import type { D1Database } from "@cloudflare/workers-types";
import type { KVNamespace } from "@cloudflare/workers-types";
import { BaseRouter } from "../lib/base-router";
import { authenticate } from "../middleware/auth";

const WorkoutCreateSchema = z.object({
  type: z.enum(["strength", "cardio", "hiit", "yoga", "running", "cycling"]),
  duration: z.number().positive(),
  caloriesBurned: z.number().nonnegative().optional(),
  metrics: z.record(z.string(), z.number()).optional(),
});

export interface Env {
  DB: D1Database;
  QUERY_CACHE?: KVNamespace;
}

export const WorkoutsRouter = () => {
  const baseRouter = new BaseRouter<Env>();
  const router = baseRouter.getRouter();

  // Apply authentication to all workout routes
  router.use("*", authenticate);

  // List workouts for authenticated user
  router.get("/", async (c) => {
    const authUser = baseRouter.getAuthUser(c);
    const drizzle = baseRouter.getDrizzle(c.env.DB);
    const cacheHelper = baseRouter.getCacheHelper(c);

    const cacheKey = baseRouter.buildCacheKey("WORKOUTS", authUser.id);

    const workoutList = await baseRouter.withCache(
      c,
      cacheKey,
      async () => {
        return await drizzle.query.workouts.findMany({
          where: eq(workoutsTable.userId, authUser.id),
          orderBy: desc(workoutsTable.createdAt),
        });
      },
      baseRouter.getCacheTtl("WORKOUTS")
    );

    return c.json(workoutList);
  });

  // Create workout
  router.post("/", async (c) => {
    const authUser = baseRouter.getAuthUser(c);
    const drizzle = baseRouter.getDrizzle(c.env.DB);
    const cacheHelper = baseRouter.getCacheHelper(c);
    const cacheKey = baseRouter.buildCacheKey("WORKOUTS", authUser.id);

    try {
      const body = await c.req.json();
      const validated = WorkoutCreateSchema.parse(body);

      const [workout] = await drizzle
        .insert(workoutsTable)
        .values({
          userId: authUser.id,
          ...validated,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          completedAt: null,
          metrics: validated.metrics ? JSON.stringify(validated.metrics) : null,
        })
        .returning();

      // Invalidate cache
      if (cacheHelper) {
        await cacheHelper.invalidate(cacheKey);
      }

      return c.json(workout, 201);
    } catch (error) {
      console.error("Create workout error:", error);
      return c.json({ error: "Failed to create workout" }, 500);
    }
  });

  return router;
};
