import { Hono } from "hono";
import { createDrizzleInstance } from "@aivo/db";
import { eq, sql, and } from "drizzle-orm";
import { z } from "zod";
import type { Context } from "hono";
import type { D1Database } from "@cloudflare/workers-types";
import type { R2Bucket } from "@cloudflare/workers-types";
import { authenticate, getUserFromContext, type AuthUser } from "../middleware/auth";
import { analyzePosture, extractKeyframes, analyzeFrameRealtime, generateFeedbackMessage, type SkeletonData } from "../services/posture/posture-analyzer";
import { generateAIFeedback, type AIFeedbackResponse } from "../services/posture/ai-feedback";
import { schema } from "@aivo/db";

// Import tables
import {
  formAnalysisVideos,
  formAnalyses,
  notifications,
} from "@aivo/db";

// Extend R2Bucket type to include optional name (for URL construction)
interface R2BucketWithName extends R2Bucket {
  name?: string;
}

interface Env {
  DB: D1Database;
  R2_BUCKET: R2BucketWithName;
}

export const postureRouter = () => {
  const router = new Hono<{ Bindings: Env }>();

  // Apply authentication to all posture routes
  router.use("*", authenticate);

  // ============================================
  // SCHEMAS
  // ============================================

  const CreatePostureAnalysisSchema = z.object({
    exerciseType: z.enum(["squat", "deadlift", "bench_press", "overhead_press", "lunge"]),
    videoKey: z.string().optional(), // R2 key for uploaded video
    framesData: z.array(z.object({
      frameNumber: z.number(),
      timestampMs: z.number(),
      joints: z.record(z.object({
        x: z.number(),
        y: z.number(),
        z: z.number().optional(),
        confidence: z.number(),
      })),
    })).optional(),
  });

  const RealTimeFeedbackSchema = z.object({
    frame: z.object({
      frameNumber: z.number(),
      timestampMs: z.number(),
      joints: z.record(z.object({
        x: z.number(),
        y: z.number(),
        z: z.number().optional(),
        confidence: z.number(),
      })),
    }),
    exerciseType: z.enum(["squat", "deadlift", "bench_press", "overhead_press", "lunge"]),
  });

  // ============================================
  // UTILITIES
  // ============================================

  function generateAnalysisId(): string {
    return `posture_${crypto.randomUUID()}`;
  }

  function generateVideoId(): string {
    return `vid_${crypto.randomUUID()}`;
  }

  function calculateProcessingFee(exerciseType: string): number {
    // Different exercises have different complexity
    const basePrice = 1.0; // In credits or cents
    const multipliers: Record<string, number> = {
      squat: 1.0,
      deadlift: 1.2,
      bench_press: 1.0,
      overhead_press: 1.1,
      lunge: 0.9,
    };
    return Math.round(basePrice * (multipliers[exerciseType] || 1.0) * 100) / 100;
  }

  // ============================================
  // STEP 1: VIDEO UPLOAD & KEYFRAME EXTRACTION
  // ============================================

  /**
   * POST /posture/upload
   * Upload video for posture analysis (Step 1 of pipeline)
   * Mobile sends video -> stored in R2 -> keyframes extracted on server
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

      const validation = z.enum(["squat", "deadlift", "bench_press", "overhead_press", "lunge"]).safeParse(exerciseType);
      if (!validation.success) {
        return c.json({ success: false, error: "Invalid exercise type" }, 400);
      }

      // Generate video record
      const videoId = generateVideoId();
      const videoKey = generateVideoKey(userId, file.name);
      const videoUrl = getPublicUrl(c.env.R2_BUCKET, videoKey);

      const drizzle = await createDrizzleInstance(c.env.DB);

      // Upload to R2
      const fileBytes = await file.arrayBuffer();
      await c.env.R2_BUCKET.put(videoKey, fileBytes);

      // Create video record
      const now = Math.floor(Date.now() / 1000);
      await drizzle.insert(formAnalysisVideos).values({
        id: videoId,
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

      // Trigger async keyframe extraction job
      // In production, this would be queued via Durable Objects or a worker
      // For now, we'll extract synchronously (could be slow for large videos)
      // TODO: Implement proper background job queue

      return c.json({
        success: true,
        data: {
          videoId,
          videoUrl,
          exerciseType: validation.data,
          status: "processing",
          message: "Video uploaded. Keyframe extraction in progress.",
        },
      });
    } catch (error) {
      console.error("[Posture] Upload failed:", error);
      return c.json(
        { success: false, error: "Upload failed: " + (error instanceof Error ? error.message : String(error)) },
        500
      );
    }
  });

  // ============================================
  // STEP 2: EDGE PROCESSING (Rust WASM)
  // ============================================

  /**
   * POST /posture/analyze
   * Analyze skeleton data using Rust WASM (Step 2)
   * Accepts either:
   * - videoId: to analyze previously uploaded video
   * - framesData: direct skeleton coordinates from mobile
   */
  router.post("/analyze", async (c) => {
    try {
      const authUser = getUserFromContext(c) as AuthUser;
      const userId = authUser.id;

      const body = await c.req.json();
      const validation = CreatePostureAnalysisSchema.safeParse(body);

      if (!validation.success) {
        return c.json({ success: false, error: "Invalid request", details: validation.error.flatten() }, 400);
      }

      const { exerciseType, videoKey, framesData } = validation.data;
      const drizzle = await createDrizzleInstance(c.env.DB);

      // If videoId provided, we need to extract keyframes first
      let skeletonData: SkeletonData;
      let videoId: string | undefined;

      if (videoKey) {
        // Get video record
        const video = await drizzle
          .select()
          .from(formAnalysisVideos)
          .where(
            and(
              eq(formAnalysisVideos.userId, userId),
              eq(formAnalysisVideos.videoKey, videoKey)
            )
          )
          .get();

        if (!video) {
          return c.json({ success: false, error: "Video not found" }, 404);
        }

        videoId = video.id;

        // Extract keyframes from video using R2
        // In production, this would use ffmpeg.wasm or a dedicated service
        // For now, we expect the mobile to send skeleton data directly
        return c.json({
          success: false,
          error: "Direct skeleton data required. Use framesData parameter instead of videoKey.",
        }, 400);
      } else if (framesData && framesData.length > 0) {
        // Build skeleton data from provided frames
        skeletonData = {
          exerciseType,
          frames: framesData.map(f => ({
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
            fps: 30, // Default, could be extracted from frames
            resolutionWidth: 1920,
            resolutionHeight: 1080,
            totalFrames: framesData.length,
          },
        };
      } else {
        return c.json({ success: false, error: "Either videoKey or framesData must be provided" }, 400);
      }

      // Run WASM analysis (Step 2)
      const analysisResult = await analyzePosture(skeletonData);

      // Store analysis result
      const analysisId = generateAnalysisId();
      const now = Math.floor(Date.now() / 1000);

      // AI Feedback (Step 3) - run after geometric analysis
      let aiFeedback: AIFeedbackResponse | null = null;
      let aiProcessingTimeMs: number | null = null;

      try {
        const aiStartTime = Date.now();
        const aiResult = await generateAIFeedback({
          skeletonData,
          geometricAnalysis: analysisResult,
          // TODO: Fetch user profile from DB for personalized feedback
          userProfile: undefined,
        });
        aiFeedback = aiResult;
        aiProcessingTimeMs = Date.now() - aiStartTime;
      } catch (error) {
        console.error("[Posture] AI feedback failed:", error);
        // AI feedback is optional - continue with geometric analysis only
      }

      await drizzle.insert(formAnalyses).values({
        id: analysisId,
        videoId: videoId || analysisId, // Use analysisId if no video
        userId,
        exerciseType,
        status: "completed",
        overallScore: analysisResult.overallScore,
        grade: analysisResult.grade,
        issues: JSON.stringify(analysisResult.deviations.map(d => ({
          type: d.issueType,
          severity: d.severity,
          confidence: d.confidence,
          timestampMs: d.timestampMs,
          description: d.description,
          impact: "both", // posture issues affect both performance and safety
        }))),
        corrections: JSON.stringify(analysisResult.deviations.map(d => ({
          issueType: d.issueType,
          drillName: getDrillName(d.issueType),
          description: d.description,
          steps: getDrillSteps(d.issueType),
          cues: [d.cue],
          durationSeconds: 60,
          difficulty: d.severity === "major" ? "intermediate" : "beginner",
          equipment: ["bodyweight"],
        }))),
        summaryJson: JSON.stringify({
          strengths: [], // TODO: derive from analysis
          primaryConcern: analysisResult.deviations[0]?.description || "No major issues detected",
          priority: analysisResult.deviations.some(d => d.severity === "major") ? "high" : "low",
        }),
        frameAnalysisJson: null, // Could store per-frame results
        aiFeedbackJson: aiFeedback ? JSON.stringify(aiFeedback) : null,
        aiProcessingTimeMs: aiProcessingTimeMs,
        createdAt: now,
        completedAt: now,
        processingTimeMs: analysisResult.processingTimeMs,
      });

      // Send notification
      await sendNotification(drizzle, userId, analysisId, analysisResult.grade, analysisResult.overallScore);

      return c.json({
        success: true,
        data: {
          analysisId,
          ...analysisResult,
          aiFeedback: aiFeedback || undefined,
        },
      });
    } catch (error) {
      console.error("[Posture] Analysis failed:", error);
      return c.json(
        { success: false, error: "Analysis failed: " + (error instanceof Error ? error.message : String(error)) },
        500
      );
    }
  });

  // ============================================
  // STEP 3 & 4: REAL-TIME FEEDBACK
  // ============================================

  /**
   * POST /posture/realtime
   * Get instant feedback on a single frame (for live coaching)
   * Used during exercise for real-time corrections
   */
  router.post("/realtime", async (c) => {
    try {
      const authUser = getUserFromContext(c) as AuthUser;
      const body = await c.req.json();

      const validation = RealTimeFeedbackSchema.safeParse(body);
      if (!validation.success) {
        return c.json({ success: false, error: "Invalid request", details: validation.error.flatten() }, 400);
      }

      const { frame, exerciseType } = validation.data;

      // Quick analysis of single frame
      const { deviations, isCritical } = await analyzeFrameRealtime(frame, exerciseType);

      // Generate concise feedback messages
      const messages = deviations.slice(0, 3).map(generateFeedbackMessage);

      return c.json({
        success: true,
        data: {
          isCritical,
          deviations: deviations.slice(0, 5), // Limit to top 5
          feedback: messages,
          timestamp: frame.timestampMs,
        },
      });
    } catch (error) {
      console.error("[Posture] Realtime analysis failed:", error);
      return c.json(
        { success: false, error: "Realtime analysis failed" },
        500
      );
    }
  });

  // ============================================
  // RESULTS RETRIEVAL
  // ============================================

  /**
   * GET /posture/analysis/:id
   * Get detailed analysis result
   */
  router.get("/analysis/:id", async (c) => {
    try {
      const authUser = getUserFromContext(c) as AuthUser;
      const userId = authUser.id;
      const analysisId = c.req.param("id");

      const drizzle = await createDrizzleInstance(c.env.DB);

      const analysis = await drizzle
        .select()
        .from(formAnalyses)
        .where(
          and(
            eq(formAnalyses.id, analysisId),
            eq(formAnalyses.userId, userId)
          )
        )
        .get();

      if (!analysis) {
        return c.json({ success: false, error: "Analysis not found" }, 404);
      }

      return c.json({
        success: true,
        data: {
          id: analysis.id,
          exerciseType: analysis.exerciseType,
          overallScore: analysis.overallScore,
          grade: analysis.grade,
          issues: JSON.parse(analysis.issues || "[]"),
          corrections: JSON.parse(analysis.corrections || "[]"),
          summary: JSON.parse(analysis.summaryJson || "{}"),
          aiFeedback: analysis.aiFeedbackJson ? JSON.parse(analysis.aiFeedbackJson) : null,
          aiProcessingTimeMs: analysis.aiProcessingTimeMs,
          processingTimeMs: analysis.processingTimeMs,
          completedAt: analysis.completedAt,
        },
      });
    } catch (error) {
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

      const drizzle = await createDrizzleInstance(c.env.DB);

      const analyses = await drizzle
        .select()
        .from(formAnalyses)
        .where(eq(formAnalyses.userId, userId))
        .orderBy(sql`${formAnalyses.createdAt} DESC`)
        .limit(50)
        .all();

      return c.json({
        success: true,
        data: analyses.map(a => ({
          id: a.id,
          exerciseType: a.exerciseType,
          overallScore: a.overallScore,
          grade: a.grade,
          completedAt: a.completedAt,
          processingTimeMs: a.processingTimeMs,
        })),
      });
    } catch (error) {
      console.error("[Posture] Get history failed:", error);
      return c.json(
        { success: false, error: "Failed to get history" },
        500
      );
    }
  });

  return router;
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getDrillName(issueType: string): string {
  const drills: Record<string, string> = {
    knee_valgus: "Resistance Band Squats",
    rounded_back: "Hip Hinge Drills",
    butt_wink: "Hip Flexor Stretch & Core Bracing",
    incomplete_depth: "Box Squats",
    heels_rising: "Ankle Mobility + Elevated Squats",
    bar_path_deviation: "Pause Squats",
    excessive_lean: "Goblet Squats (upright)",
    knee_hyperextension: "Soft Knee Lockout Practice",
    hip_asymmetry: "Single-Leg Work",
    shoulder_elevation: "Shoulder Depression Drills",
    elbow_flare: "Elbow Tuck Cues",
    head_position: "Chin Tuck / Gaze Fixation",
    asymmetric_extension: "Tempo Work + Mirror Check",
    hip_hinge: "Romanian Deadlifts",
  };
  return drills[issueType] || "Form Correction Drill";
}

function getDrillSteps(issueType: string): string[] {
  const steps: Record<string, string[]> = {
    knee_valgus: [
      "Place resistance band around knees",
      "Perform bodyweight squats with band tension",
      "Focus on pushing knees outward against band",
      "3 sets of 15 reps",
    ],
    rounded_back: [
      "Practice hip hinges with light weight or broomstick",
      "Brace core before each rep (take deep breath)",
      "Keep chest up throughout movement",
      "Reduce weight until form is perfect",
    ],
    excessive_lean: [
      "Use goblet squat to train upright torso",
      "Keep weight in heels",
      "Chest up, gaze forward",
      "Start with bodyweight only",
    ],
    hip_hinge: [
      "Stand with feet hip-width",
      "Push hips back while maintaining neutral spine",
      "Feel the stretch in hamstrings",
      "Practice with dowel along spine",
    ],
  };

  return steps[issueType] || [
    "Warm up with bodyweight only",
    "Focus on proper technique",
    "Perform 3 sets of 10-15 slow reps",
    "Record yourself to track improvement",
  ];
}

function generateVideoKey(userId: string, filename: string): string {
  const timestamp = Date.now();
  const random = crypto.randomUUID().split("-")[0];
  const ext = filename.split(".").pop() || "mp4";
  return `form-videos/${userId}/${timestamp}-${random}.${ext}`;
}

function getPublicUrl(bucket: R2BucketWithName, key: string): string {
  const bucketName = bucket.name || "bucket";
  return `https://${bucketName}.r2.dev/${key}`;
}

async function sendNotification(
  drizzle: ReturnType<typeof createDrizzleInstance>,
  userId: string,
  analysisId: string,
  grade: string,
  score: number
): Promise<void> {
  try {
    const now = Math.floor(Date.now() / 1000);
    await drizzle.insert(notifications).values({
      id: `notif_${crypto.randomUUID()}`,
      userId,
      type: "form_analysis_complete",
      title: "Form Analysis Complete",
      body: `Your exercise form analysis is ready. Grade: ${grade}, Score: ${Math.round(score)}`,
      data: JSON.stringify({ analysisId, grade, score }),
      channel: "push",
      status: "pending",
      createdAt: now,
    });
  } catch (error) {
    console.error("[Posture] Failed to create notification:", error);
  }
}
