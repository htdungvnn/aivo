# ADR-007: Consolidate WASM Packages into Single Compute Module

**Status:** Proposed  
**Date:** 2026-04-29  
**Author:** Senior Solution Architect  
**Reviewers:** Techlead, Compute Team

---

## Context

The AIVO platform currently uses three separate Rust WASM packages:

1. `@aivo/compute` - Fitness calculations (posture, acoustic myography, macro adjustment)
2. `@aivo/infographic-generator` - SVG/PNG infographic generation
3. `@aivo/optimizer` - Optimization algorithms (routine optimization, token optimization?)

These packages are built independently and copied to the API's `assets/` directory. They share many dependencies (wasm-bindgen, serde, etc.) but cannot easily share code.

**Problems:**
- **Code duplication**: Common utilities must be copied between packages
- **Dependency bloat**: Each package includes same dependencies (increases total WASM size)
- **Build complexity**: Three separate build pipelines to maintain
- **Maintenance burden**: Three Cargo.toml files, three package.json files, three version numbers
- **Unclear boundaries**: Overlap between "compute" and "optimizer" modules

---

## Decision

Consolidate all WASM functionality into a **single `@aivo/compute` package** with feature flags:

```
packages/compute/
├── Cargo.toml (single workspace or monolithic crate)
├── src/
│   ├── lib.rs
│   ├── fitness/           # From current aivo-compute
│   │   ├── acoustic_myography.rs
│   │   ├── macro_adjuster.rs
│   │   ├── posture.rs
│   │   └── lib.rs
│   ├── infographic/       # From current infographic-generator
│   │   └── lib.rs
│   └── optimizer/         # From current optimizer
│       └── lib.rs
├── pkg/
│   └── compute_bg.wasm    # Single WASM file (or feature-specific)
└── package.json
```

**Option A: Cargo Workspace** (Recommended for clear module boundaries)
```toml
[workspace]
members = ["crates/*"]

# crates/fitness/Cargo.toml
[lib]
name = "aivo_fitness"
crate-type = ["cdylib"]

# crates/infographic/Cargo.toml
[lib]
name = "aivo_infographic"
crate-type = ["cdylib"]

# crates/optimizer/Cargo.toml
[lib]
name = "aivo_optimizer"
crate-type = ["cdylib"]

# Top-level package.json builds all by default
```

**Option B: Monolithic Crate with Features** (Simpler build)
```toml
[lib]
name = "aivo_compute"
crate-type = ["cdylib"]

[dependencies]
# All dependencies shared

[features]
default = ["fitness"]
fitness = []
infographic = []
optimizer = []
```

**Recommendation: Option B** for simpler build process and smaller bundle when only one module needed.

---

## Implementation Strategy

### Phase 1: Merge Code (2 days)

1. Create `packages/compute/src/` with subdirectories
2. Copy code from old packages:
   ```
   cp -r packages/aivo-compute/src/* packages/compute/src/fitness/
   cp -r packages/infographic-generator/src/* packages/compute/src/infographic/
   cp -r packages/optimizer/src/* packages/compute/src/optimizer/
   ```
3. Update module paths in Rust files
4. Consolidate dependencies in single `Cargo.toml`
5. Resolve any duplicate dependency conflicts
6. Update `src/lib.rs` to re-export modules:
   ```rust
   pub mod fitness;
   pub mod infographic;
   pub mod optimizer;

   // Re-export for backwards compatibility
   pub use fitness::{PostureAnalyzer, AcousticMyography, MacroAdjuster};
   pub use infographic::{InfographicGenerator, render_workout_summary};
   pub use optimizer::{RoutineOptimizer, TokenOptimizer};
   ```

### Phase 2: Update Build Process (1 day)

1. Update `packages/compute/package.json`:
   ```json
   {
     "name": "@aivo/compute",
     "scripts": {
       "build": "wasm-pack build --target web --release",
       "build:features": "cargo build --release --target wasm32-unknown-unknown && wasm-bindgen target/wasm32-unknown-unknown/release/compute.wasm --out-dir pkg --target web"
     }
   }
   ```
2. Remove old packages after migration:
   ```bash
   rm -rf packages/aivo-compute packages/infographic-generator packages/optimizer
   ```
3. Update root `package.json` build script:
   ```json
   "build:wasm": "pnpm --filter @aivo/compute run build"
   ```
4. Update API `package.json` copy script:
   ```json
   "copy-wasm": "mkdir -p assets && cp -f ../../packages/compute/pkg/compute_bg.wasm assets/"
   ```

### Phase 3: Update Imports (2 days)

