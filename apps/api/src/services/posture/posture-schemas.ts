/**
 * Posture Analysis Schemas
 * Zod validation schemas for posture-related endpoints
 */

import { z } from "zod";

export const CreatePostureAnalysisSchema = z.object({
  exerciseType: z.enum(["squat", "deadlift", "bench_press", "overhead_press", "lunge"]),
  videoKey: z.string().optional(), // R2 key for uploaded video
  framesData: z.array(z.object({
    frameNumber: z.number(),
    timestampMs: z.number(),
    joints: z.record(z.string(), z.object({
      x: z.number(),
      y: z.number(),
      z: z.number().optional(),
      confidence: z.number(),
    })),
  })).optional(),
});

export const RealTimeFeedbackSchema = z.object({
  frame: z.object({
    frameNumber: z.number(),
    timestampMs: z.number(),
    joints: z.record(z.string(), z.object({
      x: z.number(),
      y: z.number(),
      z: z.number().optional(),
      confidence: z.number(),
    })),
  }),
  exerciseType: z.enum(["squat", "deadlift", "bench_press", "overhead_press", "lunge"]),
});

export const VideoUploadSchema = z.object({
  video: z.instanceof(File),
  exerciseType: z.enum(["squat", "deadlift", "bench_press", "overhead_press", "lunge"]),
});
