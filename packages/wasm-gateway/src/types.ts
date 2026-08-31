/**
 * WASM Gateway Types
 * Type definitions for WASM module loading and execution
 */

import type { 
  WASMEngineConfig, 
  WASMInput, 
  WASMOutput, 
  EngineState,
  BenchmarkResult,
  TypeScriptEngine 
} from '@repo/fitness-types';

// =============================================================================
// WASM Module Types
// =============================================================================

/**
 * Compiled WASM module instance
 */
export interface WASMModuleInstance {
  /** Module identifier */
  readonly id: string;
  
  /** Module version */
  readonly version: string;
  
  /** Initialize with configuration */
  init(configJson: string): boolean;
  
  /** Process input and return output as JSON string */
  process(inputJson: string): string;
  
  /** Get current engine state as JSON string */
  getState(): string;
  
  /** Reset engine for new exercise */
  reset(exerciseCode: string): void;
  
  /** Start calibration phase */
  startCalibration(): void;
  
  /** Check if calibration is complete */
  isCalibrated(): boolean;
  
  /** Run performance benchmark */
  benchmark(iterations: number): string;
  
  /** Get module version string */
  version(): string;
  
  /** Clean up resources */
  dispose(): void;
}

/**
 * Raw WASM binary module
 */
export interface WASMBinary {
  /** Module name/identifier */
  name: string;
  
  /** Version string */
  version: string;
  
  /** WASM binary data */
  binary: ArrayBuffer;
  
  /** Optional memory exports */
  memory?: WebAssembly.Memory;
  
  /** Optional custom sections */
  customSections?: Map<string, ArrayBuffer>;
}

// =============================================================================
// WASM Loader Types
// =============================================================================

/**
 * Options for WASM module loading
 */
export interface WASMLoadOptions {
  /** Module URL (for streaming instantiation) */
  url?: string;
  
  /** WASM binary data (inline) */
  binary?: ArrayBuffer;
  
  /** Import object for WASM module */
  imports?: WebAssembly.Imports;
  
  /** Enable streaming instantiation */
  streaming?: boolean;
  
  /** Request credentials (for CORS) */
  credentials?: RequestCredentials;
  
  /** Request cache mode */
  cacheMode?: RequestCache;
}

/**
 * WASM loader configuration
 */
export interface WASMLoaderConfig {
  /** Base URL for WASM modules */
  baseUrl: string;
  
  /** Module manifest (URLs and versions) */
  manifest: WASMModuleManifest;
  
  /** Default timeout for module loading (ms) */
  loadTimeout: number;
  
  /** Enable module caching */
  enableCache: boolean;
  
  /** Fallback to TypeScript engine on failure */
  fallbackToTypeScript: boolean;
}

/**
 * Module manifest entry
 */
export interface WASMModuleManifestEntry {
  /** Module name */
  name: string;
  
  /** Module version */
  version: string;
  
  /** URL to WASM binary */
  url: string;
  
  /** Expected hash (SHA-256) */
  hash?: string;
  
  /** Dependencies */
  dependencies?: string[];
  
  /** Fallback type */
  fallback: 'typescript' | 'null';
}

/**
 * Module manifest
 */
export interface WASMModuleManifest {
  /** Module entries by name */
  modules: Record<string, WASMModuleManifestEntry>;
  
  /** Default module */
  default: string;
  
  /** Metadata */
  meta?: {
    buildDate: string;
    buildCommit: string;
    targetTriple: string;
  };
}

// =============================================================================
// Engine Gateway Types
// =============================================================================

/**
 * Engine type selection
 */
export type EngineType = 'wasm' | 'typescript' | 'auto';

/**
 * Engine selection strategy
 */
export type EngineStrategy = 
  /** Always use WASM if available */
  | 'prefer-wasm'
  /** Always use TypeScript */
  | 'prefer-ts'
  /** Use WASM for heavy workloads, TS for light */
  | 'adaptive'
  /** Benchmark and pick fastest */
  | 'benchmark';

/**
 * Engine gateway configuration
 */
export interface EngineGatewayConfig {
  /** Which engine type to use */
  engineType: EngineType;
  
  /** Engine selection strategy */
  strategy: EngineStrategy;
  
  /** WASM module options */
  wasmOptions: WASMLoadOptions;
  
