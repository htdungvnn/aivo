# ADR-001: WASM Engine Architecture

## Status

Accepted

## Date

2026-08-31

## Context

AIVO is an AI-powered health and fitness platform that needs to perform computation-intensive tasks across multiple platforms:
- Web (Next.js)
- Mobile (React Native/Expo)
- Cloudflare Workers

The current implementation uses TypeScript for all computations, including:
- Exercise pose analysis
- Readiness score calculation
- Health metrics computation
- Nutrition calculations
- Time-series analytics

### Problem Statement

1. **Cross-platform consistency**: TypeScript calculations may produce different results across platforms due to floating-point handling
2. **Performance**: Real-time exercise analysis requires high-frequency computation
3. **Code sharing**: Similar calculation logic exists in multiple services
4. **Offline capability**: Mobile app needs reliable offline processing

## Decision Drivers

- Cross-platform deterministic behavior
- Performance requirements for real-time processing
- Binary size constraints for mobile
- Cloudflare Workers compatibility
- Development velocity vs. performance tradeoffs

## Decision

We will implement a modular WASM engine architecture where:

### Engines to Implement in Rust/WASM

1. **wasm-core** - Shared utilities (math, validation, geometry, stats)
2. **exercise-engine** - Pose detection and exercise analysis (existing, upgrade)
3. **readiness-engine** - Deterministic readiness scoring
4. **health-engine** - BMI, BMR, TDEE calculations
5. **nutrition-engine** - Macro calculations, meal aggregation
6. **analytics-engine** - Time-series processing

### What Stays TypeScript

- All Cloudflare Workers orchestration
- Auth, Mail, Gateway routing
- Database access (D1, R2, Queues)
- React components
- AI model orchestration
- Camera access

### Architecture

```
apps/
  web/        → imports wasm-gateway → individual engines
  mobile/     → imports wasm-gateway → individual engines
  services/
    health/   → imports wasm-gateway → readiness-engine, health-engine, analytics-engine
    coach/     → imports wasm-gateway → exercise-engine
    nutrition/ → imports wasm-gateway → nutrition-engine

packages/
  wasm-core/              → Core Rust utilities
  wasm-gateway/           → Unified TypeScript adapter
  exercise-engine/         → Exercise analysis (Rust)
  readiness-engine/       → Readiness scoring (Rust)
  health-engine/          → Health metrics (TypeScript initially)
  nutrition-engine/        → Nutrition calculations (TypeScript initially)
  analytics-engine/       → Time-series analytics (TypeScript initially)
```

## Implementation Details

### wasm-core

Shared Rust crate with:
- Safe math (clamp, round, safe_divide)
- Validation (range, percentage, confidence)
- Statistics (SMA, EMA, std_dev, percentiles)
- Geometry (angles, distances, pose utilities)

### Engine APIs

All engines return typed results with version information:

```typescript
interface EngineOutput {
  result: T;
  engine: string;
  engineVersion: string;
  formulaVersion?: string;
  runtime: 'wasm' | 'typescript';
}
```

### Fallback Strategy

1. **WASM required** - Exercise engine (core feature)
2. **TypeScript fallback** - Health, nutrition, analytics
3. **Server-side fallback** - Complex analytics

### Performance Targets

| Metric | Target |
|--------|--------|
| WASM init | < 50ms |
| Frame processing | < 5ms |
| Binary size (per engine) | < 100KB |
| Startup impact (Worker) | < 10ms |

## Consequences

### Positive

- Deterministic results across platforms
- Improved performance for exercise analysis
- Shared computation logic
- Better type safety with Rust

### Negative

- Increased build complexity
- Rust toolchain requirements
- Potential binary size increase
- Learning curve for TypeScript developers

### Risks

1. **WASM not supported** - Expo Go limitations on iOS
2. **Binary bloat** - Must monitor sizes
3. **Breaking changes** - Version management critical

## Alternatives Considered

### 1. Pure TypeScript

- Pros: Simpler, no Rust needed
- Cons: No cross-platform determinism, potentially slower

### 2. Single WASM Module

- Pros: Simpler deployment
- Cons: Larger binary, less flexible

### 3. Web Workers for All

- Pros: Better threading
- Cons: Cloudflare Workers don't support Workers

## Compliance Checklist

- [x] wasm-core created with shared utilities
- [x] exercise-engine Rust implementation exists
- [x] readiness-engine implemented
- [x] health-engine implemented
- [x] nutrition-engine implemented
- [x] analytics-engine implemented
- [x] wasm-gateway provides unified API
- [x] turbo.json updated for WASM builds
- [x] CI/CD updated with Rust checks
- [x] Feature flags defined
- [x] Fallback strategy documented
