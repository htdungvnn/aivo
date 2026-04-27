# Database Schemas

**Status**: ⏳ Schema documentation in progress  
**Last Updated**: 2025-04-27  
**ORM**: Drizzle ORM with Cloudflare D1 (SQLite-compatible)

This document provides comprehensive documentation of all database tables, relationships, indexes, and migrations in the AIVO platform.

---

## Table of Contents

- [Overview](#overview)
- [Core Tables](#core-tables)
- [Feature-Specific Tables](#feature-specific-tables)
- [Database Migrations](#database-migrations)
- [Indexes and Performance](#indexes-and-performance)
- [Sample Queries](#sample-queries)

---

## Overview

### Database Configuration

- **Dialect**: SQLite (Cloudflare D1)
- **ORM**: Drizzle
- **Schema Location**: `packages/db/src/schema.ts`
- **Migrations**: `packages/db/drizzle/migrations/`
- **Studio**: `pnpm --filter @aivo/db exec drizzle-kit studio`

### Connection

```typescript
// packages/db/src/index.ts
import { drizzle } from 'drizzle-orm/d1';
import { migrate } from 'drizzle-orm/d1/migrator';

export const db = drizzle(env.DB);
```

---

## Core Tables

### users

Core user account information.

```typescript
// From schema.ts
export const users = pgTable('users', {
  id: text('id').primaryKey(), // UUID
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  provider: text('provider').notNull(), // 'google' | 'facebook'
  providerId: text('provider_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

**Indexes**:
- `idx_users_email` (email) - for login lookups
- `idx_users_provider` (provider, provider_id) - for OAuth lookups

**Example Query**:
```typescript
const user = await db.query.users.findFirst({
  where: eq(users.email, 'user@example.com')
});
```

---

### sessions

OAuth session management.

```typescript
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

**Indexes**:
- `idx_sessions_user_id` (user_id)
- `idx_sessions_token` (access_token) - for session validation

**Foreign Keys**:
- `sessions.user_id` → `users.id` (ON DELETE CASCADE)

---

## Body & Biometric Tables

### body_metrics

Track weight, body fat, measurements over time.

```typescript
export const bodyMetrics = pgTable('body_metrics', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  weight: real('weight'), // kg
  bodyFat: real('body_fat'), // percentage
  muscleMass: real('muscle_mass'), // kg
  bmi: real('bmi'),
  measuredAt: timestamp('measured_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

**Indexes**:
- `idx_body_metrics_user` (user_id, measured_at DESC)

---

### body_measurements

Circumference measurements at various sites.

```typescript
export const bodyMeasurements = pgTable('body_measurements', {
  id: text('id').primaryKey(),
  bodyMetricId: text('body_metric_id').notNull()
    .references(() => bodyMetrics.id, { onDelete: 'cascade' }),
  site: text('site').notNull(), // 'chest', 'waist', 'hips', 'arms', etc.
  value: real('value').notNull(), // cm or inches
  unit: text('unit').notNull(), // 'cm' or 'in'
});
```

**Indexes**:
- `idx_body_measurements_metric` (body_metric_id)

---

### body_photos

Progress photo uploads.

```typescript
export const bodyPhotos = pgTable('body_photos', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  url: text('url').notNull(), // R2 storage URL
  thumbnailUrl: text('thumbnail_url'),
  takenAt: timestamp('taken_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

**Storage**: Images stored in Cloudflare R2 bucket

---

### body_insights

AI-generated insights from body metrics analysis.

```typescript
export const bodyInsights = pgTable('body_insights', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  period: text('period').notNull(), // 'weekly' | 'monthly'
  metrics: json('metrics').notNull(), // JSON with metrics data
  insights: json('insights').notNull(), // AI-generated insights array
  generatedAt: timestamp('generated_at').defaultNow(),
});
```

---

## Workout Tables

### workouts

Workout templates created by users.

```typescript
export const workouts = pgTable('workouts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  exercises: json('exercises').$type<Exercise[]>(), // Array of exercises
  estimatedDuration: integer('estimated_duration'), // minutes
  difficulty: integer('difficulty'), // 1-5
  tags: json('tags'), // Array of strings
  isPublic: boolean('is_public').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

**Exercise Type**:
```typescript
interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  restSeconds: number;
  notes?: string;
}
```

---

### workout_sessions

Completed workout instances.

```typescript
export const workoutSessions = pgTable('workout_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  workoutId: text('workout_id')
    .references(() => workouts.id, { onDelete: 'set null' }),
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  duration: integer('duration'), // seconds
  notes: text('notes'),
  metrics: json('metrics'), // JSON with session metrics
});
```

**Indexes**:
- `idx_workout_sessions_user` (user_id, started_at DESC)

---

### live_workouts

Real-time workout streaming data.

```typescript
export const liveWorkouts = pgTable('live_workouts', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull()
    .references(() => workoutSessions.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  exerciseIndex: integer('exercise_index').notNull(),
  setIndex: integer('set_index').notNull(),
  repsCompleted: integer('reps_completed'),
  weight: real('weight'),
  startedAt: timestamp('started_at').notNull(),
  endedAt: timestamp('ended_at'),
});
```

---

## AI & Memory Tables

### conversations

Chat history with AI coach.

```typescript
export const conversations = pgTable('conversations', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  message: text('message').notNull(),
  role: text('role').notNull(), // 'user' | 'assistant' | 'system'
  tokensUsed: integer('tokens_used'),
  metadata: json('metadata'), // AI model, cost, etc.
  createdAt: timestamp('created_at').defaultNow(),
});
```

**Indexes**:
- `idx_conversations_user` (user_id, createdAt DESC)
- `idx_conversations_created` (created_at DESC) - for cleanup jobs

---

### memory_facts

Extracted facts about users for personalization.

```typescript
export const memoryFacts = pgTable('memory_facts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  fact: text('fact').notNull(), // "User has a knee injury"
  category: text('category'), // 'health', 'goal', 'preference', 'injury'
  source: text('source'), // 'ai_extraction', 'manual', 'workout_log'
  confidence: real('confidence'), // 0.0 to 1.0
  embeddings: realArray('embeddings'), // Vector for similarity search
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

**Indexes**:
- `idx_memory_facts_user` (user_id)
- `idx_memory_facts_category` (category)
- `idx_memory_facts_embedding` (embeddings) - SQLite FTS5 or custom vector index

---

### vector_memories

Alternative vector storage for semantic search.

```typescript
export const vectorMemories = pgTable('vector_memories', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  embedding: realArray('embedding'), // 1536-dim float array (OpenAI)
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

---

## Nutrition Tables

### nutrition_logs

Daily food intake logs.

```typescript
export const nutritionLogs = pgTable('nutrition_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  foodItem: text('food_item').notNull(),
  meal: text('meal'), // 'breakfast', 'lunch', 'dinner', 'snack'
  calories: integer('calories').notNull(),
  protein: real('protein'), // grams
  carbs: real('carbs'), // grams
  fat: real('fat'), // grams
  loggedAt: timestamp('logged_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

**Indexes**:
- `idx_nutrition_logs_user_date` (user_id, logged_at)

---

### nutrition_goals

User's daily nutrition targets.

```typescript
export const nutritionGoals = pgTable('nutrition_goals', {
  id: text('id').primaryKey(),
  userId: text('user_id').unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  calories: integer('calories'),
  protein: real('protein'), // grams
  carbs: real('carbs'),
  fat: real('fat'),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

---

## Posture & Analysis Tables

### posture_analyses

Computer vision posture analysis results.

```typescript
export const postureAnalyses = pgTable('posture_analyses', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  exercise: text('exercise').notNull(), // 'squat', 'deadlift', etc.
  mediaUrl: text('media_url').notNull(), // video or image
  score: integer('score'), // 0-100
  feedback: json('feedback'), // Array of correction suggestions
  analyzedAt: timestamp('analyzed_at').defaultNow(),
});
```

---

### form_analyses

Form analysis for exercises.

```typescript
export const formAnalyses = pgTable('form_analyses', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull()
    .references(() => workoutSessions.id, { onDelete: 'cascade' }),
  exerciseIndex: integer('exercise_index').notNull(),
  deviations: json('deviations'), // Array of detected deviations
  overallScore: real('overall_score'),
  analyzedAt: timestamp('analyzed_at').defaultNow(),
});
```

---

## Metabolic Tables

### metabolic_profiles

Metabolic twin simulation profiles.

```typescript
export const metabolicProfiles = pgTable('metabolic_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  age: integer('age').notNull(),
  sex: text('sex').notNull(), // 'male' | 'female' | 'other'
  height: real('height'), // cm
  weight: real('weight'), // kg
  activityLevel: text('activity_level'), // 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  bmr: real('bmr'), // Basal Metabolic Rate
  tdee: real('tdee'), // Total Daily Energy Expenditure
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

---

### simulation_results

Metabolic simulation predictions.

```typescript
export const simulationResults = pgTable('simulation_results', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  scenario: json('scenario'), // Diet/exercise changes simulated
  predictedWeight: real('predicted_weight'),
  predictedBodyFat: real('predicted_body_fat'),
  confidence: real('confidence'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

---

## Gamification Tables

### user_points

Points and streaks tracking.

```typescript
export const userPoints = pgTable('user_points', {
  id: text('id').primaryKey(),
  userId: text('user_id').unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  totalPoints: integer('total_points').default(0),
  currentStreak: integer('current_streak').default(0), // days
  longestStreak: integer('longest_streak').default(0),
  lastWorkoutDate: timestamp('last_workout_date'),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

---

### badges

Achievement badges definitions.

```typescript
export const badges = pgTable('badges', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  icon: text('icon'), // URL to badge image
  criteria: json('criteria'), // JSON defining how to earn
  rarity: text('rarity'), // 'common' | 'rare' | 'epic' | 'legendary'
});
```

---

### user_badges

User badge awards.

```typescript
export const userBadges = pgTable('user_badges', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  badgeId: text('badge_id').notNull()
    .references(() => badges.id, { onDelete: 'cascade' }),
  earnedAt: timestamp('earned_at').defaultNow(),
});
```

**Indexes**:
- `idx_user_badges_user` (user_id)
- `idx_user_badges_badge` (badge_id)

---

## Social Tables

### friends

Friend relationships between users.

```typescript
export const friends = pgTable('friends', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  friendId: text('friend_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').notNull(), // 'pending' | 'accepted' | 'blocked'
  createdAt: timestamp('created_at').defaultNow(),
});
```

**Indexes**:
- `idx_friends_user` (user_id, status)
- `idx_friends_friend` (friend_id)
- **Unique constraint**: `(userId, friendId)` to prevent duplicates

---

### challenges

Group challenges.

```typescript
export const challenges = pgTable('challenges', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull(), // 'workouts' | 'steps' | 'weight_loss'
  target: real('target'), // numeric goal
  unit: text('unit'), // 'workouts', 'kg', 'steps'
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

---

### challenge_participants

Users participating in challenges.

```typescript
export const challengeParticipants = pgTable('challenge_participants', {
  id: text('id').primaryKey(),
  challengeId: text('challenge_id').notNull()
    .references(() => challenges.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  progress: real('progress').default(0),
  completed: boolean('completed').default(false),
  joinedAt: timestamp('joined_at').defaultNow(),
});
```

**Indexes**:
- `idx_challenge_participants_challenge` (challenge_id)
- `idx_challenge_participants_user` (user_id)

---

## System Tables

### notifications

Push notification queue.

```typescript
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'achievement' | 'friend_request' | 'reminder'
  title: text('title').notNull(),
  body: text('body').notNull(),
  data: json('data'), // Additional payload
  read: boolean('read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});
```

**Indexes**:
- `idx_notifications_user_unread` (user_id, read) - for unread count queries

---

### cron_jobs

Scheduled background jobs tracking.

```typescript
export const cronJobs = pgTable('cron_jobs', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  lastRun: timestamp('last_run'),
  nextRun: timestamp('next_run'),
  status: text('status'), // 'success' | 'failed' | 'running'
  lastError: text('last_error'),
});
```

---

## Database Migrations

### Migration Files

Located in `packages/db/drizzle/migrations/`:

```bash
packages/db/drizzle/migrations/
├── 0000_initial.sql              # Initial schema
├── 0001_add_body_metrics.sql     # Add body tracking tables
├── 0002_add_workout_tables.sql   # Add workout system
├── 0003_add_memory_tables.sql    # Add AI memory tables
├── 0004_add_posture_tables.sql   # Add posture analysis
├── 0005_add_gamification.sql      # Add badges and points
├── 0006_add_social_tables.sql    # Add friends and challenges
└── 0007_add_metabolic_tables.sql # Add metabolic twin
```

### Applying Migrations

```bash
# Generate new migration from schema changes
cd packages/db
pnpm exec drizzle-kit generate

# Apply to local database
pnpm exec wrangler d1 migrations apply aivo-db --local

# Apply to production (via deployment)
# Migrations are auto-applied during API deployment
```

### Rollback

```bash
# Dry run to see what would be applied
pnpm exec drizzle-kit migrate --dry-run

# Rollback last migration
# Drizzle doesn't support automatic rollback - you must:
# 1. Backup database
# 2. Manually revert schema changes
# 3. Create new migration with rollback SQL
```

---

## Indexes and Performance

### Recommended Indexes

```sql
-- Composite index for common query pattern
CREATE INDEX idx_workout_sessions_user_date 
ON workout_sessions(user_id, started_at DESC);

-- Covering index for stats queries
CREATE INDEX idx_body_metrics_user_date 
ON body_metrics(user_id, measured_at DESC) 
INCLUDE (weight, body_fat, bmi);

-- Partial index for unread notifications
CREATE INDEX idx_notifications_unread 
ON notifications(user_id) 
WHERE read = false;

-- Vector similarity search index (if using pgvector or similar)
-- Not yet implemented in D1
```

### Query Performance Tips

1. **Always filter by `user_id`** - All tables have user_id index
2. **Use `LIMIT` and pagination** - Don't fetch all records
3. **Avoid `SELECT *`** - Specify only needed columns
4. **Use `JOIN` carefully** - Prefer separate queries with Drizzle ORM
5. **Cache frequently accessed data** - Use Redis (future) or in-memory

---

## Sample Queries

### Get User's Recent Workouts

```typescript
const recentWorkouts = await db
  .select()
  .from(workoutSessions)
  .where(eq(workoutSessions.userId, userId))
  .orderBy(desc(workoutSessions.startedAt))
  .limit(10);
```

### Calculate Weekly Stats

```typescript
const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

const workoutsThisWeek = await db
  .select({ count: count() })
  .from(workoutSessions)
  .where(
    and(
      eq(workoutSessions.userId, userId),
      gte(workoutSessions.startedAt, weekAgo)
    )
  );
```

### Find User's Best Lift

```typescript
const bestBench = await db
  .select()
  .from(workoutSessions)
  .where(eq(workoutSessions.userId, userId))
  .innerJoin(
    sql`${workouts} ON ${workouts.id} = ${workoutSessions.workoutId}`
  )
  .unchecked(`exercises->0->>weight` as any) // Parse JSON
  .orderBy(desc(sql`exercises->0->>weight`))
  .limit(1);
```

### Get Memory Facts by Category

```typescript
const healthFacts = await db
  .select()
  .from(memoryFacts)
  .where(
    and(
      eq(memoryFacts.userId, userId),
      eq(memoryFacts.category, 'health')
    )
  )
  .orderBy(desc(memoryFacts.updatedAt));
```

---

## Data Retention Policy

| Table | Retention | Cleanup Job |
|-------|-----------|-------------|
| `conversations` | 2 years | Monthly |
| `workout_sessions` | Indefinite | N/A |
| `body_metrics` | Indefinite | N/A |
| `notifications` | 90 days | Daily |
| `live_workouts` | 30 days | Weekly |

---

## Database Administration

### Backup and Restore

```bash
# Export database (D1)
npx wrangler d1 export aivo-db --output backup.sql

# Restore from backup
npx wrangler d1 import aivo-db --input backup.sql
```

### Connection Pooling

Cloudflare D1 handles pooling automatically. For high-traffic scenarios:

- Set `DB_MAX_CONNECTIONS` environment variable
- Use connection pooling in Hono middleware

### Monitoring

Monitor in Cloudflare Dashboard:
- Query latency
- Storage size
- Read/write operations
- Error rates

---

## Schema Evolution

When making schema changes:

1. **Create migration file**:
   ```bash
   pnpm exec drizzle-kit generate
   ```

2. **Review generated SQL** in `drizzle/migrations/`

3. **Update TypeScript types** in `schema.ts`

4. **Test locally**:
   ```bash
   pnpm exec wrangler d1 migrations apply aivo-db --local
   ```

5. **Commit migration files** (never modify old migrations)

6. **Deploy** - CI/CD applies migrations to staging/production

---

## Related Documentation

- **[DATABASE.md](./DATABASE.md)** - Drizzle ORM usage guide
- **[API_REFERENCE.md](./API_REFERENCE.md)** - API endpoints that interact with these tables
- **[ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)** - Local database setup

---

**Document Owner**: Technical-docs (in coordination with packages/db team)  
**Schema Source**: `packages/db/src/schema.ts`  
**Last Schema Update**: See git history of schema.ts
