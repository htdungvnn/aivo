import type { DrizzleD1Database } from "drizzle-orm/d1";
import { schema } from "./schema";
export * from "./schema";
export declare function migrateDb(db: unknown): Promise<void>;
export declare function createDrizzleInstance(db: unknown): DrizzleD1Database<typeof schema>;
//# sourceMappingURL=index.d.ts.map