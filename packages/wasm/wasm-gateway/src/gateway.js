/**
 * WASM Gateway - Core Implementation
 *
 * Unified gateway for WASM module loading and execution.
 * Provides stable TypeScript API for all AIVO engines.
 */
const engineRegistry = new Map();
function computeStats(values) {
    const sorted = [...values].sort((a, b) => a - b);
    return {
        count: sorted.length,
        sum: sorted.reduce((a, b) => a + b, 0),
        min: sorted[0] ?? 0,
        max: sorted[sorted.length - 1] ?? 0,
        values: sorted,
    };
}
function percentile(values, p) {
    if (values.length === 0)
        return 0;
    const index = Math.ceil((p / 100) * values.length) - 1;
    return values[Math.max(0, Math.min(index, values.length - 1))] ?? 0;
}
// =============================================================================
// WASM Support Detection
// =============================================================================
export function isWASMSupported() {
    return (typeof WebAssembly !== 'undefined' &&
        typeof WebAssembly.instantiate === 'function');
}
export function getAvailableEngines() {
    if (isWASMSupported()) {
        return ['wasm', 'typescript'];
    }
    return ['typescript'];
}
// =============================================================================
// Engine Registry Functions
// =============================================================================
export function registerEngine(name, adapter) {
    engineRegistry.set(name, adapter);
}
export function getRegisteredEngines() {
    return Array.from(engineRegistry.keys());
}
export function getEngineAdapter(name) {
    return engineRegistry.get(name);
}
// =============================================================================
// Default Adapters (TypeScript Implementations)
// =============================================================================
function initializeDefaultAdapters() {
    // Exercise Engine
    try {
        const { ExerciseEngineTS } = require('@aivo/exercise-engine');
        if (ExerciseEngineTS) {
            registerEngine('exercise', {
                name: 'exercise-engine',
                version: '1.0.0',
                process: (input) => {
                    const engine = new ExerciseEngineTS();
                    return engine.process(input);
                },
                reset: (exerciseCode) => {
                    const engine = new ExerciseEngineTS();
                    engine.reset(exerciseCode);
                },
            });
        }
    }
    catch {
        // Exercise engine not available
    }
    // Health Engine
    try {
        const healthEngine = require('@aivo/health-engine');
        if (healthEngine?.calculateHealthMetrics) {
            registerEngine('health', {
                name: 'health-engine',
                version: '1.0.0',
                process: (input) => healthEngine.calculateHealthMetrics(input),
            });
        }
    }
    catch {
        // Health engine not available
    }
    // Nutrition Engine
    try {
        const nutritionEngine = require('@aivo/nutrition-engine');
        if (nutritionEngine?.aggregateNutrition) {
            registerEngine('nutrition', {
                name: 'nutrition-engine',
                version: '1.0.0',
                process: (input) => nutritionEngine.aggregateNutrition(input),
            });
        }
    }
    catch {
        // Nutrition engine not available
    }
    // Analytics Engine
    try {
        const analyticsEngine = require('@aivo/analytics-engine');
        if (analyticsEngine?.calculateSMA) {
            registerEngine('analytics', {
                name: 'analytics-engine',
                version: '1.0.0',
                process: (input) => analyticsEngine.calculateSMA(input.values, input.window ?? 5),
            });
        }
    }
    catch {
        // Analytics engine not available
    }
}
export class WASMGateway {
    config;
    engineName;
    adapter = null;
    initialized = false;
    callTimes = [];
    metrics = {
        opsPerSecond: 0,
        avgExecutionTime: 0,
        p50Latency: 0,
        p95Latency: 0,
        p99Latency: 0,
    };
    stateListeners = new Set();
    errorCounts = { total: 0, wasm: 0, typescript: 0 };
    constructor(options = {}, engineName = 'exercise') {
        this.engineName = engineName;
        this.config = {
            engineName: engineName,
            engineType: options.engineType ?? 'typescript',
            strategy: options.strategy ?? 'prefer-wasm',
            cache: options.cache ?? { enabled: true, maxInstances: 2, ttl: 60000 },
        };
    }
    async init() {
        if (this.initialized)
            return;
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
    process(input) {
        if (!this.initialized) {
            throw new Error('Gateway not initialized. Call init() first.');
        }
        const startTime = performance.now();
        let data;
        let engineType = 'typescript';
        const warnings = [];
        if (this.adapter) {
            try {
                data = this.adapter.process(input);
                engineType = this.config.engineType;
            }
            catch (err) {
                warnings.push(`Engine error: ${err instanceof Error ? err.message : String(err)}`);
                this.errorCounts.total++;
                data = null;
            }
        }
        else {
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
    async runBenchmark(iterations = 1000) {
        const startTime = performance.now();
        const benchmarkData = { values: Array(33).fill(0.5), window: 5 };
        // Warm-up
        for (let i = 0; i < 10; i++) {
            this.process(benchmarkData);
        }
        // Benchmark
        const tsTimes = [];
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
    updateMetrics() {
        if (this.callTimes.length === 0)
            return;
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
    getState() {
        return {
            engineType: this.config.engineType,
            initialized: this.initialized,
            benchmarkComplete: this.callTimes.length > 0,
            metrics: this.metrics,
            errors: this.errorCounts,
        };
    }
    getMetrics() {
        return { ...this.metrics };
    }
    reset(exerciseCode) {
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
    addStateListener(listener) {
        this.stateListeners.add(listener);
    }
    removeStateListener(listener) {
        this.stateListeners.delete(listener);
    }
    dispose() {
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
export function createWasmGateway(options, engineName) {
    return new WASMGateway(options, engineName);
}
/**
 * Get engine version info
 */
export function getEngineVersions() {
    const versions = {};
    for (const [name, adapter] of engineRegistry) {
        versions[name] = adapter.version;
    }
    return versions;
}
/**
 * Check if WASM is available and get capabilities
 */
export function getWasmCapabilities() {
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
