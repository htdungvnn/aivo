# Social Features & Gamification API Specification

**Team A Implementation - Tasks #60, #75, #85, #137, #141**

This document provides detailed API specifications for social features and gamification. It covers both existing implemented endpoints (gamification) and planned endpoints for clubs, events, messaging, and enhanced leaderboards.

---

## Table of Contents

1. [Gamification (Existing)](#gamification-existing)
   - [Get Streak](#get-streak)
   - [Daily Check-in](#daily-checkin)
   - [Streak Freeze](#streak-freeze)
   - [Points & Transactions](#points--transactions)
   - [Leaderboard](#leaderboard)
   - [Share Profile](#share-profile)
2. [Clubs & Groups (Planned)](#clubs--groups-planned)
3. [Events (Planned)](#events-planned)
4. [Messaging (Planned)](#messaging-planned)
5. [Enhanced Leaderboards (Planned)](#enhanced-leaderboards-planned)
6. [Real-time Updates (Planned)](#real-time-updates-planned)

---

## Gamification (Existing)

### Get Streak

Retrieve user's current streak and gamification profile.

```http
GET /gamification/streak/:userId
Authorization: Bearer <jwt-token>
```

**Path Parameters:**
| Name | Type | Description |
|------|------|-------------|
| userId | string | User ID (must match authenticated user) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "currentStreak": 7,
    "longestStreak": 21,
    "lastCheckin": "2025-04-27",
    "lastActivityDate": "2025-04-27",
    "needsCheckin": false,
    "profile": {
      "totalPoints": 2850,
      "level": 12,
      "currentXp": 45,
      "xpToNextLevel": 150,
      "freezeCount": 2
    }
  }
}
```

**Errors:**
- `403`: Cannot view another user's streak
- `404`: Profile not found (will be auto-created)

---

### Daily Check-in

Record a daily check-in to maintain streak and earn points.

```http
POST /gamification/checkin
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "source": "workout",
  "workoutId": "workout-uuid"
}
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| source | enum | no | `workout`, `manual`, `auto` (default: `manual`) |
| workoutId | string | no | Associated workout ID if source is `workout` |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Check-in recorded",
  "data": {
    "date": "2025-04-27",
    "checkedInAt": 1700000000,
    "pointsEarned": 10
  }
}
```

**Errors:**
- `400`: Already checked in today
- `500`: Server error

**Note:** Awards 10 points upon successful check-in.

---

### Streak Freeze

#### Purchase Freeze

Buy a streak freeze using points to protect against a broken streak.

```http
POST /gamification/freeze/purchase
Authorization: Bearer <jwt-token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Streak freeze purchased",
  "data": {
    "newBalance": 2800,
    "activeFreezes": 1,
    "expiresAt": 1700000000
  }
}
```

**Errors:**
- `400`: Insufficient points (cost: 50 points)
- `400`: Maximum 3 freezes allowed
- `404`: Profile not found

#### Apply Freeze

Apply a freeze to yesterday's missed check-in.

```http
POST /gamification/freeze/apply
Authorization: Bearer <jwt-token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Freeze applied",
  "data": {
    "date": "2025-04-26",
    "freezeId": "freeze-uuid"
  }
}
```

**Errors:**
- `404`: No available freeze (must purchase first)
- `500`: Server error

---

### Points & Transactions

#### Get Points Balance and History

```http
GET /gamification/points/:userId
Authorization: Bearer <jwt-token>
```

**Path Parameters:**
| Name | Type | Description |
|------|------|-------------|
| userId | string | User ID (must match authenticated user) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "balance": 2850,
    "level": 12,
    "currentXp": 45,
    "xpToNextLevel": 150,
    "streakCurrent": 7,
    "streakLongest": 21,
    "freezeCount": 2,
    "transactions": [
      {
        "id": "tx_uuid",
        "type": "earn",
        "amount": 10,
        "reason": "Daily check-in",
        "balanceAfter": 2850,
        "createdAt": 1700000000000
      }
    ]
  }
}
```

---

### Leaderboard

#### Get Global Leaderboard

```http
GET /gamification/leaderboard?limit=100&friendsOnly=false
Authorization: Bearer <jwt-token>
```

**Query Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| limit | integer | 100 | Number of entries (max 500) |
| friendsOnly | boolean | false | Show only friends (not yet implemented) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "userId": "user-uuid",
      "name": "User Name",
      "picture": "https://...",
      "points": 15000,
      "streak": 30,
      "level": 25
    }
  ],
  "cached": false
}
```

**Caching:** Results cached in KV for 5 minutes (300 seconds).

**Errors:**
- `501`: Friends-only leaderboard not implemented

#### Get User's Rank

```http
GET /gamification/leaderboard/rank/:userId
Authorization: Bearer <jwt-token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "rank": 42,
    "points": 2850,
    "percentile": "95.8"
  }
}
```

---

### Share Profile

Generate a shareable image (SVG) of user's achievements.

```http
POST /gamification/share/generate
Authorization: Bearer <jwt-token>
Query Parameters:
  hideWeight=true (optional)
  theme=default|dark|light|ocean (optional)
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "svg": "<svg>...</svg>",
    "shareUrl": "https://aivo.app/share?userId=..."
  }
}
```

#### Record Share Event

```http
POST /gamification/share/record
Authorization: Bearer <jwt-token>
```

Awards 25 bonus points for sharing.

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Share recorded! +25 points earned",
  "data": {
    "pointsAwarded": 25
  }
}
```

