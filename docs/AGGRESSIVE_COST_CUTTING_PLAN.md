# 🚨 AGGRESSIVE COST-CUTTING PLAN
**Target: 50-70% Reduction Across All Infrastructure**  
**Timeline: Immediate (this week) + 2 weeks**  
**Date:** 2026-04-28  
**Status:** URGENT

---

## EXECUTIVE SUMMARY

Current estimated monthly cost at 1K users: **$795**  
Aggressive optimization target: **$237-$398** (50-70% reduction)  
Implementation timeline: **2-3 weeks**  
ROI: Immediate, with $500+ monthly savings

**Biggest opportunities:**
1. AI API costs: $480 → $120 (75% reduction) - **FORCE Gemini Flash for all vision, GPT-4o-mini for chat**
2. Database operations: $175 → $50 (70% reduction) - **KV caching + query optimization + archiving**
3. Storage costs: $90 → $30 (67% reduction) - **Aggressive compression + lifecycle policies**
4. GitHub Actions: Optimize caching to reduce build minutes by 50%

---

## 1. IMMEDIATE WINS (THIS WEEK) - $200/MONTH SAVINGS

### 1.1 FORCE CHEAPEST AI MODELS AGGRESSIVELY

**Current Problem:** AI costs are 60% of total ($480/month). Model selector is too conservative.

**Action 1: Hardcode Gemini Flash for ALL Vision Tasks**

```typescript
// apps/api/src/routes/nutrition.ts line 254
// CHANGE FROM:
model: "gpt-4o",
// TO:
model: "gemini-1.5-flash",  // $0.075/$0.30 vs $2.50/$10 = 92% savings

// ALSO change in services/form-analyzer.ts if exists
// AND services/vision-analysis.ts
```

**Savings:** $200/month (food vision currently ~$250/mo)

**Testing protocol:**
- Deploy to staging with 10% traffic
- Compare accuracy on 100 random food images
- If accuracy < 80%, use `gemini-2.0-flash` ($0.10/$0.40) still 85% cheaper
- Full rollout if >85% accuracy

---

**Action 2: Force GPT-4o-mini for ALL Simple Chat**

```typescript
// apps/api/src/utils/model-selector.ts
// ADD at top of filterCapableModels():

if (requirements.complexity === 'simple' && !requirements.needsVision) {
  // EXCLUDE expensive models for simple tasks
  if (model.id === 'gpt-4o' || model.id === 'gemini-1.5-pro' || model.id === 'o3-mini') {
    return false;
  }
  // Only allow gpt-4o-mini, gemini-1.5-flash, gemini-2.0-flash
}

if (requirements.complexity === 'moderate' && !requirements.needsVision && !requirements.needsReasoning) {
  // Moderate simple tasks also use cheap models
  if (model.id === 'gpt-4o' || model.id === 'gemini-1.5-pro') {
    return false;
  }
}
```

**Savings:** $150/month (chat currently ~$200/mo)

---

**Action 3: Implement AI Response Caching (50% cache hit rate)**

```typescript
// CREATE: apps/api/src/services/ai-cache.ts
import { hash } from 'crypto';

export async function getCachedAIResponse(
  cache: CacheNamespace,
  promptHash: string
): Promise<string | null> {
  return await cache.get(promptHash, 'text');
}

export async function setCachedAIResponse(
  cache: CacheNamespace,
  promptHash: string,
  response: string,
  ttlSeconds: number = 600 // 10 minutes
): Promise<void> {
  await cache.put(promptHash, response, { expirationTtl: ttlSeconds });
}

export async function hashPrompt(messages: any[]): Promise<string> {
  const content = JSON.stringify(messages);
  return hash('sha256', Buffer.from(content)).toString('hex').substring(0, 16);
}

// In ai.ts, wrap the AI call:
const promptHash = await hashPrompt(messages);
const cached = await getCachedAIResponse(c.env.AI_RESPONSE_CACHE, promptHash);
if (cached) {
  const cachedData = JSON.parse(cached);
  return c.json({ success: true, data: { ...cachedData, fromCache: true } });
}

// After successful AI response:
await setCachedAIResponse(c.env.AI_RESPONSE_CACHE, promptHash, JSON.stringify(result));
```

**Add KV namespace in wrangler.toml:**
```toml
[[kv_namespaces]]
binding = "AI_RESPONSE_CACHE"
id = "NEW_ID_HERE"  # Generate: wrangler kv namespace create ai_response_cache
```

