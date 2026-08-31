/**
 * AIVO Fitness Types - Workout Plans
 * Plan management, revisions, and AI planning
 */

import { z } from 'zod';

// =============================================================================
// Plan Status
// =============================================================================

export const PLAN_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
} as const;

export type PlanStatus = (typeof PLAN_STATUS)[keyof typeof PLAN_STATUS];

// =============================================================================
// Plan Adjustment Reasons
// =============================================================================

export const ADJUSTMENT_REASONS = {
  INITIAL_PLAN: 'initial_plan',
  WEEKLY_PROGRESSION: 'weekly_progression',
  ADHERENCE_GOOD: 'adherence_good',
  ADHERENCE_POOR: 'adherence_poor',
  USER_GOAL_CHANGED: 'user_goal_changed',
  USER_FEEDBACK: 'user_feedback',
  RECOVERY_NEEDED: 'recovery_needed',
  PLATEAU_DETECTED: 'plateau_detected',
  AI_RECOMMENDATION: 'ai_recommendation',
} as const;

export type AdjustmentReason = (typeof ADJUSTMENT_REASONS)[keyof typeof ADJUSTMENT_REASONS];

// =============================================================================
// Exercise in Plan
// =============================================================================

/**
 * Exercise entry in a workout plan
 */
export const planExerciseSchema = z.object({
  exerciseCode: z.string(),
  order: z.number().int().nonnegative(),
  
  // Sets and reps targets
  targetSets: z.number().int().positive().default(3),
  targetReps: z.number().int().positive().default(10),
  
  // Rest configuration
  restBetweenSetsMs: z.number().int().positive().default(60000),
  restAfterExerciseMs: z.number().int().positive().default(90000),
  
  // Progression hints
  increaseWhenMastered: z.object({
    reps: z.number().int().positive().optional(),
    sets: z.number().int().positive().optional(),
  }).optional(),
  
  // User overrides
  userLocked: z.boolean().default(false), // User has locked this exercise
  userSets: z.number().int().positive().optional(),
  userReps: z.number().int().positive().optional(),
});

export type PlanExercise = z.infer<typeof planExerciseSchema>;

// =============================================================================
// Workout Day
// =============================================================================

/**
 * Single workout day in a plan
 */
export const workoutDaySchema = z.object({
  id: z.string().uuid(),
  dayNumber: z.number().int().positive(),
  name: z.string().optional(), // e.g., "Upper Body", "Rest Day"
  
  // Exercises for this day
  exercises: z.array(planExerciseSchema),
  
  // Rest day
  isRestDay: z.boolean().default(false),
  
  // Target duration
  estimatedDurationMs: z.number().int().positive().optional(),
});

export type WorkoutDay = z.infer<typeof workoutDaySchema>;

// =============================================================================
// Workout Plan
// =============================================================================

/**
 * Complete workout plan
 */
export const workoutPlanSchema = z.object({
  // Identification
  id: z.string().uuid(),
  userId: z.string().uuid(),
  
  // Status and versioning
  status: z.enum([PLAN_STATUS.DRAFT, PLAN_STATUS.ACTIVE, PLAN_STATUS.COMPLETED, PLAN_STATUS.ARCHIVED]),
  revision: z.number().int().positive().default(1),
  previousRevisionId: z.string().uuid().optional(),
  
  // Goal
  goal: z.enum(['fat_loss', 'muscle_gain', 'general_fitness', 'mobility']),
  
  // Configuration
  workoutDaysPerWeek: z.number().int().positive().max(7).default(4),
  workouts: z.array(workoutDaySchema),
  
  // Duration
  durationWeeks: z.number().int().positive().default(4),
  startDate: z.string().optional(), // ISO date
  endDate: z.string().optional(),
  
  // Metadata
  name: z.string().default('My Workout Plan'),
  description: z.string().optional(),
  
  // AI planning
  createdWithAI: z.boolean().default(false),
  aiModel: z.string().optional(),
  aiPromptVersion: z.string().optional(),
  
  // Adjustment tracking
  lastAdjustmentReason: z.enum([
    ADJUSTMENT_REASONS.INITIAL_PLAN,
    ADJUSTMENT_REASONS.WEEKLY_PROGRESSION,
    ADJUSTMENT_REASONS.ADHERENCE_GOOD,
    ADJUSTMENT_REASONS.ADHERENCE_POOR,
    ADJUSTMENT_REASONS.USER_GOAL_CHANGED,
    ADJUSTMENT_REASONS.USER_FEEDBACK,
    ADJUSTMENT_REASONS.RECOVERY_NEEDED,
    ADJUSTMENT_REASONS.PLATEAU_DETECTED,
    ADJUSTMENT_REASONS.AI_RECOMMENDATION,
  ]).optional(),
  
  // Timestamps
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
  activatedAt: z.number().int().positive().optional(),
});

