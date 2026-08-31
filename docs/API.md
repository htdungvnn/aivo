# AIVO API Documentation

This document provides detailed API documentation for all AIVO microservices.

## Base URLs

| Service | Base URL | Swagger |
|---------|----------|---------|
| Auth | `http://localhost:3001` | `GET /swagger` |
| Health | `http://localhost:8787` | `GET /swagger` |
| Coach | `http://localhost:8787` | `GET /swagger` |
| Nutrition | `http://localhost:3002` | `GET /swagger` |

## Authentication

All authenticated endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

### Token Structure

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "roles": ["user"],
  "iss": "aivo",
  "aud": "aivo-services",
  "exp": 1725000000,
  "iat": 1724996400
}
```

---

## Auth Service API

### POST /api/v1/auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123!",
  "clientType": "web"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "status": "pending_verification"
  },
  "emailVerificationRequired": true
}
```

### POST /api/v1/auth/login

Authenticate user credentials.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123!",
  "clientType": "web"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "roles": ["user"]
  },
  "tokens": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": 900
  },
  "isNewUser": false
}
```

### POST /api/v1/auth/refresh

Refresh access token.

**Request Body:**
```json
{
  "refreshToken": "eyJ..."
}
```

**Response (200):**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "expiresIn": 900
}
```

### POST /api/v1/auth/verify-email

