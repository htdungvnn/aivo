# ADR 0002: WASM Compute Architecture

## Status
**Accepted** (Proposed - needs team approval)

## Context

AIVO currently has **three separate Rust WASM crates**:
1. `@aivo/compute` (aivo-compute) - Fitness calculations (posture, acoustic, macro)
2. `@aivo/optimizer` (aivo-optimizer) - Token optimization for LLM cost reduction
3. `@aivo/infographic-generator` - Infographic generation for progress visualization

Each crate:
- Has its own `Cargo.toml`
- Builds to separate `pkg/` directories
- Is copied separately to the API's assets
- Has separate dependencies and build processes

**Problems:**
1. **Code duplication** - Common Rust utilities (logging, error handling, math helpers) are duplicated
2. **Build complexity** - Three separate `wasm-pack` builds instead of one
3. **Asset management** - WASM files scattered in API assets
4. **Inconsistent patterns** - Each crate has slightly different error handling, testing approaches
5. **Dependency bloat** - Multiple copies of similar dependencies (wasm-bindgen, js-sys, etc.)

## Decision

We will **consolidate WASM crates into a single workspace** with feature flags:

```
packages/core/compute/
├── Cargo.toml (workspace root)
├── crates/
│   ├── fitness/     (current aivo-compute)
│   ├── optimizer/   (current optimizer)
│   └── infographic/ (current infographic-generator)
└── packages/
    └── body-compute/ (TypeScript - can stay separate or merge)
```

### Option A: Monorepo with Feature Flags (Recommended)

**Single `Cargo.toml` at workspace root:**
```toml
[workspace]
members = [
  "crates/fitness",
  "crates/optimizer",
  "crates/infographic"
]

# Shared dependencies in root virtual manifest
[profile.release]
lto = true
opt-level = "z"  # Optimize for size
codegen-units = 1
```

**Single WASM output with feature flags:**
```rust
// In lib.rs of unified crate
#[cfg(feature = "fitness")]
pub mod fitness;

#[cfg(feature = "optimizer")]
pub mod optimizer;

#[cfg(feature = "infographic")]
pub mod infographic;
```

**Build command:**
```bash
# Build all features
wasm-pack build --target web --features "fitness optimizer infographic"

# Build only fitness
wasm-pack build --target web --features "fitness"

# Output: single `pkg/` with unified JS glue
```

**Advantages:**
- Single build command
- Shared dependencies (deduplication)
- Shared error types and utilities
- Single JS glue code (smaller bundle if using only some features)
- Easier to add new compute modules

**Disadvantages:**
- Larger monolithic crate if all features enabled
- Need feature flag management
- All crates must use compatible dependency versions

### Option B: Keep Separate but Standardize

If consolidation is too complex, at minimum:
1. Extract common utilities into `compute-common` crate
2. Standardize error handling with `thiserror`
3. Use workspace `cargo` commands
4. Share `wasm-pack` config

**Less preferred** due to ongoing maintenance burden.

## Technical Implementation

### 1. Unified Package Export

```typescript
// packages/core/compute/src/index.ts
import { init as initFitness } from '@aivo/core/compute/fitness';
import { init as initOptimizer } from '@aivo/core/compute/optimizer';
import { init as initInfographic } from '@aivo/core/compute/infographic';

export const init = (features: ComputeFeature[]) => {
  if (features.includes('fitness')) initFitness();
  if (features.includes('optimizer')) initOptimizer();
  if (features.includes('infographic')) initInfographic();
};

export type ComputeFeature = 'fitness' | 'optimizer' | 'infographic';

export * from '@aivo/core/compute/fitness';
export * from '@aivo/core/compute/optimizer';
export * from '@aivo/core/compute/infographic';
```

### 2. API Integration

