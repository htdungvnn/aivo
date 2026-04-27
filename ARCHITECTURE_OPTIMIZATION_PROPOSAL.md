# AIVO Architecture Optimization Proposal

## Current State Analysis

### 1. Package Structure (16 packages total)

**Core Packages:**
- `@aivo/db` - Drizzle ORM schema & migrations
- `@aivo/shared-types` - 200+ type exports in single file

**WASM Compute Packages (3 separate crates):**
- `@aivo/compute` - Rust WASM (fitness calculations)
- `@aivo/optimizer` - Rust WASM (token optimization)
- `@aivo/infographic-generator` - Rust WASM (infographic generation)

**TypeScript Utility Packages:**
- `@aivo/body-compute` - Body metrics calculations
- `@aivo/memory-service` - AI memory management
- `@aivo/api-client` - Platform-agnostic API client
- `@aivo/email-reporter` - Email reporting
- `@aivo/excel-export` - Excel export

**Config Packages:**
- `@aivo/eslint-config`
- `@aivo/jest-config`

**Apps:**
- `@aivo/web` - Next.js 15 (Cloudflare Pages)
- `@aivo/mobile` - Expo SDK 54
- `@aivo/api` - Cloudflare Workers (Hono)

### 2. Identified Issues

**Structural Problems:**
1. Package proliferation - 16 packages with overlapping concerns
2. WASM packages fragmented - could be unified with feature flags
3. Shared-types is a "dumping ground" - 200+ exports in one file, no domain separation
4. API routes flat structure - 22 route files, 26 service files in root directories
5. Inconsistent package patterns - some export dist, some src, some pkg
6. Unclear domain boundaries - mixing business logic concerns

**Maintenance Issues:**
1. High coupling between packages via shared-types
2. Difficult to test in isolation
3. Build orchestration complexity
4. Unclear ownership of domains
5. Import paths: `@aivo/*` points to different package types (dist, src, pkg)

**Performance & Cloudflare:**
1. WASM assets copied manually via script
2. No clear caching strategy for computed results
3. KV namespace usage could be optimized
4. D1 queries not always batched

### 3. Proposed Optimizations

#### A. Package Reorganization (Feature-Based)

```
packages/
├── core/                      # Core domain packages
│   ├── types/                # Shared types by domain (replaces shared-types)
│   │   ├── user/
│   │   ├── body/
│   │   ├── workout/
│   │   ├── nutrition/
│   │   ├── ai/
│   │   └── index.ts
│   ├── db/                   # Drizzle schema & migrations (existing)
│   └── compute/              # Unified WASM crate with features
│       ├── crates/
│       │   ├── fitness/      # (current aivo-compute)
│       │   ├── optimizer/    # (current optimizer)
│       │   └── infographic/  # (current infographic-generator)
│       └── packages/
│           ├── body-compute/ # Pure TypeScript calculations
│           └── memory/       # Memory service (could merge)
│
├── infrastructure/           # Cloudflare/infra packages
│   ├── api-client/          # HTTP client (existing)
│   ├── email/               # Email service (merge email-reporter)
│   ├── storage/             # R2, D1 utilities (merge excel-export if relevant)
│   └── cache/               # KV namespace abstractions
│
├── config/
│   ├── eslint/
│   ├── jest/
│   ├── typescript/
│   └── turbo/
│
└── apps/
    ├── web/
    ├── mobile/
    └── api/
```

#### B. API Route Organization (Domain-Driven)

```
apps/api/src/
├── routes/
│   ├── auth/
│   │   ├── google.ts
│   │   ├── facebook.ts
│   │   ├── verify.ts
│   │   └── logout.ts
│   ├── users/
│   │   ├── profile.ts
│   │   ├── settings.ts
│   │   └── goals.ts
│   ├── workouts/
│   │   ├── routines.ts
│   │   ├── sessions.ts
│   │   ├── exercises.ts
│   │   └── live/
│   ├── body/
│   │   ├── metrics.ts
│   │   ├── photos.ts
│   │   ├── insights.ts
│   │   └── heatmaps.ts
│   ├── nutrition/
│   │   ├── logs.ts
│   │   ├── goals.ts
│   │   └── analysis.ts
│   ├── ai/
│   │   ├── chat.ts
│   │   ├── replan.ts
│   │   └── vision/
│   ├── export/
│   │   ├── data.ts
│   │   └── reports.ts
│   ├── social/
│   │   ├── gamification.ts
│   │   └── leaderboard.ts
│   ├── admin/
│   │   └── test.ts
│   └── health.ts
├── middleware/
│   ├── auth.ts
│   ├── rate-limit.ts
│   ├── validation.ts
│   └── errors.ts
├── services/
│   ├── ai/
│   │   ├── openai.ts
│   │   ├── anthropic.ts
│   │   └── model-selector.ts
│   ├── memory/
│   │   ├── summarizer.ts
│   │   ├── vector-search.ts
│   │   └── compression.ts
│   ├── compute/
│   │   ├── fitness.ts
│   │   ├── optimizer.ts
│   │   └── posture.ts
│   ├── storage/
│   │   ├── r2.ts
│   │   ├── d1.ts
│   │   └── kv.ts
│   └── notifications/
│       ├── email.ts
│       └── push.ts
└── utils/
```

