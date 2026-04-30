# AIVO - AI-Powered Fitness Platform

**High-performance fitness platform with AI-native conversational coaching**

A modern monorepo built with Next.js 15, React Native (Expo), Cloudflare Workers, Rust/WASM, and D1 SQL.

## Quick Links

### Core Documentation

| Component | Documentation | Description |
|-----------|---------------|-------------|
| **Web App** | [WEB.md](./docs/WEB.md) | Next.js 15 frontend with App Router, Tailwind CSS, Cloudflare Pages deployment |
| **Mobile App** | [APP.md](./docs/APP.md) | React Native + Expo mobile app with NativeWind, EAS Build |
| **API** | [API.md](./docs/API.md) | Hono backend on Cloudflare Workers, D1 database, OAuth, AI services |
| **Database** | [DB.md](./docs/DB.md) | D1 + Drizzle ORM schema, migrations, 14 core tables, performance |
| **Compute** | [COMPUTE.md](./docs/COMPUTE.md) | Rust/WASM performance module for fitness calculations |

### Migration & Reference

- **[MIGRATION_GUIDE.md](./docs/MIGRATION_GUIDE.md)** - Documentation structure overview and file mapping
- **[COST_MODEL.csv](./docs/COST_MODEL.csv)** - AI model pricing and cost optimization data

### Additional Resources (Not in Core 5)

These documents remain in `/docs/` but are not part of the consolidated core documentation:

- Security audits and reviews
- Design system specifications
- Architecture decision records (ADR)
- Product feature specifications
- End-user guides

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend Web** | Next.js 15 (App Router) | React framework with SSR/SSG |
| **Frontend Mobile** | React Native + Expo | Cross-platform mobile app |
| **Backend** | Hono + Cloudflare Workers | Edge API with global distribution |
| **Database** | Cloudflare D1 + Drizzle ORM | Serverless SQL with type safety |
| **Compute** | Rust → WebAssembly | High-performance fitness math |
| **Storage** | Cloudflare R2 | Image and file storage |
| **AI** | OpenAI GPT-4o + Google Gemini | Intelligent coaching with model selector |
| **Styling** | Tailwind CSS / NativeWind | Utility-first CSS |
| **Monorepo** | pnpm + Turborepo | Package management and builds |

## Project Structure

```
aivo/
├── apps/
│   ├── web/          # Next.js 15 web application
│   ├── mobile/       # React Native Expo app
│   └── api/          # Cloudflare Workers API
├── packages/
│   ├── db/           # Drizzle ORM schema & migrations
│   ├── compute/      # Rust/WASM compute module
│   └── shared-types/ # TypeScript type definitions
├── docs/             # Documentation (see above)
├── scripts/          # Build and deployment scripts
└── .github/          # CI/CD workflows
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Rust (for WASM development)
- Wrangler CLI (for Cloudflare deployment)

### Development Setup

```bash
# 1. Clone and install dependencies
pnpm install

# 2. Set up environment variables
./scripts/setup-env.sh

# 3. Generate secrets
./scripts/generate-secrets.sh

# 4. Start all services in development
pnpm run dev
```

### Component-Specific Setup

- **[Web](./docs/WEB.md#quick-start)** - `cp apps/web/.env.local.example .env.local && cd apps/web && pnpm run dev`
- **[Mobile](./docs/APP.md#quick-start)** - `cp apps/mobile/.env.example .env && cd apps/mobile && pnpm start`
- **[API](./docs/API.md#quick-start)** - `cp apps/api/.env.example .env && cd apps/api && pnpm run dev`
- **[Database](./docs/DB.md#quick-start)** - `pnpm --filter @aivo/db exec drizzle-kit studio`
- **[Compute](./docs/COMPUTE.md#quick-start)** - `pnpm run build:wasm`

## Key Features

### AI-Powered Coaching
- Intelligent workout planning with adaptive rescheduling
- Natural language chat interface
- Memory-based personalization
- Multi-model support (OpenAI + Google Gemini)

### Fitness Tracking
- Workout logging with exercise libraries
- Routine building and scheduling
- Body metrics tracking with charts
- Nutrition logging with food database

### Social & Gamification
- Streak tracking and streak freezes
- Points and leveling system
- Leaderboards (global and friends)
- Achievement badges
- Activity feed
- Social clubs (planned)

### Cross-Platform
- Web: Next.js with Cloudflare Pages
- Mobile: React Native with Expo
- API: Cloudflare Workers edge computing
- Real-time sync across devices

## Deployment

### Continuous Deployment

The repository uses GitHub Actions for automated deployment:

- **API** - Deploys to Cloudflare Workers on push to `main`
- **Web** - Deploys to Cloudflare Pages on push to `main`

See [.github/workflows/cd.yml](./.github/workflows/cd.yml) for the full CI/CD pipeline.

### Manual Deployment

```bash
# Deploy API
./scripts/deploy.sh