---

## Clubs & Groups (Planned)

### Club Operations

#### Create Club

```http
POST /clubs
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "Morning Warriors",
  "description": "Early morning workout group",
  "isPublic": true,
  "maxMembers": 50,
  "settings": {
    "requireApproval": false,
    "allowEventCreation": true
  }
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "clubId": "club-uuid",
    "name": "Morning Warriors",
    "description": "...",
    "ownerId": "user-uuid",
    "isPublic": true,
    "memberCount": 1,
    "createdAt": "2025-04-27T12:00:00.000Z"
  }
}
```

#### Get Club

```http
GET /clubs/:clubId
Authorization: Bearer <jwt-token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "clubId": "club-uuid",
    "name": "Morning Warriors",
    "description": "...",
    "owner": {
      "userId": "user-uuid",
      "name": "Owner Name",
      "picture": "https://..."
    },
    "isPublic": true,
    "memberCount": 25,
    "eventCount": 10,
    "settings": { ... },
    "createdAt": "2025-04-27T12:00:00.000Z"
  }
}
```

#### List User's Clubs

```http
GET /clubs?role=member&limit=50
Authorization: Bearer <jwt-token>
```

**Query Parameters:**

| Name | Type | Description |
|------|------|-------------|
| role | enum | `member`, `admin`, `owner` (default: all) |
| limit | integer | Max number of clubs (default 50) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "clubId": "club-uuid",
      "name": "Morning Warriors",
      "role": "admin",
      "memberCount": 25,
      "lastActivity": "2025-04-27"
    }
  ]
}
```

#### Update Club

```http
PATCH /clubs/:clubId
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "New Name",
  "description": "Updated description",
  "settings": { ... }
}
```

**Authorization:** Only club owner or admin.

#### Delete Club

```http
DELETE /clubs/:clubId
Authorization: Bearer <jwt-token>
```

**Authorization:** Only club owner.

---

### Club Membership

#### Join Club

```http
POST /clubs/:clubId/join
Authorization: Bearer <jwt-token>
```

For public clubs: immediate join.
For private clubs: creates join request (requires approval).

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Joined club successfully",
  "data": {
    "clubId": "club-uuid",
    "userId": "user-uuid",
    "role": "member",
    "joinedAt": "2025-04-27T12:00:00.000Z"
  }
}
```

#### Leave Club

```http
POST /clubs/:clubId/leave
Authorization: Bearer <jwt-token>
```

#### Get Club Members

```http
GET /clubs/:clubId/members?limit=100&offset=0
Authorization: Bearer <jwt-token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "members": [
      {
        "userId": "user-uuid",
        "name": "Member Name",
        "picture": "https://...",
        "role": "admin",
        "joinedAt": "2025-04-20T12:00:00.000Z",
        "lastActive": "2025-04-27T10:30:00.000Z"
      }
    ],
    "total": 25
  }
}
```

