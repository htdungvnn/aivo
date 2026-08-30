/**
 * AIVO Fitness Types - Workout Session
 * Session management, state, and summary types
 */

import { z } from 'zod';
import { repSummarySchema, setSummarySchema } from './exercise.js';

// =============================================================================
// Session Status
// =============================================================================

export const SESSION_STATUS = {
  PLANNED: 'planned',
  IN_PROGRESS: 'in_progress',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  SYNCED: 'synced',
  FAILED_SYNC: 'failed_sync',
} as const;

export type SessionStatus = (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];

// =============================================================================
// Workout Session
// =============================================================================

/**
 * Active workout session
 */
export const workoutSessionSchema = z.object({
  // Identification
  id: z.string().uuid(),
  userId: z.string().uuid(),
  planId: z.string().uuid().optional(),
  planRevision: z.number().int().positive().optional(),
  
  // Status
  status: z.enum([
    SESSION_STATUS.PLANNED,
    SESSION_STATUS.IN_PROGRESS,
    SESSION_STATUS.PAUSED,
    SESSION_STATUS.COMPLETED,
    SESSION_STATUS.CANCELLED,
    SESSION_STATUS.SYNCED,
    SESSION_STATUS.FAILED_SYNC,
  ]),
  
  // Timing
  createdAt: z.number().int().positive(),
  startedAt: z.number().int().positive().optional(),
  pausedAt: z.number().int().positive().optional(),
  completedAt: z.number().int().positive().optional(),
  lastSyncAt: z.number().int().positive().optional(),
  
  // Exercises in this session
  exercises: z.array(z.object({
    exerciseCode: z.string(),
    order: z.number().int().nonnegative(),
    targetSets: z.number().int().positive().default(3),
    targetReps: z.number().int().positive().default(10),
    
    // Sets completed
    sets: z.array(setSummarySchema),
    
    // Current exercise state
    currentSetIndex: z.number().int().nonnegative().default(0),
    isActive: z.boolean().default(false),
  })),
  
  // Current exercise index
  currentExerciseIndex: z.number().int().nonnegative().default(0),
  
  // Metadata
  deviceInfo: z.object({
    platform: z.string(),
    model: z.string().optional(),
    osVersion: z.string().optional(),
  }).optional(),
  
  // Engine versions for reproducibility
  engineVersion: z.string().default('1.0.0'),
  wasmVersion: z.string().default('1.0.0'),
  
  // Idempotency
  idempotencyKey: z.string().optional(),
});

export type WorkoutSession = z.infer<typeof workoutSessionSchema>;

// =============================================================================
// Session Summary
// =============================================================================

/**
 * Aggregated summary of a completed workout session
 */
export const workoutSummarySchema = z.object({
  // Identification
  id: z.string().uuid(),
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),
  planId: z.string().uuid().optional(),
  
  // Timing
  createdAt: z.number().int().positive(),
  startedAt: z.number().int().positive(),
  completedAt: z.number().int().positive(),
  durationMs: z.number().int().positive(),
  
  // Exercise breakdown
  exercises: z.array(z.object({
    exerciseCode: z.string(),
    exerciseName: z.string(),
    
    // Set summaries
    totalSets: z.number().int().nonnegative(),
    completedSets: z.number().int().nonnegative(),
    skippedSets: z.number().int().nonnegative(),
    totalReps: z.number().int().nonnegative(),
    
    // Aggregate metrics
    averageRangeOfMotion: z.number().min(0).max(1),
    averageQualityScore: z.number().min(0).max(100),
    averageTempoSeconds: z.number().positive(),
    
    // Correction counts
    correctionCounts: z.record(z.string(), z.number()),
    totalCorrections: z.number().int().nonnegative(),
    
    // Duration
    totalDurationMs: z.number().int().positive(),
    
    // Rep details (optional for bandwidth optimization)
    repDetails: z.array(repSummarySchema).optional(),
  })),
  
  // Overall metrics
  totalSets: z.number().int().nonnegative(),
  completedSets: z.number().int().nonnegative(),
  totalReps: z.number().int().nonnegative(),
  
  // Quality metrics
  overallRangeOfMotion: z.number().min(0).max(1),
  overallQualityScore: z.number().min(0).max(100),
  overallConfidence: z.number().min(0).max(1),
  
  // Form compliance
  formComplianceRate: z.number().min(0).max(1), // Percentage of reps without warnings/criticals
  
  // Workout completeness
  completionPercentage: z.number().min(0).max(1),
  
  // Corrections
  totalCorrectionCount: z.number().int().nonnegative(),
  correctionBreakdown: z.record(z.string(), z.number()),
  
  // User feedback
  userRating: z.number().int().min(1).max(5).optional(),
  userNotes: z.string().max(500).optional(),
  
  // Energy expenditure estimate (not calories from pose)
  estimatedIntensity: z.enum(['low', 'moderate', 'high']).optional(),
  
  // Engine versions
  engineVersion: z.string(),
  wasmVersion: z.string(),
  
  // Validation
  validatedAt: z.number().int().positive().optional(),
  validatedBy: z.string().optional(),
});

