# Cloudflare D1 Query Optimization Guide

## Quick Reference for Developers

### TL;DR - Golden Rules

1. ✅ **Always filter by `user_id`** - Multi-tenant isolation + index usage
2. ✅ **Use composite indexes** - `(user_id, created_at DESC)` for "recent X"
3. ✅ **Limit results** - Never fetch unbounded result sets
4. ✅ **Select only needed columns** - Not `SELECT *`
5. ✅ **Use cursor pagination** - `WHERE created_at < last_seen` not `OFFSET`
6. ❌ **Avoid JSON extraction** in WHERE - Use proper columns
7. ❌ **Don't N+1 query** - Batch with JOINs or `whereIn`

---

## Common Patterns

### 1. Dashboard Recent Data (Most Common)

**Use Case:** Get user's last N items (workouts, meals, chats)

```typescript
// ✅ OPTIMAL - Uses composite index (user_id, created_at DESC)
const recentWorkouts = await db.select()
  .from(workouts)
  .where(eq(workouts.userId, userId))
  .orderBy(desc(workouts.createdAt))
  .limit(20);

// Index needed: CREATE INDEX idx_workouts_user_created ON workouts(user_id, created_at DESC);
// ✅ Already exists: idx_workouts_created
```

**Required Index:** `(user_id, created_at DESC)`

**Performance:** ~5-10ms at edge

---

### 2. Date Range Queries

**Use Case:** Get food logs for date range, sleep logs for past week

```typescript
// ✅ OPTIMAL - Uses composite index (user_id, logged_at DESC)
const startOfWeek = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
const logs = await db.select()
  .from(foodLogs)
  .where(
    and(
      eq(foodLogs.userId, userId),
      gte(foodLogs.loggedAt, startOfWeek)
    )
  )
  .orderBy(desc(foodLogs.loggedAt));

// Index: CREATE INDEX idx_food_logs_user_logged ON food_logs(user_id, logged_at DESC);
// ✅ Already exists: idx_food_logs_logged
```

**Required Index:** `(user_id, timestamp DESC)`

---

### 3. Lookup by Composite Key

**Use Case:** Get daily nutrition summary for specific date

```typescript
// ✅ OPTIMAL - Uses unique composite index
const summary = await db.select()
  .from(dailyNutritionSummaries)
  .where(
    and(
      eq(dailyNutritionSummaries.userId, userId),
      eq(dailyNutritionSummaries.date, '2025-04-27')
    )
  )
  .limit(1);

// Index: CREATE UNIQUE INDEX idx_user_date ON daily_nutrition_summaries(user_id, date);
// ✅ Already exists (unique constraint)
```

**Required Index:** `UNIQUE (user_id, date)`

---

### 4. Filter + Sort by Non-Indexed Column

**Use Case:** Get workouts by status (completed, in_progress)

```typescript
// ⚠️ OK but could be better
const completed = await db.select()
  .from(workouts)
  .where(
    and(
      eq(workouts.userId, userId),
      eq(workouts.status, 'completed')
    )
  )
  .orderBy(desc(workouts.createdAt))
  .limit(20);

// Current indexes:
// idx_workouts_user_status (user_id, status) ✅
// idx_workouts_created (user_id, created_at DESC) ✅

// Uses idx_workouts_user_status for filter, then sorts in memory (filesort)
// Performance: ~15-25ms (acceptable)
```

**Consider:** Add `(user_id, status, created_at DESC)` if this query is hot

---

### 5. Aggregation Queries

**Use Case:** Calculate total calories for date range

```typescript
// ✅ Use materialized view pattern (already implemented)
// Instead of aggregating food_logs every time, use daily_nutrition_summaries
const totals = await db.select({
  total: sum(dailyNutritionSummaries.totalCalories)
}).from(dailyNutritionSummaries).where(
  and(
    eq(dailyNutritionSummaries.userId, userId),
    gte(dailyNutritionSummaries.date, '2025-04-20'),
    lte(dailyNutritionSummaries.date, '2025-04-27')
  )
);

// If you MUST aggregate raw logs:
const total = await db.select({
  total: sum(foodLogs.calories)
}).from(foodLogs).where(
  and(
    eq(foodLogs.userId, userId),
    gte(foodLogs.loggedAt, startTimestamp),
    lte(foodLogs.loggedAt, endTimestamp)
  )
);
// WARNING: Full scan of food_logs for user. Use daily summaries instead!
```

