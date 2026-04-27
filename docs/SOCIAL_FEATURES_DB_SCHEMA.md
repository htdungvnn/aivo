# Social Features Database Schema

**Document Version:** 1.0.0  
**Date:** 2025-04-27  
**Status:** Draft (pending implementation)  
**Related:** [SOCIAL_FEATURES_API.md](./SOCIAL_FEATURES_API.md), Task #157

---

## Overview

This document describes the database schema changes required to support social features and enhanced gamification in AIVO. The existing gamification infrastructure (`gamificationProfiles`, `dailyCheckins`, `streakFreezes`, `pointTransactions`, `leaderboardSnapshots`, `socialRelationships`, `badges`, `achievements`) will be extended with new tables for clubs, events, messaging, challenges, and enhanced notifications.

All tables use Cloudflare D1 (SQLite) with Drizzle ORM.

---

## 1. Clubs & Groups

### 1.1 `clubs` Table

Social clubs/groups where users can gather around shared fitness interests.

**TypeScript Interface:**
```typescript
interface Club {
  id: string;                    // UUID v4
  name: string;                  // Club name (max 100 chars)
  description: string;           // Club description (max 500 chars)
  ownerId: string;               // User ID of club creator
  isPublic: boolean;             // Public vs private club
  maxMembers: number;            // Max capacity (null = unlimited)
  currentMemberCount: number;    // Cached count for quick lookup
  avatarUrl: string | null;      // Club profile picture
  tags: string[];                // JSON array of interest tags
  rules: string;                 // JSON: { rules: string[], restrictions: string[] }
  createdAt: number;             // Unix timestamp (seconds)
  updatedAt: number;             // Unix timestamp (seconds)
}
```

**Drizzle Schema:**
```typescript
export const clubs = sqliteTable("clubs", {
  id: text("id").primaryKey(),
  name: text("name", { length: 100 }).notNull(),
  description: text("description", { length: 500 }),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isPublic: integer("is_public").default(1),
  maxMembers: integer("max_members"),
  currentMemberCount: integer("current_member_count").default(0),
  avatarUrl: text("avatar_url"),
  tags: text("tags"), // JSON array
  rules: text("rules"), // JSON
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index('idx_clubs_owner').on(table.ownerId),
  index('idx_clubs_public').on(table.isPublic),
  index('idx_clubs_created').on(sql`desc ${table.createdAt}`),
]);
```

**Key Constraints:**
- `ownerId` must be a valid user; cascade delete on user deletion
- `currentMemberCount` maintained via triggers or application logic
- `maxMembers` enforced on membership creation

**Example Queries:**
```sql
-- Get public clubs with member count
SELECT c.*, u.name as ownerName, u.picture as ownerPicture 
FROM clubs c
JOIN users u ON c.owner_id = u.id
WHERE c.is_public = 1
ORDER BY c.current_member_count DESC
LIMIT 50;

-- Search clubs by tags
SELECT * FROM clubs 
WHERE json_each.value IN ('strength', 'weight-loss', 'running')
AND is_public = 1;
```

---

### 1.2 `club_members` Table

Membership records for users in clubs.

**TypeScript Interface:**
```typescript
interface ClubMember {
  id: string;                    // UUID v4
  clubId: string;                // Club ID
  userId: string;                // User ID
  role: 'owner' | 'admin' | 'moderator' | 'member'; // Member role
  joinedAt: number;              // Unix timestamp
  status: 'active' | 'banned' | 'left'; // Membership status
  lastActiveAt: number | null;   // Last activity in club (null if never)
  contributionPoints: number;    // Points contributed to club (for leaderboards)
}
```

**Drizzle Schema:**
```typescript
export const clubMembers = sqliteTable("club_members", {
  id: text("id").primaryKey(),
  clubId: text("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role", { 
    enum: ['owner', 'admin', 'moderator', 'member'] 
  }).default('member'),
  joinedAt: integer("joined_at").notNull(),
  status: text("status", {
    enum: ['active', 'banned', 'left']
  }).default('active'),
  lastActiveAt: integer("last_active_at"),
  contributionPoints: integer("contribution_points").default(0),
}, (table) => [
  index('idx_club_members_club').on(table.clubId, table.status),
  index('idx_club_members_user').on(table.userId, table.status),
  unique('unique_club_user').on(table.clubId, table.userId),
]);
```

**Key Constraints:**
- Composite unique constraint prevents duplicate membership
- `role` controls permissions (owner/admin can manage, member can participate)
- `lastActiveAt` updated on message/post/event RSVP
- `contributionPoints` from activities (checkins, event attendance, etc.)

