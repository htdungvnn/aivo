/**
 * Environment Types for Health Worker
 */

// Report types for queue
import type {
  ReportGenerateTask,
  ReportDeliverTask,
  ReportDeleteTask,
} from '@repo/report-types';

// Database
export interface HealthEnv {
  // D1 Database
  DB: D1Database;
  
  // R2 bucket for report storage
  REPORT_BUCKET: R2Bucket;
  
  // Queue for async processing
  HEALTH_QUEUE: Queue;
  
  // Report generation queue (consumed by queue handler)
  REPORT_QUEUE: Queue<ReportGenerateTask>;

  // Report deliver queue (produced after generation, consumed by mail worker)
  DELIVER_QUEUE: Queue<ReportDeliverTask>;

  // Dead letter queue
  REPORT_DLQ: Queue<ReportGenerateTask>;
  
  // AI Gateway
  AI_GATEWAY: Ai;
  
  // Service URLs
  AUTH_SERVICE_URL: string;
  NUTRITION_SERVICE_URL: string;
  COACH_SERVICE_URL: string;
  MAIL_SERVICE_URL: string;
  
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
  
  // Report settings
  REPORT_RETENTION_DAYS: string;
  REPORT_MAX_GENERATION_TIME_MS: string;

  // CORS allowed origins
  ALLOWED_ORIGINS?: string;
}

// Context variables
export interface HealthContext {
  Bindings: HealthEnv;
  Variables: {
    requestId: string;
    userId: string;
  };
}

// Queue message types
export type HealthQueueMessage = {
  type: 'calculate_readiness' | 'generate_actions' | 'sync_health_data';
  userId: string;
  date?: string;
  correlationId?: string;
};

export type ReportQueueMessage = ReportGenerateTask;
export type DeliverQueueMessage = ReportDeliverTask;
export type DeleteQueueMessage = ReportDeleteTask;
