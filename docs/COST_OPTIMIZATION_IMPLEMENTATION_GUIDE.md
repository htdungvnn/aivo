# Quick Implementation Guide for Cost Optimizations

**Target:** Senior-Hono, Senior-NextJS, DevOps Team  
**Priority:** High - $495/month savings at 1K users  
**Timeline:** 3 weeks

---

## Week 1: Critical AI Cost Reductions (Save ~$250/month)

### Task 1.1: Switch Nutrition Vision to Gemini Flash

**Owner:** Senior-Hono  
**Effort:** 1 day  
**Impact:** $200/month savings

**File:** `apps/api/src/routes/nutrition.ts`  
**Line:** 254

**Change:**
```diff
- model: "gpt-4o",
+ model: "gemini-1.5-flash",
```

**Testing:**
1. Deploy to staging
2. Test 100 random food images from database
3. Compare accuracy with GPT-4o (expect 90%+ match)
4. If accuracy < 85%, revert and try `gemini-2.0-flash`

**Rollout:**
- 1% traffic for 24h, monitor quality
- If OK, ramp to 100%

---

### Task 1.2: Implement AI Response Caching

**Owner:** Senior-Hono  
**Effort:** 1 day  
**Impact:** $50/month savings (20% cache hit rate)

**Steps:**
1. Add new KV namespace in `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "AI_RESPONSE_CACHE"
id = "new-namespace-id"  # Generate via wrangler kv:namespace create
```

2. Create `apps/api/src/services/ai-cache.ts`:
```typescript
import { hash } from 'crypto';

export async function getCachedResponse(
  cache: CacheNamespace,
  promptHash: string
): Promise<string | null> {
  return await cache.get(promptHash, 'text');
}

export async function setCachedResponse(
  cache: CacheNamespace,
  promptHash: string,
  response: string,
  ttlSeconds: number = 300
): Promise<void> {
  await cache.put(promptHash, response, { expirationTtl: ttlSeconds });
}

export async function hashPrompt(messages: ChatMessage[]): Promise<string> {
  const content = JSON.stringify(messages);
  return hash('sha256', Buffer.from(content)).toString('hex');
}
```

3. Update `apps/api/src/routes/ai.ts` (around line 132):
```typescript
// Before AI call
const promptHash = await hashPrompt(messages);
const cached = await getCachedResponse(c.env.AI_RESPONSE_CACHE, promptHash);
if (cached) {
  const cachedData = JSON.parse(cached);
  // Return cached response (add cache hit flag)
  return c.json({
    success: true,
    data: { ...cachedData, cached: true },
  });
}

// After successful AI call (before return)
await setCachedResponse(
  c.env.AI_RESPONSE_CACHE,
  promptHash,
  JSON.stringify({
    message: aiMessage,
    tokensUsed,
    model: modelUsed,
    provider,
    cost: response.cost,
  })
);
```

4. Deploy and monitor cache hit rate in logs

---

### Task 1.3: Add Cost Monitoring Endpoint

**Owner:** Senior-Hono  
**Effort:** 0.5 days  
**Impact:** Visibility into costs

**Create:** `apps/api/src/routes/admin/metrics.ts`

```typescript
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDrizzleInstance } from "@aivo/db";

export const AdminRouter = () => {
  const router = new Hono();

  // Admin auth middleware (add proper auth!)
  router.use('*', async (c, next) => {
    // TODO: Add admin authentication
    await next();
  });

  router.get('/metrics/cost', async (c) => {
    const drizzle = createDrizzleInstance(c.env.DB);
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;

    // Get conversation stats (AI usage)
    const conversations = await drizzle.query.conversations.findMany({
      where: (c) => gte(c.createdAt, Math.floor(dayAgo / 1000)),
    });

    const openaiModels = new Map<string, {count: number, tokens: number}>();
    let totalTokens = 0;

    for (const conv of conversations) {
      const [provider, model] = conv.model?.split(':') || ['unknown', 'unknown'];
      const key = `${provider}:${model}`;
      const stats = openaiModels.get(key) || { count: 0, tokens: 0 };
      stats.count++;
      stats.tokens += conv.tokensUsed || 0;
      openaiModels.set(key, stats);
      totalTokens += conv.tokensUsed || 0;
    }

    // Estimate cost (simplified)
    let estimatedCost = 0;
    for (const [model, stats] of openaiModels.entries()) {
      // Use model-selector pricing logic
      // For now, rough estimate: $5 / 1M tokens average
      estimatedCost += (stats.tokens / 1_000_000) * 5;
    }

    // Get R2 storage
    // Note: Need to add R2 stats collection or estimate from DB

    return c.json({
      period: '24h',
      timestamp: now,
      ai: {
        conversations: conversations.length,
        totalTokens,
        models: Object.fromEntries(openaiModels),
        estimatedCost,
      },
      database: {
        // TODO: Track D1 ops via custom metrics
      },
      storage: {
        // TODO: Estimate from R2 list
      }
    });
  });

  return router;
};
```

