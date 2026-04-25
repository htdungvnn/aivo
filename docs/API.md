# API Reference

Complete reference for AIVO API endpoints.

## Base URL

```
Production: https://api.aivo.yourdomain.com
Development: http://localhost:8787 (Wrangler dev)
```

## Authentication

All endpoints (except health) require Bearer token authentication:

```
Authorization: Bearer <jwt-token>
```

Additionally, user identification via header:

```
X-User-Id: <user-uuid>
```

## Endpoints

### Health Check

Check API health status.

```http
GET /health
```

**Response:**

```json
{
  "status": "ok",
  "timestamp": 1700000000000,
  "version": "1.0.0"
}
```

---

### AI Chat

Send a message to the AI fitness coach. The endpoint automatically:
- Retrieves relevant user memories for context
- Processes conversation for memory extraction (async)
- Stores conversation in database

```http
POST /ai/chat
```

**Headers:**

| Header | Required | Description |
|--------|----------|-------------|
| Authorization | Yes | Bearer JWT token |
| X-User-Id | Yes | User UUID |

**Request Body:**

```typescript
{
  userId: string;       // User ID (must match X-User-Id)
  message: string;      // User message (1-2000 chars)
  context?: string[];   // Optional additional context
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "AI response text",
    "tokensUsed": 450,
    "timestamp": "2025-04-20T12:00:00.000Z"
  }
}
```

**Example:**

```bash
curl -X POST https://api.aivo.yourdomain.com/ai/chat \
  -H "Authorization: Bearer eyJhbG..." \
  -H "X-User-Id: user-123" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "message": "I hurt my lower back doing deadlifts yesterday. What should I do?",
    "context": ["Goal: lose 20 lbs", "Experience: beginner"]
  }'
```

**Features:**
- Critical health information (injury) is automatically stored in memory
- Memory context is injected before AI processing
- Conversation is stored for history and future extraction

---

### Get Conversation History

Retrieve past conversations for a user.

```http
GET /ai/history/:userId
```

**Query Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| limit | No | Max number of messages (default: 50) |

**Headers:**

| Header | Required | Description |
|--------|----------|-------------|
| Authorization | Yes | Bearer JWT token |

**Response:**

```json
[
  {
    "id": "conv-123",
    "userId": "user-123",
    "message": "User message",
    "response": "AI response",
    "context": ["array", "of", "context"],
    "tokensUsed": 450,
    "model": "gpt-4o-mini",
    "createdAt": 1700000000000
  }
]
```

---

### Adaptive Routine Replanning

Automatically adjusts workout routines based on deviation and recovery data.

```http
POST /ai/replan
```

**Headers:**

| Header | Required | Description |
|--------|----------|-------------|
| Authorization | Yes | Bearer JWT token |
| X-User-Id | Yes | User UUID |

**Request Body:**

```typescript
{
  currentRoutineId: string;  // UUID of routine to adjust
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "adjustedRoutine": {
      "routineId": "new-routine-uuid",
      "name": "Upper/Lower (Adjusted 2025-04-20)",
      "weekStartDate": "2025-04-20",
      "adjustments": [
        {
          "date": "2025-04-21",
          "changeType": "swap",
          "fromExercise": "Barbell Squats",
          "toExercise": "Leg Press",
          "reason": "Lower back recovery",
          "priority": 1
        }
      ],
      "optimizationScore": 87,
      "newSchedule": [...],
      "reasoning": ["Adjusted for recovery", "Maintained frequency"]
    },
    "deviationScore": {
      "overallScore": 65,
      "trend": "declining",
      "completionRate": 0.45,
      "missedWorkouts": 3,
      "averageRPE": 8.2
    },
    "appliedAt": "2025-04-20T12:00:00.000Z",
    "nextReviewDate": "2025-04-27"
  }
}
```

**Process:**

1. Fetch current routine and exercises
2. Get workout completions for the week
3. Fetch body insights (last 30 days)
4. Calculate deviation score using WASM
5. Analyze recovery curve using WASM
6. Determine if reschedule needed
7. Generate adjusted schedule with AI
8. Create new routine and daily schedules
9. Deactivate old routine

