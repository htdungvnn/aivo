# AIVO API Reference Documentation

## Base URL

**Development:**
```
http://localhost:4000
```

**Production:**
```
https://api.aivo.app
```

---

## Authentication

All protected endpoints require a valid JWT access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Token Flow

```
1. POST /api/v1/auth/register → { accessToken, refreshToken, user }
2. Store tokens securely (cookies/web: httpOnly, mobile: SecureStore)
3. Use accessToken for API requests
4. POST /api/v1/auth/refresh → { accessToken } (when expired)
```

### Token Lifetimes
- **Access Token:** 15 minutes
- **Refresh Token:** 7 days

---

## Common Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes* | Bearer token for auth |
| `Content-Type` | Yes | `application/json` |
| `X-Request-ID` | No | UUID for request tracing |
| `Accept-Language` | No | `en` or `vi` |

*Not required for public endpoints (health checks, register, login)

---

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": { ... }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## API Endpoints

### Auth Service

#### Public Endpoints

##### Register
```
POST /api/v1/auth/register
```
**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "displayName": "John Doe"
}
```
**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "...", "displayName": "..." },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

##### Login
```
POST /api/v1/auth/login
```
**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

##### Verify Email
```
POST /api/v1/auth/verification/verify
```
**Body:**
```json
{
  "userId": "uuid",
  "code": "123456"
}
```

##### OAuth Start
```
POST /api/v1/auth/oauth/start
```
**Body:**
```json
{
  "provider": "google",
  "redirectUri": "aivo://callback"
}
```

##### Refresh Token
```
POST /api/v1/auth/refresh
```
**Body:**
```json
{
  "refreshToken": "eyJ..."
}
```

#### Protected Endpoints

##### Get Current User
```
GET /api/v1/auth/me
Authorization: Bearer <token>
```

##### Logout
```
POST /api/v1/auth/logout
Authorization: Bearer <token>
```

##### Get Sessions
```
GET /api/v1/auth/sessions
Authorization: Bearer <token>
```

##### Delete Session
```
DELETE /api/v1/auth/sessions/:id
Authorization: Bearer <token>
```

---

### Health Service

#### Readiness

##### Get Today's Readiness
```
GET /api/v1/health/readiness/today
Authorization: Bearer <token>
```
**Response:**
```json
{
  "success": true,
  "data": {
    "score": 78,
    "level": "good",
    "factors": [
      { "name": "sleep", "value": 85, "contribution": 15 },
      { "name": "activity", "value": 72, "contribution": 12 }
    ],
    "insights": ["Consider earlier bedtime", "Great activity today!"]
  }
}
```

##### Get Readiness History
```
GET /api/v1/health/readiness/history?range=7d
Authorization: Bearer <token>
```

##### Recalculate Readiness
```
POST /api/v1/health/readiness/recalculate
Authorization: Bearer <token>
```

#### Check-in

##### Submit Check-in
```
POST /api/v1/health/checkin
Authorization: Bearer <token>
```
**Body:**
```json
{
  "energy": 7,
  "stress": 4,
  "sleepQuality": 8,
  "muscleSoreness": 3,
  "mood": "good"
}
```

#### Actions

##### Get Today's Actions
```
GET /api/v1/health/actions
Authorization: Bearer <token>
```
**Response:**
```json
{
  "success": true,
  "data": {
    "actions": [
      {
        "id": "uuid",
        "type": "movement",
        "title": "Take a 15-minute walk",
        "priority": 1,
        "status": "pending"
      }
    ]
  }
}
```

##### Update Action Status
```
PATCH /api/v1/health/actions/:id
Authorization: Bearer <token>
```
**Body:**
```json
{
  "status": "completed"
}
```

#### Charts

##### Get Chart Data
```
GET /api/v1/health/charts/:metric?range=7d
Authorization: Bearer <token>
```
**Metrics:** `readiness`, `sleep`, `activity`, `nutrition`, `hydration`, `hrv`

##### Batch Get Charts
```
POST /api/v1/health/charts/batch
Authorization: Bearer <token>
```
**Body:**
```json
{
  "metrics": ["readiness", "sleep", "activity"],
  "range": "7d"
}
```

#### Intelligence

##### Get Today's Intelligence
```
GET /api/v1/health/intelligence
Authorization: Bearer <token>
```

##### Get Weekly Summary
```
GET /api/v1/health/intelligence/weekly
Authorization: Bearer <token>
```

#### Reports

##### Create Schedule
```
POST /api/v1/health/reports/schedules
Authorization: Bearer <token>
```
**Body:**
```json
{
  "type": "weekly",
  "dayOfWeek": 1,
  "time": "09:00",
  "emailEnabled": true
}
```

##### Generate Report
```
POST /api/v1/health/reports/reports/generate
Authorization: Bearer <token>
```
**Body:**
```json
{
  "type": "weekly",
  "startDate": "2026-08-25",
  "endDate": "2026-08-31"
}
```

##### List Reports
```
GET /api/v1/health/reports/reports
Authorization: Bearer <token>
```

##### Download Report
```
GET /api/v1/health/reports/reports/:id/download
Authorization: Bearer <token>
```

---

### Coach Service

#### Exercises

##### List Exercises
```
GET /api/v1/coach/exercises/
Authorization: Bearer <token>
```

##### Get Exercise
```
GET /api/v1/coach/exercises/:code
Authorization: Bearer <token>
```
**Codes:** `squat`, `push_up`, `deadlift`, `plank`, `lunge`

##### Get Exercise Rules
```
GET /api/v1/coach/exercises/:code/rules
Authorization: Bearer <token>
```

#### Plans

##### Get Active Plan
```
GET /api/v1/coach/plans/active
Authorization: Bearer <token>
```

##### List Plans
```
GET /api/v1/coach/plans/
Authorization: Bearer <token>
```

##### Create Plan
```
POST /api/v1/coach/plans/
Authorization: Bearer <token>
```
**Body:**
```json
{
  "name": "Strength Builder",
  "goal": "hypertrophy",
  "workouts": [
    {
      "day": "monday",
      "exercises": [
        { "code": "squat", "sets": 4, "reps": "8-10" }
      ]
    }
  ]
}
```

##### Activate Plan
```
POST /api/v1/coach/plans/:planId/activate
Authorization: Bearer <token>
```

#### Sessions

##### Start Session
```
POST /api/v1/coach/sessions/start
Authorization: Bearer <token>
```
**Body:**
```json
{
  "planId": "uuid",
  "workoutIndex": 0
}
```

##### Get Active Session
```
GET /api/v1/coach/sessions/active
Authorization: Bearer <token>
```

##### Update Checkpoint
```
PATCH /api/v1/coach/sessions/:sessionId/checkpoint
Authorization: Bearer <token>
```
**Body:**
```json
{
  "exerciseIndex": 2,
  "setIndex": 3
}
```

##### Submit Set
```
POST /api/v1/coach/sessions/:sessionId/sets
Authorization: Bearer <token>
```
**Body:**
```json
{
  "reps": 10,
  "weight": 135,
  "quality": 8,
  "notes": "Felt strong"
}
```

##### Complete Session
```
POST /api/v1/coach/sessions/:sessionId/complete
Authorization: Bearer <token>
```
**Body:**
```json
{
  "rating": 9,
  "notes": "Great workout",
  "skippedExercises": []
}
```

##### Submit Correction
```
POST /api/v1/coach/sessions/:sessionId/corrections
Authorization: Bearer <token>
```
**Body:**
```json
{
  "correctionCode": "knee_valgus",
  "severity": "minor",
  "feedback": "Keep knees tracking over toes"
}
```

#### Progress

##### Get Progress Summary
```
GET /api/v1/coach/progress/summary
Authorization: Bearer <token>
```

##### Get Exercise Progress
```
GET /api/v1/coach/progress/exercises/:code
Authorization: Bearer <token>
```

##### Get Workout History
```
GET /api/v1/coach/progress/history?limit=10
Authorization: Bearer <token>
```

##### Get Trends
```
GET /api/v1/coach/progress/trends
Authorization: Bearer <token>
```

##### Update Goals
```
PUT /api/v1/coach/progress/goals
Authorization: Bearer <token>
```
**Body:**
```json
{
  "primaryGoal": "strength",
  "targetWeight": 180,
  "workoutsPerWeek": 4
}
```

#### AI Planning

##### Request AI Plan
```
POST /api/v1/coach/planning/request
Authorization: Bearer <token>
```
**Body:**
```json
{
  "goal": "build_muscle",
  "experience": "intermediate",
  "equipment": ["barbell", "dumbbell", "bodyweight"],
  "limitations": ["lower_back"],
  "workoutsPerWeek": 4
}
```

##### Get Planning Jobs
```
GET /api/v1/coach/planning/jobs
Authorization: Bearer <token>
```

##### Get Job Status
```
GET /api/v1/coach/planning/jobs/:jobId
Authorization: Bearer <token>
```

---

### Nutrition Service

#### Meals

##### Create Meal
```
POST /api/v1/nutrition/meals/
Authorization: Bearer <token>
```
**Body:**
```json
{
  "date": "2026-09-01",
  "mealType": "lunch",
  "items": [
    {
      "foodId": "uuid",
      "name": "Grilled Chicken Breast",
      "quantity": 150,
      "unit": "g"
    }
  ]
}
```

##### List Meals
```
GET /api/v1/nutrition/meals/?startDate=2026-09-01&endDate=2026-09-01
Authorization: Bearer <token>
```

##### Get Today's Meals
```
GET /api/v1/nutrition/meals/today
Authorization: Bearer <token>
```

##### Update Meal
```
PUT /api/v1/nutrition/meals/:id
Authorization: Bearer <token>
```

##### Delete Meal
```
DELETE /api/v1/nutrition/meals/:id
Authorization: Bearer <token>
```

#### Foods

##### Search Foods
```
GET /api/v1/nutrition/foods/search?q=chicken&limit=20
Authorization: Bearer <token>
```

##### Get Food Nutrition
```
GET /api/v1/nutrition/foods/:id/nutrition?quantity=100&unit=g
Authorization: Bearer <token>
```

##### Save Food Correction
```
POST /api/v1/nutrition/foods/corrections
Authorization: Bearer <token>
```
**Body:**
```json
{
  "normalizedName": "grilled_chicken_breast",
  "calories": 165,
  "protein": 31,
  "carbs": 0,
  "fat": 3.6
}
```

#### Targets

##### Get Targets
```
GET /api/v1/nutrition/targets/
Authorization: Bearer <token>
```
**Response:**
```json
{
  "success": true,
  "data": {
    "calories": 2000,
    "protein": 150,
    "carbs": 200,
    "fat": 67,
    "fiber": 30,
    "sodium": 2300,
    "water": 2500
  }
}
```

##### Update Targets
```
PUT /api/v1/nutrition/targets/
Authorization: Bearer <token>
```
**Body:**
```json
{
  "calories": 2200,
  "protein": 180,
  "carbs": 180,
  "fat": 73,
  "macroRatios": { "protein": 0.30, "carbs": 0.40, "fat": 0.30 }
}
```

#### AI Analysis

##### Create Analysis
```
POST /api/v1/nutrition/analysis/
Authorization: Bearer <token>
```
**Body:**
```json
{
  "mealType": "lunch"
}
```

##### Upload Image
```
POST /api/v1/nutrition/analysis/:id/image
Authorization: Bearer <token>
Content-Type: multipart/form-data

