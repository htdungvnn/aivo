# AIVO - AI-Powered Health & Fitness Platform

## 📖 Documentation Index

- **[Project Overview](#-project-overview)** - Architecture, technologies, and structure
- **[Services Documentation](#-services-documentation)** - Detailed API documentation for all microservices
- **[Packages Documentation](#-packages-documentation)** - Shared libraries and utilities
- **[Applications Documentation](#-applications-documentation)** - Web and Mobile apps
- **[Code Review Findings](#-code-review-findings)** - Issues, bugs, and recommendations
- **[Development Guide](#-development-guide)** - Setup, commands, and best practices
- **[API Reference](#-api-reference)** - Endpoint documentation

---

## 🔷 Project Overview

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐         ┌─────────────────────┐               │
│  │   Next.js Web App    │         │  React Native App   │               │
│  │   (apps/web)         │         │  (apps/mobile)      │               │
│  │   Port 3000          │         │  Expo SDK 57        │               │
│  └──────────┬───────────┘         └──────────┬───────────┘               │
└─────────────┼───────────────────────────────────┼─────────────────────────┘
              │                                   │
              │ HTTP/JWT                         │ HTTP/JWT
              ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY                                     │
│                    (apps/services/gateway)                              │
│                         Port 4000                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ • Rate Limiting          • Circuit Breaker    • CORS           │   │
│  │ • Request Logging        • Security Headers    • Metrics        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              │ Routes to backend services                │
└──────────┬───────────────────┼───────────────────┬─────────────────────┘
           │                   │                   │
     ┌─────▼─────┐      ┌──────▼──────┐    ┌─────▼─────┐
     │   Auth    │      │   Health    │    │   Coach   │
     │  Service  │      │   Service   │    │  Service  │
     │  Port 3001│      │   Port 3002 │    │  Port 3003│
     └───────────┘      └──────┬───────┘    └─────┬─────┘
                               │                  │
                         ┌─────▼─────┐      ┌─────▼─────┐
                         │ Nutrition │      │   Mail    │
                         │  Service  │      │  Service  │
                         │  Port 3004│      │  Port 3005│
                         └───────────┘      └───────────┘
```

### Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Web Application** | Next.js | 16.3.2 |
| **Mobile Application** | React Native (Expo) | SDK 57 |
| **Backend Services** | Cloudflare Workers + Hono | Latest |
| **Database** | Cloudflare D1 (SQLite) | - |
| **Storage** | Cloudflare R2 | - |
| **Queues** | Cloudflare Queues | - |
| **AI** | Cloudflare Workers AI | - |
| **Authentication** | JWT (ES256) | - |
| **Language** | TypeScript | 5.x / 7.0 |
| **Validation** | Zod | 3.25.76 |
| **Package Manager** | pnpm | 11.23.0 |
| **Monorepo** | Turborepo | 2.10.12 |

### Directory Structure

```
aivo/
├── apps/
│   ├── web/                         # Next.js 16 web application
│   │   ├── app/                     # App Router pages
│   │   │   ├── [locale]/            # i18n routing
│   │   │   ├── auth/               # Authentication pages
│   │   │   ├── health/             # Health tracking pages
│   │   │   ├── coach/              # AI coach pages
│   │   │   ├── nutrition/          # Nutrition pages
│   │   │   ├── dashboard/          # Main dashboard
│   │   │   ├── plan/               # Daily plan pages
│   │   │   └── ...                 # Other pages
│   │   ├── components/             # React components
│   │   │   ├── ui/                # Base UI components
│   │   │   ├── shared/            # Shared components
│   │   │   ├── shell/            # App shell (sidebar, header)
│   │   │   ├── landing/          # Marketing pages
│   │   │   └── auth/             # Auth components
│   │   ├── lib/                   # API clients & utilities
│   │   └── proxy.ts              # Development proxy config
│   │
│   ├── mobile/                     # React Native (Expo) mobile app
│   │   ├── app/                   # File-based routing (expo-router)
│   │   │   ├── (auth)/           # Auth screens
│   │   │   ├── (tabs)/           # Tab navigation
│   │   │   ├── health/           # Health screens
│   │   │   ├── meals/            # Nutrition screens
│   │   │   ├── workouts/         # Coach screens
│   │   │   └── reports/          # Reports screens
│   │   ├── src/
│   │   │   ├── lib/              # API clients
│   │   │   ├── services/         # Business logic
│   │   │   ├── hooks/            # React hooks
│   │   │   ├── contexts/         # React contexts
│   │   │   ├── components/       # Mobile-specific components
│   │   │   └── constants/        # Theme, config
│   │   └── ios/                  # iOS native project
│   │
│   └── services/                   # Cloudflare Workers microservices
│       ├── auth/                   # Authentication & user management
│       │   ├── src/
│       │   │   ├── index.ts       # Entry point
│       │   │   ├── routes/       # API endpoints
│       │   │   ├── middleware/   # Auth middleware
│       │   │   ├── services/     # Business logic
│       │   │   ├── db/           # Database queries
│       │   │   └── utils/        # Utilities
│       │   └── wrangler.jsonc    # Cloudflare config
│       │
│       ├── health/                # Health tracking & readiness
│       ├── coach/                 # AI workout coaching
│       ├── nutrition/             # Meal planning & tracking
│       ├── mail/                  # Email service (Resend)
│       └── gateway/               # API Gateway (unified entry)
│
├── packages/                       # Shared libraries
│   ├── auth-core/                 # JWT & auth middleware
│   ├── common-types/              # Shared utilities
│   ├── health-types/              # Health domain types (Zod)
│   ├── fitness-types/             # Fitness domain types (Zod)
│   ├── nutrition-types/           # Nutrition domain types (Zod)
│   ├── middleware/                # Shared Workers middleware
│   ├── observability/             # Logging, metrics, tracing
│   ├── wasm-gateway/              # WASM module loader
│   ├── api-client/               # API client utilities
│   ├── i18n/                     # Internationalization
│   └── ...
│
├── turbo.json                     # Turborepo configuration
├── pnpm-workspace.yaml            # pnpm workspace
└── package.json                   # Root package.json
```

---

## 🔷 Services Documentation

### 1. Auth Service (`apps/services/auth`)

**Purpose:** Handles user authentication, registration, OAuth flows, and session management.

**Tech Stack:** Cloudflare Workers + Hono + D1 Database + Queues

#### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/health` | No | Health check |
| `POST` | `/register` | No | User registration |
| `POST` | `/verification/send` | Yes | Send verification email |
| `POST` | `/verification/verify` | No | Verify 6-digit code |
| `GET` | `/auth/me` | Yes | Get current user |
| `POST` | `/auth/refresh` | No | Refresh access token |
| `POST` | `/auth/logout` | Yes | Logout current session |
| `POST` | `/auth/logout-all` | Yes | Logout all sessions |
| `POST` | `/oauth/start` | No | Initiate OAuth flow |
| `GET` | `/oauth/callback/:provider` | No | OAuth callback (web) |
| `POST` | `/oauth/mobile/callback` | No | OAuth callback (mobile) |
| `GET` | `/sessions` | Yes | List user sessions |
| `DELETE` | `/sessions/:id` | Yes | Revoke specific session |
| `GET` | `/account` | Yes | Get account info |
| `DELETE` | `/account` | Yes | Soft delete account |
| `GET` | `/admin/users` | Admin | List all users |
| `GET` | `/admin/users/:id` | Admin | Get user details |
| `POST` | `/admin/users/:id/suspend` | Admin | Suspend user |
| `POST` | `/admin/users/:id/reactivate` | Admin | Reactivate user |
| `POST` | `/admin/users/:id/roles` | Admin | Assign role |
| `DELETE` | `/admin/users/:id/roles/:role` | Admin | Remove role |

#### Registration Validation Schema
```typescript
{
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  displayName: z.string().min(2).max(100).optional()
}
```

#### Security Features
- ✅ PBKDF2 password hashing (100,000 iterations)
- ✅ JWT with ES256 signing (jose library)
- ✅ Token rotation with reuse detection
- ✅ 6-digit hashed verification codes
- ✅ Audit logging for all auth events

---

### 2. Health Service (`apps/services/health`)

**Purpose:** Health tracking, readiness scoring, daily intelligence, and report generation.

**Tech Stack:** Cloudflare Workers + Hono + D1 + R2 + Queues + Workers AI

#### Endpoints

##### Readiness
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/readiness/today` | Get today's readiness score |
| `POST` | `/api/v1/readiness/recalculate` | Recalculate readiness |
| `GET` | `/api/v1/readiness/history` | Get readiness history |
| `GET` | `/api/v1/readiness/factors` | Get readiness factor details |

##### Check-in
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/checkin` | Submit daily check-in |

##### Actions
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/actions` | Get today's actions |
| `PATCH` | `/api/v1/actions/:id` | Update action status |

##### Charts
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/charts` | Get available chart definitions |
| `GET` | `/api/v1/charts/:metric` | Get chart data for metric |
| `POST` | `/api/v1/charts/batch` | Get multiple charts |

##### Daily Intelligence
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/intelligence` | Get today's intelligence |
| `GET` | `/api/v1/intelligence/weekly` | Get weekly summary |

##### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/reports/schedules` | Create schedule |
| `GET` | `/api/v1/reports/schedules` | Get schedules |
| `POST` | `/api/v1/reports/reports/generate` | Generate report |
| `GET` | `/api/v1/reports/reports` | List reports |
| `GET` | `/api/v1/reports/reports/:id/download` | Download report |

#### Readiness Factors (13 total)
1. Sleep quality and duration
2. Daily activity levels
3. Heart rate variability (HRV)
4. Stress levels
5. Recovery status
6. Nutrition adherence
7. Hydration levels
8. Mood/energy from check-in
9. Recent training load
10. Environmental factors
11. Illness/medication indicators
12. Data completeness
13. Historical patterns

---

### 3. Coach Service (`apps/services/coach`)

**Purpose:** AI-powered workout coaching, exercise form detection, and workout planning.

**Tech Stack:** Cloudflare Workers + Hono + D1 + Queues + Workers AI

#### Endpoints

##### Exercises
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/exercises/` | List all exercises |
| `GET` | `/api/v1/exercises/:code` | Get exercise details |
| `GET` | `/api/v1/exercises/:code/rules` | Get form rules |

##### Plans
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/plans/active` | Get active plan |
| `GET` | `/api/v1/plans/` | List all user plans |
| `POST` | `/api/v1/plans/` | Create plan |
| `PUT` | `/api/v1/plans/:planId` | Update plan |
| `POST` | `/api/v1/plans/:planId/activate` | Activate plan |
| `POST` | `/api/v1/plans/:planId/archive` | Archive plan |

##### Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/sessions/` | List user sessions |
| `GET` | `/api/v1/sessions/active` | Get active session |
| `POST` | `/api/v1/sessions/start` | Start new session |
| `PATCH` | `/api/v1/sessions/:sessionId/checkpoint` | Update checkpoint |
| `POST` | `/api/v1/sessions/:sessionId/sets` | Submit set summary |
| `POST` | `/api/v1/sessions/:sessionId/complete` | Complete session |
| `POST` | `/api/v1/sessions/:sessionId/corrections` | Submit correction |

##### Progress
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/progress/summary` | Get progress summary |
| `GET` | `/api/v1/progress/exercises/:code` | Get exercise progress |
| `GET` | `/api/v1/progress/history` | Get workout history |
| `GET` | `/api/v1/progress/trends` | Get trends |
| `GET` | `/api/v1/progress/goals` | Get user goals |
| `PUT` | `/api/v1/progress/goals` | Update goals |

##### AI Planning
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/planning/request` | Request AI plan |
| `GET` | `/api/v1/planning/jobs` | List planning jobs |
| `GET` | `/api/v1/planning/jobs/:jobId` | Get job status |
| `POST` | `/api/v1/planning/adjust` | Request adjustment |

---

### 4. Nutrition Service (`apps/services/nutrition`)

**Purpose:** Meal tracking, food catalog search, AI meal analysis, and nutrition planning.

**Tech Stack:** Cloudflare Workers + Hono + D1 + R2 + Queues + Workers AI

#### Endpoints

##### Meals
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/meals/` | Create manual meal |
| `GET` | `/api/v1/meals/` | List meals (with date filter) |
| `GET` | `/api/v1/meals/today` | Get today's meals |
| `GET` | `/api/v1/meals/:id` | Get meal by ID |
| `PUT` | `/api/v1/meals/:id` | Update meal |
| `DELETE` | `/api/v1/meals/:id` | Soft delete meal |

##### Foods
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/foods/search` | Search food catalog |
| `GET` | `/api/v1/foods/:id` | Get food by ID |
| `GET` | `/api/v1/foods/:id/nutrition` | Get nutrition for quantity |
| `POST` | `/api/v1/foods/corrections` | Save food correction |

##### Plans
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/plans/:date` | Get meal plan |
| `PUT` | `/api/v1/plans/:date/:mealType` | Update plan entry |
| `POST` | `/api/v1/plans/:date/regenerate` | Regenerate suggestions |

##### Targets
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/targets/` | Get current targets |
| `PUT` | `/api/v1/targets/` | Update targets |
| `POST` | `/api/v1/targets/reset` | Reset to defaults |

##### AI Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/analysis/` | Create analysis |
| `GET` | `/api/v1/analysis/:id/status` | Get status |
| `GET` | `/api/v1/analysis/:id` | Get analysis result |
| `POST` | `/api/v1/analysis/:id/image` | Upload image |
| `POST` | `/api/v1/analysis/:id/confirm` | Confirm and create meal |

##### Upload
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/upload/request` | Request upload URL |
| `POST` | `/api/v1/upload/` | Direct upload |
| `DELETE` | `/api/v1/upload/:r2Key` | Delete image |
| `GET` | `/api/v1/upload/presigned/:r2Key` | Get presigned URL |

---

### 5. Mail Service (`apps/services/mail`)

**Purpose:** Transactional email sending via Resend API, queue-based processing.

**Tech Stack:** Cloudflare Workers + Resend + Queues

#### Queue Consumers

##### Email Queue (`emailQueue`)
- `auth.email_verification_code` - Verification emails
- Handles retry logic and dead-letter queue

##### Report Queue (`reportDeliverQueue`)
- `health.weekly_report_ready`
- `health.monthly_report_ready`
- `health.custom_report_ready`

#### Templates
1. Email verification code
2. Weekly health report
3. Monthly health report
4. Custom health report

**Features:**
- Bilingual support (English, Vietnamese)
- HTML and plain text versions
- XSS protection via `escapeHtml()`
- Responsive design

---

### 6. API Gateway (`apps/services/gateway`)

**Purpose:** Unified entry point with routing, rate limiting, circuit breaker, and metrics.

**Tech Stack:** Cloudflare Workers + Hono

#### Routes
```
/health                    # Gateway health check
/metrics                   # Prometheus metrics
/swagger                   # Swagger documentation
/api/v1/auth/*           # → Auth service
/api/v1/health/*         # → Health service
/api/v1/coach/*          # → Coach service
/api/v1/nutrition/*      # → Nutrition service
/api/v1/mail/*           # → Mail service
```

#### Features
- **Service Routing**: Routes to backend services (Service Bindings in prod, HTTP in dev)
- **Rate Limiting**: In-memory per-IP rate limiting (100/min)
- **CORS**: Configurable allowlist
- **Circuit Breaker**: Prevents cascading failures
- **Metrics**: Request/response metrics and latency tracking
- **Health Checks**: Aggregated health status for all services

---

## 🔷 Packages Documentation

### Shared Type Packages

| Package | Purpose | Key Exports |
|---------|---------|------------|
| `@repo/common-types` | Shared utilities | UUID, date helpers, validation |
| `@repo/health-types` | Health domain | Readiness schemas, chart configs |
| `@repo/fitness-types` | Fitness domain | Exercise types, pose detection |
| `@repo/nutrition-types` | Nutrition domain | Meal schemas, AI analysis |
| `@repo/queue-types` | Queue messages | Event schemas, message types |

### Core Packages

| Package | Purpose | Key Exports |
|---------|---------|------------|
| `@repo/auth-core` | JWT & auth | JWTService, requireAuth middleware |
| `@repo/middleware` | Workers middleware | Rate limiter, CORS, errors |
| `@repo/observability` | Logging/metrics | Logger, metrics, tracing |
| `@repo/swagger-utils` | API docs | Spec builder, Swagger handler |

### Engine Packages

| Package | Purpose |
|---------|---------|
| `@repo/exercise-engine` | WebAssembly pose detection |
| `@repo/health-engine` | Readiness calculation |
| `@repo/nutrition-engine` | Nutrition calculations |
| `@repo/analytics-engine` | Analytics processing |
| `@repo/readiness-engine` | Readiness scoring |
| `@aivo/wasm-gateway` | WASM module loader |

---

## 🔷 Applications Documentation

### Web Application (`apps/web`)

**Framework:** Next.js 16.3.2 with App Router

#### Page Structure
```
/                           # Landing page (public)
/login                      # OAuth login
/register                   # Registration
/[locale]/                  # Authenticated pages
├── dashboard/             # Today's Daily Intelligence
├── plan/                   # Daily plan overview
├── coach/                  # AI Coach chat
├── health/
│   ├── readiness/         # Readiness details
│   ├── sleep/             # Sleep tracking
│   ├── activity/          # Steps & activity
│   ├── hydration/         # Water intake
│   ├── body/              # Body metrics
│   ├── habits/            # Habit tracking
│   └── nutrition/         # Nutrition module
├── progress/               # Analytics dashboard
├── reports/               # Health reports
├── notifications/         # Notification center
├── profile/               # User profile
├── security/              # Security settings
├── settings/              # App settings
├── integrations/          # Third-party integrations
└── admin/                 # Admin panel
```

#### Components
- **`components/shell/`** - AppShell, Sidebar, TopHeader, MobileNavigation
- **`components/shared/`** - ScoreRing, MetricCard, ChartCard
- **`components/ui/`** - Button, Card, Badge, Input, Avatar, Accordion
- **`components/landing/`** - Hero, Features, Pricing, Testimonials

#### Backend Connection
```
Web App → API Gateway (Port 4000) → Backend Services
```

---

### Mobile Application (`apps/mobile`)

**Framework:** React Native 0.86.3 + Expo SDK 57

#### App Structure (File-based Routing with expo-router)

```
app/
├── _layout.tsx                    # Root layout with AuthGuard
├── (auth)/
│   ├── login/
│   ├── callback/
│   ├── verification-pending/
│   └── suspended/
├── (tabs)/
│   ├── today/                      # Daily Intelligence
│   ├── plan/                      # Daily Plan
│   ├── coach/                     # AI Workout Coach
│   ├── progress/                  # Analytics
│   └── more/                      # Settings & Profile
├── health/
│   └── readiness/
├── meals/
│   ├── nutrition/
│   └── meal-camera/
├── workouts/
│   └── dashboard/
├── reports/
├── profile/
├── security/
└── settings/
```

#### Features
- **OAuth Authentication** with PKCE and expo-crypto
- **Secure Token Storage** with expo-secure-store
- **Pose Detection** with MediaPipe Tasks Vision
- **AI Coach** with expo-speech for audio
- **Haptic Feedback** with expo-haptics

---

## 🔷 Code Review Findings

### Critical Issues (Fix Immediately)

#### 1. In-Memory Rate Limiting
**Location:** Auth service, Gateway, all services
**Issue:** Rate limiting uses in-memory Map which resets between requests in edge environment
**Impact:** Rate limiting ineffective in production
**Recommendation:** Use Cloudflare KV for distributed rate limiting

#### 2. OAuth State in Memory
**Location:** Auth service (`services/auth.ts`)
**Issue:** `oauthStates` Map is in-memory, state lost between requests
**Impact:** OAuth flow may fail randomly
**Recommendation:** Store state in D1 or KV with TTL

#### 3. PUT Meal Endpoint Doesn't Persist
**Location:** Nutrition service (`routes/meals.ts`)
**Issue:** Update logic exists but never actually executes
**Impact:** Meal updates don't work
**Recommendation:** Implement actual database update

#### 4. Verification Code Logging
**Location:** Auth service (`routes/register.ts:117`)
**Issue:** Raw verification codes logged to console
**Impact:** Codes visible in production logs
**Recommendation:** Remove logging or use debug flag

### High Priority Issues

#### 5. Role-Based Auth Not Enforced
**Location:** Nutrition service (`middleware/auth.ts`)
**Issue:** `requireRole()` middleware exists but does nothing
**Impact:** Admin endpoints accessible to regular users
**Recommendation:** Implement role validation

#### 6. Chart Ranges Imported Twice
**Location:** Health service (`routes/index.ts`)
**Issue:** `CHART_RANGES` imported from two different sources
**Impact:** Confusing, potential bugs
**Recommendation:** Use single source

#### 7. No Rate Limiting on AI Endpoints
**Location:** Coach service (planning endpoints)
**Issue:** Expensive AI calls have no rate limiting
**Impact:** Cost overruns possible
**Recommendation:** Add rate limiting

#### 8. User ID Race Condition
**Location:** Coach service (`applyAdjustedPlan`)
**Issue:** `bind` is async but user_id used synchronously
**Impact:** Data inconsistency
**Recommendation:** Await bind before using user_id

### Medium Priority Issues

#### 9. Presigned URLs Not Implemented
**Location:** Nutrition service (`routes/upload.ts`)
**Issue:** Returns internal reference instead of actual presigned URL
**Impact:** External clients can't download images
**Recommendation:** Implement R2 presigned URL generation

#### 10. In-Memory Deduplication
**Location:** Mail service (`services/consumer.ts`)
**Issue:** Deduplication store won't work across instances
**Impact:** Duplicate emails possible
**Recommendation:** Use message ID as queue ID

#### 11. N+1 Query Problem
**Location:** Nutrition service (`listMeals`)
**Issue:** Fetches items for each meal separately
**Impact:** Performance degradation
**Recommendation:** Use JOIN or batch queries

#### 12. Macro Validation Lenient
**Location:** Nutrition service (`routes/targets.ts`)
**Issue:** Accepts sum 95-105% instead of exactly 100%
**Impact:** Invalid macro distributions allowed
**Recommendation:** Require exactly 100%

### Low Priority Issues

#### 13. TypeScript Version Mismatch
**Location:** `fitness-types/package.json`
**Issue:** `"typescript": "7.0.2"` doesn't exist
**Impact:** Build errors
**Recommendation:** Change to `"typescript": "^5.0.0"`

#### 14. Copyright Year Hardcoded
**Location:** Mail service templates
**Issue:** `© 2024 AIVO` - needs dynamic year
**Recommendation:** Use `new Date().getFullYear()`

#### 15. Sequential Chart Processing
**Location:** Health service (`getMultipleChartData`)
**Issue:** Charts processed sequentially
**Recommendation:** Process in parallel with Promise.all

---

## 🔷 Development Guide

### Prerequisites

- Node.js >= 24
- pnpm >= 11.23.0
- Wrangler CLI (`npx wrangler`)
- Cloudflare account (for deployment)

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment files
cp .env.example .env
cp apps/services/auth/.env.example apps/services/auth/.env
cp apps/services/health/.env.example apps/services/health/.env
# ... repeat for other services

# Start all services in development
pnpm dev

# Or start specific service
pnpm dev:auth      # Auth service
pnpm dev:health    # Health service
pnpm dev:coach     # Coach service
pnpm dev:nutrition # Nutrition service
pnpm dev:mail      # Mail service
pnpm dev:gateway   # API Gateway
pnpm dev:web       # Web app
pnpm dev:mobile    # Mobile app
```

### Available Commands

```bash
# Build all packages
pnpm build

# Type check all packages
pnpm check-types

# Lint all packages
pnpm lint

# Format code
pnpm format

# Run tests
pnpm test
```

### Environment Variables

#### Auth Service
```bash
AUTH_JWT_PRIVATE_KEY=<base64-encoded-private-key>
AUTH_JWT_PUBLIC_KEY=<base64-encoded-public-key>
AUTH_JWT_ISSUER=aivo
AUTH_JWT_AUDIENCE=aivo-app
AUTH_JWT_ACCESS_TOKEN_TTL=900
```

#### Gateway
```bash
AUTH_SERVICE_URL=http://localhost:3001
HEALTH_SERVICE_URL=http://localhost:3002
COACH_SERVICE_URL=http://localhost:3003
NUTRITION_SERVICE_URL=http://localhost:3004
MAIL_SERVICE_URL=http://localhost:3005
ALLOWED_ORIGINS=http://localhost:3000,https://aivo.app
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
```

#### Common
```bash
WEB_APP_URL=https://app.aivo.app
MOBILE_REDIRECT_URI=aivo://callback
```

### Deployment

```bash
# Deploy individual service
cd apps/services/auth
npx wrangler deploy

# Deploy web app
cd apps/web
pnpm build
# Deploy to Vercel or Cloudflare Pages

# Deploy mobile app
cd apps/mobile
pnpm prebuild
# Build iOS/Android with Expo
```

---

## 🔷 API Reference

### Authentication Flow

```
1. User registers/logs in via /register or /oauth/start
2. Auth service returns JWT access token (15min) + refresh token (7 days)
3. Client stores tokens (cookies for web, SecureStore for mobile)
4. All API requests include: Authorization: Bearer <token>
5. Token refresh via POST /auth/refresh when expired
```

### Request Format

```typescript
// All requests to backend services
{
  headers: {
    'Authorization': 'Bearer <access_token>',
    'Content-Type': 'application/json',
    'X-Request-ID': '<uuid>' // Optional, generated if not provided
  }
}

// Query parameters for filtering
GET /api/v1/health/charts/calories?range=7d&target=2000
```

### Response Format

```typescript
// Success
{
  "success": true,
  "data": { ... }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": { ... }
  }
}
```

### Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Auth (register) | 5 | per IP/hour |
| Auth (login) | 10 | per IP/hour |
| API Gateway | 100 | per IP/minute |
| AI Analysis | 20 | per user/day |

---

## 📊 Project Statistics

| Metric | Count |
|--------|-------|
| Services | 6 |
| Shared Packages | 20+ |
| Web App Pages | 25+ |
| Mobile App Screens | 30+ |
| API Endpoints | 100+ |
| Zod Schemas | 50+ |

---

## 🛠️ Troubleshooting

### Common Issues

#### Type Errors with globalThis
```typescript
// ❌ Wrong
globalThis.crypto.randomUUID()

// ✅ Correct
const crypto = globalThis as unknown as { crypto?: CryptoGlobal };
crypto?.randomUUID?.()
```

#### Zod v4 API Changes
```typescript
// Use error.issues instead of error.errors
const issues = error.issues;

// z.record() requires two arguments
z.record(z.string(), z.number())
```

#### Module Resolution
```typescript
// Use .js extensions in imports for ESM
import { xyz } from './xyz.js';

// Use moduleResolution: "bundler" in tsconfig
```

---

## 📝 Contributing

1. Create feature branch from `main`
2. Follow ESLint configuration
3. Add tests for new features
4. Ensure all CI checks pass
5. Submit pull request

---

*Last Updated: September 2026*
