# ADR-006: Standardize API Service Layer Pattern

**Status:** Proposed  
**Date:** 2026-04-29  
**Author:** Senior Solution Architect  
**Reviewers:** Techlead, API Team  

---

## Context

The AIVO API (`apps/api/src`) currently has an inconsistent architecture:

- Some routes (`biometric.ts`, `body.ts`, `nutrition/`) properly delegate to a service layer
- Other routes (`health.ts`, `workouts.ts`, `users.ts`, `calc.ts`, etc.) contain business logic directly in the route handlers

This inconsistency leads to:
- Difficulty in testing business logic (tightly coupled to HTTP layer)
- Code duplication across routes
- Mixed concerns (HTTP handling mixed with domain logic)
- Harder to reuse business logic in background jobs or cron tasks

---

## Decision

We will adopt a **consistent service layer pattern** for all API routes:

```
Route Handler (HTTP concerns)
├── Authentication middleware
├── Validation (Zod schemas)
├── Swagger/OpenAPI documentation
├── HTTP status code handling
└── Delegation to Service Layer

Service Layer (Business logic)
├── Domain operations
├── Database access (via Drizzle)
├── WASM compute calls
├── External API integrations
└── Transaction management
```

**Architecture diagram:**

```
┌─────────────────┐
│   HTTP Request  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│         Route Handler               │
│  (auth, validation, response fmt)   │
└────────┬────────────────────────────┘
         │
         │ calls
         ▼
┌─────────────────────────────────────┐
│         Service Layer               │
│  (business logic, data access)      │
└────────┬─────────────────────────────┘
         │
         │ uses
         ▼
┌─────────────────────────────────────┐
│    Database (D1 via Drizzle)        │
│    Compute (WASM)                   │
│    External APIs (OpenAI, etc.)     │
└─────────────────────────────────────┘
```

---

## Implementation Rules

1. **Route files** (`src/routes/*.ts`) MUST:
   - Import service functions from `../services/`
   - Handle only HTTP-specific concerns (auth, validation, status codes, headers)
   - Be thin (typically < 100 lines)
   - Document endpoints with JSDoc for OpenAPI generation

2. **Service files** (`src/services/*.ts`) MUST:
   - Export pure functions (or class methods)
   - Accept context/env as first parameter: `(c: Context, ...args) => Promise<Result>`
   - Contain all business logic
   - Handle database transactions
   - Call WASM modules
   - Be testable without HTTP layer

3. **Types**:
   - Request/Response types can be in route file for OpenAPI compatibility
   - Domain types should be in `shared-types` package
   - Service return types should be domain types, not HTTP responses

4. **Error handling**:
   - Services throw `APIError` for known errors (validation, not found, etc.)
   - Services throw generic `Error` for unexpected errors
   - Routes catch and convert to appropriate HTTP responses

5. **Validation**:
   - Routes validate input using Zod schemas
   - Services assume validated inputs (defensive programming still applies)
   - Services validate business rules (e.g., "user can only edit own workout")

---

## Example: Before vs After

### BEFORE (Mixed concerns in `health.ts`)

```typescript
// routes/health.ts
export const HealthRouter = () => {
  const router = new Hono<{ Bindings: AppEnv }>();

  router.get("/", async (c) => {
    // ❌ Business logic in route
    const db = createDrizzleInstance(c.env.DB);
    const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table'");

    const start = Date.now();
    const wasmLoaded = await checkWasm();
    const latency = Date.now() - start;

    // ❌ Complex logic mixed with HTTP
    return c.json({
      status: "healthy",
      database: { connected: true, tables: tables.results },
      compute: { wasmLoaded, latency },
    });
  });

  return router;
};
```

### AFTER (Clean separation)

```typescript
// services/health.ts
export async function checkHealth(env: AppEnv): Promise<HealthResponse> {
  const db = createDrizzleInstance(env.DB);

  // ✅ Business logic in service
  const [dbStatus, wasmStatus] = await Promise.all([
    checkDatabase(db),
    checkWasm(),
  });

  return {
    status: dbStatus.healthy && wasmStatus.healthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    database: dbStatus,
    compute: wasmStatus,
  };
}

// routes/health.ts
export const HealthRouter = () => {
  const router = new Hono<{ Bindings: AppEnv }>();

  router.get("/", async (c) => {
    // ✅ Route is thin: just call service and return
    const result = await checkHealth(c.env);
    return c.json(result);
  });

  return router;
};
```

---

## Migration Plan

### Step 1: Create Service Files

For each route that doesn't have a service:

| Route File | Service File | Estimated Effort |
|------------|--------------|------------------|
| `health.ts` | `services/health.ts` | 0.5 day |
| `workouts.ts` | `services/workouts.ts` | 2 days |
| `users.ts` | `services/users.ts` | 1 day |
| `calc.ts` | `services/calc.ts` | 0.5 day |
| `admin-test.ts` | (optional - dev only) | 0.5 day |

Routes that already have services: `biometric.ts`, `body.ts`, `body-photos.ts`, `ai.ts`, `nutrition.ts`, `posture.ts`, `live-workout.ts`, `metabolic.ts`, `infographic.ts`, `export.ts`, `form-analyze.ts`, `digital-twin.ts`, `acoustic.ts`, `gamification.ts`, `monthly-reports.ts` ✅

### Step 2: Migrate Incrementally

1. Create service file with all business logic extracted from route
2. Write unit tests for service (if not exists)
3. Update route to import and delegate
4. Test route still works
5. Repeat for next route

**Order:** Start with `health.ts` (simplest), then `calc.ts`, then `users.ts`, then `workouts.ts` (most complex).

### Step 3: Verify

- All existing tests pass
- No regression in functionality
- Services have >80% unit test coverage
- Routes are < 100 lines each

---

## Consequences

### Positive

- ✅ **Testability**: Services can be unit tested without HTTP layer
- ✅ **Reusability**: Services can be called from cron jobs, queues, etc.
- ✅ **Maintainability**: Clear separation of concerns
- ✅ **Consistency**: All routes follow same pattern
- ✅ **Onboarding**: Easier for new developers to understand

### Negative

- ⚠️ More files (service + route)
- ⚠️ Initial refactoring effort (1-2 weeks)
- ⚠️ Need to maintain two layers

### Neutral

- ↔️ Slight performance overhead (negligible function call)
- ↔️ Need to decide what goes where (learning curve)

---

## Alternatives Considered

| Alternative | Why Not Chosen |
|-------------|----------------|
| Keep current mixed pattern | Inconsistent, hard to maintain |
| Move all logic to services (but don't enforce) | Won't fix existing inconsistency |
| Use class-based services (OOP) | Functional pattern fits Hono/TypeScript better |
| Single file per feature (route+service combined) | Hard to test, mixes concerns |

---

## Related Decisions

- ADR-005: Service Layer Architecture (partial - this ADR completes it)
- ADR-007: Shared Types Package Structure

---

**Approval required:** Techlead, API Team Lead

**Implementation owner:** API Team

**Target completion:** 2026-05-14 (2 weeks)
