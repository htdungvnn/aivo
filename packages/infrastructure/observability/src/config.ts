/**
 * Observability Configuration
 * 
 * Environment-based configuration for the observability package.
 * Supports Cloudflare Workers, Node.js, Browser, and React Native runtimes.
 */

import type { LoggerConfig, RedactionConfig } from './types.js';

// Re-export for convenience
export type { LoggerConfig, RedactionConfig } from './types.js';

// =============================================================================
// Default Redaction Fields
// =============================================================================

/**
 * Default fields that are always redacted for privacy and security.
 * These fields are never logged, even if not explicitly configured.
 */
export const DEFAULT_REDACTED_FIELDS = [
  // Authentication
  'authorization',
  'authorization.*',
  'authorizationHeader',
  'authHeader',
  'bearer',
  'bearerToken',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'idToken',
  'id_token',
  'token',
  'apiKey',
  'api_key',
  'apiSecret',
  'api_secret',
  'clientSecret',
  'client_secret',
  'privateKey',
  'private_key',
  'secret',
  'session',
  'sessionId',
  'session_id',
  'cookie',
  'cookies',
  
  // OAuth
  'oauth.*',
  'code',
  'code.*',
  'oauthToken',
  
  // Passwords
  'password',
  'passwd',
  'pwd',
  'pass',
  
  // Database
  'connectionString',
  'connection_string',
  'databaseUrl',
  'database_url',
  'dbUrl',
  'db_url',
  'dbHost',
  'db_port',
  'dbUsername',
  'db_user',
  'dbPassword',
  'db_password',
  
  // Queue
  'queueUrl',
  'queue_url',
  'messageBody',
  'message.body',
  
  // Health Data
  'healthData',
  'health_data',
  'medical',
  'medical.*',
  'heartRate',
  'heart_rate',
  'hrv',
  'sleepData',
  'sleep_data',
  'workoutData',
  'workout_data',
  'nutritionData',
  'nutrition_data',
  'mealPlan',
  'meal_plan',
  'mealImage',
  'meal_image',
  'poseLandmarks',
  'pose_landmarks',
  'cameraFrame',
  'camera_frame',
  'voiceRecording',
  'voice_recording',
  
  // AI Data
  'aiPrompt',
  'ai_prompt',
  'systemPrompt',
  'system_prompt',
  'userPrompt',
  'user_prompt',
  'fullPrompt',
  'full_prompt',
  'messages',
  'messages.*.content',
  'aiProviderKey',
  'ai_provider_key',
  
  // Personal Data
  'email',
  'email.*',
  'phone',
  'phoneNumber',
  'phone_number',
  'ssn',
  'socialSecurity',
  'address',
  'address.*',
  'dateOfBirth',
  'date_of_birth',
  'dob',
  
  // Request Data
  'requestBody',
  'request.body',
  'requestBody.*',
  'request.body.*',
  'responseBody',
  'response.body',
  'responseBody.*',
  'response.body.*',
  'query',
  'query.*',
  'params',
  'params.*',
  'headers.*',
  
  // Cloudflare
  'cf.*',
  'workerSecret',
  'worker_secret',
] as const;

// =============================================================================
// Runtime Detection
// =============================================================================

export type RuntimeType = 'cloudflare-workers' | 'node' | 'browser' | 'react-native';

/**
 * Detect the current runtime environment.
 */
export function detectRuntime(): RuntimeType {
  // Cloudflare Workers
  if (
    typeof globalThis !== 'undefined' &&
    'navigator' in globalThis === false &&
    'D1Database' in globalThis === false
  ) {
    // Check for Cloudflare Workers runtime markers
    if (
      typeof WebSocketPair !== 'undefined' ||
      (typeof globalThis !== 'undefined' && 'caches' in globalThis)
    ) {
      return 'cloudflare-workers';
    }
  }
  
  // React Native
  if (
    typeof navigator !== 'undefined' &&
    navigator.product === 'ReactNative'
  ) {
    return 'react-native';
  }
  
  // Browser
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    return 'browser';
  }
  
  // Node.js (default fallback)
  return 'node';
}

// =============================================================================
// Environment Configuration
// =============================================================================

export interface EnvConfig {
  /** Service name from environment */
  SERVICE_NAME?: string;
  /** Environment name */
  ENVIRONMENT?: string;
  /** Service version */
  SERVICE_VERSION?: string;
  /** Runtime */
  RUNTIME?: RuntimeType;
  /** Log level */
  LOG_LEVEL?: string;
  /** Enable structured JSON logging */
  LOG_STRUCTURED_JSON?: string;
  /** Enable pretty printing */
  LOG_PRETTY_PRINT?: string;
  /** Sample rate for logs */
  LOG_SAMPLE_RATE?: string;
  /** Export URL for batched logs */
  LOG_EXPORT_URL?: string;
}

/**
 * Get environment configuration.
 * Works in Cloudflare Workers, Node.js, Browser, and React Native.
 */