**Example Queries:**
```sql
-- Get active members of a club
SELECT u.*, cm.role, cm.joinedAt, cm.contributionPoints
FROM club_members cm
JOIN users u ON cm.user_id = u.id
WHERE cm.club_id = ? AND cm.status = 'active'
ORDER BY cm.contributionPoints DESC;

-- Get clubs for a user
SELECT c.*, cm.role, cm.joinedAt
FROM clubs c
JOIN club_members cm ON c.id = cm.club_id
WHERE cm.user_id = ? AND cm.status = 'active';
```

---

## 2. Events

### 2.1 `events` Table

Events organized within clubs (workout challenges, group sessions, etc.).

**TypeScript Interface:**
```typescript
interface Event {
  id: string;                    // UUID v4
  clubId: string;                // Club ID organizing the event
  title: string;                 // Event title (max 100 chars)
  description: string;           // Event description
  eventType: 'workout' | 'challenge' | 'meetup' | 'webinar' | 'other';
  startTime: number;             // Unix timestamp
  endTime: number;               // Unix timestamp
  timezone: string;              // IANA timezone (e.g., "America/New_York")
  location: string | null;       // Physical location or "online"
  isOnline: boolean;             // Virtual vs in-person
  onlineUrl: string | null;      // Meeting URL for virtual events
  maxParticipants: number | null; // Capacity limit
  currentParticipants: number;   // Cached count
  isPublic: boolean;             // Visible to non-members
  imageUrl: string | null;       // Event banner image
  requirements: string;          // JSON: { fitnessLevel, equipment, experience }
  createdBy: string;             // User ID of organizer
  createdAt: number;             // Unix timestamp
  updatedAt: number;             // Unix timestamp
}
```

**Drizzle Schema:**
```typescript
export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  clubId: text("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
  title: text("title", { length: 100 }).notNull(),
  description: text("description"),
  eventType: text("event_type", {
    enum: ['workout', 'challenge', 'meetup', 'webinar', 'other']
  }).default('workout'),
  startTime: integer("start_time").notNull(),
  endTime: integer("end_time").notNull(),
  timezone: text("timezone").notNull().default("UTC"),
  location: text("location"),
  isOnline: integer("is_online").default(0),
  onlineUrl: text("online_url"),
  maxParticipants: integer("max_participants"),
  currentParticipants: integer("current_participants").default(0),
  isPublic: integer("is_public").default(1),
  imageUrl: text("image_url"),
  requirements: text("requirements"), // JSON
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index('idx_events_club').on(table.clubId),
  index('idx_events_start_time').on(table.startTime),
  index('idx_events_public').on(table.isPublic, table.startTime),
  index('idx_events_created_by').on(table.createdBy),
]);
```

**Key Constraints:**
- `startTime` < `endTime`
- `currentParticipants` updated atomically on RSVP
- If `isOnline=0`, `location` required; if `isOnline=1`, `onlineUrl` required

---

### 2.2 `event_participants` Table

RSVP and attendance tracking for events.

**TypeScript Interface:**
```typescript
interface EventParticipant {
  id: string;                    // UUID v4
  eventId: string;               // Event ID
  userId: string;                // User ID
  status: 'registered' | 'attended' | 'cancelled' | 'no_show';
  registeredAt: number;          // Unix timestamp
  attendanceRecordedAt: number | null; // When attendance was marked
  notes: string | null;          // User notes (dietary, accessibility, etc.)
  feedback: string | null;       // JSON feedback after event
}
```

**Drizzle Schema:**
```typescript
export const eventParticipants = sqliteTable("event_participants", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status", {
    enum: ['registered', 'attended', 'cancelled', 'no_show']
  }).default('registered'),
  registeredAt: integer("registered_at").notNull(),
  attendanceRecordedAt: integer("attendance_recorded_at"),
  notes: text("notes"),
  feedback: text("feedback"), // JSON
}, (table) => [
  index('idx_event_participants_event').on(table.eventId, table.status),
  index('idx_event_participants_user').on(table.userId, table.status),
  unique('unique_event_user').on(table.eventId, table.userId),
]);
```

**Key Constraints:**
- Unique constraint prevents double registration
- Status transitions: `registered` → `attended`/`cancelled`/`no_show`
- `attendanceRecordedAt` set when event host marks attendance
- Award points on `attended` status

---

## 3. Messaging & Community

### 3.1 `messages` Table

Direct messages and group/club/event chat messages.

