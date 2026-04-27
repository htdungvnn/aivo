# ADR 0005: Service Layer Architecture

## Status
**Accepted** (Proposed - needs team approval)

## Context

The API currently has a `services/` directory with 26 service files:

```
services/
├── biometric.ts
├── body-insights.ts
├── db.ts
├── form-analyzer.ts
├── infographic-ai.ts
├── infographic-renderer.ts
├── live-workout.ts
├── notifications.ts
├── r2.ts
├── user-stats.ts
├── validation.ts
└── vision-analysis.ts
```

**Issues:**
1. **Mixed concerns** - Services for storage (r2.ts), database (db.ts), business logic (form-analyzer.ts) all mixed
2. **No clear categorization** - Hard to understand service responsibilities at a glance
3. **Tight coupling** - Some services depend on others without clear interfaces
4. **Testing difficulty** - Services have mixed abstraction levels
5. **Scalability** - Flat structure doesn't support growth

## Decision

We will reorganize services into **domain-driven categories** with clear separation of concerns:

```
apps/api/src/
├── services/
│   ├── ai/                    # AI/ML services
│   │   ├── openai.ts         # OpenAI API integration
│   │   ├── anthropic.ts      # Anthropic Claude integration
│   │   ├── model-selector.ts # Auto model selection
│   │   ├── chat.ts           # Conversation orchestration
│   │   ├── embeddings.ts     # Embedding generation
│   │   └── index.ts
│   ├── memory/               # Memory service (existing but move here)
│   │   ├── summarizer.ts
│   │   ├── vector-search.ts
│   │   ├── compression.ts
│   │   ├── graph.ts
│   │   └── index.ts
│   ├── compute/              # WASM compute wrappers
│   │   ├── fitness.ts        # Wrap @aivo/compute
│   │   ├── optimizer.ts      # Wrap @aivo/optimizer
│   │   ├── posture.ts        # Posture analysis
│   │   ├── acoustic.ts       # Acoustic myography
│   │   └── index.ts
│   ├── storage/              # Storage abstractions
│   │   ├── r2.ts             # R2 operations (photos, exports)
│   │   ├── d1.ts             # D1 query helpers
│   │   ├── kv.ts             # KV namespace operations
│   │   └── index.ts
│   ├── notifications/        # Notification services
│   │   ├── email.ts          # Email (Resend)
│   │   ├── push.ts           # Expo push notifications
│   │   └── index.ts
│   ├── body/                 # Body analysis services
│   │   ├── metrics.ts        # Body metric calculations
│   │   ├── photos.ts         # Photo upload/processing
│   │   ├── insights.ts       # Body insights generation
│   │   ├── heatmaps.ts       # Heatmap generation
│   │   └── index.ts
│   ├── workouts/             # Workout services
│   │   ├── routines.ts       # Routine CRUD and management
│   │   ├── sessions.ts       # Workout session tracking
│   │   ├── live.ts           # Live workout tracking
│   │   ├── recommendations.ts # AI recommendations
│   │   └── index.ts
│   ├── nutrition/            # Nutrition services
│   │   ├── analysis.ts       # Food analysis
│   │   ├── logging.ts        # Food log management
│   │   ├── goals.ts          # Nutrition goal tracking
│   │   └── index.ts
│   ├── social/               # Social/gamification services
│   │   ├── gamification.ts
│   │   ├── leaderboard.ts
│   │   ├── achievements.ts
│   │   └── index.ts
│   └── export/               # Export services
│       ├── data.ts          # Data export (CSV, Excel, JSON)
│       ├── reports.ts       # Report generation
│       └── index.ts
├── middleware/
└── utils/
```

## Service Design Principles

### 1. Single Responsibility
Each service focuses on one domain:

```typescript
// Good: Focused on nutrition domain
export class NutritionService {
  async logFood(userId: string, food: FoodLogCreate): Promise<FoodLog> { ... }
  async getDailySummary(userId: string, date: Date): Promise<DailyNutritionSummary> { ... }
  async calculateMacros(goals: NutritionGoals): Promise<MacroTargets> { ... }
}

// Bad: Mixed concerns
export class MixedService {
  async logFood(...) { ... }
  async uploadPhoto(...) { ... }  // ← Should be in BodyService
  async sendEmail(...) { ... }    // ← Should be in NotificationService
}
```

### 2. Dependency Injection
Services receive dependencies via constructor:

```typescript
export class NutritionService {
  constructor(
    private db: D1Database,
    private r2: R2Bucket,
    private ai: AIService, // Dependency on AI service
    private logger: Logger
  ) {}

  async analyzeFoodImage(imageUrl: string): Promise<FoodVisionAnalysis> {
    // Use injected dependencies
    const result = await this.ai.analyzeFood(imageUrl);
    return result;
  }
}
```