#### C. Shared Types Organization

```
packages/core/types/
├── user/
│   ├── user.ts
│   ├── auth.ts
│   ├── profile.ts
│   └── index.ts
├── body/
│   ├── metrics.ts
│   ├── photos.ts
│   ├── heatmap.ts
│   ├── vision.ts
│   └── index.ts
├── workout/
│   ├── routine.ts
│   ├── exercise.ts
│   ├── session.ts
│   └── index.ts
├── nutrition/
│   ├── food.ts
│   ├── log.ts
│   ├── goals.ts
│   └── index.ts
├── ai/
│   ├── chat.ts
│   ├── memory.ts
│   ├── models.ts
│   └── index.ts
├── common/
│   ├── api.ts
│   ├── pagination.ts
│   ├── sorting.ts
│   └── index.ts
└── index.ts
```

#### D. Mobile App Organization (Expo Router)

```
apps/mobile/app/
├── (auth)/
│   ├── login/
│   ├── callback/
│   └── index.tsx
├── (tabs)/
│   ├── _layout.tsx
│   ├── index.tsx          # Dashboard
│   ├── workouts/
│   ├── form-analysis/
│   ├── ai-chat/
│   └── profile/
├── screens/
│   ├── routine/
│   ├── body/
│   ├── nutrition/
│   └── settings/
├── components/
│   ├── common/
│   ├── workout/
│   ├── body/
│   └── nutrition/
├── services/
│   ├── api/
│   ├── storage/
│   └── notifications/
├── hooks/
├── contexts/
├── themes/
└── types/
```

#### E. Web App Organization (Next.js 15)

```
apps/web/src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── callback/
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx        # Dashboard
│   │   ├── workouts/
│   │   ├── routine/
│   │   ├── body/
│   │   ├── nutrition/
│   │   ├── ai-chat/
│   │   └── profile/
│   ├── api/
│   └── layout.tsx
├── components/
│   ├── ui/                 # shadcn components
│   ├── layout/
│   ├── workout/
│   ├── body/
│   ├── nutrition/
│   └── ai/
├── lib/
│   ├── db/
│   ├── utils/
│   └── providers/
├── services/
├── hooks/
├── contexts/
├── types/
└── locales/
```

### 4. Cloudflare Best Practices

**Wrangler Configuration:**
```toml
# apps/api/wrangler.toml
name = "aivo-api"
main = "src/index.ts"
compatibility_date = "2025-04-24"
compatibility_flags = ["nodejs_compat"]

# Single binding for all WASM assets
[vars]
NODE_ENV = "production"
ALLOWED_ORIGINS = "https://aivo.website,https://api.aivo.website,http://localhost:3000"
R2_PUBLIC_URL = "https://your-bucket.r2.cloudflarestorage.com/aivo-images"

# Route custom domain
[[routes]]
pattern = "api.aivo.website/*"
custom_domain = true
zone_name = "aivo.website"

# Single D1 database
[[d1_databases]]
binding = "DB"
database_name = "aivo-db"
database_id = "your-db-id"

# R2 bucket for media
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "aivo-images"

# KV namespaces with clear purposes
[[kv_namespaces]]
binding = "BODY_INSIGHTS_CACHE"
id = "insights-cache-id"

[[kv_namespaces]]
binding = "BIOMETRIC_CACHE"
id = "biometric-cache-id"

[[kv_namespaces]]
binding = "LEADERBOARD_CACHE"
id = "leaderboard-cache-id"

[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "rate-limit-id"

# Cron jobs for async processing
[triggers]
crons = ["0 0 * * *", "0 9 1 * *"]
```

**Caching Strategy:**
1. **KV Namespaces:**
   - `BODY_INSIGHTS_CACHE` - TTL 1 hour for body analysis
   - `BIOMETRIC_CACHE` - TTL 15 min for recent metrics
   - `LEADERBOARD_CACHE` - TTL 5 min for gamification
   - `RATE_LIMIT_KV` - 15 min TTL for rate limiting

2. **D1 Query Optimization:**
   - Add composite indexes for common queries
   - Batch writes where possible
   - Use prepared statements (already with Drizzle)

