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

## Running Tests

### All Packages

```bash
# Run all tests
pnpm run test

# Type check all
pnpm run type-check

# Lint all
pnpm run lint

# Coverage report
pnpm run coverage
```

### Package-Specific

```bash
# Memory service
cd packages/memory-service
pnpm test

# API
cd apps/api
pnpm test

# Web
cd apps/web
pnpm test

# Mobile
cd apps/mobile
pnpm test
```

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
# Combined script (if exists)
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

## Mock Data for Testing

The mock data system provides a complete fake dataset for UI/UX and API testing.

### Admin User Profile

- **Email**: `admin@aivo.ai`
- **User ID**: `admin-user-001`
- **Profile**: 28yo male, 180cm, 82.5kg, intermediate fitness level
- **Workout History**: 4 weeks of completed workouts (4 days/week upper/lower split)
- **Body Metrics**: 30 days of daily measurements with trends
- **Gamification**: Level 12, 2850 points, 7-day streak
- **Memories**: 8 extracted memory nodes with relationships
- **Conversations**: 15 chat messages with AI coach
- **Goals**: 3 active fitness goals
- **Nutrition**: Food logs and daily summaries
- **Sleep**: 30 days of sleep tracking
- **Badges**: 3 earned badges

### Quick Setup

```bash
# Navigate to db package
cd packages/db

# Apply migrations to local D1 database
pnpm exec wrangler d1 migrations apply aivo-db --local

# Seed with mock data
pnpm run seed:mock
```

Expected output:
```
🌱 Starting database seeding...

📝 Inserting admin user...
   ✅ Created user: admin@aivo.ai
📝 Inserting OAuth session...
   ✅ Created session for provider: google
📝 Inserting gamification profile...
   ✅ Profile: Level 12, 2850 points
📝 Inserting 31 body metrics records...
   ✅ Body metrics history populated (31 days)
...
✅ Database seeding completed successfully!

📊 Summary:
   - User: admin@aivo.ai
   - Workouts: 16 completed
   - Memories: 8 stored
   - Conversations: 15 messages
   - Gamification: Level 12, 2850 points
   - Streak: 7 days current, 21 days best
```

### Admin API Endpoints (Dev Only)

Available at `/api/admin/test/*` when `NODE_ENV !== "production"`:

| Endpoint | Description |
|----------|-------------|
| `GET /health-check` | API health status |
| `GET /stats` | Dashboard overview statistics |
| `GET /user/:userId` | Detailed user profile with all related data |
| `GET /workouts` | All workouts (filterable by type) |
| `GET /conversations` | Chat history |
| `GET /memories` | Memory nodes (filterable by type/confidence) |
| `GET /body-metrics` | Body measurement history |
| `GET /recovery` | Recovery and fatigue data |
| `GET /gamification` | Points, badges, streaks |
| `GET /ai-activity` | AI interactions summary |

#### Example Usage

```bash
# Get user profile with everything
curl http://localhost:8787/api/admin/test/user/admin-user-001

# Get workout history
curl "http://localhost:8787/api/admin/test/workouts?limit=20"

# Get memory analytics
curl "http://localhost:8787/api/admin/test/memories?minConfidence=0.8"

# Get recovery trends
curl http://localhost:8787/api/admin/test/recovery
```

### Data Characteristics

#### Workout Pattern
- 4 days/week (Mon, Tue, Thu, Fri)
- Upper/Lower split
- Progressive overload (weights increase over weeks)
- Heavy deadlift day on Friday

#### Body Metrics Trends
- Weight: starts at 83kg, trending down to ~81kg
- Body fat: 18.5% → 15% over 30 days
- Muscle mass: slowly increasing
- BMI: 25.4 → 24.7

#### Recovery Patterns
- Recovery score higher on non-workout days (90+)
- Lower recovery on heavy workout days (70-80)
- Sleep quality: consistent 7-8 hours
- Soreness pattern matches workout schedule (legs sore after lower days)

#### Memory Types Distributed
- fact: 3 (profile info, injury history, goal)
- preference: 1 (morning workout preference)
- event: 1 (PR achievement)
- constraint: 1 (4 days/week limitation)
- emotional: 1 (motivation pattern)
- entity: 1 (gym location)

### Testing Scenarios

1. **Dashboard Overview** - Use `/stats` endpoint to test dashboard cards
2. **Profile Page** - Use `/user/:userId` to test complete profile view
3. **Workout History** - Use `/workouts` to test workout list and filters
4. **AI Chat Integration** - Use `/conversations` to test chat history display
5. **Analytics Charts** - Use `/body-metrics` and `/recovery` for chart data
6. **Gamification** - Use `/gamification` to test widgets and badges

### Resetting Data

To reset the mock data:

```bash
# Clear all tables for the admin user
# Or delete the local database and reapply migrations:

cd packages/db
rm -rf .wrangler/state  # Clears local D1 database
pnpm exec wrangler d1 migrations apply aivo-db --local
pnpm run seed:mock
```

### Extending Mock Data

Add new data to `packages/db/src/__tests__/mock-data.ts`:

```typescript
// Add to mockData object
mockData.newTable = [
  {
    id: generateId(),
    userId: adminUser.id,
    // ... your fields
  },
];
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
detox test -c ios
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

Coverage targets:

| Package | Target |
|---------|--------|
| `@aivo/memory-service` | 90% |
| `@aivo/api` | 80% |
| `@aivo/web` | 75% |
| `@aivo/mobile` | 70% |

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

**Last Updated:** 2026-04-25
**Testing Framework:** Jest 29, Vitest (planned)
**Coverage Tool:** Istanbul/NYC