**TypeScript Interface:**
```typescript
interface Message {
  id: string;                    // UUID v4
  senderId: string;              // User ID of sender
  // Exactly one of these destination fields must be set:
  receiverId: string | null;     // For direct messages (1:1)
  clubId: string | null;         // For club chat
  eventId: string | null;        // For event chat
  
  content: string;               // Message text (max 2000 chars)
  messageType: 'text' | 'image' | 'system' | 'achievement';
  metadata: string;              // JSON: { imageUrl, mentions[], reactions[] }
  
  isRead: boolean;               // Receiver has read (for DMs)
  readAt: number | null;        // Read timestamp
  
  isDeleted: boolean;            // Soft delete (sender only)
  deletedAt: number | null;      // Deletion timestamp
  
  createdAt: number;             // Unix timestamp
  updatedAt: number;             // Unix timestamp (for edits)
}
```

**Drizzle Schema:**
```typescript
export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  senderId: text("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: text("receiver_id").references(() => users.id, { onDelete: "cascade" }),
  clubId: text("club_id").references(() => clubs.id, { onDelete: "cascade" }),
  eventId: text("event_id").references(() => events.id, { onDelete: "cascade" }),
  
  content: text("content", { length: 2000 }).notNull(),
  messageType: text("message_type", {
    enum: ['text', 'image', 'system', 'achievement']
  }).default('text'),
  metadata: text("metadata"), // JSON
  
  isRead: integer("is_read").default(0),
  readAt: integer("read_at"),
  
  isDeleted: integer("is_deleted").default(0),
  deletedAt: integer("deleted_at"),
  
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index('idx_messages_sender').on(table.senderId, sql`desc ${table.createdAt}`),
  index('idx_messages_receiver').on(table.receiverId, table.isRead, sql`desc ${table.createdAt}`),
  index('idx_messages_club').on(table.clubId, sql`desc ${table.createdAt}`),
  index('idx_messages_event').on(table.eventId, sql`desc ${table.createdAt}`),
  index('idx_messages_created').on(sql`desc ${table.createdAt}`),
  
  // Check constraint: exactly one destination must be set
  // SQLite doesn't enforce CHECK constraints in Drizzle, handle in application
]);
```

