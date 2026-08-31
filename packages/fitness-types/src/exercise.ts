/**
 * AIVO Fitness Types - Exercise Definitions
 * Exercise codes, phases, and configuration
 */

import { z } from 'zod';

// =============================================================================
// Exercise Codes (MVP Exercises)
// =============================================================================

export const EXERCISE_CODES = {
  SQUAT: 'squat',
  PUSH_UP: 'push_up',
  LUNGE: 'lunge',
  SHOULDER_PRESS: 'shoulder_press',
  PLANK: 'plank',
} as const;

export type ExerciseCode = (typeof EXERCISE_CODES)[keyof typeof EXERCISE_CODES];

// All supported exercises
export const SUPPORTED_EXERCISES = Object.values(EXERCISE_CODES) as ExerciseCode[];

// =============================================================================
// Exercise Phases (State Machine States)
// =============================================================================

/**
 * Generic exercise phases that can be applied to most exercises
 */
export const EXERCISE_PHASES = {
  READY: 'ready',           // Initial position, waiting to start
  DESCENDING: 'descending', // Movement phase: going down/forward
  BOTTOM: 'bottom',         // Transition point at deepest position
  ASCENDING: 'ascending',   // Movement phase: coming up/back
  COMPLETED: 'completed',   // Full rep completed
  PAUSED: 'paused',         // Exercise paused
  CALIBRATING: 'calibrating', // Initial calibration phase
} as const;

export type ExercisePhase = (typeof EXERCISE_PHASES)[keyof typeof EXERCISE_PHASES];

/**
 * Plank has special phases since it's a static hold
 */
export const PLANK_PHASES = {
  ...EXERCISE_PHASES,
  HOLDING: 'holding',       // Maintaining plank position
  FATIGUE: 'fatigue',      // Showing signs of fatigue
  FAILED: 'failed',         // Form breakdown detected
} as const;

export type PlankPhase = (typeof PLANK_PHASES)[keyof typeof PLANK_PHASES];

// =============================================================================
// Exercise Phase Transitions
// =============================================================================

/**
 * Valid phase transitions for standard exercises
 */
export const PHASE_TRANSITIONS: Record<ExercisePhase, ExercisePhase[]> = {
  [EXERCISE_PHASES.READY]: [EXERCISE_PHASES.DESCENDING, EXERCISE_PHASES.CALIBRATING],
  [EXERCISE_PHASES.CALIBRATING]: [EXERCISE_PHASES.READY],
  [EXERCISE_PHASES.DESCENDING]: [EXERCISE_PHASES.BOTTOM, EXERCISE_PHASES.READY],
  [EXERCISE_PHASES.BOTTOM]: [EXERCISE_PHASES.ASCENDING, EXERCISE_PHASES.READY],
  [EXERCISE_PHASES.ASCENDING]: [EXERCISE_PHASES.COMPLETED, EXERCISE_PHASES.DESCENDING],
  [EXERCISE_PHASES.COMPLETED]: [EXERCISE_PHASES.READY],
  [EXERCISE_PHASES.PAUSED]: [EXERCISE_PHASES.READY],
};

/**
 * Check if a phase transition is valid
 */
export function isValidPhaseTransition(
  currentPhase: ExercisePhase,
  newPhase: ExercisePhase
): boolean {
  return PHASE_TRANSITIONS[currentPhase]?.includes(newPhase) ?? false;
}

// =============================================================================
// Joint Angle Thresholds
// =============================================================================

/**
 * Joint angle definitions for exercises
 */
export const jointAngleDefinitionsSchema = z.object({
  joint: z.string(), // e.g., 'left_knee', 'right_hip', 'spine'
  angleAtStart: z.number().min(0).max(180),
  angleAtBottom: z.number().min(0).max(180),
  angleAtTop: z.number().min(0).max(180),
});

export type JointAngleDefinition = z.infer<typeof jointAngleDefinitionsSchema>;

// =============================================================================
// Range of Motion Rules
// =============================================================================

/**
 * Range of motion requirements for a complete rep
 */
export const rangeOfMotionSchema = z.object({
  minAngle: z.number().min(0).max(180), // Minimum angle during movement
  maxAngle: z.number().min(0).max(180), // Maximum angle at start
  requiredChange: z.number().min(0).max(180), // Minimum angular change for valid rep
  measurementJoint: z.string(), // Which joint to measure
});

export type RangeOfMotion = z.infer<typeof rangeOfMotionSchema>;

// =============================================================================
// Exercise Difficulty Levels
// =============================================================================

export const EXERCISE_DIFFICULTY = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const;

export type ExerciseDifficulty = (typeof EXERCISE_DIFFICULTY)[keyof typeof EXERCISE_DIFFICULTY];

// =============================================================================
// User Goals
// =============================================================================

export const USER_GOALS = {
  FAT_LOSS: 'fat_loss',
  MUSCLE_GAIN: 'muscle_gain',
  GENERAL_FITNESS: 'general_fitness',
  MOBILITY: 'mobility',
} as const;

export type UserGoal = (typeof USER_GOALS)[keyof typeof USER_GOALS];

// =============================================================================
// Exercise Definition
// =============================================================================

/**
 * Complete exercise definition including rules and metadata
 */
