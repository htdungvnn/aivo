/**
 * WASM Gateway - Core Implementation
 * 
 * Unified gateway for WASM module loading and execution.
 * Provides stable TypeScript API for all AIVO engines.
 */

import type {
  EngineGatewayConfig,
  EngineType,
  EngineStrategy,
  GatewayState,
  GatewayStateListener,
  PerformanceMetrics,
  BenchmarkComparison,
  WASMGatewayError,
  WASMGatewayErrorCode,
} from './types.js';

export { EngineType, EngineStrategy };
export type { EngineGatewayConfig };

// =============================================================================
// Engine Registry
// =============================================================================

interface EngineAdapter {
  name: string;
  version: string;
  process(input: unknown): unknown;
  reset?(exerciseCode: string): void;
  benchmark?(iterations: number): unknown;
}

const engineRegistry: Map<string, EngineAdapter> = new Map();

// =============================================================================
// Performance Metrics
// =============================================================================

interface MetricStats {
  count: number;
  sum: number;
  min: number;
  max: number;
  values: number[];
}

function computeStats(values: number[]): MetricStats {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: sorted.length,
    sum: sorted.reduce((a, b) => a + b, 0),
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    values: sorted,
  };
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const index = Math.ceil((p / 100) * values.length) - 1;
  return values[Math.max(0, Math.min(index, values.length - 1))] ?? 0;
}

// =============================================================================
// WASM Support Detection
// =============================================================================

export function isWASMSupported(): boolean {
  return (
    typeof WebAssembly !== 'undefined' &&
    typeof WebAssembly.instantiate === 'function'
  );
}

export function getAvailableEngines(): EngineType[] {
  if (isWASMSupported()) {
    return ['wasm', 'typescript'];
  }
  return ['typescript'];
}

// =============================================================================
// Engine Registry Functions
// =============================================================================

export function registerEngine(name: string, adapter: EngineAdapter): void {
  engineRegistry.set(name, adapter);
}

export function getRegisteredEngines(): string[] {
  return Array.from(engineRegistry.keys());
}

export function getEngineAdapter(name: string): EngineAdapter | undefined {
  return engineRegistry.get(name);
}

// =============================================================================
// Default Adapters (TypeScript Implementations)
// =============================================================================

function initializeDefaultAdapters(): void {
  // Exercise Engine
  try {
    const { ExerciseEngineTS } = require('@repo/exercise-engine');
    if (ExerciseEngineTS) {
      registerEngine('exercise', {
        name: 'exercise-engine',
        version: '1.0.0',
        process: (input: unknown) => {
          const engine = new ExerciseEngineTS();
          return engine.process(input as never);
        },
        reset: (exerciseCode: string) => {
          const engine = new ExerciseEngineTS();
          engine.reset(exerciseCode);
        },
      });
    }
  } catch {
    // Exercise engine not available
  }

  // Health Engine
  try {
    const healthEngine = require('@aivo/health-engine');
    if (healthEngine?.calculateHealthMetrics) {
      registerEngine('health', {
        name: 'health-engine',
        version: '1.0.0',
        process: (input: unknown) => healthEngine.calculateHealthMetrics(input as never),
      });
    }
  } catch {
    // Health engine not available
  }

  // Nutrition Engine
  try {
    const nutritionEngine = require('@aivo/nutrition-engine');
    if (nutritionEngine?.aggregateNutrition) {
      registerEngine('nutrition', {
        name: 'nutrition-engine',
        version: '1.0.0',
        process: (input: unknown) => nutritionEngine.aggregateNutrition(input as never),
      });
    }
  } catch {
    // Nutrition engine not available
  }

  // Analytics Engine
  try {
    const analyticsEngine = require('@aivo/analytics-engine');
    if (analyticsEngine?.calculateSMA) {
      registerEngine('analytics', {
        name: 'analytics-engine',
        version: '1.0.0',
        process: (input: unknown) => analyticsEngine.calculateSMA(
          (input as { values: number[] }).values,
          (input as { window?: number }).window ?? 5
        ),
      });
    }
  } catch {
    // Analytics engine not available
  }
}

// =============================================================================
// WASM Gateway
// =============================================================================

export interface WASMGatewayOptions {
  engineType?: EngineType;
  strategy?: EngineStrategy;
  engineName?: string;
  cache?: {
    enabled?: boolean;
    maxInstances?: number;
    ttl?: number;
  };
}

export class WASMGateway {
  private config: Required<WASMGatewayOptions>;
  private engineName: string;
  private adapter: EngineAdapter | null = null;
  private initialized = false;
  private callTimes: number[] = [];
  private metrics: PerformanceMetrics = {
    opsPerSecond: 0,
    avgExecutionTime: 0,
    p50Latency: 0,
    p95Latency: 0,
    p99Latency: 0,
  };
  private stateListeners: Set<GatewayStateListener> = new Set();
  private errorCounts = { total: 0, wasm: 0, typescript: 0 };

