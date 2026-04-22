/**
 * Authentication Middleware for AIVO API
 * Verifies JWT token from Authorization header and sets user context
 */

import type { Context } from "hono";
import { decodeToken } from "../utils/auth";
import { createDrizzleInstance } from "@aivo/db";

// Simple user type for context
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

// Symbol for storing user in context
const USER_CONTEXT_KEY = Symbol("auth-user");

/**
 * Authenticate middleware - verifies JWT token and sets user in context
 * Uses Authorization: Bearer <token>
 */
export async function authenticate(c: Context) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  const token = authHeader.slice(7);

  try {
    // Decode token to get user ID
    const payload = decodeToken(token);
    if (!payload) {
      return c.json({ success: false, error: "Invalid token" }, 401);
    }

    // Verify session exists in database
    const drizzle = createDrizzleInstance(c.env.DB);
    const session = await drizzle.query.sessions.findFirst({
      where: (tbl, { eq }) => eq(tbl.id, payload.sub),
    });

    if (!session) {
      return c.json({ success: false, error: "Session not found" }, 401);
    }

    // Set user in context for downstream handlers
    const user: AuthUser = {
      id: payload.sub,
      email: session.providerUserId,
    };

    // Store user in context using a symbol
    (c as unknown as { [key: symbol]: AuthUser })[USER_CONTEXT_KEY] = user;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Auth error:", error);
    return c.json({ success: false, error: "Authentication failed" }, 401);
  }
}
