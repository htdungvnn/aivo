/**
 * Authentication Middleware for AIVO API
 * Verifies JWT token from Authorization header and sets user context
 */

import type { Context } from "hono";
import { verifyToken } from "../utils/auth";
import { createDrizzleInstance } from "@aivo/db";

// Simple user type for context
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

// Unique context key
const CONTEXT_KEY = "auth-user";

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
    const drizzle = createDrizzleInstance(c.env.DB);
    const payload = await verifyToken(token, drizzle);
    if (!payload) {
      return c.json({ success: false, error: "Invalid token" }, 401);
    }

    // Get user details
    const session = await drizzle.query.sessions.findFirst({
      where: (tbl, { eq }) => eq(tbl.id, payload.sub),
    });

    if (!session) {
      return c.json({ success: false, error: "Session not found" }, 401);
    }

    const user = await drizzle.query.users.findFirst({
      where: (tbl, { eq }) => eq(tbl.id, payload.userId),
    });

    if (!user) {
      return c.json({ success: false, error: "User not found" }, 401);
    }

    // Store user in context using Hono's context set method
    (c as any)[CONTEXT_KEY] = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    return;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Auth error:", error);
    return c.json({ success: false, error: "Authentication failed" }, 401);
  }
}

/**
 * Get user from context
 */
export function getUserFromContext(c: Context): AuthUser | undefined {
  return (c as any)[CONTEXT_KEY];
}

/**
 * Optional authentication - doesn't fail if no token, returns null
 */
export async function optionalAuth(c: Context): Promise<AuthUser | null> {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);

  try {
    const drizzle = createDrizzleInstance(c.env.DB);
    const payload = await verifyToken(token, drizzle);
    if (!payload) {
      return null;
    }

    const user = await drizzle.query.users.findFirst({
      where: (tbl, { eq }) => eq(tbl.id, payload.userId),
    });

    if (!user) {
      return null;
    }

    return { id: user.id, email: user.email, name: user.name };
  } catch {
    return null;
  }
}