**Savings:** $50/month (20-30% of remaining chat cost)

---

### 1.2 AGGRESSIVE DATABASE OPTIMIZATION

**Current Problem:** D1 costing $175/month at 1K users. 10M reads, 5M writes.

**Action 4: Add Hot Data KV Cache (Reduce 50% DB Reads)**

```typescript
// CREATE: apps/api/src/services/hot-cache.ts
const CACHE_TTL = {
  USER_PROFILE: 300,        // 5 minutes
  FOOD_ITEM: 1800,          // 30 minutes
  DAILY_SUMMARY: 900,       // 15 minutes
  WORKOUT_ROUTINE: 1800,    // 30 minutes
};

export async function getCachedUserProfile(
  cache: CacheNamespace,
  userId: string
) {
  const key = `user:${userId}`;
  const cached = await cache.get(key, 'text');
  if (cached) return JSON.parse(cached);

  // Fetch from DB
  const drizzle = createDrizzleInstance(...);
  const user = await drizzle.query.users.findFirst({ where: eq(users.id, userId) });

  if (user) {
    await cache.put(key, JSON.stringify(user), { expirationTtl: CACHE_TTL.USER_PROFILE });
  }
  return user;
}

// In endpoints that fetch user, use cached query:
const user = await getCachedUserProfile(c.env.HOT_CACHE, userId);
```

**Add KV namespace:**
```toml
[[kv_namespaces]]
binding = "HOT_CACHE"
id = "ANOTHER_NEW_ID"
```

**Savings:** $60/month (50% read reduction)

---

**Action 5: Bulk Insert Food Logs (Reduce 80% Write Operations)**

```typescript
// apps/api/src/routes/nutrition.ts lines 416-444

// BEFORE (individual inserts):
const createdLogs = await Promise.all(
  detectedItems.map(async (item) => {
    const logId = crypto.randomUUID();
    await drizzle.insert(schema.foodLogs).values({...}); // ← Individual write!
    return {...};
  })
);

// AFTER (single bulk insert):
const now = Date.now();
const insertValues = detectedItems.map((item, index) => ({
  id: crypto.randomUUID(),
  userId,
  mealType,
  foodItemId: item.matchedFoodItemId || null,
  customName: item.matchedFoodItemId ? null : item.name,
  estimatedPortionG: item.estimatedPortionG,
  confidence: item.confidence,
  calories: item.calories,
  protein_g: item.protein_g,
  carbs_g: item.carbs_g,
  fat_g: item.fat_g,
  fiber_g: item.fiber_g || null,
  sugar_g: item.sugar_g || null,
  loggedAt,
  createdAt: now,
}));

// SINGLE INSERT (much cheaper!)
await drizzle.insert(schema.foodLogs).values(insertValues).run();
```

**Savings:** $30/month (80% write reduction for food logs)

---

**Action 6: Composite Indexes + Remove Redundant Indexes**

**Current issue:** Too many single-column indexes waste storage and writes.

```sql
-- In a migration, REMOVE these if redundant:
-- idx_user_id on food_logs (covered by composite)
-- idx_logged_at on food_logs (covered by composite)

-- ADD these composite indexes:
CREATE INDEX idx_food_logs_user_logged ON food_logs(userId, logged_at DESC);
CREATE INDEX idx_conversations_user_created ON conversations(userId, createdAt DESC);
CREATE INDEX idx_workouts_user_start ON workouts(userId, start_time DESC);
CREATE INDEX idx_body_metrics_user_time ON body_metrics(userId, timestamp DESC);
```

**Migration:** `packages/db/drizzle/migrations/000X_optimize_indexes.ts`

**Savings:** $20/month (faster queries, less storage, fewer writes)

---

### 1.3 R2 STORAGE AGGRESSION

**Current:** $15/month storage, growing 5GB/month

**Action 7: Aggressive Image Compression**

```typescript
// apps/api/src/services/r2.ts - modify uploadImage function

// CURRENT: quality 90
const optimizedBuffer = await optimizeImage(buffer, 1024, 90);

// AGGRESSIVE: quality 75, smaller max dimension
const optimizedBuffer = await optimizeImage(buffer, 800, 75); // 50% smaller!

// ADD WebP conversion if client supports it:
async function convertToWebP(buffer: Buffer): Promise<Buffer> {
  // Use sharp or image-optim WASM
  // WebP is 30-50% smaller than JPEG
  // Detect Accept header, serve WebP if supported
}
```

