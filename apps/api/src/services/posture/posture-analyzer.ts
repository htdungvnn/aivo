/**
 * Posture Analysis Service
 * Wraps the Rust WASM PostureAnalyzer for form correction
 */

import { PostureAnalyzer } from "@aivo/compute/aivo_compute_bg.js";

export interface SkeletonJoint {
  x: number;
  y: number;
  z?: number;
  confidence: number;
}

export interface SkeletonFrame {
  frameNumber: number;
  timestampMs: number;
  joints: Record<string, SkeletonJoint>;
}

export interface SkeletonData {
  exerciseType: "squat" | "deadlift" | "bench_press" | "overhead_press" | "lunge";
  frames: SkeletonFrame[];
  metadata: {
    fps: number;
    resolutionWidth: number;
    resolutionHeight: number;
    totalFrames: number;
  };
}

export interface FormDeviation {
  joint: string;
  issueType: string;
  severity: "minor" | "moderate" | "major";
  confidence: number;
  timestampMs: number;
  actualValue: number;
  expectedRange: string;
  description: string;
  cue: string;
}

export interface PostureAnalysisResult {
  overallScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  totalFramesAnalyzed: number;
  deviations: FormDeviation[];
  criticalWarnings: string[];
  exerciseSpecificNotes: string[];
  processingTimeMs: number;
}

/**
 * Analyze skeleton coordinates for form deviations
 * This is the edge processing step (Step 2 of the posture correction pipeline)
 */
export async function analyzePosture(skeletonData: SkeletonData): Promise<PostureAnalysisResult> {
  try {
    // Convert to JSON for WASM
    const skeletonJson = JSON.stringify({
      exercise_type: skeletonData.exerciseType,
      frames: skeletonData.frames.map(f => ({
        frame_number: f.frameNumber,
        timestamp_ms: f.timestampMs,
        joints: f.joints,
      })),
      metadata: {
        fps: skeletonData.metadata.fps,
        resolution_width: skeletonData.metadata.resolutionWidth,
        resolution_height: skeletonData.metadata.resolutionHeight,
        total_frames: skeletonData.metadata.totalFrames,
      },
    });

    // Call WASM analyzer
    const resultJson = PostureAnalyzer.analyzeSkeleton(skeletonJson);

    const result: PostureAnalysisResult = JSON.parse(resultJson);

    // Convert grade to typed literal
    const validGrades: Array<"A" | "B" | "C" | "D" | "F"> = ["A", "B", "C", "D", "F"];
    if (!validGrades.includes(result.grade as PostureAnalysisResult['grade'])) {
      result.grade = "C" as PostureAnalysisResult['grade'];
    }

    return result;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[PostureAnalyzer] Analysis failed:", error);
    throw new Error(`Posture analysis failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract keyframes from video frame sequence
 * This would typically be done on the mobile side, but can also be done server-side
 */
export function extractKeyframes(
  frameCount: number,
  fps: number,
  strategy: "every_n" | "phase_based" | "motion_based" = "phase_based"
): { keyframeIndices: number[]; totalFrames: number; keyframeCount: number } {
  const resultJson = PostureAnalyzer.extractKeyframes(frameCount, fps, strategy);
  const result = JSON.parse(resultJson);

  return {
    keyframeIndices: result.keyframe_indices,
    totalFrames: result.total_frames,
    keyframeCount: result.keyframe_count,
  };
}

/**
 * Calculate real-time correction for a single frame
 * Used for live feedback during exercise
 */
export async function analyzeFrameRealtime(
  frame: SkeletonFrame,
  exerciseType: "squat" | "deadlift" | "bench_press" | "overhead_press" | "lunge"
): Promise<{ deviations: FormDeviation[]; isCritical: boolean }> {
  const skeletonData: SkeletonData = {
    exerciseType,
    frames: [frame],
    metadata: {
      fps: 30,
      resolutionWidth: 1920,
      resolutionHeight: 1080,
      totalFrames: 1,
    },
  };

  const result = await analyzePosture(skeletonData);

  return {
    deviations: result.deviations,
    isCritical: result.criticalWarnings.length > 0,
  };
}

/**
 * Generate real-time feedback message for a deviation
 */
export function generateFeedbackMessage(deviation: FormDeviation): string {
  const severityEmojis = {
    minor: "💡",
    moderate: "⚠️",
    major: "🚨",
  };

  const emoji = severityEmojis[deviation.severity] || "💡";

  return `${emoji} ${deviation.joint}: ${deviation.description}\n   Cue: ${deviation.cue}`;
}