#### Manage Membership (Admin/Owner)

```http
PATCH /clubs/:clubId/members/:userId
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "action": "promote|demote|remove|approve",
  "reason": "optional reason"
}
```

---

## Events (Planned)

### Event Operations

#### Create Event

```http
POST /clubs/:clubId/events
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "title": "Saturday Morning Run",
  "description": "5K group run at the park",
  "eventType": "workout",
  "startTime": 1700000000000,
  "durationMinutes": 60,
  "location": {
    "name": "Central Park",
    "address": "123 Park Ave",
    "coordinates": { "lat": 40.785091, "lng": -73.968285 }
  },
  "maxParticipants": 50,
  "requirements": {
    "fitnessLevel": "beginner|intermediate|advanced",
    "equipment": ["running shoes"]
  },
  "imageUrl": "https://..."
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "eventId": "event-uuid",
    "clubId": "club-uuid",
    "title": "Saturday Morning Run",
    "startTime": 1700000000000,
    "organizerId": "user-uuid",
    "participantCount": 1,
    "waitlistCount": 0,
    "createdAt": "2025-04-27T12:00:00.000Z"
  }
}
```

#### Get Event

```http
GET /events/:eventId
Authorization: Bearer <jwt-token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "eventId": "event-uuid",
    "clubId": "club-uuid",
    "clubName": "Morning Warriors",
    "title": "Saturday Morning Run",
    "description": "...",
    "eventType": "workout",
    "startTime": 1700000000000,
    "durationMinutes": 60,
    "location": { ... },
    "maxParticipants": 50,
    "participantCount": 25,
    "waitlistCount": 3,
    "organizer": {
      "userId": "user-uuid",
      "name": "Organizer Name",
      "picture": "https://..."
    },
    "requirements": { ... },
    "createdAt": "2025-04-27T12:00:00.000Z"
  }
}
```

#### List Events

```http
GET /events?clubId=...&status=upcoming&limit=50
Authorization: Bearer <jwt-token>
```

**Query Parameters:**

| Name | Type | Description |
|------|------|-------------|
| clubId | string | Filter by club |
| status | enum | `upcoming`, `ongoing`, `completed`, `all` |
| limit | integer | Max results (default 50) |
| startAfter | timestamp | Filter events starting after this time |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "eventId": "event-uuid",
      "title": "Saturday Morning Run",
      "clubName": "Morning Warriors",
      "startTime": 1700000000000,
      "durationMinutes": 60,
      "location": { ... },
      "participantCount": 25,
      "maxParticipants": 50
    }
  ]
}
```

#### Update Event

```http
PATCH /events/:eventId
Authorization: Bearer <jwt-token>
Content-Type: application/json
{ ... }
```

**Authorization:** Event organizer or club admin.

#### Cancel Event

```http
DELETE /events/:eventId
Authorization: Bearer <jwt-token>
```

---

### Event Participation

#### RSVP to Event

```http
POST /events/:eventId/rsvp
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "status": "going|maybe|declined",
  "guests": 0
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "eventId": "event-uuid",
    "userId": "user-uuid",
    "status": "going",
    "rsvpAt": "2025-04-27T12:00:00.000Z",
    "guests": 0
  }
}
```

#### Get Event Attendees

```http
GET /events/:eventId/attendees?status=going
Authorization: Bearer <jwt-token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "eventId": "event-uuid",
    "attendees": [
      {
        "userId": "user-uuid",
        "name": "Attendee Name",
        "picture": "https://...",
        "status": "going",
        "rsvpAt": "2025-04-27T12:00:00.000Z"
      }
    ],
    "total": 25
  }
}
```

---

## Messaging (Planned)

### Direct Messages

#### Send Message

```http
POST /messages
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "recipientId": "user-uuid",
  "content": "Hey! How's the training going?",
  "replyToMessageId": "msg-uuid"  // optional
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "messageId": "msg-uuid",
    "senderId": "user-uuid",
    "recipientId": "user-uuid",
    "content": "Hey! How's the training going?",
    "sentAt": "2025-04-27T12:00:00.000Z",
    "replyToMessageId": null
  }
}
```

#### Get Conversation

```http
GET /messages/conversations/:userId?limit=100
Authorization: Bearer <jwt-token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "participant": {
      "userId": "user-uuid",
      "name": "Other User",
      "picture": "https://..."
    },
    "messages": [
      {
        "messageId": "msg-uuid",
        "senderId": "user-uuid",
        "content": "Hello!",
        "sentAt": "2025-04-27T10:00:00.000Z",
        "isRead": true,
        "readAt": "2025-04-27T10:05:00.000Z"
      }
    ],
    "hasMore": false
  }
}
```

#### List Conversations

```http
GET /messages/conversations?limit=50
Authorization: Bearer <jwt-token>
```

Returns list of all conversation partners with last message preview.

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "participant": {
        "userId": "user-uuid",
        "name": "John Doe",
        "picture": "https://..."
      },
      "lastMessage": "See you tomorrow!",
      "lastMessageAt": "2025-04-27T12:00:00.000Z",
      "unreadCount": 2
    }
  ]
}
```

