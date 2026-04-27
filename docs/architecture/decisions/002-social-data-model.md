# ADR 002: Social Features Data Model and Schema Design

## Status

**Accepted** (Proposed - needs team approval)

*Date: 2025-04-27*

## Context

AIVO needs to support social features (clubs, events, messaging) and enhanced gamification (challenges, leaderboards). The existing database schema (packages/db/src/schema.ts) already includes some social-related tables:

- `socialRelationships` - Friend connections
- `badges` and `achievements` - Gamification
- `gamificationProfiles`, `dailyCheckins`, `streakFreezes`, `pointTransactions`
- `leaderboardSnapshots` - Historical leaderboard data
- `notifications` - Push/in-app notifications
- `activityEvents` - User activity tracking

However, these are insufficient for the full social features vision. We need:

1. **Clubs/Groups** - Users can create and join interest-based communities
2. **Events** - Clubs can organize events with RSVP management
3. **Messaging** - Direct messages and group chats
4. **Enhanced Leaderboards** - Materialized leaderboards beyond snapshots
5. **Challenges** - Club-specific and global challenges with progress tracking
6. **Activity Feed** - Aggregated social feed for users and clubs

Constraints:
- Cloudflare D1 uses SQLite with limited features (no JSON columns, no generated columns)
- Must maintain referential integrity with foreign keys
- Need to optimize for query patterns (leaderboards, message history, feed)
- High write volume expected for messages and activity events
- Leaderboard queries must be fast (<50ms) even with millions of users

## Decision

We will extend the schema with the following tables (detailed in SOCIAL_FEATURES_DB_SCHEMA.md):

### 1. Clubs & Membership (`clubs`, `club_members`)

**Rationale**: Separate clubs table with membership junction table allows:
- Clubs have owners, rules, avatars, tags independent of users
- Flexible membership roles (owner, admin, moderator, member)
- Easy to query club membership and enforce permissions
- Supports both public (auto-join) and private (approval required) clubs

**Key Design**:
- `clubs`: Stores club metadata (name, description, ownerId, isPublic, maxMembers, tags)
- `club_members`: Junction table with `role`, `status`, `contributionPoints`
- Unique constraint `(clubId, userId)` prevents duplicate membership
- Indexes on `(clubId, status)` for member lists, `(userId, status)` for user's clubs
- `currentMemberCount` denormalized in `clubs` for quick display

**Why not embed club data in users?**: Would require scanning all users to find clubs. Normalized design enables efficient club discovery and management.

---

### 2. Events & RSVPs (`events`, `event_participants`)

**Rationale**: Events are time-bound, capacity-limited activities within clubs.

**Key Design**:
- `events`: References `clubId`, stores title, type, time, location, capacity
- `event_participants`: Tracks RSVP status (`registered`, `attended`, `cancelled`, `no_show`)
- Unique `(eventId, userId)` prevents double RSVP
- Composite index `(eventId, status)` for attendee lists
- `currentParticipants` denormalized in `events` for capacity checks
- `attendanceRecordedAt` tracks when host marks attendance (triggers point award)

**Time handling**: All times stored as Unix timestamps (seconds). Timezone stored separately for display.

---

### 3. Messaging (`messages`)

**Rationale**: Supports 1:1 DMs, club chat, and event chat in a single table with polymorphic associations.

**Key Design**:
- `senderId` always set (who sent)
- Exactly one destination: `receiverId` (DM) OR `clubId` (club chat) OR `eventId` (event chat)
- Application-level validation enforces single destination (SQLite CHECK constraints limited)
- `isRead` and `readAt` for read receipts (DMs only; club/event chat implicit by viewing)
- `isDeleted` soft delete (sender can delete; receiver sees "message deleted")
- Indexes: `(receiverId, isRead, createdAt DESC)` for inbox; `(clubId, createdAt DESC)` for chat history; `(eventId, createdAt DESC)` for event chat
- Message content limited to 2000 chars; longer conversations truncated client-side

**Why single table instead of separate DM/club/event tables?**:
- Simpler queries for user's all conversations (UNION would be needed)
- Consistent indexing strategy
- Easier to implement notification triggers on new message
- Table partitioning by `createdAt` can be added later if needed

**Message deletion semantics**:
- Sender: Can delete within 15 minutes (soft delete); after 15 minutes only hide from self
- Receiver: Cannot delete sender's messages, but can hide from own view (`isDeletedFor` field could be added later if needed)
- Admin/moderator: Can hard delete any message (remove from DB)

---

### 4. Leaderboards (`leaderboards` materialized)

**Rationale**: Real-time leaderboard queries on `ORDER BY points DESC LIMIT 100` are expensive at scale. We pre-compute ranks.