```typescript
// apps/api/src/services/compute/index.ts
import * as compute from '@aivo/core/compute';

// Initialize only needed features
compute.init(['fitness', 'optimizer']);

// Use specific modules
import { posture } from '@aivo/core/compute/fitness';
import { optimizeTokens } from '@aivo/core/compute/optimizer';
```

### 3. WASM Asset Management

Current (`apps/api/package.json`):
```json
{
  "scripts": {
    "copy-wasm": "mkdir -p assets && cp -f ../../packages/infographic-generator/pkg/*.wasm assets/ && cp -f ../../packages/aivo-compute/pkg/*.wasm assets/"
  }
}
```

Improved:
```json
{
  "scripts": {
    "copy-wasm": "mkdir -p assets && cp -f ../../packages/core/compute/pkg/*.wasm assets/ && cp -f ../../packages/core/compute/pkg/*.js assets/"
  }
}
```

Single `assets/` directory:
```
assets/
├── aivo_compute_bg.wasm
├── aivo_optimizer_bg.wasm
├── aivo_infographic_bg.wasm
└── aivo_compute.js (unified glue)
```

### 4. Build Process

**Root `package.json`:**
```json
{
  "scripts": {
    "build:wasm": "cd packages/core/compute && wasm-pack build --target web --features \"fitness optimizer infographic\"",
    "build:wasm:fitness": "cd packages/core/compute && wasm-pack build --target web --features fitness",
    "build:wasm:optimizer": "cd packages/core/compute && wasm-pack build --target web --features optimizer"
  }
}
```

**Turbo task:**
```json
{
  "tasks": {
    "build:wasm": {
      "dependsOn": ["^build"],
      "outputs": ["packages/core/compute/pkg/**"],
      "cache": true
    }
  }
}
```

## Migration Steps

1. **Create unified workspace:**
   ```bash
   mkdir -p packages/core/compute/crates
   mv packages/aivo-compute packages/core/compute/crates/fitness
   mv packages/optimizer packages/core/compute/crates/optimizer
   mv packages/infographic-generator packages/core/compute/crates/infographic
   ```

2. **Extract common utilities:**
   - Create `crates/common` for shared error types, logging, math helpers
   - Refactor each crate to use common dependencies

3. **Create workspace `Cargo.toml`:**
   - Define members
   - Set shared profile
   - Specify common dependencies

4. **Update each crate:**
   - Remove duplicate dependencies
   - Use shared error types
   - Update module structure

5. **Build and test:**
   ```bash
   cd packages/core/compute
   cargo check --target wasm32-unknown-unknown
   wasm-pack build --target web --features "fitness optimizer"
   ```

6. **Update dependents:**
   - `apps/api` - update import paths
   - `apps/web` - update if directly using WASM
   - `apps/mobile` - update if directly using WASM

7. **Delete old packages:**
   - Remove `packages/aivo-compute`
   - Remove `packages/optimizer`
   - Remove `packages/infographic-generator`

8. **Update documentation:**
   - Update `COMPUTE.md`
   - Update `ARCHITECTURE.md`
   - Update `package.json` scripts

## Consequences

### Positive
- Single source of truth for WASM build
- Reduced code duplication (DRY)
- Consistent error handling and logging
- Easier to add new compute modules
- Smaller bundle size if using feature flags
- Unified testing strategy

### Negative
- Migration complexity (need to refactor 3 crates)
- Temporary build issues during transition
- Need to resolve dependency conflicts between crates
- Larger learning curve for new contributors

### Risks
- Breaking changes if WASM API changes
- Performance regression if not properly optimized
- Build times may increase initially
- Need thorough testing of each feature post-migration

## Monitoring

After migration:
1. Verify WASM output size (`du -sh pkg/*.wasm`)
2. Test each feature in isolation
3. Benchmark performance against old versions
4. Check bundle size impact on frontend

---

## Related Decisions
- ADR 0001: Monorepo Package Organization
- ADR 0003: Shared Types Organization
- ADR 0004: API Route Structure
