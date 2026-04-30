# Database (D1 + Drizzle)

Complete reference for the AIVO database using Cloudflare D1 with Drizzle ORM.

## Quick Start

### Prerequisites

- Cloudflare account with D1 database provisioned
- Wrangler CLI installed and authenticated
- Local SQLite for development

### Setup

1. **Configure database connection** in `packages/db/wrangler.toml`:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "aivo-db"
   database_id = "your-database-id"
   ```

2. **Apply migrations locally**:
   ```bash
   cd packages/db
   pnpm exec wrangler d1 migrations apply aivo-db --local
   ```

3. **Seed with mock data** (development only):
   ```bash
   pnpm run seed:mock
   ```

4. **Open Studio** (database browser):
   ```bash
   pnpm --filter @aivo/db exec drizzle-kit studio
   ```

### Verify Installation

```bash
# Check DB connection
curl http://localhost:8787/api/health

# View tables in Studio
# Open http://localhost:4983 in browser
```

---

## Architecture

### Technology Stack

- **Database**: Cloudflare D1 (SQLite-compatible serverless SQL)
- **ORM**: Drizzle ORM with type-safe queries
- **Migrations**: Drizzle Kit (auto-generated from schema changes)
- **Connection**: Worker binding via `env.DB`

### Design Principles

1. **Serverless-first**: D1 automatically scales, pay-per-query
2. **Type safety**: Drizzle generates TypeScript types from schema
3. **Migration-driven**: All schema changes via migrations
4. **Cascade deletes**: User deletion cleans up all related data
5. **JSON flexibility**: Dynamic attributes stored in JSON columns

### Data Flow

```
Web/Mobile → API (Cloudflare Worker) → Drizzle ORM → D1 Database
                                    ↑
                            TypeScript types
                                    ↑
                          schema.ts definitions