export const exerciseDefinitionSchema = z.object({
  code: z.enum([EXERCISE_CODES.SQUAT, EXERCISE_CODES.PUSH_UP, EXERCISE_CODES.LUNGE, EXERCISE_CODES.SHOULDER_PRESS, EXERCISE_CODES.PLANK]),
  name: z.object({
    en: z.string(),
    vi: z.string(),
  }),
  description: z.object({
    en: z.string(),
    vi: z.string(),
  }),
  difficulty: z.enum([EXERCISE_DIFFICULTY.BEGINNER, EXERCISE_DIFFICULTY.INTERMEDIATE, EXERCISE_DIFFICULTY.ADVANCED]),
  goals: z.array(z.enum([USER_GOALS.FAT_LOSS, USER_GOALS.MUSCLE_GAIN, USER_GOALS.GENERAL_FITNESS, USER_GOALS.MOBILITY])),
  
  // Visual setup
  thumbnailUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  
  // Required joints for this exercise
  requiredJoints: z.array(z.string()),
  optionalJoints: z.array(z.string()).optional(),
  
  // Camera requirements
  cameraOrientation: z.enum(['front', 'side_left', 'side_right', 'any']),
  sideDetection: z.enum(['none', 'left', 'right', 'both']).default('none'),
  
  // Phase configuration
  phases: z.array(z.object({
    name: z.string(),
    minDurationMs: z.number().int().nonnegative().default(0),
    maxDurationMs: z.number().int().positive().optional(),
  })),
  
  // Rep counting rules
  rangeOfMotion: rangeOfMotionSchema,
  repCooldownMs: z.number().int().positive().default(500), // Min time between reps
  
  // Timing constraints
  minTempoMs: z.number().int().positive().default(1000), // Min duration for rep
  maxTempoMs: z.number().int().positive().default(10000), // Max duration for rep
  
  // Calibration
  calibrationPose: z.object({
    phase: z.string(),
    requiredJointsVisible: z.number().min(0).max(1).default(0.7),
    holdDurationMs: z.number().int().positive().default(2000),
  }),
  
  // Form rules (correction codes that apply)
  formRules: z.array(z.string()),
  
  // Scoring weights
  scoringWeights: z.object({
    rangeOfMotion: z.number().min(0).max(1).default(0.4),
    tempo: z.number().min(0).max(1).default(0.2),
    stability: z.number().min(0).max(1).default(0.2),
    symmetry: z.number().min(0).max(1).default(0.2),
  }).default({
    rangeOfMotion: 0.4,
    tempo: 0.2,
    stability: 0.2,
    symmetry: 0.2,
  }),
  
  // Version tracking
  version: z.string().default('1.0.0'),
  engineVersion: z.string().default('1.0.0'),
});

export type ExerciseDefinition = z.infer<typeof exerciseDefinitionSchema>;

// =============================================================================
// Exercise Set Configuration
// =============================================================================

/**
 * Default set configuration
 */
export const defaultSetConfigSchema = z.object({
  targetReps: z.number().int().positive().default(10),
  targetSets: z.number().int().positive().default(3),
  restBetweenSetsMs: z.number().int().positive().default(60000), // 60 seconds
  restAfterExerciseMs: z.number().int().positive().default(90000), // 90 seconds
});

export type DefaultSetConfig = z.infer<typeof defaultSetConfigSchema>;

// =============================================================================
// Exercise Sets and Reps Tracking
// =============================================================================

/**
 * Set completion status
 */
export const SET_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  SKIPPED: 'skipped',
  FAILED: 'failed',
} as const;

export type SetStatus = (typeof SET_STATUS)[keyof typeof SET_STATUS];

/**
 * Rep tracking within a set
 */
export const repSummarySchema = z.object({
  repNumber: z.number().int().positive(),
  rangeOfMotion: z.number().min(0).max(1),
  tempoSeconds: z.number().positive(),
  qualityScore: z.number().min(0).max(100),
  corrections: z.array(z.string()), // Correction codes
  durationMs: z.number().int().positive(),
  timestamp: z.number().int().positive(),
});

export type RepSummary = z.infer<typeof repSummarySchema>;

/**
 * Set summary
 */
export const setSummarySchema = z.object({
  setNumber: z.number().int().positive(),
  status: z.enum([SET_STATUS.PENDING, SET_STATUS.IN_PROGRESS, SET_STATUS.COMPLETED, SET_STATUS.SKIPPED, SET_STATUS.FAILED]),
  targetReps: z.number().int().positive(),
  completedReps: z.number().int().nonnegative(),
  repDetails: z.array(repSummarySchema).optional(),
  
  // Aggregate metrics
  averageRangeOfMotion: z.number().min(0).max(1).optional(),
  averageTempoSeconds: z.number().positive().optional(),
  averageQualityScore: z.number().min(0).max(100).optional(),
  
  // Timing
  startTime: z.number().int().positive().optional(),
  endTime: z.number().int().positive().optional(),
  restDurationMs: z.number().int().nonnegative().optional(),
  
  // Corrections
  correctionCounts: z.record(z.string(), z.number()).default({}),
  
  // Confidence
  averageConfidence: z.number().min(0).max(1).optional(),
});

export type SetSummary = z.infer<typeof setSummarySchema>;

// =============================================================================
// Export all schemas and types
// =============================================================================

export const exerciseTypes = {
  EXERCISE_CODES,
  EXERCISE_PHASES,
  PLANK_PHASES,
  PHASE_TRANSITIONS,
  EXERCISE_DIFFICULTY,
  USER_GOALS,
  SET_STATUS,
  
  // Schemas
  jointAngleDefinitionsSchema,
  rangeOfMotionSchema,
  exerciseDefinitionSchema,
  defaultSetConfigSchema,
  repSummarySchema,
  setSummarySchema,
  
  // Functions
  isValidPhaseTransition,
} as const;

export default exerciseTypes;
