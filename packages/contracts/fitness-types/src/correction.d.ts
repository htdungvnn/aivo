/**
 * AIVO Fitness Types - Correction and Form Feedback
 * Correction codes, severity levels, and feedback types
 */
import { z } from 'zod';
export declare const CORRECTION_SEVERITY: {
    readonly INFO: 'info';
    readonly HINT: 'hint';
    readonly WARNING: 'warning';
    readonly CRITICAL: 'critical';
};
export type CorrectionSeverity = (typeof CORRECTION_SEVERITY)[keyof typeof CORRECTION_SEVERITY];
/**
 * Severity priority for feedback scheduling (higher = more urgent)
 */
export declare const SEVERITY_PRIORITY: Record<CorrectionSeverity, number>;
/**
 * Form correction codes for each exercise
 * Organized by category for clarity
 */
export declare const CORRECTION_CODES: {
    readonly KNEE_COLLAPSE_INWARD: 'KNEE_COLLAPSE_INWARD';
    readonly KNEE_TRACKING_OVER_TOES: 'KNEE_TRACKING_OVER_TOES';
    readonly KNEE_BEHIND_TOE_LINE: 'KNEE_BEHIND_TOE_LINE';
    readonly SQUAT_NOT_DEEP_ENOUGH: 'SQUAT_NOT_DEEP_ENOUGH';
    readonly SQUAT_TOO_DEEP: 'SQUAT_TOO_DEEP';
    readonly FORWARD_LEAN_TOO_MUCH: 'FORWARD_LEAN_TOO_MUCH';
    readonly ROUNDED_LOWER_BACK: 'ROUNDED_LOWER_BACK';
    readonly EXCESSIVE_ARCH: 'EXCESSIVE_ARCH';
    readonly LATERAL_SPINE_CURVE: 'LATERAL_SPINE_CURVE';
    readonly HIP_HINTS_NOT_LEVEL: 'HIP_HINTS_NOT_LEVEL';
    readonly HIP_ROTATION: 'HIP_ROTATION';
    readonly ELBOWS_FLARE_OUT: 'ELBOWS_FLARE_OUT';
    readonly ELBOWS_NOT_90_DEGREES: 'ELBOWS_NOT_90_DEGREES';
    readonly SHOULDERS_NOT_STACKED: 'SHOULDERS_NOT_STACKED';
    readonly FRONT_KNEE_PAST_TOES: 'FRONT_KNEE_PAST_TOES';
    readonly BACK_KNEE_HITTING_FLOOR_HARD: 'BACK_KNEE_HITTING_FLOOR_HARD';
    readonly LUNGE_UNEVEN_DEPTH: 'LUNGE_UNEVEN_DEPTH';
    readonly TORSO_LEANING_FORWARD: 'TORSO_LEANING_FORWARD';
    readonly ARCH_IN_LOWER_BACK: 'ARCH_IN_LOWER_BACK';
    readonly PRESS_NOT_SYMMETRIC: 'PRESS_NOT_SYMMETRIC';
    readonly INCOMPLETE_LOCKOUT: 'INCOMPLETE_LOCKOUT';
    readonly HIP_SAGGING: 'HIP_SAGGING';
    readonly HIP_PIKING_UP: 'HIP_PIKING_UP';
    readonly SHOULDERS_NOT_ALIGNED: 'SHOULDERS_NOT_ALIGNED';
    readonly HEAD_DROPPING: 'HEAD_DROPPING';
    readonly TEMPO_TOO_FAST: 'TEMPO_TOO_FAST';
    readonly TEMPO_TOO_SLOW: 'TEMPO_TOO_SLOW';
    readonly INCOMPLETE_RANGE: 'INCOMPLETE_RANGE';
    readonly ASYMMETRIC_MOVEMENT: 'ASYMMETRIC_MOVEMENT';
    readonly POSE_LOST: 'POSE_LOST';
    readonly MULTIPLE_PEOPLE: 'MULTIPLE_PEOPLE';
    readonly CALIBRATION_IN_PROGRESS: 'CALIBRATION_IN_PROGRESS';
    readonly CALIBRATION_FAILED: 'CALIBRATION_FAILED';
    readonly POSE_NOT_VISIBLE: 'POSE_NOT_VISIBLE';
    readonly SAFETY_STOP_RECOMMENDED: 'SAFETY_STOP_RECOMMENDED';
};
export type CorrectionCode = (typeof CORRECTION_CODES)[keyof typeof CORRECTION_CODES];
/**
 * Definition of a form correction rule
 */