export function getEnvConfig(): EnvConfig {
  // In Cloudflare Workers, environment variables are in globalThis.env
  if (typeof globalThis !== 'undefined' && 'env' in globalThis) {
    const env = (globalThis as { env?: Record<string, string | undefined> }).env;
    if (env) {
      return {
        SERVICE_NAME: env.SERVICE_NAME,
        ENVIRONMENT: env.ENVIRONMENT,
        SERVICE_VERSION: env.SERVICE_VERSION,
        RUNTIME: (env.RUNTIME as RuntimeType) || detectRuntime(),
        LOG_LEVEL: env.LOG_LEVEL,
        LOG_STRUCTURED_JSON: env.LOG_STRUCTURED_JSON,
        LOG_PRETTY_PRINT: env.LOG_PRETTY_PRINT,
        LOG_SAMPLE_RATE: env.LOG_SAMPLE_RATE,
        LOG_EXPORT_URL: env.LOG_EXPORT_URL,
      };
    }
  }
  
  // In Node.js and Browser, use process.env or globalThis
  return {
    SERVICE_NAME:
      (typeof process !== 'undefined' ? process.env?.SERVICE_NAME : undefined) ||
      (typeof globalThis !== 'undefined'
        ? (globalThis as unknown as Record<string, string | undefined>)?.SERVICE_NAME
        : undefined),
    ENVIRONMENT:
      (typeof process !== 'undefined' ? process.env?.ENVIRONMENT : undefined) ||
      (typeof globalThis !== 'undefined'
        ? (globalThis as unknown as Record<string, string | undefined>)?.ENVIRONMENT
        : undefined),
    SERVICE_VERSION:
      (typeof process !== 'undefined' ? process.env?.SERVICE_VERSION : undefined) ||
      (typeof globalThis !== 'undefined'
        ? (globalThis as unknown as Record<string, string | undefined>)?.SERVICE_VERSION
        : undefined),
    RUNTIME: detectRuntime(),
    LOG_LEVEL:
      (typeof process !== 'undefined' ? process.env?.LOG_LEVEL : undefined) ||
      (typeof globalThis !== 'undefined'
        ? (globalThis as unknown as Record<string, string | undefined>)?.LOG_LEVEL
        : undefined),
    LOG_STRUCTURED_JSON:
      (typeof process !== 'undefined' ? process.env?.LOG_STRUCTURED_JSON : undefined) ||
      (typeof globalThis !== 'undefined'
        ? (globalThis as unknown as Record<string, string | undefined>)?.LOG_STRUCTURED_JSON
        : undefined),
    LOG_PRETTY_PRINT:
      (typeof process !== 'undefined' ? process.env?.LOG_PRETTY_PRINT : undefined) ||
      (typeof globalThis !== 'undefined'
        ? (globalThis as unknown as Record<string, string | undefined>)?.LOG_PRETTY_PRINT
        : undefined),
    LOG_SAMPLE_RATE:
      (typeof process !== 'undefined' ? process.env?.LOG_SAMPLE_RATE : undefined) ||
      (typeof globalThis !== 'undefined'
        ? (globalThis as unknown as Record<string, string | undefined>)?.LOG_SAMPLE_RATE
        : undefined),
    LOG_EXPORT_URL:
      (typeof process !== 'undefined' ? process.env?.LOG_EXPORT_URL : undefined) ||
      (typeof globalThis !== 'undefined'
        ? (globalThis as unknown as Record<string, string | undefined>)?.LOG_EXPORT_URL
        : undefined),
  };
}

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Create a default logger configuration based on environment.
 */
export function createDefaultConfig(
  serviceName: string,
  overrides?: Partial<LoggerConfig>
): LoggerConfig {
  const env = getEnvConfig();
  const runtime = env.RUNTIME || detectRuntime();
  
  // Determine environment
  let environment: LoggerConfig['environment'] = 'development';
  if (env.ENVIRONMENT) {
    if (['production', 'staging', 'development', 'test'].includes(env.ENVIRONMENT)) {
      environment = env.ENVIRONMENT as LoggerConfig['environment'];
    }
  } else if (runtime === 'cloudflare-workers' || runtime === 'node') {
    // In server environments, default to production
    environment = 'production';
  }
  
  // Determine minimum log level
  let minimumLevel: LoggerConfig['minimumLevel'] = 'info';
  if (env.LOG_LEVEL) {
    if (['debug', 'info', 'warn', 'error', 'critical'].includes(env.LOG_LEVEL)) {
      minimumLevel = env.LOG_LEVEL as LoggerConfig['minimumLevel'];
    }
  } else if (environment === 'development' || environment === 'test') {
    minimumLevel = 'debug';
  }
  
  // Determine output format
  const isProduction = environment === 'production';
  const structuredJson = env.LOG_STRUCTURED_JSON !== undefined
    ? env.LOG_STRUCTURED_JSON === 'true'
    : isProduction;
  const prettyPrint = env.LOG_PRETTY_PRINT !== undefined
    ? env.LOG_PRETTY_PRINT === 'true'
    : environment === 'development';
  
  // Default redaction config
  const redaction: RedactionConfig = {
    fields: [...DEFAULT_REDACTED_FIELDS],
    replacement: '[REDACTED]',
    maxDepth: 20,
  };
  
  // Sample rate
  let sampleRate: number | undefined;
  if (env.LOG_SAMPLE_RATE) {
    const parsed = parseFloat(env.LOG_SAMPLE_RATE);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
      sampleRate = parsed;
    }
  }
  
  return {
    service: serviceName,
    environment,
    version: env.SERVICE_VERSION || '1.0.0',
    runtime: runtime,
    minimumLevel,
    structuredJson,
    prettyPrint,
    redaction,
    sampleRate,
    ...overrides,
  };
}

// =============================================================================
// Service Identifiers
// =============================================================================

export const SERVICE_NAMES = {
  AUTH: 'auth-service',
  COACH: 'coach-service',
  HEALTH: 'health-service',
  NUTRITION: 'nutrition-service',
  MAIL: 'mail-service',
  GATEWAY: 'gateway-service',
  WEB: 'web-app',
  MOBILE: 'mobile-app',
} as const;

/**
 * Validate service name against known services.
 */
export function isKnownService(name: string): name is (typeof SERVICE_NAMES)[keyof typeof SERVICE_NAMES] {
  return Object.values(SERVICE_NAMES).includes(name as (typeof SERVICE_NAMES)[keyof typeof SERVICE_NAMES]);
}
