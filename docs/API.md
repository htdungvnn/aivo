# API (Hono + Cloudflare Workers)

Complete reference for AIVO's Hono API running on Cloudflare Workers.

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Cloudflare account with Workers plan
- Wrangler CLI: `npm install -g wrangler`
- D1 database provisioned

### Setup

1. **Configure environment variables**:
   ```bash
   cp apps/api/.env.example apps/api/.env
   # Edit .env with your values (see Environment Variables section)
   ```

2. **Authenticate Wrangler**:
   ```bash
   wrangler login
   ```

3. **Apply migrations**:
   ```bash
   cd packages/db
   pnpm exec wrangler d1 migrations apply aivo-db --local
   ```

4. **Start development server**:
   ```bash
   cd apps/api
   pnpm run dev
   # API available at http://localhost:8787
   ```

5. **Verify health**:
   ```bash
   curl http://localhost:8787/api/health
   # Expected: {"status":"ok","timestamp":...}
   ```

---

## Architecture

### Technology Stack

- **Framework**: Hono (lightweight, Workers-optimized)
- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite-compatible)
- **ORM**: Drizzle (type-safe queries)
- **Auth**: JWT + OAuth 2.0 (Google/Facebook)
- **Storage**: Cloudflare R2 (images, files)
- **AI**: OpenAI GPT-4o, Google Gemini (model selector)

### Project Structure

```
apps/api/
├── src/
│   ├── index.ts          # App setup, middleware
│   ├── routes/           # API endpoints
│   │   ├── auth.ts       # OAuth, login, logout
│   │   ├── ai.ts         # AI chat, voice, model selector
│   │   ├── workouts.ts   # Workout CRUD
│   │   ├── nutrition.ts  # Food logging, barcode
│   │   ├── gamification.ts # Points, streaks, leaderboards
│   │   ├── body.ts       # Metrics, insights
│   │   └── social.ts     # Friends, feed, clubs
│   ├── middleware/       # auth, rate-limit, cors
│   ├── utils/            # helpers, services
│   │   ├── auth.ts       # JWT verification
│   │   ├── model-selector.ts # AI model selection
│   │   ├── unified-ai-service.ts # OpenAI/Gemini wrapper
│   │   └── compute.ts    # WASM integration
│   └── lib/              # types, constants
├── wrangler.toml         # Worker configuration
├── package.json
└── tsconfig.json
```

### Request Flow

```
Client → Worker Middleware → Route Handler → Drizzle ORM → D1 Database
         ↑                    ↑
    CORS, Rate Limit    Auth, Validation
```

---

## Authentication & Security

### OAuth 2.0 Flow

AIVO uses **passwordless authentication** via Google and Facebook OAuth exclusively.

#### Web Flow (Next.js)

```typescript
// Google OAuth (client-side)
import { GoogleLogin } from '@react-oauth/google';

<GoogleLogin
  onSuccess={async (credentialResponse) => {
    const res = await fetch(`${API_URL}/api/auth/google`, {
      method: 'POST',
      body: JSON.stringify({ token: credentialResponse.credential }),
    });
    const { jwt } = await res.json();
    localStorage.setItem('auth_token', jwt);
  }}
/>
```

```typescript
// Facebook OAuth (popup)
const popup = window.open(
  `${API_URL}/api/auth/facebook?redirect_uri=${encodeURIComponent(REDIRECT_URI)}`,
  'facebook_login',
  'width=600,height=600'
);
// Token extracted from popup URL
```

#### Mobile Flow (Expo)

```typescript
// Google/Facebook via WebBrowser
const authUrl = `${API_URL}/api/auth/google?redirect_uri=${REDIRECT_URI}`;
const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);
const token = result.url.split('token=')[1];
```

**⚠️ SECURITY NOTE**: Mobile flow should use Authorization Code + PKCE. See `OAUTH_SECURITY_REVIEW.md` for required fixes.

---

### API Endpoints

#### `POST /api/auth/google`

Verify Google ID token and create/find user.

**Request**:
```json
{
  "token": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "avatarUrl": "https://..."
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // JWT valid 7 days
    "expiresAt": 1746144000
  }
}
```

