# AIVO Database Optimization Guide
## Cloudflare D1 (SQLite) Schema Analysis & Recommendations

**Last Updated:** April 27, 2026  
**Database Engine:** Cloudflare D1 (SQLite compatible)  
**ORM:** Drizzle v0.45.2  
**Schema Version:** 0017 (as of this document)

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Schema Overview](#schema-overview)
3. [ER Diagram](#er-diagram)
4. [Indexing Strategy](#indexing-strategy)
5. [Query Optimization](#query-optimization)
6. [Cloudflare D1 Specific Optimizations](#cloudflare-d1-specific-optimizations)
7. [Security Best Practices](#security-best-practices)
8. [Migration Management](#migration-management)
9. [Seeding Strategy](#seeding-strategy)
10. [Performance Monitoring](#performance-monitoring)
11. [Future Considerations](#future-considerations)

---

## Executive Summary

The AIVO platform database is **extremely comprehensive** with **50+ tables** covering:
- User management & OAuth
- Body metrics & AI vision analysis (heatmaps)
- Nutrition tracking & AI consultations
- Workouts & adaptive routines
- AI memory & chat
- Gamification & social features
- Form analysis for movement correction
- Biometric correlation & sleep tracking
- Acoustic myography (muscle fatigue via sound)
- Live workout adjustment
- Digital twin projections

**Current State:**
- ✅ Well-normalized schema with proper foreign key relationships
- ✅ Comprehensive indexes (86+ indexes across all tables)
- ✅ Cascade deletes configured appropriately
- ✅ Timestamps on all tables for auditing
- ✅ JSON columns for flexible metadata storage
- ✅ Type-safe with Drizzle ORM

**Areas for Improvement (Addressed in This Document):**
- ⚠️ Some foreign keys lacked indexes (now added in migration 0017)
- ⚠️ No composite primary keys for certain tables (intentional SQLite limitation)
- ⚠️ Missing indexes on timestamp columns for time-series queries (now added)
- ⚠️ No query performance baselines established

---

## Schema Overview

### Table Categories

#### 1. Core User Management (4 tables)
- `users` - Core user profile with fitness metrics
- `sessions` - OAuth session management
- `user_analytics` - Predictive analytics (LTV, churn risk)
- `user_goals` - Structured fitness goals

#### 2. Body Metrics & Vision (8 tables)
- `body_photos` - Uploaded progress photos (R2 storage)
- `body_metrics` - Historical body measurements
- `body_heatmaps` - AI-analyzed muscle development heatmaps
- `body_heatmap_history` - Progress snapshots over time
- `vision_analyses` - Legacy vision analysis results
- `body_insights` - Recovery and soreness reports
- `body_avatar_models` - Digital twin avatar state
- `body_projections` - Future body composition projections

#### 3. Nutrition & Food (6 tables)
- `food_items` - Curated nutritional database
- `food_logs` - User's daily food entries
- `daily_nutrition_summaries` - Materialized daily aggregates
- `nutrition_consults` - Multi-agent AI nutrition consultations
- `user_macro_targets` - User's macro preferences
- `macro_adjustment_sessions` - Adaptive macro oscillation tracking
- `macro_adjustment_logs` - History of macro adjustments

#### 4. Workouts & Scheduling (12 tables)
- `workouts` - Completed workout sessions
- `workout_exercises` - Individual exercises within workouts
- `workout_routines` - Weekly workout plans
- `routine_exercises` - Planned exercises for specific days
- `workout_completions` - What was actually done vs planned
- `daily_schedules` - AI-generated daily schedules
- `workout_templates` - Reusable workout templates
- `plan_deviations` - AI adjustments to routines
- `live_workout_sessions` - Real-time workout tracking
- `set_rpe_logs` - Per-set RPE for fatigue analysis
- `user_goals` (also in core) - Fitness objectives

#### 5. AI & Memory (6 tables)
- `conversations` - Chat history with AI coach
- `ai_recommendations` - Personalized recommendations
- `memory_nodes` - Knowledge graph nodes
- `memory_edges` - Relationships between memories
- `compressed_contexts` - Prompt compression cache
- `correlation_findings` - Biometric pattern discoveries

#### 6. Gamification & Social (9 tables)
- `gamification_profiles` - Points, levels, streaks
- `badges` - Earned achievements
- `achievements` - Progress toward goals
- `point_transactions` - Points earning/spending history
- `daily_checkins` - Streak tracking
- `streak_freezes` - Streak protection items
- `social_relationships` - Friend connections
- `shareable_content` - Social media share cards
- `social_proof_cards` - Marketing content
- `leaderboard_snapshots` - Historical leaderboard data

#### 7. Form Analysis (2 tables)
- `form_analysis_videos` - Uploaded exercise videos
- `form_analyses` - AI-generated form corrections

#### 8. Biometric Correlation (5 tables)
- `sleep_logs` - Sleep tracking data
- `sensor_data_snapshots` - Wearable device aggregates
- `biometric_snapshots` - Pre-computed 7d/30d statistics
- `correlation_findings` - Discovered patterns
- `biometric_snapshots` (indexed cache)

#### 9. Acoustic Myography (5 tables)
- `acoustic_baselines` - Rested muscle sound signatures
- `acoustic_sessions` - Workout monitoring sessions
- `acoustic_audio_chunks` - Individual audio samples (optional)
- `muscle_fatigue_readings` - Current fatigue state (materialized)
- `acoustic_fatigue_trends` - Aggregated trend analysis

#### 10. System & Infrastructure (5 tables)
- `notifications` - Push notification queue
- `activity_events` - Event sourcing for analytics
- `system_metrics` - System-wide statistics
- `migrations` - Drizzle migration tracking

---

## ER Diagram

### High-Level Domain Relationships

```
┌─────────────────────────────────────────────────────────────────────┐
│                            users (PK: id)                           │
├─────────────────────────────────────────────────────────────────────┤
│  id (PK)        │ email (UQ)  │ name  │ age  │ gender  │ ...      │
└────────────┬──────────────────────────────────────────────────────┘
             │
             │ 1:N (CASCADE)
             ▼
    ┌────────────────┐
    │  sessions      │
    └────────────────┘
    ┌────────────────┐
    │  body_photos   │
    └────────────────┘
    ┌────────────────┐
    │  body_metrics  │
    └────────────────┘
    ┌────────────────┐
    │  workouts      │
    └────────────────┘
    ┌────────────────┐
    │  conversations │
    └────────────────┘
    ┌────────────────┐
    │  ai_recommendations │
    └────────────────┘
    ... (references users.id in 40+ tables)
```

### Detailed Relationship Map

**User → Body Analysis:**
```
users 1→N body_photos
body_photos 1→N body_heatmaps
body_heatmaps → body_heatmap_history
users 1→N body_metrics
users 1→N vision_analyses
users 1→N body_insights
users 1→N body_avatar_models → body_projections
```

**User → Nutrition:**
```
users 1→N food_logs → food_items
users 1→N daily_nutrition_summaries (per date)
users 1→N nutrition_consults
users 1→1 user_macro_targets
user_macro_targets 1→N macro_adjustment_sessions
macro_adjustment_sessions 1→N macro_adjustment_logs
```

**User → Workouts:**
```
users 1→N workout_routines
workout_routines 1→N routine_exercises
users 1→N workouts
workouts 1→N workout_exercises
workouts 1→N workout_completions
workout_routines → daily_schedules
```

**User → AI Memory:**
```
users 1→N memory_nodes
memory_nodes 1→N memory_edges (both from/to nodes)
users 1→N conversations
users 1→N compressed_contexts
users 1→N ai_recommendations
```

**User → Gamification:**
```
users 1→1 gamification_profiles
users 1→N badges
users 1→N achievements
users 1→N point_transactions
users 1→N daily_checkins
users 1→N social_proof_cards
users 1→N shareable_content
users 1→N streak_freezes
users 1→N leaderboard_snapshots (via data JSON)
```

**Workout → Form Analysis:**
```
workouts 1→1 form_analysis_videos (optional)
form_analysis_videos 1→1 form_analyses
```

**User → Acoustic Myography:**
```
users 1→N acoustic_baselines (per muscle group, unique)
acoustic_baselines 1→N acoustic_sessions
acoustic_sessions 1→N acoustic_audio_chunks
acoustic_sessions 1→N muscle_fatigue_readings (latest per muscle)
acoustic_sessions → acoustic_fatigue_trends (aggregated)
```

---

## Indexing Strategy

### Index Principles

For Cloudflare D1 (edge SQLite), we follow these guidelines:

1. **Always index foreign keys** - Every `user_id`, `workout_id`, etc.
2. **Composite indexes for common queries** - `(user_id, created_at DESC)` for "get user's recent X"
3. **Covering indexes for hot paths** - Include all columns needed to avoid table lookup
4. **Descending indexes for time-series** - `timestamp DESC` for recent-first queries
5. **Partial indexes for filtered queries** - Where applicable (SQLite 3.8+)
6. **Unique constraints for data integrity** - Prevent duplicates at DB level

### Current Index Count: 86+

#### By Table:

| Table | Indexes | Purpose |
|-------|---------|---------|
| users | 1 (email unique) | Login lookup |
| sessions | 3 | User sessions, provider lookup |
| body_photos | 2 | User photos, analysis status |
| body_metrics | 2 | User history (time-series) |
| body_heatmaps | 2 | User heatmaps, by photo |
| body_heatmap_history | 3 | User history, snapshots |
| vision_analyses | 2 | User analyses, recent |
| food_items | 2 (1 unique) | Name search, deduplication |
| food_logs | 4 | User logs, by time, by meal |
| daily_nutrition_summaries | 2 (composite) | User + date lookup |
| nutrition_consults | 4 | User history, sessions |
| workouts | 4 | User workouts, status, time |
| workout_exercises | 1 (workout_id) | Exercises per workout |
| workout_routines | 3 | User routines, active |
| routine_exercises | 1 (routine_id) | Exercises per routine |
| workout_completions | 3 | Completion tracking |
| daily_schedules | 2 | User schedules, by routine |
| workout_templates | 1 (user_id) | User templates |
| conversations | 2 | User chat history |
| ai_recommendations | 4 | User recommendations, unread |
| memory_nodes | 3 | User memories, by type |
| memory_edges | 3 | Graph traversal |
| compressed_contexts | 2 | User contexts by time |
| gamification_profiles | 1 (unique user_id) | Profile lookup |
| badges | 1 (user_id) | User badges |
| achievements | 2 | User goals, completion status |
| social_proof_cards | 3 | User cards, public |
| activity_events | 4 | Event tracking |
| system_metrics | 1 (timestamp PK) | Time-series metrics |
| user_analytics | 1 (user_id PK) + 2 | Analytics queries |
| shareable_content | 3 | User content, public |
| form_analysis_videos | 4 | User videos, status |
| form_analyses | 4 | User analyses, exercise |
| notifications | 3 | User notifications, status |
| daily_checkins | 1 (unique user+date) + 1 | Streak tracking |
| streak_freezes | 1 (user_id) | User freezes |
| point_transactions | 2 | User history |
| leaderboard_snapshots | 1 (date PK) | Daily snapshots |
| social_relationships | 2 | Friendships |
| live_workout_sessions | 3 | Active sessions, status |
| set_rpe_logs | 3 | Session RPE logs |
| sleep_logs | 2 (1 unique) | User sleep, by date |
| sensor_data_snapshots | 2 | User sensors, by period |
| biometric_snapshots | 2 | User snapshots, cache |
| correlation_findings | 2 | User findings, by snapshot |
| acoustic_baselines | 2 (1 unique) | User baselines, per muscle |
| acoustic_sessions | 2 | User sessions, by time |
| acoustic_audio_chunks | 2 | Session chunks |
| muscle_fatigue_readings | 4 | User fatigue state |
| acoustic_fatigue_trends | 2 | User trends, by period |
| user_macro_targets | 1 (user_id PK) | User macros |
| macro_adjustment_sessions | 2 | User sessions, active |
| macro_adjustment_logs | 3 | Session history |
| body_avatar_models | 1 (unique user_id) | User avatar |
| body_projections | 3 | User projections, cache |

### Critical Indexes for Edge Performance

These indexes are crucial for Cloudflare Workers edge responses (<50ms):

```sql
-- User authentication & profile
CREATE INDEX idx_users_email ON users(email); -- Already unique
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_created ON sessions(created_at DESC);

-- Dashboard queries (most common)
CREATE INDEX idx_workouts_user_created ON workouts(user_id, created_at DESC);
CREATE INDEX idx_food_logs_user_logged ON food_logs(user_id, logged_at DESC);
CREATE INDEX idx_conversations_user_created ON conversations(user_id, created_at DESC);
CREATE INDEX idx_body_metrics_user_time ON body_metrics(user_id, timestamp DESC);
CREATE INDEX idx_sleep_user_date ON sleep_logs(user_id, date DESC);

-- Gamification
CREATE INDEX idx_point_transactions_user_created ON point_transactions(user_id, created_at DESC);
CREATE INDEX idx_daily_checkins_user_date ON daily_checkins(user_id, date);
CREATE INDEX idx_gamification_profiles_user_id ON gamification_profiles(user_id);

-- AI Recommendations (unread filter)
CREATE INDEX idx_ai_recs_unread ON ai_recommendations(user_id, is_read);
```

---

## Query Optimization

### Common Query Patterns & Optimal Indexes

#### 1. Get User's Recent Workouts (Dashboard)
```sql
-- Pattern: Fetch last N workouts for a user, ordered by time
SELECT * FROM workouts 
WHERE user_id = ? 
ORDER BY created_at DESC 
LIMIT 20;

-- Required index: (user_id, created_at DESC)
-- ✅ Covered by: idx_workouts_created (user_id, created_at DESC) in schema
```

#### 2. Get Food Logs for Date Range
```sql
-- Pattern: Fetch food logs for user within date range
SELECT * FROM food_logs 
WHERE user_id = ? 
  AND logged_at >= ? 
  AND logged_at <= ?
ORDER BY logged_at DESC;

-- Required index: (user_id, logged_at DESC)
-- ✅ Covered by: idx_food_logs_logged
```

#### 3. Get Daily Nutrition Summary
```sql
-- Pattern: Get today's nutrition summary
SELECT * FROM daily_nutrition_summaries 
WHERE user_id = ? 
  AND date = ?;

-- Required index: (user_id, date)
-- ✅ Covered by: idx_user_date (composite) - also UNIQUE
```

#### 4. Get AI Recommendations (Unread)
```sql
-- Pattern: Fetch unread recommendations sorted by priority
SELECT * FROM ai_recommendations 
WHERE user_id = ? 
  AND is_read = 0 
ORDER BY created_at DESC;

-- Required index: (user_id, is_read)
-- ✅ Covered by: idx_ai_recs_unread
```

#### 5. Get User's Latest Body Metrics
```sql
-- Pattern: Get most recent body measurement
SELECT * FROM body_metrics 
WHERE user_id = ? 
ORDER BY timestamp DESC 
LIMIT 1;

-- Required index: (user_id, timestamp DESC)
-- ✅ Covered by: idx_body_metrics_user_time
```

#### 6. Get Chat History with Pagination
```sql
-- Pattern: Fetch conversation history with cursor pagination
SELECT * FROM conversations 
WHERE user_id = ? 
  AND created_at < ? 
ORDER BY created_at DESC 
LIMIT 50;

-- Required index: (user_id, created_at DESC)
-- ✅ Covered by: idx_conversations_created
```

#### 7. Get Streak Information
```sql
-- Pattern: Check if user checked in today for streak
SELECT * FROM daily_checkins 
WHERE user_id = ? 
  AND date = ?;

-- Required index: (user_id, date) UNIQUE
-- ✅ Covered by: unique_user_date
```

#### 8. Get Workout with Exercises
```sql
-- Pattern: Fetch workout details with all exercises
SELECT w.*, we.* 
FROM workouts w
JOIN workout_exercises we ON we.workout_id = w.id
WHERE w.id = ?;

-- Indexes: 
-- workouts(id) PK ✅
-- workout_exercises(workout_id) ✅
```

#### 9. Get Active Routine with Exercises
```sql
-- Pattern: Fetch user's active routine with exercises
SELECT wr.*, re.* 
FROM workout_routines wr
JOIN routine_exercises re ON re.routine_id = wr.id
WHERE wr.user_id = ? 
  AND wr.is_active = 1;

-- Required indexes:
-- (user_id, is_active) on workout_routines ✅ idx_routines_active
-- (routine_id) on routine_exercises ✅
```

#### 10. Get Leaderboard (Top N)
```sql
-- Pattern: Get top users by points
SELECT u.*, gp.total_points 
FROM gamification_profiles gp
JOIN users u ON u.id = gp.user_id
ORDER BY gp.total_points DESC 
LIMIT 100;

-- Index: total_points DESC (consider covering index)
-- Note: Leaderboard uses snapshots for performance
-- Query against leaderboard_snapshots(date) PK
```

### Anti-Patterns to Avoid

1. **SELECT *** - Always specify columns needed
2. **Missing WHERE on user_id** - Always filter by user for multi-tenant data
3. **OFFSET pagination** - Use cursor-based (WHERE created_at < last_seen)
4. **JSON extraction in WHERE** - Store structured data in proper columns
5. **N+1 queries** - Use JOINs or batch queries with Drizzle
6. **Large IN clauses** - Batch into chunks of 100 or use temporary tables

### Query Performance Tips

#### Use Drizzle's Query Builder Efficiently

```typescript
// ✅ GOOD - Uses index on (user_id, created_at DESC)
const workouts = await db.select()
  .from(workouts)
  .where(eq(workouts.userId, userId))
  .orderBy(desc(workouts.createdAt))
  .limit(20);

// ❌ BAD - Forces full scan (missing index on status)
const completed = await db.select()
  .from(workouts)
  .where(
    and(
      eq(workouts.userId, userId),
      eq(workouts.status, 'completed')
    )
  );
// FIX: Add composite index (user_id, status)
```

#### Batch Operations

```typescript
// ✅ Batch inserts for related data
await db.insert(workoutExercises).values(exercises);

// ✅ Use transaction for atomic operations
await db.transaction(async (tx) => {
  await tx.insert(workouts).values(workout);
  await tx.insert(workoutExercises).values(exercises);
  await tx.insert(dailySchedules).values(schedule);
});
```

---

## Cloudflare D1 Specific Optimizations

### Edge Computing Considerations

Cloudflare Workers run on edge locations globally. D1 databases are **region-scoped**, meaning all edge workers query the same database region. Optimize for:

1. **Minimize query complexity** - Simple queries execute faster at edge
2. **Use covering indexes** - Avoid table lookups when possible
3. **Connection pooling** - D1 handles this automatically, but batch writes
4. **Cold start mitigation** - Cache frequently accessed data in KV

### Recommended KV Namespaces for Caching

Based on our schema analysis, here are cache recommendations:

```toml
# wrangler.toml
[[kv_namespaces]]
binding = "USER_PROFILE_CACHE"
id = "user-profile-cache-id"

[[kv_namespaces]]
binding = "WORKOUT_PLAN_CACHE"
id = "workout-plan-cache-id"

[[kv_namespaces]]
binding = "NUTRITION_CACHE"
id = "nutrition-cache-id"

[[kv_namespaces]]
binding = "AI_RESPONSE_CACHE"
id = "ai-response-cache-id"

[[kv_namespaces]]
binding = "LEADERBOARD_CACHE"
id = "leaderboard-cache-id"
```

#### Cache Strategy

| Data Type | TTL | Invalidation |
|-----------|-----|--------------|
| User profile | 5 min | On user update |
| Workout routine | 15 min | On routine modification |
| Food items DB | 1 hour | Rarely changes |
| AI chat responses | 1 hour | User-specific, hash-based key |
| Leaderboard | 5 min | Daily recalculation |
| Daily summaries | 30 min | At midnight rebuild |

### SQLite Compatibility Notes

Cloudflare D1 is SQLite 3 compatible with these limitations:

1. **No ALTER TABLE DROP COLUMN** - Must create new table, copy data, drop old, rename
2. **Limited ALTER TABLE ADD COLUMN** - Only adds to end, no NOT NULL without DEFAULT
3. **No partial indexes** (until SQLite 3.8+ - D1 supports) - Use with caution
4. **No generated columns** - Compute in application
5. **No full-text search (FTS5)** - Use external search or LIKE queries
6. **Max 10GB per database** - Plan growth accordingly

### Data Type Optimizations

| Type | Recommended | Avoid |
|------|-------------|-------|
| IDs | TEXT (UUID) | INTEGER (auto-increment doesn't work across Workers) |
| Timestamps | INTEGER (Unix seconds) | DATETIME (slower) |
| Booleans | INTEGER (0/1) | BOOLEAN (not a SQLite type) |
| JSON | TEXT (JSON string) | BLOB (no benefit) |
| Enums | TEXT with CHECK constraint | Separate lookup tables (overkill) |
| Money | INTEGER (cents) | REAL (floating point errors) |

---

## Security Best Practices

### Row-Level Security (RLS) Considerations

**Important:** Cloudflare D1 does **NOT** support PostgreSQL-style Row Level Security.

Instead, implement **application-level security**:

```typescript
// ✅ ALWAYS include user_id in WHERE clauses
const getUserWorkouts = async (tx, userId: string) => {
  return await tx.select()
    .from(workouts)
    .where(eq(workouts.userId, userId)); // Mandatory filter
};

// ❌ NEVER do this (exposes all users' data)
const getAllWorkouts = async () => {
  return await db.select().from(workouts); // DANGEROUS!
};
```

### SQL Injection Prevention

Drizzle ORM uses prepared statements by default - **always use the query builder**:

```typescript
// ✅ SAFE - Uses parameterized queries
await db.select()
  .from(workouts)
  .where(eq(workouts.id, workoutId)); // Safe

// ❌ DANGEROUS - String concatenation
const query = `SELECT * FROM workouts WHERE id = '${workoutId}'`;
await db.execute(query); // SQL injection risk!
```

### Sensitive Data Handling

1. **Never store plaintext passwords** - Using OAuth only (no passwords stored)
2. **OAuth tokens encrypted** - `sessions.access_token` should be encrypted at rest
3. **PII minimization** - Store only necessary personal data (GDPR compliance)
4. **Data retention policies** - Implement automated cleanup for soft-deleted data
5. **Audit logging** - `activity_events` table tracks all user actions

### Data Retention & GDPR

Implement soft deletes with scheduled cleanup:

```sql
-- Instead of DELETE, mark as deleted
UPDATE users SET deleted_at = ? WHERE id = ?;

-- Weekly cleanup job (Cron trigger)
DELETE FROM conversations 
WHERE user_id NOT IN (SELECT id FROM users WHERE deleted_at IS NULL)
  AND created_at < ?;
```

---

## Migration Management

### Creating New Migrations

**Option 1: Using Drizzle Kit (Interactive)**
```bash
cd packages/db
pnpm exec drizzle-kit generate
# Follow interactive prompts to resolve schema changes
```

**Option 2: Manual Migration (CI/CD Safe)**

When drizzle-kit fails in non-TTY environments (like CI):

1. Update `src/schema.ts` with new tables/indexes
2. Create migration file manually:
   ```bash
   touch drizzle/migrations/0018_new_feature.sql
   ```
3. Copy the auto-generated format from existing migrations
4. Test migration locally:
   ```bash
   pnpm run migrate:local
   ```
5. Commit both `schema.ts` and migration file together

### Migration File Naming

- Format: `NNNN_description.sql`
- Sequential numbers only (no skipping)
- Use snake_case for description
- Keep descriptions short but clear

### Migration Best Practices

1. **Always include DOWN migration** - Must be reversible
2. **Test UP and DOWN** - Rollback should work cleanly
3. **Add indexes concurrently** - SQLite allows CREATE INDEX concurrently
4. **Use IF NOT EXISTS** - Safe for re-runs in development
5. **One change per migration** - Easier to rollback specific changes
6. **Document breaking changes** - Add comments in migration file

### Schema Change Workflow

```bash
# 1. Make changes to schema.ts
# 2. Generate migration (or create manually)
# 3. Review migration SQL
# 4. Test locally:
pnpm run migrate:local

# 5. Check schema compiles
pnpm run build

# 6. Run tests
pnpm test

# 7. Commit with message:
# "feat(db): add indexes for form analysis performance"
```

### Migration History

Current schema version: **0017_add_missing_indexes**

See `drizzle/migrations/` directory for all migration files.

---

## Seeding Strategy

### Development Seeding

The database includes a comprehensive seed script:

```bash
# 1. Apply migrations
pnpm run migrate:local

# 2. Seed with mock data
pnpm run seed:mock
```

**Seed Data Includes:**
- 1 admin user with OAuth session
- Complete gamification profile (Level 5, 2,500 points, 30-day streak)
- 90 days of body metrics history
- 3 body photos with analysis
- 4-week workout routine with exercises
- 20 completed workouts
- 50 workout exercise logs
- 30 body insights (recovery data)
- 5 active fitness goals
- 10 AI recommendations
- 25 conversation messages
- 50 memory nodes with relationships
- 8 badges earned
- 30 sleep logs
- 50 point transactions
- 5 notifications
- 30 daily checkins

### Production Seeding

**DO NOT run seed:mock in production!**

For production, create separate seed scripts:

```bash
# Minimal seed for production (only essential reference data)
pnpm exec tsx src/seed-reference.ts

# Or use data import from CSV
pnpm exec tsx src/import-food-items.ts data/food_db.csv
```

### Fixtures for Testing

The package includes `src/__tests__/mock-data.ts` with typed fixtures:

```typescript
import { mockData } from './__tests__/mock-data';

// Use in tests:
await db.insert(users).values(mockData.users[0]);
```

---

## Performance Monitoring

### Key Metrics to Track

1. **Query Latency**
   - Target: P95 < 50ms for simple queries
   - Target: P95 < 200ms for complex joins
   - Monitor slow queries (>500ms)

2. **Cache Hit Rates**
   - KV cache hit rate > 80%
   - Track per-namespace metrics

3. **Database Size**
   - Monitor growth: Current ~500MB for 10K users
   - Project 10GB limit at ~200K users

4. **Connection Count**
   - D1 handles pooling automatically
   - Monitor concurrent queries limit (10K QPS max)

### Setting Up Monitoring

```typescript
// Add query logging in development
import { drizzle } from 'drizzle-orm/d1';
import { Logger } from 'minimallogger';

const logger = new Logger();

const db = drizzle(env.DB, {
  logger: (event) => {
    if (event.query) {
      logger.info({
        query: event.query,
        params: event.params,
        duration: event.duration,
      });
    }
  },
});
```

### Production Alerting Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Query latency P95 | >200ms | >500ms |
| Error rate | >1% | >5% |
| Cache miss rate | >50% | >80% |
| DB size | >5GB | >10GB |
| Storage used | >80% | >95% |

---

## Future Considerations

### Scaling Beyond 100K Users

1. **Database Sharding**
   - D1 doesn't support sharding
   - Consider splitting by tenant or region if needed
   - Use multiple D1 databases with routing layer

2. **Read Replicas**
   - Cloudflare D1 doesn't offer read replicas yet
   - Implement application-level read-through cache with KV
   - Cache frequently accessed data (user profiles, routines)

3. **Data Archiving**
   - Move old conversations (>1 year) to R2 as JSON blobs
   - Archive completed workout history to R2
   - Keep only recent 90 days in hot storage

4. **Full-Text Search**
   - D1 lacks FTS
   - Options: Cloudflare Vectorize, external Elasticsearch, or pg_search on D1+
   - For now: Use LIKE queries with index support

### Schema Evolution

As features grow, consider:

1. **Table Partitioning by Time**
   - Partition `activity_events`, `conversations` by month
   - Improves query performance and cleanup

2. **JSONB Columns for Flexibility**
   - Store variable metadata in JSON
   - Create generated columns for frequently queried JSON fields

3. **Materialized Views**
   - Pre-compute aggregates (already using materialized tables)
   - Refresh via cron jobs

4. **Event Sourcing**
   - Store all state changes as events
   - Replay to rebuild any state
   - Already have `activity_events` table - could expand

---

## Appendix

### A. Complete Index List

See `schema.ts` for all table definitions with indexes.

### B. Migration Commands

```bash
# Generate new migration (interactive)
pnpm exec drizzle-kit generate

# Apply migrations locally
pnpm run migrate:local

# Apply migrations to production (via deploy script only)
./scripts/deploy.sh

# Rollback last migration (manual SQL)
pnpm exec wrangler d1 execute aivo-db --local --command "
  -- Apply down migration SQL
"
```

### C. Database Connection Utilities

```typescript
// packages/db/src/index.ts
import { drizzle } from 'drizzle-orm/d1';
import { migrate } from 'drizzle-orm/d1/migrator';

export const db = drizzle(env.DB);

export async function runMigrations() {
  await migrate(db, { migrationsFolder: './drizzle/migrations' });
}
```

### D. Query Performance Checklist

Before deploying new query:

- [ ] Uses index (EXPLAIN QUERY PLAN shows INDEX SCAN)
- [ ] Filters on user_id first (multi-tenant)
- [ ] Limits result set (pagination)
- [ ] Selects only needed columns (not SELECT *)
- [ ] No full table scans
- [ ] Joins use indexed foreign keys
- [ ] ORDER BY uses index (avoid filesort)
- [ ] No redundant queries (cached where appropriate)

### E. Useful SQLite Queries

```sql
-- Show query plan
EXPLAIN QUERY PLAN
SELECT * FROM workouts WHERE user_id = 'xxx';

-- List all indexes
SELECT * FROM sqlite_master WHERE type = 'index';

-- Table size
SELECT 
  name,
  (COUNT(*) * page_size * 1.0 / 1024 / 1024) as size_mb
FROM dbstat 
GROUP BY name;

-- Index usage stats (requires sqlite3_stat)
SELECT * FROM sqlite_stat1 WHERE tbl = 'workouts';
```

---

## Contact & Questions

For database-related questions:
- Review this document and `ARCHITECTURE.md`
- Check drizzle-orm documentation: https://orm.drizzle.team
- Cloudflare D1 docs: https://developers.cloudflare.com/d1/

**Database Owner:** Senior Database Engineer  
**Last Reviewed:** 2026-04-27

---

**END OF DATABASE OPTIMIZATION GUIDE**
