/**
 * Coach Service - Environment Types
 */

import type { Queue } from '@cloudflare/workers-types';
import type { QueueMessage } from '@repo/queue-types';

// D1 Database binding
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<D1Result>;
  batch(stmts: D1PreparedStatement[]): Promise<D1Result[]>;
  dump(): Promise<ArrayBuffer>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(col?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T[]>>;
}

export interface D1Result<T = unknown> {
  results: T;
  success: boolean;
  meta?: {
    duration?: number;
    changes?: number;
    last_row_id?: number;
  };
}

// AI binding
export interface Ai {
  run(model: string, inputs: Record<string, unknown>): Promise<AiOutput>;
}

export interface AiOutput {
  response: string;
  metadata?: {
    tokens?: number;
    stop_reason?: string;
    model?: string;
  };
}

// Queue binding for planning jobs
export interface PlanningQueueMessage extends QueueMessage {
  type: 'coach.plan_adjustment';
  data: {
    userId: string;
    planId: string;
    reason: string;
    completedSessionId?: string;
  };
}

// Environment interface
export interface CoachEnv {
  // D1 Database
  DB: D1Database;
  
  // Queues
  PLANNING_QUEUE: Queue<PlanningQueueMessage>;
  
  // AI Gateway
  AI_GATEWAY: Ai;
  
  // Configuration
  AUTH_SERVICE_URL: string;
  SCHEMA_VERSION: string;
  ENGINE_VERSION: string;
  WASM_ENGINE_VERSION: string;
  AI_MODEL: string;
  AI_MAX_TOKENS: string;
  AI_TEMPERATURE: string;
  PLANNING_ENABLED: string;
  RATE_LIMIT_REQUESTS: string;
  RATE_LIMIT_WINDOW_MS: string;
  
  // Allowed Origins
  ALLOWED_ORIGINS?: string;
}

// Context type for Hono
export interface CoachContext {
  Bindings: CoachEnv;
  Variables: {
    requestId: string;
    userId: string;
  };
}

// Request validation errors
export interface ValidationError {
  field: string;
  message: string;
}

// API Response types
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: ValidationError[];
  };
}

export interface ApiSuccessResponse<T> {
  data: T;
  requestId?: string;
}
