import { Hono, type Context } from "hono";
import { eq } from "drizzle-orm";
import { createDrizzleInstance, users } from "@aivo/db";
import type { D1Database } from "@cloudflare/workers-types";
import { authenticate, getUserFromContext, type AuthUser } from "../middleware/auth";
import { buildCacheKey, CACHE_TTL, createCacheHelper } from "../lib/cache-service";

export interface Env {
  DB: D1Database;
  QUERY_CACHE?: KVNamespace;
}

export const UsersRouter = () => {
  const router = new Hono<{ Bindings: Env }>();

  // Apply authentication to all user routes
  router.use("*", authenticate);

  // Helper to get cache helper if available
  const getCacheHelper = (c: Context<{ Bindings: Env }>) => {
    return c.env.QUERY_CACHE ? createCacheHelper(c.env.QUERY_CACHE) : null;
  };

  // Get current user's profile (authenticated user)
  /**
   * @swagger
   * /users/me:
   *   get:
   *     summary: Get current user profile
   *     description: Retrieve the authenticated user's profile
   *     tags: [users]
   *     security:
   *       - bearer: []
   *     responses:
   *       200:
   *         description: User profile
   *       401:
   *         description: Unauthorized
   */
  router.get("/me", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const drizzle = createDrizzleInstance(c.env.DB);
    const cacheHelper = getCacheHelper(c);

    const cacheKey = buildCacheKey("USER_PROFILE", authUser.id);

    // Try cache first if available
    if (cacheHelper) {
      const cachedUser = await cacheHelper.get(cacheKey);
      if (cachedUser) {
        return c.json(cachedUser as unknown);
      }
    }

    const user = await drizzle.query.users.findFirst({
      where: eq(users.id, authUser.id),
    });

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Cache the result if cache is available
    if (cacheHelper) {
      await cacheHelper.set(cacheKey, user, CACHE_TTL.USER_PROFILE);
    }

    return c.json(user);
  });

  // Get user by ID (only own data or admin)
  /**
   * @swagger
   * /users/{id}:
   *   get:
   *     summary: Get user by ID
   *     description: Retrieve a specific user by their ID (only own data)
   *     tags: [users]
   *     security:
   *       - bearer: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID
   *     responses:
   *       200:
   *         description: User found
   *       404:
   *         description: User not found
   *       403:
   *         description: Forbidden (can only access own data)
   */
  router.get("/:id", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const requestedId = c.req.param("id");
    const cacheHelper = getCacheHelper(c);

    // Users can only access their own data
    if (authUser.id !== requestedId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const drizzle = createDrizzleInstance(c.env.DB);
    const cacheKey = buildCacheKey("USER_PROFILE", requestedId);

    // Try cache first if available
    if (cacheHelper) {
      const cachedUser = await cacheHelper.get(cacheKey);
      if (cachedUser) {
        return c.json(cachedUser as unknown);
      }
    }

    const user = await drizzle.query.users.findFirst({
      where: eq(users.id, requestedId),
    });

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Cache the result if cache is available
    if (cacheHelper) {
      await cacheHelper.set(cacheKey, user, CACHE_TTL.USER_PROFILE);
    }

    return c.json(user);
  });

  // Update current user profile
  /**
   * @swagger
   * /users/me:
   *   patch:
   *     summary: Update current user profile
   *     description: Update the authenticated user's profile
   *     tags: [users]
   *     security:
   *       - bearer: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               age:
   *                 type: integer
   *               gender:
   *                 type: string
   *               height:
   *                 type: number
   *               weight:
   *                 type: number
   *     responses:
   *       200:
   *         description: User updated
   */
  router.patch("/me", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const drizzle = createDrizzleInstance(c.env.DB);
    const cacheHelper = getCacheHelper(c);
    const cacheKey = buildCacheKey("USER_PROFILE", authUser.id);

    try {
      const body = await c.req.json();
      const updates: Record<string, unknown> = {};

      // Allow only specific fields to be updated
      const allowedFields = ["name", "age", "gender", "height", "weight", "restingHeartRate", "maxHeartRate", "fitnessLevel", "goals", "picture"];

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          // Convert camelCase to snake_case for database
          const dbField = field.replace(/([A-Z])/g, "_$1").toLowerCase();
          updates[dbField] = body[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        return c.json({ error: "No valid fields to update" }, 400);
      }

      updates.updatedAt = Math.floor(Date.now() / 1000);

      await drizzle
        .update(users)
        .set(updates)
        .where(eq(users.id, authUser.id))
        .run();

      const updatedUser = await drizzle.query.users.findFirst({
        where: eq(users.id, authUser.id),
      });

      // Invalidate cache and store updated value
      if (cacheHelper) {
        await cacheHelper.invalidate(cacheKey);
        if (updatedUser) {
          await cacheHelper.set(cacheKey, updatedUser, CACHE_TTL.USER_PROFILE);
        }
      }

      return c.json(updatedUser);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Update user error:", error);
      return c.json({ error: "Failed to update user" }, 500);
    }
  });

  return router;
};