#### Mark as Read

```http
POST /messages/:messageId/read
Authorization: Bearer <jwt-token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Marked as read"
}
```

#### Delete Message

```http
DELETE /messages/:messageId
Authorization: Bearer <jwt-token>
```

**Authorization:** Only sender can delete.

---

### Group Chat (Club/Event)

#### Send Club Message

```http
POST /clubs/:clubId/messages
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "content": "Great workout everyone!",
  "replyToMessageId": "msg-uuid"  // optional
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "messageId": "msg-uuid",
    "clubId": "club-uuid",
    "senderId": "user-uuid",
    "senderName": "User Name",
    "senderPicture": "https://...",
    "content": "Great workout everyone!",
    "sentAt": "2025-04-27T12:00:00.000Z"
  }
}
```

#### Get Club Messages

```http
GET /clubs/:clubId/messages?limit=100&before=...
Authorization: Bearer <jwt-token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "clubId": "club-uuid",
    "messages": [ ... ],
    "hasMore": false
  }
}
```

---

## Enhanced Leaderboards (Planned)

### Leaderboard Types

#### Global Leaderboard

All users ranked by total points.

```http
GET /leaderboard/global?limit=100&offset=0&period=all
Authorization: Bearer <jwt-token>
```

**Query Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| limit | integer | 100 | Number of entries |
| offset | integer | 0 | Pagination offset |
| period | enum | `all` | `all`, `weekly`, `monthly`, `yearly` |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "period": "weekly",
    "entries": [
      {
        "rank": 1,
        "userId": "user-uuid",
        "name": "User Name",
        "picture": "https://...",
        "points": 1500,
        "level": 25,
        "change": "+2",  // rank change from last period
        "trend": "up"   // up, down, stable
      }
    ],
    "totalUsers": 5000,
    "generatedAt": "2025-04-27T12:00:00.000Z"
  }
}
```

#### Friends Leaderboard

```http
GET /leaderboard/friends?limit=100
Authorization: Bearer <jwt-token>
```

#### Club Leaderboard

```http
GET /clubs/:clubId/leaderboard?limit=100
Authorization: Bearer <jwt-token>
```

---

### Leaderboard Details

#### Get User Rank with Neighbors

```http
GET /leaderboard/rank/:userId?neighbors=5
Authorization: Bearer <jwt-token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "rank": 42,
    "points": 2850,
    "percentile": "95.8",
    "neighbors": {
      "above": [
        { "rank": 40, "userId": "...", "points": 2900 },
        { "rank": 41, "userId": "...", "points": 2875 }
      ],
      "below": [
        { "rank": 43, "userId": "...", "points": 2800 },
        { "rank": 44, "userId": "...", "points": 2780 }
      ]
    }
  }
}
```

---

## Real-time Updates (Planned)

### WebSocket Endpoints

#### Connection

```
wss://api.aivo.yourdomain.com/ws?token=<jwt-token>
```

Authentication via query parameter token. Connection upgrades to WebSocket.

#### Subscriptions

Client sends subscription message:

```json
{
  "type": "subscribe",
  "channels": [
    "gamification:user:userId",
    "club:clubId:messages",
    "event:eventId:updates"
  ]
}
```

#### Messages

Server pushes updates:

**Leaderboard Update:**

```json
{
  "type": "leaderboard_update",
  "channel": "gamification:user:userId",
  "data": {
    "rank": 41,
    "points": 2875,
    "change": "+1"
  }
}
```

**New Club Message:**

```json
{
  "type": "club_message",
  "channel": "club:clubId:messages",
  "data": {
    "messageId": "msg-uuid",
    "senderId": "user-uuid",
    "senderName": "User Name",
    "content": "Hello club!",
    "sentAt": "2025-04-27T12:00:00.000Z"
  }
}
```

**Event Reminder:**

```json
{
  "type": "event_reminder",
  "channel": "event:eventId:updates",
  "data": {
    "eventId": "event-uuid",
    "title": "Saturday Morning Run",
    "startTime": 1700000000000,
    "reminder": "1 hour until event"
  }
}
```

#### Unsubscribe

```json
{
  "type": "unsubscribe",
  "channels": ["channel-id"]
}
```

---

## Data Models

### Gamification Profile

```typescript
interface GamificationProfile {
  id: string;
  userId: string;
  totalPoints: number;
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  streakCurrent: number;
  streakLongest: number;
  lastActivityDate: string | null;
  freezeCount: number;
  createdAt: number;
  updatedAt: number;
}
```

### Point Transaction

```typescript
interface PointTransaction {
  id: string;
  userId: string;
  type: "earn" | "spend" | "bonus" | "penalty";
  amount: number;  // positive for earn, negative for spend
  reason: string;
  relatedId: string | null;
  balanceAfter: number;
  createdAt: number;
}
```

### Daily Check-in

```typescript
interface DailyCheckin {
  userId: string;
  date: string;  // YYYY-MM-DD
  checkedInAt: number;
  source: "workout" | "manual" | "auto";
  workoutId: string | null;
}
```

### Streak Freeze

```typescript
interface StreakFreeze {
  id: string;
  userId: string;
  purchasedAt: number;
  usedAt: number | null;
  usedOnDate: string | null;
  expiresAt: number;
  pointsSpent: number;
}
```

### Club (Planned)

```typescript
interface Club {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  isPublic: boolean;
  maxMembers: number;
  settings: {
    requireApproval: boolean;
    allowEventCreation: boolean;
    enableChat: boolean;
  };
  memberCount: number;
  createdAt: number;
  updatedAt: number;
}
```

### Club Member

```typescript
interface ClubMember {
  clubId: string;
  userId: string;
  role: "owner" | "admin" | "member";
  joinedAt: number;
  lastActive: number;
}
```

### Event (Planned)

```typescript
interface Event {
  id: string;
  clubId: string;
  title: string;
  description: string;
  eventType: "workout" | "social" | "challenge" | "webinar";
  startTime: number;
  durationMinutes: number;
  location: {
    name: string;
    address?: string;
    coordinates?: { lat: number; lng: number };
    virtualLink?: string;
  };
  maxParticipants: number;
  requirements: {
    fitnessLevel?: string;
    equipment?: string[];
  };
  organizerId: string;
  participantCount: number;
  waitlistCount: number;
  createdAt: number;
  updatedAt: number;
}
```

### Event Participant

```typescript
interface EventParticipant {
  eventId: string;
  userId: string;
  status: "going" | "maybe" | "declined";
  rsvpAt: number;
  guests: number;
  checkinAt: number | null;
}
```

### Message (Planned)

```typescript
interface Message {
  id: string;
  senderId: string;
  recipientId: string | null;  // null for group chat
  clubId: string | null;      // set for club messages
  eventId: string | null;     // set for event chat
  content: string;
  replyToMessageId: string | null;
  sentAt: number;
  isRead: boolean;
  readAt: number | null;
}
```

---

## Rate Limits & Quotas

| Endpoint | Rate Limit | Description |
|----------|-------------|-------------|
| `/gamification/checkin` | 1/day | Daily check-in limit |
| `/gamification/freeze/purchase` | 10/day | Prevent spam |
| `/clubs` | 100/hour | Club creation/modification |
| `/messages` | 200/hour | Message sending |
| `/events` | 100/hour | Event creation/modification |

---

## Error Responses

Standard error format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }  // optional additional info
}
```

