# AIVO Feature Documentation

Comprehensive catalog of all features developed in the AIVO fitness platform.

---

## Table of Contents

1. [Core AI & Compute Engine](#core-ai--compute-engine)
2. [API Endpoints](#api-endpoints)
3. [Database Features](#database-features)
4. [Web Application](#web-application)
5. [Mobile Application](#mobile-application)
6. [Packages & Libraries](#packages--libraries)
7. [Infrastructure](#infrastructure)

---

## Core AI & Compute Engine

### WASM Compute (`packages/aivo-compute`)

High-performance Rust-based calculations compiled to WebAssembly:

- **Deviation Scoring** - Calculate workout adherence deviation (0-100)
- **Recovery Curve Analysis** - Analyze fatigue and recovery patterns
- **Trend Analysis** - Calculate trends from historical data
- **Consistency Scoring** - Measure routine consistency
- **Volatility Calculation** - Assess data volatility
- **Scenario Generation** - Generate workout adjustment scenarios
- **Recommendation Engine** - AI-driven workout recommendations

**Tech:** Rust, wasm-bindgen, optimized with LTO and size optimization

---

## API Endpoints

### Authentication (`/api/auth/*`)

- `POST /auth/google` - Verify Google ID token, create/find user
- `POST /auth/facebook` - Verify Facebook access token
- `POST /auth/verify` - Verify JWT token
- `POST /auth/logout` - Invalidate session

### AI Chat (`/api/ai/*`)

- `POST /ai/chat` - Send message to AI fitness coach with memory context
- `GET /ai/history/:userId` - Retrieve conversation history
- `POST /ai/replan` - Adaptive routine replanning based on deviation

### Body & Metrics (`/api/body/*`)

- `POST /body/metrics` - Record body measurements
- `GET /body/insights` - AI-generated body insights
- `POST /body/generate-insights` - Manually trigger insight generation
- `POST /body/photos` - Upload body progress photos
- `GET /body/photos/:id` - Retrieve photo with analysis

### Workouts (`/api/workouts/*`)

- `POST /workouts/complete` - Log completed workout
- `GET /workouts/:userId` - Get user workout history
- `PUT /workouts/:id` - Update workout record

### Routines (`/api/routines/*`)

- `POST /routines` - Create workout routine
- `GET /routines?userId=:userId&active=true` - Get active routines
- `PUT /routines/:id` - Update routine
- `DELETE /routines/:id` - Archive routine

### Nutrition (`/api/nutrition/*`)

- `POST /nutrition/consult` - AI nutrition consultation (multi-agent)
- `POST /nutrition/log` - Log food entry
- `GET /nutrition/logs/:userId` - Get food logs
- `GET /nutrition/summary/:userId/:date` - Daily nutrition summary
- `POST /nutrition/budget` - Budget analysis agent
- `POST /nutrition/chef` - Chef/recipe agent
- `POST /nutrition/medical` - Medical dietary restrictions agent

### Form Analysis (`/api/form-analyze/*`)

- `POST /form-analyze/upload` - Upload exercise form video
- `GET /form-analyze/:videoId` - Get analysis status/results
- `POST /form-analyze/:videoId/feedback` - Request AI feedback
- `GET /form-analyze/exercises` - List supported exercises

### Posture Analysis (`/api/posture/*`)

- `POST /posture/analyze` - Analyze exercise posture from skeleton data
- `GET /posture/exercises` - Get exercise registry
- `POST /posture/feedback` - Generate AI feedback for posture

### Live Workout (`/api/live-workout/*`)

- `POST /live-workout/start` - Start live workout session
- `POST /live-workout/:sessionId/log-rpe` - Log set RPE
- `POST /live-workout/:sessionId/adjust` - Get AI adjustment
- `POST /live-workout/:sessionId/end` - End session
- `GET /live-workout/active/:userId` - Get active session

### Infographics (`/api/infographic/*`)

- `POST /infographic/generate` - Generate shareable infographic
- `GET /infographic/:id` - Retrieve infographic
- `DELETE /infographic/:id` - Delete infographic
- `GET /infographic/templates` - List available templates

### Gamification (`/api/gamification/*`)

- `GET /gamification/profile/:userId` - Get user profile
- `POST /gamification/checkin` - Daily check-in
- `POST /gamification/achievements` - Update achievements
- `GET /gamification/leaderboard` - Get leaderboard
- `POST /gamification/freeze-streak` - Use streak freeze

### Export (`/api/export/*`)

- `GET /export/excel/:userId` - Export data to Excel
- `GET /export/csv/:userId` - Export to CSV
- `POST /export/monthly-report` - Generate monthly report

### Cron Jobs (`/api/cron/*`)

- `POST /cron/daily-summaries` - Generate daily summaries
- `POST /cron/monthly-reports` - Send monthly reports
- `POST /cron/streak-reset` - Reset daily streaks
- `POST /cron/snapshot-cleanup` - Clean old snapshots

### Admin (`/api/admin/*`)

- `POST /admin/test-data` - Generate mock data for testing
- `GET /admin/metrics` - System metrics
- `POST /admin/maintenance` - Maintenance operations

### Health (`/api/health`)

- `GET /health` - Health check endpoint

---

## Database Features

### Core Tables (42 tables)

**User Management:**
- `users` - User profiles with fitness data
- `sessions` - OAuth session tracking

**Body & Metrics:**
- `bodyMetrics` - Weight, body fat, measurements
- `bodyPhotos` - Progress photo storage (R2)
- `bodyHeatmaps` - AI-analyzed body heatmaps
- `bodyHeatmapHistory` - Progress snapshots
- `visionAnalyses` - Computer vision results

**Nutrition:**
- `foodItems` - Curated food database
- `foodLogs` - User food entries
- `dailyNutritionSummaries` - Materialized daily aggregates
- `nutritionConsults` - AI consultation history

**Workouts:**
- `workouts` - Completed workout logs
- `workoutExercises` - Exercise details
- `workoutRoutines` - Weekly routine templates
- `routineExercises` - Planned exercises
- `workoutCompletions` - Completion tracking
- `dailySchedules` - Daily workout schedules
- `workoutTemplates` - Reusable templates

**AI & Memory:**
- `conversations` - Chat history
- `aiRecommendations` - AI recommendations
- `memoryNodes` - Semantic memory graph nodes
- `memoryEdges` - Memory relationships
- `compressedContexts` - Token optimization cache

**Adaptive Planning:**
- `bodyInsights` - Recovery and soreness data
- `userGoals` - Fitness goals tracking
- `planDeviations` - AI adjustment history
- `biometricSnapshots` - 7d/30d aggregates
- `correlationFindings` - Discovered patterns

**Gamification:**
- `gamificationProfiles` - Points, levels, streaks
- `badges` - Earned badges
- `achievements` - Achievement progress
- `streakFreezes` - Streak freeze tracking
- `pointTransactions` - Points ledger
- `dailyCheckins` - Daily check-in records
- `leaderboardSnapshots` - Historical leaderboards

**Social:**
- `socialRelationships` - Friend connections
- `shareableContent` - Social proof cards
- `activityEvents` - Activity tracking

**Form Analysis:**
- `formAnalysisVideos` - Uploaded videos
- `formAnalyses` - Analysis results

**Notifications:**
- `notifications` - Push/in-app notifications

**Live Workout:**
- `liveWorkoutSessions` - Active sessions
- `setRpeLogs` - RPE tracking

**System:**
- `systemMetrics` - System health metrics
- `userAnalytics` - User analytics
- `migrations` - Migration tracking

---

## Web Application (`apps/web`)

### Pages

- `/login` - OAuth login page
- `/dashboard` - Main dashboard with routine, metrics, chat
- `/profile` - User profile and settings
- `/workouts` - Workout history and logging
- `/nutrition` - Food logging and insights
- `/form-analysis` - Video upload and results
- `/insights` - Body insights and trends

### Components

**UI Components:**
- `Button`, `Card`, `Input`, `Modal` - Base components
- `WorkoutCard` - Workout display
- `ExerciseItem` - Exercise in routine
- `MetricChart` - Body metrics visualization
- `ChatInterface` - AI conversation UI
- `RoutineEditor` - Routine creation/editing
- `PhotoUploader` - Body photo upload
- `InfographicPreview` - Shareable card preview

### Features

1. **OAuth Integration**
   - Google Sign-In via `@react-oauth/google`
   - Redirect flow with JWT exchange
   - Secure token storage

2. **Dashboard**
   - Current routine display
   - Today's workout card
   - Body metrics charts (weight, body fat)
   - Quick action buttons
   - Recent achievements

3. **AI Chat**
   - Real-time conversation with AI coach
   - Memory-aware responses
   - Message history with scroll
   - Typing indicators
   - Error handling

4. **Progress Tracking**
   - Weight/body fat charts (Recharts)
   - Personal records
   - Body photo comparison
   - Trend indicators

5. **Routine Management**
   - Create/edit weekly routines
   - Exercise library search
   - Template selection
   - Drag-and-drop ordering

6. **Form Analysis**
   - Video upload with preview
   - Processing status tracking
   - Results display with scores
   - Correction drills

7. **Infographic Generation**
   - Template selection
   - Theme customization
   - Share/download options

8. **Responsive Design**
   - Mobile-first Tailwind CSS
   - Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
   - Tablet and desktop adaptations

---

## Mobile Application (`apps/mobile`)

### Screens (Expo Router)

**Auth:**
- `/login` - OAuth login screen

**Tabs:**
- `/` - Home/dashboard
- `/chat` - AI chat interface
- `/profile` - User profile
- `/workouts` - Workout tracking

### Features

1. **OAuth Login**
   - Google Sign-In via `expo-auth-session`
   - Facebook Login via native SDK
   - Deep linking for callbacks
   - Secure token storage (expo-secure-store)

2. **Dashboard**
   - Today's workout overview
   - Body metrics summary
   - Quick workout logging
   - Streak display

3. **AI Chat**
   - Full chat interface
   - Message bubbles
   - Memory context display
   - Voice input (optional)

4. **Workout Tracking**
   - Timer & set tracking
   - Exercise logging with RPE
   - Rest timers
   - Progress photos
   - Offline support

5. **Notifications**
   - Push notifications for workouts
   - Reminders
   - Expo Push Notifications service

6. **Offline Support**
   - Cached routines
   - Queued sync
   - Local storage fallback

7. **Native Features**
   - Camera access for photos
   - Haptic feedback
   - Deep linking
   - Share sheet

---

## Packages & Libraries

### `@aivo/compute` (WASM)

Rust crate for fitness calculations:
- Deviation scoring algorithms
- Recovery curve analysis
- Trend analysis
- Scenario generation
- Compiled to WASM for cross-platform use

### `@aivo/db`

Drizzle ORM schema and migrations:
- 42 tables with relationships
- Type-safe queries
- Migration generation
- Cloudflare D1 integration

### `@aivo/memory-service`

Semantic memory system:
- Vector embeddings (OpenAI)
- Graph-based memory storage
- Context building for AI
- Memory extraction from conversations
- Critical health prioritization

### `@aivo/api-client`

Shared API client for web/mobile:
- Type-safe endpoints
- Authentication handling
- Request/response interceptors
- Error handling

### `@aivo/body-compute`

Body analysis calculations:
- BMI, body fat calculations
- Progress tracking metrics
- Heatmap generation

### `@aivo/email-reporter`

Email report generation:
- Monthly report templates
- PDF generation
- SendGrid/Resend integration

### `@aivo/excel-export`

Excel export functionality:
- XLSX generation
- Multi-sheet reports
- Formatting

### `@aivo/infographic-generator`

Infographic rendering:
- Canvas-based graphics
- Template system
- Image generation
- Social sharing formats

### `@aivo/optimizer`

Token optimization for AI:
- Context compression
- Memory summarization
- Prompt caching strategies

### `@aivo/shared-types`

Shared TypeScript types:
- API request/response schemas
- Database entity types
- Validation schemas (Zod)
- Used across all packages

---

## Infrastructure

### Cloudflare Workers

- **Runtime:** Workers with D1 and R2
- **Framework:** Hono for routing
- **Deployment:** Wrangler CLI
- **Environment:** Edge runtime, no Node.js APIs

### Database

- **Engine:** Cloudflare D1 (SQLite compatible)
- **ORM:** Drizzle
- **Migrations:** Drizzle Kit
- **Schema:** 42 tables with indexes

### Storage

- **R2** - Object storage for photos, infographics
- **Public URLs** - CDN-backed image delivery

### AI Services

- **OpenAI GPT-4o** - Chat and analysis
- **Embeddings** - text-embedding-3-small
- **Vision** - gpt-4o for image analysis

### Authentication

- **OAuth Providers:** Google, Facebook
- **JWT** - Stateless session tokens
- **Secret:** AUTH_SECRET for signing

---

## Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| OAuth (Google/Facebook) | ✅ Complete | Both providers working |
| AI Chat with Memory | ✅ Complete | Memory extraction active |
| Adaptive Routine Planning | ✅ Complete | WASM-powered deviation scoring |
| Body Metrics Tracking | ✅ Complete | Charts and insights |
| Nutrition Logging | ✅ Complete | Multi-agent AI consultation |
| Form Video Analysis | ✅ Complete | Pose detection + AI feedback |
| Posture Analysis | ✅ Complete | Skeleton-based analysis |
| Live Workout Sessions | ✅ Complete | Real-time RPE tracking |
| Infographic Generation | ✅ Complete | Multiple templates |
| Gamification | ✅ Complete | Points, badges, streaks |
| Excel Export | ✅ Complete | XLSX generation |
| Monthly Reports | ✅ Complete | Email + PDF |
| Push Notifications | ✅ Complete | Expo push service |
| Offline Support | ✅ Complete | Mobile caching |
| Semantic Memory | ✅ Complete | Vector + graph storage |

---

**Total Features:** 50+ features across 4 platforms
**Lines of Code:** ~150,000+
**Packages:** 14
**Database Tables:** 42
**API Endpoints:** 40+

*Last Updated: 2026-04-23*
