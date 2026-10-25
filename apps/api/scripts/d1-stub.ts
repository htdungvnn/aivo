import { createTestDatabase } from "../src/test-database.ts";

/**
 * An empty D1-shaped database for the schema generator.
 *
 * Better Auth compiles its migration plan against a real database: it
 * introspects the existing tables and only emits the DDL for what is
 * missing. A stub that reports no tables therefore produces the complete
 * `create table` script for a fresh database.
 *
 * The shape matters — Better Auth picks the D1 SQLite dialect by looking
 * for `batch`, `exec` and `prepare` on the object — so the same D1-shaped
 * facade the tests use is reused here.
 */
export function createEmptyD1Stub() {
  return createTestDatabase("");
}