Verify email with verification code.

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "emailVerified": true
}
```

### POST /api/v1/auth/oauth/google/start

Initiate Google OAuth flow.

**Response (302):**
Redirects to Google OAuth consent page.

### POST /api/v1/auth/oauth/google/callback

Handle Google OAuth callback.

**Query Parameters:**
- `code`: Authorization code from Google
- `state`: CSRF state token

**Response (302):**
Redirects to frontend with authentication result.

---

## Health Service API

### POST /api/v1/health/readiness

Submit daily health metrics and get readiness score.

**Request Body:**
```json
{
  "date": "2026-08-31",
  "timezone": "America/New_York",
  "sleep": {
    "hours": 7.5,
    "quality": 4,
    "deepSleepMinutes": 90,
    "remMinutes": 100
  },
  "hrv": {
    "value": 65,
    "readingTime": "2026-08-31T07:00:00Z"
  },
  "stress": {
    "level": 3,
    "perceivedStress": 2
  },
  "energy": {
    "level": 4,
    "afternoonDip": 2
  }
}
```

**Response (200):**
```json
{
  "readiness": {
    "id": "rdy_abc123",
    "overall": 82,
    "sleepScore": 85,
    "hrvScore": 78,
    "stressScore": 75,
    "energyScore": 88,
    "recoveryScore": 80,
    "level": "good"
  },
  "recommendations": [
    {
      "type": "workout_intensity",
      "action": "moderate",
      "reason": "Good recovery, ready for challenging workout"
    }
  ]
}
```

### GET /api/v1/health/readiness/history

Get readiness history.

**Query Parameters:**
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)

**Response (200):**
```json
{
  "snapshots": [
    {
      "id": "rdy_abc123",
      "date": "2026-08-31",
      "overall": 82,
      "level": "good"
    }
  ],
  "stats": {
    "average": 78.5,
    "trend": "improving"
  }
}
```

### GET /api/v1/health/insights

Get AI-generated health insights.

**Response (200):**
```json
{
  "insights": [
    {
      "type": "sleep_pattern",
      "title": "Sleep Duration Alert",
      "message": "Your average sleep has been below 7 hours this week.",
      "severity": "info",
      "action": "Consider going to bed 30 minutes earlier."
    }
  ]
}
```

---

## Coach Service API

### GET /api/v1/coach/exercises

Get available exercises.

**Query Parameters:**
- `goal`: Filter by goal (fat_loss, muscle_gain, general_fitness, mobility)
- `difficulty`: Filter by difficulty (beginner, intermediate, advanced)

**Response (200):**
```json
{
  "exercises": [
    {
      "code": "squat",
      "name": "Bodyweight Squat",
      "primaryMuscles": ["quadriceps", "glutes"],
      "difficulty": "beginner",
      "goals": ["fat_loss", "muscle_gain", "general_fitness"]
    }
  ]
}
```

### POST /api/v1/coach/sessions/start

Start a workout session.

**Request Body:**
```json
{
  "planId": "pln_abc123",
  "exerciseCodes": ["squat", "push_up", "plank"],
  "clientType": "mobile"
}
```

**Response (200):**
```json
{
  "session": {
    "id": "ses_abc123",
    "status": "active",
    "startedAt": "2026-08-31T18:00:00Z",
    "exerciseCount": 3
  }
}
```

### POST /api/v1/coach/sessions/:id/sets

Log a set for an exercise.

**Request Body:**
```json
{
  "exerciseCode": "squat",
  "reps": 12,
  "weight": 135,
  "weightUnit": "lbs",
  "perceivedExertion": 7,
  "notes": "Felt strong today"
}
```

**Response (200):**
```json
{
  "setId": "set_abc123",
  "cumulativeVolume": 3240,
  "repCount": 12
}
```

### POST /api/v1/coach/sessions/:id/complete

Complete a workout session.

**Response (200):**
```json
{
  "session": {
    "id": "ses_abc123",
    "status": "completed",
    "duration": 2700,
    "totalVolume": 12500,
    "exerciseCount": 3,
    "setCount": 15
  },
  "summary": {
    "muscleGroups": ["quadriceps", "chest", "core"],
    "caloriesBurned": 320
  }
}
```

### GET /api/v1/coach/plans

Get user's workout plans.

**Response (200):**
```json
{
  "plans": [
    {
      "id": "pln_abc123",
      "name": "Full Body Strength",
      "goal": "muscle_gain",
      "status": "active",
      "workoutCount": 4,
      "createdAt": "2026-08-01T00:00:00Z"
    }
  ]
}
```

---

## Nutrition Service API

### GET /api/v1/nutrition/foods/search

Search food database.

**Query Parameters:**
- `q`: Search query
- `limit`: Results limit (default: 20)

**Response (200):**
```json
{
  "foods": [
    {
      "id": "food_abc123",
      "name": "Chicken Breast, Grilled",
      "brand": "Generic",
      "servingSize": 100,
      "servingUnit": "g",
      "calories": 165,
      "protein": 31,
      "carbs": 0,
      "fat": 3.6
    }
  ]
}
```

### POST /api/v1/nutrition/meals

Create a meal entry.

**Request Body:**
```json
{
  "date": "2026-08-31",
  "timezone": "America/New_York",
  "mealType": "lunch",
  "name": "Lunch - Grilled Chicken Salad",
  "items": [
    {
      "name": "Chicken Breast, Grilled",
      "quantity": 150,
      "unit": "g"
    },
    {
      "name": "Mixed Greens",
      "quantity": 100,
      "unit": "g"
    }
  ]
}
```

**Response (201):**
```json
{
  "meal": {
    "id": "meal_abc123",
    "date": "2026-08-31",
    "mealType": "lunch",
    "items": [...],
    "totalNutrition": {
      "calories": 320,
      "protein": 48,
      "carbs": 8,
      "fat": 12
    }
  }
}
```

### GET /api/v1/nutrition/meals

Get meals for a date range.

**Query Parameters:**
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)

**Response (200):**
```json
{
  "meals": [
    {
      "id": "meal_abc123",
      "date": "2026-08-31",
      "mealType": "lunch",
      "totalNutrition": {
        "calories": 320,
        "protein": 48,
        "carbs": 8,
        "fat": 12
      }
    }
  ],
  "dailyTotals": {
    "2026-08-31": {
      "calories": 1850,
      "protein": 120,
      "carbs": 180,
      "fat": 65
    }
  }
}
```

### POST /api/v1/nutrition/analysis/upload

Upload food image for AI analysis.

**Request Body:**
- Content-Type: multipart/form-data
- Field: `image` (image file)

**Response (202):**
```json
{
  "analysisId": "ana_abc123",
  "status": "processing",
  "estimatedCompletion": "2026-08-31T18:05:00Z"
}
```

### GET /api/v1/nutrition/analysis/:id

Get analysis result.

**Response (200):**
```json
{
  "analysisId": "ana_abc123",
  "status": "completed",
  "foods": [
    {
      "name": "Grilled Chicken Salad",
      "confidence": 0.92,
      "nutrition": {
        "calories": 350,
        "protein": 35,
        "carbs": 15,
        "fat": 18
      }
    }
  ]
}
```

### GET /api/v1/nutrition/plans

Get user's meal plans.

**Response (200):**
```json
{
  "plans": [
    {
      "id": "mpl_abc123",
      "name": "High Protein Cutting",
      "dailyCalories": 2000,
      "macros": {
        "protein": 180,
        "carbs": 150,
        "fat": 55
      },
      "status": "active"
    }
  ]
}
```

---

## Error Responses

All API errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `TOKEN_EXPIRED` | 401 | JWT has expired |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limits

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Authenticated | 100 requests | 1 minute |
| Unauthenticated | 20 requests | 1 minute |
| File Upload | 10 requests | 1 minute |
| AI Analysis | 50 requests | 1 day |
