/**
 * AIVO Fitness Types
 * Shared type definitions for the AIVO fitness coaching system
 */

// Re-export all types
export * from './pose.js';
export * from './exercise.js';
export * from './correction.js';
export * from './workout-session.js';
export * from './plan.js';
export * from './wasm.js';

// =============================================================================
// Constants
// =============================================================================

/**
 * Supported locales for localization
 */
export const SUPPORTED_LOCALES = ['en', 'vi'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Default language
 */
export const DEFAULT_LOCALE: SupportedLocale = 'en';

/**
 * Engine version
 */
export const ENGINE_VERSION = '1.0.0';

/**
 * WASM engine version
 */
export const WASM_ENGINE_VERSION = '1.0.0';

/**
 * Minimum confidence threshold for corrections
 */
export const MIN_CORRECTION_CONFIDENCE = 0.6;

/**
 * Default feedback cooldown in milliseconds
 */
export const DEFAULT_FEEDBACK_COOLDOWN_MS = 4000;

/**
 * Maximum corrections per rep
 */
export const MAX_CORRECTIONS_PER_REP = 5;

// =============================================================================
// Privacy Notice
// =============================================================================

/**
 * Privacy notice for workout sessions
 */
export const PRIVACY_NOTICE = {
  en: "AIVO provides automated fitness guidance based on camera-estimated movement. Results may be inaccurate and do not replace guidance from a qualified professional.",
  vi: "AIVO cung cấp hướng dẫn thể dục tự động dựa trên ước tính chuyển động từ camera. Kết quả có thể không chính xác và không thay thế hướng dẫn từ chuyên gia.",
} as const;

// =============================================================================
// Calibration Messages
// =============================================================================

/**
 * Calibration status messages
 */
export const CALIBRATION_MESSAGES = {
  IN_PROGRESS: {
    en: "Hold the starting position...",
    vi: "Giữ nguyên vị trí bắt đầu...",
  },
  SUCCESS: {
    en: "Ready! Begin when you're comfortable.",
    vi: "Sẵn sàng! Bắt đầu khi bạn cảm thấy thoải mái.",
  },
  FAILED_VISIBILITY: {
    en: "Make sure your full body is visible in the frame.",
    vi: "Đảm bảo toàn bộ cơ thể được nhìn thấy trong khung hình.",
  },
  FAILED_DISTANCE: {
    en: "Step back so your entire body fits in the frame.",
    vi: "Lùi lại để toàn bộ cơ thể nằm trong khung hình.",
  },
  FAILED_ANGLE: {
    en: "Position yourself directly facing the camera.",
    vi: "Đặt mình đối diện trực tiếp với camera.",
  },
  FAILED_CONFIDENCE: {
    en: "Please improve lighting and try again.",
    vi: "Hãy cải thiện ánh sáng và thử lại.",
  },
} as const;

// =============================================================================
// Countdown Messages
// =============================================================================

/**
 * Countdown messages before starting a set
 */
export const COUNTDOWN_MESSAGES = {
  en: ["3", "2", "1", "Go!"],
  vi: ["3", "2", "1", "Bắt đầu!"],
} as const;

// =============================================================================
// Set Completion Messages
// =============================================================================

/**
 * Messages for set completion
 */
export const SET_COMPLETION_MESSAGES = {
  en: {
    good: "Great set!",
    excellent: "Excellent work!",
    perfect: "Perfect form!",
  },
  vi: {
    good: "Tập tốt lắm!",
    excellent: "Xuất sắc!",
    perfect: "Tư thế hoàn hảo!",
  },
} as const;

// =============================================================================
// Rest Timer Messages
// =============================================================================

/**
 * Rest timer messages
 */
export const REST_TIMER_MESSAGES = {
  en: {
    start: "Rest time",
    end: "Rest complete",
    halfWay: "Halfway there",
  },
  vi: {
    start: "Thời gian nghỉ",
    end: "Nghỉ xong",
    halfWay: "Còn một nửa",
  },
} as const;

// =============================================================================
// Exercise Names (for display)
// =============================================================================

export const EXERCISE_NAMES = {
  squat: { en: "Squat", vi: "Ngồi xổm" },
  push_up: { en: "Push-up", vi: "Chống đẩy" },
  lunge: { en: "Lunge", vi: "Lunge" },
  shoulder_press: { en: "Shoulder Press", vi: "Đẩy vai" },
  plank: { en: "Plank", vi: "Plank" },
} as const;

// =============================================================================
// Type Guards and Validators
// =============================================================================

/**
 * Check if a value is a valid exercise code
 */
export function isExerciseCode(value: unknown): value is string {
  const codes = ['squat', 'push_up', 'lunge', 'shoulder_press', 'plank'];
  return typeof value === 'string' && codes.includes(value);
}

/**
 * Check if a value is a valid phase
 */
export function isExercisePhase(value: unknown): value is string {
  const phases = ['ready', 'descending', 'bottom', 'ascending', 'completed', 'paused', 'calibrating'];
  return typeof value === 'string' && phases.includes(value);
}

/**
 * Check if a value is a valid severity
 */
export function isCorrectionSeverity(value: unknown): value is string {
  const severities = ['info', 'hint', 'warning', 'critical'];
  return typeof value === 'string' && severities.includes(value);
}

/**
 * Check if a value is a valid locale
 */
export function isLocale(value: unknown): value is SupportedLocale {
  return SUPPORTED_LOCALES.includes(value as SupportedLocale);
}

/**
 * Parse and validate exercise code
 */
export function parseExerciseCode(value: unknown): string | null {
  if (isExerciseCode(value)) return value;
  return null;
}

/**
 * Parse and validate locale
 */
export function parseLocale(value: unknown, fallback: SupportedLocale = DEFAULT_LOCALE): SupportedLocale {
  if (isLocale(value)) return value;
  return fallback;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get localized string from an object
 */
export function getLocalizedString(
  obj: Record<string, string> | undefined,
  locale: SupportedLocale = DEFAULT_LOCALE
): string {
  if (!obj) return '';
  return obj[locale] || obj[DEFAULT_LOCALE] || Object.values(obj)[0] || '';
}

/**
 * Format duration in milliseconds to human readable
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Format number with locale
 */
export function formatNumber(value: number, locale: SupportedLocale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(value);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, locale: SupportedLocale = DEFAULT_LOCALE): string {
  return formatNumber(Math.round(value * 100), locale) + '%';
}

/**
 * Format quality score
 */
export function formatQualityScore(value: number, locale: SupportedLocale = DEFAULT_LOCALE): string {
  return formatNumber(Math.round(value), locale);
}

// =============================================================================
// Main Export
// =============================================================================

const fitnessTypes = {
  // Versions
  ENGINE_VERSION,
  WASM_ENGINE_VERSION,
  
  // Constants
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  MIN_CORRECTION_CONFIDENCE,
  DEFAULT_FEEDBACK_COOLDOWN_MS,
  MAX_CORRECTIONS_PER_REP,
  
  // Messages
  PRIVACY_NOTICE,
  CALIBRATION_MESSAGES,
  COUNTDOWN_MESSAGES,
  SET_COMPLETION_MESSAGES,
  REST_TIMER_MESSAGES,
  EXERCISE_NAMES,
  
  // Functions
  isExerciseCode,
  isExercisePhase,
  isCorrectionSeverity,
  isLocale,
  parseExerciseCode,
  parseLocale,
  getLocalizedString,
  formatDuration,
  formatNumber,
  formatPercentage,
  formatQualityScore,
};

export default fitnessTypes;
