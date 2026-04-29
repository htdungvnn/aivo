import { Hono, type Context } from "hono";
import { z } from "zod";
import { createDrizzleInstance } from "@aivo/db";
import { authenticate, getUserFromContext, type AuthUser } from "../middleware/auth";
import type { D1Database } from "@cloudflare/workers-types";
import { AvatarMorpher, MetabolicTwin } from "@aivo/compute/aivo_compute_bg.js";
import { createAIService, type ChatMessage } from "../utils/unified-ai-service";

interface EnvWithBindings {
  DB: D1Database;
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
}

// Schema for projection request
const ProjectionRequestSchema = z.object({
  timeHorizonDays: z.number().min(1).max(120).default(30),
  adherenceFactor: z.number().min(0).max(1).optional().default(1.0),
});

// Schema for calibrate request (optional, can auto-calibrate from latest metrics)
const CalibrateRequestSchema = z.object({
  avatarStyle: z.enum(["realistic", "stylized", "abstract"]).optional().default("realistic"),
  skinTone: z.string().optional(),
  showMuscleDefinitions: z.boolean().optional().default(true),
});

export const DigitalTwinRouter = () => {
  const router = new Hono<{ Bindings: EnvWithBindings }>();

  // Apply authentication to all digital twin routes
  router.use("*", authenticate);

  /**
   * Calibrate/update user's avatar model based on latest body metrics
   * POST /digital-twin/calibrate
   */
  router.post("/calibrate", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;

    try {
      const body = await c.req.json();
      const validated = CalibrateRequestSchema.parse(body);

      // Get user's latest body metrics
      const db = createDrizzleInstance(c.env.DB);
      const { schema } = await import("@aivo/db/schema");
      const { desc, eq } = await import("drizzle-orm");

      const latestMetric = await db
        .select()
        .from(schema.bodyMetrics)
        .where(eq(schema.bodyMetrics.userId, userId))
        .orderBy(desc(schema.bodyMetrics.timestamp))
        .limit(1)
        .then((rows) => rows[0]);

      if (!latestMetric) {
        return c.json(
          { success: false, error: "No body metrics found. Please add body measurements first." },
          400
        );
      }

      // Get user profile for height, age, gender
      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1)
        .then((rows) => rows[0]);

      if (!user) {
        return c.json({ success: false, error: "User not found" }, 404);
      }

      // Extract composition data
      const weight = latestMetric.weight ?? 0;
      const bodyFatPct = latestMetric.bodyFatPercentage ?? 0;
      const muscleMass = latestMetric.muscleMass ?? weight * (1 - bodyFatPct / 100) * 0.8; // Estimate if missing
      const heightCm = user.height ?? 170;
      const ageYears = user.age ?? 25;
      const gender = user.gender ?? "male";

      // Classify somatotype using WASM
      const somatotypeJson = AvatarMorpher.classifySomatotype(
        weight,
        heightCm,
        bodyFatPct,
        muscleMass,
        ageYears,
        gender
      );
      const somatotypeResult = JSON.parse(somatotypeJson);

      // Generate morph targets for current body state
      // First, we need a minimal projection (0 days ahead) to generate morph targets
      const currentComposition = {
        weight_kg: weight,
        body_fat_percentage: bodyFatPct,
        muscle_mass_kg: muscleMass,
        height_cm: heightCm,
        age_years: ageYears,
        gender: gender,
        timestamp: Date.now(),
      };

      // Get base projection from MetabolicTwin for consistency
      // We'll use a short-term projection to get the baseline
      const historicalData = [{
        timestamp: latestMetric.timestamp,
        weightKg: weight,
        bodyFatPct: bodyFatPct,
        muscleMassKg: muscleMass,
      }];

      const simulationJson = MetabolicTwin.generateSimulation(
        JSON.stringify(historicalData),
        userId,
        30
      );
      const simulation = JSON.parse(simulationJson);

      // Use the consistent_performance scenario as base
      const baseProjection = simulation.scenarios.consistent_performance[0];

      // Generate morph targets
      const morphTargetsJson = AvatarMorpher.generateMorphTargets(
        JSON.stringify(currentComposition),
        JSON.stringify(baseProjection)
      );
      const morphTargets = JSON.parse(morphTargetsJson);

      // Store/update avatar model in database
      const now = Math.floor(Date.now() / 1000);
      const avatarId = `av_${userId}_${now}`;

      await db.insert(schema.bodyAvatarModels).values({
        id: avatarId,
        userId: userId,
        createdAt: now,
        updatedAt: now,
        currentWeight: weight,
        currentBodyFatPct: bodyFatPct,
        currentMuscleMass: muscleMass,
        heightCm: heightCm,
        ageYears: ageYears,
        gender: gender,
        somatotype: somatotypeResult.somatotype,
        somatotypeConfidence: somatotypeResult.confidence,
        morphTargetsJson: JSON.stringify(morphTargets),
        avatarStyle: validated.avatarStyle,
        skinTone: validated.skinTone,
        showMuscleDefinitions: validated.showMuscleDefinitions ? 1 : 0,
      }).onConflictDoUpdate({
        target: schema.bodyAvatarModels.userId,
        set: {
          updatedAt: now,
          currentWeight: weight,
          currentBodyFatPct: bodyFatPct,
          currentMuscleMass: muscleMass,
          somatotype: somatotypeResult.somatotype,
          somatotypeConfidence: somatotypeResult.confidence,
          morphTargetsJson: JSON.stringify(morphTargets),
          avatarStyle: validated.avatarStyle,
          skinTone: validated.skinTone,
          showMuscleDefinitions: validated.showMuscleDefinitions ? 1 : 0,
        },
      });

      return c.json({
        success: true,
        data: {
          avatarModelId: avatarId,
          somatotype: somatotypeResult,
          morphTargets: morphTargets,
        },
      });
    } catch (_error) {
      return c.json(
        { success: false, error: "Failed to calibrate avatar model" },
        500
      );
    }
  });

  /**
   * Generate body projection with optional adherence adjustment
   * POST /digital-twin/project
   */
  router.post("/project", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;

    try {
      const body = await c.req.json();
      const validated = ProjectionRequestSchema.parse(body);

      // Get user's historical body metrics
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

      // Transform to historical data format
      const historicalData = metrics.map((m: unknown) => {
        const row = m as Record<string, unknown>;
        return {
          timestamp: row.timestamp as number,
          weightKg: row.weight ?? 0,
          bodyFatPct: row.bodyFatPercentage ?? 0,
          muscleMassKg: row.muscleMass ?? 0,
        };
      });

      // Get user for height/age/gender first
      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1)
        .then((rows) => rows[0]);

      if (!user) {
        return c.json({ success: false, error: "User not found" }, 404);
      }

      // Generate base simulation using WASM
      const historicalDataJson = JSON.stringify(historicalData);
      const resultJson = MetabolicTwin.generateSimulation(
        historicalDataJson,
        userId,
        validated.timeHorizonDays
      );
      const simulation = JSON.parse(resultJson);

      // Get the consistent_performance scenario as base
      const baseScenario = simulation.scenarios.consistent_performance;
      const baseProjection = baseScenario[baseScenario.length - 1]; // Final day projection

      // Apply adherence adjustment if needed
      let adjustedProjection = baseProjection;
      const adherenceFactor = validated.adherenceFactor;

      if (adherenceFactor < 1.0) {
        const adjustedJson = AvatarMorpher.adjustProjectionForAdherence(
          JSON.stringify(baseProjection),
          adherenceFactor
        );
        adjustedProjection = JSON.parse(adjustedJson);
      }

      // Generate morph targets for the projected state
      // Need current composition for reference
      const latestMetric = metrics[0] as unknown as Record<string, unknown>;
      const currentComposition = {
        weight_kg: latestMetric.weight ?? 0,
        body_fat_percentage: latestMetric.bodyFatPercentage ?? 0,
        muscle_mass_kg: latestMetric.muscleMass ?? 0,
        height_cm: user.height ?? 170,
        age_years: user.age ?? 25,
        gender: user.gender ?? "male",
        timestamp: Date.now(),
      };

      // Get user's avatar model for somatotype if available
      const avatarModel = await db
        .select({
          somatotype: schema.bodyAvatarModels.somatotype,
        })
        .from(schema.bodyAvatarModels)
        .where(eq(schema.bodyAvatarModels.userId, userId))
        .limit(1)
        .then((rows) => rows[0]);

      const morphTargetsJson = AvatarMorpher.generateMorphTargets(
        JSON.stringify(currentComposition),
        JSON.stringify(adjustedProjection)
      );
      const morphTargets = JSON.parse(morphTargetsJson);

      // Generate narrative using AI (with fallback to heuristic)
      const narrative = await generateProjectionNarrative(c, simulation, adjustedProjection, adherenceFactor, avatarModel?.somatotype ?? undefined);

      // Store projection in database
      const now = Math.floor(Date.now() / 1000);
      const projectionId = `proj_${userId}_${now}`;

      await db.insert(schema.bodyProjections).values({
        id: projectionId,
        userId: userId,
        createdAt: now,
        timeHorizonDays: validated.timeHorizonDays,
        adherenceFactor: adherenceFactor,
        baseProjectionJson: JSON.stringify(baseProjection),
        adjustedProjectionJson: JSON.stringify(adjustedProjection),
        projectedWeight: adjustedProjection.weight_kg,
        projectedBodyFatPct: adjustedProjection.body_fat_percentage,
        projectedMuscleMass: adjustedProjection.muscle_mass_kg,
        confidence: adjustedProjection.confidence,
        bestCaseWeight: simulation.scenarios.best_case[simulation.scenarios.best_case.length - 1].weight_kg,
        worstCaseWeight: simulation.scenarios.worst_case[simulation.scenarios.worst_case.length - 1].weight_kg,
        scenarioSpread: simulation.scenarios.best_case[0].weight_kg - simulation.scenarios.worst_case[0].weight_kg,
        morphTargetsJson: JSON.stringify(morphTargets),
        narrative: narrative,
        generatedBy: "wasm",
        expiresAt: now + 24 * 60 * 60, // 24 hours
      });

      return c.json({
        success: true,
        data: {
          projectionId,
          baseProjection: baseProjection,
          adjustedProjection: adjustedProjection,
          morphTargets: morphTargets,
          narrative: narrative,
          scenarios: {
            consistent_performance: baseScenario,
            best_case: simulation.scenarios.best_case,
            potential_regression: simulation.scenarios.potential_regression,
            worst_case: simulation.scenarios.worst_case,
          },
        },
      });
    } catch (_error) {
      return c.json(
        { success: false, error: "Failed to generate projection" },
        500
      );
    }
  });

  /**
   * Get stored projection by ID
   * GET /digital-twin/projections/:id
   */
  router.get("/projections/:id", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;
    const projectionId = c.req.param("id");

    try {
      const db = createDrizzleInstance(c.env.DB);
      const { schema } = await import("@aivo/db/schema");
      const { eq, and } = await import("drizzle-orm");

      const projection = await db
        .select()
        .from(schema.bodyProjections)
        .where(
          and(
            eq(schema.bodyProjections.id, projectionId),
            eq(schema.bodyProjections.userId, userId)
          )
        )
        .limit(1)
        .then((rows) => rows[0]);

      if (!projection) {
        return c.json({ success: false, error: "Projection not found" }, 404);
      }

      return c.json({
        success: true,
        data: {
          id: projection.id,
          timeHorizonDays: projection.timeHorizonDays,
          adherenceFactor: projection.adherenceFactor,
          adjustedProjection: projection.adjustedProjectionJson ? JSON.parse(projection.adjustedProjectionJson) : null,
          morphTargets: projection.morphTargetsJson ? JSON.parse(projection.morphTargetsJson) : null,
          narrative: projection.narrative,
          createdAt: projection.createdAt,
        },
      });
    } catch (_error) {
      return c.json(
        { success: false, error: "Failed to retrieve projection" },
        500
      );
    }
  });

  /**
   * Get user's current avatar model
   * GET /digital-twin/avatar-model
   */
  router.get("/avatar-model", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;

    try {
      const db = createDrizzleInstance(c.env.DB);
      const { schema } = await import("@aivo/db/schema");
      const { eq, desc } = await import("drizzle-orm");

      const avatarModel = await db
        .select()
        .from(schema.bodyAvatarModels)
        .where(eq(schema.bodyAvatarModels.userId, userId))
        .orderBy(desc(schema.bodyAvatarModels.updatedAt))
        .limit(1)
        .then((rows) => rows[0]);

      if (!avatarModel) {
        return c.json(
          { success: false, error: "No avatar model found. Please calibrate first." },
          404
        );
      }

      return c.json({
        success: true,
        data: {
          id: avatarModel.id,
          currentWeight: avatarModel.currentWeight,
          currentBodyFatPct: avatarModel.currentBodyFatPct,
          currentMuscleMass: avatarModel.currentMuscleMass,
          heightCm: avatarModel.heightCm,
          ageYears: avatarModel.ageYears,
          gender: avatarModel.gender,
          somatotype: avatarModel.somatotype,
          somatotypeConfidence: avatarModel.somatotypeConfidence,
          morphTargets: avatarModel.morphTargetsJson ? JSON.parse(avatarModel.morphTargetsJson) : null,
          avatarStyle: avatarModel.avatarStyle,
          skinTone: avatarModel.skinTone,
          showMuscleDefinitions: avatarModel.showMuscleDefinitions === 1,
          updatedAt: avatarModel.updatedAt,
        },
      });
    } catch (_error) {
      return c.json(
        { success: false, error: "Failed to retrieve avatar model" },
        500
      );
    }
  });

  return router;
};