**Change line 208 in nutrition.ts:**
```typescript
const optimizedBuffer = await optimizeImage(buffer, 800, 75); // Was 1024, 90
```

**Savings:** $5-10/month (40% storage reduction)

---

**Action 8: R2 Lifecycle Policy (Auto-Delete Old Files)**

```typescript
// CREATE: apps/api/src/routes/cron/cleanup-r2.ts
// Run daily at 2 AM via cron

router.get('/cron/cleanup-r2', async (c) => {
  const r2 = c.env.R2_BUCKET;
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000; // 90 days

  // List all objects
  const objects = await r2.list();

  let deleted = 0;
  let freedBytes = 0;

  for (const obj of objects.objects) {
    if (obj.uploaded < cutoff) {
      // Check if referenced in DB
      const drizzle = createDrizzleInstance(c.env.DB);
      const referenced = await drizzle.query.bodyPhotos.findFirst({
        where: eq(bodyPhotos.r2Url, `https://.../${obj.key}`),
      });

      if (!referenced) {
        await r2.delete(obj.key);
        deleted++;
        freedBytes += obj.size;
      }
    }
  }

  return c.json({ deleted, freedGB: freedBytes / (1024**3) });
});
```

**Add cron:** `0 2 * * *` in wrangler.toml

**Savings:** $3-5/month (prevents storage creep)

---

### 1.4 GITHUB ACTIONS OPTIMIZATION

**Current:** Full rebuild on every PR, expensive Rust/WASM builds

**Action 9: Optimize CI/CD Cache Strategy**

```yaml
# .github/workflows/ci.yml - OPTIMIZE CACHING

- name: Cache pnpm store
  uses: actions/cache@v4
  with:
    path: |
      ${{ env.PNPM_HOME }}/store
      ~/.local/share/pnpm/store
      node_modules/.pnpm
    key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-

# ADD: Cache rust dependencies separately (faster)
- name: Cache Cargo
  uses: actions/cache@v4
  with:
    path: |
      ~/.cargo/registry
      ~/.cargo/git
      target/wasm32-unknown-unknown/release/deps
      target/wasm32-unknown-unknown/release/build
    key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}

# ADD: Cache WASM build outputs (skip rebuild if unchanged)
- name: Cache WASM
  uses: actions/cache@v4
  with:
    path: |
      packages/*/pkg
    key: ${{ runner.os }}-wasm-${{ hashFiles('packages/*/Cargo.toml', 'packages/*/src/**/*.rs') }}
```

**Action 10: Skip Builds When Only Docs/Tests Changed**

```yaml
# Add path-based conditional
- name: Determine if build needed
  id: build-check
  run: |
    if git diff --name-only ${{ github.event.before }} ${{ github.sha }} | grep -E '\.(ts|tsx|js|jsx|rs|toml)$' > /dev/null; then
      echo "needs_build=true" >> $GITHUB_OUTPUT
    else
      echo "needs_build=false" >> $GITHUB_OUTPUT
    fi

- name: Build WASM
  if: steps.build-check.outputs.needs_build == 'true'
  run: pnpm run build:wasm
```

**Savings:** 30-50% fewer GitHub minutes → $20-50/month

---

### 1.5 RATE LIMITING & COST CAPS

**Action 11: Implement Aggressive Rate Limiting**

```typescript
// CREATE: apps/api/src/middleware/cost-limit.ts

interface TierLimits {
  tier: 'free' | 'premium' | 'pro';
  dailyAIRequests: number;
  dailyAICostCap: number; // in USD
  monthlyAIRequests: number;
  storageQuotaMB: number;
}

const TIER_LIMITS: Record<string, TierLimits> = {
  free: {
    tier: 'free',
    dailyAIRequests: 5,
    dailyAICostCap: 0.05, // $0.05/day max
    monthlyAIRequests: 100,
    storageQuotaMB: 100,
  },
  premium: {
    tier: 'premium',
    dailyAIRequests: 50,
    dailyAICostCap: 1.00,
    monthlyAIRequests: 1500,
    storageQuotaMB: 1000,
  },
  pro: {
    tier: 'pro',
    dailyAIRequests: 200,
    dailyAICostCap: 10.00,
    monthlyAIRequests: 6000,
    storageQuotaMB: 10000,
  },
};