  /** TypeScript engine options */
  tsOptions?: {
    /** Custom TypeScript engine class */
    engineClass?: new (config?: Partial<WASMEngineConfig>) => TypeScriptEngine;
  };
  
  /** Benchmark configuration */
  benchmark?: {
    /** Run benchmark on initialization */
    autoBenchmark: boolean;
    
    /** Number of iterations */
    iterations: number;
    
    /** Switch engine if faster by this percentage */
    threshold: number;
  };
  
  /** Cache configuration */
  cache?: {
    /** Enable engine instance caching */
    enabled: boolean;
    
    /** Max cached instances */
    maxInstances: number;
    
    /** TTL for cached instances (ms) */
    ttl: number;
  };
}

// =============================================================================
// Execution Types
// =============================================================================

/**
 * Execution context for WASM calls
 */
export interface ExecutionContext {
  /** Execution start time */
  startTime: number;
  
  /** Execution metadata */
  metadata: {
    engine: EngineType;
    moduleId?: string;
    callCount: number;
  };
  
  /** Cancellation signal */
  signal: AbortSignal;
}

/**
 * Execution result
 */
export interface ExecutionResult<T = unknown> {
  /** Result data */
  data: T;
  
  /** Execution timing */
  timing: {
    startTime: number;
    endTime: number;
    duration: number;
  };
  
  /** Engine info */
  engine: {
    type: EngineType;
    version: string;
  };
  
  /** Any warnings */
  warnings?: string[];
}

/**
 * Error during WASM execution
 */
export class WASMGatewayError extends Error {
  constructor(
    message: string,
    public readonly code: WASMGatewayErrorCode,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'WASMGatewayError';
  }
}

export type WASMGatewayErrorCode =
  | 'MODULE_NOT_FOUND'
  | 'MODULE_LOAD_FAILED'
  | 'INSTANTIATION_FAILED'
  | 'EXECUTION_FAILED'
  | 'VALIDATION_FAILED'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'ENGINE_UNAVAILABLE';

// =============================================================================
// Performance Types
// =============================================================================

/**
 * Performance metrics for WASM execution
 */
export interface PerformanceMetrics {
  /** Operations per second */
  opsPerSecond: number;
  
  /** Average execution time (ms) */
  avgExecutionTime: number;
  
  /** P50 latency */
  p50Latency: number;
  
  /** P95 latency */
  p95Latency: number;
  
  /** P99 latency */
  p99Latency: number;
  
  /** Memory usage (bytes) */
  memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
  };
}

/**
 * Benchmark result comparison
 */
export interface BenchmarkComparison {
  /** Winner */
  winner: EngineType;
  
  /** Winner ops/s */
  winnerOpsPerSecond: number;
  
  /** Loser ops/s */
  loserOpsPerSecond: number;
  
  /** Speed improvement percentage */
  improvementPercent: number;
  
  /** Raw benchmark results */
  results: {
    wasm: BenchmarkResult;
    typescript: BenchmarkResult;
  };
}

// =============================================================================
// State Management
// =============================================================================

/**
 * Gateway state
 */
export interface GatewayState {
  /** Current engine type */
  engineType: EngineType;
  
  /** Current module ID */
  moduleId?: string;
  
  /** Is initialized */
  initialized: boolean;
  
  /** Is benchmark complete */
  benchmarkComplete: boolean;
  
  /** Last benchmark results */
  lastBenchmark?: BenchmarkComparison;
  
  /** Performance metrics */
  metrics: PerformanceMetrics;
  
  /** Error count */
  errors: {
    total: number;
    wasm: number;
    typescript: number;
  };
}

/**
 * Gateway state listener
 */
export type GatewayStateListener = (state: GatewayState) => void;

// =============================================================================
// Module Exports
// =============================================================================

export const wasmGatewayTypes = {
  // Types
  WASMModuleInstance,
  WASMBinary,
  WASMLoadOptions,
  WASMLoaderConfig,
  WASMModuleManifest,
  EngineGatewayConfig,
  ExecutionContext,
  PerformanceMetrics,
  BenchmarkComparison,
  GatewayState,
  
  // Error
  WASMGatewayError,
  WASMGatewayErrorCode,
} as const;

export type WasmGatewayTypes = typeof wasmGatewayTypes;
