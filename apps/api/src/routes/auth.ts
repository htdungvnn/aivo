import { Hono } from "hono";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import axios from "axios";
import type { D1Database } from "@cloudflare/workers-types";
import { createDrizzleInstance, sessions } from "@aivo/db";
import { eq } from "drizzle-orm";
import { findOrCreateUser, signToken, createSession, verifyToken } from "../utils/auth";

export interface AuthEnv {
  AUTH_SECRET: string;
  DB: D1Database;
  GOOGLE_CLIENT_ID?: string;
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

  // Initialize Google OAuth client
  const getGoogleClient = (): OAuth2Client | null => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return null;
    }
    return new OAuth2Client(clientId);
  };

  // Google OAuth
  /**
   * @swagger
   * /api/auth/google:
   *   post:
   *     summary: Authenticate with Google OAuth
   *     description: Verify Google ID token and create/find user
   *     tags: [auth]
   *     security: []
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
    const { token } = GoogleAuthRequest.parse(body);

    const googleClient = getGoogleClient();
    if (!googleClient) {
      return c.json(
        { success: false, error: "Google OAuth not configured" },
        503
      );
    }

    try {
      // Verify Google ID token
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();

      if (!payload) {
        return c.json({ success: false, error: "Invalid Google token" }, 401);
      }

      const googleId = payload.sub;
      const email = payload.email;
      const name = payload.name || payload.email?.split("@")[0] || "User";
      const picture = payload.picture || null;

      if (!email) {
        return c.json({ success: false, error: "Email not provided by Google" }, 400);
      }

      const drizzle = createDrizzleInstance(c.env.DB);

      // Find or create user
      const user = await findOrCreateUser(drizzle, {
        providerId: googleId,
        email,
        name,
        picture: picture || undefined,
      });

      // Create session
      const sessionId = await createSession(drizzle, user.id, "google", googleId, token);

      // Sign JWT
      const jwtToken = await signToken({
        sub: sessionId,
        userId: user.id,
      });

      return c.json(
        AuthResponse.parse({
          success: true,
          data: {
            token: jwtToken,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              picture: user.picture,
            },
          },
        })
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Google auth error:", error);
      return c.json(
        { success: false, error: "Google authentication failed" },
        401
      );
    }
  });

  // Facebook OAuth
  /**
   * @swagger
   * /api/auth/facebook:
   *   post:
   *     summary: Authenticate with Facebook OAuth
   *     description: Verify Facebook access token and create/find user
   *     tags: [auth]
   *     security: []
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
    const { token } = FacebookAuthRequest.parse(body);

    try {
      // Verify Facebook access token with Graph API
      const response = await axios.get(
        `https://graph.facebook.com/me?fields=id,email,first_name,last_name,picture&access_token=${token}`
      );

      if (!response.data || !response.data.id) {
        return c.json({ success: false, error: "Invalid Facebook token" }, 401);
      }

      const fbData = response.data;
      const facebookId = fbData.id;
      const email = fbData.email;
      const name = `${fbData.first_name || ""} ${fbData.last_name || ""}`.trim() || "User";
      const picture = fbData.picture?.data?.url || null;

      if (!email) {
        return c.json({ success: false, error: "Email not provided by Facebook" }, 400);
      }

      const drizzle = createDrizzleInstance(c.env.DB);

      // Find or create user
      const user = await findOrCreateUser(drizzle, {
        providerId: facebookId,
        email,
        name,
        picture,
      });

      // Create session
      const sessionId = await createSession(drizzle, user.id, "facebook", facebookId, token);

      // Sign JWT
      const jwtToken = await signToken({
        sub: sessionId,
        userId: user.id,
      });

      return c.json(
        AuthResponse.parse({
          success: true,
          data: {
            token: jwtToken,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              picture: user.picture,
            },
          },
        })
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Facebook auth error:", error);
      return c.json(
        { success: false, error: "Facebook authentication failed" },
        401
      );
    }
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
   *                 user:
   *                   type: object
   *       401:
   *         description: Invalid or missing token
   */
  router.post("/verify", async (c) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ success: false, error: "Invalid token" }, 401);
    }

    const token = authHeader.slice(7);
    const drizzle = createDrizzleInstance(c.env.DB);

    try {
      const payload = await verifyToken(token, drizzle);
      if (!payload) {
        return c.json({ success: false, valid: false }, 401);
      }

      // Get user details
      const session = await drizzle.query.sessions.findFirst({
        where: (tbl, { eq }) => eq(tbl.id, payload.sub),
      });

      if (!session) {
        return c.json({ success: false, valid: false }, 401);
      }

      const user = await drizzle.query.users.findFirst({
        where: (tbl, { eq }) => eq(tbl.id, payload.userId),
      });

      return c.json({
        success: true,
        valid: true,
        user: {
          id: user?.id,
          email: user?.email,
          name: user?.name,
          picture: user?.picture,
        },
      });
    } catch {
      return c.json({ success: false, valid: false }, 401);
    }
  });

  // Set session cookie (for httpOnly cookie auth)
  /**
   * @swagger
   * /api/auth/set-session:
   *   post:
   *     summary: Set session cookie
   *     description: Set httpOnly cookie for session (server-side only)
   *     tags: [auth]
   *     security:
   *       - bearer: []
   *     responses:
   *       200:
   *         description: Cookie set successfully
   */
  router.post("/set-session", async (c) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    const token = authHeader.slice(7);

    // Set httpOnly cookie
    const cookieValue = token;
    c.header(
      "Set-Cookie",
      `auth_token=${cookieValue}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`
    );

    return c.json({ success: true });
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
    const authHeader = c.req.header("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      try {
        const drizzle = createDrizzleInstance(c.env.DB);
        const payload = await verifyToken(token, drizzle);
        if (payload) {
          // Delete session to invalidate token
          await drizzle.delete(sessions).where(eq(sessions.id, payload.sub));
        }
      } catch {
        // Continue with logout even if token verification fails
      }
    }

    // Clear cookie
    c.header(
      "Set-Cookie",
      "auth_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0"
    );

    return c.json({ success: true });
  });

  return router;
};
