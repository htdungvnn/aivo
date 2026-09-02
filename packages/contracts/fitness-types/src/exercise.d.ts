/**
 * AIVO Fitness Types - Exercise Definitions
 * Exercise codes, phases, and configuration
 */
import { z } from 'zod';
export declare const EXERCISE_CODES: {
    readonly SQUAT: 'squat';
    readonly PUSH_UP: 'push_up';
    readonly LUNGE: 'lunge';
    readonly SHOULDER_PRESS: 'shoulder_press';
    readonly PLANK: 'plank';
};
export type ExerciseCode = (typeof EXERCISE_CODES)[keyof typeof EXERCISE_CODES];
export declare const SUPPORTED_EXERCISES: ExerciseCode[];
/**
 * Generic exercise phases that can be applied to most exercises
 */
export declare const EXERCISE_PHASES: {
    readonly READY: 'ready';
    readonly DESCENDING: 'descending';
    readonly BOTTOM: 'bottom';
    readonly ASCENDING: 'ascending';
    readonly COMPLETED: 'completed';
    readonly PAUSED: 'paused';
    readonly CALIBRATING: 'calibrating';
};
export type ExercisePhase = (typeof EXERCISE_PHASES)[keyof typeof EXERCISE_PHASES];
/**
 * Plank has special phases since it's a static hold
 */
export declare const PLANK_PHASES: {
    readonly READY: 'ready';
    readonly DESCENDING: 'descending';
    readonly BOTTOM: 'bottom';
    readonly ASCENDING: 'ascending';
    readonly COMPLETED: 'completed';
    readonly PAUSED: 'paused';
    readonly CALIBRATING: 'calibrating';
    readonly HOLDING: 'holding';
    readonly FATIGUE: 'fatigue';
    readonly FAILED: 'failed';
};
export type PlankPhase = (typeof PLANK_PHASES)[keyof typeof PLANK_PHASES];
/**
 * Valid phase transitions for standard exercises
 */
export declare const PHASE_TRANSITIONS: Record<ExercisePhase, ExercisePhase[]>;
/**
 * Check if a phase transition is valid
 */
export declare function isValidPhaseTransition(currentPhase: ExercisePhase, newPhase: ExercisePhase): boolean;
/**
 * Joint angle definitions for exercises
 */
export declare const jointAngleDefinitionsSchema: z.ZodObject<{
    joint: z.ZodString;
    angleAtStart: z.ZodNumber;
    angleAtBottom: z.ZodNumber;
    angleAtTop: z.ZodNumber;
}, z.core.$strip>;
export type JointAngleDefinition = z.infer<typeof jointAngleDefinitionsSchema>;
/**
 * Range of motion requirements for a complete rep
 */
export declare const rangeOfMotionSchema: z.ZodObject<{
    minAngle: z.ZodNumber;
    maxAngle: z.ZodNumber;
    requiredChange: z.ZodNumber;
    measurementJoint: z.ZodString;
}, z.core.$strip>;
export type RangeOfMotion = z.infer<typeof rangeOfMotionSchema>;
export declare const EXERCISE_DIFFICULTY: {
    readonly BEGINNER: 'beginner';
    readonly INTERMEDIATE: 'intermediate';
    readonly ADVANCED: 'advanced';
};
export type ExerciseDifficulty = (typeof EXERCISE_DIFFICULTY)[keyof typeof EXERCISE_DIFFICULTY];
export declare const USER_GOALS: {
    readonly FAT_LOSS: 'fat_loss';
    readonly MUSCLE_GAIN: 'muscle_gain';
    readonly GENERAL_FITNESS: 'general_fitness';
    readonly MOBILITY: 'mobility';
};
export type UserGoal = (typeof USER_GOALS)[keyof typeof USER_GOALS];
/**
 * Complete exercise definition including rules and metadata
 */