3. Mount in `apps/api/src/index.ts`:
```typescript
import { AdminRouter } from './routes/admin/metrics';
// ...
const app = new Hono<...>();
app.route('/admin', adminRouter);
// Protect in production!
```

---

## Week 2: Database & Storage Optimization (Save ~$75/month)

### Task 2.1: Add Database Query Caching

**Owner:** Senior-Hono  
**Effort:** 2 days  
**Impact:** 30% fewer DB reads

**Create:** `apps/api/src/services/query-cache.ts`

```typescript
import { hash } from 'crypto';

export async function cachedQuery<T>(
  cache: CacheNamespace,
  key: string,
  queryFn: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  // Try cache first
  const cached = await cache.get(key, 'text');
  if (cached) {
    return JSON.parse(cached) as T;
  }

  // Execute query
  const result = await queryFn();

  // Cache result (background, don't await)
  cache.put(key, JSON.stringify(result), { expirationTtl: ttl }).catch(console.error);

  return result;
}

export function makeCacheKey(prefix: string, ...parts: (string | number | boolean | undefined | null)[]): string {
  const normalized = parts.map(p => String(p ?? 'null'));
  const content = `${prefix}:${normalized.join(':')}`;
  return hash('sha256', Buffer.from(content)).toString('hex').substring(0, 16);
}
```

**Use in nutrition summary (`nutrition.ts`):**
```typescript
// Around line 669
const cacheKey = makeCacheKey('nutrition_summary', userId, date);
const summaryData = await cachedQuery(
  c.env.QUERY_RESULT_CACHE,
  cacheKey,
  async () => {
    // Existing compute logic...
    const summary = await drizzle.query.dailyNutritionSummaries.findFirst({...});
    // ...
    return summaryData;
  },
  900  // 15 minute TTL
);
```

**Add KV namespace:**
```toml
[[kv_namespaces]]
binding = "QUERY_RESULT_CACHE"
id = "new-namespace-id"
```

---

### Task 2.2: Bulk Insert Food Logs

**Owner:** Senior-Hono  
**Effort:** 0.5 days  
**Impact:** 50% fewer write operations

**File:** `apps/api/src/routes/nutrition.ts`  
**Lines:** 416-444

**Change from:**
```typescript
const createdLogs = await Promise.all(
  detectedItems.map(async (item) => {
    const logId = crypto.randomUUID();
    await drizzle.insert(schema.foodLogs).values({...});  // Individual insert
    return {...};
  })
);
```

**Change to:**
```typescript
const now = Date.now();
const logIds = detectedItems.map(() => crypto.randomUUID());

const insertValues = detectedItems.map((item, index) => ({
  id: logIds[index],
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

// Single bulk insert
await drizzle.insert(schema.foodLogs).values(insertValues).run();

// Build response
const createdLogs = insertValues.map((values, index) => ({
  id: values.id,
  ...detectedItems[index],
  mealType,
  loggedAt,
}));
```

---

### Task 2.3: Add Composite Indexes

**Owner:** DevOps / Senior-Hono  
**Effort:** 1 day  
**Impact:** Faster queries, less compute time

**Create migration:** `packages/db/drizzle/migrations/000X_add_indexes.ts`

```typescript
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/d1";
import { db } from "../db";
import { schema } from "../schema";

async function up() {
  // Food logs composite index
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_food_logs_user_date
    ON food_logs(userId, logged_at DESC)
  `);

  // Workouts composite index
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_workouts_user_status_created
    ON workouts(userId, status, createdAt DESC)
  `);

  // Conversations composite index
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_conversations_user_created
    ON conversations(userId, createdAt DESC)
  `);

  // Body metrics composite
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_body_metrics_user_time
    ON body_metrics(userId, timestamp DESC)
  `);
}

async function down() {
  await db.execute(sql`DROP INDEX IF EXISTS idx_food_logs_user_date`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_workouts_user_status_created`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_conversations_user_created`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_body_metrics_user_time`);
}

