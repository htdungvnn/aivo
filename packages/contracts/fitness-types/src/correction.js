/**
 * AIVO Fitness Types - Correction and Form Feedback
 * Correction codes, severity levels, and feedback types
 */
import { z } from 'zod';
// =============================================================================
// Correction Severity Levels
// =============================================================================
export const CORRECTION_SEVERITY = {
    INFO: 'info', // Informational, no immediate action needed
    HINT: 'hint', // Gentle reminder, optional improvement
    WARNING: 'warning', // Form issue that should be corrected
    CRITICAL: 'critical', // Safety concern, pause recommended
};
/**
 * Severity priority for feedback scheduling (higher = more urgent)
 */
export const SEVERITY_PRIORITY = {
    [CORRECTION_SEVERITY.CRITICAL]: 100,
    [CORRECTION_SEVERITY.WARNING]: 75,
    [CORRECTION_SEVERITY.HINT]: 50,
    [CORRECTION_SEVERITY.INFO]: 25,
};
// =============================================================================
// Correction Codes
// =============================================================================
/**
 * Form correction codes for each exercise
 * Organized by category for clarity
 */
// Knee alignment corrections
export const CORRECTION_CODES = {
    // Squat corrections
    KNEE_COLLAPSE_INWARD: 'KNEE_COLLAPSE_INWARD',
    KNEE_TRACKING_OVER_TOES: 'KNEE_TRACKING_OVER_TOES',
    KNEE_BEHIND_TOE_LINE: 'KNEE_BEHIND_TOE_LINE',
    // Depth corrections
    SQUAT_NOT_DEEP_ENOUGH: 'SQUAT_NOT_DEEP_ENOUGH',
    SQUAT_TOO_DEEP: 'SQUAT_TOO_DEEP',
    // Back corrections
    FORWARD_LEAN_TOO_MUCH: 'FORWARD_LEAN_TOO_MUCH',
    ROUNDED_LOWER_BACK: 'ROUNDED_LOWER_BACK',
    EXCESSIVE_ARCH: 'EXCESSIVE_ARCH',
    LATERAL_SPINE_CURVE: 'LATERAL_SPINE_CURVE',
    // Hip corrections
    HIP_HINTS_NOT_LEVEL: 'HIP_HINTS_NOT_LEVEL',
    HIP_ROTATION: 'HIP_ROTATION',
    // Push-up corrections
    ELBOWS_FLARE_OUT: 'ELBOWS_FLARE_OUT',
    ELBOWS_NOT_90_DEGREES: 'ELBOWS_NOT_90_DEGREES',
    SHOULDERS_NOT_STACKED: 'SHOULDERS_NOT_STACKED',
    // Lunge corrections
    FRONT_KNEE_PAST_TOES: 'FRONT_KNEE_PAST_TOES',
    BACK_KNEE_HITTING_FLOOR_HARD: 'BACK_KNEE_HITTING_FLOOR_HARD',
    LUNGE_UNEVEN_DEPTH: 'LUNGE_UNEVEN_DEPTH',
    TORSO_LEANING_FORWARD: 'TORSO_LEANING_FORWARD',
    // Shoulder press corrections
    ARCH_IN_LOWER_BACK: 'ARCH_IN_LOWER_BACK',
    PRESS_NOT_SYMMETRIC: 'PRESS_NOT_SYMMETRIC',
    INCOMPLETE_LOCKOUT: 'INCOMPLETE_LOCKOUT',
    // Plank corrections
    HIP_SAGGING: 'HIP_SAGGING',
    HIP_PIKING_UP: 'HIP_PIKING_UP',
    SHOULDERS_NOT_ALIGNED: 'SHOULDERS_NOT_ALIGNED',
    HEAD_DROPPING: 'HEAD_DROPPING',
    // General corrections
    TEMPO_TOO_FAST: 'TEMPO_TOO_FAST',
    TEMPO_TOO_SLOW: 'TEMPO_TOO_SLOW',
    INCOMPLETE_RANGE: 'INCOMPLETE_RANGE',
    ASYMMETRIC_MOVEMENT: 'ASYMMETRIC_MOVEMENT',
    POSE_LOST: 'POSE_LOST',
    MULTIPLE_PEOPLE: 'MULTIPLE_PEOPLE',
    // Calibration
    CALIBRATION_IN_PROGRESS: 'CALIBRATION_IN_PROGRESS',
    CALIBRATION_FAILED: 'CALIBRATION_FAILED',
    POSE_NOT_VISIBLE: 'POSE_NOT_VISIBLE',
    // Safety
    SAFETY_STOP_RECOMMENDED: 'SAFETY_STOP_RECOMMENDED',
};
// =============================================================================
// Correction Rule Definition
// =============================================================================
/**
 * Definition of a form correction rule
 */
