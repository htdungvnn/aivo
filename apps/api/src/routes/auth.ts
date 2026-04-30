import { Hono } from "hono";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import axios from "axios";
import type { D1Database } from "@cloudflare/workers-types";
import { createDrizzleInstance } from "@aivo/db";
import { eq } from "drizzle-orm";
import { sessions } from "@aivo/db/schema";
import { findOrCreateUser, signToken, createSession, verifyToken } from "../utils/auth";
import { BaseRouter } from "../lib/base-router";
import { APIError } from "../utils/errors";

export interface AuthEnv {
  AUTH_SECRET: string;
  DB: D1Database;
  GOOGLE_CLIENT_ID?: string;
  FACEBOOK_APP_ID?: string;
  OPENAI_API_KEY?: string;
}

const GoogleAuthRequest = z.object({
  token: z.string().min(1),
});

const FacebookAuthRequest = z.object({
  token: z.string().min(1),
});

export const AuthRouter = () => {
  // Use PublicRouter pattern (no authentication required)
  const baseRouter = new BaseRouter<AuthEnv>({ requireAuth: false });
  const router = baseRouter.getRouter();

  // Initialize Google OAuth client
  const getGoogleClient = (): OAuth2Client | null => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return null;
    }
    return new OAuth2Client(clientId);
  };

  // Google OAuth
  router.post("/google", async (c) => {
    const body = await c.req.json();
    const { token } = GoogleAuthRequest.parse(body);

    const googleClient = getGoogleClient();
    if (!googleClient) {
      throw new APIError(503, "GOOGLE_OAUTH_NOT_CONFIGURED", "Google OAuth not configured");
    }

    try {
      // Verify Google ID token
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();

      if (!payload) {
        throw new APIError(401, "INVALID_GOOGLE_TOKEN", "Invalid Google token");
      }

      const googleId = payload.sub;
      const email = payload.email;
      const name = payload.name || payload.email?.split("@")[0] || "User";
      const picture = payload.picture || null;

      if (!email) {
        throw new APIError(400, "EMAIL_NOT_PROVIDED", "Email not provided by Google");
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

      return c.json({
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
      });
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      // eslint-disable-next-line no-console
      console.error("Google auth error:", error);
      throw new APIError(401, "GOOGLE_AUTH_FAILED", "Google authentication failed");
    }
  });

  // Facebook OAuth
  router.post("/facebook", async (c) => {
    const body = await c.req.json();
    const { token } = FacebookAuthRequest.parse(body);

    // Check if Facebook OAuth is configured
    if (!process.env.FACEBOOK_APP_ID) {
      throw new APIError(503, "FACEBOOK_OAUTH_NOT_CONFIGURED", "Facebook OAuth not configured");
    }

    try {
      // Verify Facebook access token with Graph API
      const response = await axios.get(
        `https://graph.facebook.com/me?fields=id,email,first_name,last_name,picture&access_token=${token}`
      );

      if (!response.data || !response.data.id) {
        throw new APIError(401, "INVALID_FACEBOOK_TOKEN", "Invalid Facebook token");
      }

      const fbData = response.data;
      const facebookId = fbData.id;
      const email = fbData.email;
      const name = `${fbData.first_name || ""} ${fbData.last_name || ""}`.trim() || "User";
      const picture = fbData.picture?.data?.url || null;

      if (!email) {
        throw new APIError(400, "EMAIL_NOT_PROVIDED", "Email not provided by Facebook");
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

      return c.json({
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
      });
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      // eslint-disable-next-line no-console
      console.error("Facebook auth error:", error);
      throw new APIError(401, "FACEBOOK_AUTH_FAILED", "Facebook authentication failed");
    }
  });

  // Verify token
  router.post("/verify", async (c) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new APIError(401, "INVALID_TOKEN", "Invalid token");
    }

    const token = authHeader.slice(7);
    const drizzle = createDrizzleInstance(c.env.DB);

    try {
      const payload = await verifyToken(token, drizzle);
      if (!payload) {
        throw new APIError(401, "INVALID_TOKEN", "Invalid token");
      }

      // Get user details
      const session = await drizzle.query.sessions.findFirst({
        where: (tbl, { eq }) => eq(tbl.id, payload.sub),
      });

      if (!session) {
        throw new APIError(401, "SESSION_NOT_FOUND", "Session not found");
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
      throw new APIError(401, "TOKEN_VERIFICATION_FAILED", "Token verification failed");
    }
  });

  // Set session cookie (for httpOnly cookie auth)
  router.post("/set-session", async (c) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new APIError(401, "UNAUTHORIZED", "Unauthorized");
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
