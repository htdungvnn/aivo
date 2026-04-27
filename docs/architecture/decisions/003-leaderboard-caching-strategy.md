# ADR 003: Gamification Leaderboard Caching Strategy

## Status

**Accepted** (Proposed - needs team approval)

*Date: 2025-04-27*

## Context

Leaderboards are a core gamification feature in AIVO. Users compete on:
- Global leaderboards (all users)
- Friends leaderboards (social graph)
- Club leaderboards (members of specific clubs)
- Time periods: weekly, monthly, all-time

**Performance Requirements**:
- Leaderboard queries must return in <50ms (p95)
- Must support hundreds of concurrent leaderboard views
- Data should be reasonably fresh (staleness acceptable: 5 minutes for active periods, 1 hour for weekly)

**Challenges**:
- Leaderboard queries involve `ORDER BY points DESC, streak DESC` with `LIMIT 100`
- With 100K+ users, sorting on the fly is expensive (O(N log N))
- Real-time updates (every point transaction) would be too costly if we recalculated immediately
- Cloudflare D1 (SQLite) lacks built-in materialized views or ranking functions
- Need to support "find my rank" queries efficiently

## Decision

We will use a **multi-layer caching strategy** with materialized leaderboard tables:

### Architecture

```
Point Transaction → D1 (point_transactions) 
                   → Trigger/Job updates gamification_profiles.totalPoints
                   → Hourly batch job recalculates leaderboards table
                   → KV cache (5 min TTL) for hot leaderboard queries
                   → Client request checks KV first, falls back to DB
```

### Layer 1: Materialized `leaderboards` Table

A dedicated table storing pre-computed ranks for each (period, clubId, userId) combination.

**Schema** (see SOCIAL_FEATURES_DB_SCHEMA.md):
```sql
CREATE TABLE leaderboards (
  id TEXT PRIMARY KEY,  -- '{period}:{userId}:{clubId or "global"}'
  period TEXT NOT NULL, -- 'weekly', 'monthly', 'all_time'
  user_id TEXT NOT NULL REFERENCES users(id),
  rank INTEGER NOT NULL,
  points INTEGER DEFAULT 0,
  workout_count INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  club_id TEXT REFERENCES clubs(id),
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_leaderboard_period_club_rank ON leaderboards(period, club_id, rank);
CREATE INDEX idx_leaderboard_user_period ON leaderboards(user_id, period);
```

**Recalculation**:

Run hourly via Wrangler Cron Triggers:
```typescript
// apps/api/src/cron/leaderboard-recalculate.ts
export async function recalculateLeaderboards(c: Context) {
  const db = createDrizzleInstance(c.env.DB);
  const now = Math.floor(Date.now() / 1000);
  
  // 1. Calculate weekly leaderboard
  const weekly = await db.execute(sql`
    WITH user_points AS (
      SELECT 
        ph.user_id,
        SUM(ph.amount) as total_points,
        COUNT(DISTINCT wh.id) as workout_count,
        gp.streak_current as streak_days,
        gp.level
      FROM point_transactions ph
      JOIN gamification_profiles gp ON ph.user_id = gp.user_id
      LEFT JOIN workouts wh ON ph.workout_id = wh.id AND wh.created_at > ?
      WHERE ph.created_at > ?
      GROUP BY ph.user_id
    ),
    ranked AS (
      SELECT 
        user_id,
        total_points,
        workout_count,
        streak_days,
        level,
        ROW_NUMBER() OVER (ORDER BY total_points DESC, streak_days DESC) as rank
      FROM user_points
    )
    SELECT * FROM ranked
  `, [weekStart, weekStart]);
  
  // 2. Upsert into leaderboards table (transaction)
  await db.transaction(async (tx) => {
    // Clear old weekly
    await tx.delete(leaderboards).where(eq(leaderboards.period, 'weekly'));
    
    // Insert new ranks
    for (const row of weekly.rows) {
      await tx.insert(leaderboards).values({
        id: `weekly:${row.user_id}:`,
        period: 'weekly',
        userId: row.user_id,
        rank: row.rank,
        points: row.total_points,
        workoutCount: row.workout_count,
        streakDays: row.streak_days,
        level: row.level,
        clubId: null,
        updatedAt: now,
      });
    }
  });
  
  // 3. Same for monthly and club-specific leaderboards...
}
```