### 3. Interface-Based Design
Define interfaces for testability:

```typescript
// interfaces.ts
export interface NutritionRepository {
  createLog(log: FoodLogCreate): Promise<FoodLog>;
  getLogs(userId: string, date: Date): Promise<FoodLog[]>;
  updateMacros(userId: string, macros: MacroTargets): Promise<void>;
}

export class NutritionService {
  constructor(private repo: NutritionRepository) {}
}

// Production implementation
export class D1NutritionRepository implements NutritionRepository {
  constructor(private db: D1Database) {}
  // ... implementations
}

// Test implementation (mock/fixture)
export class MockNutritionRepository implements NutritionRepository {
  // ... test doubles
}
```

### 4. Error Handling
Use typed errors:

```typescript
export class ServiceError extends Error {
  constructor(
    message: string,
    public code: ServiceErrorCode,
    public status: number = 500
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export enum ServiceErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE = 'DUPLICATE',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}
```

## Migration from Existing Services

### Current Service Functions → Class-Based Services

**Before:**
```typescript
// services/biometric.ts (functions)
export async function getBiometricSnapshot(userId: string): Promise<BiometricSnapshot> {
  // ... logic
}

export async function updateBiometrics(
  userId: string,
  data: BiometricUpdate
): Promise<BiometricSnapshot> {
  // ... logic
}
```

**After:**
```typescript
// services/biometrics/index.ts
export class BiometricService {
  constructor(
    private db: D1Database,
    private cache: KVNamespace
  ) {}

  async getSnapshot(userId: string): Promise<BiometricSnapshot> {
    // ... logic using this.db, this.cache
  }

  async update(userId: string, data: BiometricUpdate): Promise<BiometricSnapshot> {
    // ... logic
  }
}

// Singleton instance for production
export const biometricService = new BiometricService(
  env.DB,
  env.BIOMETRIC_CACHE
);
```

### Route Handler Usage

```typescript
// routes/biometric.ts
import { biometricService } from '../services/biometrics';

app.get('/api/biometric/snapshot', async (c) => {
  const userId = c.req.valid('json').userId;
  const snapshot = await biometricService.getSnapshot(userId);
  return c.json(snapshot);
});
```

## Testing Strategy

### Unit Tests (per service)
```typescript
// services/biometrics/__tests__/index.test.ts
import { MockNutritionRepository } from '../../../test-utils/mocks';

describe('BiometricService', () => {
  let service: BiometricService;
  let mockRepo: MockBiometricRepository;

  beforeEach(() => {
    mockRepo = new MockBiometricRepository();
    service = new BiometricService(mockRepo);
  });

  test('getSnapshot returns latest biometrics', async () => {
    mockRepo.addBiometric({ userId: '123', weight: 70 });
    const result = await service.getSnapshot('123');
    expect(result.weight).toBe(70);
  });
});
```

### Integration Tests
Test service with real database (test D1):
```typescript
// services/biometrics/__tests__/integration.test.ts
import { createTestDb } from '../../../test-utils/db';

describe('BiometricService (Integration)', () => {
  let db: D1Database;
  let service: BiometricService;

  beforeAll(async () => {
    db = await createTestDb();
    service = new BiometricService(db);
  });

  afterAll(async () => {
    await db.close();
  });

  test('persists biometrics to database', async () => {
    const result = await service.update('user-123', { weight: 75 });
    const fromDb = await db.prepare('SELECT * FROM biometrics').first();
    expect(fromDb.weight).toBe(75);
  });
});
```

## Benefits

1. **Clear separation** - Easy to find services by domain
2. **Testability** - Interface-based design enables mocking
3. **Maintainability** - Changes confined to domain
4. **Team scaling** - Different teams own different service domains
5. **Dependency management** - Clear dependency graph (AI → Compute → Storage)

## Migration Order

1. **Phase 1**: Create new `services/ai/`, `services/compute/`, `services/storage/`
2. **Phase 2**: Move and refactor existing services into new structure
3. **Phase 3**: Update route handlers to use new services
4. **Phase 4**: Remove old flat service files
5. **Phase 5**: Add comprehensive tests for each service

## Consequences

### Positive
- Better code organization
- Easier testing with dependency injection
- Clear domain boundaries
- Improved maintainability
- Better onboarding (understand one domain at a time)

### Negative
- Migration effort (~2 weeks)
- Temporary code duplication during transition
- Need to update all route handlers
- More files/directories to navigate

### Risks
- Service boundaries too strict (need to allow cross-domain calls via well-defined interfaces)
- Over-engineering for simple services
- Need clear guidelines on when to create new service vs. utility function

---

## Related Decisions
- ADR 0001: Monorepo Package Organization
- ADR 0004: API Route Structure
- ADR 0006: Dependency Injection Strategy