**Errors**:
- `400`: Invalid token format
- `401`: Invalid Google token (verification failed)
- `500`: Internal error

**Implementation**: `apps/api/src/routes/auth.ts:45-120`

---

#### `POST /api/auth/facebook`

Verify Facebook access token.

Same response format as Google.

---

#### `POST /api/auth/verify`

Verify JWT token and return user info.

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "email": "user@example.com",
    "valid": true
  }
}
```

**Use case**: Client sends on app startup to check session validity.

---

#### `POST /api/auth/logout`

Invalidate session (removes from database).

**Headers**: `Authorization: Bearer <token>`

**Response**: `204 No Content`

---

### JWT Claims

```typescript
interface JWTPayload {
  sub: string;        // user ID
  email: string;
  name: string;
  iat: number;        // issued at
  exp: number;        // expires (7 days from issue)
}
```

**Signing**: HS256 with `AUTH_SECRET` environment variable

**Verification**: Every request with `Authorization` header goes through `auth` middleware.

---

### Security Best Practices

**Implemented** (✅):
- ✅ httpOnly cookies for web sessions (prevents XSS theft)
- ✅ SameSite=Strict (CSRF protection)
- ✅ JWT signature verification on every request
- ✅ Session stored in database (allows revocation)
- ✅ Rate limiting per user/IP
- ✅ Security headers (HSTS, X-Frame-Options, CSP)
- ✅ Input validation via Zod schemas

**Needs Improvement** (⚠️ See `OAUTH_SECURITY_REVIEW.md`):
- ⚠️ Mobile OAuth: Implement PKCE (currently vulnerable)
- ⚠️ CSRF state validation missing for OAuth callbacks
- ⚠️ Facebook uses popup flow (should use redirect)
- ⚠️ No refresh token rotation (7-day access tokens only)
- ⚠️ Rate limiting trusts client-provided `X-User-Id` header

---

## API Reference

### Standard Response Format

All endpoints return:

```typescript
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;      // Machine-readable
    message: string;   // Human-readable
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
};
```

**Success**:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2025-04-27T12:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**Error**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {
      "field": "weight",
      "issue": "must be positive number"
    }
  },
  "meta": {
    "timestamp": "2025-04-27T12:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

### Standard Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Invalid/missing auth token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (duplicate) |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | AI service or external API down |

---

### Pagination

List endpoints support cursor-based or offset pagination:

**Query params**:
```
GET /api/workouts?page=1&limit=20
GET /api/conversations?cursor=abc123&limit=20
```

**Response**:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Defaults**: `page=1`, `limit=20`, `maxLimit=100`

---

### Rate Limiting

Rate limits per user (authenticated):

| Endpoint Type | Limit |
|---------------|-------|
| AI Chat | 100 requests/hour |
| Workout CRUD | 1000 requests/hour |
| Nutrition logs | 500 requests/hour |
| Unauthenticated | 10 requests/hour |

**Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1714214400
```

---

## AI Services

### Chat with AI Coach

#### `POST /api/ai/chat`

Send message to AI coach with automatic model selection.

**Request**:
```json
{
  "message": "How should I adjust my workout for knee pain?",
  "conversationId?: "conv-uuid",
  "includeMemory": true,
  "costOptimization": "balanced"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "conversationId": "conv-uuid",
    "response": {
      "role": "assistant",
      "content": "For knee pain, reduce impact exercises...",
      "timestamp": "2025-04-27T12:00:00Z"
    },
    "memoryFactsExtracted": [
      {
        "fact": "User has knee pain",
        "category": "health",
        "confidence": 0.92
      }
    ],
    "tokensUsed": 245,
    "modelUsed": "gpt-4o-mini",
    "cost": 0.0037
  }
}
```

**Model Selection Logic** (see `model-selector.ts`):
- **Aggressive**: Always cheapest capable model (Gemini Flash)
- **Balanced** (default): Cost vs quality trade-off
- **Quality**: Best model regardless of cost (GPT-4o, Gemini Pro)

**Available Models**:

