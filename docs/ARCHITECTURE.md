# System Architecture

High-level architecture of the AIVO fitness coaching platform.

## Overview

AIVO is a distributed AI-native fitness platform built for scale, performance, and personalization.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AIVO Platform                               │
├─────────────┬─────────────┬──────────────┬─────────────────────────┤
│    Web      │   Mobile    │   Cloudflare │    WASM Compute        │
│   (Next.js) │  (Expo RN)  │   Workers    │    (Rust)              │
└─────────────┴─────────────┴──────────────┴─────────────────────────┘
         │              │              │              │
         └──────────────┴──────────────┴──────────────┘
                                │
                                ▼
                     ┌──────────────────────┐
                     │   Cloudflare D1      │
                     │   (SQLite)           │
                     └──────────────────────┘
                                │
                                ▼
                     ┌──────────────────────┐
                     │   OpenAI API         │
                     │   (GPT + Embeddings) │
                     └──────────────────────┘
```

---

## Components

### 1. API Layer (Cloudflare Workers)

**Location:** `apps/api/`

**Tech:** Hono framework, Cloudflare Workers, D1 database

**Responsibilities:**
- HTTP API for all clients
- Authentication & authorization
- AI chat orchestration
- Database access via Drizzle ORM
- Integration with OpenAI and WASM

**Endpoints:**
- `/ai/chat` - Main chat with memory context
- `/ai/history/:userId` - Conversation history
- `/ai/replan` - Adaptive routine adjustment
- `/body/*` - Body metrics and insights
- `/routines/*` - Workout routine CRUD
- `/workouts/*` - Workout logging
- `/auth/*` - OAuth handling

**Why Cloudflare Workers?**
- Edge computing (low latency globally)
- Serverless (pay-per-use)
- Built-in D1 database
- Native WASM support

---

### 2. Web Application

**Location:** `apps/web/`

**Tech:** Next.js 15 (App Router), Tailwind CSS, TypeScript

**Features:**
- Dashboard with routine overview
- AI chat interface
- Progress tracking charts
- Routine builder
- Body metrics input

**Why Next.js?**
- SSR for SEO
- Static generation for performance
- Built-in routing
- Vercel integration

---

### 3. Mobile Application

**Location:** `apps/mobile/`

**Tech:** React Native (Expo SDK 52), NativeWind, Expo Router

**Features:**
- Native iOS/Android experience
- Workout timer and logging
- AI chat
- Push notifications
- Progress photos

**Why Expo?**
- Cross-platform (iOS + Android)
- Fast development cycle
- OTA updates
- Easy app store deployment

---

### 4. Compute Engine (WASM)

**Location:** `packages/aivo-compute/`

**Tech:** Rust → WebAssembly

**Modules:**
- `AdaptivePlanner` - Deviation scoring & rescheduling
- `CorrelationAnalyzer` - Exercise-soreness correlations
- `TokenOptimizer` - Conversation compression
- `ImageProcessor` - Progress photo optimization

**Why WASM?**
- Near-native performance (10-50x faster than JS)
- Type-safe with Rust
- Runs on Workers and browsers
- No Node.js dependencies

---

### 5. Memory Service

**Location:** `packages/memory-service/`

**Tech:** TypeScript, Drizzle ORM, OpenAI API

**Components:**
- **ConversationSummarizer** - Extract facts from chat using GPT-4o-mini
- **MemorySearcher** - Vector similarity search using embeddings
- **ContextBuilder** - Token budgeting and formatting
- **MemoryService** - Orchestrates all components

**Features:**
- Semantic fact extraction
- Graph-based memory storage
- Deduplication (85% similarity threshold)
- Critical health prioritization
- Async processing (non-blocking)

**See:** [MEMORY_SERVICE.md](./MEMORY_SERVICE.md)

---

### 6. Database (D1)

**Location:** `packages/db/`

**Tech:** SQLite via Cloudflare D1, Drizzle ORM

**Schema:**

```
users
├─ sessions
├─ conversations
│  └─ memoryNodes (via process)
│     └─ memoryEdges (graph)
├─ workoutRoutines
│  └─ routineExercises
│     └─ dailySchedules
│        └─ workouts
│           └─ workoutCompletions
├─ bodyMetrics
├─ bodyInsights
├─ userGoals
├─ dailySummaries
└─ planDeviations
```

**Why D1?**
- Serverless SQL (no management)
- Global replication
- Cheap ($0.50/GB/month)
- Native Workers integration

---

## Data Flow

### AI Chat Request

```
1. User sends message → API /ai/chat
2. API fetches recent conversation history
3. MemoryService.getMemoriesForContext() retrieves relevant memories
4. Messages + memory context sent to OpenAI
5. AI response streamed back to user
6. Async: processConversationTurn() extracts new memories
7. New memories stored in D1
```

### Memory Extraction

```
1. Fetch last 5 conversation turns
2. Fetch existing memories for deduplication
3. Send conversation to OpenAI for fact extraction
4. Generate embeddings for each fact
5. Check similarity with existing memories (cosine)
6. Insert new nodes or increment verification count
7. Create edges to related memories
8. Enforce memory limit (keep top 100, max 365 days)
```

### Routine Replanning

```
1. Client requests replan for routine
2. Fetch routine, exercises, workouts, body insights
3. WASM: Calculate deviation score
4. WASM: Analyze recovery curve
5. If deviation > 60 or recovery < 40:
   - Generate AI prompt with all data
   - Get adjusted schedule from GPT-4o-mini
   - Create new routine version
   - Deactivate old routine
6. Return adjusted schedule
```

---

## Authentication Flow

### OAuth (Google/Facebook)

```
1. Frontend → Google/Facebook OAuth popup
2. Provider returns auth code/token
3. Frontend → API /auth/google or /auth/facebook
4. API verifies with provider
5. API creates/finds user in DB
6. API generates JWT (signed with AUTH_SECRET)
7. Frontend stores JWT (localStorage/AsyncStorage)
8. All subsequent requests include:
   Authorization: Bearer <jwt>
   X-User-Id: <user-id>
```

### JWT Verification

```typescript
import jwt from "jsonwebtoken";

function verifyToken(token: string) {
  return jwt.verify(token, process.env.AUTH_SECRET!) as {
    sub: string;  // user ID
    email: string;
  };
}
```

---

## Security

### Data Protection

- **Encryption at rest:** D1 automatically encrypts
- **Encryption in transit:** TLS 1.3 for all connections
- **Secrets:** Environment variables only (no hardcoding)
- **JWT:** Signed with HS256, 7-day expiry

### OAuth Security

- PKCE for mobile flows
- State parameter validation
- Redirect URI whitelisting
- Token rotation (refresh tokens)

### API Security

- Rate limiting (Cloudflare built-in)
- Input validation with Zod schemas
- SQL injection prevention (Drizzle parameterized queries)
- XSS prevention (CSP headers)

---

## Scalability

### Current Limits

- **D1:** 10GB per database, 50k reads/sec
- **Workers:** 10ms CPU time per request (soft limit)
- **D1 Connections:** 1 per Worker instance
- **Memory:** 128MB per Worker

### Scaling Strategies

1. **Database**
   - Multiple D1 databases sharded by user region
   - Read replicas for analytics queries

2. **Caching**
   - Redis for session storage
   - CDN for static assets
   - In-memory cache for frequent queries

3. **Queueing**
   - Cloudflare Queues for async tasks (memory processing)
   - Background workers for batch operations

4. **Partitioning**
   - User ID hash-based sharding
   - Time-based partitioning for logs

---

## Monitoring & Observability

### Metrics to Track

- **API:** Latency p50/p95/p99, error rate, throughput
- **Database:** Query time, connection count, storage
- **OpenAI:** Token usage, cost, rate limits
- **WASM:** Execution time, memory usage
- **Errors:** 4xx/5xx rates, exception types

### Tools

- **Cloudflare Analytics:** Built-in dashboard
- **Logflare:** Log aggregation
- **Sentry:** Error tracking
- **UptimeRobot:** Uptime monitoring

---

## CI/CD Pipeline

### GitHub Actions

1. **On Push to main:**
   - Type check all packages
   - Lint all packages
   - Run unit tests
   - Build all packages
   - Run integration tests

2. **On Tag (v*):**
   - Build Docker image
   - Push to registry
   - Deploy to production
   - Apply DB migrations
   - Create GitHub release

### Environments

| Environment | API URL | DB | OpenAI |
|-------------|---------|----|--------|
| Development | localhost:8787 | Local D1 | Dev key |
| Staging | staging-api.aivo.ai | D1 staging | Prod key |
| Production | api.aivo.ai | D1 prod | Prod key |

---

## Future Architecture Plans

### Microservices Split

When scaling requires:

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   Chat      │   │   Workouts  │   │   Analytics │
│  Service    │   │   Service   │   │   Service   │
└─────────────┘   └─────────────┘   └─────────────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                    ┌─────────────┐
                    │   API GW    │
                    │ (Hono)      │
                    └─────────────┘
                           │
                    ┌─────────────┐
                    │     D1      │
                    └─────────────┘
```

### Multi-Model Support

- Anthropic Claude for chat
- Cohere for embeddings
- Local models (Llama 3) for privacy

### Real-time Features

- WebSockets for live chat
- Server-Sent Events for notifications
- Edge Streams for response streaming

---

## Key Decisions & Rationale

| Decision | Options Considered | Chosen | Why |
|----------|-------------------|--------|-----|
| Edge runtime | AWS Lambda, Cloudflare | Workers | D1 integration, WASM support |
| DB | Postgres, Mongo, D1 | D1 | Serverless, cheap, integrated |
| WASM | Python (Pyodide), JS | Rust | Performance, safety |
| Auth | Auth0, Supabase, Custom | Custom OAuth | Control, no vendor lock-in |
| Mobile | Flutter, Native, Expo | Expo | Fast dev, cross-platform |
| Web | Remix, Next, Gatsby | Next.js | App Router, Vercel |
| ORM | Prisma, Drizzle, raw | Drizzle | Type-safe, D1 optimized |

---

## Constraints & Trade-offs

### Cloudflare Workers Limits

- **10ms CPU time** → Keep heavy compute in WASM
- **128MB memory** → Stream large responses
- **30s timeout** → Async long-running tasks
- **No threads** → Single-threaded design

### SQLite Limitations

- **No ALTER TABLE** → Use migrations for all changes
- **Write locks** → Optimize writes, batch when possible
- **No JSONB** → Store JSON as TEXT, query with `json_extract`

### OpenAI Costs

- **Embeddings:** $0.00002/1k tokens
- **Chat:** $0.00015/1k tokens (gpt-4o-mini)
- **Budget:** ~$50/day at 1M chat messages

---

**Last Updated:** 2026-04-22  
**Architecture Version:** 1.1.0 (TypeScript strict mode compliant)
