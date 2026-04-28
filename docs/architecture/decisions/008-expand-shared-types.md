# ADR-008: Expand Shared-Types Package for Cross-Package Type Safety

**Status:** Proposed  
**Date:** 2026-04-29  
**Author:** Senior Solution Architect  
**Reviewers:** Techlead, Platform Team

---

## Context

The `@aivo/shared-types` package currently contains minimal type definitions, likely only basic user/auth types. This leads to:

- **Type duplication**: API, Web, and Mobile each define their own versions of workout, body, nutrition types
- **Inconsistent interfaces**: Same domain model differs between packages
- **Poor IDE support**: No shared types means no autocomplete across package boundaries
- **Runtime errors**: Mismatched types between API contracts and client usage
- **Maintenance burden**: Type changes must be replicated in multiple places

**Example of duplication:**
- API route `workouts.ts` defines `Workout`, `WorkoutExercise` locally
- Web app re-defines similar types in `src/types/workout.ts`
- Mobile app defines again in `app/types/workout.ts`
- If API adds new field, clients may not know until runtime error

---

## Decision

Expand `@aivo/shared-types` to become the **single source of truth** for all cross-package type definitions, covering:

```
shared-types/
├── src/
│   ├── index.ts           # Barrel export all
│   ├── api.ts             # API response formats (PaginatedResponse, etc.)
│   ├── user.ts            # User, Profile, Settings, Auth
│   ├── workout.ts         # Workout, Routine, Exercise, Set
│   ├── body.ts            # BodyMetric, BodyInsight, BodyHeatmapData
│   ├── nutrition.ts       # Food, Meal, NutritionLog, MacroTargets
│   ├── biometric.ts       # SleepLog, BiometricSnapshot, Correlation
│   ├── gamification.ts    # GamificationProfile, PointTransaction, Streak
│   ├── social.ts          # Club, Event, ClubMember, Message
│   ├── ai.ts              # ChatMessage, MemoryNode, ConversationTurn
│   ├── common.ts          # Result<T,E>, Pagination, SortOrder
│   └── validation.ts      # Zod schemas for runtime validation
```

---

## Implementation Plan

### Phase 1: Audit & Extract (2 days)

1. **Find all type definitions** across codebase:
   ```bash
   # In API
   rg "interface|type .*=" apps/api/src/routes/ apps/api/src/services/ --type ts

   # In Web
   rg "interface|type .*=" apps/web/src/types/ apps/web/src/components/ --type ts

   # In Mobile
   rg "interface|type .*=" apps/mobile/app/types/ apps/mobile/app/services/ --type ts
   ```

2. **Create matrix** of domain types by source:
   | Type | API Definition | Web Definition | Mobile Definition | Shared? |
   |------|----------------|----------------|-------------------|---------|
   | User | ✓ (users.ts) | ✓ (types/user.ts) | ✓ (types/) | ❌ |
   | Workout | ✓ (workouts.ts) | ✓ | ✓ | ❌ |
   | BodyMetric | ✓ (body.ts) | ✓ | ✓ | ❌ |
   | NutritionLog | ✓ (nutrition/) | ✓ | ✓ | ❌ |
   | SleepLog | ✓ (biometric.ts) | ✓ | ✓ | ❌ |
   | GamificationProfile | ✓ (gamification.ts) | ✓ | ✓ | ❌ |

3. **Identify canonical source**: For each type, determine which package has the most complete/accurate definition (usually API).

### Phase 2: Define Shared Types (3 days)

Create files in `packages/shared-types/src/`:

**Example: `workout.ts`**
```typescript
// Workout status as discriminated union
export const WorkoutStatus = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
  PLANNED: 'planned',
} as const;

export type WorkoutStatus = typeof WorkoutStatus[keyof typeof WorkoutStatus];

// Exercise within a workout
export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  name: string;
  sets: ExerciseSet[];
  order: number;
  notes?: string;
}

export interface ExerciseSet {
  setNumber: number;
  weight?: number;      // kg or lbs based on user preference
  reps?: number;
  duration?: number;    // seconds (for timed exercises)
  rpe?: number;         // Rate of Perceived Exertion (1-10)
  isWarmup?: boolean;
  isDropSet?: boolean;
  restTime?: number;    // seconds rest after this set
}

// Full workout
export interface Workout {
  id: string;
  userId: string;
  routineId?: string;
  routineName?: string;
  status: WorkoutStatus;
  startedAt: Date;
  completedAt?: Date;
  exercises: WorkoutExercise[];
  metrics: WorkoutMetrics;
  notes?: string;
  location?: {
    type: 'gym' | 'home' | 'outdoor';
    name?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkoutMetrics {
  totalVolume: number;      // weight × reps × sets
  totalDuration: number;    // seconds
  avgHeartRate?: number;
  caloriesBurned?: number;
  avgRpe?: number;
  totalReps: number;
}

export interface WorkoutFilters {
  status?: WorkoutStatus;
  startDate?: Date;
  endDate?: Date;
  routineId?: string;
  limit: number;
  offset: number;
}

// API response format
export interface WorkoutListResponse {
  success: boolean;
  data: {
    workouts: Workout[];
    total: number;
    limit: number;
    offset: number;
  };
}
```

**Example: `validation.ts` (optional but recommended)**
```typescript
import { z } from 'zod';

// Zod schemas that mirror TypeScript types
export const workoutSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  routineId: z.string().uuid().optional(),
  status: z.enum(['in_progress', 'completed', 'abandoned', 'planned']),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  exercises: z.array(z.object({
    id: z.string(),
    exerciseId: z.string().uuid(),
    name: z.string(),
    sets: z.array(z.object({
      setNumber: z.number(),
      weight: z.number().positive().optional(),
      reps: z.number().int().positive().optional(),
      // ...
    })),
    order: z.number(),
  })),
  // ...
});

export type Workout = z.infer<typeof workoutSchema>;
```

