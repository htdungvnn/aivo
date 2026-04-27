# API Contracts

**Status**: ⏳ Awaiting API specifications from senior-hono  
**Last Updated**: 2025-04-27

This document contains API specifications for planned and in-development features. It serves as the contract between frontend/backend teams before implementation.

> **Note**: For existing, shipped APIs, see [API_REFERENCE.md](./API_REFERENCE.md).

---

## Table of Contents

- [API Design Principles](#api-design-principles)
- [Feature API Specifications](#feature-api-specifications)
- [Common Patterns](#common-patterns)
- [Versioning Strategy](#versioning-strategy)
- [Error Handling](#error-handling)

---

## API Design Principles

### RESTful Guidelines

- Use nouns for resources (not verbs)
- Use plural form: `/workouts`, `/body_metrics`
- Use HTTP methods appropriately:
  - `GET` - Read
  - `POST` - Create
  - `PUT` / `PATCH` - Update (full/partial)
  - `DELETE` - Remove

### Naming Conventions

```typescript
// Collections
GET /api/workouts           // List workouts
POST /api/workouts          // Create workout

// Single resource
GET /api/workouts/:id       // Get workout
PUT /api/workouts/:id       // Update workout
DELETE /api/workouts/:id    // Delete workout

// Sub-resources
GET /api/workouts/:id/sessions
POST /api/workouts/:id/sessions

// Actions (rarely)
POST /api/workouts/:id/duplicate
POST /api/workouts/:id/archive
```

### Pagination

List endpoints support pagination:

```typescript
GET /api/workouts?page=1&limit=20

Response:
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Standard Response Format

```typescript
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
};
```

---

## Feature API Specifications

### Feature: AI Coaching Enhancements (v1.1)

#### Endpoint: Multi-turn Conversation with Memory

```http
POST /api/ai/chat/multi
```

**Description**: Send a sequence of messages in a conversation thread with full context.

**Authentication**: Required (Bearer token)

**Request Body**:

```typescript
interface MultiChatRequest {
  conversationId?: string; // If continuing existing conversation
  messages: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }[];
  userId: string;
  includeMemory?: boolean; // Whether to inject memory context
  model?: 'gpt-4o' | 'gemini-1.5-pro' | 'auto'; // Default: auto
}
```

**Response Body**:

```typescript
interface MultiChatResponse {
  success: boolean;
  data: {
    conversationId: string;
    response: {
      role: 'assistant';
      content: string;
      timestamp: string;
    };
    memoryFactsExtracted?: Array<{
      fact: string;
      category: string;
      confidence: number;
    }>;
    tokensUsed: number;
    modelUsed: string;
    cost: number; // in USD
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}
```

**Example Request**:

```bash
curl -X POST https://api.aivo.website/api/ai/chat/multi \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "conversationId": "conv-456",
    "messages": [
      {
        "role": "user",
        "content": "What should I eat before my workout?",
        "timestamp": "2025-04-27T10:00:00Z"
      },
      {
        "role": "assistant",
        "content": "For optimal performance, eat a meal with carbohydrates and protein 2-3 hours before your workout.",
        "timestamp": "2025-04-27T10:00:05Z"
      },
      {
        "role": "user",
        "content": "I have a 1-hour HIIT session at 6 PM. What should I eat around 4 PM?",
        "timestamp": "2025-04-27T10:00:10Z"
      }
    ],
    "includeMemory": true
  }'
```

**Error Responses**:
- `400` - Invalid request (missing required fields, invalid JSON)
- `401` - Unauthorized (invalid token)
- `429` - Rate limit exceeded
- `500` - AI service error

---

#### Endpoint: Voice Input Processing

```http
POST /api/ai/voice
```

**Description**: Transcribe and process voice input for AI coaching.

**Authentication**: Required

**Request Body** (multipart/form-data):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `audio` | File | Yes | WebM/MP3 audio file (max 10MB, max 60s) |
| `userId` | string | Yes | User ID |
| `language` | string | No | BCP-47 language tag (default: en-US) |

**Response Body**:

```typescript
interface VoiceResponse {
  success: boolean;
  data: {
    transcript: string;      // Transcribed text
    confidence: number;      // Transcription confidence (0-1)
    response: string;        // AI response text
    tokensUsed: number;
    audioResponseUrl?: string; // Optional: URL to audio response
  };
  meta: {
    processingTimeMs: number;
  };
}
```

**Notes**:
- Requires OpenAI Whisper API or similar transcription service
- Audio files stored temporarily in R2 then deleted
- Consider WebSocket streaming for real-time voice (future)

---

### Feature: Nutrition Tracking (v1.3)

#### Endpoint: Search Food Database

```http
GET /api/nutrition/food/search
```

**Description**: Search for food items in the nutrition database.

**Authentication**: Required

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Search query (food name) |
| `brand` | string | No | Filter by brand |
| `limit` | integer | No | Results per page (default: 20, max: 100) |

**Response Body**:

```typescript
interface FoodSearchResponse {
  success: boolean;
  data: {
    foods: Array<{
      id: string;
      name: string;
      brand: string;
      servingSize: number;
      servingUnit: string; // 'g', 'ml', 'cup', 'tbsp'
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber?: number;
      sugar?: number;
      sodium?: number;
    }>;
    pagination: {
      total: number;
      page: number;
      limit: number;
    };
  };
}
```

**Example**:

```bash
curl "https://api.aivo.website/api/nutrition/food/search?q=banana&limit=5" \
  -H "Authorization: Bearer <token>"
```

---

#### Endpoint: Barcode Lookup

```http
GET /api/nutrition/barcode/:barcode
```

**Description**: Look up food item by barcode (UPC/EAN).

**Authentication**: Required

**Response**:

```typescript
interface BarcodeResponse {
  success: boolean;
  data: {
    food?: FoodItem; // Same structure as search result
    found: boolean;
    source: string; // 'openfoodfacts', 'usda', etc.
  };
}
```

**Error**: `404` if barcode not found

---

#### Endpoint: Log Food

```http
POST /api/nutrition/logs
```

**Description**: Create or update a nutrition log entry.

**Request Body**:

```typescript
interface NutritionLogRequest {
  userId: string;
  foodItem: string;      // Food name or barcode
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  quantity: number;      // Serving multiplier
  servingSize?: number;  // Override default serving size
  servingUnit?: string;  // Override default unit
  loggedAt?: string;     // ISO 8601, defaults to now
}
```

**Response**:

```typescript
interface NutritionLogResponse {
  success: boolean;
  data: {
    log: NutritionLog;
    dailyTotals: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      remaining?: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      };
    };
  };
}
```

---

### Feature: Gamification (v1.4)

#### Endpoint: Get User Stats

```http
GET /api/gamification/stats
```

**Description**: Retrieve user's gamification statistics (points, streak, badges).

**Authentication**: Required

**Response**:

```typescript
interface GamificationStatsResponse {
  success: boolean;
  data: {
    points: {
      total: number;
      earnedToday: number;
      earnedThisWeek: number;
      breakdown: {
        workoutCompleted: number;
        streakMaintained: number;
        achievementEarned: number;
      };
    };
    streak: {
      current: number;    // days
      longest: number;    // days
      lastWorkoutDate: string; // ISO 8601
      nextMilestone: number; // days until next badge
    };
    badges: Array<{
      id: string;
      name: string;
      description: string;
      icon: string;
      earnedAt?: string;
      progress?: number; // 0-100 for progress-based badges
    }>;
    leaderboard?: {
      rank: number;
      percentile: number;
      nearby: Array<{ userId: string; name: string; points: number }>;
    };
  };
}
```

---

#### Endpoint: Award Points

```http
POST /api/gamification/points/award
```

**Description**: Internal endpoint to award points for achievements.

**Authentication**: Required (Admin/System only)

**Request Body**:

```typescript
interface AwardPointsRequest {
  userId: string;
  amount: number;        // Points to award (positive integer)
  reason: string;        // E.g., "completed_workout", "7_day_streak"
  metadata?: Record<string, any>;
}
```

**Response**:

```typescript
interface AwardPointsResponse {
  success: boolean;
  data: {
    userId: string;
    newTotal: number;
    previousTotal: number;
    awarded: number;
  };
}
```

**Idempotency**: Use `X-Idempotency-Key` header to prevent duplicate awards.

---

### Feature: Social Features (v2.0)

#### Endpoint: Friend Management

```http
POST /api/social/friends/requests
```

**Description**: Send friend request to another user.

**Request Body**:

```typescript
interface FriendRequestRequest {
  friendId: string;      // User ID of friend to add
  message?: string;      // Optional message
}
```

**Response**: `204 No Content` on success

---

```http
GET /api/social/friends
```

**Description**: List friends and pending requests.

**Response**:

```typescript
interface FriendsResponse {
  success: boolean;
  data: {
    friends: Array<{
      userId: string;
      name: string;
      avatarUrl?: string;
      lastActive: string;
      workoutCount: number;
    }>;
    pendingSent: Array<{ userId: string; name: string; requestedAt: string }>;
    pendingReceived: Array<{ userId: string; name: string; requestedAt: string }>;
  };
}
```

---

#### Endpoint: Activity Feed

```http
GET /api/social/feed
```

**Description**: Get friends' recent activity.

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Items per page (default: 20) |
| `since` | string | ISO 8601 date, only items after this |

**Response**:

```typescript
interface ActivityFeedResponse {
  success: boolean;
  data: {
    activities: Array<{
      id: string;
      userId: string;
      userName: string;
      userAvatar?: string;
      type: 'workout_completed' | 'badge_earned' | 'pr_set' | 'goal_reached';
      title: string;
      description: string;
      metadata: Record<string, any>;
      createdAt: string;
      likes: number;
      comments: number;
    }>;
    pagination: Pagination;
  };
}
```

---

### Feature: Advanced Reporting (v2.0)

#### Endpoint: Generate Monthly Report

```http
POST /api/reports/monthly
```

**Description**: Generate a comprehensive monthly progress report.

**Authentication**: Required

**Request Body**:

```typescript
interface MonthlyReportRequest {
  userId: string;
  year: number;
  month: number;        // 1-12
  includeCharts: boolean; // Generate chart images (default: true)
  format: 'pdf' | 'html' | 'json'; // Output format
}

// Response varies by format
```

**PDF Response**:
- Returns PDF file (application/pdf)
- `Content-Disposition: attachment; filename="report-2025-04.pdf"`

**HTML Response**:
- Returns HTML string in `data.html` field
- Ready to print or save

**JSON Response**:
- Returns structured data for custom rendering

**Response (JSON format)**:

```typescript
interface MonthlyReportResponse {
  success: boolean;
  data: {
    period: { year: number; month: number };
    summary: {
      totalWorkouts: number;
      totalDuration: number; // minutes
      totalCaloriesBurned: number;
      personalRecords: number;
      bodyMetricsChange: {
        weight: { from: number; to: number; change: number };
        bodyFat: { from: number; to: number; change: number };
      };
    };
    charts: {
      workoutFrequency: { labels: string[]; values: number[] };
      strengthProgress: Array<{ exercise: string; maxWeight: number }>;
      bodyComposition: Array{date: string; weight: number; bodyFat: number}>;
    };
    aiInsights: string[];
    recommendations: string[];
    url?: string; // If PDF/HTML stored in R2
  };
}
```

---

### Feature: Integration Marketplace (v2.1+)

#### Endpoint: List Available Integrations

```http
GET /api/integrations
```

**Description**: Get list of supported third-party integrations.

**Response**:

```typescript
interface IntegrationsResponse {
  success: boolean;
  data: {
    integrations: Array<{
      id: string;           // 'strava', 'apple_health', 'google_fit', etc.
      name: string;
      description: string;
      icon: string;
      connected: boolean;
      connectedAt?: string;
      scopes: string[];     // OAuth scopes required
      capabilities: string[]; // 'read_workouts', 'write_activities', etc.
    }>;
  };
}
```

---

#### Endpoint: Connect Integration (OAuth Init)

```http
POST /api/integrations/:provider/connect
```

**Description**: Initiate OAuth flow for third-party integration.

**Response**:

```typescript
interface ConnectResponse {
  success: boolean;
  data: {
    authorizationUrl: string;  // Redirect user to this URL
    state: string;             // CSRF protection token
  };
}
```

---

#### Endpoint: OAuth Callback Handler

```http
GET /api/integrations/:provider/callback
```

**Description**: OAuth redirect target - exchanges code for tokens.

**Query Parameters**:
- `code` - Authorization code from provider
- `state` - CSRF token (must match session)

**Response**: Redirects to frontend with success/failure

---

## Common Patterns

### Error Responses

All endpoints return errors in this format:

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;      // Machine-readable error code
    message: string;   // Human-readable message
    details?: any;     // Optional additional context
  };
  meta?: {
    requestId: string; // For debugging
    timestamp: string;
  };
}
```

**Standard Error Codes**:

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Invalid or missing auth token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate) |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | AI service or external API down |

