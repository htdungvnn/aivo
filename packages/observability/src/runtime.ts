/**
 * Runtime Detection and Health Checks
 * 
 * Provides runtime detection, health check generation,
 * and runtime metadata for observability.
 */

import { detectRuntime, type RuntimeType } from './config.js';
import type { HealthStatus, ComponentHealth } from './types.js';

// =============================================================================
// Runtime Detection
// =============================================================================

/**
 * Runtime information interface.
 */
export interface RuntimeInfo {
  /** Runtime type */
  type: RuntimeType;
  /** Runtime version (if available) */
  version?: string;
  /** Cloudflare zone/region (Workers only) */
  zone?: string;
  /** Deployment region */
  region?: string;
  /** Whether in Cold Workers mode */
  isCold?: boolean;
  /** Execution context */
  context: 'production' | 'preview' | 'local';
}

/**
 * Get detailed runtime information.
 */
export function getRuntimeInfo(): RuntimeInfo {
  const type = detectRuntime();
  const info: RuntimeInfo = { type };
  
  switch (type) {
    case 'cloudflare-workers':
      // Cloudflare Workers specific info
      try {
        // Check for deployment context
        if (typeof globalThis !== 'undefined') {
          const cf = (globalThis as Record<string, unknown>).caches;
          info.context = cf ? 'production' : 'local';
        }
        
        // Get region from cf object
        if (typeof Request !== 'undefined') {
          // This would need an actual request to determine
          info.zone = undefined;
        }
      } catch {
        info.context = 'local';
      }
      break;
      
    case 'node':
      info.version = process.version;
      info.context = process.env.NODE_ENV === 'production' ? 'production' : 'local';
      break;
      
    case 'browser':
      info.version = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
      info.context = 'local';
      break;
      
    case 'react-native':
      info.context = 'local';
      break;
  }
  
  return info;
}

/**
 * Check if running in Cloudflare Workers.
 */
export function isCloudflareWorkers(): boolean {
  return detectRuntime() === 'cloudflare-workers';
}

/**
 * Check if running in Node.js.
 */
export function isNode(): boolean {
  return detectRuntime() === 'node';
}

/**
 * Check if running in browser.
 */
export function isBrowser(): boolean {
  return detectRuntime() === 'browser';
}

/**
 * Check if running in React Native.
 */
export function isReactNative(): boolean {
  return detectRuntime() === 'react-native';
}

// =============================================================================
// Health Check Types
// =============================================================================

/**
 * Health check result.
 */