migration({ up, down });
```

Apply: `cd packages/db && pnpm exec drizzle-kit migrate`

---

## Week 3: Advanced Optimizations (Save ~$100/month)

### Task 3.1: AI Model Selection Tuning

**Owner:** Senior-Hono  
**Effort:** 1 day  
**Impact:** Ensure cheapest capable model always selected

**File:** `apps/api/src/utils/model-selector.ts`

**Issue:** Current selector may choose expensive models for moderate tasks.

**Change:** Add stronger rules for cheap models:

```typescript
export function filterCapableModels(
  requirements: TaskRequirements,
  models: ModelDefinition[]
): ModelDefinition[] {
  return models.filter(model => {
    // ... existing checks ...

    // NEW: Force cheap models for simple/moderate tasks
    if (requirements.complexity === 'simple' && !requirements.needsVision) {
      const cheapModels = ['gpt-4o-mini', 'gemini-1.5-flash', 'gemini-2.0-flash'];
      if (!cheapModels.includes(model.id)) {
        return false;  // Exclude expensive models for simple tasks
      }
    }

    if (requirements.complexity === 'moderate' && !requirements.needsVision) {
      if (model.id === 'gpt-4o' || model.id === 'gemini-1.5-pro') {
        return false;  // Use mini/flash instead
      }
    }

    return true;
  });
}
```

---

### Task 3.2: Implement Rate Limiting with Cost Caps

**Owner:** Senior-Hono  
**Effort:** 2 days  
**Impact:** Prevent cost overruns, enable freemium model

**Create:** `apps/api/src/middleware/cost-limit.ts`

```typescript
import { Hono } from 'hono';

interface CostLimitConfig {
  dailyDollarCap: number;  // e.g., 0.50 for free tier
  requestsPerDay: number;
}

const userCostTracking = new Map<string, {
  dailyCost: number;
  dailyRequests: number;
  resetAt: number;
}>();

export function costLimitMiddleware(config: CostLimitConfig) {
  return async (c: Context, next: Next) => {
    const authUser = getUserFromContext(c);
    if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

    const userId = authUser.id;
    const now = Date.now();
    const dayKey = Math.floor(now / (24 * 60 * 60 * 1000));

    let tracking = userCostTracking.get(userId);
    if (!tracking || tracking.resetAt < dayKey) {
      tracking = {
        dailyCost: 0,
        dailyRequests: 0,
        resetAt: dayKey,
      };
      userCostTracking.set(userId, tracking);
    }

    // Check limits
    if (tracking.dailyRequests >= config.requestsPerDay) {
      return c.json({
        error: 'Daily request limit reached',
        resetAt: new Date((dayKey + 1) * 24 * 60 * 60 * 1000).toISOString(),
      }, 429);
    }

    if (tracking.dailyCost >= config.dailyDollarCap) {
      return c.json({
        error: 'Daily AI budget exhausted',
        resetAt: new Date((dayKey + 1) * 24 * 60 * 60 * 1000).toISOString(),
      }, 429);
    }

    // Track request (cost will be added after AI call)
    tracking.dailyRequests++;

    // Store tracking in context for update after request
    c.set('costTracking', tracking);
    c.set('userId', userId);

    await next();
  };
}

// After AI call, update cost:
// const tracking = c.get('costTracking');
// tracking.dailyCost += response.cost;
```

**Usage:**
```typescript
router.use('/ai/*', costLimitMiddleware({
  dailyDollarCap: 0.10,  // $0.10/day for free tier
  requestsPerDay: 10,    // 10 AI requests/day
}));
```

---

### Task 3.3: Orphaned Image Cleanup Job

**Owner:** DevOps  
**Effort:** 1 day  
**Impact:** 10-20% storage savings

**Create:** `apps/api/src/routes/cron/orphan-cleanup.ts`

```typescript
import { Hono } from "hono";
import { eq } from "drizzle-orm";