---

### Body Metrics

Record body measurements and metrics.

```http
POST /body/metrics
```

**Request Body:**

```typescript
{
  weight?: number;         // lbs
  bodyFat?: number;        // percentage
  muscleMass?: number;     // lbs
  measurements?: {
    chest?: number;
    waist?: number;
    hips?: number;
    biceps?: number;
    thighs?: number;
  };
  photoUrl?: string;       // Optional progress photo
}
```

**Response:**

```json
{
  "id": "metric-uuid",
  "userId": "user-123",
  "weight": 180.5,
  "bodyFat": 18.2,
  "createdAt": 1700000000000
}
```

---

### Get Body Insights

AI-generated insights from body metrics and workout history.

```http
GET /body/insights?userId=:userId&days=:days
```

**Query Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| userId | Yes | User UUID |
| days | No | Lookback period (default: 30) |

**Response:**

```json
{
  "insights": [
    "Weight trending down 1 lb/week - goal on track",
    "Body fat decreasing while maintaining muscle mass",
    "Recovery score improved after adding rest day"
  ],
  "summary": "Overall progress positive",
  "generatedAt": "2025-04-20T12:00:00.000Z"
}
```

---

### Workout Routines

#### Create Routine

```http
POST /routines
```

**Request Body:**

```typescript
{
  name: string;
  description?: string;
  weekStartDate: string;  // YYYY-MM-DD
  exercises: Array<{
    dayOfWeek: number;        // 0-6 (Sun-Sat)
    exerciseName: string;
    exerciseType: string;     // strength, cardio, mobility
    targetMuscleGroups: string[]; // ["chest", "triceps"]
    sets: number;
    reps: number;
    weight?: number;
    rpe?: number;             // 1-10 RPE
    notes?: string;
  }>;
}
```

**Response:** Created routine with ID

#### Get User Routines

```http
GET /routines?userId=:userId&active=true
```

#### Update Routine

```http
PUT /routines/:id
```

---

### Workout Completions

Log a completed workout.

```http
POST /workouts/complete
```

**Request Body:**

```typescript
{
  routineId: string;
  date: string;           // YYYY-MM-DD
  completedExercises: Array<{
    exerciseName: string;
    setsCompleted: number;
    repsCompleted: number[];
    weightUsed?: number;
    rpe?: number;
    notes?: string;
  }>;
  skippedExercises?: string[];  // Exercise names skipped
  substitutions?: Array<{ original: string; substitute: string }>;
  notes?: string;
  durationMinutes?: number;
}
```

**Response:** Created workout record with completion analysis

---

### Body Insight Generation

Manually trigger body insight generation.

```http
POST /body/generate-insights
```

**Request Body:**

```typescript
{
  userId: string;
  days?: number;  // Lookback period (default: 30)
}
```

**Response:**

```json
{
  "insightId": "insight-uuid",
  "userId": "user-123",
  "summary": "...",
  "muscleProfiles": [...],
  "recommendations": [...],
  "createdAt": 1700000000000
}
```

---

### OAuth (Internal)

The API handles OAuth verification internally:

```
POST /auth/google     # Verify Google ID token
POST /auth/facebook   # Verify Facebook access token
POST /auth/verify     # Verify app JWT token
POST /auth/logout     # Invalidate session
```

These are used by the frontends during login.

---

## Error Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | Success | Request completed |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing or invalid auth |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate or state conflict |
| 422 | Validation Error | Schema validation failed |
| 429 | Rate Limited | Too many requests |
| 500 | Server Error | Internal error |
| 503 | Service Unavailable | AI service not configured |

## Rate Limiting

Currently no hard rate limits. Recommended usage:
- Chat: ~20 requests/minute per user
- Other endpoints: ~100 requests/minute

## Data Retention

- Conversations: indefinite (for memory training)
- Workouts: indefinite
- Body metrics: 10 years
- Sessions: 90 days

---

**Last Updated:** 2026-04-22  
**API Version:** 1.0.0
