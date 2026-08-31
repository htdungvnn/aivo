# Engine Packages

This directory contains WASM/Rust computation engines for performance-critical operations.

## Design Principles

1. **Platform Neutral** - No dependencies on Node.js, browsers, or Cloudflare bindings
2. **Pure Functions** - No side effects, all configuration via function parameters
3. **Testable** - Can be tested in isolation
4. **High Performance** - Use Rust for compute-intensive operations

## Packages

### `@aivo/exercise-engine`
Pose detection and exercise analysis using computer vision.

### `@aivo/health-engine`
Health metric calculations and aggregations.

### `@aivo/nutrition-engine`
Nutrition calculations (macros, calories, etc.).

### `@aivo/readiness-engine`
Readiness scoring algorithm.

### `@aivo/analytics-engine`
Analytics processing and time-series aggregations.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                      │
│  (Services, Next.js, React Native)                      │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    WASM Gateway                          │
│  (@aivo/wasm-gateway)                                   │
│  - Module loading                                       │
│  - Caching                                             │
│  - Benchmarking                                         │
│  - Fallback to TypeScript                              │
└─────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │   Exercise   │ │   Health     │ │  Nutrition   │
    │   Engine     │ │   Engine     │ │   Engine     │
    └──────────────┘ └──────────────┘ └──────────────┘
            │               │               │
            └───────────────┼───────────────┘
                            ▼
                    ┌──────────────┐
                    │   WASM Core   │
                    │  (@aivo/wasm) │
                    └──────────────┘
```

## Forbidden Dependencies

- Databases (D1, KV, etc.)
- Queues
- HTTP clients
- Environment variables
- Cloudflare bindings

## Usage Example

```typescript
import { createWasmGateway } from "@aivo/wasm-gateway";

const gateway = createWasmGateway({
  engineType: "auto",
  strategy: "prefer-wasm",
});

const result = gateway.process({
  landmarks: poseLandmarks,
  exerciseCode: "squat",
});
```
