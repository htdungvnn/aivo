/**
 * WASM Instrumentation
 * 
 * Instruments WebAssembly module operations with:
 * - Initialization tracking
 * - Runtime selection metrics
 * - Fallback detection
 * - Performance monitoring
 */

import { createServiceLogger, type Logger } from '../logger.js';
import type { ServiceContext, NormalizedError } from '../types.js';
import { createNormalizedError, ERROR_CODES } from '../errors.js';
import { METRIC_PREFIXES } from '../metrics.js';

// =============================================================================
// Metrics
// =============================================================================

const metrics = {
  initDuration: new Map<string, number[]>(),
  initFailures: new Map<string, number>(),
  operationDuration: new Map<string, number[]>(),
  operationErrors: new Map<string, number>(),
  fallbacks: new Map<string, number>(),
};

/**
 * Record WASM initialization duration.
 */
function recordInitDuration(engine: string, durationMs: number): void {
  const values = metrics.initDuration.get(engine) || [];
  values.push(durationMs);
  if (values.length > 100) values.shift();
  metrics.initDuration.set(engine, values);
}

/**
 * Record WASM initialization failure.
 */
function recordInitFailure(engine: string): void {
  metrics.initFailures.set(engine, (metrics.initFailures.get(engine) || 0) + 1);
}

/**
 * Record WASM operation duration.
 */
function recordOperationDuration(engine: string, operation: string, durationMs: number): void {
  const key = `${engine}:${operation}`;
  const values = metrics.operationDuration.get(key) || [];
  values.push(durationMs);
  if (values.length > 1000) values.shift();
  metrics.operationDuration.set(key, values);
}

/**
 * Record WASM operation error.
 */
function recordOperationError(engine: string, operation: string): void {
  const key = `${engine}:${operation}`;
  metrics.operationErrors.set(key, (metrics.operationErrors.get(key) || 0) + 1);
}

/**
 * Record fallback from one runtime to another.
 */
function recordFallback(fromRuntime: string, toRuntime: string): void {
  const key = `${fromRuntime}->${toRuntime}`;
  metrics.fallbacks.set(key, (metrics.fallbacks.get(key) || 0) + 1);
}

/**
 * Get WASM metrics summary.
 */
export function getWasmMetrics(): Record<string, unknown> {
  const summary: Record<string, unknown> = {};
  
  // Initialization metrics
  for (const [engine, values] of metrics.initDuration) {
    if (values.length === 0) continue;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    summary[`${engine}_init_avg_ms`] = avg;
  }
  
  // Init failures
  for (const [engine, count] of metrics.initFailures) {
    summary[`${engine}_init_failures`] = count;
  }
  
  // Operation metrics
  for (const [key, values] of metrics.operationDuration) {
    if (values.length === 0) continue;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    summary[`${key}_avg_ms`] = avg;
  }
  
  // Operation errors
  for (const [key, count] of metrics.operationErrors) {
    summary[`${key}_errors`] = count;
  }
  
  // Fallbacks
  for (const [key, count] of metrics.fallbacks) {
    summary[`fallback_${key.replace('->', '_to_')}`] = count;
  }
  
  return summary;
}

/**
 * Reset WASM metrics.
 */
export function resetWasmMetrics(): void {
  metrics.initDuration.clear();
  metrics.initFailures.clear();
  metrics.operationDuration.clear();
  metrics.operationErrors.clear();
  metrics.fallbacks.clear();
}

// =============================================================================
// WASM Instrumentation
// =============================================================================

export interface WasmInstrumentationOptions {
  serviceContext: ServiceContext;
  logger?: Logger;
  engineName: string;
  engineVersion: string;
  formulaVersion?: string;
}

/**
 * Create WASM instrumentation.
 */
