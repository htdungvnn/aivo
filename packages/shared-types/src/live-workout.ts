// ============================================
// LIVE WORKOUT ADJUSTMENT
// Real-time AI-driven intensity adjustment during workouts
// ============================================

/**
 * Live workout session tracking
 * Represents an active workout being performed with real-time adjustments
 */
export interface LiveWorkoutSession {
  id: string;
  userId: string;
  workoutTemplateId?: string; // If started from a template
  name: string;
  startedAt: number; // Unix timestamp in milliseconds
  lastActivityAt: number;
  status: "active" | "paused" | "completed" | "aborted";

  // Fatigue tracking
  fatigueLevel: number; // 0-100, updated in real-time
  fatigueCategory: "fresh" | "moderate" | "fatigued" | "exhausted";

  // Volume tracking
  totalPlannedVolume: number; // weight * reps * sets
  totalCompletedVolume: number;
  setsCompleted: number;
  totalPlannedSets: number;

  // Session settings
  targetRPE: number; // Target RPE for working sets (typically 7-9)
  idealRestSeconds: number; // Base rest between sets
  hasSpotter: boolean;

  // Completion data
  endedAt?: number;
  totalDurationMs?: number;
  earlyExitReason?: string;
  earlyExitSuggestion?: string;

  // Metadata
  createdAt: number;
  updatedAt: number;
}

/**
 * Per-set RPE logging for fatigue analysis
 */
export interface SetRPELog {
  id: string;
  sessionId: string;
  userId: string;
  setNumber: number;
  exerciseName: string;
  weight: number | null; // kg or lbs
  plannedReps: number;
  completedReps: number;
  rpe: number; // 1-10 rating of effort
  restTimeSeconds: number; // rest taken before this set
  timestamp: number; // when set was logged
  notes?: string;
  createdAt?: number;
}

/**
 * Live adjustment recommendation from AI
 * Returned by assess_current_fatigue and recommend_live_adjustment
 */
export interface LiveAdjustment {
  adjustmentType: "reduce_weight" | "reduce_reps" | "add_rest" | "keep" | "stop";
  weightPercent?: number; // e.g., 0.9 for 90% of current weight
  repAdjustment?: number; // absolute change, e.g., -1
  additionalRestSeconds?: number;
  confidence: number; // 0-1
  reasoning: string;
  urgency: "low" | "medium" | "high" | "critical";
}

/**
 * Fatigue assessment result
 * Produced by assess_current_fatigue Rust function
 */
export interface FatigueAssessment {
  fatigueLevel: number; // 0-100 scale
  category: "fresh" | "moderate" | "fatigued" | "exhausted";
  rpeTrend: "increasing" | "stable" | "decreasing" | "no_data";
  avgRPE: number;
  restCompliance: number; // 0-100, how well rest periods were followed
  recommendation: string;
}

/**
 * Per-exercise metrics during live session
 */
export interface LiveExerciseMetric {
  exerciseName: string;
  setsCompleted: number;
  totalSets: number;
  currentWeight: number | null;
  targetReps: number;
  avgRPE: number;
  rpeTrend: "increasing" | "stable" | "decreasing";
  fatigueLevel: number;
  recommendedAdjustment?: LiveAdjustment;
}

/**
 * Live adjustment request payload
 */
export interface LiveAdjustmentRequest {
  sessionId: string;
  currentWeight: number;
  targetReps: number;
  remainingSets: number;
  exerciseType: "squat" | "deadlift" | "bench_press" | "overhead_press" | "lunge" | "pull_up" | "row" | "other";
  isWarmup: boolean;
  hasSpotter: boolean;
  recentRPERecords: Array<{
    rpe: number;
    weight?: number;
    repsCompleted?: number;
    restTimeSeconds?: number;
    setNumber: number;
  }>;
}

/**
 * API response for live adjustment endpoint
 */
export interface LiveAdjustmentResponse {
  success: boolean;
  adjustment?: LiveAdjustment;
  fatigue?: FatigueAssessment;
  recommendedRest?: number;
  shouldEndWorkout?: boolean;
  endWorkoutReason?: string;
  endWorkoutSuggestion?: string;
  error?: string; // Optional error message when success is false
}

/**
 * Set RPE log request
 */
export interface LogRPERequest {
  sessionId: string;
  setNumber: number;
  exerciseName: string;
  weight: number | null;
  plannedReps: number;
  completedReps: number;
  rpe: number;
  restTimeSeconds: number;
  notes?: string;
}

/**
 * Workout start request with live adjustment settings
 */
export interface StartLiveWorkoutRequest {
  workoutTemplateId?: string;
  name: string;
  exerciseType?: string;
  targetRPE?: number; // default 8
  idealRestSeconds?: number; // default 90
  hasSpotter?: boolean;
}

/**
 * Exercise type enum for live adjustment
 */
export type LiveExerciseType =
  | "squat"
  | "deadlift"
  | "bench_press"
  | "overhead_press"
  | "lunge"
  | "pull_up"
  | "row"
  | "shoulder_press"
  | "bicep_curl"
  | "tricep_extension"
  | "leg_press"
  | "leg_extension"
  | "leg_curl"
  | "chest_fly"
  | "lat_pulldown"
  | "cable_row"
  | "dumbbell_row"
  | "hip_thrust"
  | "bulgarian_split_squat"
  | "other";

/**
 * Adjustment strategy based on workout phase
 */
export type AdjustmentStrategy =
  | "aggressive"  // More frequent/intense adjustments
  | "balanced"    // Default balanced approach
  | "conservative" // Minimal adjustments, focus on completion
  | "safety_first"; // Prioritize form and injury prevention

/**
 * Live workout session summary (for history/analytics)
 */
export interface LiveWorkoutSessionSummary {
  sessionId: string;
  userId: string;
  name: string;
  startedAt: number;
  completedAt: number;
  durationMs: number;
  totalSets: number;
  setsCompleted: number;
  totalVolume: number;
  avgRPE: number;
  maxRPE: number;
  fatiguePeak: number;
  adjustmentsApplied: number;
  earlyExit: boolean;
  earlyExitReason?: string;
}

/**
 * Fatigue trend analysis (for post-workout insights)
 */
export interface FatigueTrendAnalysis {
  userId: string;
  periodDays: number;
  avgSessionFatigue: number;
  fatigueAtEnd: number;
  restCompliance: number;
  adjustmentAcceptanceRate: number; // % of recommended adjustments followed
  commonTriggers: Array<{
    trigger: "high_rpe_trend" | "low_rest" | "high_volume" | "compound_exercise";
    count: number;
  }>;
  recommendations: string[];
}

/**
 * Notification for live workout adjustments
 */
export interface LiveAdjustmentNotification {
  sessionId: string;
  exerciseName: string;
  adjustment: LiveAdjustment;
  message: string; // User-facing notification message
  actionLabel: string; // e.g., "Apply Adjustment", "Continue as Planned"
  timestamp: number;
}
