# AIVO API Reference

Complete reference for all AIVO API endpoints.

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

Additionally, user identification is derived from the JWT token; no separate `X-User-Id` header is needed as the token contains the user ID.

## Endpoints

### Health Check

Check API health status and service dependencies.

```http
GET /health
```

**Response:**

```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "timestamp": "2025-04-27T12:00:00.000Z",
  "version": "1.0.0",
  "uptime": 12345.678,
  "services": [
    {
      "name": "api",
      "status": "healthy",
      "latency": 2
    },
    {
      "name": "database",
      "status": "healthy",
      "latency": 12,
      "details": { "tables": ["users", "workouts", ...] }
    },
    {
      "name": "caches",
      "status": "healthy",
      "details": {
        "bodyInsights": { "connected": true, "latency": 1 },
        "biometric": { "connected": true, "latency": 1 },
        "leaderboard": { "connected": true, "latency": 1 },
        "rateLimit": { "connected": true, "latency": 1 }
      }
    },
    {
      "name": "storage",
      "status": "healthy",
      "latency": 45,
      "details": { "bucket": "aivo-images", "objectCount": 1234 }
    },
    {
      "name": "ai-services",
      "status": "healthy",
      "details": { "openaiConfigured": true, "geminiConfigured": false }
    }
  ],
  "database": { "connected": true, "tables": [...] },
  "caches": { ... },
  "storage": { "connected": true, "bucket": "aivo-images" },
  "compute": { "wasmLoaded": true, "optimizerLoaded": false },
  "ai": { "openaiConfigured": true, "geminiConfigured": false }
}
```

---

### Authentication

All auth endpoints are public (no authentication required).

#### Google OAuth

```http
POST /auth/google
Content-Type: application/json

{
  "token": "google-id-token"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "token": "jwt-token",
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "name": "User Name",
      "picture": "https://..."
    }
  }
}
```

#### Facebook OAuth

```http
POST /auth/facebook
Content-Type: application/json

{
  "token": "facebook-access-token"
}
```

**Response:** Same as Google OAuth.

#### Verify Token

```http
POST /auth/verify
Authorization: Bearer <jwt-token>
```

**Response:**

