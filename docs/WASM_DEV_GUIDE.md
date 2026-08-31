# WASM Engine Development Guide

This guide covers how to develop, build, and test WASM engines for the AIVO platform.

## Prerequisites

- Rust 1.75+
- wasm-pack
- Node.js 20+
- pnpm 9+

## Project Structure

```
packages/
  wasm-core/           # Shared utilities
  wasm-gateway/        # TypeScript adapter
  exercise-engine/      # Exercise analysis
  readiness-engine/     # Readiness scoring
  health-engine/        # Health metrics
  nutrition-engine/     # Nutrition calculations
  analytics-engine/      # Time-series analytics
```

## Building Engines

### Build All WASM Modules

```bash
pnpm wasm:build
```

### Build Individual Engine

```bash
cd packages/wasm-core
wasm-pack build --target bundler --out-dir dist
```

### Build for Different Targets

```bash
# Browser (bundler)
wasm-pack build --target bundler --out-dir dist

# Node.js
wasm-pack build --target nodejs --out-dir dist-node

# Web (no bundler)
wasm-pack build --target web --out-dir dist-web
```

## Running Tests

### Rust Tests

```bash
cargo test
```

### WASM Tests

```bash
wasm-pack test --node
# or
wasm-pack test --firefox
wasm-pack test --chrome
wasm-pack test --safari
```

### TypeScript Tests

```bash
pnpm test
```

## Development Workflow

### 1. Create or Modify Engine

```rust
// packages/wasm-core/src/lib.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn calculate(input_json: &str) -> String {
    // Process input
    serde_json::to_string(&output).unwrap()
}
```

### 2. Add TypeScript Adapter

```typescript
// packages/engine/src/index.ts
export function calculate(input: InputType): OutputType {
    // TypeScript implementation
}
```

### 3. Register in wasm-gateway

```typescript
// packages/wasm-gateway/src/gateway.ts
registerEngine('my-engine', {
    name: 'my-engine',
    version: '1.0.0',
    process: (input) => myEngine.process(input),
});
```

## Feature Flags

Enable engines via environment variables:

```bash
# .env
WASM_EXERCISE_ENABLED=true
WASM_READINESS_ENABLED=true
WASM_HEALTH_ENABLED=false
WASM_NUTRITION_ENABLED=false
WASM_ANALYTICS_ENABLED=false
```

## Binary Size Optimization

### Release Profile

```toml
[profile.release]
opt-level = "s"      # Optimize for size
lto = true           # Link-time optimization
panic = "abort"      # Smaller panic handlers
codegen-units = 1    # Better optimization
```

### wasm-opt

```bash
wasm-opt -Oz -o output.wasm input.wasm
```

## Benchmarking

### Run Benchmarks

```bash
pnpm wasm:benchmark
```

### Compare Engines

```typescript
const gateway = createWasmGateway({ engineType: 'auto', strategy: 'benchmark' });
await gateway.init();
const comparison = await gateway.runBenchmark(1000);
console.log(`Winner: ${comparison.winner}`);
console.log(`Improvement: ${comparison.improvementPercent}%`);
```

## Troubleshooting

### "wasm-pack not found"

```bash
cargo install wasm-pack
```

### "Failed to compile WASM"

```bash
rustup target add wasm32-unknown-unknown
```

### "Memory allocation failed"

- Reduce binary size
- Check for memory leaks in Rust code
- Use `--release` flag

## Release Process

1. Update version in `Cargo.toml`
2. Run `cargo test`
3. Build WASM: `wasm-pack build`
4. Run integration tests
5. Update `engineVersions` in gateway
6. Create PR with changes

## Supported Runtimes

| Runtime | Status | Notes |
|---------|--------|-------|
| Browser | ✅ Full | All engines |
| Node.js | ✅ Full | All engines |
| Cloudflare Workers | ✅ Full | All engines |
| React Native (Expo) | ⚠️ Limited | TypeScript fallback |
| Safari iOS | ⚠️ Limited | May need polyfills |

## Performance Guidelines

| Engine | Target Latency | Binary Size |
|--------|---------------|-------------|
| wasm-core | N/A | ~50KB |
| exercise-engine | < 5ms | ~150KB |
| readiness-engine | < 1ms | ~80KB |
| health-engine | < 1ms | ~30KB |
| nutrition-engine | < 1ms | ~40KB |
| analytics-engine | < 10ms | ~60KB |
