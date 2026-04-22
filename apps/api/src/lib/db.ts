/**
 * Database singleton instance
 * This module provides a cached Drizzle instance for convenience
 */

import { drizzle as createDrizzle, type D1Database } from "drizzle-orm/d1";
import { schema } from "@aivo/db/schema";

let cachedDb: ReturnType<typeof createDrizzle> | null = null;

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