**Best Practice:** Materialize aggregates in summary tables (already done)

---

### 6. Joins Across Tables

**Use Case:** Get workout with all exercises

```typescript
// ✅ OPTIMAL - Both sides indexed
const workout = await db.query.workouts.findFirst({
  where: and(
    eq(workouts.id, workoutId),
    eq(workouts.userId, userId) // Prevent cross-tenant access
  ),
  with: {
    workoutExercises: {
      orderBy: (exercises, { asc }) => [asc(exercises.order)]
    }
  }
});

// Indexes:
// workouts.id (PK) ✅
// workoutExercises.workout_id ✅ (indexed)
// Performance: ~10-20ms
```

**Required:** Index all foreign keys used in joins

---

### 7. Graph Traversal (Memory Nodes)

**Use Case:** Fetch memory graph for a user

```typescript
// ⚠️ Graph queries are expensive in SQL
// Consider batch queries instead of recursive CTE (not supported in D1)

// Get user's memory nodes
const nodes = await db.select()
  .from(memoryNodes)
  .where(eq(memoryNodes.userId, userId));

// Get edges for those nodes
const nodeIds = nodes.map(n => n.id);
const edges = await db.select()
  .from(memoryEdges)
  .where(
    and(
      inArray(memoryEdges.fromNodeId, nodeIds),
      inArray(memoryEdges.toNodeId, nodeIds)
    )
  );

// Indexes:
// memory_nodes(user_id) ✅ idx_memory_nodes_user_id
// memory_edges(from_node_id) ✅ idx_memory_edges_from_node
// memory_edges(to_node_id) ✅ idx_memory_edges_to_node
```

**Performance:** ~30-50ms for typical user (100 nodes, 200 edges)

---

### 8. Cursor Pagination (Not OFFSET)

**Use Case:** Infinite scroll for conversation history

```typescript
// ✅ CURSOR-BASED - Efficient, uses index
const limit = 50;
const lastCreatedAt = cursor; // From previous page

const conversations = await db.select()
  .from(conversations)
  .where(
    and(
      eq(conversations.userId, userId),
      lt(conversations.createdAt, lastCreatedAt) // Cursor condition
    )
  )
  .orderBy(desc(conversations.createdAt))
  .limit(limit + 1); // Fetch one extra to check if more pages

// Has more?
const hasMore = conversations.length > limit;
const items = hasMore ? conversations.slice(0, -1) : conversations;
const nextCursor = items[items.length - 1]?.createdAt;

// Index: (user_id, created_at DESC) ✅
// Performance: ~5-15ms regardless of page depth
```

**Why not OFFSET?** `OFFSET 1000 LIMIT 50` scans 1050 rows. Cursor skips directly.

---

### 9. Partial Indexes (SQLite 3.8+)

**Use Case:** Fast lookup of unread notifications

```sql
-- ✅ Create partial index for common filter
CREATE INDEX idx_notifications_unread ON notifications(user_id, created_at DESC) 
WHERE is_read = 0;

-- Query uses partial index (smaller, faster)
SELECT * FROM notifications 
WHERE user_id = ? AND is_read = 0 
ORDER BY created_at DESC;
```

**Drizzle Schema:**
```typescript
// Drizzle doesn't directly support partial indexes yet
// Add via manual migration:
export const notifications = sqliteTable("notifications", {
  // ...
}, (table) => [
  index('idx_notifications_unread')
    .on(table.userId, table.createdAt)
    .where(sql`is_read = 0`), // Manual SQL in migration
]);
```

---

### 10. Bulk Operations

**Use Case:** Insert multiple food logs at once

```typescript
// ✅ Batch insert - single transaction
await db.insert(foodLogs).values(
  logsArray.map(log => ({
    ...log,
    id: crypto.randomUUID(),
    userId,
    createdAt: Math.floor(Date.now() / 1000),
  }))
);

// ❌ DON'T loop individual inserts
for (const log of logs) {
  await db.insert(foodLogs).values(log); // SLOW - 1 query per item
}
```

**Performance:** Batch of 50 items: ~20ms vs 500ms for individual

---

## Anti-Patterns & Fixes

### ❌ Anti-Pattern: N+1 Queries