export type WorkoutPlan = z.infer<typeof workoutPlanSchema>;

// =============================================================================
// Progress Summary
// =============================================================================

/**
 * Aggregated progress for a user
 */
export const progressSummarySchema = z.object({
  userId: z.string().uuid(),
  
  // Time period
  periodStart: z.number().int().positive(),
  periodEnd: z.number().int().positive(),
  
  // Workout stats
  totalWorkouts: z.number().int().nonnegative(),
  completedWorkouts: z.number().int().nonnegative(),
  totalDurationMs: z.number().int().nonnegative(),
  
  // Exercise stats
  exercisesPerformed: z.record(z.string(), z.object({
    totalSets: z.number().int().nonnegative(),
    totalReps: z.number().int().nonnegative(),
    averageQualityScore: z.number().min(0).max(100),
    completionRate: z.number().min(0).max(1),
  })),
  
  // Quality trends
  averageQualityScore: z.number().min(0).max(100),
  averageRangeOfMotion: z.number().min(0).max(1),
  formComplianceRate: z.number().min(0).max(1),
  
  // Adherence
  adherenceRate: z.number().min(0).max(1),
  plannedWorkouts: z.number().int().nonnegative(),
  
  // Progression
  qualityTrend: z.enum(['improving', 'stable', 'declining']).optional(),
  volumeTrend: z.enum(['increasing', 'stable', 'decreasing']).optional(),
  
  // Goals
  goalProgress: z.object({
    current: z.number().min(0).max(100),
    target: z.number().min(0).max(100).default(100),
    percentage: z.number().min(0).max(1),
  }).optional(),
  
  // Correction trends
  correctionTrends: z.record(z.string(), z.object({
    frequency: z.number().min(0).max(1),
    trend: z.enum(['improving', 'stable', 'worsening']),
  })),
  
  // Last updated
  lastUpdated: z.number().int().positive(),
});

export type ProgressSummary = z.infer<typeof progressSummarySchema>;

// =============================================================================
// AI Planning Request
// =============================================================================

/**
 * Request for AI to generate or adjust a plan
 */