# Deploy Web
./scripts/deploy-web-pages.sh
```

## Environment Variables

### API (`apps/api/.env`)
```
AUTH_SECRET=openssl rand -hex 64
GOOGLE_CLIENT_ID=your-google-client-id
FACEBOOK_APP_ID=your-fb-app-id
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
```

### Web (`apps/web/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
NEXT_PUBLIC_FACEBOOK_CLIENT_ID=your-fb-app-id
NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-...r2.dev
```

### Mobile (`apps/mobile/.env`)
```
EXPO_PUBLIC_API_URL=http://localhost:8787
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
EXPO_PUBLIC_FACEBOOK_CLIENT_ID=your-fb-app-id
EXPO_PUBLIC_SCHEME=aivo
```

See individual documentation files for complete environment variable reference.

## Development Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Build WASM only
pnpm run build:wasm

# Type check all packages
pnpm run type-check

# Lint all packages
pnpm run lint

# Clean all builds
pnpm run clean

# Run everything in dev mode
pnpm run dev
```

## Architecture Highlights

### Why WASM for Compute?
- Near-native performance for math-intensive operations
- Type-safe Rust code compiled to WebAssembly
- Runs in Workers, browsers, and React Native
- Sandboxed execution environment

### Why D1 + Drizzle?
- Serverless SQL with zero configuration
- Type-safe queries with Drizzle ORM
- Built-in migrations and schema management
- Seamless Cloudflare Workers integration

### Why Hono?
- Lightweight and fast
- Full compatibility with Workers
- Built-in middleware (CORS, auth, rate limiting)
- Type-safe routing and handlers

## Authentication

AIVO uses **Google and Facebook OAuth exclusively** - no email/password login.

**OAuth Flow:**
1. User clicks "Sign in with Google/Facebook"
2. OAuth provider returns ID token/access token
3. API verifies token and creates/fetches user
4. API issues JWT valid for 7 days
5. Client stores JWT and includes in subsequent requests

See [API.md](./docs/API.md#authentication--security) for full implementation details.

## API Reference

All API endpoints documented in [API.md](./docs/API.md#api-reference):

- `POST /api/auth/google` - Google OAuth
- `POST /api/auth/facebook` - Facebook OAuth
- `POST /api/auth/verify` - Verify JWT
- `POST /api/ai/chat` - AI coaching with model selection
- `GET/POST /api/workouts` - Workout CRUD
- `POST /api/nutrition/logs` - Food logging
- `GET /api/gamification/streak/:userId` - Streak tracking
- And more...

Standard response format, error codes, pagination, and rate limiting documented.

## Database Schema

14 core tables documented in [DB.md](./docs/DB.md#database-schema):

- `users` - User accounts
- `sessions` - OAuth sessions
- `conversations` - AI chat history
- `memoryNodes` / `memoryEdges` - Semantic memory graph
- `workoutRoutines` / `routineExercises` - Workout templates
- `dailySchedules` - AI-generated schedules
- `workouts` / `workoutCompletions` - Actual workouts
- `bodyMetrics` / `bodyInsights` - Body tracking
- `userGoals` - Fitness goals
- `dailySummaries` - Materialized aggregates
- `planDeviations` - Routine adjustments

Plus 12 social feature tables (planned).

## WASM Compute Modules

Rust/WASM modules in [COMPUTE.md](./docs/COMPUTE.md):

- **AdaptivePlanner** - Deviation scoring, reschedule decisions
- **CorrelationAnalyzer** - Exercise-soreness correlations
- **TokenOptimizer** - Context trimming for AI prompts
- **ImageProcessor** - Photo optimization for vision AI

Benchmarks show 7-8x speedup over JavaScript equivalents.

## Contributing

This is a private project. For internal contributors:

1. Read the relevant component documentation
2. Follow the coding guidelines in CLAUDE.md
3. Ensure all tests pass before committing
4. Include WASM rebuild for Rust changes
5. Generate migrations for schema changes

## License

Proprietary - All rights reserved

---

**Questions?** Check the component-specific documentation linked above.

**Found an issue?** Create an issue in the repository.