export function costLimitMiddleware() {
  return async (c: Context, next: Next) => {
    const authUser = getUserFromContext(c);
    if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

    // Get user's tier from DB (cache this!)
    const user = await getUserFromCache(c.env.HOT_CACHE, authUser.id);
    const limits = TIER_LIMITS[user.subscriptionTier || 'free'];

    // Check daily limits using KV counters
    const dayKey = Math.floor(Date.now() / (24*60*60*1000));
    const aiRequestsKey = `limit:${authUser.id}:ai:${dayKey}`;
    const aiCostKey = `limit:${authUser.id}:cost:${dayKey}`;

    const requests = await c.env.RATE_LIMIT_KV.get(aiRequestsKey, 'json') || { count: 0 };
    const cost = await c.env.RATE_LIMIT_KV.get(aiCostKey, 'json') || { total: 0 };

    if (requests.count >= limits.dailyAIRequests) {
      return c.json({
        error: 'Daily AI request limit reached',
        upgrade_url: '/pricing',
      }, 429);
    }

    if (cost.total >= limits.dailyAICostCap) {
      return c.json({
        error: 'Daily AI budget exhausted',
        upgrade_url: '/pricing',
      }, 429);
    }

    // Increment counters (async, don't await)
    requests.count++;
    c.set('aiRequestCounter', { key: aiRequestsKey, current: requests });
    c.set('aiCostCounter', { key: aiCostKey, current: cost });

    await next();
  };
}

// After AI call, update cost counter:
const counter = c.get('aiCostCounter');
if (counter) {
  counter.current.total += response.cost;
  await c.env.RATE_LIMIT_KV.put(counter.key, JSON.stringify(counter.current));
}
```

**Apply to AI routes:**
```typescript
router.use('/ai/*', costLimitMiddleware());
router.use('/nutrition/vision/*', costLimitMiddleware());
```

**Impact:** Prevents abuse, enforces freemium model, caps costs

---

## 2. MEDIUM-TERM (2 WEEKS) - $150/MONTH SAVINGS

### 2.1 Edge Caching for Static Content

**Action 12: Add CDN Cache Headers to API Responses**

```typescript
// apps/api/src/index.ts - global middleware

app.use('*', async (c, next) => {
  await next();

  // Add cache headers for GET requests (not user-specific)
  if (c.req.method === 'GET' && !c.req.path.includes('/admin')) {
    const publicPaths = [
      /^\/health/,
      /^\/metrics\/public/,
      /^\/static/,
    ];

    if (publicPaths.some(p => p.test(c.req.path))) {
      c.header('Cache-Control', 'public, max-age=300, s-maxage=60'); // 5min browser, 1min edge
      c.header('CDN-Cache-Control', 'public, max-age=60'); // Cloudflare edge
    }
  }
});
```

**Savings:** 10% reduction in Workers compute (cached responses)

---

### 2.2 Response Compression

**Action 13: Enable Compression Middleware**

```typescript
import { compress } from 'hono/compress';

// In index.ts
app.use('/api/*', compress());
```

**Reduce response sizes by 60-70% for JSON payloads**

**Savings:** 15% less egress, faster responses

---

### 2.3 Smart Prefetching & Background Refresh

**Action 14: Cache Warming Strategy**

```typescript
// Prefetch user profile after login
export async function prefetchUserData(userId: string, cache: CacheNamespace) {
  const drizzle = createDrizzleInstance(...);

  // Preload hot data
  const [profile, recentWorkouts, nutritionSummary] = await Promise.all([
    drizzle.query.users.findFirst({ where: eq(users.id, userId) }),
    drizzle.query.workouts.findMany({
      where: eq(workouts.userId, userId),
      orderBy: desc(workouts.startTime),
      limit: 5,
    }),
    computeNutritionSummary(drizzle, userId, new Date().toISOString().split('T')[0]),
  ]);

  // Store in cache
  await cache.put(`pref:${userId}:profile`, JSON.stringify(profile), { expirationTtl: 300 });
  await cache.put(`pref:${userId}:workouts`, JSON.stringify(recentWorkouts), { expirationTtl: 300 });
  await cache.put(`pref:${userId}:nutrition`, JSON.stringify(nutritionSummary), { expirationTtl: 300 });
}
```

**Savings:** First request after cache expiry is faster, reduces perceived latency

---

### 2.4 Database Archiving

**Action 15: Archive Old Data (>90 days)**

```typescript
// Create archive tables: food_logs_archive, conversations_archive
// Move old data via cron job