**Key Design**:
- `id` = composite key: `${period}:${userId}:${clubId || 'global'}` (e.g., `weekly:user123:`)
- `period`: `weekly`, `monthly`, `all_time`
- `clubId`: NULL for global leaderboard; set for club-specific
- `rank`: Pre-calculated position (1-based)
- Denormalized fields: `points`, `workoutCount`, `streakDays`, `level`
- Updated **hourly** via cron job (not on every point transaction)
- Composite index `(period, clubId, rank)` for leaderboard queries
- Index `(userId, period)` for finding user's rank

**Calculation algorithm**:
```sql
-- Recalculate weekly global leaderboard
WITH ranked AS (
  SELECT 
    user_id,
    ROW_NUMBER() OVER (ORDER BY total_points DESC, streak_current DESC) as rank
  FROM leaderboard_snapshots
  WHERE date = '2025-04-27' -- latest snapshot
)
INSERT INTO leaderboards (id, period, user_id, rank, points, ...)
SELECT 
  'weekly:' || user_id || ':', 
  'weekly', 
  user_id, 
  rank, 
  total_points, 
  ...
FROM ranked;
```

**Why not compute rank on the fly?**:
- `ORDER BY + LIMIT` requires full index scan (O(N log N))
- With 1M users, this is ~20ms per query × many requests = expensive
- Materialized rank trades storage for query speed (5ms vs 20ms)
- Hourly staleness acceptable for leaderboards

---

### 5. Challenges (`challenges`, `user_challenges`)

**Rationale**: Challenges are time-bound goals with requirements and rewards.

**Key Design**:
- `challenges`: Templates with `requirementJson` (target value, unit), `startDate`, `endDate`
- `user_challenges`: Tracks user's progress toward specific challenge instance
- `currentProgress` updated atomically as user performs actions
- `completedAt` set when `currentProgress >= target`
- `rewardEarned` prevents double-reward
- Unique `(challengeId, userId)` ensures one attempt per user per challenge

**Challenge types** (encoded in `challengeType`):
- `workout_count`: Complete N workouts in period
- `streak_extend`: Maintain X-day streak
- `points_earn`: Earn N points in period
- `achievement`: Unlock specific badge

**Club challenges**: `clubId` set makes challenge visible only to club members; `isGlobal = 0`.

---

### 6. Activity Feed (`activity_feed`)

**Rationale**: Users want to see what their friends and clubs are doing. Fan-out on write pattern.

**Key Design**:
- `userId`: Feed recipient (usually the actor themselves or their followers)
- `actorId`: Who performed the action
- `verb`: Action type (e.g., `completed_workout`, `joined_club`, `earned_badge`)
- `objectType` + `objectId`: What was acted upon (workout, badge, club)
- `objectData`: JSON snapshot of object at time of action (denormalization avoids joins)
- `clubId`: If action occurred in club context (for club feed)
- `isPublic`: For club activities visible to non-members (if club is public)

**Write patterns**:
1. **Self-feed**: User completes workout → write to `user_id = actor_id`
2. **Follower feed**: For each follower, write to `user_id = follower_id`
3. **Club feed**: If workout tagged with club, write to `user_id = actor_id` with `club_id` set (read via club query)

**Retention**: Archive and delete >90 days via daily job.

**Why not compute on read?**:
- Reading from friends table would require complex joins on multiple tables (workouts, badges, clubs, etc.)
- High read volume (every app open) vs manageable write volume
- Denormalization is appropriate for social feed (Twitter/Instagram use same pattern)

---

### 7. WebSocket Sessions (`websocket_sessions`)

**Rationale**: Track active WebSocket connections for presence and debugging.

**Key Design**:
- `connectionId` = WebSocket connection UUID
- `userId` for authenticated user
- `clubId` / `eventId`: Current subscribed room (for debugging only)
- `lastPingAt`: Heartbeat timestamp (detect dead connections)
- `userAgent` and `ipAddress` for security/rate limiting

**TTL**: 5 minutes; cleaned by background job. Not used for production presence (KV used instead).

---

### 8. Notifications Extension

Existing `notifications` table extended with social types:

**New types**:
- `club_invite`, `club_join_approved`, `club_post`
- `event_reminder`, `event_rsvp`, `event_cancelled`
- `new_message`, `mention`
- `streak_milestone`, `leaderboard_rank`, `challenge_completed`

**`data` JSON schema** varies by type (see SOCIAL_FEATURES_DB_SCHEMA.md).

---

### 9. User Presence (KV-backed)

Not a D1 table! Presence stored in KV for low-latency access:

```
Key: presence:{userId}
Value: {
  "status": "online" | "idle" | "offline" | "in_workout",
  "lastSeenAt": 1714214400,
  "connectionId": "ws-conn-id",
  "currentClubId": "club-abc",
  "currentWorkoutId": "workout-123",
  "metadata": { "device": "ios", "appVersion": "1.2.3" }
}
TTL: 5 minutes (refreshed on WebSocket ping)
```

