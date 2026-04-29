// Centralized configuration for the mobile app
// All services should import from here instead of defining their own constants

/**
 * Storage keys - single source of truth
 */
export const STORAGE_KEYS = {
  TOKEN: 'aivo_token',
  USER_ID: 'aivo_user_id',
  USER_DATA: 'aivo_user_data', // For storing full user object
} as const;

/**
 * Get the base URL from environment or fallback to development
 */
function getBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (url) {
    return url.replace(/\/$/, '');
  }
  // Fallback for local development
  return __DEV__ ? 'http://localhost:8787' : 'https://api.aivo.website';
}

/**
 * API Configuration
 */
export const API_CONFIG = {
  BASE_URL: getBaseUrl(),

  // Common API endpoints relative to BASE_URL
  ENDPOINTS: {
    AUTH_GOOGLE: '/api/auth/google',
    AUTH_FACEBOOK: '/api/auth/facebook',
    AUTH_VERIFY: '/api/auth/verify',
    AUTH_LOGOUT: '/api/auth/logout',

    BIOMETRIC_SLEEP: '/api/biometric/sleep',
    BIOMETRIC_SNAPSHOT: '/api/biometric/snapshot/generate',
    BIOMETRIC_READINGS_BATCH: '/api/biometric/readings/batch',
    BIOMETRIC_CORRELATIONS: '/api/biometric/correlations',
    BIOMETRIC_RECOVERY_SCORE: '/api/biometric/recovery-score',

    BODY_METRICS: '/body/metrics',
    BODY_UPLOAD: '/body/upload',
    BODY_VISION_ANALYZE: '/body/vision/analyze',
    BODY_HEALTH_SCORE: '/body/health-score',
    BODY_HEATMAPS: '/body/heatmaps',

    FORM_UPLOAD: '/api/form/upload',
    FORM_STATUS: (videoId: string) => `/api/form/${videoId}/status`,
    FORM_RESULT: (videoId: string) => `/api/form/${videoId}/result`,
    FORM_USER_VIDEOS: '/api/form/user/videos',

    LIVE_WORKOUT_START: '/api/live-workout/start',
    LIVE_WORKOUT_SESSION: (sessionId: string) => `/api/live-workout/session/${sessionId}`,
    LIVE_WORKOUT_LOG_RPE: '/api/live-workout/log-rpe',
    LIVE_WORKOUT_ADJUST: '/api/live-workout/adjust',
    LIVE_WORKOUT_END: (sessionId: string) => `/api/live-workout/session/${sessionId}/end`,

    MACRO_ADJUSTMENT_START: '/api/macro-adjustment/session/start',
    MACRO_ADJUSTMENT_CHECK: '/api/macro-adjustment/check',
    MACRO_ADJUSTMENT_ACCEPT: (logId: string) => `/api/macro-adjustment/adjustment/${logId}/accept`,
    MACRO_ADJUSTMENT_DISMISS: (logId: string) => `/api/macro-adjustment/adjustment/${logId}/dismiss`,
    MACRO_ADJUSTMENT_END: (sessionId: string) => `/api/macro-adjustment/session/${sessionId}/end`,
    NUTRITION_TARGETS: '/api/biometric/nutrition/targets',

    NUTRITION_UPLOAD: '/nutrition/upload',
    NUTRITION_LOGS: '/nutrition/logs',
    NUTRITION_LOGS_FROM_ANALYSIS: '/nutrition/logs/from-analysis',
    NUTRITION_SUMMARY_DAILY: '/nutrition/summary/daily',
    NUTRITION_FOOD_ITEMS_SEARCH: '/nutrition/food-items/search',

    WORKOUTS: '/workouts',

    AI_CHAT: '/ai/chat',
    AI_HISTORY: (userId: string) => `/ai/history/${encodeURIComponent(userId)}`,

    EXPORT: '/export',
    EXPORT_TEMPLATE: (format: string) => `/export/template?format=${format}`,

    CALC_BMI: '/calc/bmi',
    CALC_CALORIES: '/calc/calories',
    CALC_ONE_REP_MAX: '/calc/one-rep-max',
  } as const,

  TIMEOUT: 30000,
  RETRIES: 3,
} as const;

/**
 * Helper to construct full URL from endpoint
 */
export function getFullUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  return `${API_CONFIG.BASE_URL}${endpoint}`;
}

/**
 * OAuth Configuration
 */
export const OAUTH_CONFIG = {
  SCHEME: 'aivo',
  REDIRECT_URI: 'aivo://auth/callback',

  // These should be set via EAS secrets in production
  GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
  FACEBOOK_CLIENT_ID: process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_ID || '',

  // OAuth provider URLs (backend handles these)
  // The redirect_uri is passed as query param
  GOOGLE_AUTH_ENDPOINT: '/api/auth/google',
  FACEBOOK_AUTH_ENDPOINT: '/api/auth/facebook',
} as const;

/**
 * Check if running in development mode
 */
export const isDevelopment = (): boolean => {
  return __DEV__;
};

/**
 * Get configured OAuth client IDs
 */
export function getOAuthClientIds() {
  return {
    google: OAUTH_CONFIG.GOOGLE_CLIENT_ID,
    facebook: OAUTH_CONFIG.FACEBOOK_CLIENT_ID,
  };
}