```json
{
  "success": true,
  "valid": true,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

#### Logout

```http
POST /auth/logout
Authorization: Bearer <jwt-token>
```

Invalidates the session and clears the auth cookie.

**Response:**

```json
{
  "success": true
}
```

---

### AI Coach

All AI endpoints require authentication.

#### Chat with AI Coach

```http
POST /ai/chat
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "userId": "user-uuid",
  "message": "I hurt my lower back doing deadlifts. What should I do?",
  "context": ["Goal: lose 20 lbs", "Experience: beginner"]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "I'm sorry to hear about your back. Here's what I recommend...",
    "tokensUsed": 450,
    "model": "gpt-4o-mini",
    "provider": "openai",
    "cost": 0.001125,
    "selection": {
      "selectedModel": "gpt-4o-mini",
      "estimatedCost": 0.001125,
      "reasoning": ["Simple query, high quality, cost-effective"]
    },
    "timestamp": "2025-04-27T12:00:00.000Z"
  }
}
```

#### Voice Parse

Parse transcribed voice text into structured fitness/nutrition data.

```http
POST /ai/voice-parse
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "text": "I ate two eggs and toast for breakfast",
  "context_hint": "morning"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "hasFood": true,
    "hasWorkout": false,
    "hasBodyMetric": false,
    "foodEntries": [
      {
        "name": "eggs",
        "confidence": 0.95,
        "estimatedPortionG": 200,
        "portionUnit": "g",
        "calories": 286,
        "protein_g": 19,
        "carbs_g": 2,
        "fat_g": 19
      },
      {
        "name": "toast",
        "confidence": 0.88,
        "estimatedPortionG": 60,
        "portionUnit": "g",
        "calories": 160,
        "protein_g": 6,
        "carbs_g": 28,
        "fat_g": 2
      }
    ],
    "overallConfidence": 0.91,
    "needsClarification": false,
    "clarificationQuestions": []
  }
}
```

#### Voice Log with Transcription

Accept audio (base64), transcribe with Whisper, and parse.

```http
POST /ai/voice-log
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "audio": "base64-encoded-audio-bytes",
  "context_hint": "post-workout"
}
```

Or if already transcribed:

```json
{
  "text": "Just finished my workout, did 3 sets of 10 squats at 185 lbs",
  "context_hint": "post-workout"
}
```

**Response:** Same structure as voice-parse, plus `transcribed_text` field.

#### Get Conversation History

```http
GET /ai/history/:userId?limit=50
Authorization: Bearer <jwt-token>
```

**Response:**

```json
[
  {
    "id": "conv-uuid",
    "userId": "user-uuid",
    "message": "User message",
    "response": "AI response",
    "context": ["context items"],
    "tokensUsed": 450,
    "model": "gpt-4o-mini",
    "createdAt": 1700000000000
  }
]
```

#### List Available AI Models

```http
GET /ai/models
Authorization: Bearer <jwt-token>
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "gpt-4o-mini",
      "name": "GPT-4o Mini",
      "provider": "openai",
      "contextWindow": 128000,
      "maxOutputTokens": 16384,
      "pricing": { "inputPer1M": 0.15, "outputPer1M": 0.60 },
      "capabilities": ["chat", "vision", "json"],
      "qualityScore": 8.5
    },
    {
      "id": "gemini-1.5-flash",
      "name": "Gemini 1.5 Flash",
      "provider": "google",
      "contextWindow": 1000000,
      "maxOutputTokens": 8192,
      "pricing": { "inputPer1M": 0.075, "outputPer1M": 0.30 },
      "capabilities": ["chat", "vision", "json"],
      "qualityScore": 8.0
    }
  ],
  "config": {
    "costOptimization": "balanced",
    "maxCostPerRequest": 0.50,
    "qualityThreshold": 7
  }
}
```

#### Estimate AI Cost

```http
POST /ai/estimate-cost
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "prompt": "Explain the concept of muscle hypertrophy",
  "estimatedOutputTokens": 500
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "recommendation": {
      "model": "gemini-1.5-flash",
      "name": "Gemini 1.5 Flash",
      "provider": "google",
      "estimatedCost": 0.00005625,
      "reasoning": ["Low complexity task", "Gemini Flash is 60% cheaper", "Quality score meets threshold"]
    },
    "allEstimates": [
      { "model": "gpt-4o-mini", "name": "GPT-4o Mini", "provider": "openai", "estimatedCost": 0.000105, "qualityScore": 8.5 },
      { "model": "gemini-1.5-flash", "name": "Gemini 1.5 Flash", "provider": "google", "estimatedCost": 0.00005625, "qualityScore": 8.0 }
    ],
    "tokenEstimate": { "input": 12, "output": 500, "total": 512 }
  }
}
```

#### Adaptive Routine Replanning

```http
POST /ai/replan
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "currentRoutineId": "routine-uuid"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "adjustedRoutine": {
      "routineId": "new-routine-uuid",
      "name": "Upper/Lower (Adjusted 2025-04-27)",
      "weekStartDate": "2025-04-27",
      "adjustments": [
        {
          "date": "2025-04-28",
          "changeType": "swap",
          "fromExercise": "Barbell Squats",
          "toExercise": "Leg Press",
          "reason": "Lower back recovery score 65/100",
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
    "appliedAt": "2025-04-27T12:00:00.000Z",
    "nextReviewDate": "2025-05-04"
  }
}
```

---

### Body & Health

#### Upload Body Image

```http
POST /body/upload
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data

(image file)
```

**Response:**

```json
{
  "success": true,
  "data": {
    "imageUrl": "https://bucket.r2.dev/body-photos/user-uuid/abc123.jpg",
    "key": "body-photos/user-uuid/abc123.jpg",
    "userId": "user-uuid",
    "uploadedAt": "2025-04-27T12:00:00.000Z"
  }
}
```

#### Analyze Body Image (AI Vision)

```http
POST /body/vision/analyze
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "imageUrl": "https://bucket.r2.dev/body-photos/...",
  "analyzeMuscles": true,
  "analyzePosture": true
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "analysis-uuid",
    "userId": "user-uuid",
    "imageUrl": "...",
    "processedUrl": "https://...",
    "analysis": {
      "bodyComposition": {
        "bodyFatEstimate": 18.5,
        "muscleMassEstimate": 70.2
      },
      "posture": { ... }
    },
    "confidence": 0.92,
    "createdAt": 1700000000000
  }
}
```

#### Get Body Metrics History

```http
GET /body/metrics?startDate=1700000000&endDate=1702592000&limit=100
Authorization: Bearer <jwt-token>
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "metric-uuid",
      "userId": "user-uuid",
      "weight": 180.5,
      "bodyFatPercentage": 18.2,
      "muscleMass": 70.0,
      "timestamp": 1700000000000,
      "source": "manual",
      "notes": null
    }
  ]
}
```

#### Create Body Metric Entry

```http
POST /body/metrics
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "weight": 180.5,
  "bodyFatPercentage": 18.2,
  "muscleMass": 70.0,
  "waistCircumference": 32.5,
  "notes": "Morning measurement"
}
```

**Response:** Created metric object with `201` status.

#### Get Health Score

```http
GET /body/health-score
Authorization: Bearer <jwt-token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "score": 72.5,
    "category": "good",
    "factors": {
      "bmi": 1,
      "bodyFat": 0.9,
      "muscleMass": 0.8,
      "fitnessLevel": 0.7
    },
    "recommendations": [
      "Focus on maintaining healthy weight",
      "Incorporate resistance training"
    ]
  }
}
```

#### Get Body Heatmaps

```http
GET /body/heatmaps?limit=10
Authorization: Bearer <jwt-token>
```

#### Generate Heatmap

```http
POST /body/heatmaps/generate
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "analysisId": "analysis-uuid",
  "vectorData": [
    { "x": 50, "y": 30, "muscle": "quadriceps", "intensity": 0.8 }
  ]
}
```

---

### Nutrition

#### Upload Food Image

```http
POST /nutrition/upload
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data

