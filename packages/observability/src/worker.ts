/**
 * Observability Worker Entry Point
 * 
 * Cloudflare Workers-specific observability exports and configuration.
 * This module provides Workers-specific utilities and middleware.
 */

import { createHttpServerInstrumentation, type HttpServerInstrumentationOptions } from './http/server.js';
import { createHonoHttpMiddleware } from './http/server.js';
import { createServiceLogger, initLogger } from './logger.js';
import {
  generateHealthStatus,
  registerHealthCheck,
  createDatabaseHealthCheck,
  createQueueHealthCheck,
  createConfigHealthCheck,
  createPublicHealthResponse,
  createDiagnosticHealthResponse,
} from './runtime.js';
import { SERVICE_NAMES, type RuntimeType } from './config.js';
import type { ServiceContext, HealthStatus } from './types.js';

// =============================================================================
// Worker Configuration
// =============================================================================

export interface WorkerObservabilityConfig {
  /** Service name */
  service: string;
  /** Service version */
  version: string;
  /** Runtime type */
  runtime?: RuntimeType;
  /** Health check function */
  healthCheck?: () => Promise<boolean>;
  /** Database health check */
  databaseHealthCheck?: () => Promise<boolean>;
  /** Queue health check */
  queueHealthCheck?: () => Promise<boolean>;
  /** Required environment variables */
  requiredEnvVars?: string[];
  /** Get environment function */
  getEnv?: () => Record<string, string | undefined>;
}

/**
 * Initialize observability for a Cloudflare Worker.
 */
export function initWorkerObservability(config: WorkerObservabilityConfig): {
  serviceContext: ServiceContext;
  logger: ReturnType<typeof createServiceLogger>;
  healthMiddleware: (c: unknown, next: () => Promise<void>) => Promise<void>;
  getHealthStatus: () => Promise<HealthStatus>;
  getPublicHealth: () => Promise<{ status: string; timestamp: string; version: string }>;
} {
  // Create service context
  const serviceContext: ServiceContext = {
    service: config.service,
    environment: getEnvironment(),
    version: config.version,
    runtime: 'cloudflare-workers',
  };

  // Initialize logger
  const logger = createServiceLogger(config.service);

  // Register health checks
  if (config.databaseHealthCheck) {
    registerHealthCheck('database', createDatabaseHealthCheck('database', config.databaseHealthCheck));
  }

  if (config.queueHealthCheck) {
    registerHealthCheck('queue', createQueueHealthCheck('queue', config.queueHealthCheck));
  }

  if (config.requiredEnvVars && config.getEnv) {
    registerHealthCheck(
      'configuration',
      createConfigHealthCheck(config.requiredEnvVars, config.getEnv)
    );
  }

  // Create HTTP instrumentation
  const httpInstrumentation = createHttpServerInstrumentation({
    serviceContext,
    logger,
  });

  // Create Hono middleware for health endpoints
  const healthMiddleware = createHonoHttpMiddleware({
    serviceContext,
    logger,
  });

  // Health status generators
  async function getHealthStatus(): Promise<HealthStatus> {
    return generateHealthStatus(config.service, config.version);
  }

  async function getPublicHealth(): Promise<{ status: string; timestamp: string; version: string }> {
    const status = await getHealthStatus();
    return createPublicHealthResponse(status);
  }

  return {
    serviceContext,
    logger,
    healthMiddleware,
    getHealthStatus,
    getPublicHealth,
  };
}

/**
 * Get current environment.
 */
function getEnvironment(): 'development' | 'staging' | 'production' {
  // Check for known environment markers
  if (typeof globalThis !== 'undefined') {
    const env = (globalThis as Record<string, string | undefined>).env;
    
    if (env?.ENVIRONMENT) {
      const envLower = env.ENVIRONMENT.toLowerCase();
      if (envLower === 'production') return 'production';
      if (envLower === 'staging') return 'staging';
      if (envLower === 'development') return 'development';
    }

    // Check for Cloudflare deployment
    if (env?.CF_PAGES || env?.CF_REGION) {
      return 'production';
    }
  }

  return 'development';
}