export declare const exerciseDefinitionSchema: z.ZodObject<{
    code: z.ZodEnum<{
        lunge: "lunge";
        plank: "plank";
        push_up: "push_up";
        shoulder_press: "shoulder_press";
        squat: "squat";
    }>;
    name: z.ZodObject<{
        en: z.ZodString;
        vi: z.ZodString;
    }, z.core.$strip>;
    description: z.ZodObject<{
        en: z.ZodString;
        vi: z.ZodString;
    }, z.core.$strip>;
    difficulty: z.ZodEnum<{
        advanced: "advanced";
        beginner: "beginner";
        intermediate: "intermediate";
    }>;
    goals: z.ZodArray<z.ZodEnum<{
        fat_loss: "fat_loss";
        general_fitness: "general_fitness";
        mobility: "mobility";
        muscle_gain: "muscle_gain";
    }>>;
    thumbnailUrl: z.ZodOptional<z.ZodString>;
    videoUrl: z.ZodOptional<z.ZodString>;
    requiredJoints: z.ZodArray<z.ZodString>;
    optionalJoints: z.ZodOptional<z.ZodArray<z.ZodString>>;
    cameraOrientation: z.ZodEnum<{
        any: "any";
        front: "front";
        side_left: "side_left";
        side_right: "side_right";
    }>;
    sideDetection: z.ZodDefault<z.ZodEnum<{
        both: "both";
        left: "left";
        none: "none";
        right: "right";
    }>>;
    phases: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        minDurationMs: z.ZodDefault<z.ZodNumber>;
        maxDurationMs: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    rangeOfMotion: z.ZodObject<{
        minAngle: z.ZodNumber;
        maxAngle: z.ZodNumber;
        requiredChange: z.ZodNumber;
        measurementJoint: z.ZodString;
    }, z.core.$strip>;
    repCooldownMs: z.ZodDefault<z.ZodNumber>;
    minTempoMs: z.ZodDefault<z.ZodNumber>;
    maxTempoMs: z.ZodDefault<z.ZodNumber>;
    calibrationPose: z.ZodObject<{
        phase: z.ZodString;
        requiredJointsVisible: z.ZodDefault<z.ZodNumber>;
        holdDurationMs: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>;
    formRules: z.ZodArray<z.ZodString>;
    scoringWeights: z.ZodDefault<z.ZodObject<{
        rangeOfMotion: z.ZodDefault<z.ZodNumber>;
        tempo: z.ZodDefault<z.ZodNumber>;
        stability: z.ZodDefault<z.ZodNumber>;
        symmetry: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>;
    version: z.ZodDefault<z.ZodString>;
    engineVersion: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export type ExerciseDefinition = z.infer<typeof exerciseDefinitionSchema>;
/**
 * Default set configuration
 */
export declare const defaultSetConfigSchema: z.ZodObject<{
    targetReps: z.ZodDefault<z.ZodNumber>;
    targetSets: z.ZodDefault<z.ZodNumber>;
    restBetweenSetsMs: z.ZodDefault<z.ZodNumber>;
    restAfterExerciseMs: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type DefaultSetConfig = z.infer<typeof defaultSetConfigSchema>;
/**
 * Set completion status
 */
export declare const SET_STATUS: {
    readonly PENDING: 'pending';
    readonly IN_PROGRESS: 'in_progress';
    readonly COMPLETED: 'completed';
    readonly SKIPPED: 'skipped';
    readonly FAILED: 'failed';
};
export type SetStatus = (typeof SET_STATUS)[keyof typeof SET_STATUS];
/**
 * Rep tracking within a set
 */
export declare const repSummarySchema: z.ZodObject<{
    repNumber: z.ZodNumber;
    rangeOfMotion: z.ZodNumber;
    tempoSeconds: z.ZodNumber;
    qualityScore: z.ZodNumber;
    corrections: z.ZodArray<z.ZodString>;
    durationMs: z.ZodNumber;
    timestamp: z.ZodNumber;
}, z.core.$strip>;
export type RepSummary = z.infer<typeof repSummarySchema>;
/**
 * Set summary
 */
export declare const setSummarySchema: z.ZodObject<{
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
}, z.core.$strip>;
export type SetSummary = z.infer<typeof setSummarySchema>;
export declare const exerciseTypes: {
    readonly EXERCISE_CODES: {
        readonly SQUAT: 'squat';
        readonly PUSH_UP: 'push_up';
        readonly LUNGE: 'lunge';
        readonly SHOULDER_PRESS: 'shoulder_press';
        readonly PLANK: 'plank';
    };
    readonly EXERCISE_PHASES: {
        readonly READY: 'ready';
        readonly DESCENDING: 'descending';
        readonly BOTTOM: 'bottom';
        readonly ASCENDING: 'ascending';
        readonly COMPLETED: 'completed';
        readonly PAUSED: 'paused';
        readonly CALIBRATING: 'calibrating';
    };
    readonly PLANK_PHASES: {
        readonly READY: 'ready';
        readonly DESCENDING: 'descending';
        readonly BOTTOM: 'bottom';
        readonly ASCENDING: 'ascending';
        readonly COMPLETED: 'completed';
        readonly PAUSED: 'paused';
        readonly CALIBRATING: 'calibrating';
        readonly HOLDING: 'holding';
        readonly FATIGUE: 'fatigue';
        readonly FAILED: 'failed';
    };
    readonly PHASE_TRANSITIONS: Record<ExercisePhase, ExercisePhase[]>;
    readonly EXERCISE_DIFFICULTY: {
        readonly BEGINNER: 'beginner';
        readonly INTERMEDIATE: 'intermediate';
        readonly ADVANCED: 'advanced';
    };
    readonly USER_GOALS: {
        readonly FAT_LOSS: 'fat_loss';
        readonly MUSCLE_GAIN: 'muscle_gain';
        readonly GENERAL_FITNESS: 'general_fitness';
        readonly MOBILITY: 'mobility';
    };
    readonly SET_STATUS: {
        readonly PENDING: 'pending';
        readonly IN_PROGRESS: 'in_progress';
        readonly COMPLETED: 'completed';
        readonly SKIPPED: 'skipped';
        readonly FAILED: 'failed';
    };
    readonly jointAngleDefinitionsSchema: z.ZodObject<{
        joint: z.ZodString;
        angleAtStart: z.ZodNumber;
        angleAtBottom: z.ZodNumber;
        angleAtTop: z.ZodNumber;
    }, z.core.$strip>;
    readonly rangeOfMotionSchema: z.ZodObject<{
        minAngle: z.ZodNumber;
        maxAngle: z.ZodNumber;
        requiredChange: z.ZodNumber;
        measurementJoint: z.ZodString;
    }, z.core.$strip>;
    readonly exerciseDefinitionSchema: z.ZodObject<{
        code: z.ZodEnum<{
            lunge: "lunge";
            plank: "plank";
            push_up: "push_up";
            shoulder_press: "shoulder_press";
            squat: "squat";
        }>;
        name: z.ZodObject<{
            en: z.ZodString;
            vi: z.ZodString;
        }, z.core.$strip>;
        description: z.ZodObject<{
            en: z.ZodString;
            vi: z.ZodString;
        }, z.core.$strip>;
        difficulty: z.ZodEnum<{
            advanced: "advanced";
            beginner: "beginner";
            intermediate: "intermediate";
        }>;
        goals: z.ZodArray<z.ZodEnum<{
            fat_loss: "fat_loss";
            general_fitness: "general_fitness";
            mobility: "mobility";
            muscle_gain: "muscle_gain";
        }>>;
        thumbnailUrl: z.ZodOptional<z.ZodString>;
        videoUrl: z.ZodOptional<z.ZodString>;
        requiredJoints: z.ZodArray<z.ZodString>;
        optionalJoints: z.ZodOptional<z.ZodArray<z.ZodString>>;
        cameraOrientation: z.ZodEnum<{
            any: "any";
            front: "front";
            side_left: "side_left";
            side_right: "side_right";
        }>;
        sideDetection: z.ZodDefault<z.ZodEnum<{
            both: "both";
            left: "left";
            none: "none";
            right: "right";
        }>>;
        phases: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            minDurationMs: z.ZodDefault<z.ZodNumber>;
            maxDurationMs: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        rangeOfMotion: z.ZodObject<{
            minAngle: z.ZodNumber;
            maxAngle: z.ZodNumber;
            requiredChange: z.ZodNumber;
            measurementJoint: z.ZodString;
        }, z.core.$strip>;
        repCooldownMs: z.ZodDefault<z.ZodNumber>;
        minTempoMs: z.ZodDefault<z.ZodNumber>;
        maxTempoMs: z.ZodDefault<z.ZodNumber>;
        calibrationPose: z.ZodObject<{
            phase: z.ZodString;
            requiredJointsVisible: z.ZodDefault<z.ZodNumber>;
            holdDurationMs: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>;
        formRules: z.ZodArray<z.ZodString>;
        scoringWeights: z.ZodDefault<z.ZodObject<{
            rangeOfMotion: z.ZodDefault<z.ZodNumber>;
            tempo: z.ZodDefault<z.ZodNumber>;
            stability: z.ZodDefault<z.ZodNumber>;
            symmetry: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>>;
        version: z.ZodDefault<z.ZodString>;
        engineVersion: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>;
    readonly defaultSetConfigSchema: z.ZodObject<{
        targetReps: z.ZodDefault<z.ZodNumber>;
        targetSets: z.ZodDefault<z.ZodNumber>;
        restBetweenSetsMs: z.ZodDefault<z.ZodNumber>;
        restAfterExerciseMs: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>;
    readonly repSummarySchema: z.ZodObject<{
        repNumber: z.ZodNumber;
        rangeOfMotion: z.ZodNumber;
        tempoSeconds: z.ZodNumber;
        qualityScore: z.ZodNumber;
        corrections: z.ZodArray<z.ZodString>;
        durationMs: z.ZodNumber;
        timestamp: z.ZodNumber;
    }, z.core.$strip>;
    readonly setSummarySchema: z.ZodObject<{
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
    }, z.core.$strip>;
    readonly isValidPhaseTransition: typeof isValidPhaseTransition;
};
export default exerciseTypes;
//# sourceMappingURL=exercise.d.ts.map