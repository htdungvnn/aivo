# AIVO Testing Infrastructure

## Overview

This directory contains the complete testing setup for AIVO following a **Testing Pyramid** approach:

```
60% Unit Tests (fast, isolated)
    ├── API service layer (Jest)
    └── Rust/WASM compute (cargo test)
         ↓
30% Integration Tests (real DB, API routes)
    └── Hono routes with local D1 (Miniflare/wrangler dev)
         ↓
10% E2E Tests (full user journeys)
    └── Playwright (Chromium + WebKit)
```

## Quick Start

### Run all tests
```bash
pnpm run test
```

### Run by tier
```bash
pnpm run test:unit        # Unit tests only (API + WASM)
pnpm run test:integration # Integration tests with local D1
pnpm run test:e2e         # End-to-end tests with Playwright
pnpm run test:compute     # Rust/WASM tests only
```

### Run with coverage
```bash
pnpm run test:coverage    # All unit tests with coverage
```

## Test Structure

```
apps/api/
├── __tests__/                    # Unit tests (service layer)
│   └── body-insights.test.ts    # Example unit test
├── tests/
│   ├── integration/             # Integration tests (API routes)
│   │   └── body-metrics.integration.test.ts
│   ├── fixtures/               # Test data factories
│   │   └── index.ts
│   └── setup-db.ts             # DB transaction rollback setup

apps/web/
└── tests/e2e/                   # E2E tests
    └── core-loop.spec.ts       # Core user journey

packages/compute/
└── tests/
    └── unit_test.rs            # Rust unit tests
```

## Database Isolation

Integration tests use **transaction rollback** for speed:

```typescript
// Each test file gets its own transaction
beforeAll(async () => {
  testTx = await initTestDb(envDb);
});

afterAll(async () => {
  await cleanupTestDb(); // Rolls back entire transaction
});
```

This provides clean state with near-zero overhead vs. fresh database creation.

## Coverage Strategy (Ratchet)

- **Current baseline:** 30% (just above actual ~25%)
- **New files:** Must meet 80% coverage
- **Global target:** Increase by 5% each sprint until 80%

Configured in `jest.config.js`:
```js
coverageThreshold: {
  global: {
    branches: 30,  // Increase gradually
    functions: 30,
    lines: 30,
    statements: 30,
  },
}
```

## E2E Core Loop

The critical user journey tested:
1. **Login** (OAuth flow)
2. **Analyze Body** (upload image, AI vision)
3. **View Schedule** (AI-generated workout plan)
4. **Workout Completion** (triggers AI scheduler feedback)

Browsers: Chromium + WebKit (covers 90% of user base)

## CI Integration

Three new jobs added to `.github/workflows/ci.yml`:

1. **integration-tests** - Runs after build, starts local wrangler dev
2. **e2e-tests** - Runs after build, starts Next.js server, runs Playwright
3. **WASM tests** - Already exists (`pnpm --filter @aivo/compute test`)

All upload artifacts for debugging.

## Fixtures

Use the factory pattern for test data:

```typescript
import { userFactory, bodyMetricFactory, testScenarios } from "../tests/fixtures";

const user = userFactory.default({ fitnessLevel: "advanced" });
const recentMetric = bodyMetricFactory.recent(userId, daysAgo: 0);
const completeProfile = testScenarios.completeUser();
```

## WASM Mocking

For unit tests that need to mock WASM functions:

```typescript
import { configureWasmMock, createWasmMockModule } from "@aivo/compute/tests/wasm-mock";

configureWasmMock("calculate_1rm", 150);
// or use jest.mock auto-mocking
```

## Environment Variables

### Integration tests
- `API_URL` - Points to local wrangler dev (http://localhost:8787)

### E2E tests
- `E2E_BASE_URL` - Web server URL (http://localhost:3000)

## Adding New Tests

### Unit test (service layer)
```typescript
// apps/api/__tests__/my-service.test.ts
describe("MyService", () => {
  test("should do something", () => {
    expect(myFunction()).toEqual(expected);
  });
});
```

### Integration test (API route)
```typescript
// apps/api/tests/integration/my-route.integration.test.ts
describe("MyRoute", () => {
  let testDb: ReturnType<typeof getTestDb>;
  
  beforeAll(async () => {
    testDb = await initTestDb(envDb);
  });
  
  afterAll(async () => {
    await cleanupTestDb();
  });
  
  test("should handle request", async () => {
    // Use testDb and createMockContext
  });
});
```

### E2E test
```typescript
// apps/web/tests/e2e/my-journey.spec.ts
import { test, expect } from "@playwright/test";

test("should complete my journey", async ({ page }) => {
  await page.goto("/login");
  // ... test steps
});
```

## Troubleshooting

### "Database not initialized" error
Make sure you call `initTestDb()` in `beforeAll()` and use `getTestDb()` in tests.

### WASM mock not working
Ensure you're importing from `@aivo/compute/tests/wasm-mock` and that Jest picks up the `jest.mock` call.

### Integration tests too slow
Check that you're using transaction rollback, not creating fresh databases. The `setup-db.ts` helper handles this.

### Playwright browsers not found
Run `pnpm --filter @aivo/web exec playwright install chromium webkit`

## Coverage Reports

After running tests with coverage:
- `coverage/api-unit/lcov-report/index.html` - Unit test coverage
- `coverage/api-integration/lcov-report/index.html` - Integration coverage
- `coverage/compute/lcov-report/index.html` - WASM coverage

Open in browser to see uncovered lines.

## Next Steps

1. Write unit tests for all service layer functions
2. Add integration tests for each API route (focus on auth, validation, DB operations)
3. Expand E2E to cover secondary journeys (nutrition logging, social features)
4. Monitor coverage and increment ratchet thresholds