```

---

## Database Schema

### Core Tables (14 main tables)

#### `users`

Core user account information.

```typescript
interface User {
  id: string;              // UUID primary key
  email: string;           // UNIQUE, NOT NULL
  name: string;            // Full name
  avatarUrl?: string;      // Profile picture (R2 URL)
  provider: 'google' | 'facebook';
  providerId: string;      // OAuth provider's user ID
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**: `email` (unique), `(provider, provider_id)`

**Example**: User created on first OAuth login

---

#### `sessions`

OAuth session management with token storage.

```typescript
interface Session {
  id: string;              // UUID
  userId: string;          // FK → users.id (CASCADE DELETE)
  provider: 'google' | 'facebook';
  accessToken: string;     // OAuth access token
  refreshToken?: string;   // Optional refresh token
  expiresAt?: Date;        // Token expiration
  createdAt: Date;
}
```

**Indexes**: `user_id`, `access_token`

**Foreign Keys**: `userId` → `users.id` (ON DELETE CASCADE)

**Note**: Tokens stored for API calls to Google/Facebook on behalf of user

---

#### `conversations`

AI coaching chat history.

```typescript
interface Conversation {
  id: string;
  userId: string;          // FK → users.id
  message: string;         // User message
  response?: string;       // AI response
  context?: any[];         // Additional context array
  tokensUsed: number;      // Total tokens consumed
  model?: string;          // 'gpt-4o-mini', 'gemini-1.5-flash', etc.
  cost?: number;           // USD cost
  createdAt: Date;
}
```

**Indexes**: `(user_id, created_at DESC)`, `created_at DESC`

**Usage**: Track conversation history, calculate costs, analyze coaching patterns

---

#### `memoryNodes`

Graph nodes for semantic personalization memory.

```typescript
interface MemoryNode {
  id: string;
  userId: string;          // FK → users.id
  type: 'fact' | 'preference' | 'health' | 'goal' | 'injury';
  content: string;         // Fact text (e.g., "User has knee injury")
  embedding: number[];     // 1536-dim vector (OpenAI embedding)
  metadata: {
    source: 'conversation' | 'workout' | 'body_metric' | 'manual';
    confidence: number;    // 0-1
    extractedAt: number;   // timestamp
    sourceId?: string;     // e.g., conversation ID
    verifications: number; // Reinforcement count
    confirmed?: boolean;
    tags?: string[];
    lastAccessed?: number;
  };
  relatedNodes: string[];  // Connected node IDs
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**: `user_id`, `type`

**Embeddings**: Used for semantic similarity search (cosine distance)

**Graph**: Nodes connected via `memoryEdges` table

---

#### `memoryEdges`

Graph edges connecting memory nodes.

```typescript
interface MemoryEdge {
  id: string;
  fromNodeId: string;      // FK → memoryNodes.id
  toNodeId: string;        // FK → memoryNodes.id
  relationship: 'related_to' | 'contradicts' | 'temporal_before' |
                 'temporal_after' | 'causes' | 'precludes' |
                 'strengthens' | 'weakens' |
                 'supertopic' | 'subtopic';
  weight: number;          // 0-1 edge strength
  createdAt: Date;
}
```

**Indexes**: `from_node_id`, `to_node_id`, `(from_node_id, to_node_id, relationship)`

**Use case**: "User's knee injury (node A) contradicts heavy squats (node B)" → edge with `contradicts` relationship

---

#### `compressedContexts`

Performance optimization: cached memory contexts.

```typescript
interface CompressedContext {
  userId: string;          // PK, FK → users.id
  contextString: string;   // Formatted context for AI prompts
  tokens: number;          // Estimated token count
  sources: {
    facts: number;
    preferences: number;
    goals: number;
  };
  updatedAt: Date;
}
```

**Purpose**: Avoid recomputing memory context on every AI query

---

#### `workoutRoutines`

Workout routine templates.

```typescript
interface WorkoutRoutine {
  id: string;
  userId: string;          // FK → users.id
  name: string;
  description?: string;
  weekStartDate: string;   // YYYY-MM-DD
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**: `user_id`, `is_active`

---

#### `routineExercises`

Exercises within a routine.

```typescript
interface RoutineExercise {
  id: string;
  routineId: string;       // FK → workoutRoutines.id
  dayOfWeek: number;       // 0-6 (Sunday=0)
  orderIndex: number;
  exerciseName: string;
  exerciseType: 'strength' | 'cardio' | 'mobility';
  targetMuscleGroups: string[]; // ['quadriceps', 'glutes']
  sets?: number;
  reps?: number;
  weight?: number;
  rpe?: number;            // Rate of Perceived Exertion 1-10
  notes?: string;
  createdAt: Date;
}
```

**Indexes**: `routine_id`, `(routine_id, day_of_week, order_index)`

---

#### `dailySchedules`

AI-generated daily schedules from routines.

```typescript
interface DailySchedule {
  id: string;
  userId: string;          // FK → users.id
  date: string;            // YYYY-MM-DD
  routineId?: string;      // FK → workoutRoutines.id
  workoutId?: string;      // FK → workouts.id
  recoveryTasks?: string[]; // ['stretch hips', 'ice knee']
  nutritionGoals?: any;     // { calories: 2000, protein: 150 }
  sleepGoal?: string;      // "8 hours"
  generatedBy: 'ai_replan' | 'manual';
  optimizationScore: number; // 0-100
  adjustmentsMade?: any;    // JSON: reasons for changes
  createdAt: Date;
}
```

**Indexes**: `user_id`, `date`, `routine_id`

---

#### `workouts`

Actual workout sessions.

```typescript
interface Workout {
  id: string;
  userId: string;          // FK → users.id
  routineId?: string;      // FK → workoutRoutines.id (nullable if ad-hoc)
  date: string;            // YYYY-MM-DD
  startTime: Date;
  endTime?: Date;
  notes?: string;
  createdAt: Date;
}
```

**Indexes**: `user_id`, `date`, `start_time`

---

#### `workoutCompletions`

Exercise-level completion tracking.

```typescript
interface WorkoutCompletion {
  id: string;
  workoutId: string;       // FK → workouts.id
  exerciseName: string;
  setsCompleted: number;
  repsCompleted: number[][]; // [[8, 8, 6], [10, 10]] per set
  weightUsed?: number;
  rpe?: number;
  notes?: string;
  createdAt: Date;
}
```

**Indexes**: `workout_id`

---

#### `bodyMetrics`

Historical body measurements.

```typescript
interface BodyMetric {
  id: string;
  userId: string;          // FK → users.id
  timestamp: Date;
  weight: number;          // lbs or kg
  bodyFat?: number;        // percentage
  muscleMass?: number;     // lbs
  measurements?: {
    chest?: number;
    waist?: number;
    hips?: number;
    biceps?: number;
    thighs?: number;
  };
  photoUrl?: string;       // R2 URL
  source: 'manual' | 'connected_device';
  createdAt: Date;
}
```

**Indexes**: `(user_id, timestamp DESC)`

---

#### `bodyInsights`

AI-generated analysis of body metrics trends.

```typescript
interface BodyInsight {
  id: string;
  userId: string;          // FK → users.id
  timestamp: Date;
  period: 'weekly' | 'monthly';
  summary: string;         // Overall analysis text
  muscleProfiles: Array<{
    muscle: string;
    averageSoreness: number; // 1-10
    trend: 'increasing' | 'decreasing' | 'stable';
    recoveryRateDays: number;
  }>;
  recommendations: string[];
  createdAt: Date;
}
```

---

#### `userGoals`

User fitness goals.

```typescript
interface UserGoal {
  id: string;
  userId: string;          // FK → users.id (UNIQUE per user)
  type: 'lose_weight' | 'gain_muscle' | 'improve_endurance' |
        'increase_strength' | 'flexibility' | 'general_fitness';
  targetMetric: string;    // 'weight', 'body_fat', 'bench_press'
  targetValue: number;
  currentValue: number;
  deadline?: Date;
  status: 'active' | 'achieved' | 'abandoned';
  priority: 1 | 2 | 3 | 4 | 5;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**: `user_id` (unique), `status`, `type`

---

#### `dailySummaries`

Materialized daily aggregates for performance.

```typescript
interface DailySummary {
  date: string;            // YYYY-MM-DD (PK part)
  userId: string;          // PK, FK → users.id
  totalCalories: number;
  totalProtein_g: number;
  totalCarbs_g: number;
  totalFat_g: number;
  totalFiber_g?: number;
  totalSugar_g?: number;
  foodLogCount: number;
  workoutCount: number;
  sleepHours?: number;
  recoveryScore?: number;  // 0-100
  createdAt: Date;
  updatedAt: Date;
}
```

**Primary Key**: `(date, user_id)`

**Purpose**: Fast daily dashboard queries without joins

---

#### `planDeviations`

Routine adjustment tracking.

```typescript
interface PlanDeviation {
  id: string;
  userId: string;          // FK → users.id
  originalRoutineId: string; // FK → workoutRoutines.id
  adjustedRoutineId: string; // FK → workoutRoutines.id
  deviationScore: number;  // 0-100
  reason: 'declining' | 'plateau' | 'overtraining' | 'injury' | 'schedule_change';
  adjustmentsJson: any;     // Detailed changes
  createdAt: Date;
}
```

**Indexes**: `user_id`, `created_at`, `original_routine_id`

---

### Social Features Tables (Planned)

Additional tables for gamification and social features (see `SOCIAL_FEATURES_DB_SCHEMA.md` for full spec):

- `badges` - Achievement badges
- `user_badges` - User badge awards
- `challenges` - Fitness challenges
- `user_challenges` - User challenge participation
- `leaderboards` - Leaderboard snapshots
- `clubs` - Social groups
- `club_members` - Club membership
- `events` - Club events
- `notifications` - Push notifications
- `activity_feed` - Social feed items
- `messages` - Private messaging

---

## Drizzle ORM Usage

### Schema Definition

All tables defined in `packages/db/src/schema.ts`:

```typescript
import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  providerId: text("provider_id").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index('idx_users_email').on(table.email),
  index('idx_users_provider').on(table.provider, table.providerId),
]);