export const aiPlanningRequestSchema = z.object({
  userId: z.string().uuid(),
  
  // Current state
  currentGoal: z.enum(['fat_loss', 'muscle_gain', 'general_fitness', 'mobility']),
  previousPlan: workoutPlanSchema.optional(),
  
  // User history
  recentWorkouts: z.array(z.object({
    completedAt: z.number().int().positive(),
    exercises: z.array(z.object({
      exerciseCode: z.string(),
      completedSets: z.number().int().nonnegative(),
      totalReps: z.number().int().nonnegative(),
      qualityScore: z.number().min(0).max(100),
    })),
    adherenceRate: z.number().min(0).max(1),
  })).optional(),
  
  // Constraints
  availableExercises: z.array(z.string()).optional(),
  excludedExercises: z.array(z.string()).optional(),
  maxWorkoutsPerWeek: z.number().int().positive().max(7).optional(),
  maxSessionDurationMs: z.number().int().positive().optional(),
  
  // Preferences
  userFeedback: z.string().max(500).optional(),
  preferredSessionTime: z.enum(['morning', 'afternoon', 'evening']).optional(),
  
  // Adjustment reason
  reason: z.enum([
    ADJUSTMENT_REASONS.INITIAL_PLAN,
    ADJUSTMENT_REASONS.WEEKLY_PROGRESSION,
    ADJUSTMENT_REASONS.ADHERENCE_GOOD,
    ADJUSTMENT_REASONS.ADHERENCE_POOR,
    ADJUSTMENT_REASONS.USER_GOAL_CHANGED,
    ADJUSTMENT_REASONS.USER_FEEDBACK,
    ADJUSTMENT_REASONS.RECOVERY_NEEDED,
    ADJUSTMENT_REASONS.PLATEAU_DETECTED,
  ]),
  
  // AI configuration
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export type AIPlanningRequest = z.infer<typeof aiPlanningRequestSchema>;

// =============================================================================
// AI Planning Job
// =============================================================================

export const PLANNING_JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type PlanningJobStatus = (typeof PLANNING_JOB_STATUS)[keyof typeof PLANNING_JOB_STATUS];

/**
 * AI planning job tracking
 */
export const planningJobSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  
  status: z.enum([PLANNING_JOB_STATUS.PENDING, PLANNING_JOB_STATUS.PROCESSING, PLANNING_JOB_STATUS.COMPLETED, PLANNING_JOB_STATUS.FAILED]),
  
  // Request details
  request: aiPlanningRequestSchema,
  
  // Response (when completed)
  generatedPlan: workoutPlanSchema.optional(),
  
  // Error handling
  errorMessage: z.string().optional(),
  
  // AI metadata
  model: z.string().optional(),
  promptTokens: z.number().int().nonnegative().optional(),
  completionTokens: z.number().int().nonnegative().optional(),
  
  // Timing
  createdAt: z.number().int().positive(),
  startedAt: z.number().int().positive().optional(),
  completedAt: z.number().int().positive().optional(),
});

export type PlanningJob = z.infer<typeof planningJobSchema>;

// =============================================================================
// User Preferences
// =============================================================================

/**
 * User exercise preferences
 */
export const userExercisePreferencesSchema = z.object({
  userId: z.string().uuid(),
  exerciseCode: z.string(),
  
  // User's experience level for this exercise
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  
  // Personal records
  personalRecords: z.object({
    maxReps: z.number().int().positive().optional(),
    maxSets: z.number().int().positive().optional(),
    bestQualityScore: z.number().min(0).max(100).optional(),
  }).optional(),
  
  // Exclusions
  excluded: z.boolean().default(false),
  exclusionReason: z.string().optional(),
  
  // Modifications
  modifications: z.array(z.object({
    type: z.enum(['reps', 'sets', 'rest', 'tempo']),
    value: z.union([z.number(), z.string()]),
    reason: z.string(),
  })).optional(),
  
  // Timestamps
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export type UserExercisePreferences = z.infer<typeof userExercisePreferencesSchema>;

/**
 * User fitness goals
 */
export const userFitnessGoalsSchema = z.object({
  userId: z.string().uuid(),
  
  // Primary goal
  primaryGoal: z.enum(['fat_loss', 'muscle_gain', 'general_fitness', 'mobility']),
  
  // Secondary goals
  secondaryGoals: z.array(z.enum(['fat_loss', 'muscle_gain', 'general_fitness', 'mobility'])).max(2).optional(),
  
  // Experience
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  
  // Constraints
  limitations: z.array(z.string()).optional(), // Medical conditions, injuries, etc.
  equipment: z.array(z.string()).optional(),
  
  // Preferences
  preferredWorkoutDays: z.array(z.number().int().min(0).max(6)).optional(), // 0=Sunday
  preferredSessionDurationMs: z.number().int().positive().optional(),
  
  // Notifications
  reminderEnabled: z.boolean().default(true),
  reminderTime: z.string().optional(), // HH:mm format
  
  // Timestamps
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export type UserFitnessGoals = z.infer<typeof userFitnessGoalsSchema>;

// =============================================================================
// Export all schemas and types
// =============================================================================

export const planTypes = {
  PLAN_STATUS,
  ADJUSTMENT_REASONS,
  PLANNING_JOB_STATUS,
  
  // Schemas
  planExerciseSchema,
  workoutDaySchema,
  workoutPlanSchema,
  progressSummarySchema,
  aiPlanningRequestSchema,
  planningJobSchema,
  userExercisePreferencesSchema,
  userFitnessGoalsSchema,
} as const;

export default planTypes;
