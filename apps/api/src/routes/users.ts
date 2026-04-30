import { z } from "zod";
import { createDrizzleInstance, users as usersTable } from "@aivo/db";
import { eq } from "drizzle-orm";
import type { D1Database } from "@cloudflare/workers-types";
import type { KVNamespace } from "@cloudflare/workers-types";
import { BaseRouter } from "../lib/base-router";
import { authenticate } from "../middleware/auth";
import type { AuthUser } from "../middleware/auth";

const UpdateUserSchema = z.object({
  name: z.string().optional(),
  age: z.number().int().positive().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  restingHeartRate: z.number().int().positive().optional(),
  maxHeartRate: z.number().int().positive().optional(),
  fitnessLevel: z.enum(["beginner", "intermediate", "advanced", "elite"]).optional(),
  goals: z.array(z.string()).optional(),
  picture: z.string().url().optional(),
});

export interface Env {
  DB: D1Database;
  QUERY_CACHE?: KVNamespace;
}

export const UsersRouter = () => {
  const baseRouter = new BaseRouter<Env>();
  const router = baseRouter.getRouter();

  // Apply authentication to all user routes
  router.use("*", authenticate);

  // Get current user's profile (authenticated user)
  router.get("/me", async (c) => {
    const authUser = baseRouter.getAuthUser(c);
    const drizzle = baseRouter.getDrizzle(c.env.DB);
    const cacheHelper = baseRouter.getCacheHelper(c);

    const cacheKey = baseRouter.buildCacheKey("USER_PROFILE", authUser.id);

    const user = await baseRouter.withCache(
      c,
      cacheKey,
      async () => {
        return await drizzle.query.users.findFirst({
          where: eq(usersTable.id, authUser.id),
        });
      },
      baseRouter.getCacheTtl("USER_PROFILE")
    );

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json(user);
  });

  // Get user by ID (only own data)
  router.get("/:id", async (c) => {
    const authUser = baseRouter.getAuthUser(c);
    const requestedId = c.req.param("id");

    if (authUser.id !== requestedId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const drizzle = baseRouter.getDrizzle(c.env.DB);
    const cacheKey = baseRouter.buildCacheKey("USER_PROFILE", requestedId);

    const user = await baseRouter.withCache(
      c,
      cacheKey,
      async () => {
        return await drizzle.query.users.findFirst({
          where: eq(usersTable.id, requestedId),
        });
      },
      baseRouter.getCacheTtl("USER_PROFILE")
    );

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json(user);
  });

  // Update current user profile
  router.patch("/me", async (c) => {
    const authUser = baseRouter.getAuthUser(c);
    const drizzle = baseRouter.getDrizzle(c.env.DB);
    const cacheKey = baseRouter.buildCacheKey("USER_PROFILE", authUser.id);

    try {
      const body = await c.req.json();
      const validated = UpdateUserSchema.parse(body);

      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(validated)) {
        if (value !== undefined) {
          const dbField = key.replace(/([A-Z])/g, "_$1").toLowerCase();
          updates[dbField] = value;
        }
      }

      if (Object.keys(updates).length === 0) {
        return c.json({ error: "No valid fields to update" }, 400);
      }

      updates.updatedAt = Math.floor(Date.now() / 1000);

      await drizzle
        .update(usersTable)
        .set(updates)
        .where(eq(usersTable.id, authUser.id))
        .run();

      // Invalidate cache
      await baseRouter.invalidateCache(c, cacheKey);

      const updatedUser = await drizzle.query.users.findFirst({
        where: eq(usersTable.id, authUser.id),
      });

      // Re-cache if available
      if (updatedUser) {
        await baseRouter.getCacheHelper(c)?.set(
          cacheKey,
          updatedUser,
          baseRouter.getCacheTtl("USER_PROFILE")
        );
      }

      return c.json(updatedUser);
    } catch (error) {
      console.error("Update user error:", error);
      return c.json({ error: "Failed to update user" }, 500);
    }
  });

  return router;
};
