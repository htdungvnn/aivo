/**
 * AIVO Fitness Types - Workout Session
 * Session management, state, and summary types
 */
import { z } from 'zod';
export declare const SESSION_STATUS: {
    readonly PLANNED: 'planned';
    readonly IN_PROGRESS: 'in_progress';
    readonly PAUSED: 'paused';
    readonly COMPLETED: 'completed';
    readonly CANCELLED: 'cancelled';
    readonly SYNCED: 'synced';
    readonly FAILED_SYNC: 'failed_sync';
};
export type SessionStatus = (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];
/**
 * Active workout session
 */
export declare const workoutSessionSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    planId: z.ZodOptional<z.ZodString>;
    planRevision: z.ZodOptional<z.ZodNumber>;
    status: z.ZodEnum<{
        cancelled: "cancelled";
        completed: "completed";
        failed_sync: "failed_sync";
        in_progress: "in_progress";
        paused: "paused";
        planned: "planned";
        synced: "synced";
    }>;
    createdAt: z.ZodNumber;
    startedAt: z.ZodOptional<z.ZodNumber>;
    pausedAt: z.ZodOptional<z.ZodNumber>;
    completedAt: z.ZodOptional<z.ZodNumber>;
    lastSyncAt: z.ZodOptional<z.ZodNumber>;
    exercises: z.ZodArray<z.ZodObject<{
        exerciseCode: z.ZodString;
        order: z.ZodNumber;
        targetSets: z.ZodDefault<z.ZodNumber>;
        targetReps: z.ZodDefault<z.ZodNumber>;
        sets: z.ZodArray<z.ZodObject<{
            setNumber: z.ZodNumber;
            status: z.ZodEnum<{
                completed: "completed";
                failed: "failed";
                in_progress: "in_progress";
                pending: "pending";
                skipped: "skipped";
            }>;
            targetReps: z.ZodNumber;
            completedReps: z.ZodNumber;
            repDetails: z.ZodOptional<z.ZodArray<z.ZodObject<{
                repNumber: z.ZodNumber;
                rangeOfMotion: z.ZodNumber;
                tempoSeconds: z.ZodNumber;
                qualityScore: z.ZodNumber;
                corrections: z.ZodArray<z.ZodString>;
                durationMs: z.ZodNumber;
                timestamp: z.ZodNumber;
            }, z.core.$strip>>>;
            averageRangeOfMotion: z.ZodOptional<z.ZodNumber>;
            averageTempoSeconds: z.ZodOptional<z.ZodNumber>;
            averageQualityScore: z.ZodOptional<z.ZodNumber>;
            startTime: z.ZodOptional<z.ZodNumber>;
            endTime: z.ZodOptional<z.ZodNumber>;
            restDurationMs: z.ZodOptional<z.ZodNumber>;
            correctionCounts: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
            averageConfidence: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        currentSetIndex: z.ZodDefault<z.ZodNumber>;
        isActive: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>;
    currentExerciseIndex: z.ZodDefault<z.ZodNumber>;
    deviceInfo: z.ZodOptional<z.ZodObject<{
        platform: z.ZodString;
        model: z.ZodOptional<z.ZodString>;
        osVersion: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    engineVersion: z.ZodDefault<z.ZodString>;
    wasmVersion: z.ZodDefault<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type WorkoutSession = z.infer<typeof workoutSessionSchema>;
/**
 * Aggregated summary of a completed workout session
 */
export declare const workoutSummarySchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    sessionId: z.ZodString;
    planId: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodNumber;
    startedAt: z.ZodNumber;
    completedAt: z.ZodNumber;
    durationMs: z.ZodNumber;
    exercises: z.ZodArray<z.ZodObject<{
        exerciseCode: z.ZodString;
        exerciseName: z.ZodString;
        totalSets: z.ZodNumber;
        completedSets: z.ZodNumber;
        skippedSets: z.ZodNumber;
        totalReps: z.ZodNumber;
        averageRangeOfMotion: z.ZodNumber;
        averageQualityScore: z.ZodNumber;
        averageTempoSeconds: z.ZodNumber;
        correctionCounts: z.ZodRecord<z.ZodString, z.ZodNumber>;
        totalCorrections: z.ZodNumber;
        totalDurationMs: z.ZodNumber;
        repDetails: z.ZodOptional<z.ZodArray<z.ZodObject<{
            repNumber: z.ZodNumber;
            rangeOfMotion: z.ZodNumber;
            tempoSeconds: z.ZodNumber;
            qualityScore: z.ZodNumber;
            corrections: z.ZodArray<z.ZodString>;
            durationMs: z.ZodNumber;
            timestamp: z.ZodNumber;
        }, z.core.$strip>>>;
    }, z.core.$strip>>;
    totalSets: z.ZodNumber;
    completedSets: z.ZodNumber;
    totalReps: z.ZodNumber;
    overallRangeOfMotion: z.ZodNumber;
    overallQualityScore: z.ZodNumber;
    overallConfidence: z.ZodNumber;
    formComplianceRate: z.ZodNumber;
    completionPercentage: z.ZodNumber;
    totalCorrectionCount: z.ZodNumber;
    correctionBreakdown: z.ZodRecord<z.ZodString, z.ZodNumber>;
    userRating: z.ZodOptional<z.ZodNumber>;
    userNotes: z.ZodOptional<z.ZodString>;
    estimatedIntensity: z.ZodOptional<z.ZodEnum<{
        high: "high";
        low: "low";
        moderate: "moderate";
    }>>;
    engineVersion: z.ZodString;
    wasmVersion: z.ZodString;
    validatedAt: z.ZodOptional<z.ZodNumber>;
    validatedBy: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type WorkoutSummary = z.infer<typeof workoutSummarySchema>;
/**
 * Rest timer configuration
 */
export declare const restTimerSchema: z.ZodObject<{
    isActive: z.ZodDefault<z.ZodBoolean>;
    durationMs: z.ZodNumber;
    remainingMs: z.ZodNumber;
    isPaused: z.ZodDefault<z.ZodBoolean>;
    startedAt: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type RestTimer = z.infer<typeof restTimerSchema>;
/**
 * Valid session status transitions
 */
export declare const SESSION_TRANSITIONS: Record<SessionStatus, SessionStatus[]>;
/**
 * Check if a session status transition is valid
 */
export declare function isValidSessionTransition(currentStatus: SessionStatus, newStatus: SessionStatus): boolean;
/**
 * Keys for local storage
 */
export declare const SESSION_STORAGE_KEYS: {
    readonly ACTIVE_SESSION: 'aivo_active_workout_session';
    readonly PENDING_SESSIONS: 'aivo_pending_workout_sessions';
    readonly SESSION_CHECKPOINT: 'aivo_session_checkpoint';
};
/**
 * Session checkpoint for recovery
 */
export declare const sessionCheckpointSchema: z.ZodObject<{
    sessionId: z.ZodString;
    timestamp: z.ZodNumber;
    exerciseIndex: z.ZodNumber;
    setIndex: z.ZodNumber;
    lastProcessedTimestamp: z.ZodNumber;
}, z.core.$strip>;
export type SessionCheckpoint = z.infer<typeof sessionCheckpointSchema>;
/**
 * Pending sync operation
 */
export declare const pendingSyncSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<{
        cancel: "cancel";
        complete: "complete";
        create: "create";
        update: "update";
    }>;
    sessionId: z.ZodString;
    payload: z.ZodUnknown;
    createdAt: z.ZodNumber;
    retryCount: z.ZodDefault<z.ZodNumber>;
    lastError: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type PendingSync = z.infer<typeof pendingSyncSchema>;
/**
 * Events that can occur during a session
 */
export declare const SESSION_EVENTS: {
    readonly SESSION_STARTED: 'session_started';
    readonly SESSION_PAUSED: 'session_paused';
    readonly SESSION_RESUMED: 'session_resumed';
    readonly SESSION_COMPLETED: 'session_completed';
    readonly SESSION_CANCELLED: 'session_cancelled';
    readonly EXERCISE_STARTED: 'exercise_started';
    readonly EXERCISE_COMPLETED: 'exercise_completed';
    readonly EXERCISE_SKIPPED: 'exercise_skipped';
    readonly SET_STARTED: 'set_started';
    readonly SET_COMPLETED: 'set_completed';
    readonly SET_SKIPPED: 'set_skipped';
    readonly REP_COUNTED: 'rep_counted';
    readonly CORRECTION_GIVEN: 'correction_given';
    readonly REST_STARTED: 'rest_started';
    readonly REST_ENDED: 'rest_ended';
    readonly CALIBRATION_STARTED: 'calibration_started';
    readonly CALIBRATION_COMPLETED: 'calibration_completed';
    readonly CALIBRATION_FAILED: 'calibration_failed';
    readonly POSE_LOST: 'pose_lost';
    readonly POSE_RECOVERED: 'pose_recovered';
    readonly SYNC_STARTED: 'sync_started';
    readonly SYNC_COMPLETED: 'sync_completed';
    readonly SYNC_FAILED: 'sync_failed';
};
export type SessionEvent = (typeof SESSION_EVENTS)[keyof typeof SESSION_EVENTS];
export declare const workoutSessionTypes: {
    readonly SESSION_STATUS: {
        readonly PLANNED: 'planned';
        readonly IN_PROGRESS: 'in_progress';
        readonly PAUSED: 'paused';
        readonly COMPLETED: 'completed';
        readonly CANCELLED: 'cancelled';
        readonly SYNCED: 'synced';
        readonly FAILED_SYNC: 'failed_sync';
    };
    readonly SESSION_TRANSITIONS: Record<SessionStatus, SessionStatus[]>;
    readonly SESSION_EVENTS: {
        readonly SESSION_STARTED: 'session_started';
        readonly SESSION_PAUSED: 'session_paused';
        readonly SESSION_RESUMED: 'session_resumed';
        readonly SESSION_COMPLETED: 'session_completed';
        readonly SESSION_CANCELLED: 'session_cancelled';
        readonly EXERCISE_STARTED: 'exercise_started';
        readonly EXERCISE_COMPLETED: 'exercise_completed';
        readonly EXERCISE_SKIPPED: 'exercise_skipped';
        readonly SET_STARTED: 'set_started';
        readonly SET_COMPLETED: 'set_completed';
        readonly SET_SKIPPED: 'set_skipped';
        readonly REP_COUNTED: 'rep_counted';
        readonly CORRECTION_GIVEN: 'correction_given';
        readonly REST_STARTED: 'rest_started';
        readonly REST_ENDED: 'rest_ended';
        readonly CALIBRATION_STARTED: 'calibration_started';
        readonly CALIBRATION_COMPLETED: 'calibration_completed';
        readonly CALIBRATION_FAILED: 'calibration_failed';
        readonly POSE_LOST: 'pose_lost';
        readonly POSE_RECOVERED: 'pose_recovered';
        readonly SYNC_STARTED: 'sync_started';
        readonly SYNC_COMPLETED: 'sync_completed';
        readonly SYNC_FAILED: 'sync_failed';
    };
    readonly SESSION_STORAGE_KEYS: {
        readonly ACTIVE_SESSION: 'aivo_active_workout_session';
        readonly PENDING_SESSIONS: 'aivo_pending_workout_sessions';
        readonly SESSION_CHECKPOINT: 'aivo_session_checkpoint';
    };
    readonly workoutSessionSchema: z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        planId: z.ZodOptional<z.ZodString>;
        planRevision: z.ZodOptional<z.ZodNumber>;
        status: z.ZodEnum<{
            cancelled: "cancelled";
            completed: "completed";
            failed_sync: "failed_sync";
            in_progress: "in_progress";
            paused: "paused";
            planned: "planned";
            synced: "synced";
        }>;
        createdAt: z.ZodNumber;
        startedAt: z.ZodOptional<z.ZodNumber>;
        pausedAt: z.ZodOptional<z.ZodNumber>;
        completedAt: z.ZodOptional<z.ZodNumber>;
        lastSyncAt: z.ZodOptional<z.ZodNumber>;
        exercises: z.ZodArray<z.ZodObject<{
            exerciseCode: z.ZodString;
            order: z.ZodNumber;
            targetSets: z.ZodDefault<z.ZodNumber>;
            targetReps: z.ZodDefault<z.ZodNumber>;
            sets: z.ZodArray<z.ZodObject<{
                setNumber: z.ZodNumber;
                status: z.ZodEnum<{
                    completed: "completed";
                    failed: "failed";
                    in_progress: "in_progress";
                    pending: "pending";
                    skipped: "skipped";
                }>;
                targetReps: z.ZodNumber;
                completedReps: z.ZodNumber;
                repDetails: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    repNumber: z.ZodNumber;
                    rangeOfMotion: z.ZodNumber;
                    tempoSeconds: z.ZodNumber;
                    qualityScore: z.ZodNumber;
                    corrections: z.ZodArray<z.ZodString>;
                    durationMs: z.ZodNumber;
                    timestamp: z.ZodNumber;
                }, z.core.$strip>>>;
                averageRangeOfMotion: z.ZodOptional<z.ZodNumber>;
                averageTempoSeconds: z.ZodOptional<z.ZodNumber>;
                averageQualityScore: z.ZodOptional<z.ZodNumber>;
                startTime: z.ZodOptional<z.ZodNumber>;
                endTime: z.ZodOptional<z.ZodNumber>;
                restDurationMs: z.ZodOptional<z.ZodNumber>;
                correctionCounts: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
                averageConfidence: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strip>>;
            currentSetIndex: z.ZodDefault<z.ZodNumber>;
            isActive: z.ZodDefault<z.ZodBoolean>;
        }, z.core.$strip>>;
        currentExerciseIndex: z.ZodDefault<z.ZodNumber>;
        deviceInfo: z.ZodOptional<z.ZodObject<{
            platform: z.ZodString;
            model: z.ZodOptional<z.ZodString>;
            osVersion: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        engineVersion: z.ZodDefault<z.ZodString>;
        wasmVersion: z.ZodDefault<z.ZodString>;
        idempotencyKey: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    readonly workoutSummarySchema: z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        sessionId: z.ZodString;
        planId: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodNumber;
        startedAt: z.ZodNumber;
        completedAt: z.ZodNumber;
        durationMs: z.ZodNumber;
        exercises: z.ZodArray<z.ZodObject<{
            exerciseCode: z.ZodString;
            exerciseName: z.ZodString;
            totalSets: z.ZodNumber;
            completedSets: z.ZodNumber;
            skippedSets: z.ZodNumber;
            totalReps: z.ZodNumber;
            averageRangeOfMotion: z.ZodNumber;
            averageQualityScore: z.ZodNumber;
            averageTempoSeconds: z.ZodNumber;
            correctionCounts: z.ZodRecord<z.ZodString, z.ZodNumber>;
            totalCorrections: z.ZodNumber;
            totalDurationMs: z.ZodNumber;
            repDetails: z.ZodOptional<z.ZodArray<z.ZodObject<{
                repNumber: z.ZodNumber;
                rangeOfMotion: z.ZodNumber;
                tempoSeconds: z.ZodNumber;
                qualityScore: z.ZodNumber;
                corrections: z.ZodArray<z.ZodString>;
                durationMs: z.ZodNumber;
                timestamp: z.ZodNumber;
            }, z.core.$strip>>>;
        }, z.core.$strip>>;
        totalSets: z.ZodNumber;
        completedSets: z.ZodNumber;
        totalReps: z.ZodNumber;
        overallRangeOfMotion: z.ZodNumber;
        overallQualityScore: z.ZodNumber;
        overallConfidence: z.ZodNumber;
        formComplianceRate: z.ZodNumber;
        completionPercentage: z.ZodNumber;
        totalCorrectionCount: z.ZodNumber;
        correctionBreakdown: z.ZodRecord<z.ZodString, z.ZodNumber>;
        userRating: z.ZodOptional<z.ZodNumber>;
        userNotes: z.ZodOptional<z.ZodString>;
        estimatedIntensity: z.ZodOptional<z.ZodEnum<{
            high: "high";
            low: "low";
            moderate: "moderate";
        }>>;
        engineVersion: z.ZodString;
        wasmVersion: z.ZodString;
        validatedAt: z.ZodOptional<z.ZodNumber>;
        validatedBy: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    readonly restTimerSchema: z.ZodObject<{
        isActive: z.ZodDefault<z.ZodBoolean>;
        durationMs: z.ZodNumber;
        remainingMs: z.ZodNumber;
        isPaused: z.ZodDefault<z.ZodBoolean>;
        startedAt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    readonly sessionCheckpointSchema: z.ZodObject<{
        sessionId: z.ZodString;
        timestamp: z.ZodNumber;
        exerciseIndex: z.ZodNumber;
        setIndex: z.ZodNumber;
        lastProcessedTimestamp: z.ZodNumber;
    }, z.core.$strip>;
    readonly pendingSyncSchema: z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<{
            cancel: "cancel";
            complete: "complete";
            create: "create";
            update: "update";
        }>;
        sessionId: z.ZodString;
        payload: z.ZodUnknown;
        createdAt: z.ZodNumber;
        retryCount: z.ZodDefault<z.ZodNumber>;
        lastError: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    readonly isValidSessionTransition: typeof isValidSessionTransition;
};
export default workoutSessionTypes;
//# sourceMappingURL=workout-session.d.ts.map