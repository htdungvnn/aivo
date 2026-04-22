import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDrizzleInstance, users } from "@aivo/db";
import type { D1Database } from "@cloudflare/workers-types";
import { authenticate, getUserFromContext, type AuthUser } from "../middleware/auth";

export interface Env {
  DB: D1Database;
}

export const UsersRouter = () => {
  const router = new Hono<{ Bindings: Env }>();

  // Apply authentication to all user routes
  router.use("*", authenticate);

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

    const user = await drizzle.query.users.findFirst({
      where: eq(users.id, authUser.id),
    });

    if (!user) {
      return c.json({ error: "User not found" }, 404);
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

    // Users can only access their own data
    if (authUser.id !== requestedId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const drizzle = createDrizzleInstance(c.env.DB);
    const user = await drizzle.query.users.findFirst({
      where: eq(users.id, requestedId),
    });

    if (!user) {
      return c.json({ error: "User not found" }, 404);
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

      return c.json(updatedUser);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Update user error:", error);
      return c.json({ error: "Failed to update user" }, 500);
    }
  });

  return router;
};
