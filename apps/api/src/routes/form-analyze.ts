import { Hono } from "hono";
import { createDrizzleInstance } from "@aivo/db";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { Context } from "hono";
import type { D1Database } from "drizzle-orm/d1";
import type { FormAnalysisVideo, FormExerciseType } from "@aivo/shared-types";
import type { R2Bucket } from "@cloudflare/workers-types";
import { validateVideo } from "../services/r2";

// Import tables from schema
import {
  formAnalysisVideos,
  formAnalyses,
} from "@aivo/db";

// Re-export types from shared-types
export type { FormAnalysisVideo, FormExerciseType };

// Minimal R2 bucket interface
interface R2BucketWithName extends R2Bucket {
  name?: string;
}

interface EnvWithR2 {
  DB: D1Database;
  R2: R2BucketWithName;
}

export const formRouter = () => {
  const router = new Hono<{ Bindings: EnvWithR2 }>();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const UploadVideoSchema = z.object({
  exerciseType: z.enum(["squat", "deadlift", "bench_press", "overhead_press", "lunge"]),
});

// ============================================
// UTILITIES
// ============================================

function generateVideoId(): string {
  return `vid_${crypto.randomUUID()}`;
}

function generateR2Key(userId: string, filename: string): string {
  const timestamp = Date.now();
  const random = crypto.randomUUID().split("-")[0];
  return `form-videos/${userId}/${timestamp}-${random}-${filename}`;
}

function getPublicUrl(bucket: R2BucketWithName, key: string): string {
  const bucketName = bucket.name || "bucket";
  return `https://${bucketName}.r2.dev/${key}`;
}

// ============================================
// ROUTES
// ============================================

/**
 * POST /form/upload
 * Upload a form analysis video
 */
router.post("/upload", async (c: Context) => {
  try {
    // Get user ID from auth header (simplified - use proper auth middleware)
    const userId = c.req.header("X-User-Id");
    if (!userId) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    // Parse multipart form data
    const formData = await c.req.formData();
    const file = formData.get("video") as File | null;

    if (!file) {
      return c.json({ success: false, error: "No video file provided" }, 400);
    }

    // Validate exercise type
    const exerciseType = formData.get("exerciseType") as string;
    const validationResult = UploadVideoSchema.safeParse({ exerciseType });
    if (!validationResult.success) {
      return c.json({ success: false, error: "Invalid exercise type" }, 400);
    }

    // Validate video using centralized validator
    const fileBytes = await file.arrayBuffer();
    const validation = validateVideo(Buffer.from(fileBytes), 100 * 1024 * 1024); // 100MB limit
    if (!validation.valid) {
      return c.json(
        { success: false, error: validation.error || "Invalid video" },
        400
      );
    }

    // Upload to R2
    const r2Bucket = c.env.R2;
    const videoKey = generateR2Key(userId, file.name);
    await r2Bucket.put(videoKey, fileBytes, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=3600",
      },
    });

    // Generate public URL for playback (R2 public bucket)
    const videoUrl = getPublicUrl(r2Bucket, videoKey);

    // Extract thumbnail (first frame) - TODO: implement with ffmpeg.wasm
    // For now, we'll leave thumbnailUrl null

    // Create database record
    const drizzle = createDrizzleInstance(c.env.DB);
    const videoId = generateVideoId();
    const now = Math.floor(Date.now() / 1000);

    await drizzle.insert(formAnalysisVideos).values({
      id: videoId,
      userId,
      exerciseType: validationResult.data.exerciseType,
      status: "pending",
      videoKey,
      videoUrl,
      frameCount: null,
      durationSeconds: null,
      metadata: JSON.stringify({
        fileSize: file.size,
        originalName: file.name,
        uploadedAt: now,
      }),
      createdAt: now,
      updatedAt: now,
    });

    // Queue for processing - for now, we'll just rely on cron polling
    // The cron worker will pick up videos with status="pending"

    return c.json({
      success: true,
      data: {
        videoId,
        status: "pending",
        videoUrl,
        message: "Video uploaded successfully. Analysis will begin shortly.",
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Form video upload error:", error);
    return c.json(
      { success: false, error: "Upload failed: " + String(error) },
      500
    );
  }
});

/**
 * GET /form/:videoId/status
 * Check analysis status
 */
router.get("/:videoId/status", async (c: Context) => {
  try {
    const videoId = c.req.param('videoId');
    if (!videoId) {
      return c.json({ success: false, error: "Video ID required" }, 400);
    }
    const userId = c.req.header("X-User-Id");

    const drizzle = createDrizzleInstance(c.env.DB);

    // Get video record
    const video = await drizzle
      .select()
      .from(formAnalysisVideos)
      .where(eq(formAnalysisVideos.id, videoId))
      .limit(1)
      .get();

    if (!video) {
      return c.json({ success: false, error: "Video not found" }, 404);
    }

    // Check authorization
    if (video.userId !== userId) {
      return c.json({ success: false, error: "Forbidden" }, 403);
    }

    // Check if analysis is complete
    const analysis = await drizzle
      .select()
      .from(formAnalyses)
      .where(eq(formAnalyses.videoId, videoId))
      .limit(1)
      .get();

    return c.json({
      success: true,
      data: {
        videoId: video.id,
        status: video.status,
        exerciseType: video.exerciseType,
        uploadedAt: video.createdAt,
        analysisCompleted: !!analysis,
        resultUrl: analysis ? `/api/form/${videoId}/result` : null,
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Form status check error:", error);
    return c.json(
      { success: false, error: "Failed to get status: " + String(error) },
      500
    );
  }
});

/**
 * GET /form/:videoId/result
 * Get analysis result
 */
router.get("/:videoId/result", async (c: Context) => {
  try {
    const videoId = c.req.param('videoId');
    if (!videoId) {
      return c.json({ success: false, error: "Video ID required" }, 400);
    }
    const userId = c.req.header("X-User-Id");

    const drizzle = createDrizzleInstance(c.env.DB);

    // Verify ownership and get analysis
    const result = await drizzle
      .select({
        video: formAnalysisVideos,
        analysis: formAnalyses,
      })
      .from(formAnalysisVideos)
      .leftJoin(
        formAnalyses,
        eq(formAnalyses.videoId, formAnalysisVideos.id)
      )
      .where(eq(formAnalysisVideos.id, videoId))
      .limit(1)
      .get();

    if (!result) {
      return c.json({ success: false, error: "Video not found" }, 404);
    }

    if (result.video.userId !== userId) {
      return c.json({ success: false, error: "Forbidden" }, 403);
    }

    if (!result.analysis) {
      return c.json(
        { success: false, error: "Analysis not complete yet" },
        202
      );
    }

    // Parse JSON fields
    const issues = JSON.parse(result.analysis.issues);
    const corrections = JSON.parse(result.analysis.corrections);
    const summary = JSON.parse(result.analysis.summaryJson);
    const frameAnalysis = result.analysis.frameAnalysisJson
      ? JSON.parse(result.analysis.frameAnalysisJson)
      : null;

    return c.json({
      success: true,
      data: {
        videoId: result.video.id,
        exerciseType: result.analysis.exerciseType,
        overallScore: result.analysis.overallScore,
        grade: result.analysis.grade,
        issues,
        corrections,
        summary,
        frameAnalysis,
        completedAt: result.analysis.completedAt,
        processingTimeMs: result.analysis.processingTimeMs,
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Form result fetch error:", error);
    return c.json(
      { success: false, error: "Failed to get result: " + String(error) },
      500
    );
  }
});

/**
 * GET /form/user/videos
 * List all videos for authenticated user
 */
router.get("/user/videos", async (c: Context) => {
  try {
    const userId = c.req.header("X-User-Id");
    if (!userId) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    const drizzle = createDrizzleInstance(c.env.DB);

    const videos = await drizzle
      .select()
      .from(formAnalysisVideos)
      .where(eq(formAnalysisVideos.userId, userId))
      .orderBy(sql`${formAnalysisVideos.createdAt} DESC`)
      .limit(50);

    // For each video, check if analysis exists
    const videosWithStatus = await Promise.all(
      videos.map(async (video) => {
        const analysis = await drizzle
          .select()
          .from(formAnalyses)
          .where(eq(formAnalyses.videoId, video.id))
          .limit(1)
          .get();

        return {
          ...video,
          hasAnalysis: !!analysis,
          completedAt: analysis?.completedAt,
          grade: analysis?.grade,
          overallScore: analysis?.overallScore,
        };
      })
    );

    return c.json({
      success: true,
      data: videosWithStatus,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("List user videos error:", error);
    return c.json(
      { success: false, error: "Failed to list videos: " + String(error) },
      500
    );
  }
});

  return router;
};