export interface HealthCheckResult {
  /** Component name */
  name: string;
  /** Health status */
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  /** Response time in ms */
  latencyMs?: number;
  /** Error message if unhealthy */
  error?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Health check function type.
 */
export type HealthCheckFn = () => Promise<HealthCheckResult>;

// =============================================================================
// Health Check Registry
// =============================================================================

const healthChecks: Map<string, HealthCheckFn> = new Map();

/**
 * Register a health check.
 */
export function registerHealthCheck(name: string, check: HealthCheckFn): void {
  healthChecks.set(name, check);
}

/**
 * Unregister a health check.
 */
export function unregisterHealthCheck(name: string): void {
  healthChecks.delete(name);
}

/**
 * Run a single health check.
 */
export async function runHealthCheck(name: string): Promise<HealthCheckResult> {
  const check = healthChecks.get(name);
  if (!check) {
    return {
      name,
      status: 'unknown',
      error: 'Health check not registered',
    };
  }
  
  const startTime = Date.now();
  try {
    const result = await Promise.race([
      check(),
      new Promise<HealthCheckResult>((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), 5000)
      ),
    ]);
    
    return {
      ...result,
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      name,
      status: 'unhealthy',
      latencyMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Run all health checks.
 */
export async function runAllHealthChecks(): Promise<ComponentHealth[]> {
  const checks = Array.from(healthChecks.entries());
  const results = await Promise.all(checks.map(([name]) => runHealthCheck(name)));
  
  return results.map((result) => ({
    name: result.name,
    status: result.status,
    latencyMs: result.latencyMs,
    error: result.error,
    metadata: result.metadata,
  }));
}

/**
 * Determine overall health status from component statuses.
 */
export function determineOverallStatus(
  components: ComponentHealth[]
): 'healthy' | 'degraded' | 'unhealthy' {
  if (components.length === 0) {
    return 'unknown' as 'healthy';
  }
  
  const hasUnhealthy = components.some((c) => c.status === 'unhealthy');
  const hasDegraded = components.some((c) => c.status === 'degraded');
  const hasUnknown = components.some((c) => c.status === 'unknown');
  
  if (hasUnhealthy) {
    return 'unhealthy';
  }
  if (hasDegraded || hasUnknown) {
    return 'degraded';
  }
  return 'healthy';
}

/**
 * Generate health status response.
 */
export async function generateHealthStatus(
  serviceName: string,
  version: string
): Promise<HealthStatus> {
  const components = await runAllHealthChecks();
  const status = determineOverallStatus(components);
  
  return {
    status,
    components,
    timestamp: new Date().toISOString(),
    version,
  };
}

// =============================================================================
// Standard Health Checks
// =============================================================================

/**
 * Create a database health check.
 */
export function createDatabaseHealthCheck(
  name: string,
  checkFn: () => Promise<boolean>
): HealthCheckFn {
  return async (): Promise<HealthCheckResult> => {
    try {
      const healthy = await checkFn();
      return {
        name,
        status: healthy ? 'healthy' : 'unhealthy',
        metadata: { healthy },
      };
    } catch (error) {
      return {
        name,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Database check failed',
      };
    }
  };
}

/**
 * Create a queue health check.
 */
export function createQueueHealthCheck(
  name: string,
  checkFn: () => Promise<boolean>
): HealthCheckFn {
  return async (): Promise<HealthCheckResult> => {
    try {
      const healthy = await checkFn();
      return {
        name,
        status: healthy ? 'healthy' : 'unhealthy',
        metadata: { healthy },
      };
    } catch (error) {
      return {
        name,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Queue check failed',
      };
    }
  };
}

/**
 * Create a configuration health check.
 */
export function createConfigHealthCheck(
  requiredVars: string[],
  getEnv: () => Record<string, string | undefined>
): HealthCheckFn {
  return async (): Promise<HealthCheckResult> => {
    const env = getEnv();
    const missing: string[] = [];
    
    for (const varName of requiredVars) {
      if (!env[varName]) {
        missing.push(varName);
      }
    }
    
    if (missing.length > 0) {
      return {
        name: 'configuration',
        status: 'unhealthy',
        error: `Missing required variables: ${missing.join(', ')}`,
        metadata: { missing },
      };
    }
    
    return {
      name: 'configuration',
      status: 'healthy',
      metadata: { configured: requiredVars },
    };
  };
}

/**
 * Create a WASM module health check.
 */
export function createWasmHealthCheck(
  name: string,
  checkFn: () => Promise<boolean>
): HealthCheckFn {
  return async (): Promise<HealthCheckResult> => {
    try {
      const healthy = await checkFn();
      return {
        name,
        status: healthy ? 'healthy' : 'degraded',
        metadata: {
          healthy,
          fallback: !healthy,
        },
      };
    } catch (error) {
      return {
        name,
        status: 'degraded',
        error: error instanceof Error ? error.message : 'WASM check failed',
        metadata: { healthy: false },
      };
    }
  };
}

// =============================================================================
// Health Endpoints
// =============================================================================

/**
 * Create a health response for the /health endpoint (public).
 * Only includes minimal status information.
 */
export function createPublicHealthResponse(status: HealthStatus): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
} {
  return {
    status: status.status,
    timestamp: status.timestamp,
    version: status.version,
  };
}

/**
 * Create a diagnostic health response (authorized).
 * Includes component details.
 */
export function createDiagnosticHealthResponse(
  status: HealthStatus,
  includeMetadata: boolean = false
): HealthStatus {
  if (!includeMetadata) {
    // Remove sensitive metadata
    return {
      ...status,
      components: status.components.map((c) => ({
        ...c,
        metadata: undefined,
      })),
    };
  }
  return status;
}

// =============================================================================
// Startup and Shutdown
// =============================================================================

/**
 * Runtime startup event.
 */
export function onStartup(handler: () => Promise<void>): void {
  if (typeof globalThis !== 'undefined') {
    // Cloudflare Workers
    (globalThis as Record<string, unknown>).addEventListener?.('start', handler);
  }
}

/**
 * Runtime shutdown event.
 */
export function onShutdown(handler: () => Promise<void>): void {
  if (typeof globalThis !== 'undefined') {
    // Node.js
    process?.on?.('beforeExit', handler);
  }
}