**Key Constraints:**
- Exactly one of `receiverId`, `clubId`, `eventId` must be non-null (application-level validation)
- `receiverId` cannot be same as `senderId` (can't message yourself)
- Soft deletes only hide from recipient; sender can delete, receiver cannot
- Index patterns optimized for conversation queries

**Example Queries:**
```sql
-- Get DM conversation between two users
SELECT m.*, u.name, u.picture
FROM messages m
JOIN users u ON m.sender_id = u.id
WHERE (m.sender_id = ? AND m.receiver_id = ?)
   OR (m.sender_id = ? AND m.receiver_id = ?)
   AND m.is_deleted = 0
ORDER BY m.created_at ASC
LIMIT 50;

-- Get club chat history (most recent first)
SELECT m.*, u.name, u.picture
FROM messages m
JOIN users u ON m.sender_id = u.id
WHERE m.club_id = ? AND m.is_deleted = 0
ORDER BY m.created_at DESC
LIMIT 100;

-- Get unread DM count
SELECT COUNT(*) as unreadCount
FROM messages
WHERE receiver_id = ? AND is_read = 0 AND is_deleted = 0;
```

---

## 4. Enhanced Leaderboards

### 4.1 `leaderboards` Table

Materialized leaderboard data for fast queries beyond historical snapshots.

**TypeScript Interface:**
```typescript
interface LeaderboardEntry {
  id: string;                    // Composite: `${period}:${userId}` or UUID
  period: 'weekly' | 'monthly' | 'all_time'; // Time window
  userId: string;                // User ID
  rank: number;                  // Current rank (1-based)
  points: number;                // Total points in period
  workoutCount: number;          // Workouts completed
  streakDays: number;            // Current streak in period
  level: number;                 // Current level
  clubId: string | null;         // Club-specific leaderboard (null = global)
  updatedAt: number;             // Last calculation timestamp
}
```

**Drizzle Schema:**
```typescript
export const leaderboards = sqliteTable("leaderboards", {
  id: text("id").primaryKey(), // Composite: `${period}:${userId}:${clubId || 'global'}`
  period: text("period", { 
    enum: ['weekly', 'monthly', 'all_time'] 
  }).notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rank: integer("rank").notNull(),
  points: integer("points").default(0),
  workoutCount: integer("workout_count").default(0),
  streakDays: integer("streak_days").default(0),
  level: integer("level").default(1),
  clubId: text("club_id").references(() => clubs.id, { onDelete: "cascade" }),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index('idx_leaderboard_period_club_rank').on(table.period, table.clubId, table.rank),
  index('idx_leaderboard_user_period').on(table.userId, table.period),
]);
```

**Key Constraints:**
- `rank` maintained by periodic recalculation (cron job)
- For global leaderboard: `clubId` = null
- For club leaderboard: `clubId` = club ID
- Updated nightly or after significant activity

**Example Queries:**
```sql
-- Get top 100 global all-time leaderboard
SELECT lb.*, u.name, u.picture, u.level
FROM leaderboards lb
JOIN users u ON lb.user_id = u.id
WHERE lb.period = 'all_time' AND lb.club_id IS NULL
ORDER BY lb.rank ASC
LIMIT 100;

-- Get user's rank in weekly club leaderboard
SELECT lb.*
FROM leaderboards lb
WHERE lb.period = 'weekly' 
  AND lb.club_id = ?
  AND lb.user_id = ?;

-- Get leaderboard around a user's position (±50)
WITH userRank AS (
  SELECT rank FROM leaderboards 
  WHERE period = 'weekly' AND club_id IS NULL AND user_id = ?
)
SELECT lb.*, u.name
FROM leaderboards lb
JOIN users u ON lb.user_id = u.id
WHERE lb.period = 'weekly' AND lb.club_id IS NULL
  AND lb.rank BETWEEN (SELECT rank - 50 FROM userRank) 
                  AND (SELECT rank + 50 FROM userRank)
ORDER BY lb.rank;
```

---

## 5. Challenges (Gamification)

### 5.1 `challenges` Table

Time-bound challenges with rewards.

**TypeScript Interface:**
```typescript
interface Challenge {
  id: string;                    // UUID v4
  title: string;                 // Challenge title
  description: string;           // Challenge description
  challengeType: 'workout_count' | 'streak_extend' | 'points_earn' | 'achievement';
  
  // Requirements
  requirementJson: string;       // JSON: { target: number, unit: "workouts", "days", "points" }
  
  // Time bounds
  startDate: string;             // ISO date YYYY-MM-DD
  endDate: string;               // ISO date YYYY-MM-DD
  
  // Rewards
  rewardPoints: number;          // Points awarded on completion
  rewardBadgeId: string | null;  // Badge ID to grant (from badges table)
  
  // Eligibility
  isGlobal: boolean;             // Available to all users
  clubId: string | null;         // Club-specific challenge (null = global)
  minLevel: number;              // Minimum user level required
  
  // Status
  status: 'upcoming' | 'active' | 'completed' | 'archived';
  
  createdAt: number;
  updatedAt: number;
}
```

**Drizzle Schema:**
```typescript
export const challenges = sqliteTable("challenges", {
  id: text("id").primaryKey(),
  title: text("title", { length: 150 }).notNull(),
  description: text("description"),
  challengeType: text("challenge_type", {
    enum: ['workout_count', 'streak_extend', 'points_earn', 'achievement']
  }).notNull(),
  requirementJson: text("requirement_json").notNull(), // JSON
  startDate: text("start_date").notNull(), // ISO date
  endDate: text("end_date").notNull(),     // ISO date
  rewardPoints: integer("reward_points").default(0),
  rewardBadgeId: text("reward_badge_id").references(() => badges.id),
  isGlobal: integer("is_global").default(1),
  clubId: text("club_id").references(() => clubs.id, { onDelete: "cascade" }),
  minLevel: integer("min_level").default(1),
  status: text("status", {
    enum: ['upcoming', 'active', 'completed', 'archived']
  }).default('upcoming'),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index('idx_challenges_dates').on(table.startDate, table.endDate),
  index('idx_challenges_status').on(table.status),
  index('idx_challenges_club').on(table.clubId),
]);
```

---

### 5.2 `user_challenges` Table

Tracks user progress and completion of challenges.

**TypeScript Interface:**
```typescript
interface UserChallenge {
  id: string;                    // UUID v4
  challengeId: string;           // Challenge ID
  userId: string;                // User ID
  currentProgress: number;       // Current progress toward target
  startedAt: number;             // When user accepted/started challenge
  completedAt: number | null;    // Completion timestamp
  rewardEarned: boolean;         // Whether rewards were granted
  rewardEarnedAt: number | null; // When rewards were granted
}
```

**Drizzle Schema:**
```typescript
export const userChallenges = sqliteTable("user_challenges", {
  id: text("id").primaryKey(),
  challengeId: text("challenge_id").notNull().references(() => challenges.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  currentProgress: integer("current_progress").default(0),
  startedAt: integer("started_at").notNull(),
  completedAt: integer("completed_at"),
  rewardEarned: integer("reward_earned").default(0),
  rewardEarnedAt: integer("reward_earned_at"),
}, (table) => [
  index('idx_user_challenges_user').on(table.userId, table.completedAt),
  index('idx_user_challenges_challenge').on(table.challengeId),
  unique('unique_user_challenge').on(table.challengeId, table.userId),
]);
```

**Key Constraints:**
- Unique constraint prevents user from joining same challenge twice
- `currentProgress` updated atomically as user makes progress
- `completedAt` set when `currentProgress >= target`
- `rewardEarned` set after granting points/badge (idempotent)

---

## 6. Notifications (Enhanced)

### 6.1 `notifications` Table (Extension)

The existing `notifications` table will be extended to support social features.

**Existing Table** (see packages/db/src/schema.ts line 721-738):

```typescript
export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  data: text("data"), // JSON: additional context
  channel: text("channel").default("push"),
  status: text("status").default("pending"),
  expoPushTicket: text("expo_push_ticket"),
  sentAt: integer("sent_at"),
  deliveredAt: integer("delivered_at"),
  createdAt: integer("created_at").notNull(),
});
```

**New Notification Types for Social Features:**
```typescript
enum SocialNotificationType {
  // Club-related
  CLUB_INVITE = "club_invite",              // Invited to join club
  CLUB_JOIN_APPROVED = "club_join_approved", // Join request approved
  CLUB_POST = "club_post",                  // New post in followed club
  CLUB_EVENT = "club_event",                // New event in club
  
  // Event-related
  EVENT_REMINDER = "event_reminder",        // Event starting soon
  EVENT_RSVP = "event_rsvp",                // Someone RSVP'd to your event
  EVENT_CANCELLED = "event_cancelled",      // Event cancelled
  
  // Messaging
  NEW_MESSAGE = "new_message",              // New DM/group message
  MENTION = "mention",                      // User mentioned in message
  
  // Gamification
  STREAK_MILESTONE = "streak_milestone",    // Streak milestone reached
  LEADERBOARD_RANK = "leaderboard_rank",    // Rank changed significantly
  CHALLENGE_COMPLETED = "challenge_completed", // Challenge completed
  BADGE_EARNED = "badge_earned",            // New badge earned
  
  // Friend-related
  FRIEND_REQUEST = "friend_request",        // New friend request
  FRIEND_ACTIVITY = "friend_activity",      // Friend's notable activity
}
```

**Data Schema Extensions:**
```typescript
interface NotificationData {
  // For CLUB_INVITE
  clubId?: string;
  clubName?: string;
  inviterId?: string;
  inviterName?: string;
  
  // For CLUB_POST / NEW_MESSAGE
  postId?: string;
  messagePreview?: string;
  senderId?: string;
  senderName?: string;
  
  // For EVENT_REMINDER / EVENT_RSVP
  eventId?: string;
  eventTitle?: string;
  eventStartTime?: number;
  
  // For STREAK_MILESTONE / LEADERBOARD_RANK
  streakCount?: number;
  rank?: number;
  previousRank?: number;
  
  // For BADGE_EARNED
  badgeId?: string;
  badgeName?: string;
  badgeIcon?: string;
  
  // Actionable notifications
  actions?: Array<{
    label: string;
    action: string; // "view", "accept", "decline", "navigate"
    targetId?: string;
  }>;
}
```

---

## 7. Real-Time Presence & Activity

### 7.1 `userPresence` Table (KV-backed)

Real-time user presence state (likely stored in KV, not D1, but schema documented here).

**TypeScript Interface:**
```typescript
interface UserPresence {
  userId: string;                // User ID
  status: 'online' | 'idle' | 'offline' | 'in_workout';
  lastSeenAt: number;            // Unix timestamp
  connectionId: string;          // WebSocket connection ID
  currentClubId: string | null;  // Currently viewed club (if any)
  currentWorkoutId: string | null; // Currently active workout
  metadata: {
    device: 'web' | 'ios' | 'android';
    appVersion: string;
  };
}
```

**Storage Note:** This data is ephemeral and should be stored in **KV namespace** with TTL (e.g., 5 minutes) rather than D1. KV key pattern: `presence:{userId}`.

---

### 7.2 `activityFeed` Table

Aggregated activity feed for users' social graph.

**TypeScript Interface:**
```typescript
interface ActivityFeedItem {
  id: string;                    // UUID v4
  userId: string;                // Owner of feed (recipient)
  actorId: string;               // User who performed action
  verb: string;                  // "completed", "joined", "earned", etc.
  objectType: 'workout' | 'badge' | 'challenge' | 'club' | 'event';
  objectId: string;              // ID of acted-upon object
  objectData: string;            // JSON snapshot of object at time of action
  extraData: string;             // JSON: { pointsEarned, streakExtended, etc. }
  clubId: string | null;         // Associated club (for club-specific feed)
  isPublic: boolean;             // Visible to club members
  createdAt: number;             // Unix timestamp
}
```

**Drizzle Schema:**
```typescript
export const activityFeed = sqliteTable("activity_feed", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  actorId: text("actor_id").notNull().references(() => users.id),
  verb: text("verb").notNull(), // "completed_workout", "joined_club", "earned_badge"
  objectType: text("object_type").notNull(),
  objectId: text("object_id").notNull(),
  objectData: text("object_data"), // JSON snapshot
  extraData: text("extra_data"),   // JSON
  clubId: text("club_id").references(() => clubs.id),
  isPublic: integer("is_public").default(1),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index('idx_activity_feed_user').on(table.userId, sql`desc ${table.createdAt}`),
  index('idx_activity_feed_created').on(sql`desc ${table.createdAt}`),
  index('idx_activity_feed_club').on(table.clubId, sql`desc ${table.createdAt}`),
]);
```

**Key Constraints:**
- `userId` is the feed recipient (may be actor themselves or followers)
- For public club activities, `userId` = actorId and `clubId` set
- For follower feeds, `userId` = follower and `isPublic` = false
- Keep `objectData` as JSON snapshot to avoid joins on read

---

## 8. WebSocket Session State

### 8.1 `websocketSessions` Table

Tracks active WebSocket connections for real-time features.

**TypeScript Interface:**
```typescript
interface WebSocketSession {
  connectionId: string;          // UUID v4
  userId: string;                // User ID
  clubId: string | null;        // Currently joined club room (if any)
  eventId: string | null;       // Currently joined event room (if any)
  connectedAt: number;           // Connection timestamp
  lastPingAt: number;           // Last heartbeat
  userAgent: string;             // Client info
  ipAddress: string;             // For rate limiting/security
}
```

**Drizzle Schema:**
```typescript
export const websocketSessions = sqliteTable("websocket_sessions", {
  connectionId: text("connection_id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clubId: text("club_id").references(() => clubs.id, { onDelete: "cascade" }),
  eventId: text("event_id").references(() => events.id, { onDelete: "cascade" }),
  connectedAt: integer("connected_at").notNull(),
  lastPingAt: integer("last_ping_at").notNull(),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
}, (table) => [
  index('idx_ws_user').on(table.userId),
  index('idx_ws_club').on(table.clubId),
  index('idx_ws_event').on(table.eventId),
  index('idx_ws_last_ping').on(table.lastPingAt),
]);
```

**Note:** This table is for active session tracking. Entries should be cleaned up on disconnect or via TTL cleanup job (disconnected sessions older than 5 minutes).

---

## 9. Migration Plan

### Phase 1: Core Social Infrastructure (Week 1-2)

**Migration 1: Clubs & Members**
```sql
-- Create clubs table
CREATE TABLE clubs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_public INTEGER DEFAULT 1,
  max_members INTEGER,
  current_member_count INTEGER DEFAULT 0,
  avatar_url TEXT,
  tags TEXT, -- JSON
  rules TEXT, -- JSON
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_clubs_owner ON clubs(owner_id);
CREATE INDEX idx_clubs_public ON clubs(is_public);
CREATE INDEX idx_clubs_created ON clubs(created_at DESC);

-- Create club_members table
CREATE TABLE club_members (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  last_active_at INTEGER,
  contribution_points INTEGER DEFAULT 0,
  UNIQUE(club_id, user_id)
);

CREATE INDEX idx_club_members_club ON club_members(club_id, status);
CREATE INDEX idx_club_members_user ON club_members(user_id, status);
```

**Migration 2: Events & Participants**
```sql
-- Create events table
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL,
  start_time INTEGER NOT NULL,
  end_time INTEGER NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  location TEXT,
  is_online INTEGER DEFAULT 0,
  online_url TEXT,
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  is_public INTEGER DEFAULT 1,
  image_url TEXT,
  requirements TEXT, -- JSON
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_events_club ON events(club_id);
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_public ON events(is_public, start_time);
CREATE INDEX idx_events_created_by ON events(created_by);

-- Create event_participants table
CREATE TABLE event_participants (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'registered',
  registered_at INTEGER NOT NULL,
  attendance_recorded_at INTEGER,
  notes TEXT,
  feedback TEXT, -- JSON
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_event_participants_event ON event_participants(event_id, status);
CREATE INDEX idx_event_participants_user ON event_participants(user_id, status);
```

### Phase 2: Messaging (Week 3)

**Migration 3: Messages**
```sql
-- Create messages table
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  club_id TEXT REFERENCES clubs(id) ON DELETE CASCADE,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  metadata TEXT, -- JSON
  is_read INTEGER DEFAULT 0,
  read_at INTEGER,
  is_deleted INTEGER DEFAULT 0,
  deleted_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_messages_sender ON messages(sender_id, created_at DESC);
CREATE INDEX idx_messages_receiver ON messages(receiver_id, is_read, created_at DESC);
CREATE INDEX idx_messages_club ON messages(club_id, created_at DESC);
CREATE INDEX idx_messages_event ON messages(event_id, created_at DESC);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
```

### Phase 3: Gamification Enhancements (Week 4)

**Migration 4: Challenges & User Challenges**
```sql
-- Create challenges table
CREATE TABLE challenges (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL,
  requirement_json TEXT NOT NULL, -- JSON
  start_date TEXT NOT NULL, -- ISO date
  end_date TEXT NOT NULL,   -- ISO date
  reward_points INTEGER DEFAULT 0,
  reward_badge_id TEXT REFERENCES badges(id),
  is_global INTEGER DEFAULT 1,
  club_id TEXT REFERENCES clubs(id) ON DELETE CASCADE,
  min_level INTEGER DEFAULT 1,
  status TEXT DEFAULT 'upcoming',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_challenges_dates ON challenges(start_date, end_date);
CREATE INDEX idx_challenges_status ON challenges(status);
CREATE INDEX idx_challenges_club ON challenges(club_id);

-- Create user_challenges table
CREATE TABLE user_challenges (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_progress INTEGER DEFAULT 0,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  reward_earned INTEGER DEFAULT 0,
  reward_earned_at INTEGER,
  UNIQUE(challenge_id, user_id)
);

CREATE INDEX idx_user_challenges_user ON user_challenges(user_id, completed_at);
CREATE INDEX idx_user_challenges_challenge ON user_challenges(challenge_id);
```

**Migration 5: Enhanced Leaderboards**
```sql
-- Create leaderboards table (enhanced from snapshots)
CREATE TABLE leaderboards (
  id TEXT PRIMARY KEY, -- Composite: `${period}:${userId}:${clubId || 'global'}`
  period TEXT NOT NULL, -- 'weekly', 'monthly', 'all_time'
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  points INTEGER DEFAULT 0,
  workout_count INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  club_id TEXT REFERENCES clubs(id) ON DELETE CASCADE,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_leaderboard_period_club_rank ON leaderboards(period, club_id, rank);
CREATE INDEX idx_leaderboard_user_period ON leaderboards(user_id, period);
```

### Phase 4: Activity Feed (Week 4)

**Migration 6: Activity Feed**
```sql
-- Create activity_feed table
CREATE TABLE activity_feed (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL REFERENCES users(id),
  verb TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  object_data TEXT, -- JSON
  extra_data TEXT,  -- JSON
  club_id TEXT REFERENCES clubs(id) ON DELETE CASCADE,
  is_public INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_activity_feed_user ON activity_feed(user_id, created_at DESC);
CREATE INDEX idx_activity_feed_created ON activity_feed(created_at DESC);
CREATE INDEX idx_activity_feed_club ON activity_feed(club_id, created_at DESC);
```

---

## 10. Indexing Strategy

### Performance Considerations

1. **Foreign Key Indexes**: All `references()` columns automatically indexed in Drizzle schema
2. **Composite Queries**: 
   - `idx_club_members_club` on `(club_id, status)` for club member lists
   - `idx_messages_receiver` on `(receiver_id, is_read, created_at DESC)` for inbox queries
   - `idx_leaderboard_period_club_rank` on `(period, club_id, rank)` for leaderboard fetches
3. **Time-Series**: `DESC` indexes on `created_at`, `started_at`, `timestamp` for recent-first queries
4. **Uniqueness**: Composite unique constraints prevent duplicates (`club_members`, `event_participants`, `user_challenges`)

### Queries Requiring Special Attention

1. **Leaderboard ranking**: Maintain rank via nightly batch job to avoid `ORDER BY rank LIMIT 100` scans
2. **Activity feed**: Fan-out on write - when user completes workout, write to:
   - Own feed (`user_id = actor_id`)
   - All followers' feeds (query `social_relationships` where `friend_id = actor_id AND status = 'accepted'`)
   - Club feed if activity occurred in club context (`club_id` set, `is_public = 1`)
3. **Message threads**: Use `(receiver_id, created_at DESC)` for DM inbox, `(club_id, created_at DESC)` for club chat

---

## 11. Data Retention & Archiving

### Retention Policies

| Table | Retention | Archival Strategy |
|-------|-----------|-------------------|
| `messages` | Keep indefinitely (user-deletable) | Soft delete only |
| `activity_feed` | 90 days | Archive to R2, truncate old entries |
| `notifications` | 30 days | Archive read/delivered notifications |
| `websocket_sessions` | 5 minutes (TTL) | Auto-delete stale entries |
| `leaderboard_snapshots` | 1 year (weekly) | Keep monthly for longer history |

### Archival Process

1. Monthly job moves data older than retention to R2 as JSONL
2. Archive files named: `{table}-{year}-{month}.jsonl.gz`
3. Delete archived rows from D1
4. Update `data_retention_log` table for audit

---

## 12. Security & Privacy

### Access Control

All queries MUST filter by `userId` with proper ownership checks:

```typescript
// Example: Get club member list
async function getClubMembers(drizzle: Drizzle, clubId: string, requestingUserId: string) {
  // Check if user is member of club (or club is public)
  const membership = await drizzle.query.clubMembers.findFirst({
    where: (cm) => eq(cm.clubId, clubId).and(eq(cm.userId, requestingUserId))
  });
  
  if (!membership) {
    throw new HTTPError(403, "Not a member of this club");
  }
  
  // Now safe to query members
  return drizzle.query.clubMembers.findMany({
    where: (cm) => eq(cm.clubId, clubId).and(eq(cm.status, 'active')),
    with: { user: true }
  });
}
```

### PII Protection

- `messages.content`: Should be considered PII; encryption at rest recommended
- `userMacroTargets`: Health data - ensure GDPR/HIPAA compliance
- `bodyAvatarModels`: Body composition data - sensitive PII

---

## 13. Monitoring & Alerts

### Key Metrics to Monitor

1. **Table Growth**:
   - `messages` rows per day (expect high volume)
   - `activity_feed` rows per day (fan-out multiplier)
2. **Query Performance**:
   - Leaderboard query latency (>100ms alert)
   - Message inbox query latency (>50ms alert)
   - Activity feed write latency (>200ms alert)
3. **Storage**: D1 database size approaching 1GB limit

### Alerts

- Query without index detected (via `EXPLAIN QUERY PLAN`)
- Table exceeds 100K rows without maintenance
- Leaderboard rank calculation job failures
- Activity feed fan-out backlog

---

## 14. Future Considerations

### Potential Future Tables

1. **`moderation_actions`**: Track content moderation (deleted messages, banned users)
2. **`club_analytics`**: Aggregated club engagement metrics
3. **`user_social_graph`**: Pre-computed follower/following counts
4. **`polls`**: Club/event polling system
5. **`reactions`**: Message/post reactions (like, emoji)
6. **`mentions`**: @mention tracking and notifications

### Scaling Considerations

- **Sharding by club_id**: If club activity exceeds limits, consider partitioning tables by `club_id`
- **CQRS**: Separate read/write models for activity feed and leaderboards
- **Materialized Views**: Pre-compute aggregates for club stats (member count, activity score)

---

## Appendix A: Full TypeScript Types

```typescript
// Clubs & Groups
export type ClubRole = 'owner' | 'admin' | 'moderator' | 'member';
export type MembershipStatus = 'active' | 'banned' | 'left';

// Events
export type EventType = 'workout' | 'challenge' | 'meetup' | 'webinar' | 'other';
export type EventParticipantStatus = 'registered' | 'attended' | 'cancelled' | 'no_show';

// Messaging
export type MessageType = 'text' | 'image' | 'system' | 'achievement';

// Leaderboard
export type LeaderboardPeriod = 'weekly' | 'monthly' | 'all_time';

// Challenges
export type ChallengeType = 'workout_count' | 'streak_extend' | 'points_earn' | 'achievement';
export type ChallengeStatus = 'upcoming' | 'active' | 'completed' | 'archived';

// Notifications
export type NotificationChannel = 'push' | 'in_app' | 'email';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed';

// Presence
export type PresenceStatus = 'online' | 'idle' | 'offline' | 'in_workout';
```

---

## Appendix B: Database Constraints Summary

| Table | Primary Key | Foreign Keys | Unique | Check |
|-------|-------------|--------------|--------|-------|
| clubs | id | ownerId → users | - | - |
| club_members | id | clubId, userId | (clubId, userId) | - |
| events | id | clubId, createdBy | - | start < end |
| event_participants | id | eventId, userId | (eventId, userId) | - |
| messages | id | senderId, receiverId?, clubId?, eventId? | - | Exactly 1 destination |
| leaderboards | id | userId, clubId? | - | rank unique per period |
| challenges | id | rewardBadgeId, clubId | - | start < end |
| user_challenges | id | challengeId, userId | (challengeId, userId) | - |
| activity_feed | id | userId, actorId, clubId | - | - |
| notifications | id | userId | - | - |

---

**Document End**
