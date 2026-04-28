/**
 * Posture Analysis Routes
 * HTTP endpoints for posture form correction
 * Step 1: Video upload
 * Step 2: Geometric analysis via Rust WASM
 * Step 3: AI-powered feedback
 * Step 4: Real-time feedback during exercise
 */

import { Hono } from "hono";
import { createDrizzleInstance } from "@aivo/db";
import { eq, and } from "drizzle-orm";
import type { D1Database } from "@cloudflare/workers-types";
import type { R2Bucket } from "@cloudflare/workers-types";
import { authenticate, getUserFromContext, type AuthUser } from "../middleware/auth";
import {
  analyzeFrameRealtime,
  generateFeedbackMessage,
  type SkeletonData,
  type SkeletonFrame,
} from "../services/posture/posture-analyzer";
import { exerciseRegistry } from "../services/posture/exercise-registry";
import { PostureService } from "../services/posture/posture-service";
import {
  CreatePostureAnalysisSchema,
  RealTimeFeedbackSchema,
} from "../services/posture/posture-schemas";
import { generateVideoKey, getPublicUrl } from "../services/posture/posture-helpers";
import { schema } from "@aivo/db";

interface R2BucketWithName extends R2Bucket {
  name?: string;
}

export interface Env {
  DB: D1Database;
  R2_BUCKET: R2BucketWithName;
}