**Example**:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {
      "field": "weight",
      "issue": "must be positive number"
    }
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2025-04-27T12:00:00Z"
  }
}
```

---

### Rate Limiting

Rate limits per user:

| Endpoint Type | Rate Limit |
|---------------|------------|
| AI Chat | 100 requests/hour |
| Workout CRUD | 1000 requests/hour |
| Nutrition logs | 500 requests/hour |
| Unauthenticated | 10 requests/hour |

**Rate Limit Headers**:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1714214400
```

**Response on limit exceeded**:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Try again in 45 seconds."
  }
}
```

---

### Pagination

All list endpoints support:

```typescript
// Query params
GET /api/workouts?page=2&limit=20

// Response
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": true
  }
}
```

**Default values**: `page=1`, `limit=20`, `maxLimit=100`

---

### Cursor-based Pagination (for large datasets)

For endpoints with >10k records, use cursor-based:

```typescript
GET /api/conversations?cursor=abc123&limit=20

Response:
{
  "success": true,
  "data": [...],
  "pagination": {
    "nextCursor": "def456",
    "hasMore": true
  }
}
```

---

## Versioning Strategy

### URL Versioning (Current)

```
/api/v1/workouts
/api/v1/body/metrics
```

When breaking changes are needed:
- Create `/api/v2/` endpoints
- Deprecate old endpoints with `Deprecation` header
- Maintain v1 for at least 6 months after v2 launch

### Deprecation Headers

```http
Deprecation: true
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Link: <https://api.aivo.website/docs/v2/migration>; rel="migration"
```

---

## Schema Validation

All request bodies are validated using Zod schemas:

```typescript
const CreateWorkoutSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  exercises: z.array(z.object({
    name: z.string(),
    sets: z.number().positive(),
    reps: z.number().positive(),
    weight: z.number().nonnegative(),
  })),
  userId: z.string().uuid(),
});