3. **WASM Caching:**
   - Set proper Cache-Control headers
   - Use R2 for WASM asset distribution

### 5. Build Optimization

**Enhanced turbo.json:**
```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**", ".expo/**", "pkg/**"],
      "cache": true
    },
    "build:wasm": {
      "dependsOn": ["^build"],
      "outputs": ["pkg/**", "*.wasm"],
      "cache": true
    },
    "test": {
      "dependsOn": ["^build"],
      "cache": true
    }
  },
  "globalDependencies": ["**/.env*.local", "**/tsconfig*.json"],
  "globalEnv": ["NODE_ENV", "CI", "TURBO_TELEMETRY_DISABLED"]
}
```

**Pipeline Optimization:**
1. Parallelize independent builds
2. Cache WASM builds aggressively
3. Incremental type checking
4. Lint only changed files with turbo

### 6. API Contract Standards

**OpenAPI/Swagger:**
- Already using `@hono/zod-openapi` - continue this
- Define all schemas in `packages/core/types`
- Generate TypeScript client from OpenAPI spec
- Publish interactive docs at `/api/docs` (when PUBLIC_SWAGGER=true)

**Versioning Strategy:**
- Use URL versioning: `/api/v1/...`
- Or header-based: `Accept: application/vnd.aivo.v1+json`
- Keep v1 stable, introduce v2 for breaking changes

**Response Format Standard:**
```typescript
interface ApiResponse<T> {
  data: T;
  meta?: {
    timestamp: string;
    version: string;
    cacheHit?: boolean;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

### 7. Architecture Decision Records (ADRs)

Create `docs/adr/` directory:
```
docs/adr/
├── 0001-monorepo-structure.md
├── 0002-cloudflare-workers.md
├── 0003-wasm-architecture.md
├── 0004-database-design.md
├── 0005-api-design.md
├── 0006-auth-implementation.md
├── 0007-caching-strategy.md
├── 0008-deployment-pipeline.md
└── 0009-package-organization.md
```

ADR Template:
```markdown
# ADR 0001: Monorepo Structure

## Status
Accepted

## Context
[Problem statement and alternatives considered]

## Decision
[What we decided and why]

## Consequences
- Positive: [...]
- Negative: [...]
- Risks: [...]
```

### 8. Data Flow Diagrams

**AI Chat Flow:**
```
Frontend → API /ai/chat → MemoryService → WASM (token optimization) → OpenAI → Stream response → Frontend
              ↓
         Store conversation → Extract memories (async) → Store in D1
```

**Body Analysis Flow:**
```
Upload photo → R2 storage → Queue job → AI Vision → WASM posture → Store results → D1 + R2 → Frontend
```

**Workout Replanning Flow:**
```
User request → Fetch routine/body data → WASM deviation calculation → If threshold exceeded:
  → AI prompt with all context → GPT-4o-mini → Create new routine version → Response
```

### 9. Testing Strategy

**Unit Tests:**
- Each package has its own tests in `__tests__/`
- WASM: `wasm-pack test`
- TypeScript: Jest with ts-jest

**Integration Tests:**
- API endpoints: Supertest + Miniflare
- Database: Test D1 database with fixtures
- WASM integration: Node.js environment

**E2E Tests:**
- Web: Playwright or Cypress
- Mobile: Detox

**Coverage Goals:**
- Core logic: 90%+
- API routes: 80%+
- UI components: 70%+

### 10. Immediate Action Items

**Phase 1 - Quick Wins (Week 1-2):**
1. Reorganize shared-types into domain packages
2. Refactor API routes into feature groups
3. Create ADRs for key decisions
4. Standardize package exports

**Phase 2 - Structural (Week 3-4):**
1. Consolidate WASM crates or document clear boundaries
2. Merge utility packages where appropriate
3. Implement unified build process
4. Add missing tests

**Phase 3 - Optimization (Week 5-6):**
1. Optimize D1 queries with proper indexes
2. Implement caching strategy
3. Streamline CI/CD pipeline
4. Performance monitoring setup

**Phase 4 - Documentation (Week 7-8):**
1. Update ARCHITECTURE.md with new structure
2. Create API reference from OpenAPI
3. Write developer onboarding guide
4. Create architecture diagrams

---

## Summary

The current architecture is functional but suffers from:
- Package sprawl (16 packages)
- Flat file organization (22 routes, 26 services)
- Monolithic shared-types (200+ exports)
- Unclear domain boundaries

**Recommended approach:**
1. Adopt feature-based organization
2. Consolidate related packages
3. Establish clear domain boundaries
4. Standardize patterns across apps
5. Document decisions with ADRs

**Expected benefits:**
- Easier onboarding
- Better testability
- Clearer ownership
- Improved build times
- Enhanced maintainability
