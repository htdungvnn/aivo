/**
 * Authentication helper utilities for route handlers
 */

import { createDrizzleInstance } from "@aivo/db";
import { verifyToken } from "../utils/auth";
import type { Context } from "hono";

/**
 * Get authenticated user ID from Authorization header
 * Verifies JWT token and returns user ID
 * Throws error if not authenticated
 */
export async function getAuthenticatedUserId(c: Context): Promise<string> {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.slice(7);
  const drizzle = createDrizzleInstance(c.env.DB);
  const payload = await verifyToken(token, drizzle);

  if (!payload) {
    throw new Error("Invalid token");
  }

  return payload.userId;
}

/**
 * Get user from context (used after authenticate middleware)
 */
export function getUserIdFromContext(c: Context): string | undefined {
  const user = c.get("auth-user");
  return (user as { id?: string } | undefined)?.id;
}
