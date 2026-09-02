/**
 * AIVO Fitness Types
 * Shared type definitions for the AIVO fitness coaching system
 */
export * from './pose.js';
export * from './exercise.js';
export * from './correction.js';
export * from './workout-session.js';
export * from './plan.js';
export * from './wasm.js';
/**
 * Supported locales for localization
 */
export declare const SUPPORTED_LOCALES: readonly ['en', 'vi'];
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
/**
 * Default language
 */
export declare const DEFAULT_LOCALE: SupportedLocale;
/**
 * Engine version
 */
export declare const ENGINE_VERSION = "1.0.0";
/**
 * WASM engine version
 */
export declare const WASM_ENGINE_VERSION = "1.0.0";
/**
 * Minimum confidence threshold for corrections
 */
export declare const MIN_CORRECTION_CONFIDENCE = 0.6;
/**
 * Default feedback cooldown in milliseconds
 */
export declare const DEFAULT_FEEDBACK_COOLDOWN_MS = 4000;
/**
 * Maximum corrections per rep
 */
export declare const MAX_CORRECTIONS_PER_REP = 5;
/**
 * Privacy notice for workout sessions
 */
export declare const PRIVACY_NOTICE: {
    readonly en: "AIVO provides automated fitness guidance based on camera-estimated movement. Results may be inaccurate and do not replace guidance from a qualified professional.";
    readonly vi: "AIVO cung cấp hướng dẫn thể dục tự động dựa trên ước tính chuyển động từ camera. Kết quả có thể không chính xác và không thay thế hướng dẫn từ chuyên gia.";
};
/**
 * Calibration status messages
 */
export declare const CALIBRATION_MESSAGES: {
    readonly IN_PROGRESS: {
        readonly en: "Hold the starting position...";
        readonly vi: "Giữ nguyên vị trí bắt đầu...";
    };
    readonly SUCCESS: {
        readonly en: "Ready! Begin when you're comfortable.";
        readonly vi: "Sẵn sàng! Bắt đầu khi bạn cảm thấy thoải mái.";
    };
    readonly FAILED_VISIBILITY: {
        readonly en: "Make sure your full body is visible in the frame.";
        readonly vi: "Đảm bảo toàn bộ cơ thể được nhìn thấy trong khung hình.";
    };
    readonly FAILED_DISTANCE: {
        readonly en: "Step back so your entire body fits in the frame.";
        readonly vi: "Lùi lại để toàn bộ cơ thể nằm trong khung hình.";
    };
    readonly FAILED_ANGLE: {
        readonly en: "Position yourself directly facing the camera.";
        readonly vi: "Đặt mình đối diện trực tiếp với camera.";
    };
    readonly FAILED_CONFIDENCE: {
        readonly en: "Please improve lighting and try again.";
        readonly vi: "Hãy cải thiện ánh sáng và thử lại.";
    };
};
/**
 * Countdown messages before starting a set
 */
export declare const COUNTDOWN_MESSAGES: {
    readonly en: readonly ["3", "2", "1", "Go!"];
    readonly vi: readonly ["3", "2", "1", "Bắt đầu!"];
};
/**
 * Messages for set completion
 */
export declare const SET_COMPLETION_MESSAGES: {
    readonly en: {
        readonly good: "Great set!";
        readonly excellent: "Excellent work!";
        readonly perfect: "Perfect form!";
    };
    readonly vi: {
        readonly good: "Tập tốt lắm!";
        readonly excellent: "Xuất sắc!";
        readonly perfect: "Tư thế hoàn hảo!";
    };
};
/**
 * Rest timer messages
 */
export declare const REST_TIMER_MESSAGES: {
    readonly en: {
        readonly start: "Rest time";
        readonly end: "Rest complete";
        readonly halfWay: "Halfway there";
    };
    readonly vi: {
        readonly start: "Thời gian nghỉ";
        readonly end: "Nghỉ xong";
        readonly halfWay: "Còn một nửa";
    };
};
export declare const EXERCISE_NAMES: {
    readonly squat: {
        readonly en: "Squat";
        readonly vi: "Ngồi xổm";
    };
    readonly push_up: {
        readonly en: "Push-up";
        readonly vi: "Chống đẩy";
    };
    readonly lunge: {
        readonly en: "Lunge";
        readonly vi: "Lunge";
    };
    readonly shoulder_press: {
        readonly en: "Shoulder Press";
        readonly vi: "Đẩy vai";
    };
    readonly plank: {
        readonly en: "Plank";
        readonly vi: "Plank";
    };
};
/**
 * Check if a value is a valid exercise code
 */
export declare function isExerciseCode(value: unknown): value is string;
/**
 * Check if a value is a valid phase
 */
export declare function isExercisePhase(value: unknown): value is string;
/**
 * Check if a value is a valid severity
 */
export declare function isCorrectionSeverity(value: unknown): value is string;
/**
 * Check if a value is a valid locale
 */
export declare function isLocale(value: unknown): value is SupportedLocale;
/**
 * Parse and validate exercise code
 */