export const correctionRuleSchema = z.object({
    code: z.string(),
    severity: z.enum([CORRECTION_SEVERITY.INFO, CORRECTION_SEVERITY.HINT, CORRECTION_SEVERITY.WARNING, CORRECTION_SEVERITY.CRITICAL]),
    // Thresholds for triggering
    threshold: z.number().min(0).max(1), // Angular or positional threshold
    windowFrames: z.number().int().positive().default(3), // Frames before triggering
    // Which joints are involved
    primaryJoint: z.string().optional(),
    secondaryJoints: z.array(z.string()).optional(),
    // Side specificity
    side: z.enum(['left', 'right', 'both', 'none']).default('none'),
    // Which phases this applies to
    applicablePhases: z.array(z.string()).default([]),
    // Messages (localized)
    messages: z.object({
        en: z.string(),
        vi: z.string(),
    }),
    // Priority for feedback
    priority: z.number().int().min(0).max(100).default(50),
    // Whether to speak this correction
    speakable: z.boolean().default(true),
    // Whether this is a safety concern
    safetyRelated: z.boolean().default(false),
});
// =============================================================================
// Correction Result
// =============================================================================
/**
 * Active correction being returned from the exercise engine
 */
export const correctionResultSchema = z.object({
    code: z.string(),
    severity: z.enum([CORRECTION_SEVERITY.INFO, CORRECTION_SEVERITY.HINT, CORRECTION_SEVERITY.WARNING, CORRECTION_SEVERITY.CRITICAL]),
    confidence: z.number().min(0).max(1),
    side: z.enum(['left', 'right', 'both', 'none']).default('none'),
    // Measurement details
    measuredValue: z.number().optional(),
    threshold: z.number().optional(),
    // Frame tracking
    frameCount: z.number().int().positive().default(1),
    isNew: z.boolean().default(true),
    // Message (can be pre-generated or template)
    message: z.object({
        en: z.string(),
        vi: z.string(),
    }).optional(),
    // Whether this should be spoken immediately
    speakNow: z.boolean().default(false),
});
// =============================================================================
// Feedback Priority
// =============================================================================
/**
 * Feedback types that can be given
 */
export const FEEDBACK_TYPES = {
    VOICE: 'voice',
    VISUAL: 'visual',
    HAPTIC: 'haptic',
};
/**
 * Feedback message priority
 */
export const feedbackMessageSchema = z.object({
    id: z.string().uuid(),
    correctionCode: z.string(),
    message: z.object({
        en: z.string(),
        vi: z.string(),
    }),
    severity: z.enum([CORRECTION_SEVERITY.INFO, CORRECTION_SEVERITY.HINT, CORRECTION_SEVERITY.WARNING, CORRECTION_SEVERITY.CRITICAL]),
    priority: z.number().int().min(0).max(100),
    feedbackTypes: z.array(z.enum([FEEDBACK_TYPES.VOICE, FEEDBACK_TYPES.VISUAL, FEEDBACK_TYPES.HAPTIC])).default([FEEDBACK_TYPES.VOICE]),
    // Scheduling
    timestamp: z.number().int().positive(),
    cooldownMs: z.number().int().nonnegative().default(3000),
    canRepeat: z.boolean().default(false),
    // Safety
    safetyRelated: z.boolean().default(false),
    interruptLowerPriority: z.boolean().default(false),
});
// =============================================================================
// Default Correction Messages
// =============================================================================
/**
 * Default correction messages for each correction code
 * These are used when no custom message is provided
 */