**Frequency**:
- Weekly leaderboard: Recalculate every 6 hours (more active)
- Monthly leaderboard: Recalculate every 12 hours
- Club leaderboards: Recalculate daily (less active)
- All-time leaderboard: Recalculate daily (cached for 24h)

### Layer 2: KV Cache (5-minute TTL)

Hot leaderboard data (top 100) cached in KV for sub-millisecond reads:

**KV Structure**:
```
Key: leaderboard:{period}:{clubId or 'global'}
Value: JSON array of [
  { rank, userId, points, streakDays, level, user: {name, picture} },
  ...
]
TTL: 300 seconds (5 minutes) for weekly/monthly, 86400 for all-time
```

**Cache Flow**:
```typescript
async function getLeaderboard(period: string, clubId: string | null, limit = 100) {
  const cacheKey = `leaderboard:${period}:${clubId || 'global'}`;
  
  // 1. Try KV cache
  const cached = await kv.get(cacheKey, 'json');
  if (cached) return cached;
  
  // 2. Cache miss: query materialized table
  const rows = await db.query.leaderboards.findMany({
    where: (lb) => 
      eq(lb.period, period).and(
        clubId ? eq(lb.clubId, clubId) : eq(lb.clubId, null)
      ),
    orderBy: (lb) => asc(lb.rank),
    limit,
    with: { user: true } // JOIN users for name/picture
  });
  
  const result = rows.map(row => ({
    rank: row.rank,
    userId: row.userId,
    points: row.points,
    streakDays: row.streakDays,
    level: row.level,
    user: {
      name: row.user.name,
      picture: row.user.picture,
    },
  }));
  
  // 3. Cache result
  await kv.put(cacheKey, JSON.stringify(result), { expirationTtl: 300 });
  
  return result;
}
```

**Cache Invalidation**:
- Leaderboard recalculation job clears relevant KV keys after updating table
- If recalc job runs hourly, cache TTL of 5 minutes provides freshness window
- On point transaction (rare case): `kv.delete(cacheKey)` to bust cache immediately (optional, eventual consistency OK)

---

### Layer 3: User Rank Lookup

Finding a specific user's rank is a separate query pattern:

```typescript
async function getUserRank(userId: string, period: string, clubId: string | null) {
  const cacheKey = `leaderboard:rank:${period}:${clubId || 'global'}:${userId}`;
  
  // 1. Try KV
  const cachedRank = await kv.get(cacheKey);
  if (cachedRank) return parseInt(cachedRank, 10);
  
  // 2. Query materialized table
  const entry = await db.query.leaderboards.findFirst({
    where: (lb) =>
      eq(lb.userId, userId).and(
        eq(lb.period, period)
      ).and(
        clubId ? eq(lb.clubId, clubId) : eq(lb.clubId, null)
      ),
  });
  
  if (!entry) return null;
  
  // 3. Cache individual rank (shorter TTL, 2 minutes)
  await kv.put(cacheKey, entry.rank.toString(), { expirationTtl: 120 });
  
  return entry.rank;
}
```

**Alternative**: Could store user's rank in `gamification_profiles` (denormalized) for O(1) lookup. Trade-off: requires update on every leaderboard recalc (writes). With hourly recalc, updating millions of user profiles is expensive. KV cache is better.

---

## Cache Invalidation Strategies

### Strategy 1: Time-Based (Simple)

Set TTL on KV entries. Leaderboard data is naturally stale after 5 minutes. Acceptable for user-facing display.

**Pros**: Simple, no invalidation logic needed  
**Cons**: Up to 5 minutes of staleness (usually fine)

---

### Strategy 2: Explicit Invalidation (Tiered)

After leaderboard recalculation job:
1. Update `leaderboards` table
2. Delete relevant KV keys: `kv.delete('leaderboard:weekly:global')`
3. Next request will repopulate cache

For user rank lookups:
- Delete all keys matching `leaderboard:rank:weekly:*` (scanning KV not possible)
- Instead: Use versioned keys: `leaderboard:v2:weekly:global` - increment version after recalc
- Old entries expire naturally