(image file)
```

#### Analyze Food Image (AI Vision)

```http
POST /nutrition/vision/analyze
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "imageUrl": "https://..."
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "analysis-uuid",
    "userId": "user-uuid",
    "imageUrl": "...",
    "detectedItems": [
      {
        "name": "chicken breast",
        "confidence": 0.92,
        "estimatedPortionG": 150,
        "portionUnit": "g",
        "calories": 248,
        "protein_g": 46,
        "carbs_g": 0,
        "fat_g": 5.4,
        "matchedFoodItemId": "food-item-uuid"
      }
    ],
    "totalCalories": 248,
    "totalProtein": 46,
    "totalCarbs": 0,
    "totalFat": 5.4,
    "analysisConfidence": 0.92,
    "analysisNotes": "High protein meal",
    "createdAt": 1700000000000
  }
}
```

#### Create Food Log from Analysis

```http
POST /nutrition/logs/from-analysis
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "detectedItems": [...],
  "mealType": "lunch",
  "timestamp": 1700000000000
}
```

#### Create Manual Food Log

```http
POST /nutrition/logs
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "mealType": "breakfast",
  "foodItemId": "food-item-uuid",
  "estimatedPortionG": 100,
  "calories": 350,
  "protein_g": 20,
  "carbs_g": 40,
  "fat_g": 12
}
```

#### Get Food Logs

```http
GET /nutrition/logs?startDate=...&endDate=...&mealType=lunch&limit=100
Authorization: Bearer <jwt-token>
```

#### Get Food Log by ID

```http
GET /nutrition/logs/:id
Authorization: Bearer <jwt-token>
```

#### Update Food Log

```http
PATCH /nutrition/logs/:id
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "calories": 300,
  "notes": "Corrected portion"
}
```

#### Delete Food Log

```http
DELETE /nutrition/logs/:id
Authorization: Bearer <jwt-token>
```

#### Get Daily Nutrition Summary

```http
GET /nutrition/summary?date=2025-04-27
Authorization: Bearer <jwt-token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "date": "2025-04-27",
    "totalCalories": 1850,
    "targetCalories": 2200,
    "totalProtein": 120,
    "targetProtein": 150,
    "totalCarbs": 200,
    "targetCarbs": 250,
    "totalFat": 65,
    "targetFat": 73,
    "totalFiber": 25,
    "totalSugar": 30,
    "foodLogCount": 4,
    "meals": {
      "breakfast": { "calories": 450, "protein": 30, "carbs": 50, "fat": 15, "itemCount": 2 },
      "lunch": { "calories": 650, "protein": 45, "carbs": 80, "fat": 20, "itemCount": 3 },
      "dinner": { "calories": 750, "protein": 45, "carbs": 70, "fat": 30, "itemCount": 3 }
    }
  }
}
```

#### Search Food Database

```http
GET /nutrition/database/search?q=chicken&limit=20
Authorization: Bearer <jwt-token>
```

#### Add Food Item to Database

```http
POST /nutrition/database/items
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "Grilled Chicken Breast",
  "brand": "Generic",
  "servingSize": 100,
  "servingUnit": "g",
  "calories": 165,
  "protein_g": 31,
  "carbs_g": 0,
  "fat_g": 3.6
}
```

#### AI Nutrition Consultation

```http
POST /nutrition/consult
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "userId": "user-uuid",
  "query": "I'm vegetarian and need high protein meals",
  "context": {
    "dietType": "vegetarian",
    "macroPreferences": { "proteinGrams": 150, "calorieTarget": 2200 },
    "availableIngredients": [
      { "name": "lentils", "quantity": 500, "unit": "g", "isPerishable": true }
    ]
  },
  "preferredAgents": ["chef", "medical"],
  "sessionId": "optional-session-id"
}
```

**Response:**

```json
{
  "success": true,
  "sessionId": "consult-session-uuid",
  "userQuery": "I'm vegetarian...",
  "agentsConsulted": ["chef", "medical"],
  "responses": [
    {
      "agent": "chef",
      "advice": "Try lentil dal, tofu stir-fry...",
      "confidence": 0.9
    },
    {
      "agent": "medical",
      "advice": "Ensure B12 supplementation...",
      "confidence": 0.95
    }
  ],
  "synthesizedAdvice": "Based on your vegetarian diet and protein needs...",
  "primaryAgent": "chef",
  "warnings": ["Consider B12 supplement"],
  "processingTimeMs": 2340
}
```

#### Get Consultation History

```http
GET /nutrition/consult/history?limit=20
Authorization: Bearer <jwt-token>
```

#### Get Consultation by ID

```http
GET /nutrition/consult/:id
Authorization: Bearer <jwt-token>
```

#### Rate Consultation

```http
PATCH /nutrition/consult/:id/rating
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "rating": 5,
  "feedback": "Very helpful advice!"
}
```

---

### Workouts

#### List Workouts

```http
GET /workouts
Authorization: Bearer <jwt-token>
```

#### Create Workout

```http
POST /workouts
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "type": "strength",
  "duration": 60,
  "caloriesBurned": 450,
  "metrics": { "heartRateAvg": 125, "steps": 0 }
}
```

---

### Users

#### Get Current User Profile

```http
GET /users/me
Authorization: Bearer <jwt-token>
```

#### Get User by ID

```http
GET /users/:id
Authorization: Bearer <jwt-token>
```

(Users can only access their own data)

#### Update Current User Profile

```http
PATCH /users/me
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "Updated Name",
  "age": 29,
  "height": 180,
  "weight": 78.5,
  "fitnessLevel": "intermediate"
}
```

---

### Routines

#### Create Routine

```http
POST /routines
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "Upper/Lower Split",
  "description": "4-day upper/lower split",
  "weekStartDate": "2025-04-28",
  "exercises": [
    {
      "dayOfWeek": 1,
      "exerciseName": "Barbell Squats",
      "exerciseType": "strength",
      "targetMuscleGroups": ["quadriceps", "glutes", "hamstrings"],
      "sets": 4,
      "reps": 8,
      "weight": 225,
      "rpe": 8,
      "notes": "Focus on depth"
    }
  ]
}
```

#### Get User Routines

```http
GET /routines?userId=user-uuid&active=true
Authorization: Bearer <jwt-token>
```

#### Update Routine

```http
PUT /routines/:id
Authorization: Bearer <jwt-token>
Content-Type: application/json
{ ... }
```

---

### Workout Completions

Log a completed workout.

```http
POST /workouts/complete
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "routineId": "routine-uuid",
  "date": "2025-04-28",
  "completedExercises": [
    {
      "exerciseName": "Barbell Squats",
      "setsCompleted": 4,
      "repsCompleted": [8, 8, 8, 7],
      "weightUsed": 225,
      "rpe": 8,
      "notes": "Last set was challenging"
    }
  ],
  "skippedExercises": ["Leg Extensions"],
  "substitutions": [
    { "original": "Leg Extensions", "substitute": "Lunges" }
  ],
  "notes": "Good session, felt strong",
  "durationMinutes": 65
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "workoutId": "workout-uuid",
    "completionRate": 0.85,
    "totalVolume": 8100,
    "averageRPE": 7.5,
    "deviationScore": 12
  }
}
```

---

### Live Workouts

#### Start Live Workout Session

```http
POST /live-workout/sessions/start
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "routineId": "routine-uuid"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "sessionId": "session-uuid",
    "startedAt": 1700000000000,
    "wsUrl": "wss://api.aivo.yourdomain.com/live-workout/ws?sessionId=..."
  }
}
```

#### End Live Session

```http
POST /live-workout/sessions/:id/end
Authorization: Bearer <jwt-token>
```

---

### Posture Analysis

#### Upload Video for Analysis

```http
POST /posture/upload
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data

