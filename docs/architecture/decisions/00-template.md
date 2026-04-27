# ADR-XXX: [Short Descriptive Title]

## Status

[Proposed | Accepted | Deprecated | Superseded]

*Date: YYYY-MM-DD*

## Context

Describe the problem or opportunity that led to this decision. Include:

- What is the issue we're facing?
- What constraints exist? (performance, cost, time, technical debt)
- Who are the stakeholders?
- What are the business or technical requirements?

**Example**:
> The AIVO platform needs to process complex fitness calculations (BMI, body composition, workout intensity) in real-time. Initially, these calculations were implemented in TypeScript, but performance testing showed that CPU-heavy computations blocked the event loop, causing API response times to exceed 500ms for 10% of requests.

## Decision

State the decision clearly and concisely. Explain:

- What solution was chosen
- Why it was chosen over alternatives
- How it addresses the problem

**Example**:
> We will implement performance-critical fitness calculations in Rust, compiled to WebAssembly (WASM), and call these functions from our TypeScript API. Rust was chosen because:
>
> 1. **Performance**: Rust compiles to near-native WASM, providing 10-100x speedup for CPU-bound tasks
> 2. **Memory safety**: No garbage collection, predictable performance
> 3. **Type safety**: Strong compile-time type checking prevents runtime errors
> 4. **Cross-platform**: Same WASM module works on Cloudflare Workers, web browsers, and mobile
> 5. **Team capability**: Team has Rust experience, and wasm-bindgen provides good TypeScript interop

## Consequences

Describe the outcomes of this decision, both positive and negative.

### Positive

- API response time for calculation-heavy endpoints reduced from 500ms to <50ms
- CPU usage on Cloudflare Workers decreased by 60%
- No garbage collection pauses
- Code is reusable across web, mobile, and API layers

### Negative

- Increased development complexity (requires Rust knowledge)
- Additional build step (wasm-pack) in CI/CD
- Larger deployment package (WASM binary ~200KB)
- Debugging requires learning WASM-specific tools

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Rust learning curve for team | Provide training, pair programming with experienced Rust devs |
| WASM binary size too large | Use `wasm-opt` to minimize, enable LTO, tree-shaking |
| WASM↔JS boundary overhead | Batch operations, minimize crossing frequency |
| CI/CD build time increase | Parallelize WASM build, cache build artifacts |

## Alternatives Considered

### Alternative 1: Keep TypeScript

**Description**: Continue implementing calculations in TypeScript, optimize algorithms.

**Pros**:
- No new language/toolchain to learn
- Faster iteration (no build step)
- Easier debugging

**Cons**:
- Performance remains poor (event loop blocking)
- No cross-platform reuse
- Would eventually need to rewrite anyway

**Why rejected**: Performance requirements cannot be met with pure TypeScript for CPU-intensive tasks.

---

### Alternative 2: Use Python via Pyodide

**Description**: Use Pyodide to run Python in WASM.

**Pros**:
- Python has great scientific libraries (NumPy, SciPy)
- Possibly faster development for data-heavy tasks

**Cons**:
- Pyodide runtime is huge (~50MB)
- Python-WASM performance not as good as Rust
- Team has less Python experience than Rust
- Larger memory footprint

**Why rejected**: Rust provides better performance and smaller bundle size.

---

### Alternative 3: Offload to Dedicated Compute Service

**Description**: Build separate microservice for calculations (e.g., Python/Flask on Fly.io).

**Pros**:
- Can scale independently
- Use any language/framework

**Cons**:
- Additional infrastructure complexity
- Network latency between API and compute service
- Higher operational cost
- Overkill for calculations that fit in WASM

**Why rejected**: Cloudflare Workers + WASM provides sufficient compute without additional infrastructure.

---

## Implementation Notes

Provide practical guidance for implementing this decision:

### Building WASM

```bash
# Build all WASM packages
pnpm run build:wasm

# Build specific package
cd packages/aivo-compute
pnpm run build
```

### Testing

```bash
# Unit tests (Rust)
cargo test --target wasm32-unknown-unknown

# Integration tests (TypeScript)
pnpm --filter @aivo/aivo-compute test
```

### Deployment

WASM binaries are included in npm packages and deployed with the API. No separate deployment needed.

### Performance Benchmarks

Initial benchmarks (measured on Cloudflare Workers):

| Function | TypeScript (ms) | Rust WASM (ms) | Speedup |
|----------|----------------|----------------|---------|
| calculate_bmi | 0.5 | 0.02 | 25x |
| analyze_posture | 1200 | 45 | 27x |
| process_workout | 85 | 3 | 28x |

---

## Related Decisions

- ADR-002: Rust Toolchain Version Pinning
- ADR-005: WASM Error Handling Strategy

---

## References

- [Rust and WebAssembly Book](https://rustwasm.github.io/book/)
- [wasm-bindgen Documentation](https://rustwasm.github.io/wasm-bindgen/)
- [Benchmark results](./benchmarks/results.md)
- Original issue: [GitHub Issue #123](https://github.com/...)

---

**Reviewers**: @senior-rust-dev @tech-lead  
**Approvers**: @tech-lead @cto
