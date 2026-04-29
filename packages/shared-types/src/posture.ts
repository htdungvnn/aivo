// ============================================
// POSTURE ANALYSIS - SHARED CONSTANTS & UTILITIES
// REAL-TIME FORM CORRECTION
// ============================================

/**
 * Posture issue type discriminator
 */
export type PostureIssueType =
  | "forward_head"
  | "rounded_shoulders"
  | "hyperlordosis"
  | "kyphosis"
  | "pelvic_tilt";

/**
 * Severity levels for posture issues
 */
export type SeverityLevel = "mild" | "moderate" | "severe";

/**
 * Human-readable labels and descriptions for posture issues
 */
export const POSTURE_ISSUE_LABELS: Record<PostureIssueType, { label: string; description: string }> = {
  forward_head: {
    label: "Forward Head",
    description: "Head positioned too far forward relative to shoulders"
  },
  rounded_shoulders: {
    label: "Rounded Shoulders",
    description: "Shoulders rolled forward, indicating poor upper back posture"
  },
  hyperlordosis: {
    label: "Hyperlordosis",
    description: "Excessive inward curve of the lower back"
  },
  kyphosis: {
    label: "Kyphosis",
    description: " Excessive outward curve of the upper back (hunching)"
  },
  pelvic_tilt: {
    label: "Pelvic Tilt",
    description: "Anterior or posterior pelvic misalignment"
  },
};

/**
 * Severity color mappings (hex colors)
 */
export const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  mild: "#fbbf24",      // amber-400
  moderate: "#f97316",  // orange-500
  severe: "#ef4444",    // red-500
};

/**
 * Severity background/style mappings for UI
 * Returns platform-agnostic style descriptors
 */
export const SEVERITY_STYLES: Record<SeverityLevel, { bg: string; border: string; text: string }> = {
  mild: { bg: "rgba(251, 191, 36, 0.2)", border: "rgba(251, 191, 36, 0.3)", text: "rgba(251, 191, 36, 1)" },
  moderate: { bg: "rgba(249, 115, 22, 0.2)", border: "rgba(249, 115, 22, 0.3)", text: "rgba(249, 115, 22, 1)" },
  severe: { bg: "rgba(239, 68, 68, 0.2)", border: "rgba(239, 68, 68, 0.3)", text: "rgba(239, 68, 68, 1)" },
};

/**
 * Get score color class/string based on score value
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-blue-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

/**
 * Get human-readable score label
 */
export function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs Work";
}

/**
 * Get gradient class for score bar
 */
export function getScoreGradient(score: number): string {
  return score >= 60
    ? "bg-gradient-to-r from-emerald-500 to-blue-500"
    : "bg-gradient-to-r from-amber-500 to-red-500";
}

// ============================================
// REAL-TIME FORM CORRECTION
// ============================================

/**
 * Joint position with confidence score (2D or 3D)
 */
export interface SkeletonJoint {
  x: number;
  y: number;
  z?: number; // Optional depth for 3D poses
  confidence: number; // 0-1 detection confidence
}

/**
 * Single frame of skeleton data
 */
export interface SkeletonFrame {
  frameNumber: number;
  timestampMs: number;
  joints: Record<string, SkeletonJoint>; // e.g., "left_hip", "right_knee"
}

/**
 * Complete skeleton sequence for an exercise
 */
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

/**
 * Detected form deviation from posture analysis
 */
export interface FormDeviation {
  joint: string;
  issueType: string; // e.g., "knee_valgus", "rounded_back"
  severity: "minor" | "moderate" | "major";
  confidence: number; // 0-1
  timestampMs: number;
  actualValue: number; // measured angle or deviation amount
  expectedRange: string; // human-readable expected range
  description: string;
  cue: string; // coaching cue to correct the issue
}

/**
 * Complete posture analysis result
 */
export interface PostureAnalysisResult {
  overallScore: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  totalFramesAnalyzed: number;
  deviations: FormDeviation[];
  criticalWarnings: string[]; // Safety-critical alerts
  exerciseSpecificNotes: string[];
  processingTimeMs: number;
}

/**
 * Keyframe extraction result
 */
export interface KeyframeExtraction {
  totalFrames: number;
  keyframeCount: number;
  keyframeIndices: number[];
  fps: number;
  strategy: "every_n" | "phase_based" | "motion_based";
}

/**
 * Real-time feedback for a single frame
 */
export interface RealtimePostureFeedback {
  isCritical: boolean;
  deviations: FormDeviation[];
  feedback: string[]; // User-facing coaching messages
  timestamp: number;
}
