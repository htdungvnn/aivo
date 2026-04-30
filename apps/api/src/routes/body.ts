import { z } from "zod";
import { createDrizzleInstance } from "@aivo/db";
import { eq, desc, gte, lte, and } from "drizzle-orm";
import { validateBodyMetrics } from "../services/validation";
import type {
  BodyMetricResponse,
  HealthScoreResponse,
} from "../services/body-insights";
import {
  uploadImage,
  analyzeImageWithAI,
  generateHeatmapSVG,
  validateImage,
  invalidateBodyCache,
} from "../services/body-insights";
import { schema } from "@aivo/db/schema";
import type { D1Database, KVNamespace, R2Bucket } from "@cloudflare/workers-types";
import { BaseRouter, type BaseEnv } from "../lib/base-router";
import { APIError } from "../utils/errors";

interface Env extends BaseEnv {
  R2_BUCKET: R2Bucket;
  R2_PUBLIC_URL: string;
  BODY_INSIGHTS_CACHE: KVNamespace;
  OPENAI_API_KEY?: string;
}

export const BodyRouter = () => {
  const baseRouter = new BaseRouter<Env>();
  const router = baseRouter.getRouter();

  // Upload body image to R2
  /**
   * @swagger
   * /body/upload:
   *   post:
   *     summary: Upload body image
   *     description: Upload a body photo for analysis and storage in R2. The image can be used for AI vision analysis and body composition estimation.
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
   *                 description: Body image file (JPEG, PNG, WebP supported)
   *             required:
   *               - image
   *     responses:
   *       200:
   *         description: Image uploaded successfully
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
   *                     imageUrl:
   *                       type: string
   *                       format: uri
   *                     key:
   *                       type: string
   *                     userId:
   *                       type: string
   *                     uploadedAt:
   *                       type: string
   *                       format: date-time
   *       400:
   *         description: Invalid image or validation failed
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Upload failed
   */
  router.post("/upload", async (c) => {
    const authUser = baseRouter.getAuthUser(c);
    const userId = authUser.id;

    try {
      const formData = await c.req.formData();
      const imageFile = formData.get("image") as File | null;

      if (!imageFile) {
        throw new APIError(400, "NO_IMAGE_PROVIDED", "No image provided");
      }

      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const contentType = imageFile.type || "image/jpeg";

      const validation = validateImage(buffer);
      if (!validation.valid) {
        throw new APIError(400, "INVALID_IMAGE", validation.error || "Invalid image");
      }

      const filename = imageFile.name || `body-photo-${Date.now()}.jpg`;
      const { key } = await uploadImage(c.env.R2_BUCKET, {
        userId,
        image: buffer,
        filename,
        contentType,
        metadata: {
          source: "body-insight",
          uploadedBy: userId,
        },
      });

      const baseUrl = c.env.R2_PUBLIC_URL?.replace(/\/$/, "") || "";
      const imageUrl = `${baseUrl}/${key}`;

      return c.json({
        success: true,
        data: {
          imageUrl,
          key,
          userId,
          uploadedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      // eslint-disable-next-line no-console
      console.error("Upload error:", error);
      throw new APIError(500, "UPLOAD_FAILED", "Upload failed");
    }
  });

  // Analyze body image with AI vision
  /**
   * @swagger
   * /body/vision/analyze:
   *   post:
   *     summary: Analyze body image with AI
   *     description: Use OpenAI vision to analyze body composition, muscle definition, and posture from an image URL. Results are stored and also generate body metric entries.
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
   *                 description: Publicly accessible image URL
   *               analyzeMuscles:
   *                 type: boolean
   *                 default: true
   *                 description: Whether to analyze muscle definition
   *               analyzePosture:
   *                 type: boolean
   *                 default: true
   *                 description: Whether to analyze posture alignment
   *     responses:
   *       200:
   *         description: Analysis completed successfully
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
   *                     id:
   *                       type: string
   *                     userId:
   *                       type: string
   *                     imageUrl:
   *                       type: string
   *                     processedUrl:
   *                       type: string
   *                       nullable: true
   *                     analysis:
   *                       type: object
   *                       description: Full analysis results including body composition estimates
   *                     confidence:
   *                       type: number
   *                       minimum: 0
   *                       maximum: 1
   *                     createdAt:
   *                       type: integer
   *       503:
   *         description: AI service not configured
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Analysis failed
   */
  router.post("/vision/analyze", async (c) => {
    const drizzle = baseRouter.getDrizzle(c.env.DB);
    const authUser = baseRouter.getAuthUser(c);
    const userId = authUser.id;

    const user = await drizzle.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
    });

    if (!user) {
      throw new APIError(404, "USER_NOT_FOUND", "User not found");
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
        throw new APIError(503, "AI_NOT_CONFIGURED", "AI service not configured");
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

      await invalidateBodyCache(c.env.BODY_INSIGHTS_CACHE, userId);

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
      if (error instanceof APIError) {
        throw error;
      }
      // eslint-disable-next-line no-console
      console.error("Vision analysis error:", error);
      const message = error instanceof Error ? error.message : "Analysis failed";
      throw new APIError(500, "VISION_ANALYSIS_FAILED", message);
    }
  });

  // Get body metrics history
  /**
   * @swagger
   * /body/metrics:
   *   get:
   *     summary: Get body metrics history
   *     description: Retrieve historical body metrics (weight, body fat, muscle mass, etc.) with optional date range filtering
   *     tags: [body]
   *     security:
   *       - bearer: []
   *     parameters:
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: integer
   *           format: int64
   *         description: Start timestamp (Unix milliseconds) for filtering
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: integer
   *           format: int64
   *         description: End timestamp (Unix milliseconds) for filtering
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 1000
   *           default: 100
   *         description: Maximum number of records to return
   *     responses:
   *       200:
   *         description: Metrics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/BodyMetric'
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Failed to fetch metrics
   */
  router.get("/metrics", async (c) => {
    const authUser = baseRouter.getAuthUser(c);
    const userId = authUser.id;
    const drizzle = baseRouter.getDrizzle(c.env.DB);

    try {
      const startDate = c.req.query("startDate")
        ? parseInt(c.req.query("startDate")!)
        : undefined;
      const endDate = c.req.query("endDate")
        ? parseInt(c.req.query("endDate")!)
        : undefined;
      const limit = parseInt(c.req.query("limit") || "100");

      const paramStr = `${startDate || ""}:${endDate || ""}:${limit}`;
      const cacheKey = baseRouter.buildCacheKey("BODY_INSIGHTS", userId, "metrics", paramStr);

      const { data: cachedData, hit: cacheHit } = await baseRouter.withCacheResult<BodyMetricResponse[]>(
        c,
        cacheKey,
        async () => {
          return await drizzle.query.bodyMetrics.findMany({
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
        },
        baseRouter.getCacheTtl("BODY_INSIGHTS")
      );

      if (cacheHit && cachedData) {
        c.header("X-Cache", "HIT");
        return c.json({ success: true, data: cachedData });
      }

      c.header("X-Cache", "MISS");
      return c.json({ success: true, data: cachedData });
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      // eslint-disable-next-line no-console
      console.error("Get metrics error:", error);
      throw new APIError(500, "FETCH_METRICS_FAILED", "Failed to fetch metrics");
    }
  });

  // Create manual body metric entry
  /**
   * @swagger
   * /body/metrics:
   *   post:
   *     summary: Create body metric entry
   *     description: Manually create a body metrics entry with optional validation
   *     tags: [body]
   *     security:
   *       - bearer: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               weight:
   *                 type: number
   *                 minimum: 0
   *               bodyFatPercentage:
   *                 type: number
   *                 minimum: 0
   *                 maximum: 100
   *               muscleMass:
   *                 type: number
   *                 minimum: 0
   *               boneMass:
   *                 type: number
   *                 minimum: 0
   *               waterPercentage:
   *                 type: number
   *                 minimum: 0
   *                 maximum: 100
   *               bmi:
   *                 type: number
   *                 minimum: 0
   *               waistCircumference:
   *                 type: number
   *                 minimum: 0
   *               chestCircumference:
   *                 type: number
   *                 minimum: 0
   *               hipCircumference:
   *                 type: number
   *                 minimum: 0
   *               notes:
   *                 type: string
   *     responses:
   *       201:
   *         description: Metric created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/BodyMetric'
   *       400:
   *         description: Invalid data or validation failed
   *       404:
   *         description: User not found
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Failed to create metric
   */
  router.post("/metrics", async (c) => {
    const authUser = baseRouter.getAuthUser(c);
    const userId = authUser.id;
    const drizzle = baseRouter.getDrizzle(c.env.DB);

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
        throw new APIError(404, "USER_NOT_FOUND", "User not found");
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
          throw new APIError(400, "VALIDATION_FAILED", "Validation failed", { errors: validationResult.errors });
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

      await invalidateBodyCache(c.env.BODY_INSIGHTS_CACHE, userId);

      return c.json({ success: true, data: metric }, 201);
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      // eslint-disable-next-line no-console
      console.error("Create metric error:", error);
      throw new APIError(500, "CREATE_METRIC_FAILED", "Failed to create metric");
    }
  });

  // Get body heatmap data
  /**
   * @swagger
   * /body/heatmaps:
   *   get:
   *     summary: Get body heatmaps
   *     description: Retrieve body heatmap data showing muscle activation or body composition heat distribution
   *     tags: [body]
   *     security:
   *       - bearer: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 10
   *         description: Maximum number of heatmaps to return
   *     responses:
   *       200:
   *         description: Heatmaps retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                       userId:
   *                         type: string
   *                       timestamp:
   *                         type: integer
   *                       imageUrl:
   *                         type: string
   *                       vectorData:
   *                         type: array
   *                         items:
   *                           type: object
   *                       metadata:
   *                         type: object
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Failed to fetch heatmaps
   */
  router.get("/heatmaps", async (c) => {
    const authUser = baseRouter.getAuthUser(c);
    const userId = authUser.id;
    const drizzle = baseRouter.getDrizzle(c.env.DB);

    try {
      const limit = parseInt(c.req.query("limit") || "10");
      const cacheKey = baseRouter.buildCacheKey("BODY_INSIGHTS", userId, "heatmaps", limit.toString());

      const { data: cachedData, hit: cacheHit } = await baseRouter.withCacheResult(
        c,
        cacheKey,
        async () => {
          const heatmaps = await drizzle.query.bodyHeatmaps.findMany({
            where: (bh, { eq }) => eq(bh.userId, userId),
            orderBy: (bh, { desc }) => desc(bh.createdAt),
            limit,
          });

          return heatmaps.map((h) => ({
            ...h,
            vectorData: h.vectorData ? JSON.parse(h.vectorData) : null,
          }));
        },
        baseRouter.getCacheTtl("BODY_INSIGHTS")
      );

      if (cacheHit && cachedData) {
        c.header("X-Cache", "HIT");
        return c.json({ success: true, data: cachedData });
      }

      c.header("X-Cache", "MISS");
      return c.json({ success: true, data: cachedData });
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      // eslint-disable-next-line no-console
      console.error("Get heatmaps error:", error);
      throw new APIError(500, "FETCH_HEATMAPS_FAILED", "Failed to fetch heatmaps");
    }
  });

  // Generate heatmap from vision analysis
  /**
   * @swagger
   * /body/heatmaps/generate:
   *   post:
   *     summary: Generate body heatmap
   *     description: Generate a heatmap visualization from a vision analysis ID and vector data
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
   *               - analysisId
   *               - vectorData
   *             properties:
   *               analysisId:
   *                 type: string
   *                 description: Vision analysis ID to associate with
   *               vectorData:
   *                 type: array
   *                 description: Array of heatmap data points
   *                 items:
   *                   type: object
   *                   required:
   *                     - x
   *                     - y
   *                     - muscle
   *                     - intensity
   *                   properties:
   *                     x:
   *                       type: number
   *                       minimum: 0
   *                       maximum: 100
   *                     y:
   *                       type: number
   *                       minimum: 0
   *                       maximum: 100
   *                     muscle:
   *                       type: string
   *                     intensity:
   *                       type: number
   *                       minimum: 0
   *                       maximum: 1
   *     responses:
   *       200:
   *         description: Heatmap generated successfully
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
   *                     id:
   *                       type: string
   *                     userId:
   *                       type: string
   *                     timestamp:
   *                       type: integer
   *                     imageUrl:
   *                       type: string
   *                     vectorData:
   *                       type: array
   *                     regions:
   *                       type: array
   *                     metrics:
   *                       type: object
   *       404:
   *         description: Analysis not found
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Failed to generate heatmap
   */
  router.post("/heatmaps/generate", async (c) => {
    const authUser = baseRouter.getAuthUser(c);
    const userId = authUser.id;
    const drizzle = baseRouter.getDrizzle(c.env.DB);

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
        throw new APIError(404, "ANALYSIS_NOT_FOUND", "Analysis not found");
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

      const now = Math.floor(Date.now() / 1000);
      const [heatmap] = await drizzle
        .insert(schema.bodyHeatmaps)
        .values({
          id: crypto.randomUUID(),
          userId,
          photoId: analysisId, // TODO: Properly link to bodyPhotos
          regions: JSON.stringify(vectorData),
          metrics: JSON.stringify({ generatedAt: now }),
          vectorData: JSON.stringify(vectorData),
          createdAt: now,
        })
        .returning();

      await invalidateBodyCache(c.env.BODY_INSIGHTS_CACHE, userId);

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
      if (error instanceof APIError) {
        throw error;
      }
      // eslint-disable-next-line no-console
      console.error("Generate heatmap error:", error);
      throw new APIError(500, "GENERATE_HEATMAP_FAILED", "Failed to generate heatmap");
    }
  });

  // Get health score
  /**
   * @swagger
   * /body/health-score:
   *   get:
   *     summary: Get health score
   *     description: Calculate overall health score based on latest body metrics, BMI, body fat, muscle mass, and fitness level. Score ranges 0-100 with category and recommendations.
   *     tags: [body]
   *     security:
   *       - bearer: []
   *     responses:
   *       200:
   *         description: Health score calculated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/HealthScore'
   *       404:
   *         description: User not found
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Failed to calculate health score
   */
  router.get("/health-score", async (c) => {
    const authUser = baseRouter.getAuthUser(c);
    const userId = authUser.id;
    const drizzle = baseRouter.getDrizzle(c.env.DB);

    try {
      const cacheKey = baseRouter.buildCacheKey("BODY_INSIGHTS", userId, "health-score");

      const { data: cachedData, hit: cacheHit } = await baseRouter.withCacheResult<HealthScoreResponse>(
        c,
        cacheKey,
        async () => {
          const user = await drizzle.query.users.findFirst({
            where: (u, { eq }) => eq(u.id, userId),
          });

          if (!user) {
            throw new APIError(404, "USER_NOT_FOUND", "User not found");
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

          return {
            score: Math.round(score * 10) / 10,
            category,
            factors: factors as { bmi: number; bodyFat: number; muscleMass: number; fitnessLevel: number },
            recommendations,
          };
        },
        600 // health score TTL (10 minutes)
      );

      if (cacheHit && cachedData) {
        c.header("X-Cache", "HIT");
        return c.json({ success: true, data: cachedData });
      }

      c.header("X-Cache", "MISS");
      return c.json({ success: true, data: cachedData });
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      // eslint-disable-next-line no-console
      console.error("Health score error:", error);
      throw new APIError(500, "CALCULATE_HEALTH_SCORE_FAILED", "Failed to calculate health score");
    }
  });

  return router;
};