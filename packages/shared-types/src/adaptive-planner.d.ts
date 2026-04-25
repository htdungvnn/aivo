import { MuscleGroup, DailySchedule } from "./index";
/**
 * Workout Routine - A weekly workout plan
 */
export interface WorkoutRoutine {
    id: string;
    userId: string;
    name: string;
    description?: string;
    weekStartDate: string;
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
    dayOfWeek: number;
    exerciseName: string;
    exerciseType: "strength" | "cardio" | "mobility" | "recovery";
    targetMuscleGroups: MuscleGroup[];
    sets?: number;
    reps?: number;
    weight?: number;
    rpe?: number;
    duration?: number;
    restTime?: number;
    orderIndex: number;
    notes?: string;
}
/**
 * Body Insight - Recovery and soreness data from AI or user reports
 */
export interface BodyInsight {
    id: string;
    userId: string;
    timestamp: number;
    source: "ai_analysis" | "user_report" | "device";
    recoveryScore: number;
    fatigueLevel: number;
    muscleSoreness: Record<MuscleGroup, number>;
    sleepQuality: number;
    sleepHours: number;
    stressLevel: number;
    hydrationLevel: number;
    notes?: string;
    rawData?: string;
}
/**
 * Fitness Goal - Structured goal with measurable target
 */
export interface FitnessGoal {
    id: string;
    userId: string;
    type: "strength" | "hypertrophy" | "endurance" | "weight_loss" | "mobility";
    targetMetric: string;
    currentValue?: number;
    targetValue: number;
    deadline?: string;
    priority: 1 | 2 | 3;
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
    deviationScore: number;
    reason: "missed_workout" | "muscle_soreness" | "fatigue" | "injury" | "scheduling_conflict";
    adjustmentsJson: string;
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
    completionRate: number;
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
    recoveryRate: number;
    lastNoticed: number;
}
/**
 * Recovery Curve - Model of how muscles recover over time
 */
export interface RecoveryCurve {
    userId: string;
    generatedAt: number;
    profiles: MuscleRecoveryProfile[];
    overallRecoveryScore: number;
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
    overallScore: number;
    missedWorkouts: number;
    completionRate: number;
    averageRPE: number;
    fatigueAccumulation: number;
    muscleFatigue: Record<MuscleGroup, number>;
    trend: "on_track" | "slightly_behind" | "significantly_behind" | "recovery_needed";
}
/**
 * Schedule Adjustment - A single change to the plan
 */
export interface ScheduleAdjustment {
    date: string;
    changeType: "move" | "swap" | "cancel" | "add" | "modify";
    fromExercise?: string;
    toExercise?: string;
    fromDate?: string;
    toDate?: string;
    reason: string;
    priority: number;
}
/**
 * Adjusted Routine - The result of AI replanning
 */
export interface AdjustedRoutine {
    routineId: string;
    name: string;
    weekStartDate: string;
    adjustments: ScheduleAdjustment[];
    optimizationScore: number;
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
        restDays: number[];
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
    nextReviewDate: string;
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
    calculateDeviationScore(completions: WorkoutCompletion[], plannedExercises: RoutineExercise[]): PlanDeviationScore;
    /**
     * Analyze recovery curve based on body insights and workout history
     * @param bodyInsights Recent body insight records
     * @param muscleGroups Trained muscle groups in current routine
     * @returns RecoveryCurve
     */
    analyzeRecoveryCurve(bodyInsights: BodyInsight[], muscleGroups: MuscleGroup[]): RecoveryCurve;
    /**
     * Check if schedule reshuffle is needed
     * @param deviationScore The deviation score
     * @param recoveryCurve The recovery analysis
     * @returns Boolean indicating if reshuffle is recommended
     */
    shouldReschedule(deviationScore: PlanDeviationScore, recoveryCurve: RecoveryCurve): boolean;
}
//# sourceMappingURL=adaptive-planner.d.ts.map