image: <file>
```

##### Confirm and Create Meal
```
POST /api/v1/nutrition/analysis/:id/confirm
Authorization: Bearer <token>
```
**Body:**
```json
{
  "mealType": "lunch",
  "date": "2026-09-01"
}
```

#### Upload

##### Request Upload URL
```
POST /api/v1/nutrition/upload/request
Authorization: Bearer <token>
```
**Body:**
```json
{
  "contentType": "image/jpeg",
  "purpose": "meal_photo"
}
```

##### Upload Directly
```
POST /api/v1/nutrition/upload/
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary>
```

##### Delete Upload
```
DELETE /api/v1/nutrition/upload/:r2Key
Authorization: Bearer <token>
```

---

### Mail Service

The Mail service does not expose public REST endpoints. It consumes messages from Cloudflare Queues.

**Queue:** `emailQueue`
**Message Types:**
- `auth.email_verification_code`
- `health.weekly_report_ready`
- `health.monthly_report_ready`
- `health.custom_report_ready`

---

## Rate Limits

| Endpoint | Limit | Window | Headers |
|----------|-------|--------|---------|
| `/register` | 5 | per IP / hour | `X-RateLimit-Limit`, `X-RateLimit-Remaining` |
| `/login` | 10 | per IP / hour | Same |
| `/api/*` (Gateway) | 100 | per IP / minute | Same |
| `/analysis/*` | 20 | per user / day | Same |

---

## Webhooks

Currently not implemented. Future endpoints for:
- Payment events
- OAuth provider events
- Integration sync events

---

## Pagination

List endpoints support pagination:

```
GET /api/v1/health/readiness/history?limit=10&cursor=abc123
```

**Response includes:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "hasMore": true,
    "nextCursor": "xyz789"
  }
}
```

---

## Filtering & Sorting

### Date Ranges
```
?startDate=2026-09-01&endDate=2026-09-30
```

### Preset Ranges
```
?range=1d    # Today
?range=7d    # Last 7 days
?range=30d   # Last 30 days
?range=90d   # Last 90 days
?range=1y   # Last year
```

---

## SDK Examples

### JavaScript/TypeScript
```typescript
import { createClient } from '@repo/api-client';

const client = createClient({
  baseUrl: 'http://localhost:4000',
  getToken: () => localStorage.getItem('accessToken'),
  onTokenRefresh: (token) => localStorage.setItem('accessToken', token),
});

// Usage
const readiness = await client.health.readiness.getToday();
const meals = await client.nutrition.meals.list({ date: '2026-09-01' });
```

### React Hook (Web)
```typescript
import { useHealth } from '@/lib/health';

function Dashboard() {
  const { data: readiness } = useHealth();
  return <div>Score: {readiness?.score}</div>;
}
```

### React Native Hook (Mobile)
```typescript
import { useReadiness } from '@/hooks/useHealth';

function TodayScreen() {
  const { readiness, isLoading } = useReadiness();
  return <Text>Score: {readiness?.score}</Text>;
}
```

---

*Last Updated: September 2026*
