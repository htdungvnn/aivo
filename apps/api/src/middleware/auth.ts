/**
 * Authentication Middleware for AIVO API
 * Verifies JWT token from Authorization header OR httpOnly cookie and sets user context
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

// Unique context key for storing auth user
const AUTH_USER_KEY = "auth-user";

/**
 * Authenticate middleware - verifies JWT token and sets user in context
 * Accepts token from:
 * 1. Authorization: Bearer <token> header
 * 2. auth_token httpOnly cookie
 */
export async function authenticate(c: Context): Promise<Response | void> {
  let token: string | null = null;

  // Try Authorization header first
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  }

  // Fall back to cookie
  if (!token) {
    const cookieHeader = c.req.header("Cookie");
    if (cookieHeader) {
      const cookies = parseCookies(cookieHeader);
      token = cookies.auth_token || null;
    }
  }

  if (!token) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

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

    // Store user in context using Hono's set method with Symbol key
    c.set(AUTH_USER_KEY, {
      id: user.id,
      email: user.email,
      name: user.name,
    });

    return;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Auth error:", error);
    return c.json({ success: false, error: "Authentication failed" }, 401);
  }
}

/**
 * Parse Cookie header into key-value pairs
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const [key, ...rest] = pair.trim().split("=");
    if (key) {
      cookies[key] = rest.join("=");
    }
  }
  return cookies;
}

/**
 * Get user from context
 */
export function getUserFromContext(c: Context): AuthUser | undefined {
  return c.get(AUTH_USER_KEY) as AuthUser | undefined;
}

/**
 * Optional authentication - doesn't fail if no token, returns null
 */
export async function optionalAuth(c: Context): Promise<AuthUser | null> {
  let token: string | null = null;

  // Try Authorization header first
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  }

  // Fall back to cookie
  if (!token) {
    const cookieHeader = c.req.header("Cookie");
    if (cookieHeader) {
      const cookies = parseCookies(cookieHeader);
      token = cookies.auth_token || null;
    }
  }

  if (!token) {
    return null;
  }

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
