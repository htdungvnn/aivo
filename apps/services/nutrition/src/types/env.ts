/**
 * Environment types for the Nutrition Worker
 */

import type { D1Database } from '@cloudflare/workers-types';

export interface NutritionEnv {
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

/**
 * Get typed environment values with defaults
 */
export function getEnvConfig(env: NutritionEnv) {
  return {
    image: {
      maxDimensionPx: parseInt(env.IMAGE_MAX_DIMENSION_PX || '1280', 10),
      quality: parseInt(env.IMAGE_QUALITY || '75', 10),
    },
    ai: {
      dailyLimit: parseInt(env.AI_DAILY_LIMIT || '50', 10),
      hourlyLimit: parseInt(env.AI_HOURLY_LIMIT || '10', 10),
      retryLimit: parseInt(env.AI_RETRY_LIMIT || '3', 10),
      confidenceThreshold: parseFloat(env.AI_CONFIDENCE_THRESHOLD || '0.7'),
      defaultModel: env.DEFAULT_MODEL || '@cf/unum/uform-gen2-qwen-500m',
      fallbackModel: env.FALLBACK_MODEL || '@cf/unum/uform-gen2-qwen-7b',
    },
    auth: {
      serviceUrl: env.AUTH_SERVICE_URL || 'http://localhost:3001',
    },
  };
}
