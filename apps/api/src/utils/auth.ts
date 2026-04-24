/**
 * Authentication utilities for JWT token verification
 * Using jose library for secure JWT handling
 */

import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { schema} from "@aivo/db";
import { sessions, users } from "@aivo/db";
import { randomUUID } from "node:crypto";

// Secret key - should be at least 256 bits (32 bytes)
let secretKey: Uint8Array | null = null;

export function getSecretKey(): Uint8Array {
  if (!secretKey) {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      throw new Error("AUTH_SECRET environment variable is required");
    }
    // Ensure key is at least 32 bytes
    if (secret.length < 32) {
      throw new Error("AUTH_SECRET must be at least 32 characters");
    }
    secretKey = new TextEncoder().encode(secret);
  }
  return secretKey;
}

/**
 * Sign a JWT token
 */
export async function signToken(payload: { sub: string; userId: string; iat?: number; exp?: number }): Promise<string> {
  const secret = getSecretKey();
  const now = Math.floor(Date.now() / 1000);

  return await new SignJWT({
    sub: payload.sub,
    userId: payload.userId,
    iat: payload.iat || now,
    exp: payload.exp || now + 7 * 24 * 60 * 60, // 7 days default
  })
    .setProtectedHeader({ alg: "HS256" })
    .sign(secret);
}

/**
 * Verify a JWT token and return the payload
 */
export async function verifyToken(
  token: string,
  db?: DrizzleD1Database<typeof schema>
): Promise<{ sub: string; userId: string } | null> {
  try {
    const secret = getSecretKey();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    const { sub, userId } = payload as { sub: string; userId: string };

    // If database is provided, verify session exists
    if (db) {
      const session = await db.query.sessions.findFirst({
        where: eq(sessions.id, sub),
      });

      if (!session) {
        return null;
      }
    }

    return { sub, userId };
  } catch {
    // Any error during verification means token is invalid
    return null;
  }
}

/**
 * Create a session record in database
 */
export async function createSession(
  db: DrizzleD1Database<typeof schema>,
  userId: string,
  provider: "google" | "facebook",
  providerUserId: string,
  accessToken: string
): Promise<string> {
  const sessionId = randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    provider,
    providerUserId,
    accessToken,
    createdAt: now,
    updatedAt: now,
  });

  return sessionId;
}

/**
 * Find or create user from OAuth provider data
 */
export async function findOrCreateUser(
  db: DrizzleD1Database<typeof schema>,
  providerData: {
    providerId: string;
    email: string;
    name: string;
    picture?: string;
  }
): Promise<{ id: string; email: string; name: string; picture?: string }> {
  // Try to find existing user by email
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, providerData.email),
  });

  if (existingUser) {
    return {
      id: existingUser.id,
      email: existingUser.email,
      name: existingUser.name,
      picture: existingUser.picture ?? undefined,
    };
  }

  // Create new user
  const userId = randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await db.insert(users).values({
    id: userId,
    email: providerData.email,
    name: providerData.name,
    picture: providerData.picture || null,
    emailVerified: 1,
    onboardingCompleted: 0,
    receiveMonthlyReports: 1,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: userId,
    email: providerData.email,
    name: providerData.name,
    picture: providerData.picture,
  };
}
