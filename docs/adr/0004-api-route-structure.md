# ADR 0004: API Route Structure

## Status
**Accepted** (Proposed - needs team approval)

## Context

The current API (`apps/api/src/routes/`) has **22 route files** in a flat structure:

```
routes/
├── acoustic.ts
├── admin-test.ts
├── ai.ts
├── auth.ts
├── biometric.ts
├── body-photos.ts
├── body.ts
├── calc.ts
├── cron.ts
├── digital-twin.ts
├── export.ts
├── form-analyze.ts
├── gamification.ts
├── health.ts
├── infographic.ts
├── live-workout.ts
├── metabolic.ts
├── monthly-reports.ts
├── nutrition.ts
├── posture.ts
├── users.ts
└── workouts.ts
```

**Problems:**
1. **No domain grouping** - Related endpoints scattered (body, body-photos, biometric all separate)
2. **Mixed responsibilities** - Some routes handle multiple related domains
3. **Difficult navigation** - Cannot quickly find all workout-related endpoints
4. **Testing organization** - Tests mirror the same flat structure
5. **Scalability** - Adding new domain means adding to flat list

## Decision

We will reorganize routes into **domain-driven feature groups** with subdirectories:

```
apps/api/src/
├── routes/
│   ├── auth/
│   │   ├── google.ts
│   │   ├── facebook.ts
│   │   ├── verify.ts
│   │   ├── logout.ts
│   │   └── index.ts (router aggregator)
│   ├── users/
│   │   ├── profile.ts
│   │   ├── settings.ts
│   │   ├── goals.ts
│   │   └── index.ts
│   ├── workouts/
│   │   ├── routines/
│   │   │   ├── create.ts
│   │   │   ├── update.ts
│   │   │   ├── delete.ts
│   │   │   ├── get.ts
│   │   │   └── index.ts
│   │   ├── sessions/
│   │   │   ├── log.ts
│   │   │   ├── complete.ts
│   │   │   ├── history.ts
│   │   │   └── index.ts
│   │   ├── exercises.ts
│   │   ├── live/
│   │   │   ├── start.ts
│   │   │   ├── stop.ts
│   │   │   ├── timer.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── body/
│   │   ├── metrics.ts
│   │   ├── photos/
│   │   │   ├── upload.ts
│   │   │   ├── analyze.ts
│   │   │   ├── heatmaps.ts
│   │   │   └── index.ts
│   │   ├── insights.ts
│   │   └── index.ts
│   ├── nutrition/
│   │   ├── logs.ts
│   │   ├── goals.ts
│   │   ├── analysis.ts
│   │   └── index.ts
│   ├── ai/
│   │   ├── chat.ts
│   │   ├── replan.ts
│   │   ├── vision/
│   │   │   ├── analyze.ts
│   │   │   ├── posture.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── export/
│   │   ├── data.ts
│   │   ├── reports.ts
│   │   └── index.ts
│   ├── social/
│   │   ├── gamification.ts
│   │   ├── leaderboard.ts
│   │   └── achievements.ts
│   ├── admin/
│   │   └── test.ts
│   ├── health.ts
│   └── index.ts (master router aggregator)
├── middleware/
│   ├── auth.ts
│   ├── rate-limit.ts
│   ├── validation.ts
│   ├── errors.ts
│   └── logging.ts
├── services/ (organized by domain, see ADR 0005)
└── utils/
```

## Router Aggregation Pattern

Each feature has an `index.ts` that exports the router:

```typescript
// routes/auth/index.ts
import { googleRouter } from './google';
import { facebookRouter } from './facebook';
import { verifyRouter } from './verify';
import { logoutRouter } from './logout';

export const AuthRouter = [
  googleRouter,
  facebookRouter,
  verifyRouter,
  logoutRouter,
];
```

Main app imports aggregated routers:

