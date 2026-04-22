# Testing Guide

Comprehensive testing strategy for AIVO.

## Overview

AIVO uses multiple testing frameworks across packages:

| Package | Unit | Integration | E2E |
|---------|------|-------------|-----|
| `@aivo/compute` | Rust test | - | - |
| `@aivo/db` | - | Drizzle migrations | - |
| `@aivo/memory-service` | Jest 48 tests | - | - |
| `@aivo/api` | Jest | Hono test utils | - |
| `@aivo/web` | Jest + RTL | - | Cypress (optional) |
| `@aivo/mobile` | Jest | - | Detox (optional) |

---

## Memory Service Tests

The memory-service package has 48 unit tests covering:

### Types & Utilities (`__tests__/types.test.ts`)
- `isHealthCritical()` - 5 tests (injury keywords, case insensitive)
- `isValidEmbedding()` - 4 tests (dimensions, NaN, Infinity)
- `isMemoryNode()` - 4 tests (valid/invalid objects)
- `createMemoryNode()` - 2 tests (defaults, custom)
- `formatMemoryContext()` - 4 tests (empty, grouping, confidence)

### Token Utilities (`__tests__/compression.test.ts`)
- `estimateTokens()` - 4 tests (simple, empty, rounding, long text)
- `truncateToTokenBudget()` - 3 tests (no truncation, truncate, exact)
- `ContextBuilder` - 8 tests (formatting, confidence display, verification count, budget, critical health priority)

### Conversation Summarizer (`__tests__/summarizer.test.ts`)
- `extractFacts()` - 6 tests (injury extraction, multiple types, confidence filtering, limit, error handling, invalid type mapping)

### Vector Search (`__tests__/vector-search.test.ts`)
- `cosineSimilarity()` - 8 tests (correct calculation, edge cases)
- `scoreMemories()` - 4 tests (recency boost, confidence boost, priority boost)
- `MemorySearcher` - 8 tests (caching, embedding errors, truncation, config)

### Running Memory Service Tests

```bash
cd packages/memory-service
pnpm test          # Run once
pnpm test --watch  # Watch mode
pnpm test --coverage  # With coverage report
```

---

## API Tests

### Location

`apps/api/src/routes/__tests__/`

### Running

```bash
cd apps/api
pnpm test
```

Tests use Hono's test utils:

```typescript
import { describe, test, expect } from "vitest";
import { getRouteAPI } from "hono/testing";
import { app } from "../ai.ts";

describe("AI Chat", () => {
  test("POST /ai/chat returns 401 without auth", async () => {
    const api = getRouteAPI(app, "/ai/chat");
    const res = await api.execute({
      method: "POST",
      json: { userId: "user-1", message: "hello" },
    });
    expect(res.status).toBe(401);
  });
});
```

---

## Compute (WASM) Tests

Rust tests in `packages/aivo-compute/src/lib.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deviation_score() {
        // ...
    }

    #[test]
    fn test_recovery_curve() {
        // ...
    }
}
```

### Running

```bash
cd packages/aivo-compute
pnpm test
# or
cargo test
```

---

## Database Migration Testing

### Test Migration Application

```bash
cd packages/db
# Create test database
wrangler d1 database create aivo-test --local

# Apply migrations
pnpm run migrate:local

# Verify tables
wrangler d1 execute aivo-test --command "SELECT name FROM sqlite_master WHERE type='table';"
```

### Seed Test Data

```bash
# Use packages/db/scripts/seed.ts
cd packages/db
pnpm run seed
```

---

## Integration Tests

### Setup Test Environment

1. Start local D1 database
2. Apply migrations
3. Seed with test data
4. Start API in test mode

```bash
# Combined script
./scripts/test-integration.sh
```

### Memory Service Integration

Tests that memory extraction and retrieval work end-to-end:

