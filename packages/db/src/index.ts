import { drizzle } from "drizzle-orm/d1";
import { migrate } from "drizzle-orm/d1/migrator";
import * as schema from "./schema";

export { schema };

export interface D1Database {
  exec: (statements: string[]) => Promise<{ success: boolean }>;
  prepare: (sql: string) => D1PreparedStatement;
}

export interface D1PreparedStatement {
  bind: (params: unknown[]) => D1PreparedStatement;
  first: () => Promise<unknown>;
  all: () => Promise<unknown[]>;
  run: () => Promise<{ success: boolean }>;
}

export async function migrateDb(db: D1Database) {
  await migrate(drizzle(db), { migrationsFolder: "./drizzle/migrations" });
}

export function createDrizzleInstance(db: D1Database) {
  return drizzle(db, { schema });
}
