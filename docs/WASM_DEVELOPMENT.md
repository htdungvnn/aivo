# WASM Development Guide

Complete guide for developing and optimizing Rust WebAssembly (WASM) modules in AIVO.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Building WASM](#building-wasm)
- [Writing Rust Code](#writing-rust-code)
- [Testing](#testing)
- [Debugging](#debugging)
- [Performance Optimization](#performance-optimization)
- [Integration](#integration)
- [Troubleshooting](#troubleshooting)

## Overview

AIVO uses Rust compiled to WebAssembly for performance-critical computations:

- **`packages/aivo-compute`**: Core fitness calculations (BMI, body metrics, workout algorithms)
- **`packages/infographic-generator`**: Dynamic infographic/image generation
- **`packages/optimizer`**: Text/token optimization and summarization

WASM modules run in:
- Cloudflare Workers (API)
- Next.js web app (Node.js and browser)
- React Native mobile app (Hermes/JavaScriptCore)

## Prerequisites

### Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# Verify installation
rustc --version
cargo --version
```

### Install wasm-pack (Optional but Recommended)

```bash
cargo install wasm-pack
```

### Configure Rust for WASM

```bash
rustup target add wasm32-unknown-unknown
```

### Required crates

Key dependencies in `Cargo.toml`:

```toml
[dependencies]
wasm-bindgen = "0.2"
js-sys = "0.3"
web-sys = { version = "0.3", features = [...] }
serde = { version = "1.0", features = ["derive"] }
serde-wasm-bindgen = "0.5"

[dev-dependencies]
wasm-bindgen-test = "0.3"
```

## Project Structure

```
packages/
├── aivo-compute/
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs           # Main library entry
│   │   ├── acoustic_myography.rs  # Muscle analysis
│   │   ├── macro_adjuster.rs      # Macro nutrient calculations
│   │   ├── posture.rs             # Posture analysis
│   │   └── __tests__/             # Rust unit tests
│   ├── pkg/                  # Generated WASM (after build)
│   │   ├── aivo_compute_bg.wasm
│   │   ├── aivo_compute.js
│   │   └── package.json
│   └── package.json          # npm package wrapper
│
├── infographic-generator/
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs
│   │   ├── colors.rs        # Color palettes
│   │   ├── png.rs           # PNG generation
│   │   ├── renderer.rs      # Main rendering logic
│   │   ├── templates.rs     # Infographic templates
│   │   └── types.rs         # Type definitions
│   └── pkg/
│
└── optimizer/
    ├── Cargo.toml
    ├── src/
    │   ├── lib.rs
    │   ├── keyword_extraction.rs
    │   ├── minifier.rs
    │   ├── semantic_pruning.rs
    │   └── token_counter.rs
    └── pkg/
```

## Building WASM

### Build Commands

```bash
# Build all WASM packages
pnpm run build:wasm

# Build specific package
cd packages/aivo-compute
pnpm run build

# Or using cargo directly
cargo build --target wasm32-unknown-unknown --release
wasm-bindgen target/wasm32-unknown-unknown/release/aivo_compute.wasm --out-dir pkg --target web
```

### Package.json Scripts

Each WASM package has scripts:

```json
{
  "scripts": {
    "build": "cargo build --target wasm32-unknown-unknown --release && wasm-bindgen target/wasm32-unknown-unknown/release/aivo_compute.wasm --out-dir pkg --target web",
    "build:dev": "cargo build --target wasm32-unknown-unknown && wasm-bindgen target/wasm32-unknown-unknown/debug/aivo_compute.wasm --out-dir pkg --target web",
    "test": "cargo test --target wasm32-unknown-unknown",
    "dev": "cargo watch -w src -x 'build --target wasm32-unknown-unknown'"
  }
}
```

### Build Output

After building, the `pkg/` directory contains:

- `*.wasm` - The binary WASM module
- `*.js` - JavaScript glue code
- `*.d.ts` - TypeScript type definitions
- `package.json` - npm package manifest

These files are published as npm packages and imported by TypeScript code:

```typescript
import { calculate_bmi, get_workout_intensity } from '@aivo/aivo-compute';
```

## Writing Rust Code

### Basic Function with wasm-bindgen

```rust
// src/lib.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

// Exported to JavaScript with proper types
#[wasm_bindgen]
pub fn calculate_bmi(weight_kg: f64, height_m: f64) -> f64 {
    if height_m <= 0.0 {
        return 0.0;
    }
    weight_kg / (height_m * height_m)
}
```

### Working with Objects

```rust
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize)]
pub struct UserMetrics {
    pub weight: f64,
    pub height: f64,
    pub age: u32,
    pub gender: String,
}

#[wasm_bindgen]
pub fn calculate_calories(metrics: &JsValue) -> Result<JsValue, JsError> {
    let user: UserMetrics = metrics.into_serde().map_err(|e| JsError::new(&e.to_string()))?;

    let bmr = if user.gender == "male" {
        10.0 * user.weight + 6.25 * user.height - 5.0 * user.age as f64 + 5.0
    } else {
        10.0 * user.weight + 6.25 * user.height - 5.0 * user.age as f64 - 161.0
    };

    let tdee = bmr * 1.2; // Sedentary multiplier

    Ok(JsValue::from_serde(&tdee).unwrap())
}
```

### Error Handling

Always return `Result<T, JsError>` for WASM boundary:

```rust
#[wasm_bindgen]
pub fn process_workout(data: &JsValue) -> Result<JsValue, JsError> {
    let workout: WorkoutData = data.into_serde()
        .map_err(|e| JsError::new(&format!("Invalid workout data: {}", e)))?;

    if workout.exercises.is_empty() {
        return Err(JsError::new("Workout must have at least one exercise"));
    }

    let result = calculate_metrics(&workout)
        .map_err(|e| JsError::new(&e.to_string()))?;

    Ok(serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsError::new(&e.to_string()))?)
}
```

### Arrays and Collections

```rust
#[wasm_bindgen]
pub fn filter_valid_scores(scores: Vec<f64>) -> Vec<f64> {
    scores.into_iter()
        .filter(|&s| s >= 0.0 && s <= 100.0)
        .collect()
}

#[wasm_bindgen]
pub struct PostureAnalyzer {
    data: Vec<f64>,
}

#[wasm_bindgen]
impl PostureAnalyzer {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self { data: Vec::new() }
    }

    pub fn add_measurement(&mut self, value: f64) {
        self.data.push(value);
    }

    pub fn analyze(&self) -> f64 {
        let sum: f64 = self.data.iter().sum();
        sum / self.data.len() as f64
    }
}
```

## Testing

### Unit Tests (Rust)

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_bmi() {
        assert_eq!(calculate_bmi(70.0, 1.75), 22.857142857142856);
        assert_eq!(calculate_bmi(0.0, 1.75), 0.0);
        assert_eq!(calculate_bmi(70.0, 0.0), 0.0);
    }

    #[test]
    fn test_calculate_calories_male() {
        let user = UserMetrics {
            weight: 70.0,
            height: 175.0,
            age: 30,
            gender: "male".to_string(),
        };
        // BMR = 10*70 + 6.25*175 - 5*30 + 5 = 1693.75
        assert!(calculate_calories_for_user(&user).abs() - 1693.75 < 0.01);
    }
}
```

Run tests:

```bash
cd packages/aivo-compute
cargo test
```

### WASM-specific Tests

```rust
#[cfg(test)]
mod wasm_tests {
    use super::*;
    use wasm_bindgen_test::*;

    wasm_bindgen_test_configure!(run_in_browser);

    #[wasm_bindgen_test]
    fn test_calculate_bmi_wasm() {
        let result = calculate_bmi(70.0, 1.75);
        assert!((result - 22.86).abs() < 0.01);
    }
}
```

Run WASM tests:

```bash
cargo test --target wasm32-unknown-unknown
# Or use wasm-pack
wasm-pack test --headless --chrome
```

### Integration Tests with JavaScript

```typescript
// packages/aivo-compute/__tests__/integration.test.ts
import { calculate_bmi } from '../pkg/aivo_compute';

describe('AIVO Compute WASM', () => {
  it('should calculate BMI correctly', () => {
    const bmi = calculate_bmi(70, 1.75);
    expect(bmi).toBeCloseTo(22.86, 1);
  });

  it('should handle edge cases', () => {
    expect(calculate_bmi(0, 1.75)).toBe(0);
  });
});
```

## Debugging

### Console Logging

```rust
use wasm_bindgen::prelude::*;
use web_sys::console;

#[wasm_bindgen]
pub fn debug_calculation(value: f64) {
    console::log_1(&JsValue::from_str(&format!("Debug: value = {}", value)));
}
```

### Panic Hook

Set up panic hook for better error messages:

```rust
#[wasm_bindgen(start)]
pub fn main() {
    console_error_panic_hook::set_once();
}
```

Add to `Cargo.toml`:

```toml
[dependencies]
console_error_panic_hook = "0.1"
```

### Inspecting WASM Binary

```bash
# Check WASM file size
ls -lh pkg/*.wasm

# Disassemble WASM (if you have wasm-objdump)
wasm-objdump -d pkg/aivo_compute_bg.wasm

# Use wasm2wat to convert to readable format
wasm2wat pkg/aivo_compute_bg.wasm > pkg/output.wat
```

### Debug in Browser

1. Build with debug symbols:
   ```bash
   cargo build --target wasm32-unknown-unknown
   ```

2. Enable source maps in `wasm-bindgen`:
   ```bash
   wasm-bindgen target/wasm32-unknown-unknown/debug/aivo_compute.wasm \
     --out-dir pkg \
     --target web \
     --source-map
   ```

3. Load in browser DevTools → Sources → find `.wasm` file

### Memory Profiling

```javascript
// In JavaScript, check memory usage
const instance = await wasmModule.default();
console.log('Memory usage:', performance.memory);
```

## Performance Optimization

### Reduce WASM Size

1. **Use `wasm-opt`**:

```bash
# Install binaryen
brew install binaryen  # macOS
# Or: cargo install binaryen

# Optimize WASM
wasm-opt -Oz -o pkg/aivo_compute_opt.wasm pkg/aivo_compute_bg.wasm
```

2. **Enable LTO in Cargo.toml**:

```toml
[profile.release]
lto = true
opt-level = 'z'  # Optimize for size
codegen-units = 1
```

3. **Remove unused code**:

```bash
# Check unused exports
wasm-bindgen --remove-duplicates --keep-debug
```

### Minimize Boundary Crossings

Batch operations to reduce JS↔WASM calls:

```rust
// ❌ BAD: Multiple calls
for item in items {
    let result = process_item(&item)?; // Each call crosses boundary
}

// ✅ GOOD: Single batch call
#[wasm_bindgen]
pub fn process_batch(data: &JsValue) -> Result<JsValue, JsError> {
    let items: Vec<Item> = data.into_serde()?;
    let results: Vec<Result> = items.into_iter()
        .map(process_item)
        .collect();
    Ok(serde_wasm_bindgen::to_value(&results)?)
}
```

### Use SIMD (when available)

```rust
#[cfg(target_arch = "wasm32")]
use wasm32::simd::*;

#[wasm_bindgen]
pub fn sum_array(data: &[f64]) -> f64 {
    #[cfg(target_arch = "wasm32")]
    {
        // Use SIMD for parallel sum
        let simd_sum = ...;
    }

    #[cfg(not(target_arch = "wasm32"))]
    {
        data.iter().sum()
    }
}
```

Enable SIMD in `Cargo.toml`:

```toml
[lib]
crate-type = ["cdylib", "rlib"]

[profile.release]
panic = "abort"  # Smaller code size
```

### Precompute Constants

```rust
// ❌ Computed every call
#[wasm_bindgen]
pub fn calculate_something(x: f64) -> f64 {
    let pi = 3.14159265359; // Recreated each time
    x * pi
}

// ✅ Constants at module level
const PI: f64 = 3.14159265359;

#[wasm_bindgen]
pub fn calculate_something(x: f64) -> f64 {
    x * PI
}
```

## Integration

### Importing in TypeScript

```typescript
// TypeScript imports
import {
  calculate_bmi,
  get_workout_intensity,
  analyze_posture,
} from '@aivo/aivo-compute';

// Initialize if needed (most wasm-bindgen modules auto-initialize)
await calculate_bmi(70, 1.75);

// Use in React component
function BMIChart({ weight, height }: { weight: number; height: number }) {
  const [bmi, setBmi] = useState<number | null>(null);

  useEffect(() => {
    const result = calculate_bmi(weight, height);
    setBmi(result);
  }, [weight, height]);

  return <Text>BMI: {bmi?.toFixed(2)}</Text>;
}
```

### Cloudflare Workers Integration

```typescript
// apps/api/src/routes/compute.ts
import { calculate_bmi } from '@aivo/aivo-compute';

export const computeRouter = router({
  POST('/bmi', async (c) => {
    const { weight, height } = await c.req.json();

    // Call WASM function
    const bmi = calculate_bmi(weight, height);

    return c.json({
      bmi,
      category: get_bmi_category(bmi),
    });
  }),
});
```

### Next.js Web Integration

```typescript
// apps/web/src/lib/compute-client.ts
'use client';

import { calculate_bmi } from '@aivo/aivo-compute';

export function useBMICalculator() {
  return useCallback((weight: number, height: number) => {
    'use server'; // Or use client-side
    return calculate_bmi(weight, height);
  }, []);
}
```

### React Native Integration

```typescript
// apps/mobile/services/compute.service.ts
import { calculate_bmi, get_workout_intensity } from '@aivo/aivo-compute';

export function calculateUserBMI(weight: number, height: number): number {
  // WASM runs on Hermes engine
  return calculate_bmi(weight, height);
}
```

## Continuous Integration

### CI/CD Build Steps

The GitHub Actions workflow includes:

```yaml
# .github/workflows/ci.yml
- name: Build WASM packages
  run: |
    pnpm run build:wasm

- name: Verify WASM outputs
  run: |
    test -f packages/aivo-compute/pkg/aivo_compute_bg.wasm
    test -f packages/aivo-compute/pkg/aivo_compute.js
```

### Versioning

WASM packages follow semantic versioning:

```json
{
  "name": "@aivo/aivo-compute",
  "version": "1.2.3",
  "main": "pkg/aivo_compute.js",
  "types": "pkg/aivo_compute.d.ts"
}
```

When WASM interface changes:
1. Update `Cargo.toml` version
2. Update `package.json` version (match)
3. Generate new types: `wasm-bindgen --typescript`
4. Commit generated files

## Troubleshooting

### "Cannot find module '@aivo/aivo-compute'"

**Solution**: Build the WASM package first:

```bash
cd packages/aivo-compute
pnpm run build
pnpm --filter @aivo/aivo-compute link  # Or pnpm install in consuming app
```

### "Uncaught (in promise) RuntimeError: memory access out of bounds"

**Cause**: Invalid input types or null pointers

**Solution**: Add validation:

```rust
#[wasm_bindgen]
pub fn process_data(data: &JsValue) -> Result<JsValue, JsError> {
    let input: Vec<f64> = data.into_serde()
        .map_err(|e| JsError::new(&format!("Expected array of numbers: {}", e)))?;
    // Validate array length
    if input.is_empty() {
        return Err(JsError::new("Input array cannot be empty"));
    }
    // Process...
}
```

### "WASM module compilation failed"

**Check**:
1. Rust toolchain is installed: `rustc --version`
2. wasm32 target added: `rustup target list | grep wasm32`
3. wasm-bindgen-cli installed: `wasm-bindgen --version`
4. No syntax errors in Cargo.toml

### Large WASM binary size

**Optimization**:

```bash
# Use wasm-opt
wasm-opt -Oz --output pkg/output.wasm pkg/input.wasm

# Check size
ls -lh pkg/output.wasm

# Enable LTO in Cargo.toml:
# [profile.release]
# lto = true
# opt-level = 'z'
```

### Memory leaks

**Cause**: Not freeing allocated memory

**Solution**: Use `wasm-bindgen`'s `Closure` properly:

```rust
// ❌ Leaks memory
let closure = Closure::wrap(Box::new(move || {
    // ...
}) as Box<dyn Fn()>);
some_js_function.call1(&closure);

// ✅ Proper cleanup
let closure = Closure::wrap(Box::new(move || {
    // ...
}) as Box<dyn Fn()>);
some_js_function.call1(&closure);
closure.forget(); // Or keep reference and call .drop() later
```

### Tests fail on CI but pass locally

**Check**:
- Same Rust version? `rustup show`
- Same wasm-bindgen version?
- Clean build: `cargo clean && pnpm run build:wasm`

## Best Practices

1. **Keep WASM functions small and focused** - Single Responsibility Principle
2. **Validate all inputs** - Never trust JavaScript inputs
3. **Return Result<T, JsError>** - Proper error propagation
4. **Write comprehensive tests** - Unit + integration tests
5. **Minimize WASM size** - Use LTO, wasm-opt, tree-shaking
6. **Batch operations** - Reduce JS↔WASM boundary crossings
7. **Use typed arrays for large data** - Transfer ownership, not copies
8. **Profile before optimizing** - Use benchmarks to find hotspots

## Benchmarks

Add benchmarks with `criterion`:

```toml
[dev-dependencies]
criterion = "0.5"
```

```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_calculate_bmi(c: &mut Criterion) {
    c.bench_function("calculate_bmi", |b| {
        b.iter(|| {
            black_box(calculate_bmi(black_box(70.0), black_box(1.75)))
        })
    });
}

criterion_group!(benches, bench_calculate_bmi);
criterion_main!(benches);
```

Run benchmarks:

```bash
cargo bench
```

## Resources

- [wasm-bindgen Documentation](https://rustwasm.github.io/wasm-bindgen/)
- [Rust and WebAssembly Book](https://rustwasm.github.io/book/)
- [WebAssembly MDN Docs](https://developer.mozilla.org/en-US/docs/WebAssembly)
- [AIVO Architecture](./ARCHITECTURE.md)
- [API Reference](./API_REFERENCE.md)
