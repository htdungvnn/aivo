import { drizzle } from "drizzle-orm/d1";
import { migrate } from "drizzle-orm/d1/migrator";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { schema } from "./schema";

// Re-export all tables individually
export * from "./schema";

export async function migrateDb(db: unknown) {
  await migrate(drizzle(db as any, { schema }), { migrationsFolder: "./drizzle/migrations" });
}

export function createDrizzleInstance(db: unknown): DrizzleD1Database<typeof schema> {
  return drizzle(db as any, { schema }) as DrizzleD1Database<typeof schema>;
}
