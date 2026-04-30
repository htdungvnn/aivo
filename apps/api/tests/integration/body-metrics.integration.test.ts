/**
 * Integration Tests - Body Metrics API
 *
 * Tests the full request/response cycle with a local D1 database.
 * Uses transaction rollback for isolation.
 */

import { Hono } from "hono";
import { Context } from "hono";
import { describe, beforeAll, afterAll, test, expect } from "@jest/globals";
import { initTestDb, getTestDb, cleanupTestDb, createTestUser } from "../tests/setup-db";
import { userFactory } from "../tests/fixtures";
import { BodyRouter } from "../src/routes/body";
import type { Env } from "../src/routes/body";

// Helper to create test context
function createMockContext(
  db: ReturnType<typeof getTestDb>,
  env: Partial<Env>,
  userId: string
): Context<{ Bindings: Env }> {
  const c = new Context<{ Bindings: Env }>();
  c.env = {
    DB: db,
    R2_BUCKET: {} as any,
    R2_PUBLIC_URL: "https://test.r2.dev",
    BODY_INSIGHTS_CACHE: {} as any,
    ...env,
  } as Env;
  // Mock auth user in context
  (c as any).authUser = { id: userId };
  return c;
}

describe("Body Metrics Integration", () => {
  let testDb: ReturnType<typeof getTestDb>;
  let testUserId: string;

  beforeAll(async () => {
    // Initialize test database with transaction
    const envDb = (global as any).__TEST_DB__ || (await import("@aivo/db")).DB;
    testDb = await initTestDb(envDb);

    // Create test user
    testUserId = await createTestUser(testDb, {
      email: "integration-test@example.com",
      name: "Integration Test User",
    });
  });

  afterAll(async () => {
    // Rollback all changes
    await cleanupTestDb();
  });

  describe("POST /body/metrics", () => {
    test("should create body metric successfully", async () => {
      const router = new Hono<{ Bindings: Env }>();
      router.route("/", new BodyRouter());

      const c = createMockContext(testDb, {}, testUserId);

      const response = await c.req.json({
        weight: 70.5,
        bodyFatPercentage: 0.15,
        muscleMass: 25.0,
        bmi: 22.9,
        notes: "Integration test metric",
      });

      // Simulate request
      const result = await router.run(c, {
        method: "POST",
        url: "/body/metrics",
        body: JSON.stringify(response),
        headers: { "Content-Type": "application/json" },
      });

      expect(result.status).toBe(201);
      const body = await result.json();
      expect(body.success).toBe(true);
      expect(body.data).toMatchObject({
        userId: testUserId,
        weight: 70.5,
        bodyFatPercentage: 0.15,
        source: "manual",
      });
    });

    test("should reject invalid body fat percentage", async () => {
      const router = new Hono<{ Bindings: Env }>();
      router.route("/", new BodyRouter());

      const c = createMockContext(testDb, {}, testUserId);

      const response = await c.req.json({
        weight: 70.5,
        bodyFatPercentage: 1.5, // Invalid: > 1
        muscleMass: 25.0,
      });

      const result = await router.run(c, {
        method: "POST",
        url: "/body/metrics",
        body: JSON.stringify(response),
        headers: { "Content-Type": "application/json" },
      });

      expect(result.status).toBe(400);
      const body = await result.json();
      expect(body.error).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /body/metrics", () => {
    test("should retrieve paginated metrics history", async () => {
      // Seed test data
      const now = Date.now();
      const metrics = [
        { weight: 70, body_fat_percentage: 0.15, muscle_mass: 25, timestamp: now - 7 * 24 * 60 * 60 * 1000 },
        { weight: 70.5, body_fat_percentage: 0.14, muscle_mass: 25.5, timestamp: now - 3 * 24 * 60 * 60 * 1000 },
        { weight: 71, body_fat_percentage: 0.13, muscle_mass: 26, timestamp: now },
      ];

      for (const metric of metrics) {
        await testDb.execute(
          `INSERT INTO body_metrics (id, user_id, timestamp, weight, body_fat_percentage, muscle_mass, source)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [metric.id || `metric-${Date.now()}`, testUserId, metric.timestamp, metric.weight, metric.body_fat_percentage, metric.muscle_mass, "manual"]
        );
      }

      const router = new Hono<{ Bindings: Env }>();
      router.route("/", new BodyRouter());

      const c = createMockContext(testDb, {}, testUserId);

      const result = await router.run(c, {
        method: "GET",
        url: "/body/metrics?limit=10",
      });

      expect(result.status).toBe(200);
      const body = await result.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(3);
      // Should be ordered by timestamp DESC
      expect(body.data[0].timestamp).toBeGreaterThan(body.data[1].timestamp);
    });

    test("should respect date range filter", async () => {
      const router = new Hono<{ Bindings: Env }>();
      router.route("/", new BodyRouter());

      const c = createMockContext(testDb, {}, testUserId);
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();

      const result = await router.run(c, {
        method: "GET",
        url: `/body/metrics?startDate=${weekAgo}&endDate=${now}&limit=10`,
      });

      expect(result.status).toBe(200);
      const body = await result.json();
      expect(body.success).toBe(true);
      // All results should be within the date range
      for (const metric of body.data) {
        expect(metric.timestamp).toBeGreaterThanOrEqual(weekAgo);
        expect(metric.timestamp).toBeLessThanOrEqual(now);
      }
    });
  });

  describe("GET /body/health-score", () => {
    test("should calculate health score for user", async () => {
      // Create user profile
      await testDb.execute(
        `UPDATE users SET weight = 70, height = 175, age = 25, gender = 'male', fitness_level = 'intermediate' WHERE id = $1`,
        [testUserId]
      );

      // Create latest body metric
      await testDb.execute(
        `INSERT INTO body_metrics (id, user_id, timestamp, weight, body_fat_percentage, muscle_mass, bmi, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [`metric-${Date.now()}`, testUserId, Date.now(), 70, 0.15, 25, 22.9, "manual"]
      );

      const router = new Hono<{ Bindings: Env }>();
      router.route("/", new BodyRouter());

      const c = createMockContext(testDb, {}, testUserId);

      const result = await router.run(c, {
        method: "GET",
        url: "/body/health-score",
      });

      expect(result.status).toBe(200);
      const body = await result.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty("score");
      expect(body.data).toHaveProperty("category");
      expect(body.data).toHaveProperty("factors");
      expect(body.data).toHaveProperty("recommendations");
      expect(body.data.score).toBeGreaterThan(0);
      expect(body.data.score).toBeLessThanOrEqual(100);
    });
  });
});