// =============================================================================
// Service-Specific Initializers
// =============================================================================

/**
 * Initialize observability for Auth service.
 */
export function initAuthObservability(config: { version: string; dbCheck?: () => Promise<boolean> }) {
  return initWorkerObservability({
    service: SERVICE_NAMES.AUTH,
    version: config.version,
    databaseHealthCheck: config.dbCheck,
    requiredEnvVars: ['AUTH_JWT_PRIVATE_KEY', 'AUTH_JWT_PUBLIC_KEY'],
  });
}

/**
 * Initialize observability for Health service.
 */
export function initHealthObservability(config: {
  version: string;
  dbCheck?: () => Promise<boolean>;
  queueCheck?: () => Promise<boolean>;
}) {
  return initWorkerObservability({
    service: SERVICE_NAMES.HEALTH,
    version: config.version,
    databaseHealthCheck: config.dbCheck,
    queueHealthCheck: config.queueCheck,
  });
}

/**
 * Initialize observability for Coach service.
 */
export function initCoachObservability(config: { version: string; dbCheck?: () => Promise<boolean> }) {
  return initWorkerObservability({
    service: SERVICE_NAMES.COACH,
    version: config.version,
    databaseHealthCheck: config.dbCheck,
  });
}

/**
 * Initialize observability for Nutrition service.
 */
export function initNutritionObservability(config: {
  version: string;
  dbCheck?: () => Promise<boolean>;
  queueCheck?: () => Promise<boolean>;
}) {
  return initWorkerObservability({
    service: SERVICE_NAMES.NUTRITION,
    version: config.version,
    databaseHealthCheck: config.dbCheck,
    queueHealthCheck: config.queueCheck,
  });
}

/**
 * Initialize observability for Mail service.
 */
export function initMailObservability(config: { version: string; queueCheck?: () => Promise<boolean> }) {
  return initWorkerObservability({
    service: SERVICE_NAMES.MAIL,
    version: config.version,
    queueHealthCheck: config.queueCheck,
  });
}

/**
 * Initialize observability for Gateway service.
 */
export function initGatewayObservability(config: { version: string }) {
  return initWorkerObservability({
    service: SERVICE_NAMES.GATEWAY,
    version: config.version,
  });
}

// =============================================================================
// Export All Types
// =============================================================================

export type {
  HealthStatus,
  ComponentHealth,
  HealthCheckResult,
} from './types.js';

export type {
  WorkerObservabilityConfig,
} from './worker.js';

export {
  // HTTP instrumentation
  createHttpServerInstrumentation,
  createHonoHttpMiddleware,
  instrumentFetchHandler,
  type HttpServerInstrumentationOptions,
  type RequestInstrumented,
} from './http/server.js';

export {
  createHttpClientInstrumentation,
  createRetryFetch,
  type HttpClientInstrumentationOptions,
} from './http/client.js';

export {
  // Database instrumentation
  createDatabaseInstrumentation,
  createD1Instrumentation,
  type DatabaseInstrumentationOptions,
  type D1InstrumentationOptions,
} from './database/instrumentation.js';

export {
  // WASM instrumentation
  createWasmInstrumentation,
  getWasmMetrics,
  resetWasmMetrics,
  type WasmInstrumentationOptions,
} from './wasm/instrumentation.js';

export {
  // AI instrumentation
  createAiInstrumentation,
  getAiMetrics,
  resetAiMetrics,
  estimateCost,
  type AiInstrumentationOptions,
} from './ai/instrumentation.js';

export {
  // Runtime
  getRuntimeInfo,
  isCloudflareWorkers,
  registerHealthCheck,
  generateHealthStatus,
} from './runtime.js';