export const PostureRouter = () => {
  const router = new Hono<{ Bindings: Env }>();

  // Apply authentication to all posture routes
  router.use("*", authenticate);

  /**
   * POST /posture/upload
   * Upload video for posture analysis (Step 1 of pipeline)
   */
  /**
   * @swagger
   * /posture/upload:
   *   post:
   *     summary: Upload video for posture analysis
   *     description: Upload a workout video for form analysis and feedback. This is step 1 of the posture analysis pipeline.
   *     tags: [posture]
   *     security:
   *       - bearer: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               video:
   *                 type: string
   *                 format: binary
   *                 description: Video file (MP4, MOV, etc.)
   *               exerciseType:
   *                 type: string
   *                 description: Type of exercise for analysis (e.g., squat, bench_press)
   *             required:
   *               - video
   *               - exerciseType
   *     responses:
   *       200:
   *         description: Video uploaded successfully, keyframe extraction in progress
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
   *                     videoKey:
   *                       type: string
   *                     videoUrl:
   *                       type: string
   *                     exerciseType:
   *                       type: string
   *                     status:
   *                       type: string
   *                       enum: [processing]
   *                     message:
   *                       type: string
   *       400:
   *         description: Invalid request - missing video or invalid exercise type
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Upload failed
   */
  router.post("/upload", async (c) => {
    try {
      const authUser = getUserFromContext(c) as AuthUser;
      const userId = authUser.id;

      const formData = await c.req.formData();
      const file = formData.get("video") as File | null;
      const exerciseType = formData.get("exerciseType") as string;

      if (!file) {
        return c.json({ success: false, error: "No video file provided" }, 400);
      }

      // Validate exercise type
      const validExercises = exerciseRegistry.getAllExercises();
      if (!validExercises.some((e) => e.id === exerciseType)) {
        return c.json({ success: false, error: "Invalid exercise type" }, 400);
      }

      // Generate video record
      const videoKey = generateVideoKey(userId, file.name);
      const videoUrl = getPublicUrl(c.env.R2_BUCKET, videoKey);

      const drizzle = createDrizzleInstance(c.env.DB);

      // Upload to R2
      const fileBytes = await file.arrayBuffer();
      await c.env.R2_BUCKET.put(videoKey, fileBytes);

      // Store video record
      const now = Math.floor(Date.now() / 1000);
      await drizzle.insert(schema.formAnalysisVideos).values({
        id: `vid_${crypto.randomUUID()}`,
        userId,
        exerciseType,
        status: "processing",
        videoKey,
        videoUrl,
        frameCount: null,
        durationSeconds: null,
        metadata: JSON.stringify({
          fileName: file.name,
          fileSize: fileBytes.byteLength,
          uploadedAt: now,
        }),
        createdAt: now,
        updatedAt: now,
      });

      return c.json({
        success: true,
        data: {
          videoKey,
          videoUrl,
          exerciseType,
          status: "processing",
          message: "Video uploaded. Keyframe extraction in progress.",
        },
      });
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging is intentional
      console.error("[Posture] Upload failed:", error);
      return c.json(
        {
          success: false,
          error: "Upload failed: " + (error instanceof Error ? error.message : String(error)),
        },
        500
      );
    }
  });

  /**
   * POST /posture/analyze
   * Analyze skeleton data using Rust WASM (Step 2)
   */
  /**
   * @swagger
   * /posture/analyze:
   *   post:
   *     summary: Analyze posture from skeleton data
   *     description: Perform geometric analysis of skeleton data using Rust WASM to detect form issues. This is step 2 of the posture analysis pipeline.
   *     tags: [posture]
   *     security:
   *       - bearer: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - exerciseType
   *               - framesData
   *             properties:
   *               exerciseType:
   *                 type: string
   *                 description: Type of exercise being analyzed
   *               videoKey:
   *                 type: string
   *                 description: Optional video key from prior upload
   *               framesData:
   *                 type: array
   *                 description: Array of skeleton frames with joint positions
   *                 items:
   *                   type: object
   *                   properties:
   *                     frameNumber:
   *                       type: integer
   *                     timestampMs:
   *                       type: integer
   *                     joints:
   *                       type: object
   *                       additionalProperties:
   *                         type: object
   *                         properties:
   *                           x:
   *                             type: number
   *                           y:
   *                             type: number
   *                           z:
   *                             type: number
   *                             nullable: true
   *                           confidence:
   *                             type: number
   *                             minimum: 0
   *                             maximum: 1
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
   *                   $ref: '#/components/schemas/PostureAnalysisResult'
   *       400:
   *         description: Invalid request data
   *       404:
   *         description: Video not found (if videoKey provided)
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Analysis failed
   */
  router.post("/analyze", async (c) => {
    try {
      const authUser = getUserFromContext(c) as AuthUser;
      const userId = authUser.id;

      const body = await c.req.json();
      const validation = CreatePostureAnalysisSchema.safeParse(body);

      if (!validation.success) {
        return c.json(
          { success: false, error: "Invalid request", details: validation.error.flatten() },
          400
        );
      }

      const { exerciseType, videoKey, framesData } = validation.data;
      const drizzle = createDrizzleInstance(c.env.DB);
      const postureService = new PostureService(drizzle);

      // Get video record if videoKey provided
      let videoId: string | undefined;
      if (videoKey) {
        const video = await drizzle
          .select()
          .from(schema.formAnalysisVideos)
          .where(
            and(eq(schema.formAnalysisVideos.userId, userId), eq(schema.formAnalysisVideos.videoKey, videoKey))
          )
          .get();

        if (!video) {
          return c.json({ success: false, error: "Video not found" }, 404);
        }

        videoId = video.id;
      }

      // Validate frames data
      if (!framesData || framesData.length === 0) {
        return c.json(
          { success: false, error: "Either videoKey or framesData must be provided" },
          400
        );
      }

      // Build skeleton data
      const skeletonData: SkeletonData = {
        exerciseType,
        frames: framesData.map((f) => ({
          frameNumber: f.frameNumber,
          timestampMs: f.timestampMs,
          joints: Object.fromEntries(
            Object.entries(f.joints).map(([key, joint]) => {
              const j = joint as { x: number; y: number; z?: number; confidence: number };
              return [
                key,
                {
                  x: j.x,
                  y: j.y,
                  z: j.z,
                  confidence: j.confidence,
                },
              ];
            })
          ),
        })),
        metadata: {
          fps: 30,
          resolutionWidth: 1920,
          resolutionHeight: 1080,
          totalFrames: framesData.length,
        },
      };

      // Perform analysis
      const result = await postureService.analyzePosture(
        skeletonData,
        userId,
        videoId
      );

      return c.json({
        success: true,
        data: result,
      });
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging is intentional
      console.error("[Posture] Analysis failed:", error);
      return c.json(
        {
          success: false,
          error: "Analysis failed: " + (error instanceof Error ? error.message : String(error)),
        },
        500
      );
    }
  });

  /**
   * POST /posture/realtime
   * Get instant feedback on a single frame (for live coaching)
   */
  /**
   * @swagger
   * /posture/realtime:
   *   post:
   *     summary: Real-time posture feedback
   *     description: Get instant feedback on a single skeleton frame for live coaching during exercise
   *     tags: [posture]
   *     security:
   *       - bearer: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - frame
   *               - exerciseType
   *             properties:
   *               frame:
   *                 $ref: '#/components/schemas/SkeletonFrame'
   *               exerciseType:
   *                 type: string
   *                 description: Type of exercise being performed
   *     responses:
   *       200:
   *         description: Real-time analysis complete
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
   *                     isCritical:
   *                       type: boolean
   *                     deviations:
   *                       type: array
   *                       items:
   *                         type: object
   *                     feedback:
   *                       type: array
   *                       items:
   *                         type: string
   *                     timestamp:
   *                       type: integer
   *       400:
   *         description: Invalid request data
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Analysis failed
   */
  router.post("/realtime", async (c) => {
    try {
      // Authentication verified by middleware
      const body = await c.req.json();

      const validation = RealTimeFeedbackSchema.safeParse(body);
      if (!validation.success) {
        return c.json(
          { success: false, error: "Invalid request", details: validation.error.flatten() },
          400
        );
      }

      const { frame, exerciseType } = validation.data;

      // Quick analysis of single frame
      const { deviations, isCritical } = await analyzeFrameRealtime(
        frame as SkeletonFrame,
        exerciseType
      );

      // Generate concise feedback messages
      const messages = deviations.slice(0, 3).map(generateFeedbackMessage);

      return c.json({
        success: true,
        data: {
          isCritical,
          deviations: deviations.slice(0, 5),
          feedback: messages,
          timestamp: frame.timestampMs,
        },
      });
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging is intentional
      console.error("[Posture] Realtime analysis failed:", error);
      return c.json(
        { success: false, error: "Realtime analysis failed" },
        500
      );
    }
  });

  /**
   * GET /posture/analysis/:id
   * Get detailed analysis result
   */
  /**
   * @swagger
   * /posture/analysis/{id}:
   *   get:
   *     summary: Get posture analysis result
   *     description: Retrieve detailed results of a completed posture analysis
   *     tags: [posture]
   *     security:
   *       - bearer: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Analysis ID
   *     responses:
   *       200:
   *         description: Analysis result retrieved
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/PostureAnalysisResult'
   *       404:
   *         description: Analysis not found
   *       401:
   *         description: Unauthorized
   */
  router.get("/analysis/:id", async (c) => {
    try {
      const authUser = getUserFromContext(c) as AuthUser;
      const userId = authUser.id;
      const analysisId = c.req.param("id");

      const drizzle = createDrizzleInstance(c.env.DB);
      const postureService = new PostureService(drizzle);

      const analysis = await postureService.getAnalysis(analysisId, userId);
      if (!analysis) {
        return c.json({ success: false, error: "Analysis not found" }, 404);
      }

      return c.json({
        success: true,
        data: analysis,
      });
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging is intentional
      console.error("[Posture] Get analysis failed:", error);
      return c.json(
        { success: false, error: "Failed to get analysis" },
        500
      );
    }
  });

  /**
   * GET /posture/history
   * Get user's posture analysis history
   */
  /**
   * @swagger
   * /posture/history:
   *   get:
   *     summary: Get posture analysis history
   *     description: Retrieve the authenticated user's complete posture analysis history
   *     tags: [posture]
   *     security:
   *       - bearer: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Number of results to return
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           minimum: 0
   *           default: 0
   *         description: Pagination offset
   *     responses:
   *       200:
   *         description: Analysis history retrieved
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
   *                     $ref: '#/components/schemas/PostureAnalysisHistory'
   *       401:
   *         description: Unauthorized
   */
  router.get("/history", async (c) => {
    try {
      const authUser = getUserFromContext(c) as AuthUser;
      const userId = authUser.id;

      const drizzle = createDrizzleInstance(c.env.DB);
      const postureService = new PostureService(drizzle);

      const analyses = await postureService.getAnalysisHistory(userId);

      return c.json({
        success: true,
        data: analyses,
      });
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging is intentional
      console.error("[Posture] Get history failed:", error);
      return c.json(
        { success: false, error: "Failed to get history" },
        500
      );
    }
  });

  return router;
};