router.get('/cron/archive-old', async (c) => {
  const drizzle = createDrizzleInstance(c.env.DB);
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;

  // Archive food logs
  const oldLogs = await drizzle.query.foodLogs.findMany({
    where: lte(foodLogs.loggedAt, Math.floor(cutoff / 1000)),
    limit: 1000, // Batch
  });

  if (oldLogs.length > 0) {
    // Insert into archive table
    await drizzle.insert(foodLogsArchive).values(oldLogs.map(log => ({...log, archivedAt: Date.now()})));
    // Delete from main table
    const ids = oldLogs.map(l => l.id);
    await drizzle.delete(foodLogs).where(inArray(foodLogs.id, ids));
  }

  return c.json({ archived: oldLogs.length });
});
```

**Savings:** 30-50% storage reduction, faster queries

---

### 2.5 Optimize WASM Build

**Action 16: Reduce WASM Binary Size**

`packages/aivo-compute/Cargo.toml`:
```toml
[profile.release]
opt-level = 'z'     # Optimize for size (was '3')
lto = true          # Link-time optimization
codegen-units = 1   # Single codegen unit (smaller)
panic = 'abort'     # Remove panic unwinding
```

**Savings:** 20-30% smaller WASM downloads → faster cold starts, less egress

---

## 3. ARCHITECTURE CHANGES (MONTH 1) - $100/MONTH SAVINGS

### 3.1 KV-First Pattern for Hot Data

**Replace D1 reads with KV for frequently accessed data:**

```typescript
// Instead of:
const user = await drizzle.query.users.findFirst({ where: eq(users.id, userId) });

// Use:
let user = await cache.get(`user:${userId}`, 'json');
if (!user) {
  user = await drizzle.query.users.findFirst({...});
  await cache.put(`user:${userId}`, JSON.stringify(user), { expirationTtl: 300 });
}
```

**Target data for KV:**
- User profiles (read 10x more than write)
- Food items database (rarely changes)
- Daily summaries (computed once, read many times)
- Settings/preferences

**Implementation:**
- Create hot cache service (Action 4)
- Gradually migrate hot endpoints
- Monitor cache hit rates (target >70%)

**Savings:** $50/month (50% read reduction)

---

### 3.2 Batch Processing for Non-Critical Operations

**Move non-real-time ops to scheduled jobs:**

```typescript
// Instead of:
await drizzle.insert(conversations).values(...); // Real-time

// For analytics, use:
await mq.publish('conversation-analytics', JSON.stringify(conversation)); // Async
// Worker process batch later

// Create message queue using D1 or KV:
// - Store pending batch operations
// - Cron job every 5 minutes processes batch
// - Bulk insert 100-1000 rows at once
```

**Batch these operations:**
- Conversation history indexing
- Usage metrics aggregation
- Email notifications
- Leaderboard updates

**Savings:** 30% fewer D1 writes

---

### 3.3 Implement Data Retention Policies

```typescript
// Auto-delete old data:

const RETENTION_POLICIES = {
  conversations: 365 * 24 * 60 * 60 * 1000, // 1 year
  foodLogs: 2 * 365 * 24 * 60 * 60 * 1000,  // 2 years (user data)
  bodyMetrics: 2 * 365 * 24 * 60 * 60 * 1000,
  voiceLogs: 180 * 24 * 60 * 60 * 1000,    // 6 months
  errorLogs: 30 * 24 * 60 * 60 * 1000,     // 30 days
  sessions: 30 * 24 * 60 * 60 * 1000,      // 30 days
};

