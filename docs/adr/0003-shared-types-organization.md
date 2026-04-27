# ADR 0003: Shared Types Organization

## Status
**Accepted** (Proposed - needs team approval)

## Context

The current `@aivo/shared-types` package is a **monolithic 2000+ line file** (`index.ts`) with 200+ exports mixed together:

```typescript
// Current structure (all in one file)
export interface User { ... }
export interface BodyMetric { ... }
export interface Workout { ... }
export interface Nutrition { ... }
export interface AiChat { ... }
// ... 200+ more exports
```

**Problems:**
1. **Navigation difficulty** - Hard to find specific types in large file
2. **Circular dependency risk** - No modular boundaries
3. **Testing challenges** - Cannot test individual type groups in isolation
4. **Import performance** - Importing one type pulls all type definitions
5. **Onboarding overhead** - New contributors must understand entire type system at once
6. **Merge conflicts** - Multiple developers editing same file

## Decision

We will **split shared types into domain-specific modules** using the **Barrel Pattern**:

### New Structure

```
packages/core/types/
├── user/
│   ├── user.ts           # User, Profile, Auth types
│   ├── auth.ts
│   ├── profile.ts
│   ├── goals.ts
│   └── index.ts          # export * from './user' etc.
├── body/
│   ├── metrics.ts        # BodyMetric, BodyComposition
│   ├── photos.ts         # BodyPhoto, PhotoUpload
│   ├── heatmap.ts        # HeatmapVectorPoint, MuscleZone
│   ├── vision.ts         # VisionAnalysis, PostureAssessment
│   └── index.ts
├── workout/
│   ├── routine.ts        # WorkoutRoutine, RoutineExercise
│   ├── session.ts        # WorkoutSession, SetData
│   ├── exercise.ts       # Exercise, ExerciseType
│   └── index.ts
├── nutrition/
│   ├── food.ts           # FoodItem, NutritionData
│   ├── log.ts            # FoodLog, DailyNutritionSummary
│   ├── goals.ts          # MacroTargets, NutritionGoals
│   └── index.ts
├── ai/
│   ├── chat.ts           # ChatMessage, Conversation
│   ├── memory.ts         # MemoryNode, MemoryEdge
│   ├── models.ts         # ModelConfig, ModelProvider
│   └── index.ts
├── common/
│   ├── api.ts            # ApiResponse, ApiError, Pagination
│   ├── types.ts          # Gender, FitnessLevel, enums
│   └── index.ts
└── index.ts              # Master barrel - export all domains
```

### Usage Examples

**Before:**
```typescript
import { User, BodyMetric, WorkoutRoutine, FoodItem } from '@aivo/shared-types';
```

**After:**
```typescript
// Import specific domain (tree-shakable)
import type { User } from '@aivo/core/types/user';
import type { BodyMetric } from '@aivo/core/types/body';
import type { WorkoutRoutine } from '@aivo/core/types/workout';
import type { FoodItem } from '@aivo/core/types/nutrition';

// Or import everything from master barrel
import type { User, BodyMetric, WorkoutRoutine, FoodItem } from '@aivo/core/types';
```

### Barrel Pattern Implementation

Each domain has its own `index.ts`:

```typescript
// packages/core/types/user/index.ts
export * from './user';
export * from './auth';
export * from './profile';
export * from './goals';
```

Master barrel:

```typescript
// packages/core/types/index.ts
export * from './user';
export * from './body';
export * from './workout';
export * from './nutrition';
export * from './ai';
export * from './common';
```

## Migration Strategy

### Phase 1: Create new structure (no breaking changes)
1. Create `packages/core/types/` with domain folders
2. Move type definitions from old `index.ts` to appropriate files
3. Keep old `@aivo/shared-types` as **re-export shim**:
   ```typescript
   // packages/shared-types/src/index.ts (deprecated)
   export * from '@aivo/core/types';
   ```

### Phase 2: Update internal packages incrementally
1. Update `@aivo/db` to use new paths
2. Update `@aivo/api` routes and services
3. Update `@aivo/memory-service`
4. Update `@aivo/api-client`
5. Update `apps/web`
6. Update `apps/mobile`

### Phase 3: Remove deprecated package
1. After all dependents migrated (2-3 weeks), delete `@aivo/shared-types`
2. Update `pnpm-workspace.yaml` to remove it
3. Update all documentation

## Benefits

### 1. **Tree Shaking**
- Import only needed types
- Smaller bundle sizes for frontend apps
- Better TypeScript compilation performance

### 2. **Maintainability**
- Domain experts can work on specific type groups without conflicts
- Easier code review (smaller diffs)
- Clear ownership boundaries

### 3. **Discoverability**
- New developers can explore one domain at a time
- IDE autocomplete works better with focused imports
- Documentation can be organized by domain

### 4. **Testing**
- Can test each domain's types independently
- Easier to validate type constraints per domain

### 5. **Evolution**
- Can evolve domains independently
- Deprecate entire domains without affecting others
- Version domains separately if needed in future

## Considerations

### Import Path Changes
All existing imports will need updating:
```typescript
// Old
import type { User } from '@aivo/shared-types';

// New (shim works initially)
import type { User } from '@aivo/shared-types'; // Still works via re-export
// OR
import type { User } from '@aivo/core/types/user'; // Recommended
```

### Backward Compatibility
Maintain re-export shim for at least 2-3 release cycles to allow gradual migration.

### TypeScript Config
Update `tsconfig.base.json` to support new paths:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@aivo/shared-types": ["packages/shared-types/src"],
      "@aivo/core/types": ["packages/core/types/src"],
      "@aivo/core/types/*": ["packages/core/types/src/*"]
    }
  }
}
```

## Consequences

### Positive
- Better code organization and discoverability
- Improved build performance (tree-shaking)
- Reduced merge conflicts
- Easier to onboard new developers
- Clearer domain boundaries

### Negative
- Migration effort (~1 week for full codebase update)
- Temporary duplication (shim + new structure)
- More verbose import paths (can use shim during transition)
- Need to update documentation

### Risks
- Breaking imports if shim removed too early
- Incomplete migration leaving mixed patterns
- Circular dependencies between domains (must be careful)

---

## Related Decisions
- ADR 0001: Monorepo Package Organization
- ADR 0004: API Route Structure
