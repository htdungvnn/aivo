/**
 * Database singleton instance
 * This module provides a cached Drizzle instance for convenience
 */

import { drizzle as createDrizzle } from "drizzle-orm/d1";
import type { D1Database } from "@cloudflare/workers-types";
import { schema } from "@aivo/db/schema";
import type { DrizzleD1Database } from "drizzle-orm/d1";

let cachedDb: DrizzleD1Database<typeof schema> | null = null;

/**
 * Get or create Drizzle instance
 * @param env - Cloudflare Workers environment with DB binding
 */
export function getDb(env: { DB: D1Database }) {
  if (!cachedDb) {
    cachedDb = createDrizzle(env.DB, { schema });
  }
  return cachedDb;
}

// For convenience, we can also export a function that creates a new instance
export { createDrizzle as drizzle };