(video file)
```

#### Analyze Posture

```http
POST /posture/analyze
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "videoUrl": "https://...",
  "exerciseName": "squat",
  "userId": "user-uuid"
}
```

#### Get Posture Analysis History

```http
GET /posture/history?limit=20
Authorization: Bearer <jwt-token>
```

#### Get Analysis by ID

```http
GET /posture/analysis/:id
Authorization: Bearer <jwt-token>
```

#### Real-time Posture Correction

```http
POST /posture/realtime
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "sessionId": "session-uuid",
  "frameData": "base64-image",
  "exerciseName": "deadlift"
}
```

---

### Gamification

#### Get User Gamification Profile

```http
GET /gamification/profile
Authorization: Bearer <jwt-token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "level": 12,
    "points": 2850,
    "pointsToNextLevel": 150,
    "currentStreak": 7,
    "bestStreak": 21,
    "rank": 45,
    "badges": [
      {
        "id": "badge-uuid",
        "name": "First Workout",
        "description": "Complete your first workout",
        "icon": "🏋️",
        "earnedAt": 1700000000000
      }
    ]
  }
}
```

#### Get Leaderboard

```http
GET /gamification/leaderboard?limit=100&offset=0
Authorization: Bearer <jwt-token>
```

#### Award Points (Admin/System)

```http
POST /gamification/points/award
Authorization: Bearer <jwt-token>  // Admin only

