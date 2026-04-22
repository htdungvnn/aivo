import { Hono } from "hono";
import { z } from "zod";
import { createDrizzleInstance } from "@aivo/db";
import { authenticate, getUserFromContext, type AuthUser } from "../middleware/auth";
import type { D1Database } from "@cloudflare/workers-types";

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
      const historicalData = metrics.map((m: any) => ({
        timestamp: m.timestamp,
        weightKg: m.weight || 0,
        bodyFatPct: m.bodyFatPercentage || 0,
        muscleMassKg: m.muscleMass || 0,
        activityLevel: m.activityLevel,
        calorieIntake: m.calorieIntake,
      }));

      // Call WASM function
      // Note: In production, the WASM module will be imported from @aivo/compute
      // For now, we'll create a mock response structure
      const result = {
        userId,
        generatedAt: Date.now(),
        timeHorizonDays: validated.timeHorizonDays,
        currentMetrics: {
          weightKg: historicalData[historicalData.length - 1].weightKg,
          bodyFatPct: historicalData[historicalData.length - 1].bodyFatPct,
          muscleMassKg: historicalData[historicalData.length - 1].muscleMassKg,
          leanBodyMassKg: 0, // TODO: calculate from weight and body fat
          bmi: 0, // TODO: calculate from user profile height
          activityScore: 5,
        },
        trendAnalysis: {
          weightTrend: { slope: 0, intercept: 0, rSquared: 0, stdError: 0 },
          bodyFatTrend: { slope: 0, intercept: 0, rSquared: 0, stdError: 0 },
          muscleTrend: { slope: 0, intercept: 0, rSquared: 0, stdError: 0 },
          consistencyScore: 0,
          volatility: 0,
          trendStrength: 0,
        },
        scenarios: {
          consistentPerformance: {
            scenarioType: "consistent_performance",
            weightProjections: [],
            bodyFatProjections: [],
            muscleProjections: [],
            overallConfidence: 0,
            expectedBehaviorChange: "",
          },
          potentialRegression: {
            scenarioType: "potential_regression",
            weightProjections: [],
            bodyFatProjections: [],
            muscleProjections: [],
            overallConfidence: 0,
            expectedBehaviorChange: "",
          },
          bestCase: {
            scenarioType: "best_case",
            weightProjections: [],
            bodyFatProjections: [],
            muscleProjections: [],
            overallConfidence: 0,
            expectedBehaviorChange: "",
          },
          worstCase: {
            scenarioType: "worst_case",
            weightProjections: [],
            bodyFatProjections: [],
            muscleProjections: [],
            overallConfidence: 0,
            expectedBehaviorChange: "",
          },
        },
        recommendations: ["Metabolic twin simulation pending WASM integration"],
      };

      return c.json({ success: true, data: result });
    } catch (error) {
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