```typescript
// src/index.ts
import { AuthRouter } from './routes/auth';
import { UsersRouter } from './routes/users';
import { WorkoutsRouter } from './routes/workouts';
import { BodyRouter } from './routes/body';
// ... etc

app.route('/api/auth', AuthRouter);
app.route('/api/users', UsersRouter);
app.route('/api/workouts', WorkoutsRouter);
// ...
```

## Benefits

1. **Discoverability** - All workout endpoints in one place
2. **Team ownership** - Can assign domain to specific developers
3. **Test organization** - Tests mirror structure
4. **Scalability** - Easy to add new endpoints to domain
5. **Code review** - Domain experts review relevant changes
6. **Documentation** - Can generate API docs by domain

## Migration Strategy

### Phase 1: Create new structure (parallel)
1. Create new `routes/auth/`, `routes/workouts/`, etc.
2. Move route handlers to appropriate files
3. Create aggregator `index.ts` for each domain
4. Keep old route files as **deprecated re-exports**:
   ```typescript
   // routes/auth.ts (deprecated)
   export { AuthRouter } from './auth';
   // Also log deprecation warning in dev mode
   ```

### Phase 2: Update references
1. Update `src/index.ts` to use new aggregated routers
2. Update imports in tests to use new paths
3. Update documentation references

### Phase 3: Remove old files
After 2-3 release cycles with no usage of old paths:
1. Delete flat route files (`auth.ts`, `users.ts`, etc.)
2. Remove deprecation warnings

## Route Design Principles

For each domain, follow these conventions:

### 1. RESTful Resource Routes
```
GET    /api/workouts/routines          - List routines
POST   /api/workouts/routines          - Create routine
GET    /api/workouts/routines/:id      - Get routine
PUT    /api/workouts/routines/:id      - Update routine
DELETE /api/workouts/routines/:id      - Delete routine
```

### 2. Nested Resources
```
GET    /api/workouts/routines/:id/exercises    - List exercises in routine
POST   /api/workouts/routines/:id/exercises    - Add exercise
DELETE /api/workouts/routines/:id/exercises/:eid - Remove exercise
```

### 3. Action Routes
```
POST   /api/workouts/sessions/start     - Start workout session
POST   /api/workouts/sessions/:id/stop  - Stop/completed session
POST   /api/ai/replan                   - Request routine replanning
```

### 4. Query Parameters
```
GET /api/body/metrics?startDate=2024-01-01&endDate=2024-01-31&limit=50
```

### 5. Pagination
```typescript
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

## OpenAPI Documentation

With domain grouping, we can generate better OpenAPI specs:

```typescript
// routes/workouts/routines/index.ts
import { z } from 'zod';
import { OpenAPIHono } from '@hono/zod-openapi';

const CreateRoutineSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  exercises: z.array(z.object({
    exerciseId: z.string(),
    sets: z.number(),
    reps: z.string(), // "10-12" or "AMRAP"
    restSeconds: z.number(),
  })),
});

export const createRoutineRouter = new OpenAPIHono<{ Bindings: AppEnv }>()
  .openapi(
    '/',
    {
      summary: 'Create workout routine',
      tags: ['workouts', 'routines'],
      requestBody: {
        description: 'Routine data',
        content: {
          'application/json': {
            schema: CreateRoutineSchema,
          },
        },
      },
    },
    async (c) => {
      const body = c.req.valid('json');
      // ... handler
    }
  );
```

Tagging by domain (`tags: ['workouts', 'routines']`) groups endpoints in Swagger UI.

## Consequences

### Positive
- Clear domain boundaries
- Easier navigation and maintenance
- Better code organization
- Improved test structure
- Enhanced API documentation

### Negative
- Migration effort (move ~22 files, update imports)
- Temporary duplication during transition
- Need to update all test files
- More directories to navigate

### Risks
- Incomplete migration leaving mixed patterns
- Broken imports if shims removed too early
- Team confusion during transition

---

## Related Decisions
- ADR 0001: Monorepo Package Organization
- ADR 0005: Service Layer Architecture
