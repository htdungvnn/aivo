import { Hono } from "hono";
import { z } from "zod";
import { OpenAPIHono } from "@hono/zod-openapi";

export interface AuthEnv {
  AUTH_SECRET: string;
  DB: D1Database;
  OPENAI_API_KEY?: string;
}

const GoogleAuthRequest = z.object({
  token: z.string().min(1),
});

const FacebookAuthRequest = z.object({
  token: z.string().min(1),
});

const AuthResponse = z.object({
  success: z.boolean(),
  data: z.object({
    token: z.string(),
    user: z.object({
      id: z.string(),
      email: z.string(),
      name: z.string().optional(),
      picture: z.string().optional(),
    }),
  }),
});

export const AuthRouter = () => {
  const router = new Hono<{ Bindings: AuthEnv }>();

  // Google OAuth
  /**
   * @swagger
   * /api/auth/google:
   *   post:
   *     summary: Authenticate with Google OAuth
   *     description: Verify Google ID token and create/find user
   *     tags: [auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - token
   *             properties:
   *               token:
   *                 type: string
   *                 description: Google ID token
   *     responses:
   *       200:
   *         description: Authentication successful
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/AuthResponse"
   *       401:
   *         description: Invalid token
   */
  router.post("/google", async (c) => {
    const body = await c.req.json();
    const validated = GoogleAuthRequest.parse(body);

    // TODO: Implement actual Google token verification
    // For now, return dummy response
    return c.json(
      AuthResponse.parse({
        success: true,
        data: {
          token: "dummy-jwt-token",
          user: {
            id: "1",
            email: "test@test.com",
            name: "Test User",
          },
        },
      })
    );
  });

  // Facebook OAuth
  /**
   * @swagger
   * /api/auth/facebook:
   *   post:
   *     summary: Authenticate with Facebook OAuth
   *     description: Verify Facebook access token and create/find user
   *     tags: [auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - token
   *             properties:
   *               token:
   *                 type: string
   *                 description: Facebook access token
   *     responses:
   *       200:
   *         description: Authentication successful
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/AuthResponse"
   */
  router.post("/facebook", async (c) => {
    const body = await c.req.json();
    const validated = FacebookAuthRequest.parse(body);

    // TODO: Implement actual Facebook token verification
    return c.json(
      AuthResponse.parse({
        success: true,
        data: {
          token: "dummy-jwt-token",
          user: {
            id: "1",
            email: "test@test.com",
            name: "Test User",
          },
        },
      })
    );
  });

  // Verify token
  /**
   * @swagger
   * /api/auth/verify:
   *   post:
   *     summary: Verify authentication token
   *     description: Verify JWT token and return authentication status
   *     tags: [auth]
   *     security:
   *       - bearer: []
   *     responses:
   *       200:
   *         description: Token is valid
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 valid:
   *                   type: boolean
   *       401:
   *         description: Invalid or missing token
   */
  router.post("/verify", async (c) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ success: false, error: "Invalid token" }, 401);
    }
    return c.json({ success: true, valid: true });
  });

  // Logout
  /**
   * @swagger
   * /api/auth/logout:
   *   post:
   *     summary: Logout user
   *     description: Invalidate current session/token
   *     tags: [auth]
   *     security:
   *       - bearer: []
   *     responses:
   *       200:
   *         description: Logged out successfully
   */
  router.post("/logout", async (c) => {
    // TODO: Implement token invalidation if using Redis/session store
    return c.json({ success: true });
  });

  return router;
};