export function createWasmInstrumentation(
  options: WasmInstrumentationOptions
): {
  recordInitialization: (
    success: boolean,
    durationMs: number,
    runtime: 'wasm' | 'typescript'
  ) => void;
  recordCalculation: (
    operation: string,
    durationMs: number,
    success: boolean,
    runtime: 'wasm' | 'typescript',
    inputMetricCount?: number,
    error?: NormalizedError
  ) => void;
  recordFallback: (fromRuntime: 'wasm' | 'typescript', toRuntime: 'wasm' | 'typescript') => void;
  wrapEngine: <T extends object>(engine: T) => T;
  getMetrics: () => Record<string, unknown>;
} {
  const logger = options.logger || createServiceLogger(options.serviceContext.service);
  
  return {
    /**
     * Record engine initialization.
     */
    recordInitialization(
      success: boolean,
      durationMs: number,
      runtime: 'wasm' | 'typescript'
    ): void {
      recordInitDuration(runtime, durationMs);
      
      if (!success) {
        recordInitFailure(runtime);
      }
      
      // Log
      if (success) {
        logger.info(`WASM engine initialized`, {
          operation: 'wasm_init',
          engine: options.engineName,
          engineVersion: options.engineVersion,
          formulaVersion: options.formulaVersion,
          runtime,
          durationMs,
        });
      } else {
        logger.error(`WASM engine initialization failed`, undefined, {
          operation: 'wasm_init_failure',
          engine: options.engineName,
          engineVersion: options.engineVersion,
          runtime,
          durationMs,
        });
      }
    },
    
    /**
     * Record calculation.
     */
    recordCalculation(
      operation: string,
      durationMs: number,
      success: boolean,
      runtime: 'wasm' | 'typescript',
      inputMetricCount?: number,
      error?: NormalizedError
    ): void {
      recordOperationDuration(options.engineName, operation, durationMs);
      
      if (!success) {
        recordOperationError(options.engineName, operation);
      }
      
      // Log (never log input values)
      const logData: Record<string, unknown> = {
        operation: `wasm_${operation}`,
        engine: options.engineName,
        engineVersion: options.engineVersion,
        formulaVersion: options.formulaVersion,
        runtime,
        durationMs,
        success,
        ...(inputMetricCount !== undefined && { inputMetricCount }),
      };
      
      if (error) {
        logData.errorCode = error.code;
        logData.category = error.category;
        
        logger.error(`WASM ${operation} failed`, undefined, logData);
      } else if (durationMs > 100) {
        // Log slow operations
        logger.info(`WASM ${operation} completed`, logData);
      }
    },
    
    /**
     * Record runtime fallback.
     */
    recordFallback(
      fromRuntime: 'wasm' | 'typescript',
      toRuntime: 'wasm' | 'typescript'
    ): void {
      recordFallback(fromRuntime, toRuntime);
      
      logger.warn(`WASM fallback triggered`, {
        operation: 'wasm_fallback',
        engine: options.engineName,
        fromRuntime,
        toRuntime,
      });
    },
    
    /**
     * Wrap an engine with instrumentation.
     */
    wrapEngine<T extends object>(engine: T): T {
      const wrapped = new Proxy(engine, {
        get(target, prop, receiver) {
          const value = Reflect.get(target, prop, receiver);
          
          if (typeof value === 'function' && !prop.toString().startsWith('_')) {
            return async function (...args: unknown[]) {
              const startTime = Date.now();
              let runtime: 'wasm' | 'typescript' = 'wasm';
              
              try {
                const result = await value.apply(this, args);
                const durationMs = Date.now() - startTime;
                
                this.recordCalculation(
                  prop.toString(),
                  durationMs,
                  true,
                  runtime
                );
                
                return result;
              } catch (error) {
                const durationMs = Date.now() - startTime;
                
                // If WASM fails, try TypeScript fallback
                if (runtime === 'wasm') {
                  runtime = 'typescript';
                  
                  try {
                    // Fallback logic would be implemented here
                    // For now, just record the error
                    this.recordCalculation(
                      prop.toString(),
                      durationMs,
                      false,
                      runtime,
                      undefined,
                      createNormalizedError(error, ERROR_CODES.WASM_EXECUTION)
                    );
                  } catch (fallbackError) {
                    this.recordCalculation(
                      prop.toString(),
                      durationMs,
                      false,
                      runtime,
                      undefined,
                      createNormalizedError(fallbackError, ERROR_CODES.WASM_EXECUTION)
                    );
                  }
                } else {
                  this.recordCalculation(
                    prop.toString(),
                    durationMs,
                    false,
                    runtime,
                    undefined,
                    createNormalizedError(error, ERROR_CODES.WASM_EXECUTION)
                  );
                }
                
                throw error;
              }
            };
          }
          
          return value;
        },
      });
      
      return wrapped as T;
    },
    
    /**
     * Get metrics summary.
     */
    getMetrics(): Record<string, unknown> {
      return getWasmMetrics();
    },
  };
}

// =============================================================================
// Engine Status
// =============================================================================

export interface EngineStatus {
  name: string;
  version: string;
  initialized: boolean;
  runtime: 'wasm' | 'typescript' | 'unknown';
  fallbackCount: number;
  errorCount: number;
  lastError?: string;
  lastInitDurationMs?: number;
  lastOperationDurationMs?: number;
}

/**
 * Get current engine status.
 */
export function getEngineStatus(options: WasmInstrumentationOptions): EngineStatus {
  const key = `${options.engineName}:${options.engineVersion}`;
  
  return {
    name: options.engineName,
    version: options.engineVersion,
    initialized: true, // Would need to track this
    runtime: 'wasm', // Would need to track this
    fallbackCount: (metrics.fallbacks.get(`wasm->typescript`) || 0) + (metrics.fallbacks.get(`typescript->wasm`) || 0),
    errorCount: metrics.operationErrors.get(key) || 0,
  };
}
