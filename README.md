<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/logo.svg">
    <source media="(prefers-color-scheme: light)" srcset="./assets/logo.svg">
    <img src="./assets/logo.svg" alt="AIVO Logo" width="120" height="120">
  </picture>

# AIVO - AI-Powered Health & Fitness Platform

*AI-POWERED · INTELLIGENT · FOR YOU*

AIVO is a comprehensive monorepo containing microservices and applications for an AI-powered health, fitness, and nutrition coaching platform. Built with modern technologies including Cloudflare Workers, Next.js, React Native (Expo), and TypeScript.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2057-black.svg)](https://expo.dev/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-orange.svg)](https://workers.cloudflare.com/)
[![License](https://img.shields.io/badge/License-Private-red.svg)](#license)
</div>

## 🎯 Project Overview

AIVO provides:
- **Daily Intelligence**: Readiness scores, AI-powered health insights, and personalized recommendations
- **AI Coaching**: Real-time pose detection, workout tracking, and form correction
- **Nutrition Tracking**: Meal analysis, calorie tracking, and personalized meal planning
- **Health Reports**: Weekly/monthly PDF reports with AI-generated summaries

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                     │
│  ┌──────────────────┐    ┌──────────────────┐    ┌────────────────┐ │
│  │   Web App        │    │   Mobile App     │    │   Third-party  │ │
│  │   (Next.js 16)   │    │   (Expo SDK 57)  │    │   Integrations │ │
│  └────────┬─────────┘    └────────┬─────────┘    └───────┬────────┘ │
└───────────┼───────────────────────┼──────────────────────┼──────────┘
            │                       │                      │
            └───────────────────────┼──────────────────────┘
                                    │
                           ┌────────▼────────┐
                           │   API Gateway   │
                           │   (aivo-gateway)│
                           └────────┬────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
    ┌────▼────┐   ┌───────────▼───┐   ┌───────────▼───┐   ┌──▼──────┐
    │  Auth   │   │    Health     │   │    Coach      │   │ Nutrition│
    │ Service │   │    Service    │   │    Service    │   │ Service │
    └────┬────┘   └───────┬───────┘   └───────┬───────┘   └───┬──────┘
         │                │                    │                │
         │           ┌─────▼─────┐       ┌─────▼─────┐   ┌─────▼─────┐
         │           │   Queue    │       │   Queue    │   │   Queue    │
         │           │  Consumer  │       │  Consumer  │   │  Consumer  │
         │           └─────┬─────┘       └─────┬─────┘   └─────┬─────┘
         │                │                    │                │
         │           ┌─────▼─────┐       ┌─────▼─────┐   ┌─────▼─────┐
         │           │   Mail     │       │   WASM     │   │   AI      │
         │           │  Service   │       │  Gateway   │   │  Gateway  │
         │           └────────────┘       └───────────┘   └───────────┘
         │
    ┌────▼────────────────────────────┐
    │         Shared Packages           │
    │  • @aivo/common-types           │
    │  • @aivo/health-types           │
    │  • @aivo/fitness-types         │
    │  • @aivo/nutrition-types       │
    │  • @aivo/queue-types           │
    │  • @aivo/exercise-engine       │
    │  • @aivo/wasm-gateway          │
    │  • @aivo/api-client            │
    │  • @aivo/middleware            │
    └─────────────────────────────────┘
```

## 📁 Project Structure

```
aivo/
├── apps/
│   ├── web/                    # Next.js 16 web application
│   │   ├── app/                # App Router pages
│   │   ├── components/         # React components
│   │   └── lib/               # API clients
│   │
│   ├── mobile/                # React Native mobile app (Expo SDK 57)
│   │   ├── app/               # Expo Router screens
│   │   ├── components/        # Mobile components
│   │   ├── hooks/             # Custom hooks
│   │   ├── lib/               # Utilities
│   │   └── services/          # API services
│   │
│   └── services/              # Cloudflare Workers microservices
│       ├── auth/              # Authentication & user management
│       │   ├── src/
│       │   │   ├── db/       # D1 database operations
│       │   │   ├── lib/      # JWT, tokens
│       │   │   ├── middleware/# Auth middleware
│       │   │   ├── providers/ # OAuth providers
│       │   │   ├── routes/   # API routes
│       │   │   ├── services/ # Business logic
│       │   │   └── types/    # Type definitions
│       │   ├── test/         # Tests
│       │   ├── wrangler.jsonc
│       │   └── package.json
│       │
│       ├── health/            # Health tracking & readiness engine
│       │   ├── src/
│       │   │   ├── db/       # D1 database operations
│       │   │   ├── lib/      # Readiness engine, reports
│       │   │   ├── middleware/# Auth middleware
│       │   │   ├── routes/   # API routes
│       │   │   └── types/    # Type definitions
│       │   ├── test/         # Tests
│       │   ├── wrangler.jsonc
│       │   └── package.json
│       │
│       ├── coach/             # AI workout coaching
│       ├── nutrition/         # Meal planning & nutrition tracking
│       ├── mail/              # Email service (Resend)
│       └── gateway/           # API Gateway (unified entry point)
│
├── packages/                  # Shared libraries
│   ├── api-client/           # API client utilities
│   ├── common-types/         # Shared TypeScript types & utilities
│   ├── design-system/        # Shared design components
│   ├── eslint-config/        # ESLint configurations
│   ├── exercise-engine/      # WebAssembly-based pose detection (TS)
│   ├── fitness-types/        # Fitness domain types (Zod schemas)
│   ├── health-types/         # Health domain types (Zod schemas)
│   ├── middleware/           # Shared middleware (Hono)
│   ├── nutrition-types/      # Nutrition domain types (Zod schemas)
│   ├── queue-types/          # Queue message types
│   ├── report-types/         # Health report types
│   ├── swagger-utils/        # Swagger/OpenAPI utilities
│   ├── typescript-config/    # TypeScript configurations
│   ├── ui/                   # React UI components
│   └── wasm-gateway/         # WASM module loader & executor

├── packages/wasm/               # WASM Engines
│   ├── wasm-core/              # Shared Rust utilities (math, validation, geometry)
│   ├── readiness-engine/       # Deterministic readiness scoring
│   ├── health-engine/          # BMI, BMR, TDEE calculations
│   ├── nutrition-engine/        # Macro calculations, meal aggregation
│   └── analytics-engine/        # Time-series processing

├── turbo.json               # Turborepo configuration
├── pnpm-workspace.yaml      # pnpm workspace definition
└── package.json             # Root package.json
```

## 🔧 Technologies

| Layer | Technology | Version |
|-------|------------|---------|
| Web App | Next.js | 16.x |
| Mobile App | React Native (Expo) | SDK 57 |
| Services | Cloudflare Workers + Hono | - |
| Language | TypeScript | 5.x / 7.x |
| WASM Engines | Rust | stable |
| Validation | Zod | 4.x |
| Auth | JWT (ES256) | - |
| Deployment | Cloudflare | - |
| Package Manager | pnpm | 11.x |
| Monorepo | Turborepo | 2.x |

## ⚡ WASM Engines

AIVO uses WebAssembly for computation-intensive, deterministic operations:

### Engine Architecture

```
packages/wasm/
├── wasm-core/           # Shared utilities (math, validation, geometry, stats)
├── exercise-engine/     # Pose detection and exercise analysis (Rust)
├── readiness-engine/     # Readiness score calculation (Rust)
├── health-engine/       # BMI, BMR, TDEE calculations
├── nutrition-engine/     # Macro calculations, meal aggregation
└── analytics-engine/    # Time-series processing

packages/wasm-gateway/    # Unified TypeScript adapter
```

### Why WASM?

- **Deterministic results** across Web, Mobile, and Cloudflare Workers
- **Performance** for real-time exercise analysis
- **Code sharing** across platforms
- **Offline capability** for mobile

### Engines

| Engine | Purpose | Runtime |
|--------|---------|---------|
| exercise-engine | Pose detection, form analysis | Rust/WASM |
| readiness-engine | Daily readiness scoring | Rust/WASM |
| health-engine | BMI, BMR, TDEE | TypeScript |
| nutrition-engine | Macro calculations | TypeScript |
| analytics-engine | Time-series analytics | TypeScript |

### Building WASM

```bash
# Build all WASM modules
pnpm wasm:build

# Build specific engine
cd packages/readiness-engine
wasm-pack build --target bundler --out-dir dist
```

### Fallback Strategy

- Exercise engine: **WASM required** (core feature)
- Other engines: **TypeScript fallback** available

## 🚀 Getting Started

### Prerequisites

- Node.js >= 24
- pnpm >= 11.x
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account (for deployment)

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Development

```bash
# Start all services in development mode
pnpm dev

# Start specific service
cd apps/services/auth
pnpm dev

# Start web app
cd apps/web
pnpm dev

# Start mobile app
cd apps/mobile
pnpm dev
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests for specific package
cd packages/health-types
pnpm test
```

### Type Checking

```bash
pnpm check-types
```

### Linting

```bash
pnpm lint
```

## 📦 Services

### Auth Service (`apps/services/auth`)

**Port:** 3001

Handles:
- User registration and authentication
- JWT token management (access + refresh tokens)
- OAuth integration (Google, Facebook)
- Email verification
- Session management
- Admin user management

**Key Endpoints:**
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh tokens
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/oauth/start` - Start OAuth flow
- `GET /api/v1/oauth/callback/:provider` - OAuth callback

**Database:** D1 (`aivo-auth-db`)

### Health Service (`apps/services/health`)

**Port:** 3004

Handles:
- Daily Readiness calculation
- Daily Intelligence aggregation
- Health data tracking
- AI-powered health insights
- Health report generation (PDF)
- Report scheduling

**Key Endpoints:**
- `GET /api/v1/health/readiness/today` - Today's readiness
- `POST /api/v1/health/checkin` - Submit daily check-in
- `GET /api/v1/health/intelligence` - Daily intelligence
- `GET /api/v1/health/charts/:metric` - Chart data
- `POST /api/v1/reports` - Create report
- `GET /api/v1/reports` - List reports

**Database:** D1 (`aivo-health-db`)
**Storage:** R2 (`aivo-health-reports`)

### Coach Service (`apps/services/coach`)

Handles:
- Workout planning
- Session tracking
- Exercise definitions
- Progress tracking
- Plan adjustment

**Key Endpoints:**
- `GET /api/v1/coach/plans` - Get workout plans
- `POST /api/v1/coach/sessions` - Start workout session
- `PUT /api/v1/coach/sessions/:id` - Update session
- `GET /api/v1/coach/progress` - Progress tracking

### Nutrition Service (`apps/services/nutrition`)

Handles:
- Meal tracking
- Food analysis (AI-powered)
- Meal planning
- Nutrition calculations
- Calorie/macro tracking

**Key Endpoints:**
- `POST /api/v1/nutrition/meals` - Log meal
- `POST /api/v1/nutrition/upload` - Upload meal image
- `GET /api/v1/nutrition/foods` - Food database
- `GET /api/v1/nutrition/plans` - Meal plans

**Storage:** R2 (meal images)
**AI:** Workers AI for food analysis

### Mail Service (`apps/services/mail`)

Handles:
- Transactional emails (Resend)
- Health report notifications
- Email verification
- Queue-based processing

**Features:**
- Bilingual support (EN/VI)
- Retry logic with DLQ
- Deduplication
- Batch processing

### Gateway Service (`apps/services/gateway`)

**Port:** 4000

Unified API entry point with:
- Service routing
- Rate limiting (in-memory/KV)
- CORS handling
- Circuit breaker
- Metrics
- Swagger documentation

## 📚 Shared Packages

### @aivo/common-types

Shared utilities:
- UUID generation with fallbacks
- Date/time utilities
- Validation helpers
- Common enums

### @aivo/health-types

Health domain types:
- Readiness types & schemas
- Health data types
- Chart configurations
- AI insights types
- Validation functions

### @aivo/fitness-types

Fitness domain types:
- Exercise definitions
- Pose detection types
- Workout session types
- Correction feedback
- WASM engine types

### @aivo/nutrition-types

Nutrition domain types:
- Meal and food schemas
- Nutrition calculations
- AI analysis types
- Chart data

### @aivo/queue-types

Queue message schemas:
- Email verification messages
- Report delivery messages
- Message creators and validators

### @aivo/exercise-engine

Pose detection engine:
- TypeScript implementation
- WASM-ready architecture
- Exercise state machine
- Form evaluation

### @aivo/wasm-gateway

WASM module loader:
- Auto-fallback to TypeScript
- Performance monitoring
- Benchmarking
- Circuit breaker

### @aivo/middleware

Shared middleware:
- Rate limiting
- CORS handling
- Error handling
- Request ID

## 🌐 Web Application

### Pages

- `/` - Landing page
- `/login` - User login
- `/register` - User registration
- `/dashboard` - Main dashboard
- `/health/*` - Health tracking pages
- `/coach/*` - Workout coaching pages
- `/nutrition/*` - Nutrition pages
- `/intelligence` - Daily intelligence
- `/reports` - Health reports
- `/settings/*` - User settings
- `/admin` - Admin panel

### Components

- Landing components (hero, features, pricing, etc.)
- Shell components (sidebar, header)
- UI components (button, card, input, etc.)
- Auth components

## 📱 Mobile Application

### Screens

- Today - Daily overview
- Coach - AI coaching
- Plan - Workout plan
- Progress - Progress tracking
- More - Additional features

### Features

- Expo Router for navigation
- Real-time pose detection
- Haptic feedback
- Camera integration
- Secure token storage

## 🔐 Security

### Authentication
- JWT tokens with ES256 signing
- Access tokens: 15 minutes expiry
- Refresh tokens: 7 days expiry
- Secure HTTP-only cookies

### Input Validation
- Zod schemas for all API inputs
- TypeScript strict mode enabled
- Sanitization for XSS prevention

### Rate Limiting
- Per-IP rate limiting in middleware
- KV-based for distributed environments

## 📊 Monitoring

### Observability
- Cloudflare Observability enabled
- Request logging
- Error tracking
- Performance metrics

### Logging
- Structured logging with request IDs
- Error categorization
- Debug logging in development

## 🚢 Deployment

### Services

```bash
# Deploy auth service
cd apps/services/auth
wrangler deploy

# Deploy health service
cd apps/services/health
wrangler deploy

# Deploy all services
pnpm -r --filter=./apps/services/* deploy
```

### Environment Variables

```bash
# Auth Service
AUTH_JWT_PRIVATE_KEY=<base64-encoded-private-key>
AUTH_JWT_PUBLIC_KEY=<base64-encoded-public-key>

# Health Service
AUTH_SERVICE_URL=https://aivo-auth.workers.dev

# Gateway
AUTH_SERVICE_URL=<auth-service-url>
HEALTH_SERVICE_URL=<health-service-url>
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test --coverage

# Watch mode
pnpm test --watch

# Specific service
cd apps/services/auth && pnpm test
```

## 📈 CI/CD

Turborepo task orchestration:
- `build` - Build all packages
- `check-types` - Type check all packages
- `lint` - Lint all packages
- `test` - Run all tests
- `dev` - Development mode

## 🔧 Configuration

### TypeScript

- Strict mode enabled
- Bundler module resolution
- ESM support with .js extensions

### ESLint

- Prettier integration
- Turbo plugin
- TypeScript ESLint

### Turborepo

- Remote caching
- Task pipeline
- Output logging

## 📝 License

Private - All rights reserved

## 🤝 Contributing

1. Create a feature branch from `main`
2. Follow the ESLint configuration
3. Add tests for new features
4. Ensure all CI checks pass
5. Submit a pull request
