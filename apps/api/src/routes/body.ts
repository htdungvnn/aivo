import { Hono } from "hono";
import { z } from "zod";
import { createDrizzleInstance } from "@aivo/db";
import { validateBodyMetrics } from "../services/validation";
import type {
  BodyMetricResponse,
  HealthScoreResponse} from "../services/body-insights";
import {
  getCachedData,
  setCachedData,
  invalidateBodyCache,
  getCacheKey,
  CACHE_TTL,
  uploadImage,
  analyzeImageWithAI,
  generateHeatmapSVG,
  validateImage,
} from "../services/body-insights";
import { schema } from "@aivo/db/schema";
import type { D1Database } from "@cloudflare/workers-types";
import type { R2Bucket, KVNamespace } from "@cloudflare/workers-types";

interface EnvWithR2 {
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  BODY_INSIGHTS_CACHE: KVNamespace;
  OPENAI_API_KEY?: string;
}

export const BodyRouter = () => {
  const router = new Hono<{ Bindings: EnvWithR2 }>();

  // Upload body image to R2
  /**
   * @swagger
   * /body/upload:
   *   post:
   *     summary: Upload body image
   *     description: Upload a body photo for analysis
   *     tags: [body]
   *     security:
   *       - bearer: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               image:
   *                 type: string
   *                 format: binary
   *     responses:
   *       200:
   *         description: Image uploaded successfully
   *       400:
   *         description: Invalid image
   */
  router.post("/upload", async (c) => {
    const userId = c.req.header("X-User-Id");
    if (!userId) {
      return c.json({ success: false, error: "User ID required" }, 400);
    }

    try {
      const formData = await c.req.formData();
      const imageFile = formData.get("image") as File | null;

      if (!imageFile) {
        return c.json({ success: false, error: "No image provided" }, 400);
      }

      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const contentType = imageFile.type || "image/jpeg";

      const validation = validateImage(buffer);
      if (!validation.valid) {
        return c.json({ success: false, error: validation.error }, 400);
      }

      const filename = imageFile.name || `body-photo-${Date.now()}.jpg`;
      const { url, key } = await uploadImage(c.env.R2_BUCKET, {
        userId,
        image: buffer,
        filename,
        contentType,
        metadata: {
          source: "body-insight",
          uploadedBy: userId,
        },
      });

      return c.json({
        success: true,
        data: {
          imageUrl: url,
          key,
          userId,
          uploadedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Upload error:", error);
      return c.json({ success: false, error: "Upload failed" }, 500);
    }
  });

  // Analyze body image with AI vision
  /**
   * @swagger
   * /body/vision/analyze:
   *   post:
   *     summary: Analyze body image
   *     description: Use AI vision to analyze body composition and posture
   *     tags: [body]
   *     security:
   *       - bearer: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - imageUrl
   *             properties:
   *               imageUrl:
   *                 type: string
   *                 format: uri
   *               analyzeMuscles:
   *                 type: boolean
   *               analyzePosture:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Analysis complete
   */
  router.post("/vision/analyze", async (c) => {
    const drizzle = createDrizzleInstance(c.env.DB);
    const userId = c.req.header("X-User-Id");
    const authHeader = c.req.header("Authorization");

    if (!userId || !authHeader?.startsWith("Bearer ")) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    const user = await drizzle.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
    });

    if (!user) {
      return c.json({ success: false, error: "User not found" }, 404);
    }

    try {
      const body = await c.req.json();
      const { imageUrl, analyzeMuscles = true, analyzePosture = true } = z
        .object({
          imageUrl: z.string().url(),
          analyzeMuscles: z.boolean().optional(),
          analyzePosture: z.boolean().optional(),
        })
        .parse(body);

      const openaiKey = c.env.OPENAI_API_KEY;
      if (!openaiKey) {
        return c.json({ success: false, error: "AI service not configured" }, 503);
      }

      const analysis = await analyzeImageWithAI(openaiKey, imageUrl, {
        analyzeMuscles,
        analyzePosture,
      });

      const [savedAnalysis] = await drizzle
        .insert(schema.visionAnalyses)
        .values({
          id: crypto.randomUUID(),
          userId,
          imageUrl,
          processedUrl: analysis.processedUrl || null,
          analysis: JSON.stringify(analysis.analysis),
          confidence: analysis.confidence,
          createdAt: Date.now(),
        })
        .returning();

      const bodyComposition = analysis.analysis.bodyComposition;
      if (bodyComposition) {
        await drizzle.insert(schema.bodyMetrics).values({
          id: crypto.randomUUID(),
          userId,
          timestamp: Date.now(),
          bodyFatPercentage: bodyComposition.bodyFatEstimate,
          muscleMass: bodyComposition.muscleMassEstimate,
          bmi: user.weight && user.height ? user.weight / Math.pow(user.height / 100, 2) : null,
          source: "ai",
          notes: `Auto-generated from vision analysis ${savedAnalysis.id}`,
        });
      }

      await invalidateBodyCache(c.env.BODY_INSIGHTS_CACHE as any, userId);

      return c.json({
        success: true,
        data: {
          id: savedAnalysis.id,
          userId,
          imageUrl,
          processedUrl: savedAnalysis.processedUrl,
          analysis: analysis.analysis,
          confidence: analysis.confidence,
          createdAt: savedAnalysis.createdAt,
        },
      });
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error("Vision analysis error:", error);
      const message = error instanceof Error ? error.message : "Analysis failed";
      return c.json({ success: false, error: message }, 500);
    }
  });

  // Get body metrics history
  router.get("/metrics", async (c) => {
    const userId = c.req.header("X-User-Id");
    const authHeader = c.req.header("Authorization");

    if (!userId || !authHeader?.startsWith("Bearer ")) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    const drizzle = createDrizzleInstance(c.env.DB);

    try {
      const startDate = c.req.query("startDate")
        ? parseInt(c.req.query("startDate")!)
        : undefined;
      const endDate = c.req.query("endDate")
        ? parseInt(c.req.query("endDate")!)
        : undefined;
      const limit = parseInt(c.req.query("limit") || "100");

      const paramStr = `${startDate || ""}:${endDate || ""}:${limit}`;
      const cacheKey = getCacheKey(userId, "metrics", paramStr);

      const { data: cachedData, hit: cacheHit } = await getCachedData<BodyMetricResponse[]>(
        c.env.BODY_INSIGHTS_CACHE as any,
        cacheKey
      );

      if (cacheHit && cachedData) {
        c.header("X-Cache", "HIT");
        return c.json({ success: true, data: cachedData });
      }

      const metrics: BodyMetricResponse[] = await drizzle.query.bodyMetrics.findMany({
        where: (bm, { eq, gte, lte, and }) => {
          const conditions = [
            eq(bm.userId, userId),
            ...(startDate !== undefined ? [gte(bm.timestamp, startDate)] : []),
            ...(endDate !== undefined ? [lte(bm.timestamp, endDate)] : []),
          ];
          return conditions.length > 1 ? and(...conditions) : conditions[0];
        },
        orderBy: (bm, { desc }) => desc(bm.timestamp),
        limit,
      });

      await setCachedData(
        c.env.BODY_INSIGHTS_CACHE as any,
        cacheKey,
        metrics,
        CACHE_TTL.METRICS
      );

      c.header("X-Cache", "MISS");
      return c.json({ success: true, data: metrics });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Get metrics error:", error);
      return c.json({ success: false, error: "Failed to fetch metrics" }, 500);
    }
  });

  // Create manual body metric entry
  router.post("/metrics", async (c) => {
    const userId = c.req.header("X-User-Id");
    const authHeader = c.req.header("Authorization");

    if (!userId || !authHeader?.startsWith("Bearer ")) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    const drizzle = createDrizzleInstance(c.env.DB);

    try {
      const body = await c.req.json();
      const validated = z.object({
        weight: z.number().positive().optional(),
        bodyFatPercentage: z.number().positive().max(100).optional(),
        muscleMass: z.number().positive().optional(),
        boneMass: z.number().positive().optional(),
        waterPercentage: z.number().positive().max(100).optional(),
        bmi: z.number().positive().optional(),
        waistCircumference: z.number().positive().optional(),
        chestCircumference: z.number().positive().optional(),
        hipCircumference: z.number().positive().optional(),
        notes: z.string().optional(),
      }).parse(body);

      const user = await drizzle.query.users.findFirst({
        where: (u, { eq }) => eq(u.id, userId),
      });

      if (!user) {
        return c.json({ success: false, error: "User not found" }, 404);
      }

      const hasRequiredFields =
        validated.weight !== undefined ||
        validated.bodyFatPercentage !== undefined ||
        validated.muscleMass !== undefined;

      if (hasRequiredFields && user.height && user.age && user.gender) {
        const validationResult = await validateBodyMetrics({
          weight: validated.weight,
          bodyFatPercentage: validated.bodyFatPercentage,
          muscleMass: validated.muscleMass,
          height: user.height,
          age: user.age,
          gender: user.gender as "male" | "female",
          fitnessLevel: user.fitnessLevel || "beginner",
        });

        if (!validationResult.valid) {
          return c.json(
            {
              success: false,
              error: "Validation failed",
              details: validationResult.errors,
            },
            400
          );
        }
      }

      const [metric] = await drizzle
        .insert(schema.bodyMetrics)
        .values({
          id: crypto.randomUUID(),
          userId,
          timestamp: Date.now(),
          ...validated,
          source: "manual",
        })
        .returning();

      await invalidateBodyCache(c.env.BODY_INSIGHTS_CACHE as any, userId);

      return c.json({ success: true, data: metric }, 201);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Create metric error:", error);
      return c.json({ success: false, error: "Failed to create metric" }, 500);
    }
  });

  // Get body heatmap data
  router.get("/heatmaps", async (c) => {
    const userId = c.req.header("X-User-Id");
    const authHeader = c.req.header("Authorization");

    if (!userId || !authHeader?.startsWith("Bearer ")) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    const drizzle = createDrizzleInstance(c.env.DB);

    try {
      const limit = parseInt(c.req.query("limit") || "10");
      const cacheKey = getCacheKey(userId, "heatmaps", limit.toString());

      const { data: cachedData, hit: cacheHit } = await getCachedData<
        Array<{
          id: string;
          userId: string;
          timestamp: number;
          imageUrl: string;
          vectorData: unknown[] | null;
          metadata: unknown | null;
        }>
      >(c.env.BODY_INSIGHTS_CACHE as any, cacheKey);

      if (cacheHit && cachedData) {
        c.header("X-Cache", "HIT");
        return c.json({ success: true, data: cachedData });
      }

      const heatmaps = await drizzle.query.bodyHeatmaps.findMany({
        where: (bh, { eq }) => eq(bh.userId, userId),
        orderBy: (bh, { desc }) => desc(bh.createdAt),
        limit,
      });

      const parsed = heatmaps.map((h) => ({
        ...h,
        vectorData: h.vectorData ? JSON.parse(h.vectorData) : null,
      }));

      await setCachedData(
        c.env.BODY_INSIGHTS_CACHE as any,
        cacheKey,
        parsed,
        CACHE_TTL.HEATMAPS
      );

      c.header("X-Cache", "MISS");
      return c.json({ success: true, data: parsed });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Get heatmaps error:", error);
      return c.json({ success: false, error: "Failed to fetch heatmaps" }, 500);
    }
  });

  // Generate heatmap from vision analysis
  router.post("/heatmaps/generate", async (c) => {
    const userId = c.req.header("X-User-Id");
    const authHeader = c.req.header("Authorization");

    if (!userId || !authHeader?.startsWith("Bearer ")) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    const drizzle = createDrizzleInstance(c.env.DB);

    try {
      const body = await c.req.json();
      const { analysisId, vectorData } = z
        .object({
          analysisId: z.string(),
          vectorData: z.array(
            z.object({
              x: z.number().min(0).max(100),
              y: z.number().min(0).max(100),
              muscle: z.string(),
              intensity: z.number().min(0).max(1),
            })
          ),
        })
        .parse(body);

      const analysis = await drizzle.query.visionAnalyses.findFirst({
        where: (va, { eq }) => eq(va.id, analysisId),
      });

      if (!analysis) {
        return c.json({ success: false, error: "Analysis not found" }, 404);
      }

      const svgOverlay = generateHeatmapSVG(vectorData);
      const svgBuffer = Buffer.from(svgOverlay);
      await uploadImage(c.env.R2_BUCKET, {
        userId,
        image: svgBuffer,
        filename: `heatmap-${analysisId}.svg`,
        contentType: "image/svg+xml",
        metadata: {
          analysisId,
          type: "heatmap",
        },
      });

      // Insert heatmap - requires photoId, so we need to create a bodyPhotos entry first
      // For now, we'll use analysisId as a placeholder photoId (needs validation)
      const now = Math.floor(Date.now() / 1000);
      const [heatmap] = await drizzle
        .insert(schema.bodyHeatmaps)
        .values({
          id: crypto.randomUUID(),
          userId,
          photoId: analysisId, // TODO: Properly link to bodyPhotos
          regions: JSON.stringify(vectorData), // vectorData as regions
          metrics: JSON.stringify({ generatedAt: now }), // minimal metrics
          vectorData: JSON.stringify(vectorData),
          createdAt: now,
        })
        .returning();

      await invalidateBodyCache(c.env.BODY_INSIGHTS_CACHE as any, userId);

      return c.json({
        success: true,
        data: {
          ...heatmap,
          vectorData,
          regions: vectorData,
          metrics: heatmap.metrics ? JSON.parse(heatmap.metrics) : null,
        },
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Generate heatmap error:", error);
      return c.json({ success: false, error: "Failed to generate heatmap" }, 500);
    }
  });

  // Get health score
  router.get("/health-score", async (c) => {
    const userId = c.req.header("X-User-Id");
    const authHeader = c.req.header("Authorization");

    if (!userId || !authHeader?.startsWith("Bearer ")) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    const drizzle = createDrizzleInstance(c.env.DB);

    try {
      const cacheKey = getCacheKey(userId, "health-score");

      const { data: cachedData, hit: cacheHit } = await getCachedData<HealthScoreResponse>(
        c.env.BODY_INSIGHTS_CACHE as any,
        cacheKey
      );

      if (cacheHit && cachedData) {
        c.header("X-Cache", "HIT");
        return c.json({ success: true, data: cachedData });
      }

      const user = await drizzle.query.users.findFirst({
        where: (u, { eq }) => eq(u.id, userId),
      });

      if (!user) {
        return c.json({ success: false, error: "User not found" }, 404);
      }

      const latestMetric = await drizzle.query.bodyMetrics.findMany({
        where: (bm, { eq }) => eq(bm.userId, userId),
        orderBy: (bm, { desc }) => desc(bm.timestamp),
        limit: 1,
      });

      const metric = latestMetric[0];

      // Calculate health score (simplified)
      const factors: Record<string, number> = {};

      if (metric?.bmi) {
        const bmi = metric.bmi;
        if (bmi >= 18.5 && bmi <= 24.9) {
          factors.bmi = 1;
        } else if (bmi >= 25 && bmi <= 29.9) {
          factors.bmi = 0.7;
        } else if (bmi >= 30) {
          factors.bmi = 0.3;
        } else {
          factors.bmi = 0.5;
        }
      } else {
        factors.bmi = 0.5;
      }

      if (metric?.bodyFatPercentage) {
        const bf = metric.bodyFatPercentage;
        if (bf < 0.12) {
          factors.bodyFat = 0.8;
        } else if (bf >= 0.12 && bf <= 0.25) {
          factors.bodyFat = 1;
        } else if (bf > 0.25 && bf <= 0.30) {
          factors.bodyFat = 0.7;
        } else {
          factors.bodyFat = 0.3;
        }
      } else {
        factors.bodyFat = 0.5;
      }

      if (metric?.muscleMass && user?.weight) {
        const muscleRatio = metric.muscleMass / user.weight;
        if (muscleRatio >= 0.35 && muscleRatio <= 0.45) {
          factors.muscleMass = 1;
        } else if (muscleRatio >= 0.30 && muscleRatio < 0.35) {
          factors.muscleMass = 0.8;
        } else if (muscleRatio > 0.45 && muscleRatio <= 0.50) {
          factors.muscleMass = 0.9;
        } else {
          factors.muscleMass = 0.5;
        }
      } else {
        factors.muscleMass = 0.5;
      }

      const fitnessMap: Record<string, number> = {
        beginner: 0.4,
        intermediate: 0.7,
        advanced: 0.9,
        elite: 1.0,
      };
      factors.fitnessLevel = fitnessMap[user.fitnessLevel || "beginner"] || 0.4;

      const weights = { bmi: 0.25, bodyFat: 0.3, muscleMass: 0.3, fitnessLevel: 0.15 };
      const score =
        (factors.bmi * weights.bmi +
          factors.bodyFat * weights.bodyFat +
          factors.muscleMass * weights.muscleMass +
          factors.fitnessLevel * weights.fitnessLevel) *
        100;

      let category: HealthScoreResponse["category"];
      if (score >= 80) {
        category = "excellent";
      } else if (score >= 60) {
        category = "good";
      } else if (score >= 40) {
        category = "fair";
      } else {
        category = "poor";
      }

      const recommendations: string[] = [];
      if (factors.bmi < 0.7) {
        recommendations.push("Focus on maintaining a healthy weight range through balanced nutrition");
      }
      if (factors.bodyFat < 0.7) {
        recommendations.push("Consider adjusting macronutrient intake to optimize body composition");
      }
      if (factors.muscleMass < 0.7) {
        recommendations.push("Incorporate resistance training to build lean muscle mass");
      }
      if (recommendations.length === 0) {
        recommendations.push("Keep up your excellent health trajectory!");
      }

      const result = {
        success: true,
        data: {
          score: Math.round(score * 10) / 10,
          category,
          factors,
          recommendations,
        },
      };

      await setCachedData(
        c.env.BODY_INSIGHTS_CACHE as any,
        cacheKey,
        result.data,
        CACHE_TTL.HEALTH_SCORE
      );

      c.header("X-Cache", "MISS");
      return c.json(result);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Health score error:", error);
      return c.json({ success: false, error: "Failed to calculate health score" }, 500);
    }
  });

  return router;
};
