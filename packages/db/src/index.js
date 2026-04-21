import { drizzle } from "drizzle-orm/d1";
import { migrate } from "drizzle-orm/d1/migrator";
import { schema } from "./schema";
// Re-export all tables individually
export * from "./schema";
export async function migrateDb(db) {
    await migrate(drizzle(db, { schema }), { migrationsFolder: "./drizzle/migrations" });
}
export function createDrizzleInstance(db) {
    return drizzle(db, { schema });
}