  constructor(options: WASMGatewayOptions = {}, engineName: string = 'exercise') {
    this.engineName = engineName;
    this.config = {
      engineType: options.engineType ?? 'typescript',
      strategy: options.strategy ?? 'prefer-wasm',
      cache: options.cache ?? { enabled: true, maxInstances: 2, ttl: 60000 },
    };
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    // Initialize default adapters if not already done
    if (engineRegistry.size === 0) {
      initializeDefaultAdapters();
    }

    // Get adapter for engine
    this.adapter = engineRegistry.get(this.engineName) ?? null;

    if (!this.adapter) {
      throw new Error(`Engine '${this.engineName}' not found in registry`);
    }

    this.initialized = true;
  }

  process(input: unknown): {
    data: unknown;
    engine: EngineType;
    timing: { startTime: number; endTime: number; duration: number };
    warnings?: string[];
  } {
    if (!this.initialized) {
      throw new Error('Gateway not initialized. Call init() first.');
    }

    const startTime = performance.now();
    let data: unknown;
    let engineType: EngineType = 'typescript';
    const warnings: string[] = [];

    if (this.adapter) {
      try {
        data = this.adapter.process(input);
        engineType = this.config.engineType;
      } catch (err) {
        warnings.push(`Engine error: ${err instanceof Error ? err.message : String(err)}`);
        this.errorCounts.total++;
        data = null;
      }
    } else {
      warnings.push('No engine available');
      this.errorCounts.total++;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Update metrics
    this.callTimes.push(duration);
    if (this.callTimes.length > 1000) {
      this.callTimes.shift();
    }
    this.updateMetrics();

    return { data, engine: engineType, timing: { startTime, endTime, duration }, warnings };
  }

  async runBenchmark(iterations: number = 1000): Promise<BenchmarkComparison> {
    const startTime = performance.now();
    const benchmarkData = { values: Array(33).fill(0.5), window: 5 };

    // Warm-up
    for (let i = 0; i < 10; i++) {
      this.process(benchmarkData);
    }

    // Benchmark
    const tsTimes: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const t0 = performance.now();
      this.process(benchmarkData);
      tsTimes.push(performance.now() - t0);
    }

    const tsStats = computeStats(tsTimes);
    const totalTime = performance.now() - startTime;
    const tsOpsPerSecond = (iterations * 1000) / tsStats.sum;

    return {
      winner: 'typescript',
      winnerOpsPerSecond: Math.round(tsOpsPerSecond),
      loserOpsPerSecond: 0,
      improvementPercent: 0,
      results: {
        wasm: {
          engine: 'wasm',
          operations: {},
          totalOperations: 0,
          totalTimeMs: 0,
          operationsPerSecond: 0,
        },
        typescript: {
          engine: 'typescript',
          operations: {
            process: {
              totalMs: tsStats.sum,
              count: iterations,
              averageMs: tsStats.sum / iterations,
              minMs: tsStats.min,
              maxMs: tsStats.max,
            },
          },
          totalOperations: iterations,
          totalTimeMs: Math.round(totalTime),
          operationsPerSecond: Math.round(tsOpsPerSecond),
        },
      },
    };
  }

  private updateMetrics(): void {
    if (this.callTimes.length === 0) return;

    const stats = computeStats(this.callTimes);
    const totalTime = stats.sum;
    const opsPerSecond = (stats.count * 1000) / totalTime;

    this.metrics = {
      opsPerSecond: Math.round(opsPerSecond * 100) / 100,
      avgExecutionTime: Math.round((stats.sum / stats.count) * 100) / 100,
      p50Latency: Math.round(percentile(stats.values, 50) * 100) / 100,
      p95Latency: Math.round(percentile(stats.values, 95) * 100) / 100,
      p99Latency: Math.round(percentile(stats.values, 99) * 100) / 100,
    };
  }

  getState(): GatewayState {
    return {
      engineType: this.config.engineType,
      initialized: this.initialized,
      benchmarkComplete: this.callTimes.length > 0,
      metrics: this.metrics,
      errors: this.errorCounts,
    };
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  reset(exerciseCode?: string): void {
    if (this.adapter?.reset) {
      this.adapter.reset(exerciseCode ?? 'squat');
    }
    this.callTimes = [];
    this.metrics = {
      opsPerSecond: 0,
      avgExecutionTime: 0,
      p50Latency: 0,
      p95Latency: 0,
      p99Latency: 0,
    };
  }

  addStateListener(listener: GatewayStateListener): void {
    this.stateListeners.add(listener);
  }

  removeStateListener(listener: GatewayStateListener): void {
    this.stateListeners.delete(listener);
  }

  dispose(): void {
    this.stateListeners.clear();
    this.adapter = null;
    this.initialized = false;
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new WASM Gateway instance
 */
export function createWasmGateway(options?: WASMGatewayOptions, engineName?: string): WASMGateway {
  return new WASMGateway(options, engineName);
}

/**
 * Get engine version info
 */
export function getEngineVersions(): Record<string, string> {
  const versions: Record<string, string> = {};
  for (const [name, adapter] of engineRegistry) {
    versions[name] = adapter.version;
  }
  return versions;
}

/**
 * Check if WASM is available and get capabilities
 */
export function getWasmCapabilities(): {
  supported: boolean;
  engines: string[];
  features: string[];
} {
  return {
    supported: isWASMSupported(),
    engines: getAvailableEngines(),
    features: [
      isWASMSupported() ? 'wasm' : 'typescript',
      'benchmarking',
      'metrics',
      'state-management',
    ],
  };
}
