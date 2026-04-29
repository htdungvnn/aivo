import { Hono } from "hono";
import { z } from "zod";
import { createDrizzleInstance } from "@aivo/db";
import { authenticate, getUserFromContext, type AuthUser } from "../middleware/auth";
import type { D1Database } from "@cloudflare/workers-types";
import { MetabolicTwin } from "@aivo/compute/aivo_compute_bg.js";

interface EnvWithBindings {
  DB: D1Database;
  // WASM bindings will be available via package import
}

export const MetabolicRouter = () => {
  const router = new Hono<{ Bindings: EnvWithBindings }>();

  // Apply authentication to all metabolic routes
  router.use("*", authenticate);

  // Request/Response schemas
  const GenerateSimulationSchema = z.object({
    historicalData: z.array(
      z.object({
        timestamp: z.number(),
        weightKg: z.number(),
        bodyFatPct: z.number(),
        muscleMassKg: z.number(),
        activityLevel: z.number().optional(),
        calorieIntake: z.number().optional(),
      })
    ),
    timeHorizonDays: z.number().min(1).max(120).default(30),
  });

  /**
   * Generate metabolic twin projections
   * POST /metabolic/simulate
   */
  /**
   * @swagger
   * /metabolic/simulate:
   *   post:
   *     summary: Generate metabolic twin simulation
   *     description: Project future body composition changes based on historical data using WASM-powered metabolic modeling
   *     tags: [metabolic]
   *     security:
   *       - bearer: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - historicalData
   *             properties:
   *               historicalData:
   *                 type: array
   *                 description: Array of historical body metrics
   *                 items:
   *                   type: object
   *                   required:
   *                     - timestamp
   *                     - weightKg
   *                     - bodyFatPct
   *                     - muscleMassKg
   *                   properties:
   *                     timestamp:
   *                       type: number
   *                       description: Unix timestamp in milliseconds
   *                     weightKg:
   *                       type: number
   *                       description: Weight in kilograms
   *                     bodyFatPct:
   *                       type: number
   *                       description: Body fat percentage
   *                     muscleMassKg:
   *                       type: number
   *                       description: Muscle mass in kilograms
   *                     activityLevel:
   *                       type: number
   *                       description: Activity level (1-5)
   *                     calorieIntake:
   *                       type: number
   *                       description: Daily calorie intake
   *               timeHorizonDays:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 120
   *                 default: 30
   *                 description: Projection timeline in days
   *     responses:
   *       200:
   *         description: Simulation generated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     projections:
   *                       type: array
   *                       items:
   *                         type: object
   *                     scenarios:
   *                       type: array
   *                       items:
   *                         type: object
   *       400:
   *         description: Insufficient historical data
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Simulation failed
   */
  router.post("/simulate", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;

    try {
      const body = await c.req.json();
      const validated = GenerateSimulationSchema.parse(body);

      // Get historical body metrics from database
      const db = createDrizzleInstance(c.env.DB);
      const { schema } = await import("@aivo/db/schema");
      const { desc, eq } = await import("drizzle-orm");

      const metrics = await db
        .select()
        .from(schema.bodyMetrics)
        .where(eq(schema.bodyMetrics.userId, userId))
        .orderBy(desc(schema.bodyMetrics.timestamp))
        .limit(100);

      if (metrics.length < 2) {
        return c.json(
          { success: false, error: "Insufficient historical data. Need at least 2 body metric entries." },
          400
        );
      }

      // Transform metrics to HistoricalPoint format
      const historicalData = metrics.map((m: unknown) => {
        const row = m as Record<string, unknown>;
        return {
          timestamp: row.timestamp as number,
          weightKg: row.weight ?? 0,
          bodyFatPct: row.bodyFatPercentage ?? 0,
          muscleMassKg: row.muscleMass ?? 0,
          activityLevel: row.activityLevel,
          calorieIntake: row.calorieIntake,
        };
      });

      // Call WASM simulation
      const historicalDataJson = JSON.stringify(historicalData);
      const resultJson = MetabolicTwin.generateSimulation(historicalDataJson, userId, validated.timeHorizonDays);
      const result = JSON.parse(resultJson);

      return c.json({ success: true, data: result });
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging is intentional
      console.error("Metabolic simulation error:", error);
      return c.json(
        { success: false, error: "Failed to generate simulation" },
        500
      );
    }
  });

  /**
   * Get available projection scenarios
   * GET /metabolic/scenarios
   */
  /**
   * @swagger
   * /metabolic/scenarios:
   *   get:
   *     summary: List metabolic projection scenarios
   *     description: Retrieve available projection scenarios for metabolic twin simulations
   *     tags: [metabolic]
   *     security:
   *       - bearer: []
   *     responses:
   *       200:
   *         description: List of scenarios
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     scenarios:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: string
   *                           name:
   *                             type: string
   *                           description:
   *                             type: string
   *       401:
   *         description: Unauthorized
   */
  router.get("/scenarios", async (c) => {
    return c.json({
      success: true,
      data: {
        scenarios: [
          {
            id: "consistent_performance",
            name: "Consistent Performance",
            description: "Projection based on continuing current habits",
          },
          {
            id: "potential_regression",
            name: "Potential Regression",
            description: "What happens if consistency drops",
          },
          {
            id: "best_case",
            name: "Best Case",
            description: "Optimal scenario with improved habits",
          },
          {
            id: "worst_case",
            name: "Worst Case",
            description: "If current trajectory deteriorates",
          },
        ],
      },
    });
  });

  return router;
};