**Common Error Codes:**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `ALREADY_CHECKED_IN` | 400 | Already checked in today |
| `INSUFFICIENT_POINTS` | 400 | Not enough points for purchase |
| `MAX_FREEZES_REACHED` | 400 | Already have 3 freezes |
| `CLUB_FULL` | 400 | Club has reached max members |
| `EVENT_FULL` | 400 | Event has reached max participants |

---

## Webhooks (Planned)

Events that trigger webhooks:

- `club.created`
- `club.member.joined`
- `event.created`
- `event.rsvp.updated`
- `message.sent`
- `leaderboard.updated`

Webhook payload:

```json
{
  "event": "club.created",
  "timestamp": "2025-04-27T12:00:00.000Z",
  "data": { ... }
}
```

---

## Implementation Notes

### Database Schema

See `packages/db/src/schema.ts` for table definitions. Key tables:

- `gamification_profiles` - User progression data
- `point_transactions` - Audit log of all point changes
- `daily_checkins` - Daily activity tracking
- `streak_freezes` - Streak protection tracking
- `clubs` - Club/group definitions (planned)
- `club_members` - Club membership (planned)
- `events` - Event definitions (planned)
- `event_participants` - Event RSVP tracking (planned)
- `messages` - Direct and group messages (planned)

### Caching Strategy