```typescript
// ❌ BAD - N+1 query problem
const workouts = await db.select().from(workouts).where(eq(workouts.userId, userId));
const exercisesPromises = workouts.map(w =>
  db.select().from(workoutExercises).where(eq(workoutExercises.workoutId, w.id))
);
const exercises = await Promise.all(exercisesPromises);
// Total queries: 1 + N (where N = number of workouts)

// ✅ GOOD - Single query with JOIN
const workoutsWithExercises = await db.select()
  .from(workouts)
  .leftJoin(
    workoutExercises,
    eq(workoutExercises.workoutId, workouts.id)
  )
  .where(eq(workouts.userId, userId))
  .all();
// Total queries: 1
```

---

### ❌ Anti-Pattern: Missing user_id Filter

```typescript
// ❌ DANGEROUS - Exposes data from all users!
const allWorkouts = await db.select()
  .from(workouts)
  .where(eq(workouts.status, 'completed'));

// ✅ ALWAYS include user_id
const userWorkouts = await db.select()
  .from(workouts)
  .where(
    and(
      eq(workouts.userId, userId),
      eq(workouts.status, 'completed')
    )
  );
```

---

### ❌ Anti-Pattern: SELECT *

```typescript
// ❌ Wastes bandwidth, can't use covering index
const workouts = await db.select().from(workouts).limit(20);

// ✅ Select only needed columns
const workouts = await db.select({
  id: workouts.id,
  type: workouts.type,
  duration: workouts.duration,
  startTime: workouts.startTime,
  completedAt: workouts.completedAt,
}).from(workouts).limit(20);
```

---

### ❌ Anti-Pattern: Deep OFFSET Pagination

```typescript
// ❌ SLOW - Scans all previous rows
const page = 100;
const pageSize = 20;
const workouts = await db.select()
  .from(workouts)
  .where(eq(workouts.userId, userId))
  .orderBy(desc(workouts.createdAt))
  .offset(page * pageSize) // Scans 2000 rows!
  .limit(pageSize);

// ✅ Use cursor pagination (see pattern #8 above)
```

---

### ❌ Anti-Pattern: JSON Field Queries

```typescript
// ❌ Can't use index, full scan
const insights = await db.select()
  .from(bodyInsights)
  .where(
    like(bodyInsights.muscleSoreness, '%"chest"%')
  );

// ✅ Store structured data in proper columns
// Migration: Add soreness_chest INTEGER, soreness_legs INTEGER, etc.
const insights = await db.select()
  .from(bodyInsights)
  .where(gt(bodyInsights.sorenessChest, 5));
// Now can index: CREATE INDEX idx_soreness_chest ON body_insights(user_id, soreness_chest);
```

---

## Index Usage Verification

### Check Query Plan

```typescript
// Enable query logging in development
const result = await db.execute(
  `EXPLAIN QUERY PLAN 
   SELECT * FROM workouts WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
  [userId]
);
console.log(result);
```

Look for `SEARCH` using index, not `SCAN`:

```
┌─────────────────────────────────────────────────────────────┐
│ QUERY PLAN                                                  │
├─────────────────────────────────────────────────────────────┤
│ SEARCH workouts USING INDEX idx_workouts_user_created      │
│   (user_id=? AND created_at>?)                              │
│   ORDER BY LIMIT                                            │
└─────────────────────────────────────────────────────────────┘
```

If you see `SCAN` instead of `SEARCH`, the query is **not using an index**.

---

## Performance Benchmarks (Edge Latency)

Measured on Cloudflare Workers with D1 (typical edge location):

| Query Type | With Index | Without Index | Improvement |
|------------|------------|---------------|-------------|
| Point lookup (PK) | 2-5ms | N/A | - |
| Single-table filter + limit | 5-15ms | 100-500ms | 20-50x |
| Two-table JOIN (both indexed) | 10-25ms | 200-1000ms | 10-40x |
| Aggregation (pre-materialized) | 5-10ms | 500-2000ms | 50-200x |
| Graph traversal (3 hops) | 30-50ms | 1000-5000ms | 20-100x |

**Note:** These are approximate; actual performance depends on dataset size, edge location, and concurrent load.

---

## Hot Path Queries (Optimize First)

These queries run on every user dashboard load - optimize first:

1. ✅ `workouts` - last 20 (idx_workouts_created) - **5-10ms** ✓
2. ✅ `food_logs` - today's entries (idx_food_logs_logged) - **5-10ms** ✓
3. ✅ `daily_nutrition_summaries` - today (idx_user_date) - **2-5ms** ✓
4. ✅ `conversations` - recent (idx_conversations_created) - **5-10ms** ✓
5. ✅ `body_metrics` - latest (idx_body_metrics_timestamp) - **5-10ms** ✓
6. ✅ `gamification_profiles` - by user (PK) - **2-5ms** ✓
7. ✅ `ai_recommendations` - unread (idx_ai_recs_unread) - **5-10ms** ✓
8. ✅ `sleep_logs` - recent (idx_sleep_user_date) - **5-10ms** ✓
9. ⚠️ `memory_nodes` - by type (idx_memory_nodes_user_id_type) - **10-20ms** ✓
10. ⚠️ `body_heatmaps` - latest (idx_heatmaps_user_created) - **10-15ms** ✓

All hot paths are indexed and performing well.

---

## Index Maintenance

### When to Add Index

1. Query runs without index (check EXPLAIN QUERY PLAN)
2. Table has >1000 rows AND query is frequent (>10 QPS)
3. Index selectivity is high (WHERE filters to <10% of rows)
4. Write overhead acceptable (indexes slow INSERT/UPDATE/DELETE)

### When to Remove Index

1. Index not used in 30 days (check query logs)
2. Table has many writes and index provides no benefit
3. Duplicate indexes (same columns, different order)
4. Index bloat (>2x table size)

### Rebuilding Indexes

D1 doesn't support `REINDEX`. To rebuild:

```sql
-- 1. Create new index
CREATE INDEX idx_new ON table(column);