| Model | Provider | Input ($/1M) | Output ($/1M) | Quality |
|-------|----------|--------------|---------------|---------|
| gpt-4o-mini | OpenAI | $0.15 | $0.60 | 8.5/10 |
| gpt-4o | OpenAI | $2.50 | $10.00 | 9.5/10 |
| gemini-1.5-flash | Google | $0.075 | $0.30 | 8.0/10 |
| gemini-1.5-pro | Google | $1.25 | $5.00 | 9.3/10 |

---

#### `POST /api/ai/voice`

Transcribe voice input and get AI response.

**Request** (multipart/form-data):
```
audio: File (WebM/MP3, max 10MB, max 60s)
userId: string
language?: string (default: en-US)
```

**Response**:
```json
{
  "success": true,
  "data": {
    "transcript": "What should I eat before workout?",
    "confidence": 0.96,
    "response": "For optimal performance...",
    "tokensUsed": 87
  }
}
```

---

#### `POST /api/ai/chat/multi`

Multi-turn conversation with full message history.

**Request**:
```json
{
  "conversationId?: "conv-uuid",
  "messages": [
    { "role": "user", "content": "First message", "timestamp": "..." },
    { "role": "assistant", "content": "Response", "timestamp": "..." }
  ],
  "userId": "user-uuid",
  "includeMemory": true
}
```

**Response**: Same as `/api/ai/chat`

---

### Memory Service

AI personalization via semantic memory graph.

#### Components

1. **ConversationSummarizer**: Extracts facts from chat
2. **MemorySearcher**: Vector similarity search
3. **ContextBuilder**: Builds memory context for prompts
4. **MemoryService**: Orchestration

#### Usage

```typescript
import { MemoryService } from '@aivo/api';

// Extract and store memory after conversation
await MemoryService.processConversationTurn({
  userId,
  message,
  response,
  tokensUsed,
});

// Get memory context for AI prompt
const context = await MemoryService.buildContext(userId, {
  maxTokens: 2000,
  includeTypes: ['fact', 'preference', 'goal'],
});
```

**Implementation**: `apps/api/src/utils/memory-service.ts`

---

## Workout APIs

### `GET /api/workouts`

List user's workouts with pagination.

**Query**:
```
?page=1&limit=20&startDate=2025-04-01&endDate=2025-04-30
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "workout-uuid",
      "name": "Upper Body Strength",
      "date": "2025-04-27",
      "startTime": "2025-04-27T08:00:00Z",
      "endTime": "2025-04-27T09:00:00Z",
      "duration": 3600,
      "notes": "Felt strong today"
    }
  ],
  "pagination": { ... }
}
```

---

### `POST /api/workouts`

Create workout.

**Request**:
```json
{
  "name": "Morning Run",
  "description?: "5K easy pace",
  "date": "2025-04-27",
  "exercises?: [...]
}
```

**Response**: `201 Created` with workout object

---

### `GET /api/workouts/:id`

Get workout details with exercises.

**Response**: Full workout with `exercises` and `completions` arrays.

---

### `PUT /api/workouts/:id`

Update workout (partial update supported).

---

### `DELETE /api/workouts/:id`

Delete workout (cascades to completions).

**Response**: `204 No Content`

---

## Nutrition APIs

### `GET /api/nutrition/food/search`

Search food database (USDA/OpenFoodFacts).

**Query**: `?q=banana&brand=Chiquita&limit=10`

**Response**:
```json
{
  "success": true,
  "data": {
    "foods": [
      {
        "id": "usda-123",
        "name": "Banana, raw",
        "servingSize": 118,
        "calories": 105,
        "protein": 1.3,
        "carbs": 27,
        "fat": 0.4
      }
    ]
  }
}
```

---

### `GET /api/nutrition/barcode/:barcode`

Lookup food by UPC/EAN barcode.

---

### `POST /api/nutrition/logs`

Log food intake with daily totals calculation.

**Request**:
```json
{
  "foodItem": "Banana, raw",
  "meal": "breakfast",
  "quantity": 2,
  "loggedAt?: "2025-04-27T08:30:00Z"
}
```