export type WorkoutSummary = z.infer<typeof workoutSummarySchema>;

// =============================================================================
// Rest Timer
// =============================================================================

/**
 * Rest timer configuration
 */
export const restTimerSchema = z.object({
  isActive: z.boolean().default(false),
  durationMs: z.number().int().positive(),
  remainingMs: z.number().int().nonnegative(),
  isPaused: z.boolean().default(false),
  startedAt: z.number().int().positive().optional(),
});

export type RestTimer = z.infer<typeof restTimerSchema>;

// =============================================================================
// Session State Machine
// =============================================================================

/**
 * Valid session status transitions
 */
export const SESSION_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  [SESSION_STATUS.PLANNED]: [SESSION_STATUS.IN_PROGRESS, SESSION_STATUS.CANCELLED],
  [SESSION_STATUS.IN_PROGRESS]: [SESSION_STATUS.PAUSED, SESSION_STATUS.COMPLETED, SESSION_STATUS.CANCELLED],
  [SESSION_STATUS.PAUSED]: [SESSION_STATUS.IN_PROGRESS, SESSION_STATUS.CANCELLED],
  [SESSION_STATUS.COMPLETED]: [SESSION_STATUS.SYNCED],
  [SESSION_STATUS.CANCELLED]: [],
  [SESSION_STATUS.SYNCED]: [],
  [SESSION_STATUS.FAILED_SYNC]: [SESSION_STATUS.SYNCED, SESSION_STATUS.CANCELLED],
};

/**
 * Check if a session status transition is valid
 */
export function isValidSessionTransition(
  currentStatus: SessionStatus,
  newStatus: SessionStatus
): boolean {
  return SESSION_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

// =============================================================================
// Local Session Storage
// =============================================================================

/**
 * Keys for local storage
 */
export const SESSION_STORAGE_KEYS = {
  ACTIVE_SESSION: 'aivo_active_workout_session',
  PENDING_SESSIONS: 'aivo_pending_workout_sessions',
  SESSION_CHECKPOINT: 'aivo_session_checkpoint',
} as const;

/**
 * Session checkpoint for recovery
 */
export const sessionCheckpointSchema = z.object({
  sessionId: z.string().uuid(),
  timestamp: z.number().int().positive(),
  exerciseIndex: z.number().int().nonnegative(),
  setIndex: z.number().int().nonnegative(),
  lastProcessedTimestamp: z.number().int().positive(),
});

export type SessionCheckpoint = z.infer<typeof sessionCheckpointSchema>;

// =============================================================================
// Offline Sync
// =============================================================================

/**
 * Pending sync operation
 */
export const pendingSyncSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['create', 'update', 'complete', 'cancel']),
  sessionId: z.string().uuid(),
  payload: z.unknown(),
  createdAt: z.number().int().positive(),
  retryCount: z.number().int().nonnegative().default(0),
  lastError: z.string().optional(),
});

export type PendingSync = z.infer<typeof pendingSyncSchema>;

// =============================================================================
// Session Events
// =============================================================================

/**
 * Events that can occur during a session
 */
export const SESSION_EVENTS = {
  SESSION_STARTED: 'session_started',
  SESSION_PAUSED: 'session_paused',
  SESSION_RESUMED: 'session_resumed',
  SESSION_COMPLETED: 'session_completed',
  SESSION_CANCELLED: 'session_cancelled',
  
  EXERCISE_STARTED: 'exercise_started',
  EXERCISE_COMPLETED: 'exercise_completed',
  EXERCISE_SKIPPED: 'exercise_skipped',
  
  SET_STARTED: 'set_started',
  SET_COMPLETED: 'set_completed',
  SET_SKIPPED: 'set_skipped',
  
  REP_COUNTED: 'rep_counted',
  CORRECTION_GIVEN: 'correction_given',
  
  REST_STARTED: 'rest_started',
  REST_ENDED: 'rest_ended',
  
  CALIBRATION_STARTED: 'calibration_started',
  CALIBRATION_COMPLETED: 'calibration_completed',
  CALIBRATION_FAILED: 'calibration_failed',
  
  POSE_LOST: 'pose_lost',
  POSE_RECOVERED: 'pose_recovered',
  
  SYNC_STARTED: 'sync_started',
  SYNC_COMPLETED: 'sync_completed',
  SYNC_FAILED: 'sync_failed',
} as const;

export type SessionEvent = (typeof SESSION_EVENTS)[keyof typeof SESSION_EVENTS];

// =============================================================================
// Export all schemas and types
// =============================================================================

export const workoutSessionTypes = {
  SESSION_STATUS,
  SESSION_TRANSITIONS,
  SESSION_EVENTS,
  SESSION_STORAGE_KEYS,
  
  // Schemas
  workoutSessionSchema,
  workoutSummarySchema,
  restTimerSchema,
  sessionCheckpointSchema,
  pendingSyncSchema,
  
  // Functions
  isValidSessionTransition,
  
  // Type exports
  SessionStatus,
  WorkoutSession,
  WorkoutSummary,
  RestTimer,
  SessionCheckpoint,
  PendingSync,
  SessionEvent,
} as const;

export default workoutSessionTypes;