**Pros**: Guarantees cache coherence  
**Cons**: More complex, requires version management

---

### Strategy 3: Write-Through Cache

On point transaction:
```typescript
async function awardPoints(userId: string, amount: number, reason: string) {
  // 1. Award points in transaction
  await db.transaction(async (tx) => {
    await tx.insert(point_transactions).values({...});
    await tx.update(gamification_profiles)
      .set({ totalPoints: sql`total_points + ${amount}` })
      .where(eq(gamificationProfiles.userId, userId));
  });
  
  // 2. Invalidate leaderboard cache
  await kv.delete('leaderboard:weekly:global');
  await kv.delete(`leaderboard:rank:weekly:global:${userId}`);
}
```

**Pros**: Immediate consistency  
**Cons**: Point transactions are frequent (multiple per user per day). Invalidation on every transaction causes cache thrashing (stale data anyway until recalc). **Not recommended**.

---

**Chosen**: **Strategy 1 (Time-Based) + Strategy 2 for materialized table updates**. KV entries live 5 minutes, but after hourly recalc we explicitly delete KV to ensure next query gets fresh materialized data. User rank entries use shorter TTL (2 min) to balance cache hit rate vs staleness.

---

## Query Performance Analysis

### Without Caching (Baseline)

Query: `SELECT ... FROM leaderboards WHERE period = 'weekly' AND club_id IS NULL ORDER BY rank LIMIT 100`

- Index: `idx_leaderboard_period_club_rank` on `(period, club_id, rank)`
- Query plan: Range scan on index, skip to rank=1, read 100 rows, join users
- Estimated time: 10-20ms (D1)
- **Acceptable** for occasional queries but under load (100 concurrent) could saturate.

---

### With KV Cache

- KV read: ~1-2ms
- JSON deserialization: ~1ms
- Total: ~3ms (5x faster)

Cache hit rate expected: >90% for popular leaderboards (weekly global), >70% for club leaderboards (most viewed clubs).

---

### Scalability

**Scenario**: 10,000 concurrent users viewing leaderboards
- Without cache: 10K queries/hour × 20ms = 200K ms ≈ 3.3 minutes of DB time (expensive)
- With cache: 10K KV reads × 3ms = 30K ms ≈ 50 seconds (5x cheaper, faster)

KV pricing: $0.50 per 10K reads. 10K reads/day = $0.50/month (negligible).

---

## Monitoring & Alerting

### Metrics to Track

1. **Leaderboard query latency** (p50, p95, p99):
   - `histogram:leaderboard_query_seconds{type="kv"}`
   - `histogram:leaderboard_query_seconds{type="database"}`

2. **Cache hit rate**:
   - `counter:leaderboard_cache_hits_total`
   - `counter:leaderboard_cache_misses_total`
   - Target: >85% hit rate

3. **Materialized table freshness**:
   - `gauge:leaderboard_recalc_age_seconds` (time since last recalc)
   - Alert if >2x expected interval (weekly >12h, monthly >24h)

4. **Leaderboard recalculation duration**:
   - `histogram:leaderboard_recalc_seconds`
   - Alert if >5 minutes (indicates performance issue)

5. **KV operation errors**:
   - `counter:kv_errors_total{operation="get"|"put"}`

### Dashboards

- **Grafana panel**: Leaderboard query latency (p95) with cache vs DB
- **Leaderboard health**: Hit rate, recalc status, row counts
- **Gamification overview**: Active users on leaderboards, rank changes

---

## Alternatives Considered

### Alternative 1: Compute Rank On-Demand with Index-Only Scan

**Description**: Rely on index `(points DESC, streak DESC)` and `LIMIT 100` to fetch top users quickly.

**Pros**:
- No materialization needed
- Always fresh (real-time)
- Simpler architecture

**Cons**:
- Sorting 100K+ rows on every query, even with index, still requires scanning
- p95 latency ~50-100ms under load
- No "find my rank" without expensive subquery

**Why rejected**: Insufficient performance at scale, especially for "my rank" queries.

---

### Alternative 2: Durable Objects for Real-Time Updates

