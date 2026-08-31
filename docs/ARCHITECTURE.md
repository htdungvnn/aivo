# Architecture Overview

This document provides a comprehensive overview of the AIVO platform architecture, designed to support AI-powered health, fitness, and nutrition coaching.

## 🎯 System Design Principles

1. **Microservices Architecture**: Each domain (auth, health, coach, nutrition) is an independent service
2. **Type Safety**: Full TypeScript with Zod validation at boundaries
3. **Scalability**: Cloudflare Workers for global edge deployment
4. **AI Integration**: Built-in support for AI insights and coaching

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│  │   Web   │  │ Mobile  │  │  iOS    │  │Android  │             │
│  │(Next.js)│  │ (Expo)  │  │         │  │         │             │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘             │
└───────┼────────────┼─────────────┼─────────────┼────────────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │   Auth     │  │  Health   │  │   Coach   │  │ Nutrition │   │
│  │  Service   │  │  Service  │  │  Service   │  │  Service  │   │
│  │  :3001     │  │           │  │           │  │  :3002    │   │
│  └─────┬──────┘  └─────┬─────┘  └─────┬─────┘  └─────┬──────┘   │
└────────┼───────────────┼───────────────┼───────────────┼────────────┘
         │               │               │               │
         ▼               ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Data Layer                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │   D1    │  │   D1    │  │   D1    │  │   D1    │  │   KV    │ │
│  │(Auth DB)│  │(Health) │  │(Coach) │  │(Nutrit.)│  │(Cache)  │ │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 📱 Application Architecture

### Web Application (Next.js)

```
apps/web/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth routes (login, register, etc.)
│   ├── dashboard/         # Main dashboard
│   ├── nutrition/         # Nutrition tracking
│   ├── intelligence/       # AI insights
│   └── settings/          # User settings
├── components/
│   ├── ui/                # Reusable UI components
│   ├── auth/              # Auth-specific components
│   └── landing/           # Landing page components
└── lib/
    ├── utils.ts           # Utility functions
    ├── auth.ts            # Auth client
    ├── health.ts          # Health API client
    └── nutrition.ts       # Nutrition API client
```

### Mobile Application (Expo)

```
apps/mobile/
├── src/
│   ├── app/               # Expo Router pages
│   │   ├── (tabs)/       # Tab-based navigation
│   │   ├── auth/         # Auth flow
│   │   └── analysis/     # Food analysis
│   ├── components/        # React Native components
│   ├── hooks/             # Custom hooks
│   ├── lib/               # Libraries
│   │   ├── auth.ts        # Mobile auth client
│   │   ├── coach/         # Pose detection, feedback
│   │   └── nutrition.ts   # Nutrition API client
│   ├── services/          # API services
│   ├── screens/           # Screen components
│   ├── types/             # TypeScript types
│   └── constants/         # App constants
└── assets/                # Static assets
```

## 🔧 Service Architecture

### Auth Service

```
apps/services/auth/
├── src/
│   ├── routes/           # Hono route handlers
│   │   ├── auth.ts       # Login/logout
│   │   ├── register.ts   # User registration
│   │   ├── verification.ts # Email verification
│   │   ├── account.ts    # Account management
│   │   ├── sessions.ts   # Session management
│   │   ├── oauth.ts     # OAuth flows
│   │   └── admin.ts     # Admin endpoints
│   ├── middleware/        # Auth middleware
│   │   ├── auth.ts       # JWT validation
│   │   └── request.ts    # Request processing
│   ├── services/         # Business logic
│   │   ├── auth.ts       # Auth service
│   │   └── verification.ts # Verification service
│   ├── providers/         # OAuth providers
│   │   ├── google.ts
│   │   └── facebook.ts
│   ├── lib/               # Utilities
│   │   ├── jwt.ts        # JWT operations
│   │   └── tokens.ts     # Token management
│   ├── db/               # Database
│   │   ├── index.ts      # D1 wrapper
│   │   ├── queries.ts    # SQL queries
│   │   └── migrate.ts    # Migrations
│   └── types/            # TypeScript types
└── migrations/           # D1 migrations
```

### Health Service

```
apps/services/health/
├── src/
│   ├── routes/           # Health API endpoints
│   ├── middleware/        # Auth & error handling
│   ├── lib/               # Business logic
│   │   ├── readiness-engine.ts  # Readiness calculation
│   │   ├── daily-actions.ts     # Daily recommendations
│   │   ├── health-aggregation.ts # Data aggregation
│   │   ├── chart-aggregation.ts # Chart data
│   │   └── ai-insights.ts      # AI insight generation
│   ├── db/               # D1 database
│   └── types/            # TypeScript types
```

### Coach Service

```
apps/services/coach/
├── src/
│   ├── routes/           # Coach API endpoints
│   │   ├── sessions.ts   # Workout sessions
│   │   ├── exercises.ts   # Exercise library
│   │   ├── plans.ts      # Workout plans
│   │   ├── planning.ts   # AI plan generation
│   │   └── progress.ts   # Progress tracking
│   ├── services/         # Business logic
│   │   ├── sessions.ts   # Session management
│   │   ├── exercises.ts   # Exercise engine
│   │   ├── plans.ts      # Plan management
│   │   ├── planning.ts   # AI planning
│   │   └── progress.ts   # Progress calculation
│   └── db/               # D1 database
```