```typescript
// Example (conceptual)
test("process conversation and retrieve memories", async () => {
  const service = new MemoryService({ openaiApiKey: TEST_KEY, db: testDb });
  
  // Process conversation
  await service.processConversationTurn(
    "user-123",
    "I have knee pain from running",
    "I recommend seeing a physio",
    "conv-123"
  );
  
  // Retrieve memories
  const memories = await service.getMemories("user-123", {});
  expect(memories).toContain(expect.objectContaining({
    content: expect.stringContaining("knee pain"),
  }));
});
```

---

## E2E Tests (Optional)

### Web (Cypress)

```bash
cd apps/web
pnpm run cypress:open
```

Tests:
- Login flow
- Chat functionality
- Dashboard loading
- Routine creation

### Mobile (Detox)

```bash
cd apps/mobile
pnpmx detox test -c ios
```

---

## Code Coverage

### Generate Coverage Report

```bash
# All packages
pnpm run coverage

# Individual
cd packages/memory-service
pnpm test --coverage --coverageReporters=lcov
```

Coverage thresholds:

| Package | Target |
|---------|--------|
| `@aivo/memory-service` | 90% |
| `@aivo/api` | 80% |
| `@aivo/web` | 75% |
| `@aivo/mobile` | 70% |

---

## Type Checking

```bash
# All packages
pnpm run type-check

# Watch mode (individual)
cd packages/memory-service
pnpm type-check --watch
```

---

## Linting

```bash
# All packages
pnpm run lint

# Auto-fix
pnpm run lint:fix
```

Uses ESLint with:
- `@typescript-eslint/recommended`
- `prettier` integration
- Package-specific rules

---

## Performance Testing

### API Benchmarks

```bash
cd apps/api
pnpm run bench
```

Tests:
- Chat endpoint latency (p50, p95, p99)
- Memory retrieval time
- Database query performance

Sample output:

```
Chat endpoint (with memory):
  mean: 1450ms
  p50: 1380ms
  p95: 2100ms
  p99: 3200ms
```

---

## Mocking

### OpenAI API

All OpenAI calls are mocked in tests:

```typescript
jest.mock("openai", () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: jest.fn() } },
    embeddings: { create: jest.fn() },
  })),
}));
```

### Database

In-memory SQLite for tests:

```typescript
const db = await drizzle(
  new SQLite(DATABASE_PATH),
  { schema }
);
```

---

## CI/CD Pipeline

GitHub Actions (`.github/workflows/`):

### `test.yml`

```yaml
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install
      - run: pnpm run type-check
      - run: pnpm run lint
      - run: pnpm run test
      - run: pnpm run build
```

### `e2e.yml`

Runs E2E tests on staging environment.

---

## Debugging Tests

### Jest

```bash
# Verbose
pnpm test --verbose

# Only specific test
pnpm test -t "extractFacts"

# Debug with node inspect
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Rust/WASM

```bash
# Run with logging
RUST_LOG=debug pnpm test

# Single test
cargo test test_name -- --nocapture
```

---

## Test Data Management

### Seeding

```typescript
// packages/db/scripts/seed.ts
async function seed() {
  // Create test user
  await db.insert(users).values({
    id: "user-test",
    email: "test@aivo.ai",
    name: "Test User",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  
  // Create routine
  await db.insert(workoutRoutines).values({ /* ... */ });
}
```

### Cleanup

```bash
# Reset test database
rm -rf packages/db/.wrangler/state/d1
wrangler d1 migrations apply aivo-db --local
```

---

## Best Practices

1. **Mock external APIs** - OpenAI, Cloudflare Workers
2. **Use factories** - `createMemoryNode(userId, type, content, embedding)`
3. **Clean up after tests** - Delete created records
4. **Test edge cases** - Empty arrays, nulls, invalid input
5. **Keep tests fast** - < 100ms per test suite
6. **Test integration points** - DB queries, API responses

---

## Known Testing Limitations

- Cannot test actual OpenAI API in CI (cost)
- WASM performance testing requires native environment
- Mobile E2E tests require simulator/device
- Cloudflare Workers require `wrangler` in CI (slow)

---

**Last Updated:** 2026-04-22  
**Testing Framework:** Jest 29, Vitest (planned)