export declare const correctionRuleSchema: z.ZodObject<{
    code: z.ZodString;
    severity: z.ZodEnum<{
        critical: "critical";
        hint: "hint";
        info: "info";
        warning: "warning";
    }>;
    threshold: z.ZodNumber;
    windowFrames: z.ZodDefault<z.ZodNumber>;
    primaryJoint: z.ZodOptional<z.ZodString>;
    secondaryJoints: z.ZodOptional<z.ZodArray<z.ZodString>>;
    side: z.ZodDefault<z.ZodEnum<{
        both: "both";
        left: "left";
        none: "none";
        right: "right";
    }>>;
    applicablePhases: z.ZodDefault<z.ZodArray<z.ZodString>>;
    messages: z.ZodObject<{
        en: z.ZodString;
        vi: z.ZodString;
    }, z.core.$strip>;
    priority: z.ZodDefault<z.ZodNumber>;
    speakable: z.ZodDefault<z.ZodBoolean>;
    safetyRelated: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type CorrectionRule = z.infer<typeof correctionRuleSchema>;
/**
 * Active correction being returned from the exercise engine
 */
export declare const correctionResultSchema: z.ZodObject<{
    code: z.ZodString;
    severity: z.ZodEnum<{
        critical: "critical";
        hint: "hint";
        info: "info";
        warning: "warning";
    }>;
    confidence: z.ZodNumber;
    side: z.ZodDefault<z.ZodEnum<{
        both: "both";
        left: "left";
        none: "none";
        right: "right";
    }>>;
    measuredValue: z.ZodOptional<z.ZodNumber>;
    threshold: z.ZodOptional<z.ZodNumber>;
    frameCount: z.ZodDefault<z.ZodNumber>;
    isNew: z.ZodDefault<z.ZodBoolean>;
    message: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        vi: z.ZodString;
    }, z.core.$strip>>;
    speakNow: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type CorrectionResult = z.infer<typeof correctionResultSchema>;
/**
 * Feedback types that can be given
 */
export declare const FEEDBACK_TYPES: {
    readonly VOICE: 'voice';
    readonly VISUAL: 'visual';
    readonly HAPTIC: 'haptic';
};
export type FeedbackType = (typeof FEEDBACK_TYPES)[keyof typeof FEEDBACK_TYPES];
/**
 * Feedback message priority
 */
export declare const feedbackMessageSchema: z.ZodObject<{
    id: z.ZodString;
    correctionCode: z.ZodString;
    message: z.ZodObject<{
        en: z.ZodString;
        vi: z.ZodString;
    }, z.core.$strip>;
    severity: z.ZodEnum<{
        critical: "critical";
        hint: "hint";
        info: "info";
        warning: "warning";
    }>;
    priority: z.ZodNumber;
    feedbackTypes: z.ZodDefault<z.ZodArray<z.ZodEnum<{
        haptic: "haptic";
        visual: "visual";
        voice: "voice";
    }>>>;
    timestamp: z.ZodNumber;
    cooldownMs: z.ZodDefault<z.ZodNumber>;
    canRepeat: z.ZodDefault<z.ZodBoolean>;
    safetyRelated: z.ZodDefault<z.ZodBoolean>;
    interruptLowerPriority: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type FeedbackMessage = z.infer<typeof feedbackMessageSchema>;
/**
 * Default correction messages for each correction code
 * These are used when no custom message is provided
 */
export declare const DEFAULT_CORRECTION_MESSAGES: Record<CorrectionCode, {
    en: string;
    vi: string;
}>;
export declare const correctionTypes: {
    readonly CORRECTION_SEVERITY: {
        readonly INFO: 'info';
        readonly HINT: 'hint';
        readonly WARNING: 'warning';
        readonly CRITICAL: 'critical';
    };
    readonly CORRECTION_CODES: {
        readonly KNEE_COLLAPSE_INWARD: 'KNEE_COLLAPSE_INWARD';
        readonly KNEE_TRACKING_OVER_TOES: 'KNEE_TRACKING_OVER_TOES';
        readonly KNEE_BEHIND_TOE_LINE: 'KNEE_BEHIND_TOE_LINE';
        readonly SQUAT_NOT_DEEP_ENOUGH: 'SQUAT_NOT_DEEP_ENOUGH';
        readonly SQUAT_TOO_DEEP: 'SQUAT_TOO_DEEP';
        readonly FORWARD_LEAN_TOO_MUCH: 'FORWARD_LEAN_TOO_MUCH';
        readonly ROUNDED_LOWER_BACK: 'ROUNDED_LOWER_BACK';
        readonly EXCESSIVE_ARCH: 'EXCESSIVE_ARCH';
        readonly LATERAL_SPINE_CURVE: 'LATERAL_SPINE_CURVE';
        readonly HIP_HINTS_NOT_LEVEL: 'HIP_HINTS_NOT_LEVEL';
        readonly HIP_ROTATION: 'HIP_ROTATION';
        readonly ELBOWS_FLARE_OUT: 'ELBOWS_FLARE_OUT';
        readonly ELBOWS_NOT_90_DEGREES: 'ELBOWS_NOT_90_DEGREES';
        readonly SHOULDERS_NOT_STACKED: 'SHOULDERS_NOT_STACKED';
        readonly FRONT_KNEE_PAST_TOES: 'FRONT_KNEE_PAST_TOES';
        readonly BACK_KNEE_HITTING_FLOOR_HARD: 'BACK_KNEE_HITTING_FLOOR_HARD';
        readonly LUNGE_UNEVEN_DEPTH: 'LUNGE_UNEVEN_DEPTH';
        readonly TORSO_LEANING_FORWARD: 'TORSO_LEANING_FORWARD';
        readonly ARCH_IN_LOWER_BACK: 'ARCH_IN_LOWER_BACK';
        readonly PRESS_NOT_SYMMETRIC: 'PRESS_NOT_SYMMETRIC';
        readonly INCOMPLETE_LOCKOUT: 'INCOMPLETE_LOCKOUT';
        readonly HIP_SAGGING: 'HIP_SAGGING';
        readonly HIP_PIKING_UP: 'HIP_PIKING_UP';
        readonly SHOULDERS_NOT_ALIGNED: 'SHOULDERS_NOT_ALIGNED';
        readonly HEAD_DROPPING: 'HEAD_DROPPING';
        readonly TEMPO_TOO_FAST: 'TEMPO_TOO_FAST';
        readonly TEMPO_TOO_SLOW: 'TEMPO_TOO_SLOW';
        readonly INCOMPLETE_RANGE: 'INCOMPLETE_RANGE';
        readonly ASYMMETRIC_MOVEMENT: 'ASYMMETRIC_MOVEMENT';
        readonly POSE_LOST: 'POSE_LOST';
        readonly MULTIPLE_PEOPLE: 'MULTIPLE_PEOPLE';
        readonly CALIBRATION_IN_PROGRESS: 'CALIBRATION_IN_PROGRESS';
        readonly CALIBRATION_FAILED: 'CALIBRATION_FAILED';
        readonly POSE_NOT_VISIBLE: 'POSE_NOT_VISIBLE';
        readonly SAFETY_STOP_RECOMMENDED: 'SAFETY_STOP_RECOMMENDED';
    };
    readonly FEEDBACK_TYPES: {
        readonly VOICE: 'voice';
        readonly VISUAL: 'visual';
        readonly HAPTIC: 'haptic';
    };
    readonly SEVERITY_PRIORITY: Record<CorrectionSeverity, number>;
    readonly DEFAULT_CORRECTION_MESSAGES: Record<CorrectionCode, {
        en: string;
        vi: string;
    }>;
    readonly correctionRuleSchema: z.ZodObject<{
        code: z.ZodString;
        severity: z.ZodEnum<{
            critical: "critical";
            hint: "hint";
            info: "info";
            warning: "warning";
        }>;
        threshold: z.ZodNumber;
        windowFrames: z.ZodDefault<z.ZodNumber>;
        primaryJoint: z.ZodOptional<z.ZodString>;
        secondaryJoints: z.ZodOptional<z.ZodArray<z.ZodString>>;
        side: z.ZodDefault<z.ZodEnum<{
            both: "both";
            left: "left";
            none: "none";
            right: "right";
        }>>;
        applicablePhases: z.ZodDefault<z.ZodArray<z.ZodString>>;
        messages: z.ZodObject<{
            en: z.ZodString;
            vi: z.ZodString;
        }, z.core.$strip>;
        priority: z.ZodDefault<z.ZodNumber>;
        speakable: z.ZodDefault<z.ZodBoolean>;
        safetyRelated: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>;
    readonly correctionResultSchema: z.ZodObject<{
        code: z.ZodString;
        severity: z.ZodEnum<{
            critical: "critical";
            hint: "hint";
            info: "info";
            warning: "warning";
        }>;
        confidence: z.ZodNumber;
        side: z.ZodDefault<z.ZodEnum<{
            both: "both";
            left: "left";
            none: "none";
            right: "right";
        }>>;
        measuredValue: z.ZodOptional<z.ZodNumber>;
        threshold: z.ZodOptional<z.ZodNumber>;
        frameCount: z.ZodDefault<z.ZodNumber>;
        isNew: z.ZodDefault<z.ZodBoolean>;
        message: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            vi: z.ZodString;
        }, z.core.$strip>>;
        speakNow: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>;
    readonly feedbackMessageSchema: z.ZodObject<{
        id: z.ZodString;
        correctionCode: z.ZodString;
        message: z.ZodObject<{
            en: z.ZodString;
            vi: z.ZodString;
        }, z.core.$strip>;
        severity: z.ZodEnum<{
            critical: "critical";
            hint: "hint";
            info: "info";
            warning: "warning";
        }>;
        priority: z.ZodNumber;
        feedbackTypes: z.ZodDefault<z.ZodArray<z.ZodEnum<{
            haptic: "haptic";
            visual: "visual";
            voice: "voice";
        }>>>;
        timestamp: z.ZodNumber;
        cooldownMs: z.ZodDefault<z.ZodNumber>;
        canRepeat: z.ZodDefault<z.ZodBoolean>;
        safetyRelated: z.ZodDefault<z.ZodBoolean>;
        interruptLowerPriority: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>;
};
export default correctionTypes;
//# sourceMappingURL=correction.d.ts.map