# WebAssembly Packages

This directory contains WebAssembly runtime and gateway packages.

## Packages

### `@aivo/wasm-core`

Core WASM utilities and bindings.

**Features:**
- WASM module validation
- Memory management helpers
- Geometry utilities (for pose detection)
- Math utilities
- Statistics utilities

### `@aivo/wasm-gateway`

WASM module loader and execution gateway.

**Features:**
- Automatic WASM/TypeScript fallback
- Module caching
- Performance benchmarking
- Engine selection based on benchmarks
- Cloudflare Workers integration

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      Application                          │
│  - Services call gateway.process()                       │
│  - Automatic engine selection                           │
└──────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│                     WASM Gateway                         │
│  - Lazy module initialization                           │
│  - Benchmark-driven engine selection                     │
│  - Request-level caching                                 │
└──────────────────────────────────────────────────────────┘
            │                           │
            ▼                           ▼
┌──────────────────────┐   ┌──────────────────────────┐
│    TypeScript        │   │       WASM Module        │
│    (Fallback)        │   │   (Performance Path)     │
└──────────────────────┘   └──────────────────────────┘
                                    │
                                    ▼
                          ┌──────────────────────┐
                          │      WASM Core       │
                          │  (Rust/Compiled)     │
                          └──────────────────────┘
```

## Usage

```typescript
import { WASMGateway } from "@aivo/wasm-gateway";

const gateway = new WASMGateway({
  engineType: "auto",  // or "wasm" or "typescript"
  strategy: "prefer-wasm",
  benchmark: {
    autoBenchmark: true,
    iterations: 1000,
    threshold: 10,  // ms - prefer WASM if >10ms faster
  },
});

await gateway.init();

const result = gateway.process({
  landmarks: poseLandmarks,
  exerciseCode: "squat",
  currentPhase: "ready",
});

// Check metrics
const metrics = gateway.getMetrics();
console.log(`Engine: ${metrics.engine}`);
console.log(`Ops/sec: ${metrics.opsPerSecond}`);
```

## Cloudflare Workers Deployment

The `wasm-gateway` package includes a Worker entry point for deployment:

```typescript
// wrangler.jsonc
{
  "name": "aivo-wasm-gateway",
  "main": "@aivo/wasm-gateway/worker",
  "bindings": {
    "WASM_CACHE_KV": "wasm-cache"
  }
}
```
