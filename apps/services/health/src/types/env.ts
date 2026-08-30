/**
 * Environment Types for Health Worker
 */

// Database
export interface HealthEnv {
  // D1 Database
  DB: D1Database;
  
  // Queue for async processing
  HEALTH_QUEUE: Queue;
  
  // AI Gateway
  AI_GATEWAY: Ai;
  
  // Service URLs
  AUTH_SERVICE_URL: string;
  NUTRITION_SERVICE_URL: string;
  COACH_SERVICE_URL: string;
  
  // Configuration
  SCHEMA_VERSION: string;
  ALGORITHM_VERSION: string;
  
  // Rate limiting
  RATE_LIMIT_REQUESTS: string;
  RATE_LIMIT_WINDOW_MS: string;
  
  // AI Configuration
  AI_ENABLED: string;
  AI_MODEL: string;
  AI_MAX_TOKENS: string;
  AI_TEMPERATURE: string;
  
  // Cache settings
  CACHE_TTL_SECONDS: string;
  
  // Algorithm settings
  BASELINE_MIN_DAYS: string;
  BASELINE_ROLLING_WINDOW: string;
}

// Context variables
export interface HealthContext {
  Bindings: HealthEnv;
  Variables: {
    requestId: string;
    userId: string;
  };
}
