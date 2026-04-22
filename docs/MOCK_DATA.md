# Admin Test Data Guide

This guide explains how to use the mock data for UI/UX and API testing with the AIVO platform.

## Overview

The mock data system provides a complete fake dataset for an admin user (`admin@aivo.ai`) with:

- **Profile**: 28yo male, 180cm, 82.5kg, intermediate fitness level
- **Workout History**: 4 weeks of completed workouts (4 days/week upper/lower split)
- **Body Metrics**: 30 days of daily measurements with trends
- **Gamification**: Level 12, 2850 points, 7-day streak
- **Memories**: 8 extracted memory nodes with relationships
- **Conversations**: 15 chat messages with AI coach
- **Goals**: 3 active fitness goals (strength, weight loss, endurance)
- **Nutrition**: Food logs and daily summaries
- **Sleep**: 30 days of sleep tracking
- **Badges**: 3 earned badges
- **AI Recommendations**: 2 active recommendations

## Quick Start

### 1. Setup Local Database

```bash
# Navigate to db package
cd packages/db

# Apply migrations to local D1 database
pnpm exec wrangler d1 migrations apply aivo-db --local

# Start Wrangler dev server if not running
pnpm exec wrangler dev
```

### 2. Seed the Database

```bash
cd packages/db
pnpm run seed:mock
```

Expected output:
```
🌱 Starting database seeding...

📝 Inserting admin user...
   ✅ Created user: admin@aivo.ai
📝 Inserting OAuth session...
   ✅ Created session for provider: google
📝 Inserting gamification profile...
   ✅ Profile: Level 12, 2850 points
📝 Inserting 31 body metrics records...
   ✅ Body metrics history populated (31 days)
...
✅ Database seeding completed successfully!

📊 Summary:
   - User: admin@aivo.ai
   - Workouts: 16 completed
   - Memories: 8 stored
   - Conversations: 15 messages
   - Gamification: Level 12, 2850 points
   - Streak: 7 days current, 21 days best
```

### 3. Access Admin API Endpoints

The mock data is available through admin-only API endpoints (development only):

#### Base URL
```
http://localhost:8788/api/admin/test/*
```

#### Available Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health-check` | API health status |
| `GET /stats` | Dashboard overview statistics |
| `GET /user/:userId` | Detailed user profile with all related data |
| `GET /workouts` | All workouts (filterable by type) |
| `GET /conversations` | Chat history |
| `GET /memories` | Memory nodes (filterable by type/confidence) |
| `GET /body-metrics` | Body measurement history |
| `GET /recovery` | Recovery and fatigue data |
| `GET /gamification` | Points, badges, streaks |
| `GET /ai-activity` | AI interactions summary |

### 4. Test in Frontend

Use the admin user credentials to test UI/UX:

```javascript
// Mock admin auth token (for development)
const adminToken = "dev-admin-token";
const adminUserId = "admin-user-001";

// Fetch admin dashboard data
const response = await fetch("http://localhost:8788/api/admin/test/stats", {
  headers: {
    "Authorization": `Bearer ${adminToken}`,
    "X-User-Id": adminUserId,
  },
});

const data = await response.json();
console.log(data);
```

## Sample Data Queries

### Get User Profile with Everything

```bash
curl http://localhost:8788/api/admin/test/user/admin-user-001
```

Response includes:
- User profile
- Gamification stats
- Recent workouts (last 10)
- Recent conversations (last 5)
- All memories
- Goals
- Body metrics chart data

### Get Workout History

```bash
curl "http://localhost:8788/api/admin/test/workouts?limit=20"
```

### Get Memory Analytics

```bash
curl "http://localhost:8788/api/admin/test/memories?minConfidence=0.8"
```

### Get Recovery Trends

```bash
curl http://localhost:8788/api/admin/test/recovery
```

Returns 30 days of recovery scores, fatigue levels, sleep quality.

## Data Characteristics

### Workout Pattern
- 4 days/week (Mon, Tue, Thu, Fri)
- Upper/Lower split
- Progressive overload (weights increase over weeks)
- Heavy deadlift day on Friday

### Body Metrics Trends
- Weight: starts at 83kg, trending down to ~81kg
- Body fat: 18.5% → 15% over 30 days
- Muscle mass: slowly increasing
- BMI: 25.4 → 24.7

### Recovery Patterns
- Recovery score higher on non-workout days (90+)
- Lower recovery on heavy workout days (70-80)
- Sleep quality: consistent 7-8 hours
- Soreness pattern matches workout schedule (legs sore after lower days)

### Memory Types Distributed
- fact: 3 (profile info, injury history, goal)
- preference: 1 (morning workout preference)
- event: 1 (PR achievement)
- constraint: 1 (4 days/week limitation)
- emotional: 1 (motivation pattern)
- entity: 1 (gym location)

## Testing Scenarios

### 1. Dashboard Overview
Use `/stats` endpoint to test dashboard cards showing:
- Total workouts
- Active routines
- Average recovery
- Current goals

### 2. Profile Page
Use `/user/:userId` to test complete profile view with:
- Personal info
- Gamification widgets
- Recent activity feed
- Goal progress bars

### 3. Workout History
Use `/workouts` to test:
- Workout list with filters
- Exercise detail view
- Progress charts

### 4. AI Chat Integration
Use `/conversations` to test:
- Chat history display
- Memory context display
- Recommendation cards

### 5. Analytics Charts
Use `/body-metrics` and `/recovery` for:
- Line charts (weight trend)
- Heat maps (soreness)
- Correlations (sleep vs recovery)

### 6. Gamification
Use `/gamification` to test:
- Level progress bars
- Badge display
- Streak indicators
- Points history

## Resetting Data

To reset the mock data:

```bash
# Clear all tables for the admin user
# (You may need to write a separate cleanup script or manually delete)
```

For a fresh start, delete the local database and reapply migrations:

```bash
cd packages/db
rm -rf .wrangler/state  # Clears local D1 database
pnpm exec wrangler d1 migrations apply aivo-db --local
pnpm run seed:mock
```

## Extending Mock Data

Add new data to `packages/db/src/__tests__/mock-data.ts`:

```typescript
// Add to mockData object
mockData.newTable = [
  {
    id: generateId(),
    userId: adminUser.id,
    // ... your fields
  },
];
```

## Notes

- **Development Only**: The `/api/admin/test/*` endpoints are only available in non-production environments
- **No Authentication**: These endpoints bypass normal auth for easy testing
- **Static Data**: Mock data is generated once on seed; it doesn't change between runs unless re-seeded
- **Admin User**: Only one user (admin@aivo.ai) is created; all data belongs to this user

## Troubleshooting

### "Table not found" error
Make sure migrations are applied:
```bash
pnpm exec wrangler d1 migrations apply aivo-db --local
```

### "No seed script found"
Install tsx and regenerate the seed script:
```bash
cd packages/db
pnpm add -D tsx
pnpm run seed:mock
```

### Port conflicts
Ensure Wrangler is running on port 8788:
```bash
pnpm exec wrangler dev --port 8788
```