{
  "userId": "user-uuid",
  "points": 100,
  "reason": "Completed 7-day streak",
  "source": "streak_bonus"
}
```

---

### Metabolic Twin & Simulation

#### Simulate Metabolic Response

```http
POST /metabolic/simulate
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "foodLog": [
    { "name": "chicken breast", "grams": 150, "protein_g": 46 },
    { "name": "rice", "grams": 200, "carbs_g": 45 }
  ],
  "userContext": {
    "weight": 80,
    "height": 180,
    "age": 28,
    "gender": "male",
    "activityLevel": "moderate",
    "goals": ["maintain_weight"]
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "simulationId": "sim-uuid",
    "glucoseCurve": [...],
    "insulinResponse": [...],
    "energyLevelPrediction": "stable",
    "recommendations": ["Consider adding vegetables to slow digestion"]
  }
}
```

#### Calibrate Metabolic Twin

```http
POST /metabolic/calibrate
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "userId": "user-uuid",
  "cgmData": [...],
  "foodLogs": [...]
}
```

---

### Infographics & Reports

#### Generate Progress Infographic

```http
POST /infographic/generate
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "userId": "user-uuid",
  "type": "monthly_progress",
  "dateRange": { "start": "2025-03-01", "end": "2025-03-31" }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "infographicId": "info-uuid",
    "imageUrl": "https://...",
    "shareUrl": "https://share.aivo.ai/...",
    "expiresAt": 1700000000000
  }
}
```

#### Generate Share Image

```http
POST /infographic/share/generate
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "infographicId": "info-uuid",
  "template": "instagram-story"
}
```

#### Record Share Event

```http
POST /infographic/share/record
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "infographicId": "info-uuid",
  "platform": "instagram"
}
```

---

### Admin Test Endpoints (Development Only)

These endpoints are only available when `NODE_ENV !== "production"`.

#### Health Check

```http
GET /admin/test/health-check
```

#### Dashboard Stats

```http
GET /admin/test/stats
```

#### User Profile (Complete)

```http
GET /admin/test/user/:userId
```

Returns user with all related data (workouts, nutrition, gamification, etc.)

#### Workouts

```http
GET /admin/test/workouts?limit=50&type=strength
```

#### Conversations

```http
GET /admin/test/conversations?limit=100
```

#### Memories

```http
GET /admin/test/memories?minConfidence=0.8&type=fact
```

#### Body Metrics

```http
GET /admin/test/body-metrics?days=30
```

#### Recovery Data

```http
GET /admin/test/recovery
```

#### Gamification

```http
GET /admin/test/gamification
```

#### AI Activity

```http
GET /admin/test/ai-activity
```

---

### Cron Jobs (Internal)

These are internal endpoints triggered by Cloudflare Cron Triggers.

#### Daily Digest

```http
POST /cron/daily-digest
```

#### Weekly Summary

```http
POST /cron/weekly-summary
```

#### Cleanup Old Data

```http
POST /cron/cleanup
```

---

### Export

#### Export User Data

```http
POST /export/user
Authorization: Bearer <jwt-token>
```

Initiates a data export (JSON) and stores in R2. Returns a download URL.

---

### Monthly Reports

#### Generate Monthly Report

```http
POST /admin/monthly-reports
Authorization: Bearer <jwt-token>  // Admin

