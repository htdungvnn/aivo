import { createDrizzleInstance } from "@aivo/db";
import type { D1Database } from "@cloudflare/workers-types";
import type { DrizzleD1Database } from "drizzle-orm/d1";

const drizzleCache = new Map<string, DrizzleD1Database<any>>();

/**
 * Get or create a cached Drizzle instance.
 * Caching is safe because Drizzle instances are lightweight wrappers around D1Database.
 * In Cloudflare Workers, the DB connection is managed by the platform and reused.
 */
export function getDrizzleInstance(db: D1Database): DrizzleD1Database<typeof import("@aivo/db").schema> {
  // Use the db object reference as cache key (stable across requests in same Worker instance)
  const cacheKey = `drizzle:${(db as any).__id || "default"}`;

  if (!drizzleCache.has(cacheKey)) {
    drizzleCache.set(cacheKey, createDrizzleInstance(db));
  }

  return drizzleCache.get(cacheKey)!;
}