**Description**: Each leaderboard (weekly-global, weekly-club:xxx, etc.) is a Durable Object that maintains sorted set and updates on every point transaction.

**Pros**:
- Real-time accuracy (no staleness)
- O(1) rank queries via DO state
- Automatic scaling per leaderboard

**Cons**:
- Thousands of leaderboards (weekly/monthly × each club) → thousands of DOs
- DO activation latency (~10-50ms) per query
- Complexity of distributed state consistency
- Cost (DOs more expensive than KV+D1)

**Why rejected**: Over-engineering. Hourly staleness acceptable for leaderboards. KV cache provides sufficient performance.

---

### Alternative 3: Redis Sorted Sets

**Description**: Use Redis (or compatible) with ZSET for leaderboards. Cloudflare doesn't offer Redis but could run on Fly.io/Render.

**Pros**:
- Native sorted set operations (ZADD, ZRANK, ZREVRANGE) extremely fast
- Real-time updates possible

**Cons**:
- Additional infrastructure (vendor lock-in, cost)
- Data duplication (D1 still needs point totals for persistence)
- Cross-region latency if D1 and Redis separate
- Increased complexity

**Why rejected**: Cloudflare KV + materialized table provides similar performance without external dependencies. Stick to Cloudflare ecosystem.

---

### Alternative 4: Client-Side Computation

**Description**: Send all user points to client, sort in browser.

**Pros**:
- Zero server load for leaderboard view
- Instant filtering/sorting

**Cons**:
- Transfers all user data (huge payload, N=100K → MBs)
- Exposes all users' points (privacy issue)
- Client computation expensive for large N

**Why rejected**: Completely infeasible for privacy, bandwidth, and performance.

---

## Implementation Plan

### Phase 1: Schema & Migration (Day 1)

- Create `leaderboards` table with indexes
- Write Drizzle migration
- Backfill existing data (all-time leaderboard from `leaderboardSnapshots`)

### Phase 2: Recalculation Job (Day 2)

- Implement cron function (`apps/api/src/cron/leaderboard-recalculate.ts`)
- Test with production-like data (use `seed:mock` with large dataset)
- Schedule via Wrangler Cron: `0 */6 * * *` (every 6 hours for weekly)

### Phase 3: KV Cache Integration (Day 3)

- Add KV binding in `wrangler.toml`
- Implement `getLeaderboard()` with cache-aside pattern
- Instrument metrics

### Phase 4: API Endpoint Updates (Day 4)

- Modify `GET /gamification/leaderboard` to use cached function
- Add `Cache-Control` headers (private, max-age=300)
- Update `GET /gamification/leaderboard/rank/:userId` to use cache

### Phase 5: Testing & Optimization (Day 5)

- Load test with 1000 concurrent requests
- Compare latency before/after (expect 5x improvement)
- Tune TTL values based on usage patterns
- Add monitoring alerts

---

## Performance Targets

| Metric | Target | Measured |
|--------|--------|----------|
| Leaderboard query (cached) | < 10ms | TBD |
| Leaderboard query (DB) | < 50ms | TBD |
| Cache hit rate | > 85% | TBD |
| Recalculation job duration (weekly) | < 5 min | TBD |
| Recalculation job duration (club) | < 1 min | TBD |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Recalc job exceeds 10s (CF Worker timeout) | Stale data | Break into batches (process 1000 users at a time) |
| KV cache stampede on miss | DB overload | Use cache lock (SETNX pattern) to serialize recomputation |
| Race condition during rank updates | Inconsistent ranks | Wrap recalc in transaction; use atomic upserts |
| Memory pressure from large leaderboard JSON | Worker memory limit | Cache only top 1000 entries (~100KB) not full table |
| Club leaderboards too many (10K clubs) | Slow recalc | Stagger club recalc throughout day; priority based on activity |

---

## Related Decisions

- ADR-001: Realtime Messaging Architecture (both use KV for state)
- ADR-002: Social Data Model (defines leaderboards table)
- ADR-004: Point Transaction Idempotency (prevents double-counting)

---

**Reviewers**: @senior-database @senior-hono @senior-devops  
**Approvers**: @tech-lead @cto