- Leaderboard results cached in KV for 5 minutes
- User streak cached for 1 minute
- Point balances cached for 30 seconds

### Points Awarding

Points are atomically awarded with profile updates in a single transaction:

```typescript
await drizzle.transaction(async (tx) => {
  // Update profile
  await tx.update(gamificationProfiles).set(...).where(...);
  // Record transaction
  await tx.insert(pointTransactions).values(...);
});
```

### Leveling Formula

XP required for next level:

```
xpToNextLevel = 100 * 1.5^(level - 1)
```

Example:
- Level 1 → 2: 100 XP
- Level 2 → 3: 150 XP
- Level 10 → 11: ~1000 XP

---

## OpenAPI Spec (Partial)

```yaml
openapi: 3.0.3
info:
  title: AIVO Social & Gamification API
  version: 1.0.0
  description: Endpoints for gamification, clubs, events, and messaging

paths:
  /gamification/streak/{userId}:
    get:
      summary: Get user streak
      security:
        - bearer: []
      parameters:
        - name: userId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Streak data
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StreakResponse'

  /gamification/checkin:
    post:
      summary: Daily check-in
      security:
        - bearer: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CheckinRequest'
      responses:
        '200':
          description: Check-in successful
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CheckinResponse'

components:
  schemas:
    StreakResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          $ref: '#/components/schemas/StreakData'

    StreakData:
      type: object
      properties:
        userId:
          type: string
        currentStreak:
          type: integer
        longestStreak:
          type: integer
        profile:
          $ref: '#/components/schemas/GamificationProfile'

    GamificationProfile:
      type: object
      properties:
        totalPoints:
          type: integer
        level:
          type: integer
        currentXp:
          type: integer
        xpToNextLevel:
          type: integer
        streakCurrent:
          type: integer
        streakLongest:
          type: integer

    CheckinRequest:
      type: object
      properties:
        source:
          type: string
          enum: [workout, manual, auto]
        workoutId:
          type: string

    CheckinResponse:
      type: object
      properties:
        success:
          type: boolean
        message:
          type: string
        data:
          $ref: '#/components/schemas/CheckinData'

    CheckinData:
      type: object
      properties:
        date:
          type: string
          format: date
        checkedInAt:
          type: integer
        pointsEarned:
          type: integer
```

---

**Document Version:** 1.0.0
**Last Updated:** 2025-04-28
**Team:** Team A (Social Features & Gamification)
**Status:** Draft - Awaiting implementation