export declare function parseExerciseCode(value: unknown): string | null;
/**
 * Parse and validate locale
 */
export declare function parseLocale(value: unknown, fallback?: SupportedLocale): SupportedLocale;
/**
 * Get localized string from an object
 */
export declare function getLocalizedString(obj: Record<string, string> | undefined, locale?: SupportedLocale): string;
/**
 * Format duration in milliseconds to human readable
 */
export declare function formatDuration(ms: number): string;
/**
 * Format number with locale
 */
export declare function formatNumber(value: number, locale?: SupportedLocale): string;
/**
 * Format percentage
 */
export declare function formatPercentage(value: number, locale?: SupportedLocale): string;
/**
 * Format quality score
 */
export declare function formatQualityScore(value: number, locale?: SupportedLocale): string;
declare const fitnessTypes: {
    ENGINE_VERSION: string;
    WASM_ENGINE_VERSION: string;
    SUPPORTED_LOCALES: readonly ["en", "vi"];
    DEFAULT_LOCALE: "en";
    MIN_CORRECTION_CONFIDENCE: number;
    DEFAULT_FEEDBACK_COOLDOWN_MS: number;
    MAX_CORRECTIONS_PER_REP: number;
    PRIVACY_NOTICE: {
        readonly en: "AIVO provides automated fitness guidance based on camera-estimated movement. Results may be inaccurate and do not replace guidance from a qualified professional.";
        readonly vi: "AIVO cung cấp hướng dẫn thể dục tự động dựa trên ước tính chuyển động từ camera. Kết quả có thể không chính xác và không thay thế hướng dẫn từ chuyên gia.";
    };
    CALIBRATION_MESSAGES: {
        readonly IN_PROGRESS: {
            readonly en: "Hold the starting position...";
            readonly vi: "Giữ nguyên vị trí bắt đầu...";
        };
        readonly SUCCESS: {
            readonly en: "Ready! Begin when you're comfortable.";
            readonly vi: "Sẵn sàng! Bắt đầu khi bạn cảm thấy thoải mái.";
        };
        readonly FAILED_VISIBILITY: {
            readonly en: "Make sure your full body is visible in the frame.";
            readonly vi: "Đảm bảo toàn bộ cơ thể được nhìn thấy trong khung hình.";
        };
        readonly FAILED_DISTANCE: {
            readonly en: "Step back so your entire body fits in the frame.";
            readonly vi: "Lùi lại để toàn bộ cơ thể nằm trong khung hình.";
        };
        readonly FAILED_ANGLE: {
            readonly en: "Position yourself directly facing the camera.";
            readonly vi: "Đặt mình đối diện trực tiếp với camera.";
        };
        readonly FAILED_CONFIDENCE: {
            readonly en: "Please improve lighting and try again.";
            readonly vi: "Hãy cải thiện ánh sáng và thử lại.";
        };
    };
    COUNTDOWN_MESSAGES: {
        readonly en: readonly ["3", "2", "1", "Go!"];
        readonly vi: readonly ["3", "2", "1", "Bắt đầu!"];
    };
    SET_COMPLETION_MESSAGES: {
        readonly en: {
            readonly good: "Great set!";
            readonly excellent: "Excellent work!";
            readonly perfect: "Perfect form!";
        };
        readonly vi: {
            readonly good: "Tập tốt lắm!";
            readonly excellent: "Xuất sắc!";
            readonly perfect: "Tư thế hoàn hảo!";
        };
    };
    REST_TIMER_MESSAGES: {
        readonly en: {
            readonly start: "Rest time";
            readonly end: "Rest complete";
            readonly halfWay: "Halfway there";
        };
        readonly vi: {
            readonly start: "Thời gian nghỉ";
            readonly end: "Nghỉ xong";
            readonly halfWay: "Còn một nửa";
        };
    };
    EXERCISE_NAMES: {
        readonly squat: {
            readonly en: "Squat";
            readonly vi: "Ngồi xổm";
        };
        readonly push_up: {
            readonly en: "Push-up";
            readonly vi: "Chống đẩy";
        };
        readonly lunge: {
            readonly en: "Lunge";
            readonly vi: "Lunge";
        };
        readonly shoulder_press: {
            readonly en: "Shoulder Press";
            readonly vi: "Đẩy vai";
        };
        readonly plank: {
            readonly en: "Plank";
            readonly vi: "Plank";
        };
    };
    isExerciseCode: typeof isExerciseCode;
    isExercisePhase: typeof isExercisePhase;
    isCorrectionSeverity: typeof isCorrectionSeverity;
    isLocale: typeof isLocale;
    parseExerciseCode: typeof parseExerciseCode;
    parseLocale: typeof parseLocale;
    getLocalizedString: typeof getLocalizedString;
    formatDuration: typeof formatDuration;
    formatNumber: typeof formatNumber;
    formatPercentage: typeof formatPercentage;
    formatQualityScore: typeof formatQualityScore;
};
export default fitnessTypes;
//# sourceMappingURL=index.d.ts.map