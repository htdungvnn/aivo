// ============================================
// AI ADAPTIVE ROUTINE PLANNER TYPES
// ============================================
import type { MuscleGroup } from "./body";
import type { DailySchedule } from "./workout";

/**
 * Workout Routine - A weekly workout plan
 */
export interface WorkoutRoutine {
  id: string;
  userId: string;
  name: string;
  description?: string;
  weekStartDate: string; // YYYY-MM-DD
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Routine Exercise - A planned exercise on a specific day
 */
export interface RoutineExercise {
  id: string;
  routineId: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  exerciseName: string;
  exerciseType: "strength" | "cardio" | "mobility" | "recovery";
  targetMuscleGroups: MuscleGroup[]; // JSON array parsed
  sets?: number;
  reps?: number;
  weight?: number;
  rpe?: number; // Rate of Perceived Exertion 1-10
  duration?: number; // seconds for cardio/recovery
  restTime?: number; // seconds between sets
  orderIndex: number;
  notes?: string;
}

/**
 * Body Insight - Recovery and soreness data from AI or user reports
 */
export interface BodyInsight {
  id: string;
  userId: string;
  timestamp: number; // Unix timestamp in milliseconds
  source: "ai_analysis" | "user_report" | "device";
  recoveryScore: number; // 0-100
  fatigueLevel: number; // 1-10
  muscleSoreness: Record<MuscleGroup, number>; // e.g., { chest: 3, legs: 8 }
  sleepQuality: number; // 1-10
  sleepHours: number;
  stressLevel: number; // 1-10
  hydrationLevel: number; // 1-10
  notes?: string;
  rawData?: string; // Original analysis data JSON
}

/**
 * Fitness Goal - Structured goal with measurable target
 */
export interface FitnessGoal {
  id: string;
  userId: string;
  type: "strength" | "hypertrophy" | "endurance" | "weight_loss" | "mobility";
  targetMetric: string; // e.g., "bench_press", "body_weight", "5k_time"
  currentValue?: number;
  targetValue: number;
  deadline?: string; // ISO date
  priority: 1 | 2 | 3; // 1=high, 2=medium, 3=low
  status: "active" | "completed" | "paused";
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Plan Deviation - Record of AI adjustments to a routine
 */
export interface PlanDeviation {
  id: string;
  userId: string;
  originalRoutineId: string;
  adjustedRoutineId: string;
  deviationScore: number; // 0-100
  reason: "missed_workout" | "muscle_soreness" | "fatigue" | "injury" | "scheduling_conflict";
  adjustmentsJson: string; // JSON with details of changes
  createdAt: Date;
}

/**
 * Workout Completion Feedback - What was actually done vs planned
 */
export interface WorkoutCompletion {
  id: string;
  workoutId: string;
  routineExerciseId?: string;
  completed: boolean;
  completionRate: number; // 0-1 (sets/reps achieved vs planned)
  actualSets?: number;
  actualReps?: number;
  actualWeight?: number;
  rpeReported?: number;
  skippedReason?: "soreness" | "fatigue" | "time" | "injury" | "other";
  notes?: string;
  createdAt: Date;
}

/**
 * Recurring muscle soreness pattern for recovery curve modeling
 */
export interface MuscleRecoveryProfile {
  muscle: MuscleGroup;
  averageSoreness: number;
  sorenessTrend: "improving" | "stable" | "worsening";
  recoveryRate: number; // Days to return to baseline (1-7)
  lastNoticed: number; // Timestamp
}

/**
 * Recovery Curve - Model of how muscles recover over time
 */
export interface RecoveryCurve {
  userId: string;
  generatedAt: number;
  profiles: MuscleRecoveryProfile[];
  overallRecoveryScore: number; // 0-100
  recommendedRestDays: number;
  canTrainIntensity: "low" | "moderate" | "high";
}

/**
 * Plan Deviation Score - Summarized delta from plan
 * This is computed by Rust WASM to minimize token usage
 */
export interface PlanDeviationScore {
  userId: string;
  weekStartDate: string;
  overallScore: number; // 0-100
  missedWorkouts: number;
  completionRate: number; // 0-1
  averageRPE: number;
  fatigueAccumulation: number; // 0-1
  muscleFatigue: Record<MuscleGroup, number>;
  trend: "on_track" | "slightly_behind" | "significantly_behind" | "recovery_needed";
}

/**
 * Schedule Adjustment - A single change to the plan
 * Renamed to PlanScheduleAdjustment to avoid conflict with workout module's ScheduleAdjustment
 */
export interface PlanScheduleAdjustment {
  date: string; // YYYY-MM-DD
  changeType: "move" | "swap" | "cancel" | "add" | "modify";
  fromExercise?: string;
  toExercise?: string;
  fromDate?: string;
  toDate?: string;
  reason: string;
  priority: number; // 1=high
}

/**
 * Adjusted Routine - The result of AI replanning
 */
export interface AdjustedRoutine {
  routineId: string;
  name: string;
  weekStartDate: string;
  adjustments: PlanScheduleAdjustment[];
  optimizationScore: number; // 0-100
  newSchedule: DailySchedule[];
  reasoning: string[];
}

/**
 * Re-planning Request sent to the AI endpoint
 */
export interface ReplanRoutineRequest {
  userId: string;
  currentRoutineId: string;
  deviationScore: PlanDeviationScore;
  bodyInsights: BodyInsight[];
  userGoals: FitnessGoal[];
  constraints?: {
    restDays: number[]; // Preferred rest days (0-6)
    equipmentAvailable: string[];
    maxDailyDuration?: number;
  };
}

/**
 * Re-planning Response from the AI endpoint
 */
export interface ReplanRoutineResponse {
  success: boolean;
  adjustedRoutine: AdjustedRoutine;
  deviationScore: PlanDeviationScore;
  appliedAt: Date;
  nextReviewDate: string; // ISO date
}

/**
 * WASM interface for Plan Deviation Score calculation
 */
export interface PlanDeviationWasm {
  /**
   * Calculate deviation score from workout completion data
   * @param completions Array of workout completion records
   * @param plannedExercises The planned routine exercises for the week
   * @returns PlanDeviationScore
   */
  calculateDeviationScore(
    completions: WorkoutCompletion[],
    plannedExercises: RoutineExercise[]
  ): PlanDeviationScore;

  /**
   * Analyze recovery curve based on body insights and workout history
   * @param bodyInsights Recent body insight records
   * @param muscleGroups Trained muscle groups in current routine
   * @returns RecoveryCurve
   */
  analyzeRecoveryCurve(
    bodyInsights: BodyInsight[],
    muscleGroups: MuscleGroup[]
  ): RecoveryCurve;

  /**
   * Check if schedule reshuffle is needed
   * @param deviationScore The deviation score
   * @param recoveryCurve The recovery analysis
   * @returns Boolean indicating if reshuffle is recommended
   */
  shouldReschedule(
    deviationScore: PlanDeviationScore,
    recoveryCurve: RecoveryCurve
  ): boolean;
}