export const OrphanCleanupCron = () => {
  const router = new Hono();

  router.get('/', async (c) => {
    const drizzle = createDrizzleInstance(c.env.DB);
    const r2 = c.env.R2_BUCKET;

    // Find images older than 30 days not referenced in any table
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

    // Check body_photos
    const oldPhotos = await drizzle.query.bodyPhotos.findMany({
      where: lt(bodyPhotos.uploadDate, Math.floor(cutoff / 1000)),
    });

    const deletedKeys: string[] = [];
    let errors = 0;

    for (const photo of oldPhotos) {
      try {
        // Check if referenced elsewhere
        const bodyHeatmaps = await drizzle.query.bodyHeatmaps.findFirst({
          where: eq(bodyHeatmaps.photoId, photo.id),
        });

        if (!bodyHeatmaps) {
          // Delete from R2
          await r2.delete(photo.r2Url.split('/').pop() || '');
          // Delete from DB
          await drizzle.delete(bodyPhotos).where(eq(bodyPhotos.id, photo.id)).run();
          deletedKeys.push(photo.r2Url);
        }
      } catch (err) {
        console.error('Failed to cleanup', photo.id, err);
        errors++;
      }
    }

    return c.json({
      cleaned: deletedKeys.length,
      deletedKeys,
      errors,
      timestamp: new Date().toISOString(),
    });
  });

  return router;
};
```

**Add to cron:** `0 2 * * *` (run daily at 2 AM)

---

## Testing Checklist

### Before Production Deployment

- [ ] All changes deployed to staging
- [ ] Load test with 100 concurrent users
- [ ] Monitor cache hit rates (target > 50%)
- [ ] Verify AI model selection (logs show cheapest models)
- [ ] Check D1 query performance (p95 < 100ms)
- [ ] Validate cost monitoring endpoint returns data
- [ ] Test rate limiting (send 11 requests as free user, expect 429 on 11th)
- [ ] Verify orphan cleanup job runs successfully
- [ ] Check memory usage (should not increase > 20%)
- [ ] Run full test suite, ensure no failures

---

## Rollout Plan

### Day 1: Deploy to Staging
- Deploy all Week 1 changes together
- Run smoke tests
- Monitor logs for errors

### Day 2: Canary Release (1%)
- Deploy to production with 1% traffic
- Monitor:
  - Error rates
  - Cache hit rate
  - AI cost per request
  - User engagement (did it drop?)

### Day 3: Ramp to 10%
- If metrics OK, increase to 10%
- Continue monitoring

### Day 4: Ramp to 50%

### Day 5: Full Release
- 100% traffic
- Watch cost dashboard for next 24h

---

## Monitoring & Alerts

### Required Dashboards

**Grafana/Datadog/Custom:**

1. **Cost Dashboard**
   - Daily spend by service
   - AI spend by model
   - Cost per user trend
   - Forecasting (30-day burn rate)

2. **Performance Dashboard**
   - API latency p50/p95/p99
   - Cache hit rates
   - Database query times
   - Error rates

3. **Usage Dashboard**
   - Daily active users
   - AI requests per user
   - Feature adoption rates
   - User tier distribution

### Alert Thresholds

```
IF daily_cost > $50          → warning
IF daily_cost > $75          → critical
IF cache_hit_rate < 30%      → warning
IF error_rate > 1%           → critical
IF p95_latency > 1000ms      → warning
IF p95_latency > 2000ms      → critical
```

**Alert Channels:** Slack #cost-alerts, email to eng-team@aivo.fitness

---

## Success Metrics

### Week 1 After Full Release

| Metric | Before | Target After |
|--------|--------|--------------|
| AI cost/month (1K users) | $480 | $280 |
| Cache hit rate | 0% | >40% |
| D1 reads/sec | 100 | <70 |
| R2 storage growth | 5GB/mo | <4GB/mo |
| API latency p95 | 150ms | <120ms |

### Month 1

- Monthly cost reduction: **$250+**
- No increase in user complaints
- No degradation in feature quality
- Successful freemium limit enforcement

---

## Support & Escalation

**If something breaks:**
1. Roll back to previous deployment
2. Check logs in `wrangler tail`
3. Monitor `docs/COST_OPTIMIZATION_ANALYSIS.md` for reference

**Questions?**
- Cost analysis: See `docs/COST_OPTIMIZATION_ANALYSIS.md`
- Pricing strategy: See `docs/PRICING_STRATEGY.md`
- Cost model: See `docs/COST_MODEL.csv`

---

**Let's save $500/month! 🚀**