### Phase 3: Update API (1 day)

1. Remove local type definitions from route files
2. Import from `@aivo/shared-types`:
   ```typescript
   import { Workout, WorkoutListResponse } from '@aivo/shared-types/workout';
   ```
3. Update service signatures to use shared types
4. Update OpenAPI schemas to use shared zod schemas (if using validation.ts)

### Phase 4: Update Web (1 day)

1. Remove local types from `apps/web/src/types/`
2. Update imports:
   ```typescript
   // Before
   import { Workout } from '@/types/workout';
   // After
   import { Workout } from '@aivo/shared-types/workout';
   ```
3. Update any type usages that don't match (minor adjustments)

### Phase 5: Update Mobile (1 day)

Same as Web.

### Phase 6: Test & Verify (1 day)

1. Type check all packages:
   ```bash
   pnpm run type-check
   ```
2. Ensure no `any` types introduced
3. Run tests (should still pass)
4. Build all packages to ensure no circular dependencies

---

## Type Coverage Goals

By end of migration, `@aivo/shared-types` should export:

| Domain | Types | Estimated Count |
|--------|-------|-----------------|
| User | User, Profile, Settings, AuthTokens | 5-10 |
| Workout | Workout, Routine, Exercise, Set, Metrics, Filters | 15-20 |
| Body | BodyMetric, BodyInsight, BodyHeatmapData, PostureAnalysis | 10-15 |
| Nutrition | Food, Meal, NutritionLog, MacroTargets, FoodDatabase | 15-20 |
| Biometric | SleepLog, Snapshot, Correlation, RecoveryScore | 10-15 |
| Gamification | Profile, Transaction, Streak, LeaderboardEntry | 10-15 |
| Social | Club, Event, Member, Message | 15-20 |
| AI | ChatMessage, MemoryNode, Conversation, Plan | 10-15 |
| Common | Result, Pagination, Sort, ApiResponse | 5-10 |
| **Total** | | **~100 types** |

---

## Benefits

1. **Type safety across boundaries**: API contract matches client usage
2. **Single source of truth**: One place to update types
3. **Better DX**: IDE autocomplete works across packages
4. **Reduced bugs**: Compile-time catching of mismatched types
5. **Easier refactoring**: Change type in one place
6. **Runtime validation**: Optional Zod schemas enable runtime checks
7. **Documentation**: Types serve as live documentation

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Circular dependencies between shared-types and other packages | Medium | High | shared-types must have zero runtime deps (only types) |
| Types too specific to one package, not truly shared | Medium | Medium | Design review: focus on intersection of needs |
| Breaking changes cause widespread compile errors | High | Medium | Incremental migration; fix errors as they appear |
| Shared-types becomes dumping ground for all types | Low | Medium | Clear guidelines: only cross-package types |
| Performance: large type exports slow down IDE | Low | Low | Tree-shakeable exports; use index barrel carefully |

---

## Guidelines for Adding Types

✅ **DO add to shared-types if:**
- Type is used by 2+ packages (API + web, API + mobile, web + mobile)
- Type represents an API request/response
- Type is a domain model (User, Workout, etc.)
- Type is a shared constant (enum, union type)

❌ **DON'T add to shared-types if:**
- Type is internal to one package (e.g., API-only error handler)
- Type is implementation detail (e.g., DatabaseConnection)
- Type is test mock data
- Type could be in `common/` or `utils/` of that package

---

## Alternatives Considered

### Alternative 1: Keep Separate Types

**Why not:** Duplication causes drift and runtime errors; defeats purpose of TypeScript.

### Alternative 2: Generate Types from OpenAPI

Use `openapi-typescript` to generate types from API spec.

**Why not:** 
- Requires perfect OpenAPI coverage first
- Generated types may not match internal domain models
- Hard to customize
- Does not cover types not in API (e.g., internal domain models)

**Future possibility:** Once OpenAPI is complete, generate API-specific types. But shared-types should still exist for domain models.

### Alternative 3: Use `any` to Avoid Work

**Why not:** Defeats purpose of TypeScript; technical debt.

---

## Implementation Checklist

- [ ] Audit existing types across all packages
- [ ] Create type matrix document
- [ ] Design shared type structure (folder layout)
- [ ] Implement `src/user.ts`
- [ ] Implement `src/workout.ts`
- [ ] Implement `src/body.ts`
- [ ] Implement `src/nutrition.ts`
- [ ] Implement `src/biometric.ts`
- [ ] Implement `src/gamification.ts`
- [ ] Implement `src/social.ts`
- [ ] Implement `src/ai.ts`
- [ ] Implement `src/common.ts`
- [ ] Implement `src/validation.ts` (optional)
- [ ] Update `src/index.ts` barrel exports
- [ ] Update API imports (20+ route files + services)
- [ ] Update Web imports (all type references)
- [ ] Update Mobile imports
- [ ] Run full type check: `pnpm run type-check`
- [ ] Fix any type errors
- [ ] Add tests for type exports (compile-time)
- [ ] Update documentation (README in shared-types)
- [ ] Update architecture docs to reference shared-types

---

## Related Decisions

- ADR-006: Service Layer Standardization (services use shared types)
- ADR-009: API Response Format Standardization

---

**Approval required:** Techlead, Platform Team

**Implementation owner:** Platform Team (coordinate with API, Web, Mobile teams)

**Target completion:** 2026-05-21 (3 weeks, parallel with other phases)