1. **API (`apps/api/`):**
   - Change imports from:
     ```typescript
     import { FitnessCalculator } from "@aivo/compute";
     import { InfographicGenerator } from "@aivo/infographic-generator";
     import { TokenOptimizer } from "@aivo/optimizer";
     ```
   - To:
     ```typescript
     import { FitnessCalculator, InfographicGenerator, TokenOptimizer } from "@aivo/compute";
     ```
   - Or selective imports:
     ```typescript
     import { fitness::PostureAnalyzer } from "@aivo/compute";
     import { infographic::InfographicGenerator } from "@aivo/compute";
     ```

2. **Web (`apps/web/`):**
   - Update imports if using WASM directly (likely only fitness module)

3. **Mobile (`apps/mobile/`):**
   - Update imports similarly

4. **Search entire codebase:**
   ```bash
   rg "@aivo/(compute|infographic-generator|optimizer)" --type ts
   ```

### Phase 4: Testing (1 day)

1. Run all unit tests (JavaScript/TypeScript)
2. Test WASM functions manually:
   ```typescript
   import { FitnessCalculator } from "@aivo/compute";
   const calc = new FitnessCalculator();
   const result = calc.calculateDeviation(...);
   ```
3. Run integration tests
4. Load test in browser to ensure WASM loads correctly
5. Test all three modules work independently

### Phase 5: Backward Compatibility (Optional, 1 day)

If other packages import the old packages directly:

1. Create stub packages that re-export:
   ```typescript
   // packages/infographic-generator/src/index.ts
   export * from "@aivo/compute/src/infographic";
   ```
2. Deprecate with warnings in documentation
3. Remove in next major version

---

## API Changes

**Before:**
```typescript
// Multiple packages
import { FitnessCalculator } from "@aivo/compute";
import { InfographicGenerator } from "@aivo/infographic-generator";
import { TokenOptimizer } from "@aivo/optimizer";
```

**After:**
```typescript
// Single package
import { FitnessCalculator, InfographicGenerator, TokenOptimizer } from "@aivo/compute";

// Or namespaced (if using modules):
import { fitness } from "@aivo/compute";
import { infographic } from "@aivo/compute";

const calc = new fitness.PostureAnalyzer();
```

**Breaking change:** Yes, package names change. But since these are internal packages (only used within monorepo), impact is minimal.

---

## Benefits

1. **Single build command**: `pnpm run build:wasm` instead of three separate builds
2. **Reduced WASM size**: Shared dependencies compiled once (potential 30-50% reduction)
3. **Shared code**: Common utilities (error handling, math functions) can be shared
4. **Simpler maintenance**: One Cargo.toml to update, one version to bump
5. **Clearer ownership**: All compute code in one place
6. **Easier to add new modules**: Add new subdirectory, export from lib.rs
7. **Better caching**: Turbo can cache single build artifact

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| WASM size increases due to pulling in all modules | Low | Medium | Use feature flags to build only needed modules |
| Breaking changes in API cause runtime errors | Medium | High | Comprehensive testing; gradual rollout |
| Cargo dependency conflicts | Medium | Medium | Careful dependency version alignment; use `[patch]` section |
| Build times increase | Low | Low | Parallel feature builds; incremental compilation |
| Loss of module isolation | Low | Low | Keep subdirectories separate; clear module boundaries |

---

## Alternatives Considered

### Alternative 1: Keep Three Packages

**Why not:** Maintenance burden too high; duplication problematic; unclear boundaries already exist.

### Alternative 2: Three Packages with Shared Core

Create `@aivo/compute-core` that all three depend on.

**Why not:** Adds another layer of indirection; still three packages to maintain; doesn't solve duplication fully.

### Alternative 3: NPM Workspace with Three Packages Under One Directory

```
packages/compute/
├── fitness/package.json
├── infographic/package.json
├── optimizer/package.json
└── shared/package.json
```

**Why not:** Still three packages to publish/build; complexity not reduced.

---

## Success Criteria

- ✅ All three modules (fitness, infographic, optimizer) build successfully
- ✅ Total WASM size ≤ 500KB (gzip) for full build
- ✅ All existing tests pass
- ✅ No runtime errors in production-like environment
- ✅ Build time ≤ 2 minutes (was ~3-4 min for three packages)
- ✅ Documentation updated

---

## Rollback Plan

If critical issues arise:

1. Restore git commits for removed packages
2. Revert import changes in API/web/mobile
3. Restore original `package.json` scripts
4. Redeploy previous version

**Note:** Since this is a refactor with no data migration, rollback is straightforward if caught early.

---

## Related Decisions

- ADR-006: Service Layer Standardization (services may call WASM modules)
- Build process improvements (Phase 2)

---

**Approval required:** Techlead, Compute Team

**Implementation owner:** Compute Team + API Team (for integration)

**Target completion:** 2026-05-07 (1 week)
