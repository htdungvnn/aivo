// ============================================
// FORM ANALYSIS - AI-POWERED MOVEMENT CORRECTION
// ============================================

/**
 * Supported exercise types for form analysis
 */
export type FormExerciseType = "squat" | "deadlift" | "bench_press" | "overhead_press" | "lunge";

/**
 * Video status lifecycle
 */
export type FormVideoStatus = "pending" | "processing" | "completed" | "failed";

/**
 * Specific movement flaw detected
 */
export type FormIssueType =
  | "knee_valgus"           // Knees cave inward
  | "knee_hyperextension"   // Locked knees
  | "rounded_back"          // Thoracic spine rounding
  | "excessive_lean"        // Excessive forward lean in deadlift
  | "butt_wink"             // Pelvic tuck at bottom of squat
  | "heels_rising"          // Heels lift off ground
  | "incomplete_depth"      // Not hitting parallel in squat
  | "bar_path_deviation"    // Bar moves forward/backward
  | "hip_asymmetry"         // One hip rises before other
  | "shoulder_elevation"    // Shoulders shrugged up
  | "elbow_flare"           // Elbows flare out excessively
  | "head_position"         // Head not neutral (cervical flexion/extension)
  | "asymmetric_extension"; // Unequal limb extension

/**
 * Severity level of detected issue
 */
export type FormIssueSeverity = "minor" | "moderate" | "major";

/**
 * A specific form issue detected in the video
 */
export interface FormIssue {
  type: FormIssueType;
  severity: FormIssueSeverity;
  confidence: number; // 0-1, AI confidence score
  timestampMs: number; // Time in video where issue occurs (milliseconds)
  description: string; // Human-readable explanation
  impact: "performance" | "safety" | "both";
}

/**
 * A correction drill to address a specific issue
 */
export interface FormCorrection {
  issueType: FormIssueType;
  drillName: string;
  description: string;
  steps: string[]; // Array of step-by-step instructions
  cues: string[]; // Verbal cues for the user
  durationSeconds: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  equipment: string[]; // Equipment needed (e.g., "barbell", "resistance band")
}

/**
 * Uploaded video awaiting analysis
 */
export interface FormAnalysisVideo {
  id: string;
  userId: string;
  exerciseType: FormExerciseType;
  status: FormVideoStatus;
  videoKey: string; // R2 key for the uploaded video
  videoUrl: string; // Signed URL for playback
  thumbnailUrl?: string; // Extracted thumbnail frame
  frameCount?: number; // Total frames extracted
  durationSeconds?: number;
  metadata: {
    fileSize: number;
    resolution?: string;
    fps?: number;
    uploadedAt: number;
  };
  createdAt: number;
  updatedAt: number;
}

/**
 * Complete analysis result after AI processing
 */
export interface FormAnalysisReport {
  videoId: string;
  userId: string;
  exerciseType: FormExerciseType;
  status: FormVideoStatus;
  overallScore: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  issues: FormIssue[];
  corrections: FormCorrection[];
  summary: {
    strengths: string[];
    primaryConcern: string;
    priority: "low" | "medium" | "high";
  };
  aiFeedback?: {
    overallAssessment: string;
    primaryIssues: Array<{
      issue: string;
      severity: "low" | "medium" | "high" | "critical";
      explanation: string;
      priority: number;
    }>;
    personalizedCues: Array<{
      triggerPoint: string;
      verbalCue: string;
      visualCue?: string;
      tactileCue?: string;
    }>;
    drillRecommendations: Array<{
      name: string;
      purpose: string;
      frequency: string;
      duration: string;
      steps: string[];
      regressions: string[];
      progressions: string[];
    }>;
    confidence: number;
    warnings: string[];
  };
  aiProcessingTimeMs?: number;
  frameAnalysis?: {
    keyFrames: Array<{
      timestampMs: number;
      url: string; // R2 URL to annotated frame
      issuesPresent: FormIssueType[];
    }>;
  };
  createdAt: number;
  completedAt?: number;
  processingTimeMs?: number;
}

/**
 * Job status for async processing
 */
export interface FormAnalysisJob {
  id: string;
  videoId: string;
  status: "queued" | "processing" | "completed" | "failed";
  attempts: number;
  errorMessage?: string;
  queuedAt: number;
  startedAt?: number;
  completedAt?: number;
}

/**
 * Helper function to calculate overall grade from score
 */
export function calculateFormGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

/**
 * Helper function to get color for score display
 */
export function getFormScoreColor(score: number): string {
  if (score >= 90) return "#10b981"; // green
  if (score >= 80) return "#22c55e"; // light green
  if (score >= 70) return "#eab308"; // yellow
  if (score >= 60) return "#f97316"; // orange
  return "#ef4444"; // red
}

/**
 * Helper function to group issues by type
 */
export function groupIssuesByType(issues: FormIssue[]): Map<FormIssueType, FormIssue[]> {
  const map = new Map<FormIssueType, FormIssue[]>();
  for (const issue of issues) {
    const existing = map.get(issue.type) || [];
    map.set(issue.type, [...existing, issue]);
  }
  return map;
}

/**
 * Helper function to get worst severity from list of issues
 */
export function getWorstSeverity(issues: FormIssue[]): FormIssueSeverity {
  if (issues.length === 0) return "minor";
  const severities: FormIssueSeverity[] = ["minor", "moderate", "major"];
  for (const severity of severities.reverse()) {
    if (issues.some(i => i.severity === severity)) {
      return severity;
    }
  }
  return "minor";
}