// More tables...
```

### Basic Queries

```typescript
import { db } from "@aivo/db";
import { eq, desc, sql, and } from "drizzle-orm";

// Find user by email
const user = await db.query.users.findFirst({
  where: eq(users.email, 'user@example.com')
});

// Get user's recent workouts
const workouts = await db.query.workouts.findMany({
  where: eq(workouts.userId, userId),
  orderBy: desc(workouts.startTime),
  limit: 20
});

// Join workouts with routines
const workoutsWithRoutines = await db
  .select({
    workout: workouts,
    routine: workoutRoutines
  })
  .from(workouts)
  .leftJoin(workoutRoutines, eq(workouts.routineId, workoutRoutines.id))
  .where(eq(workouts.userId, userId));

// Insert new record
await db.insert(users).values({
  id: crypto.randomUUID(),
  email: 'new@example.com',
  name: 'New User',
  provider: 'google',
  providerId: 'google-123',
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// Update
await db.update(users)
  .set({ name: 'Updated Name', updatedAt: Date.now() })
  .where(eq(users.id, userId));

// Delete
await db.delete(users).where(eq(users.id, userId));
```

### Transactions

```typescript
import { db } from "@aivo/db";
import { sql } from "drizzle-orm";

await db.transaction(async (tx) => {
  // Create workout
  const workoutId = crypto.randomUUID();
  await tx.insert(workouts).values({
    id: workoutId,
    userId,
    date: today,
    startTime: Date.now(),
  });

  // Create completions
  for (const exercise of exercises) {
    await tx.insert(workoutCompletions).values({
      workoutId,
      exerciseName: exercise.name,
      setsCompleted: exercise.sets,
      repsCompleted: exercise.reps,
    });
  }

  // Update daily summary (materialized)
  await tx.update(dailySummaries).set({
    workoutCount: sql`${dailySummaries.workoutCount} + 1`,
  }).where(eq(dailySummaries.date, today));
});
```

### JSON Columns

```typescript
// Query JSON field
const withLargeMuscles = await db
  .select()
  .from(users)
  .where(sql`json_extract(${users.metadata}, '$.muscleMass') > 100`);

// Update JSON field
await db.update(users)
  .set({
    metadata: sql`json_set(${users.metadata}, '$.lastWorkout', ${Date.now()})`
  })
  .where(eq(users.id, userId));
```

---

## Migrations

### Generate Migration from Schema Change

```bash
cd packages/db
pnpm exec drizzle-kit generate
```

This compares `schema.ts` with previous migration and generates new migration file in `drizzle/migrations/`.

### Apply Migrations

**Local development**:
```bash
pnpm run migrate:local
# or
pnpm exec wrangler d1 migrations apply aivo-db --local
```

**Production** (via deployment script):
```bash
./scripts/deploy.sh
# Migrations auto-applied during deployment
```

### Migration Files

Migrations are SQL files:

```sql
-- drizzle/migrations/0001_initial.sql
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "provider_id" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email");
-- ...
```

### Rollback

Drizzle doesn't auto-generate rollbacks. Write manual down-migration:

```sql
-- In migration file, add down migration
DROP INDEX IF EXISTS idx_users_email;
DROP TABLE IF EXISTS users;
```

Apply rollback:
```bash
pnpm exec wrangler d1 migrations apply aivo-db --local --undo
```

---

## Performance Optimizations

### Indexes

Critical indexes defined in schema:

- All foreign keys indexed
- Composite indexes for common query patterns
- `created_at DESC` for time-series queries

**Check index usage**:
```sql
EXPLAIN QUERY PLAN
SELECT * FROM workouts WHERE user_id = '...' ORDER BY start_time DESC;
```

### Materialized Views

`dailySummaries` table pre-aggregates daily stats:

```sql
-- Instead of:
SELECT SUM(calories), COUNT(*) FROM nutrition_logs
WHERE user_id = ? AND date = ?;

-- Use:
SELECT * FROM dailySummaries WHERE date = ? AND user_id = ?;
```

Updated by triggers or application logic after data changes.

### JSON for Flexibility

Dynamic attributes (exercise notes, workout metrics) stored as JSON:

```typescript
exercises: json('exercises').$type<Exercise[]>()
```

Benefits:
- No schema migrations for new fields
- Type safety with Drizzle's `$type<T>()`
- Queryable with `json_extract()` if needed

### Connection Pooling

D1 handles connection pooling automatically. No configuration needed.

### Query Caching

API layer implements Redis-style caching (in-memory + KV):

```typescript
const cacheKey = `workouts:${userId}:${date}`;
const cached = await getFromKV(cacheKey);
if (cached) return JSON.parse(cached);

// Query DB and cache
const workouts = await db.query.workouts.findMany({...});
await KV.put(cacheKey, JSON.stringify(workouts), { expirationTtl: 300 });
```

---

## Environment Variables

**API (`apps/api/.env`)**:
```
AUTH_SECRET=openssl rand -hex 64  # Required
D1_DATABASE_ID=your-database-id
D1_DATABASE_NAME=aivo-db
```

**Local (`.env.local`)**:
```
# Wrangler uses local SQLite file at .wrangler/state/d1
```

See `ENV_VARIABLES_REFERENCE.md` for complete list.

---

## Backup & Recovery

### Automated Backups

Cloudflare D1 provides automated daily backups retained for 30 days.

### Manual Export

```bash
# Export to SQL file
wrangler d1 export aivo-db --output backup.sql

# Export to JSON
wrangler d1 export aivo-db --format json --output backup.json
```

### Restore from Backup

```bash
# Create new database from backup
wrangler d1 create aivo-db-restore
wrangler d1 execute aivo-db-restore --file backup.sql

# Or overwrite existing (DESTRUCTIVE)
wrangler d1 execute aivo-db --file backup.sql
```

### Point-in-Time Recovery

Contact Cloudflare support for PITR (available on Enterprise plans).

---

## Testing

### Local Development

```bash
# Apply migrations to local DB
pnpm run migrate:local

# Seed with mock data
pnpm run seed:mock
```

### Test Database

For CI/CD, use isolated test database:

```bash
wrangler d1 create aivo-db-test
# Set WRANGLER_D1_DATABASE_ID in CI env
```

### Mock Data

Comprehensive mock data generator:

```bash
cd packages/db
pnpm run seed:mock
```

Creates:
- Admin user (`admin@aivo.ai`)
- 4 weeks workout history
- Body metrics time series
- Memory nodes with relationships
- Conversations
- Gamification profile

See `MOCK_DATA.md` for data structure.

---

## Troubleshooting

### "database does not exist" error

**Cause**: D1 database not provisioned in Cloudflare dashboard.

**Fix**:
```bash
wrangler d1 database create aivo-db
# Update wrangler.toml with database_id
```

---

### Migration fails with "no such table"

**Cause**: Migrations applied out of order or missing.

**Fix**:
```bash
# Check migration history
wrangler d1 migrations list aivo-db

# Reapply all
wrangler d1 migrations apply aivo-db --local --force
```

---

### Slow queries

**Diagnosis**:
```sql
EXPLAIN QUERY PLAN
SELECT * FROM workouts WHERE user_id = '...';
```

**Solutions**:
1. Add missing index
2. Reduce query scope (date range instead of all)
3. Use materialized views (`dailySummaries`) for aggregates
4. Implement caching at API layer

---

### JSON queries not working

SQLite has limited JSON support. Use Drizzle's `json` type properly:

```typescript
// Schema
exercises: json('exercises').$type<Exercise[]>()

// Query with json_extract
import { sql } from "drizzle-orm";
await db.select().from(workouts)
  .where(sql`json_extract(${workouts.exercises}, '$[0].name') = 'Squat'`);
```

Consider generating generated columns for frequently queried JSON fields.

---

### "database is locked" (local dev)

**Cause**: Multiple processes accessing same local SQLite file.

**Fix**: Ensure only one Wrangler dev instance running. Use:
```bash
pkill -f wrangler
pnpm run dev  # Restart
```

---

### Foreign key constraint fails

SQLite foreign keys disabled by default. Enable in D1 (Cloudflare enables automatically). For local:

```bash
# In .env
D1_LOCAL_SQLITE_FOREIGN_KEYS=enabled
```

---

## Best Practices

1. **Always use UUIDs** for primary keys (crypto.randomUUID())
2. **Index foreign keys** - Drizzle auto-indexes FK, verify
3. **Use transactions** for multi-table writes
4. **Store large blobs in R2**, not database (photos, videos)
5. **Prefer JSON over EAV** for flexible attributes
6. **Query by indexed columns** - avoid `LIKE '%...%'` on text
7. **Use materialized views** for dashboard aggregates
8. **Set TTL on cache entries** (5-15 minutes typical)

---

## Monitoring

### Query Performance

Cloudflare D1 dashboard shows:
- Queries per second
- Average query duration
- Storage used
- Read/write operations

Set alerts for:
- Query latency > 100ms
- Error rate > 1%
- Storage > 80% capacity

### Database Size

```bash
wrangler d1 databases list
```

Watch for uncontrolled growth:
- Unbounded `conversations` table (implement TTL cleanup)
- Large JSON blobs (move to R2)
- Missing indexes (table scans)

### Cleanup Jobs

Scheduled workers to prune old data:

```typescript
// Delete conversations older than 90 days
const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
await db.delete(conversations)
  .where(sql`${conversations.createdAt} < ${ninetyDaysAgo}`);
```

Run via Cron Triggers or scheduled Workers.

---

## References

- **Schema Definition**: `packages/db/src/schema.ts`
- **Migrations**: `packages/db/drizzle/migrations/`
- **Drizzle Docs**: https://orm.drizzle.team/
- **Cloudflare D1 Docs**: https://developers.cloudflare.com/d1/
- **Social Features Schema**: `SOCIAL_FEATURES_DB_SCHEMA.md`
- **API Contracts**: `API_CONTRACTS.md`

---

**Last Updated**: 2025-04-27  
**Schema Version**: 1.0  
**Tables**: 14 core + 12 social features (planned)
