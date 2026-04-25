# Database Schema

Complete reference for the AIVO database schema using Drizzle ORM with Cloudflare D1 (SQLite).

## Overview

AIVO uses a relational SQLite database with the following tables organized by domain:

- **User & Auth**: `users`, `sessions`
- **Coaching**: `conversations`, `memoryNodes`, `memoryEdges`, `compressedContexts`
- **Workouts**: `workoutRoutines`, `routineExercises`, `dailySchedules`, `workouts`, `workoutCompletions`
- **Body Metrics**: `bodyMetrics`, `bodyInsights`, `userGoals`, `dailySummaries`
- **Analytics**: `planDeviations`, `socialProofCards` (for marketing)

---

## Entity Relationship Diagram

```
users
  │ 1:n sessions
  │ 1:n conversations
  │ 1:n workoutRoutines
  │ 1:n bodyMetrics
  │ 1:n bodyInsights
  │ 1:n userGoals
  │ 1:n dailySummaries
  │ 1:n planDeviations
  │
  ├─ conversations ─ memoryNodes (via processConversationTurn)
  ├─ memoryNodes ── memoryEdges (self-referential graph)
  └─ workoutRoutines ─ dailySchedules ─ workouts
```

---

## Tables

### users

Core user profiles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | UUID |
| email | TEXT | UNIQUE, NOT NULL | Login email |
| name | TEXT | | Full name |
| picture | TEXT | | Profile image URL |
| age | INTEGER | | Years |
| gender | TEXT | | 'male', 'female', 'other' |
| height | REAL | | Inches or cm |
| weight | REAL | | Pounds or kg |
| fitnessLevel | TEXT | | 'beginner', 'intermediate', 'advanced' |
| expoPushToken | TEXT | | Mobile push notification token |
| createdAt | INTEGER | | Unix timestamp |
| updatedAt | INTEGER | | Unix timestamp |

**Indexes:** `email` (unique)

---

### sessions

OAuth session tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | UUID |
| userId | TEXT | FK→users(id) | User |
| provider | TEXT | NOT NULL | 'google', 'facebook' |
| providerUserId | TEXT | | Provider's user ID |
| accessToken | TEXT | | OAuth access token |
| refreshToken | TEXT | | OAuth refresh token |
| expiresAt | INTEGER | | Token expiration timestamp |
| createdAt | INTEGER | |

**Indexes:** `userId`, `providerUserId`

---

### conversations

Chat conversation history.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | UUID |
| userId | TEXT | FK→users(id) | User |
| message | TEXT | NOT NULL | User message |
| response | TEXT | | AI response |
| context | TEXT (JSON) | | Additional context array |
| tokensUsed | INTEGER | | Total tokens consumed |
| model | TEXT | | 'gpt-4o-mini' |
| createdAt | INTEGER | | Timestamp |

**Indexes:** `userId`, `createdAt`

---

### memoryNodes

Graph nodes for semantic memory.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | UUID |
| userId | TEXT | FK→users(id) | Owner |
| type | TEXT | NOT NULL | MemoryType enum |
| content | TEXT | NOT NULL | Fact text |
| embedding | TEXT (JSON) | NOT NULL | 1536-dim vector |
| metadata | TEXT (JSON) | NOT NULL | Source, confidence, verifications |
| relatedNodes | TEXT (JSON) | | Connected node IDs |
| createdAt | INTEGER | |
| updatedAt | INTEGER | |

**Indexes:** `userId`, `type`

**Metadata JSON structure:**
```typescript
{
  source: "conversation" | "workout" | "body_metric" | "manual" | "system";
  confidence: number;        // 0-1
  extractedAt: number;       // timestamp
  sourceId?: string;         // e.g., conversation ID
  verifications: number;     // Reinforcement count
  confirmed?: boolean;       // User confirmation
  tags?: string[];           // Categorization
  lastAccessed?: number;     // For LRU pruning
}
```

---

### memoryEdges

Graph edges connecting memory nodes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | UUID |
| fromNodeId | TEXT | FK→memoryNodes(id) | Source |
| toNodeId | TEXT | FK→memoryNodes(id) | Target |
| relationship | TEXT | NOT NULL | RelationshipType enum |
| weight | REAL | 0-1 | Edge strength |
| createdAt | INTEGER | |

**Indexes:** `fromNodeId`, `toNodeId`, `(fromNodeId, toNodeId, relationship)`

**RelationshipType values:**
- `related_to` - General connection
- `contradicts` - Facts conflict
- `temporal_before` - Happened before
- `temporal_after` - Happened after
- `causes` - Causation
- `precludes` - Prevents
- `strengthens` - Reinforces
- `weakens` - Undermines
- `supertopic` - Broader category
- `subtopic` - Specific detail

---

### compressedContexts

Cache of pre-compressed memory contexts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| userId | TEXT | PK, FK→users(id) |
| contextString | TEXT | Formatted context |
| tokens | INTEGER | Estimated token count |
| sources | TEXT (JSON) | Count by memory type |
| updatedAt | INTEGER | |

