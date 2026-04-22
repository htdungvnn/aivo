/**
 * Authentication utilities for JWT token verification
 */

import jwt from "jwt-simple";
import { eq } from "drizzle-orm";
import { sessions } from "@aivo/db";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { schema } from "@aivo/db/schema";

/**
 * Verify a JWT token and return the payload
 */
export function decodeToken(token: string): { sub: string } | null {
  try {
    const payload = jwt.decode(token, process.env.AUTH_SECRET!);
    if (!payload || typeof payload !== "object") {
      return null;
    }
    return payload as { sub: string };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Token decode failed:", error);
    return null;
  }
}

/**
 * Verify a JWT token and return the user if valid
 * Requires database access to check session
 */
export async function verifyToken(
  token: string,
  db: DrizzleD1Database<typeof schema>
): Promise<{ id: string; email: string; name?: string } | null> {
  const payload = decodeToken(token);
  if (!payload) {
    return null;
  }

  const { sub: userId } = payload;

  try {
    // Verify session exists in database using Drizzle
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, userId))
      .limit(1)
      .first();

    if (!session) {
      return null;
    }

    // Return user info
    return {
      id: userId,
      email: session.providerUserId,
      name: session.providerUserId,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Session verification failed:", error);
    return null;
  }
}
