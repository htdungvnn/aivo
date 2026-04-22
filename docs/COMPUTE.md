# Compute Engine (WASM)

AIVO's Rust-based WebAssembly compute engine provides high-performance fitness calculations with near-native speed.

## Overview

The compute engine (`packages/aivo-compute`) is written in Rust and compiled to WebAssembly. It handles mathematically intensive operations that would be slow in JavaScript.

## Modules

### AdaptivePlanner

Calculates deviation scores and determines when routines need rescheduling.

```rust
pub struct AdaptivePlanner;
```

#### calculateDeviationScore

Analyzes planned vs completed workouts to quantify adherence.

```rust
pub fn calculateDeviation_score(
    completion_json: &str,      // JSON array of workout completions
    planned_exercises_json: &str // JSON array of routine exercises
) -> Result<DeviationScore, JsError>
```

**DeviationScore:**
```rust
pub struct DeviationScore {
    pub overall_score: f64,       // 0-100 (higher = more deviation)
    pub trend: String,            // "improving", "declining", "stable"
    pub completion_rate: f64,     // 0-1 fraction of planned workouts done
    pub missed_workouts: u32,
    pub average_rpe: f64,         // Avg perceived exertion
    pub exercises_missed: u32,
    pub substitutions: u32,
}
```

#### analyzeRecoveryCurve

Analyzes body insights to determine muscle recovery status.

```rust
pub fn analyze_recovery_curve(
    insights_json: &str,        // JSON array of body insights
    muscle_groups_json: &str   // JSON array of muscle groups used
) -> Result<RecoveryCurve, JsError>
```

**RecoveryCurve:**
```rust
pub struct RecoveryCurve {
    pub overall_recovery_score: f64,   // 0-100
    pub recommended_rest_days: u32,
    pub can_train_intensity: String,   // "high", "moderate", "low"
    pub muscle_profiles: Vec<MuscleProfile>,
    pub risk_of_overtraining: bool,
}
```

**MuscleProfile:**
```rust
pub struct MuscleProfile {
    pub muscle: String,
    pub average_soreness: f64,        // 1-10 scale
    pub soreness_trend: String,       // "increasing", "decreasing", "stable"
    pub recovery_rate_days: f64,      // Days to recover
}
```

#### shouldReschedule

Determines if a routine adjustment is needed.

```rust
pub fn should_reschedule(
    deviation_json: &str,
    recovery_json: &str
) -> Result<bool, JsError>
```

Returns `true` if:
- Deviation score > 60, OR
- Recovery score < 40, OR
- Trend shows significant decline

---

### CorrelationAnalyzer

Finds correlations between exercises and soreness/recovery.

```rust
pub struct CorrelationAnalyzer;
```

```rust
pub fn analyze_correlations(
    workouts_json: &str,
    insights_json: &str
) -> Result<Vec<ExerciseCorrelation>, JsError>
```

**ExerciseCorrelation:**
```rust
pub struct ExerciseCorrelation {
    pub exercise_name: String,
    pub soreness_correlation: f64,    // -1 to 1
    pub recovery_impact: f64,         // Negative = worse recovery
    pub recommendation: String,       // "reduce_volume", "alternate", "keep"
    pub confidence: f64,              // 0-1 statistical confidence
}
```

---

### TokenOptimizer

Optimizes conversation token usage for AI prompts.

```rust
pub struct TokenOptimizer;
```

```rust
pub fn optimize_content(
    content_json: &str,
    target_tokens: &str
) -> Result<OptimizationResult, JsError>
```

**OptimizationResult:**
```rust
pub struct OptimizationResult {
    pub original_tokens: u32,
    pub optimized_content: String,
    pub optimized_tokens: u32,
    pub compression_ratio: f64,
    pub strategy_used: String,  // "summarize", "trim", "preserve"
}
```

Strategies:
- **preserve**: No changes (if already under limit)
- **trim**: Remove oldest messages first
- **summarize**: Replace early messages with summary

---

### ImageProcessor

Optimizes progress photos for AI analysis.

```rust
pub struct ImageProcessor;
```

```rust
pub fn optimize_for_ai(
    image_data: &[u8],
    target_size_kb: u32
) -> Result<Vec<u8>, JsError>
```

Resizes and compresses images while preserving key features for body analysis.

---

## Installation

The WASM module is automatically built as part of the monorepo:

```bash
cd packages/aivo-compute
pnpm run build
```

Outputs:
- `pkg/aivo_compute.js` - JavaScript bindings
- `pkg/aivo_compute_bg.wasm` - WebAssembly binary
- `pkg/aivo_compute.d.ts` - TypeScript definitions

---

## Usage in TypeScript

```typescript
import { AdaptivePlanner } from "@aivo/compute";

// Calculate deviation score
const deviationJson = AdaptivePlanner.calculateDeviationScore(
  JSON.stringify(workoutCompletions),
  JSON.stringify(plannedExercises)
);
const deviation = JSON.parse(deviationJson);

console.log(`Deviation score: ${deviation.overall_score}/100`);
console.log(`Trend: ${deviation.trend}`);

// Analyze recovery
const recoveryJson = AdaptivePlanner.analyzeRecoveryCurve(
  JSON.stringify(insights),
  JSON.stringify(["quadriceps", "hamstrings", "calves"])
);
const recovery = JSON.parse(recoveryJson);

if (recovery.risk_of_overtraining) {
  console.log("Warning: Overtraining risk detected");
}
```

---

## Error Handling

All functions return `Result<T, JsError>` which translates to:

```typescript
try {
  const result = AdaptivePlanner.calculateDeviationScore(...);
  const data = JSON.parse(result);
} catch (error) {
  console.error("WASM error:", error);
}
```

Common error cases:
- Invalid JSON input
- Missing required fields
- Division by zero (empty arrays)
- Out-of-range values

---

## Performance

| Operation | Time (Rust/WASM) | Time (JS) |
|-----------|-----------------|-----------|
| Deviation calculation (50 workouts) | ~2ms | ~15ms |
| Recovery analysis (30 days) | ~5ms | ~40ms |
| Correlation analysis | ~10ms | ~80ms |

Benchmarked on M2 MacBook Pro.

---

## Testing

```bash
cd packages/aivo-compute
pnpm test          # Unit tests
pnpm run bench     # Benchmarks
```

---

## Development

### Rust Toolchain

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
```

### Build Command

```bash
pnpm run build
```

Which runs:
```bash
wasm-pack build --target bundler --out-dir pkg
```

### Debugging

Use `console_error_panic_hook` for better panic messages:

```rust
console_error_panic_hook::set_once();
```

---

## Deployment

The WASM module is bundled with the Cloudflare Workers API:

1. Build outputs are in `pkg/`
2. `apps/api` copies them during build
3. Worker loads them via `import`
4. Served as static assets from Worker

---

## Limitations

- **No filesystem access** (Worker sandbox)
- **No threads** (single-threaded only)
- **Memory limit** 128MB (Worker limit)
- **Warm start** ~50ms on first invocation

---

## Future Enhancements

- [ ] SIMD optimizations
- [ ] Multi-threading via Workers
- [ ] Streaming calculations
- [ ] Cache compiled results
- [ ] GPU compute via WebGPU

---

**Last Updated:** 2025-04-20  
**Version:** 1.0.0  
**Rust:** 1.70+  
**wasm-pack:** 0.12+