**Note:** Optional performance optimization. Can be disabled.

---

### workoutRoutines

Workout routine templates.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | UUID |
| userId | TEXT | FK→users(id) |
| name | TEXT | NOT NULL | Routine name |
| description | TEXT | | Purpose/goals |
| weekStartDate | TEXT (DATE) | | YYYY-MM-DD |
| isActive | INTEGER | 0/1 | Active flag |
| createdAt | INTEGER | |
| updatedAt | INTEGER | |

**Indexes:** `userId`, `isActive`

---

### routineExercises

Exercise definitions within a routine.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | UUID |
| routineId | TEXT | FK→workoutRoutines(id) |
| dayOfWeek | INTEGER | 0-6 | Sunday=0 |
| orderIndex | INTEGER | | Display order |
| exerciseName | TEXT | NOT NULL | "Barbell Squat" |
| exerciseType | TEXT | 'strength', 'cardio', 'mobility' |
| targetMuscleGroups | TEXT (JSON) | Array: ["quadriceps", "glutes"] |
| sets | INTEGER | |
| reps | INTEGER | |
| weight | REAL | Optional |
| rpe | REAL | 1-10 Rate of Perceived Exertion |
| notes | TEXT | Instructions |
| createdAt | INTEGER | |

**Indexes:** `routineId`, `(routineId, dayOfWeek, orderIndex)`

---

### dailySchedules

Generated daily schedule from a routine.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | UUID |
| userId | TEXT | FK→users(id) |
| date | TEXT (DATE) | NOT NULL |
| routineId | TEXT | FK→workoutRoutines(id) |
| workoutId | TEXT | FK→workouts(id), nullable |
| recoveryTasks | TEXT (JSON) | ["stretch hips", "ice knee"] |
| nutritionGoals | TEXT (JSON) | ["2000 calories", "150g protein"] |
| sleepGoal | TEXT | "8 hours" |
| generatedBy | TEXT | 'ai_replan' or 'manual' |
| optimizationScore | INTEGER | 0-100 |
| adjustmentsMade | TEXT (JSON) | Reason for schedule changes |
| createdAt | INTEGER | |

**Indexes:** `userId`, `date`, `routineId`

---

### workouts

Actual workout sessions (may be auto-generated or manual).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | UUID |
| userId | TEXT | FK→users(id) |
| routineId | TEXT | FK→workoutRoutines(id), nullable |
| date | TEXT (DATE) | |
| startTime | INTEGER | Unix timestamp |
| endTime | INTEGER | |
| notes | TEXT | User notes |
| createdAt | INTEGER | |

**Indexes:** `userId`, `date`, `startTime`

---

### workoutCompletions

Exercise-level completion tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | UUID |
| workoutId | TEXT | FK→workouts(id) |
| exerciseName | TEXT | |
| setsCompleted | INTEGER | |
| repsCompleted | TEXT (JSON) | Array of arrays per set |
| weightUsed | REAL | |
| rpe | REAL | |
| notes | TEXT | |
| createdAt | INTEGER | |

**Indexes:** `workoutId`

---

### bodyMetrics

Historical body measurements.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | UUID |
| userId | TEXT | FK→users(id) |
| timestamp | INTEGER | Unix timestamp |
| weight | REAL | lbs |
| bodyFat | REAL | percentage |
| muscleMass | REAL | lbs |
| measurements | TEXT (JSON) | { chest, waist, hips, biceps, thighs } |
| photoUrl | TEXT | Optional progress photo |
| source | TEXT | 'manual' | 'connected_device' |
| createdAt | INTEGER | |

**Indexes:** `userId`, `timestamp`

---

### bodyInsights

AI-generated analysis of body metrics and progress.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | UUID |
| userId | TEXT | FK→users(id) |
| timestamp | INTEGER | |
| summary | TEXT | Overall analysis |
| muscleProfiles | TEXT (JSON) | Array of { muscle, averageSoreness, trend, recoveryRate } |
| recommendations | TEXT (JSON) | Actionable advice |
| createdAt | INTEGER | |

**Indexes:** `userId`, `timestamp`

---

### userGoals

User fitness goals.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | UUID |
| userId | TEXT | FK→users(id) |
| type | TEXT | 'lose_weight', 'gain_muscle', 'improve_endurance', etc. |
| targetMetric | TEXT | e.g., "weight", "body_fat" |
| targetValue | REAL | Goal value |
| currentValue | REAL | Starting point |
| deadline | TEXT (DATE) | Optional |
| status | TEXT | 'active', 'achieved', 'abandoned' |
| priority | INTEGER | 1-5 |
| createdAt | INTEGER | |
| updatedAt | INTEGER | |

**Indexes:** `userId`, `status`, `type`

---

### dailySummaries

