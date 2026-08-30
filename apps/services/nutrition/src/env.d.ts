/**
 * Environment type declarations for Cloudflare Workers
 */

export interface Env {
  DB: D1Database;
  MEAL_IMAGES: R2Bucket;
  ANALYSIS_QUEUE: Queue;
  AI_GATEWAY: Ai;
  AUTH_SERVICE_URL: string;
  IMAGE_MAX_DIMENSION_PX: string;
  IMAGE_QUALITY: string;
  AI_DAILY_LIMIT: string;
  AI_HOURLY_LIMIT: string;
  AI_RETRY_LIMIT: string;
  AI_CONFIDENCE_THRESHOLD: string;
  DEFAULT_MODEL: string;
  FALLBACK_MODEL: string;
  ALLOWED_ORIGINS?: string;
}