{
  "userId": "user-uuid",
  "month": "2025-04",
  "includeCharts": true
}
```

---

### Acoustic Myography

#### Process Audio Signal

```http
POST /acoustic/process
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "audioData": "base64-encoded-audio",
  "sampleRate": 44100,
  "exerciseType": "squat"
}
```

---

### Digital Twin

#### Create/Update Digital Twin

```http
POST /digital-twin/update
Authorization: Bearer <jwt-token>
```

Generates or updates the user's digital twin based on all available data.

#### Get Digital Twin

```http
GET /digital-twin
Authorization: Bearer <jwt-token>
```

---

### Form Analysis

#### Analyze Exercise Form

```http
POST /form-analyze
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "videoUrl": "https://...",
  "exerciseName": "bench-press"
}
```

---

### Biometric

#### Submit Biometric Reading

```http
POST /biometric/readings/batch
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "readings": [
    {
      "type": "heart_rate",
      "value": 65,
      "timestamp": 1700000000000,
      "device": "Apple Watch"
    }
  ]
}
```

---

## Error Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | Success | Request completed |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing or invalid auth |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate or state conflict |
| 422 | Validation Error | Schema validation failed |
| 429 | Rate Limited | Too many requests |
| 500 | Server Error | Internal error |
| 503 | Service Unavailable | AI service not configured or dependency down |

## Rate Limiting

Currently no hard rate limits. Recommended usage:
- Chat: ~20 requests/minute per user
- Other endpoints: ~100 requests/minute

## Data Retention

- Conversations: indefinite (for memory training)
- Workouts: indefinite
- Body metrics: 10 years
- Food logs: indefinite
- Sessions: 90 days
- Cache entries: TTL varies by type (minutes to hours)

## OpenAPI/Swagger

The API includes embedded Swagger documentation (JSDoc comments) that can be extracted to generate interactive API documentation. Use tools like `swagger-jsdoc` to generate OpenAPI spec.

---

**Last Updated:** 2025-04-27
**API Version:** 1.0.0
**Base Path:** `/api` (all endpoints prefixed with `/api` in production, but routes are defined without prefix in code)