Aggregated daily stats (materialized for performance).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| date | TEXT (DATE) | PK, part |
| userId | TEXT | PK, FK→users(id) |
| totalCalories | INTEGER | |
| totalProtein_g | INTEGER | |
| totalCarbs_g | INTEGER | |
| totalFat_g | INTEGER | |
| totalFiber_g | INTEGER | |
| totalSugar_g | INTEGER | |
| foodLogCount | INTEGER | Meals logged |
| workoutCount | INTEGER | |
| sleepHours | REAL | |
| recoveryScore | INTEGER | 0-100 |
| createdAt | INTEGER | |
| updatedAt | INTEGER | |

**Indexes:** `(date, userId)`, `userId`

---

### planDeviations

Record of when routines were adjusted due to deviation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | UUID |
| userId | TEXT | FK→users(id) |
| originalRoutineId | TEXT | FK→workoutRoutines(id) |
| adjustedRoutineId | TEXT | FK→workoutRoutines(id) |
| deviationScore | REAL | 0-100 |
| reason | TEXT | 'declining', 'plateau', 'overtraining' |
| adjustmentsJson | TEXT (JSON) | Full adjustment details |
| createdAt | INTEGER | |

**Indexes:** `userId`, `createdAt`, `originalRoutineId`

---

### socialProofCards

Marketing/social content (placeholder).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | UUID |
| userId | TEXT | FK→users(id) |
| type | TEXT | 'testimonial', 'transformation', 'achievement' |
| content | TEXT | |
| imageUrl | TEXT | |
| isPublic | INTEGER | 0/1 |
| createdAt | INTEGER | |

---

## Migrations

Database migrations are managed by Drizzle Kit.

### Generate Migration

```bash
cd packages/db
pnpm exec drizzle-kit generate
```

### Apply Migration (Local)

```bash
pnpm run migrate:local
```

### Apply Migration (Production)

Migrations are automatically applied during deployment via `deploy.sh`.

---

## TypeScript Schema

The Drizzle schema is defined in `packages/db/src/schema.ts`:

```typescript
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  // ... more columns
});

// Export all tables
export const schema = {
  users,
  sessions,
  conversations,
  memoryNodes,
  memoryEdges,
  compressedContexts,
  workoutRoutines,
  routineExercises,
  dailySchedules,
  workouts,
  workoutCompletions,
  bodyMetrics,
  bodyInsights,
  userGoals,
  dailySummaries,
  planDeviations,
  socialProofCards,
};
```

---

## Queries

All database queries use the Drizzle ORM with type-safe builders:

```typescript
import { db } from "@aivo/db";
import { eq, desc, sql } from "drizzle-orm";

// Find user's recent conversations
const conversations = await db
  .select()
  .from(conversations)
  .where(eq(conversations.userId, userId))
  .orderBy(desc(conversations.createdAt))
  .limit(20);

// Join example
const routineWithExercises = await db
  .select()
  .from(workoutRoutines)
  .innerJoin(routineExercises, eq(routineExercises.routineId, workoutRoutines.id))
  .where(eq(workoutRoutines.id, routineId));
```

---

## Performance Optimizations

- **Indexes** on all foreign keys and frequently queried columns
- **Materialized views** (dailySummaries) for aggregations
- **JSON columns** for flexible structured data
- **NoSQL-like** patterns for dynamic attributes
- **Embedding storage** as JSON (can optimize with BLOB in future)

---

## Backup & Recovery

Cloudflare D1 provides automated backups. Manual backup:

```bash
# List databases
wrangler d1 database list

# Export
wrangler d1 export aivo-db --output backup.sql

# Import to new DB
wrangler d1 create aivo-db-restore
wrangler d1 execute aivo-db-restore --file backup.sql
```

---

## Mock Data for Testing

For UI/UX and API testing, a comprehensive mock data set is available.

### Quick Setup

```bash
# Apply migrations to local DB
pnpm exec wrangler d1 migrations apply aivo-db --local

# Seed with mock data
cd packages/db
pnpm run seed:mock
```

### Admin Test User

The seed creates an admin user with:

- Email: `admin@aivo.ai`
- User ID: `admin-user-001`
- 4 weeks of workout history
- Body metrics for 30 days
- 8 memory nodes with relationships
- 15 AI conversations
- Gamification (Level 12, 2850 points, 7-day streak)
- Sleep logs, goals, badges, and notifications

### Admin API Endpoints (Dev Only)

Available at `/api/admin/test/*` when `NODE_ENV !== "production"`:

- `GET /health-check` - Health status
- `GET /stats` - Dashboard statistics
- `GET /user/:userId` - Full user profile with all related data
- `GET /workouts` - Workout history with filters
- `GET /conversations` - Chat history
- `GET /memories` - Memory nodes with filters
- `GET /body-metrics` - Body measurement trends
- `GET /recovery` - Recovery and fatigue data
- `GET /gamification` - Points, badges, streaks
- `GET /ai-activity` - AI interaction metrics

See [Mock Data Guide](../MOCK_DATA.md) for complete documentation.

---

**Last Updated:** 2026-04-22  
**Schema Version:** 1.0.0  
**Drizzle Version:** 0.45.2