// In route
const body = await c.req.json();
const validated = CreateWorkoutSchema.parse(body);
```

---

## Testing API Contracts

All new APIs should have tests verifying:

1. **Request validation** - Invalid requests return 400
2. **Authentication** - Unauthorized returns 401
3. **Happy path** - Valid request returns correct response format
4. **Error handling** - Known errors return correct status codes
5. **Pagination** - Works correctly with various params

Example test (Jest):

```typescript
describe('POST /api/ai/chat/multi', () => {
  it('should return 400 for invalid messages', async () => {
    const response = await request(app)
      .post('/api/ai/chat/multi')
      .send({ invalid: 'body' });
    expect(response.status).toBe(400);
  });

  it('should return valid response format', async () => {
    const response = await request(app)
      .post('/api/ai/chat/multi')
      .send(validRequest)
      .set('Authorization', 'Bearer valid-token');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.conversationId).toBeDefined();
    expect(response.body.data.response.content).toBeDefined();
  });
});
```

---

## Implementation Checklist

When implementing a new API endpoint:

- [ ] Define TypeScript interfaces for request/response
- [ ] Create Zod validation schema
- [ ] Implement Hono route with error handling
- [ ] Add authentication middleware
- [ ] Add rate limiting (if needed)
- [ ] Add request logging
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Document in API_REFERENCE.md or API_CONTRACTS.md
- [ ] Update OpenAPI spec (if applicable)
- [ ] Add request/response examples

---

## Related Documentation

- **[API_REFERENCE.md](./API_REFERENCE.md)** - Existing, shipped APIs
- **[FEATURES.md](./FEATURES.md)** - Feature specifications and user stories
- **[DATABASE_SCHEMAS.md](./DATABASE_SCHEMAS.md)** - Database tables used by these APIs
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design decisions

---

**Document Owner**: Technical-docs (in coordination with senior-hono)  
**Last Updated**: 2025-04-27  
**Next Review**: When features move from planning to implementation
