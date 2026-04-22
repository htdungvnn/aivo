import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDrizzleInstance, users } from "@aivo/db";
import type { D1Database } from "drizzle-orm/d1";

export interface Env {
  DB: D1Database;
}

export const UsersRouter = () => {
  const router = new Hono<{ Bindings: Env }>();

  // Get all users
  /**
   * @swagger
   * /users:
   *   get:
   *     summary: List all users
   *     description: Retrieve all users from the database
   *     tags: [users]
   *     responses:
   *       200:
   *         description: List of users
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   id:
   *                     type: string
   *                   email:
   *                     type: string
   *                   name:
   *                     type: string
   */
  router.get("/", async (c) => {
    const drizzle = createDrizzleInstance(c.env.DB);
    const users = await drizzle.query.users.findMany();
    return c.json(users);
  });

  // Get user by ID
  /**
   * @swagger
   * /users/{id}:
   *   get:
   *     summary: Get user by ID
   *     description: Retrieve a specific user by their ID
   *     tags: [users]
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
   */
  router.get("/:id", async (c) => {
    const id = c.req.param("id");
    const drizzle = createDrizzleInstance(c.env.DB);
    const user = await drizzle.query.users.findFirst({
      where: eq(users.id, id),
    });
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    return c.json(user);
  });

  return router;
};