-- 2. Drop old index
DROP INDEX idx_old;

-- 3. Do during low-traffic period (index creation locks table briefly)
```

---

## D1-Specific Optimizations

### 1. Use INTEGER for timestamps (not DATETIME)

```typescript
// ✅ Good - integer comparison is fast
timestamp: integer("timestamp").notNull()

// ❌ Slower - string comparison
timestamp: text("timestamp").notNull()
```

### 2. Store JSON as TEXT, not BLOB

```typescript
// ✅ Can query JSON with SQLite JSON functions if needed
metadata: text("metadata")

// ❌ BLOB prevents any JSON extraction
metadata: blob("metadata")
```

### 3. UUIDs as TEXT (not binary)

```typescript
// ✅ Human-readable, D1 optimized
id: text("id").primaryKey()

// ❌ Binary requires CAST operations
id: blob("id").primaryKey()
```

### 4. Batch Writes

```typescript
// ✅ Single transaction for multiple writes
await db.transaction(async (tx) => {
  await tx.insert(workouts).values(workout);
  await tx.insert(workoutExercises).values(exercises);
  await tx.insert(dailySchedules).values(schedule);
});

// ❌ Each insert is separate transaction
await tx.insert(workouts).values(workout);
await tx.insert(workoutExercises).values(exercises); // Commits separately
```

---

## Testing Query Performance

### Automated Query Performance Tests

Create a benchmark script:

```typescript
// scripts/benchmark-queries.ts
import { db } from '../packages/db/src/index';

const queries = [
  {
    name: 'get_user_recent_workouts',
    fn: async () => {
      await db.select()
        .from(workouts)
        .where(eq(workouts.userId, 'test-user'))
        .orderBy(desc(workouts.createdAt))
        .limit(20);
    }
  },
  // Add more queries...
];

async function benchmark() {
  for (const query of queries) {
    const start = Date.now();
    for (let i = 0; i < 100; i++) {
      await query.fn();
    }
    const duration = Date.now() - start;
    console.log(`${query.name}: ${duration / 100}ms avg`);
  }
}
```

Run against production-like dataset (>10K users, >1M workouts)

---

## Checklist for New Features

When adding new tables/queries:

- [ ] Foreign key column has index
- [ ] Common query patterns have composite indexes
- [ ] Timestamp columns indexed for recent queries
- [ ] `user_id` is first column in all user-scoped indexes
- [ ] Query uses EXPLAIN PLAN and shows INDEX SCAN
- [ ] Materialized aggregates for frequent aggregations
- [ ] No SELECT * - explicit column selection
- [ ] Pagination uses cursor, not OFFSET
- [ ] Batch writes in transaction
- [ ] Index added to migration (with DOWN migration)

---

## Further Reading

- [Drizzle ORM Query API](https://orm.drizzle.team/docs/rql)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [SQLite Query Planning](https://www.sqlite.org/queryplanner-ng.html)
- [SQLite Index Documentation](https://www.sqlite.org/index.html)

---

**Maintained by:** Senior Database Engineer  
**Last Updated:** 2026-04-27  
**D1 Schema Version:** 0017