### Nutrition Service

```
apps/services/nutrition/
├── src/
│   ├── routes/           # Nutrition API endpoints
│   │   ├── meals.ts     # Meal CRUD
│   │   ├── foods.ts     # Food search
│   │   ├── plans.ts     # Meal plans
│   │   ├── targets.ts   # Nutrition targets
│   │   ├── charts.ts    # Chart data
│   │   ├── analysis.ts  # AI food analysis
│   │   └── upload.ts    # Image upload
│   ├── services/         # Business logic
│   │   ├── calculations.ts # Nutrition calculations
│   │   ├── ai-analysis.ts  # AI analysis
│   │   └── ai-router.ts   # AI routing
│   ├── lib/              # Utilities
│   │   └── crypto.ts    # Encryption
│   ├── db/               # D1 database
│   │   └── queries.ts   # SQL queries
│   └── workers/          # Queue workers
│       └── queue.ts     # Background processing
```

## 🔄 Request Flow

### Typical API Request

```
1. Client Request
   └─▶ Headers: Authorization: Bearer <jwt>
                Content-Type: application/json

2. Auth Middleware (in each service)
   └─▶ Extract token from header
       └─▶ Verify JWT signature
           └─▶ Check token expiry
               └─▶ Extract userId

3. Route Handler
   └─▶ Validate request body (Zod)
       └─▶ Execute business logic
           └─▶ Query database (D1)
               └─▶ Return response
```

### Background Job Flow

```
1. API Request triggers job
   └─▶ POST /api/v1/nutrition/analysis
   
2. Job enqueued to Cloudflare Queue
   └─▶ Queue: aivo-nutrition-queue

3. Queue consumer processes job
   └─▶ Call AI for food analysis
       └─▶ Update database
           └─▶ Send notification (optional)

4. Job completion
   └─▶ Success: Mark complete
       Failure: Retry or DLQ
```

## 🗄️ Database Schema

### Auth Database (D1)

```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  email_verified INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Identities (OAuth providers)
CREATE TABLE identities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Sessions
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  client_type TEXT,
  ip_address TEXT,
  user_agent TEXT,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Health Database (D1)

```sql
-- Readiness snapshots
CREATE TABLE readiness_snapshots (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  overall_score REAL,
  sleep_score REAL,
  hrv_score REAL,
  stress_score REAL,
  energy_score REAL,
  recovery_score REAL,
  factors_json TEXT,
  created_at INTEGER NOT NULL
);

-- Daily health data
CREATE TABLE daily_health_data (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  sleep_hours REAL,
  sleep_quality INTEGER,
  hrv_value REAL,
  resting_heart_rate INTEGER,
  stress_level INTEGER,
  energy_level INTEGER,
  notes TEXT,
  created_at INTEGER NOT NULL
);
```

## 🔒 Security Architecture

### Token Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│  Client │────▶│  Auth   │────▶│  Other  │
│         │◀────│ Service │◀────│ Services│
└─────────┘     └────┬────┘     └─────────┘
                      │
                      ▼
                 ┌─────────┐
                 │   D1    │
                 │ Database│
                 └─────────┘

1. Login: Client ──▶ Auth Service (credentials)
2. Auth Service validates and issues JWT
3. JWT contains: userId, roles, expiry
4. Client stores tokens securely
5. Subsequent requests include JWT
6. Each service validates JWT independently
```

### Rate Limiting

```
┌────────────┐     ┌────────────────┐     ┌─────────┐
│   Client   │────▶│  Rate Limiter  │────▶│ Service │
│            │◀────│  (In-Memory/  │◀────│         │
└────────────┘     │  KV-backed)    │     └─────────┘
                    └────────────────┘
                    
                    Limits:
                    - 100 requests/minute (authenticated)
                    - 20 requests/minute (unauthenticated)
```

## 📊 Monitoring & Observability

### Logging

All services use structured logging:

```typescript
console.log(JSON.stringify({
  level: 'info',
  message: 'Request processed',
  requestId: 'uuid',
  userId: 'user-id',
  duration: 150,
  status: 200,
}));
```

### Metrics

Key metrics tracked:
- Request latency (p50, p95, p99)
- Error rate by endpoint
- Database query times
- Queue processing time

## 🚀 Deployment

### Environments

| Environment | Domain | Purpose |
|-------------|--------|---------|
| Development | localhost:3001 | Local dev |
| Preview | preview.aivo.app | PR previews |
| Staging | staging.aivo.app | Testing |
| Production | api.aivo.app | Live users |

### CI/CD Pipeline

```
1. Push to branch
   └─▶ Run lint, typecheck, tests

2. Merge to main
   └─▶ Build all packages
       └─▶ Deploy to staging
           └─▶ Run integration tests

3. Release tag
   └─▶ Deploy to production
       └─▶ Run smoke tests
```