**Why KV instead of D1?**:
- Sub-millisecond reads for presence (displaying online status)
- TTL auto-expire handles stale connections
- No connection limit concerns (KV scales infinitely)
- D1 reserved for persistent data with durability guarantees

---

## Schema Evolution Strategy

### Migration Order

1. **Weeks 1-2**: Clubs, club_members, events, event_participants
2. **Week 3**: Messages, leaderboards, challenges, user_challenges
3. **Week 4**: activity_feed, websocket_sessions (if separate), any extensions to existing tables

Each migration:
- Written as SQL file in `packages/db/src/migrations/`
- Generated via `drizzle-kit generate`
- Reviewed for data loss risk (none of these are destructive)
- Applied in dev first, then production via deploy script

### Backward Compatibility

- No breaking changes to existing tables (only additions)
- New features are opt-in (existing API endpoints unaffected)
- Gradual rollout: Feature flags control visibility of social features in web/mobile apps

### Rollback Plan

If issues arise:
1. Disable social features via feature flags
2. Revert database migrations using `drizzle-kit migrate down` (need to write down migrations)
3. No data loss expected (new tables only)

---

## Query Patterns and Indexes

### 1. Club Discovery

```sql
SELECT c.*, u.name as ownerName, c.current_member_count
FROM clubs c
JOIN users u ON c.owner_id = u.id
WHERE c.is_public = 1
  AND (c.tags LIKE '%strength%' OR c.tags LIKE '%weight-loss%')
ORDER BY c.current_member_count DESC
LIMIT 20;
```

**Indexes used**:
- `idx_clubs_public` on `(is_public)` for public filter
- Covering index could be added later: `(is_public, current_member_count DESC)` if performance requires

---

### 2. Club Member List

```sql
SELECT u.*, cm.role, cm.joined_at, cm.contribution_points
FROM club_members cm
JOIN users u ON cm.user_id = u.id
WHERE cm.club_id = ? AND cm.status = 'active'
ORDER BY cm.contribution_points DESC, cm.joined_at ASC;
```

**Indexes used**:
- `idx_club_members_club` on `(club_id, status)`

---

### 3. Club Event Listing

```sql
SELECT e.*, COUNT(ep.user_id) as rsvp_count
FROM events e
LEFT JOIN event_participants ep ON e.id = ep.event_id AND ep.status IN ('registered', 'attended')
WHERE e.club_id = ? AND e.start_time > ?
GROUP BY e.id
ORDER BY e.start_time ASC;
```

**Indexes used**:
- `idx_events_club` on `(club_id)`
- `idx_event_participants_event` on `(event_id, status)`

---

### 4. Message Inbox (DMs)

```sql
SELECT m.*, u.name, u.picture
FROM messages m
JOIN users u ON m.sender_id = u.id
WHERE m.receiver_id = ? AND m.is_deleted = 0
ORDER BY m.created_at DESC
LIMIT 50;
```

**Indexes used**:
- `idx_messages_receiver` on `(receiver_id, is_read, created_at DESC)`
  Note: `is_read` in index but not in WHERE; still beneficial for covering queries that include it.

---

### 5. Club Chat History

```sql
SELECT m.*, u.name, u.picture
FROM messages m
JOIN users u ON m.sender_id = u.id
WHERE m.club_id = ? AND m.is_deleted = 0
ORDER BY m.created_at DESC
LIMIT 100;
```

**Indexes used**:
- `idx_messages_club` on `(club_id, created_at DESC)`

---

### 6. Leaderboard Query

```sql
SELECT lb.*, u.name, u.picture, u.level
FROM leaderboards lb
JOIN users u ON lb.user_id = u.id
WHERE lb.period = 'weekly' AND lb.club_id IS NULL
ORDER BY lb.rank ASC
LIMIT 100;
```

**Indexes used**:
- `idx_leaderboard_period_club_rank` on `(period, club_id, rank)`
- Note: `club_id IS NULL` range scan on index

---

### 7. User's Friends' Activity Feed

```sql
SELECT af.*, u.name, u.picture
FROM activity_feed af
JOIN users u ON af.actor_id = u.id
WHERE af.user_id IN (
  SELECT friend_id FROM social_relationships 
  WHERE user_id = ? AND status = 'accepted'
)
  AND af.created_at > ?
ORDER BY af.created_at DESC
LIMIT 50;
```

**Indexes used**:
- `idx_activity_feed_user` on `(user_id, created_at DESC)`
- `idx_social_relationships_user` on `(user_id, status)` for friend list

---

### 8. Unread Notification Count

```sql
SELECT COUNT(*) as unreadCount
FROM notifications
WHERE user_id = ? AND status = 'pending' AND is_read = 0;
```

