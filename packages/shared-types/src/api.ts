// ============================================
// API & INFRASTRUCTURE
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Error handling
export enum ErrorCode {
  // Authentication errors
  UNAUTHORIZED = "UNAUTHORIZED",
  INVALID_TOKEN = "INVALID_TOKEN",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",

  // Resource errors
  NOT_FOUND = "NOT_FOUND",
  ALREADY_EXISTS = "ALREADY_EXISTS",

  // Validation errors
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_INPUT = "INVALID_INPUT",

  // Permission errors
  FORBIDDEN = "FORBIDDEN",
  RATE_LIMITED = "RATE_LIMITED",

  // Server errors
  INTERNAL_ERROR = "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",

  // Domain-specific errors
  WORKOUT_NOT_FOUND = "WORKOUT_NOT_FOUND",
  USER_NOT_FOUND = "USER_NOT_FOUND",
  GOAL_NOT_FOUND = "GOAL_NOT_FOUND",
}

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface ValidationProblem {
  field: string;
  message: string;
  code?: string;
}

// Cloudflare Workers environment bindings
export type Env = {
  DB: unknown;
  AI?: unknown;
  R2?: unknown;
  AUTH_SECRET: string;
};

// Health check response
export interface HealthCheckResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: Date;
  uptime: number;
  version: string;
  checks: {
    database: boolean;
    ai: boolean;
    storage: boolean;
  };
}

// Rate limiting
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
}

// Convenience helpers
export function successResponse<T>(data: T, status = 200): ApiResponse<T> {
  return { success: true, data, timestamp: new Date() };
}

export function errorResponse(message: string, code: ErrorCode, details?: Record<string, unknown>): ApiResponse<never> {
  return { success: false, error: message, timestamp: new Date(), ...(details && { details }) };
}