// Helper function to generate human-readable narrative using AI
async function generateProjectionNarrative(
  c: Context<{ Bindings: EnvWithBindings }>,
  simulation: Record<string, unknown>,
  projection: Record<string, unknown>,
  adherenceFactor: number,
  userSomatotype?: string
): Promise<string> {
  const scenarios = simulation.scenarios as Record<string, Array<Record<string, unknown>>>;
  const finalConsistent = scenarios.consistent_performance[scenarios.consistent_performance.length - 1];
  const finalBest = scenarios.best_case[scenarios.best_case.length - 1];
  const finalWorst = scenarios.worst_case[scenarios.worst_case.length - 1];

  const weightChange = (projection.weight_kg as number) - (finalConsistent.weight_kg as number);
  const confidence = Math.round((projection.confidence as number) * 100);

  // Try AI narrative if API keys are configured
  const env = c.env as EnvWithBindings;
  if (env.OPENAI_API_KEY || env.GEMINI_API_KEY) {
    try {
      const aiService = createAIService({
        openaiApiKey: env.OPENAI_API_KEY,
        geminiApiKey: env.GEMINI_API_KEY,
        defaultProvider: 'auto',
        costOptimization: 'aggressive', // Use cheapest model for this task
        maxCostPerRequest: 0.10,
      });

      const prompt = `
You are an encouraging fitness coach. Generate a brief, motivating narrative (2-3 sentences) about a user's projected fitness outcome.

User Somatotype: ${userSomatotype || "unknown"}
Time Horizon: ${Math.round((projection.days_ahead as number) / 7)} weeks
Adherence Level: ${Math.round(adherenceFactor * 100)}%
Projected Weight Change: ${weightChange > 0 ? "+" : ""}${weightChange.toFixed(1)}kg
Projected Body Fat: ${(projection.body_fat_percentage as number).toFixed(1)}%
Confidence Level: ${confidence}%
Best-case vs Worst-case Spread: ${((finalBest.weight_kg as number) - (finalWorst.weight_kg as number)).toFixed(1)}kg

Write a personalized, positive, and actionable narrative that:
- Acknowledges the projected outcome
- Emphasizes the impact of adherence
- Mentions the confidence level appropriately
- Ends with an encouraging call to action

Keep it concise and motivating.
`;

      const messages: ChatMessage[] = [
        { role: "system", content: "You are an expert fitness coach who provides personalized, evidence-based guidance." },
        { role: "user", content: prompt },
      ];

      const response = await aiService.chat(messages, {
        temperature: 0.8,
        maxTokens: 150,
      });

      return response.content.trim();
    } catch {
      // Fall through to heuristic
    }
  }

  // Fallback heuristic narrative
  let narrative = `Based on your current trajectory${adherenceFactor < 1 ? ` with ${Math.round(adherenceFactor * 100)}% adherence` : ""}, `;

  if (adherenceFactor < 1.0) {
    narrative += `your projected outcome is moderated to reflect realistic consistency. `;
  }

  const weightDiff = weightChange;
  if (Math.abs(weightDiff) < 0.5) {
    narrative += "Your weight is projected to remain stable. ";
  } else if (weightDiff > 0) {
    narrative += `You're projected to gain ${Math.abs(weightDiff).toFixed(1)}kg. `;
  } else {
    narrative += `You're projected to lose ${Math.abs(weightDiff).toFixed(1)}kg. `;
  }

  narrative += `Your best-case scenario could result in ${((finalBest.weight_kg as number) - (finalWorst.weight_kg as number)).toFixed(1)}kg difference from worst-case. `;
  narrative += `Projection confidence: ${confidence}%.`;

  return narrative;
}