export const DEFAULT_CORRECTION_MESSAGES = {
    [CORRECTION_CODES.KNEE_COLLAPSE_INWARD]: {
        en: "Keep your knees aligned with your toes.",
        vi: "Giữ đầu gối thẳng hàng với ngón chân.",
    },
    [CORRECTION_CODES.KNEE_TRACKING_OVER_TOES]: {
        en: "Keep your knees behind your toes.",
        vi: "Giữ đầu gối phía sau ngón chân.",
    },
    [CORRECTION_CODES.KNEE_BEHIND_TOE_LINE]: {
        en: "Allow your knees to track over your toes.",
        vi: "Để đầu gối hướng ra phía trước ngón chân.",
    },
    [CORRECTION_CODES.SQUAT_NOT_DEEP_ENOUGH]: {
        en: "Lower your hips slightly more.",
        vi: "Hạ thấp hông xuống một chút.",
    },
    [CORRECTION_CODES.SQUAT_TOO_DEEP]: {
        en: "That's deep enough, come up a bit.",
        vi: "Đủ sâu rồi, hãy đứng lên một chút.",
    },
    [CORRECTION_CODES.FORWARD_LEAN_TOO_MUCH]: {
        en: "Keep your chest up and back straight.",
        vi: "Giữ ngực hướng lên và lưng thẳng.",
    },
    [CORRECTION_CODES.ROUNDED_LOWER_BACK]: {
        en: "Keep your back neutral, don't round your lower back.",
        vi: "Giữ lưng thẳng tự nhiên, không cong lưng dưới.",
    },
    [CORRECTION_CODES.EXCESSIVE_ARCH]: {
        en: "Lower your back slightly, don't arch too much.",
        vi: "Hạ lưng xuống một chút, không cong quá nhiều.",
    },
    [CORRECTION_CODES.LATERAL_SPINE_CURVE]: {
        en: "Keep your spine straight, avoid leaning to the side.",
        vi: "Giữ cột sống thẳng, tránh nghiêng sang một bên.",
    },
    [CORRECTION_CODES.HIP_HINTS_NOT_LEVEL]: {
        en: "Keep your hips level.",
        vi: "Giữ hông ngang bằng.",
    },
    [CORRECTION_CODES.HIP_ROTATION]: {
        en: "Keep your hips facing forward.",
        vi: "Giữ hông hướng về phía trước.",
    },
    [CORRECTION_CODES.ELBOWS_FLARE_OUT]: {
        en: "Tuck your elbows in slightly.",
        vi: "Khuỷu tay hơi gập vào trong.",
    },
    [CORRECTION_CODES.ELBOWS_NOT_90_DEGREES]: {
        en: "Lower until your elbows are at about 90 degrees.",
        vi: "Hạ xuống đến khi khuỷu tay khoảng 90 độ.",
    },
    [CORRECTION_CODES.SHOULDERS_NOT_STACKED]: {
        en: "Keep your shoulders directly above your wrists.",
        vi: "Giữ vai thẳng trên cổ tay.",
    },
    [CORRECTION_CODES.FRONT_KNEE_PAST_TOES]: {
        en: "Don't let your front knee go past your toes.",
        vi: "Đầu gối trước không vượt quá ngón chân.",
    },
    [CORRECTION_CODES.BACK_KNEE_HITTING_FLOOR_HARD]: {
        en: "Lower gently, don't slam your back knee.",
        vi: "Hạ xuống nhẹ nhàng, không đập gối sau xuống sàn.",
    },
    [CORRECTION_CODES.LUNGE_UNEVEN_DEPTH]: {
        en: "Try to reach the same depth on both sides.",
        vi: "Cố gắng đạt độ sâu như nhau hai bên.",
    },
    [CORRECTION_CODES.TORSO_LEANING_FORWARD]: {
        en: "Keep your torso more upright.",
        vi: "Giữ thân mình thẳng đứng hơn.",
    },
    [CORRECTION_CODES.ARCH_IN_LOWER_BACK]: {
        en: "Keep your lower back pressed into the floor.",
        vi: "Giữ lưng dưới áp xuống sàn.",
    },
    [CORRECTION_CODES.PRESS_NOT_SYMMETRIC]: {
        en: "Try to press both arms evenly.",
        vi: "Cố gắng đẩy hai tay đều nhau.",
    },
    [CORRECTION_CODES.INCOMPLETE_LOCKOUT]: {
        en: "Fully lock out your arms at the top.",
        vi: "Duỗi thẳng tay hoàn toàn ở trên.",
    },
    [CORRECTION_CODES.HIP_SAGGING]: {
        en: "Lift your hips, keep your body in a straight line.",
        vi: "Nâng hông lên, giữ cơ thể thẳng hàng.",
    },
    [CORRECTION_CODES.HIP_PIKING_UP]: {
        en: "Lower your hips, don't pike up.",
        vi: "Hạ hông xuống, không nhấc cao lên.",
    },
    [CORRECTION_CODES.SHOULDERS_NOT_ALIGNED]: {
        en: "Keep your shoulders level.",
        vi: "Giữ vai ngang bằng.",
    },
    [CORRECTION_CODES.HEAD_DROPPING]: {
        en: "Keep your head in line with your spine.",
        vi: "Giữ đầu thẳng hàng với cột sống.",
    },
    [CORRECTION_CODES.TEMPO_TOO_FAST]: {
        en: "Slow down the movement.",
        vi: "Chậm lại một nhịp.",
    },
    [CORRECTION_CODES.TEMPO_TOO_SLOW]: {
        en: "Pick up the pace slightly.",
        vi: "Tăng tốc độ một chút.",
    },
    [CORRECTION_CODES.INCOMPLETE_RANGE]: {
        en: "Go through the full range of motion.",
        vi: "Thực hiện đủ biên độ chuyển động.",
    },
    [CORRECTION_CODES.ASYMMETRIC_MOVEMENT]: {
        en: "Try to move both sides symmetrically.",
        vi: "Cố gắng di chuyển đều hai bên.",
    },
    [CORRECTION_CODES.POSE_LOST]: {
        en: "Make sure your full body is visible.",
        vi: "Đảm bảo toàn bộ cơ thể được nhìn thấy.",
    },
    [CORRECTION_CODES.MULTIPLE_PEOPLE]: {
        en: "Only one person should be in frame.",
        vi: "Chỉ một người nên ở trong khung hình.",
    },
    [CORRECTION_CODES.CALIBRATION_IN_PROGRESS]: {
        en: "Hold the starting position.",
        vi: "Giữ nguyên vị trí bắt đầu.",
    },
    [CORRECTION_CODES.CALIBRATION_FAILED]: {
        en: "Please adjust your position and try again.",
        vi: "Hãy điều chỉnh vị trí và thử lại.",
    },
    [CORRECTION_CODES.POSE_NOT_VISIBLE]: {
        en: "Step back so your full body is visible.",
        vi: "Lùi lại để toàn bộ cơ thể được nhìn thấy.",
    },
    [CORRECTION_CODES.SAFETY_STOP_RECOMMENDED]: {
        en: "Please stop and rest. Form breakdown detected.",
        vi: "Hãy dừng lại và nghỉ. Phát hiện tư thế không đúng.",
    },
};
// =============================================================================
// Export all schemas and types
// =============================================================================
export const correctionTypes = {
    CORRECTION_SEVERITY,
    CORRECTION_CODES,
    FEEDBACK_TYPES,
    SEVERITY_PRIORITY,
    DEFAULT_CORRECTION_MESSAGES,
    // Schemas
    correctionRuleSchema,
    correctionResultSchema,
    feedbackMessageSchema,
};
export default correctionTypes;