**Response**: Includes `dailyTotals` with remaining macros.

---

## Gamification APIs

### Streak & Check-in

#### `GET /api/gamification/streak/:userId`

Get current streak and profile.

**Response**:
```json
{
  "success": true,
  "data": {
    "currentStreak": 7,
    "longestStreak": 21,
    "profile": {
      "totalPoints": 2850,
      "level": 12,
      "currentXp": 45,
      "xpToNextLevel": 150,
      "freezeCount": 2
    }
  }
}
```

---

#### `POST /api/gamification/checkin`

Daily check-in (awards 10 points).

**Request**:
```json
{
  "source": "workout",
  "workoutId?: "workout-uuid"
}
```

**Error**: `400` if already checked in today

---

#### `POST /api/gamification/freeze/purchase`

Buy streak freeze (cost: 50 points). Max 3.

---

#### `POST /api/gamification/freeze/apply`

Apply freeze to yesterday's missed check-in.

---

### Points & Leaderboard

#### `GET /api/gamification/points/:userId`

Get balance and transaction history.

---

#### `GET /api/gamification/leaderboard?limit=100`

Global leaderboard (cached 5 minutes).

---

#### `GET /api/gamification/leaderboard/rank/:userId`

Get user's rank and percentile.

---

### Share Profile

#### `POST /api/gamification/share/generate`

Generate shareable achievement image (SVG).

**Query**: `?hideWeight=true&theme=default`

**Response**:
```json
{
  "success": true,
  "data": {
    "svg": "<svg>...</svg>",
    "shareUrl": "https://aivo.app/share?userId=..."
  }
}
```

---

## Social Features (Planned)

### Friend Management

#### `POST /api/social/friends/requests`

Send friend request.

**Request**:
```json
{
  "friendId": "user-uuid",
  "message?: "Let's connect!"
}
```

**Response**: `204 No Content`

---

#### `GET /api/social/friends`

List friends and pending requests.

**Response**:
```json
{
  "success": true,
  "data": {
    "friends": [...],
    "pendingSent": [...],
    "pendingReceived": [...]
  }
}
```

---

### Activity Feed

#### `GET /api/social/feed?page=1&limit=20`

Get friends' recent activity.

**Activity types**: `workout_completed`, `badge_earned`, `pr_set`, `goal_reached`

---

### Clubs (Planned)

#### `GET /api/clubs`

List public clubs with filters.

**Query**: `?tags=weight-loss,strength&limit=20`

---

#### `POST /api/clubs`

Create club (authenticated).

---

#### `POST /api/clubs/:id/join`

Join public club or request private.

---

## Body & Metrics APIs

### `POST /api/body/metrics`

Log body measurement.

**Request**:
```json
{
  "timestamp": "2025-04-27T08:00:00Z",
  "weight": 75.5,
  "bodyFat?: 15.2,
  "measurements?: { "waist": 85 }
}
```

---

### `GET /api/body/metrics`

Get measurement history with date range.

---

### `GET /api/body/insights?period=weekly`

Get AI-generated analysis.

**Response**:
```json
{
  "success": true,
  "data": {
    "insights": [
      {
        "summary": "You've lost 2kg this week...",
        "muscleProfiles": [
          { "muscle": "quadriceps", "trend": "decreasing" }
        ],
        "recommendations": [...]
      }
    ]
  }
}
```

---

## Environment Variables

**Required**:
```
AUTH_SECRET=<openssl rand -hex 64>
GOOGLE_CLIENT_ID=<from-gcp>
FACEBOOK_APP_ID=<from-fb>
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
```

**Optional**:
```
ALLOWED_ORIGINS=http://localhost:3000,https://aivo.app
R2_PUBLIC_URL=https://pub-...r2.dev
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=100
```

See `ENV_VARIABLES_REFERENCE.md` for complete list.

---

## Deployment

### Build

```bash
# Type check
pnpm run type-check

# Lint
pnpm run lint

# Build (includes WASM copy)
pnpm run build
```

Build outputs:
- `./dist` - Worker bundle
- `./pkg` - WASM files

