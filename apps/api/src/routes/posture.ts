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
