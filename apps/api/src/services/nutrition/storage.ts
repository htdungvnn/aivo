/**
 * Storage service for nutrition consultations
 * Handles persistence to D1 database
 */

import { and, eq } from "drizzle-orm";
import type { createDrizzleInstance } from "@aivo/db";
import { schema } from "@aivo/db/schema";
import type { StoredNutritionConsult } from "@aivo/shared-types";

/**
 * Save a nutrition consultation to the database
 */
export async function saveConsult(
  drizzle: ReturnType<typeof createDrizzleInstance>,
  consult: StoredNutritionConsult
): Promise<void> {
  const now = Date.now();

  await drizzle.insert(schema.nutritionConsults).values({
    id: consult.id,
    userId: consult.userId,
    sessionId: consult.sessionId,
    query: consult.query,
    context: consult.context as Record<string, unknown>,
    agentsConsulted: consult.agentsConsulted,
    responses: consult.responses as Record<string, unknown>[],
    synthesizedAdvice: consult.synthesizedAdvice,
    warnings: consult.warnings,
    processingTimeMs: consult.processingTimeMs,
    userRating: consult.userRating ?? null,
    feedback: consult.feedback ?? null,
    createdAt: Math.floor(consult.createdAt.getTime() / 1000),
    updatedAt: Math.floor(now / 1000),
  }).run();
}

/**
 * Get a specific consultation by user and session
 */
export async function getConsult(
  drizzle: ReturnType<typeof createDrizzleInstance>,
  userId: string,
  sessionId: string
): Promise<StoredNutritionConsult | null> {
  const result = await drizzle.query.nutritionConsults.findFirst({
    where: and(
      eq(schema.nutritionConsults.userId, userId),
      eq(schema.nutritionConsults.sessionId, sessionId)
    ),
  });

  if (!result) {
    return null;
  }

  return {
    id: result.id,
    userId: result.userId,
    sessionId: result.sessionId,
    query: result.query,
    context: result.context as StoredNutritionConsult["context"],
    agentsConsulted: result.agentsConsulted as Array<"chef" | "medical" | "budget">,
    responses: result.responses as StoredNutritionConsult["responses"],
    synthesizedAdvice: result.synthesizedAdvice,
    warnings: result.warnings,
    processingTimeMs: result.processingTimeMs,
    createdAt: new Date(result.createdAt * 1000),
    userRating: result.userRating ?? undefined,
    feedback: result.feedback ?? undefined,
  };
}

/**
 * Get all consultations for a user
 */
export async function getUserConsults(
  drizzle: ReturnType<typeof createDrizzleInstance>,
  userId: string,
  limit?: number
): Promise<StoredNutritionConsult[]> {
  const results = await drizzle.query.nutritionConsults.findMany({
    where: eq(schema.nutritionConsults.userId, userId),
    orderBy: (nc, { desc }) => desc(nc.createdAt),
    limit: limit ?? 50,
  });

  return results.map(result => ({
    id: result.id,
    userId: result.userId,
    sessionId: result.sessionId,
    query: result.query,
    context: result.context as StoredNutritionConsult["context"],
    agentsConsulted: result.agentsConsulted as Array<"chef" | "medical" | "budget">,
    responses: result.responses as StoredNutritionConsult["responses"],
    synthesizedAdvice: result.synthesizedAdvice,
    warnings: result.warnings,
    processingTimeMs: result.processingTimeMs,
    createdAt: new Date(result.createdAt * 1000),
    userRating: result.userRating ?? undefined,
    feedback: result.feedback ?? undefined,
  }));
}