---

### Deploy to Production

```bash
# Set secrets first
wrangler secret put AUTH_SECRET
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put FACEBOOK_APP_ID
wrangler secret put OPENAI_API_KEY
wrangler secret put GEMINI_API_KEY

# Deploy
./scripts/deploy.sh
```

Deploy script:
1. Builds all packages
2. Runs migrations on production D1
3. Deploys Worker with `wrangler deploy`
4. Post-deployment health check

---

### Staging Deployment

```bash
export NODE_ENV=staging
wrangler deploy --env staging
```

---

### Rollback

```bash
wrangler deployments list
wrangler deployments rollback <deployment-id>
```

---

## Testing

### Unit Tests

```bash
cd apps/api
pnpm test
```

Tests use `@hono/zod-validator` and `vitest`.

---

### Integration Tests

```bash
pnpm run test:integration
```

Test scenarios:
- OAuth flow (mocked)
- Workout CRUD with real DB
- Rate limiting enforcement
- Error handling

---

### Load Testing

```bash
npx autocannon -c 100 -d 30 http://localhost:8787/api/health
```

---

## Monitoring

### Logs

```bash
# Tail production logs
wrangler tail --format json

# Filter by request ID
wrangler tail --filter 'requestId="req_abc123"'
```

---

### Health Check

**Endpoint**: `GET /api/health`

Response includes status of all dependencies (DB, R2, AI services).

---

## Troubleshooting

### "Invalid token" on every request

**Cause**: `AUTH_SECRET` mismatch.

**Fix**:
1. Ensure same secret across environments
2. Regenerate tokens after rotation
3. Clear client cookies/storage

---

### Rate limit errors during development

**Fix**: Increase limits in middleware for non-production:
```typescript
if (process.env.NODE_ENV !== 'production') {
  limit = 1000;
}
```

---

### AI requests timeout

**Fix**:
1. Check provider status
2. Implement fallback model
3. Add 30s timeout to AI service
4. Use circuit breaker pattern

---

### D1 queries slow

**Diagnosis**:
```sql
EXPLAIN QUERY PLAN SELECT * FROM workouts WHERE user_id = '...';
```

**Fix**:
1. Add missing indexes
2. Use `dailySummaries` materialized view
3. Implement caching (5min TTL)
4. Reduce query scope with date filters

---

## Performance Tips

### Caching Strategy

- **KV Store**: Leaderboards, summaries (5-15min TTL)
- **In-memory**: Hot data (user profile)
- **CDN**: Static assets via R2

### Database Optimization

- Materialized views (`dailySummaries`) for aggregates
- Batch inserts in transactions
- Index all foreign keys
- Avoid `SELECT *`

### Worker CPU Time

If >50ms/request:
- Batch WASM calls
- Reduce JSON serialization
- Implement caching
- Move heavy compute to Durable Objects

---

## Development Workflow

### Add New Endpoint

1. Create/update file in `src/routes/`
2. Define Zod validation schema
3. Implement Hono route with `authMiddleware`
4. Add unit test in `src/__tests__/`
5. Update documentation (`API.md`)
6. Add integration test

---

### Add New Database Table

1. Update `packages/db/src/schema.ts`
2. Generate migration: `pnpm exec drizzle-kit generate`
3. Apply locally: `pnpm exec wrangler d1 migrations apply aivo-db --local`
4. Use in route with Drizzle types

---

## References

- **Hono Docs**: https://hono.dev/
- **Cloudflare Workers**: https://developers.cloudflare.com/workers/
- **D1 Database**: https://developers.cloudflare.com/d1/
- **Drizzle ORM**: https://orm.drizzle.team/
- **Model Selector**: `apps/api/src/utils/model-selector.ts`
- **Memory Service**: `apps/api/src/utils/memory-service.ts`
- **OAuth Security Review**: `OAUTH_SECURITY_REVIEW.md`
- **API Contracts**: `API_CONTRACTS.md`

---

**Last Updated**: 2025-04-27  
**Framework**: Hono 4.x  
**Runtime**: Cloudflare Workers  
**API Version**: v1