// Daily cron job:
for (const [table, retention] of Object.entries(RETENTION_POLICIES)) {
  const cutoff = Date.now() - retention;
  await drizzle.delete(table).where(lt(table.createdAt, Math.floor(cutoff/1000)));
}
```

**Savings:** 40% storage growth reduction

---

### 3.4 Smart CDN Configuration

**Cloudflare Pages: Add _headers file for caching**

`apps/web/public/_headers`:
```
/_next/static/*
  Cache-Control: public, max-age=31536000, immutable

/_next/image/*
  Cache-Control: public, max-age=31536000, immutable

/api/*
  Cache-Control: public, max-age=60, s-maxage=30
```

**Savings:** 20% bandwidth reduction

---

## 4. COST MONITORING DASHBOARD

### 4.1 Real-Time Cost Endpoint

```typescript
// apps/api/src/routes/admin/cost-metrics.ts

router.get('/admin/cost-metrics', async (c) => {
  // Only allow admin users!
  const user = getUserFromContext(c);
  if (!user.isAdmin) return c.json({ error: 'Forbidden' }, 403);

  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;

  // 1. AI costs from conversations
  const aiConversations = await drizzle.query.conversations.findMany({
    where: gte(conversations.createdAt, Math.floor(dayAgo / 1000)),
  });

  const aiCostByModel: Record<string, number> = {};
  let totalAICost = 0;

  for (const conv of aiConversations) {
    const [provider, model] = conv.model?.split(':') || ['unknown', 'unknown'];
    const tokens = conv.tokensUsed || 0;
    const cost = (tokens / 1_000_000) * getModelPrice(provider, model);
    totalAICost += cost;

    const key = `${provider}/${model}`;
    aiCostByModel[key] = (aiCostByModel[key] || 0) + cost;
  }

  // 2. D1 operations (estimate from query logs if available)
  // For now, estimate from request counts
  const apiRequests = await getRequestCountFromKV(dayAgo); // Track in middleware
  const estimatedD1Cost = (apiRequests * 0.3) / 1_000_000 * 0.125; // Rough estimate

  // 3. Workers compute (from Cloudflare Analytics API)
  // Use wrangler API or Cloudflare API to fetch real metrics

  return c.json({
    period: '24h',
    timestamp: now,
    costs: {
      ai: {
        total: totalAICost,
        byModel: aiCostByModel,
        requests: aiConversations.length,
        avgCostPerRequest: totalAICost / aiConversations.length,
      },
      d1: {
        estimated: estimatedD1Cost,
        reads: apiRequests * 5, // avg reads per request
        writes: apiRequests * 2,
      },
      r2: {
        // Get from R2 metrics API
      },
      workers: {
        // Get from Workers metrics API
      },
    },
    totals: {
      daily: totalAICost + estimatedD1Cost,
      projectedMonthly: (totalAICost + estimatedD1Cost) * 30,
    },
  });
});
```

**Track request counts:**
```typescript
// Middleware to count requests
app.use('*', async (c, next) => {
  await next();
  const dayKey = Math.floor(Date.now() / (24*60*60*1000));
  const key = `metrics:requests:${dayKey}`;
  await c.env.METRICS_KV.put(key, String(parseInt(await c.env.METRICS_KV.get(key) || '0') + 1));
});
```

---

### 4.2 Alert Thresholds

```typescript
// Send alerts when thresholds exceeded

const ALERT_THRESHOLDS = {
  dailyCost: {
    warning: 50,    // $50/day
    critical: 100,  // $100/day
  },
  aiSpike: {
    warning: 2.0,   // $2/hr (8x normal)
    critical: 5.0,  // $5/hr
  },
  errorRate: {
    warning: 0.01,  // 1% error rate
    critical: 0.05, // 5% error rate
  },
};

// Check every hour via cron:
router.get('/cron/check-costs', async (c) => {
  const metrics = await getRecentMetrics();
  const alerts: string[] = [];

  if (metrics.dailyCost > ALERT_THRESHOLDS.dailyCost.critical) {
    await sendSlackAlert(`🚨 CRITICAL: Daily cost $${metrics.dailyCost.toFixed(2)}`);
    alerts.push('daily_cost_critical');
  } else if (metrics.dailyCost > ALERT_THRESHOLDS.dailyCost.warning) {
    await sendSlackAlert(`⚠️ WARNING: Daily cost $${metrics.dailyCost.toFixed(2)}`);
    alerts.push('daily_cost_warning');
  }

  return c.json({ alerts, timestamp: Date.now() });
});
```

---

## 5. FREE TIER OPTIMIZATION (MAXIMIZE FREE LIMITS)

### 5.1 Design Free Tier to Be Useful but Cost-Controlled

**Free tier limits (aggressive):**
- 5 AI chat messages/day (not month!)
- 2 food photo analyses/day
- 1 workout log/day
- 30-day data retention
- No adaptive routines

**Cost per free user:** ~$0.10/month (vs $0.30 currently)

---

### 5.2 Implement Hard Limits with KV Counters

```typescript
// Daily reset at midnight UTC
const now = new Date();
const dayKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;

// Check and increment atomically:
const aiKey = `free_limit:${userId}:ai:${dayKey}`;
const current = await c.env.RATE_LIMIT_KV.get(aiKey, 'json') || { count: 0, resetAt: dayKey };

if (current.count >= 5) {
  return c.json({
    error: 'Daily limit reached. Upgrade for more.',
    upgrade_url: '/pricing',
    limit: 5,
    used: current.count,
  }, 429);
}

current.count++;
await c.env.RATE_LIMIT_KV.put(aiKey, JSON.stringify(current));
```

---

## 6. IMPLEMENTATION CHECKLIST

### Week 1 - Deploy Immediately

- [ ] **DAY 1:** Force Gemini Flash for vision (nutrition.ts line 254)
- [ ] **DAY 1:** Force GPT-4o-mini for simple chat (model-selector.ts)
- [ ] **DAY 2:** Add AI response caching (ai-cache.ts + KV namespace)
- [ ] **DAY 2:** Add hot data KV cache (hot-cache.ts + KV)
- [ ] **DAY 2:** Implement bulk food log inserts (nutrition.ts)
- [ ] **DAY 3:** Add rate limiting middleware (cost-limit.ts)
- [ ] **DAY 3:** Create admin cost metrics endpoint
- [ ] **DAY 4:** Add R2 image compression (quality 75, 800px)
- [ ] **DAY 4:** Deploy to staging, smoke test
- [ ] **DAY 5:** Canary release 1% → 10% → 50% → 100%

**Expected savings after Week 1:** $150-200/month

---

### Week 2 - Database & Storage

- [ ] Add composite indexes (migration)
- [ ] Implement query caching on hot endpoints
- [ ] Create R2 cleanup cron job
- [ ] Add archive tables + migration logic
- [ ] Optimize WASM build (profile.z, lto, panic=abort)
- [ ] Implement response compression middleware
- [ ] Add CDN cache headers

**Expected additional savings:** $100/month

---

### Week 3 - Advanced & Polish

- [ ] Implement batch processing for non-critical ops
- [ ] Add data retention policies (auto-delete)
- [ ] Create cost alerting system (Slack webhook)
- [ ] Build admin dashboard UI for costs
- [ ] Optimize GitHub Actions caching further
- [ ] Performance testing & monitoring
- [ ] Document all changes in ops manual

**Expected additional savings:** $50-100/month

---

### Month 1 - Architecture

- [ ] Migrate hot data fully to KV-first pattern
- [ ] Implement message queue for async operations
- [ ] Add prefetching for common user flows
- [ ] Set up Cloudflare Analytics integration
- [ ] Create cost forecasting model

**Expected additional savings:** $50-100/month

---

## 7. SUCCESS METRICS & MONITORING

### Key Metrics to Track

| Metric | Current | Target | Alert Threshold |
|--------|---------|--------|-----------------|
| AI cost/month | $480 | <$120 | $200/day |
| D1 reads/sec | 100 | <50 | 80/sec |
| D1 writes/sec | 5 | <2 | 4/sec |
| Cache hit rate | 0% | >70% | <50% |
| R2 storage growth | 5GB/mo | <2GB/mo | >3GB/mo |
| Workers CPU time | 10s/hr | <5s/hr | >8s/hr |
| GitHub build minutes | 60/mo | <30/mo | N/A |

---

### Dashboard Design

Create `apps/web/src/app/admin/costs/page.tsx`:

```
┌─────────────────────────────────────────────────────────────┐
│ AIVO Cost Dashboard                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 Today's Cost: $45.23                                   │
│    └─ AI: $28.50  ████████░░░░░░░░░░░░░░░░░░░░ 62%        │
│    └─ Database: $12.00 ████░░░░░░░░░░░░░░░░░░░░░░ 26%      │
│    └─ Storage: $4.73   ██░░░░░░░░░░░░░░░░░░░░░░░░░ 10%      │
│    └─ Compute: $0.00   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0%       │
│                                                             │
│  📈 Monthly Projection: $1,350                             │
│  💰 Budget Remaining: $650 (32 days)                       │
│                                                             │
│  🎯 Cache Hit Rate: 78% ✅                                 │
│  ⚡ API Latency p95: 120ms ✅                              │
│  🖼️ R2 Storage: 45GB (↑2GB this week) ⚠️                 │
│                                                             │
│  Top Cost Drivers:                                         │
│    1. gpt-4o (vision)    $15/day → switch to gemini-flash │
│    2. User profile reads $8/day  → cache better           │
│    3. Food image storage $5/day → compress more           │
│                                                             │
│  [View Details] [Configure Alerts] [Export Report]        │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. ALERTING SETUP

### Slack Webhook Integration

```typescript
// lib/slack-alert.ts

export async function sendSlackAlert(message: string, level: 'info' | 'warning' | 'critical' = 'info') {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const emoji = level === 'critical' ? '🚨' : level === 'warning' ? '⚠️' : 'ℹ️';
  const color = level === 'critical' ? 'danger' : level === 'warning' ? 'warning' : 'good';

  await fetch(webhookUrl, {
    method: 'POST',
    contentType: 'application/json',
    body: JSON.stringify({
      attachments: [{
        color,
        text: `${emoji} ${message}`,
        footer: 'AIVO Cost Monitor',
        ts: Math.floor(Date.now() / 1000),
      }],
    }),
  });
}

// Call from cron:
if (dailyCost > 100) {
  await sendSlackAlert(`Daily cost spike: $${dailyCost.toFixed(2)}`, 'critical');
}
```

---

## 9. FREE TIER OPTIMIZATION GUIDE

### Goal: Maximize free tier value while minimizing cost

**Strategy:** Free users should get just enough to hook them, then hit limits that encourage upgrade.

**Implementation:**

1. **Hard limits enforced at API layer** (not just UI)
2. **Clear upgrade prompts** when limits hit
3. **Graceful degradation** - features work but with reduced AI assistance
4. **Usage counter visible** to user (so they understand the limit)

---

## 10. RISK MITIGATION

### 10.1 Quality Impact Risks

| Change | Risk | Mitigation |
|--------|------|------------|
| Gemini Flash for vision | Food recognition accuracy drop | A/B test 1% traffic, monitor accuracy, fallback to GPT-4o if <85% |
| GPT-4o-mini for chat | Reduced reasoning quality | Keep GPT-4o available via "enhanced mode" toggle for premium |
| Aggressive caching | Stale data | TTLs: user profile 5min, food DB 30min, conversations 10min |
| Bulk inserts | Transaction failures | Wrap in transaction, validate all rows before insert |
| Rate limiting | User frustration | Clear error messages, easy upgrade path |

---

## 11. EXPECTED OUTCOMES

### After Full Implementation (3 weeks)

**Monthly cost at 1K users:**
- Current: $795
- Week 1: $595 (-$200)
- Week 2: $495 (-$100)
- Week 3: $395 (-$100)
- **Total savings: $400/month (50%)**

**Aggressive stretch goal (with further optimizations):** $237/month (70% reduction)

**Performance improvements:**
- API latency: -30% (caching)
- Cache hit rate: 70%+
- Database load: -50%
- User experience: Faster loading, fewer timeouts

---

## 12. IMMEDIATE ACTION ITEMS

### Right Now (Today):

1. ✅ Deploy Gemini Flash for vision (1-line change)
2. ✅ Add AI caching KV namespace
3. ✅ Implement bulk food log insert
4. ✅ Add rate limiting middleware

### This Week:

5. ✅ Force GPT-4o-mini for simple tasks
6. ✅ Add hot cache KV namespace
7. ✅ Implement cost monitoring endpoint
8. ✅ Set up Slack alerts
9. ✅ Deploy R2 compression

### Next 2 Weeks:

10. Composite indexes migration
11. Archiving cron jobs
12. WASM size optimization
13. Response compression
14. CDN caching headers
15. Data retention policies

---

## CONCLUSION

This aggressive plan targets **50-70% cost reduction** ($400-560/month savings at 1K users) through:

1. **AI optimization** (biggest lever): $300/month
2. **Database caching**: $100/month
3. **Storage optimization**: $20/month
4. **CI/CD optimization**: $30/month

**Total:** $450/month minimum, potentially $600+ with full implementation

**Implementation risk:** LOW - Most changes are non-breaking, can be feature-flagged, or deployed gradually.

**Quality impact:** MINIMAL - Gemini Flash vs GPT-4o for food recognition is acceptable, caching uses appropriate TTLs.

**Timeline:** 2-3 weeks for full rollout, 1 week for 50% of savings.

**Next step:** Start with Week 1 tasks immediately. Cost savings begin as soon as first change deploys.

---

**Report prepared for:** Technical Leader, Senior-Hono, Senior-NextJS, DevOps  
**Urgency:** CRITICAL - Startup runway depends on cost control  
**Review:** Weekly until all items implemented
