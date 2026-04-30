/**
 * Integration Test Database Setup
 *
 * Uses transaction rollback for test isolation.
 * Each test file gets its own transaction that rolls back after all tests.
 */

import { drizzle } from "drizzle-orm/d1";
import { DB } from "@cloudflare/workers-types";
import { eq } from "drizzle-orm";

// Global transaction storage
let testTx: ReturnType<typeof drizzle.transaction> | null = null;

/**
 * Initialize test database with a transaction that will be rolled back.
 * Call this in your test file's beforeAll hook.
 */
export async function initTestDb(envDb: DB) {
  // Create a transaction that we'll roll back at the end
  testTx = drizzle.transaction(envDb);

  // Apply migrations to the transaction database
  // Note: In production, migrations are already applied. For tests, we assume schema exists.
  // If needed, we can run migrations programmatically here.

  return testTx;
}

/**
 * Get the test transaction drizzle instance.
 * Use this in your tests instead of the regular drizzle.
 */
export function getTestDb() {
  if (!testTx) {
    throw new Error(
      "Test database not initialized. Call initTestDb() in beforeAll()."
    );
  }
  return testTx;
}

/**
 * Clean up test database by rolling back the transaction.
 * Call this in your test file's afterAll hook.
 */
export async function cleanupTestDb() {
  if (testTx) {
    await testTx.rollback();
    testTx = null;
  }
}

/**
 * Helper to seed test data within the transaction.
 */
export async function seedTestData(
  tx: ReturnType<typeof drizzle.transaction>,
  fixtures: Record<string, unknown[]>
) {
  for (const [table, rows] of Object.entries(fixtures)) {
    // Insert using the transaction
    for (const row of rows) {
      // Use raw SQL for simplicity in tests
      const columns = Object.keys(row).join(", ");
      const placeholders = Object.keys(row)
        .map((_, i) => `$${i + 1}`)
        .join(", ");
      const values = Object.values(row);

      await tx.execute(
        `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`,
        values
      );
    }
  }
}

/**
 * Helper to clear specific tables between test suites if needed.
 * Usually not necessary with transaction rollback, but useful for
 * tests that commit and need cleanup.
 */
export async function clearTables(tx: ReturnType<typeof drizzle.transaction>, tables: string[]) {
  for (const table of tables) {
    await tx.execute(`DELETE FROM ${table}`);
  }
}

/**
 * Create a test user and return the ID.
 */
export async function createTestUser(
  tx: ReturnType<typeof drizzle.transaction>,
  overrides: Partial<{
    id: string;
    email: string;
    name: string;
    fitnessLevel: string;
  }> = {}
) {
  const id = overrides.id || `test-user-${crypto.randomUUID()}`;
  await tx.execute(
    `INSERT INTO users (id, email, name, fitness_level, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      id,
      overrides.email || `test-${id}@example.com`,
      overrides.name || "Test User",
      overrides.fitnessLevel || "beginner",
      Date.now(),
      Date.now(),
    ]
  );
  return id;
}

/**
 * Assert that a user exists.
 */
export async function assertUserExists(
  tx: ReturnType<typeof drizzle.transaction>,
  userId: string
) {
  const result = await tx.execute(
    `SELECT id FROM users WHERE id = $1`,
    [userId]
  );
  if (result.results.length === 0) {
    throw new Error(`User ${userId} not found`);
  }
}