**Indexes used**:
- `idx_notifications_user_id` on `(user_id)`
- Could add composite `(user_id, is_read, status)` if queries are slow

---

## Data Retention Policies

| Table | Retention | Archival Strategy |
|-------|-----------|-------------------|
| `messages` | Indefinite (user-deletable) | Soft delete only |
| `activity_feed` | 90 days | Archive to R2, delete old entries |
| `notifications` | 30 days | Archive delivered/read to R2 |
| `websocket_sessions` | 5 min TTL (KV) | Auto-expire |
| `leaderboard_snapshots` | 1 year (weekly) | Keep monthly long-term |
| `point_transactions` | Indefinite (audit trail) | Never delete |

Retention jobs run daily via cron (Wrangler Cron Triggers).

---

## Denormalization Decisions

We denormalize several fields for performance:

1. **`clubs.current_member_count`** - Instead of `COUNT(*) FROM club_members` each time
2. **`events.current_participants`** - Instead of counting `event_participants`
3. **`activity_feed.objectData`** - Snapshot of related object to avoid joins
4. **`leaderboards`** - Pre-computed ranks and point totals
5. **`leaderboardSnapshots`** - Materialized daily/weekly aggregates

**Trade-off**: Slightly increased write complexity (must update denormalized counts) but dramatically improved read performance. Acceptable for social features where writes are less frequent than reads (10:1 ratio).

---

## Alternatives Considered

### Alternative 1: JSON Storage for Flexible Schema

**Description**: Store club data, event data, message content in JSON columns.

**Pros**:
- Schema flexibility (easy to add fields)
- Can store nested data without joins

**Cons**:
- SQLite JSON support limited (requires JSON1 extension)
- Cannot enforce foreign keys on JSON fields
- Querying JSON is slower than normalized columns
- No type safety

**Why rejected**: Cloudflare D1 (SQLite) has limited JSON support. Normalized schema provides better performance and data integrity.

---

### Alternative 2: Graph Database

**Description**: Use graph database (Neo4j) for social relationships.

**Pros**:
- Natural fit for social graph (friends-of-friends)
- Efficient traversals for recommendations

**Cons**:
- Additional infrastructure (D1 + graph DB)
- Cloudflare doesn't offer graph DB
- Overkill for simple friend relationships
- Increased complexity

**Why rejected**: Our social graph is shallow (friends only, no deep traversals). Relational joins with proper indexes are sufficient. Stick with D1.

---

### Alternative 3: Materialized Views

**Description**: Use SQLite materialized views for leaderboards and feeds.

**Pros**:
- Automatic refresh on query (if supported)
- Simplified queries

**Cons**:
- SQLite has limited materialized view support (triggers required)
- Refresh cost still paid at query time
- Less control over refresh schedule

**Why rejected**: Manual materialization (leaderboards table) gives us full control over refresh cadence and allows pre-computation during off-peak hours.

---

## Implementation Notes

### Composite Primary Keys

SQLite/Drizzle does not support composite primary keys directly via `primaryKey()` for all cases. We use:
- Single `id` column (UUID) as PK for most tables
- For tables with natural composite keys (`dailyCheckins`, `dailyNutritionSummaries`), we add via migration:
  ```sql
  CREATE UNIQUE INDEX idx_unique_user_date ON daily_checkins(user_id, date);
  ```
  And use `unique()` constraint in Drizzle for application-level enforcement.

### UUID Generation

All `id` fields use UUID v4 generated client-side:
```typescript
import { generateId } from '@aivo/shared-types';
// generateId() = crypto.randomUUID()
```

No auto-increment (not suitable for distributed systems).

### Foreign Key Constraints

Drizzle automatically creates foreign key references. We rely on SQLite's FK enforcement (enabled by default in Cloudflare D1). `onDelete: "cascade"` used for strong ownership (user deletion should delete their data). For weaker relationships (club membership), we may use `onDelete: "restrict"` to prevent accidental deletion.

### Index Naming Convention

`idx_{table}_{column(s)}` - e.g., `idx_club_members_club` on `(club_id, status)`.

Unique indexes: `unique_{table}_{column(s)}` - e.g., `unique_club_user` on `(club_id, user_id)`.

---

## Monitoring Schema Performance

- Slow query log: Enable `EXPLAIN QUERY PLAN` for queries >50ms
- Table size monitoring: Alert if any table > 100K rows
- Index usage: Regular `PRAGMA index_list(table)` and `PRAGMA index_info(index)` analysis
- KV operations: Monitor KV read/write latency separately (via Cloudflare analytics)

---

## Related Decisions

- ADR-001: Realtime Messaging Architecture (depends on this schema)
- ADR-003: Leaderboard Caching Strategy (materialized leaderboards)
- ADR-006: Data Retention and GDPR Compliance

---

**Reviewers**: @senior-database @senior-hono  
**Approvers**: @tech-lead @cto
