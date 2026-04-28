# AGGRESSIVE COST OPTIMIZATION - IMPLEMENTATION CHECKLIST

**Target:** 50-70% cost reduction across all infrastructure  
**Timeline:** 3 weeks  
**Owner:** Senior-Hono, DevOps, Full-stack team  
**Status:** READY FOR EXECUTION

---

## WEEK 1: CRITICAL - $200-250/MO SAVINGS

### Day 1: AI Model Optimization

#### Task 1.1: Switch Nutrition Vision to Gemini Flash
- [ ] File: `apps/api/src/routes/nutrition.ts` line 254
- [ ] Change `model: "gpt-4o"` → `model: "gemini-1.5-flash"`
- [ ] Test with 100 food images in staging
- [ ] Verify accuracy >85%
- [ ] Deploy 1% canary, monitor errors
- [ ] Ramp to 100% if OK

**Savings:** $200/month  
**Risk:** Low (Gemini Flash quality 8.0, food recognition still excellent)

---

#### Task 1.2: Force GPT-4o-mini for Simple Chat
- [ ] File: `apps/api/src/utils/model-selector.ts`
- [ ] Add filter in `filterCapableModels()`:
```typescript
if (requirements.complexity === 'simple' && !requirements.needsVision) {
  if (['gpt-4o', 'gemini-1.5-pro', 'o3-mini'].includes(model.id)) {
    return false;
  }
}
```
- [ ] Add similar for 'moderate' without vision/reasoning
- [ ] Test model selection logs
- [ ] Verify cheapest model chosen for simple queries

**Savings:** $150/month  
**Risk:** Very low (simple queries don't need expensive models)

---

#### Task 1.3: Add AI Response Caching
- [ ] Generate KV namespace: `wrangler kv namespace create ai_response_cache`
- [ ] Add to `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "AI_RESPONSE_CACHE"
id = "YOUR_ID_HERE"
```
- [ ] Create `apps/api/src/services/ai-cache.ts`
- [ ] Implement `getCachedAIResponse()`, `setCachedAIResponse()`, `hashPrompt()`
- [ ] Modify `apps/api/src/routes/ai.ts` line ~150:
  - Check cache before AI call
  - Store in cache after successful call
- [ ] Add cache hit logging
- [ ] Deploy and monitor: `cache_hit_rate = cached / total`
- [ ] Target: >40% hit rate

**Savings:** $50/month  
**Risk:** Very low (TTL 10min, data is non-critical)

---

### Day 2: Database Query Caching

#### Task 1.4: Create Hot Cache KV
- [ ] Generate KV namespace: `wrangler kv namespace create hot_cache`
- [ ] Add to `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "HOT_CACHE"
id = "YOUR_ID_HERE"
```
- [ ] Create `apps/api/src/services/hot-cache.ts`
- [ ] Implement `getCachedUserProfile()`, `getCachedFoodItem()`, `getCachedDailySummary()`
- [ ] TTLs: profile=5min, food=30min, summary=15min
- [ ] Update endpoints:
  - `GET /api/users/me` → use cached profile
  - `GET /api/nutrition/summary` → cache result
  - `GET /api/nutrition/database/search` → cache food items (1hr)
- [ ] Add cache invalidation on updates (delete key when data changes)

**Savings:** $60/month  
**Risk:** Low (short TTLs, cache miss = fresh DB query)

---

#### Task 1.5: Bulk Insert Food Logs
- [ ] File: `apps/api/src/routes/nutrition.ts` lines 416-444
- [ ] Replace `Promise.all(detectedItems.map(...))` with single bulk insert
- [ ] Build `insertValues` array with all items
- [ ] Use `drizzle.insert(schema.foodLogs).values(insertValues).run()`
- [ ] Test transaction rollback on validation error
- [ ] Verify `INSERT ... VALUES (...), (...), (...)` in logs

**Savings:** $30/month  
**Risk:** Very low (same data, fewer queries)

---

### Day 3: Rate Limiting

#### Task 1.6: Implement Cost Limit Middleware
- [ ] Create `apps/api/src/middleware/cost-limit.ts`
- [ ] Define tier limits (free: 5 req/day, $0.05/day cap)
- [ ] Use KV counters for tracking (atomic operations)
- [ ] Apply to AI routes: `router.use('/ai/*', costLimitMiddleware())`
- [ ] Apply to nutrition vision: `router.use('/nutrition/vision/*', costLimitMiddleware())`
- [ ] Test limits with script (send 6 requests, expect 429 on 6th)
- [ ] Add upgrade_url in error response

**Impact:** Prevents abuse, enables freemium model  
**Risk:** Low (can adjust limits)

---

### Day 4: Storage Compression

#### Task 1.7: Aggressive R2 Image Compression
- [ ] File: `apps/api/src/services/r2.ts` or `nutrition.ts` line 208
- [ ] Change `optimizeImage(buffer, 1024, 90)` → `optimizeImage(buffer, 800, 75)`
- [ ] Test image quality on 50 samples
- [ ] If quality unacceptable, try 900px or quality 80
- [ ] Add WebP conversion option (detect Accept header)
- [ ] Monitor file size: target 50% reduction

**Savings:** $5-10/month  
**Risk:** Low (food photos don't need high resolution)

---

#### Task 1.8: R2 Cleanup Cron Job
- [ ] Generate cron: `0 2 * * *` in wrangler.toml
- [ ] Create `apps/api/src/routes/cron/cleanup-r2.ts`
- [ ] List R2 objects older than 90 days
- [ ] Check DB for references (bodyPhotos table)
- [ ] Delete unreferenced files
- [ ] Add logging: deleted count, freed bytes
- [ ] Test on staging with dry-run flag

**Savings:** $3-5/month  
**Risk:** Low (90-day grace, checks references first)

---

### Day 5: Monitoring & Testing

#### Task 1.9: Cost Monitoring Endpoint
- [ ] Create `apps/api/src/routes/admin/cost-metrics.ts`
- [ ] Calculate AI costs from conversations (last 24h)
- [ ] Estimate D1 costs from request count
- [ ] Return JSON with breakdown
- [ ] Add admin authentication check!
- [ ] Test: `curl -H "Authorization: Bearer XXX" /admin/cost-metrics`
- [ ] Add to admin dashboard (if exists)

**Impact:** Visibility into costs  
**Risk:** None (admin-only)

---

#### Task 1.10: Set Up Alerts
- [ ] Create `apps/api/src/lib/slack-alert.ts`
- [ ] Add SLACK_WEBHOOK_URL to wrangler.toml secrets
- [ ] Create cron `0 * * * *` (hourly check)
- [ ] Send alert if daily cost > $50 (warning) or $100 (critical)
- [ ] Include breakdown and recommendations

---

### Day 5-7: Testing & Staging

- [ ] Deploy all Week 1 changes to staging
- [ ] Run load test (100 concurrent users)
- [ ] Verify cache hit rates
- [ ] Check AI model selection in logs
- [ ] Monitor error rates
- [ ] Verify rate limiting works
- [ ] Check R2 cleanup job runs
- [ ] Validate cost metrics endpoint
- [ ] Document any issues

---

## WEEK 2: DATABASE & STORAGE - $100/MO SAVINGS

### Day 8: Composite Indexes

#### Task 2.1: Add Optimized Indexes
- [ ] Create migration: `packages/db/drizzle/migrations/000X_optimize_indexes.ts`
```typescript
import { sql } from "drizzle-orm";

export async function up(db) {
  await db.execute(sql`CREATE INDEX idx_food_logs_user_logged ON food_logs(userId, logged_at DESC)`);
  await db.execute(sql`CREATE INDEX idx_conversations_user_created ON conversations(userId, createdAt DESC)`);
  await db.execute(sql`CREATE INDEX idx_workouts_user_start ON workouts(userId, start_time DESC)`);
  await db.execute(sql`CREATE INDEX idx_body_metrics_user_time ON body_metrics(userId, timestamp DESC)`);
}

export async function down(db) {
  await db.execute(sql`DROP INDEX idx_food_logs_user_logged`);
  await db.execute(sql`DROP INDEX idx_conversations_user_created`);
  await db.execute(sql`DROP INDEX idx_workouts_user_start`);
  await db.execute(sql`DROP INDEX idx_body_metrics_user_time`);
}
```
- [ ] Apply: `cd packages/db && pnpm exec drizzle-kit migrate`
- [ ] Verify indexes exist: `sqlite3 dist/db.sqlite ".schema"`
- [ ] Benchmark query times before/after

**Savings:** $20/month (faster queries, less compute)  
**Risk:** Very low (read-only operation)

---

#### Task 2.2: Remove Redundant Indexes
- [ ] Review current indexes in schema.ts
- [ ] Drop single-column indexes covered by composites:
  - `idx_user_id` on food_logs → drop (covered by composite)
  - `idx_logged_at` on food_logs → drop
- [ ] Create migration to drop unused indexes
- [ ] Monitor for any slow queries after removal

**Savings:** $5/month (less storage, fewer writes)  
**Risk:** Low (but monitor for slow queries)

---

### Day 9-10: Archiving

#### Task 2.3: Create Archive Tables
- [ ] Add to schema.ts:
```typescript
export const foodLogsArchive = sqliteTable("food_logs_archive", { ...same schema..., archivedAt: integer("archived_at") });
export const conversationsArchive = sqliteTable("conversations_archive", { ... });
```
- [ ] Generate and apply migration
- [ ] Test copy/delete logic

---

#### Task 2.4: Implement Archive Cron
- [ ] Create `apps/api/src/routes/cron/archive-old.ts`
- [ ] Define retention policies (food logs: 2 years, conversations: 1 year)
- [ ] Batch process: move 1000 rows at a time
- [ ] Add logging and error handling
- [ ] Schedule: `0 3 * * *` (3 AM daily)
- [ ] Test with dry-run flag

**Savings:** $30/month (storage reduction)  
**Risk:** Low (grace period, can restore from backup)

---

### Day 11: WASM Optimization

#### Task 2.5: Reduce WASM Binary Size
- [ ] `packages/aivo-compute/Cargo.toml`:
```toml
[profile.release]
opt-level = 'z'     # Size optimization
lto = true
codegen-units = 1
panic = 'abort'
```
- [ ] Same for `packages/aivo-optimizer` and `packages/infographic-generator`
- [ ] Rebuild: `pnpm run build:wasm`
- [ ] Compare file sizes (target 20-30% reduction)
- [ ] Verify functions still work

**Savings:** $10/month (less egress, faster cold starts)  
**Risk:** Low (size opt shouldn't break functionality)

---

### Day 12: Response Compression

#### Task 2.6: Enable Gzip/Brotli
- [ ] In `apps/api/src/index.ts`:
```typescript
import { compress } from 'hono/compress';
app.use('/api/*', compress());
```
- [ ] Test with `curl -H "Accept-Encoding: gzip" /api/...`
- [ ] Verify Content-Encoding header
- [ ] Check response size reduction (target 60%)

**Savings:** $5/month (less egress)  
**Risk:** Very low

---

## WEEK 3: ADVANCED - $100/MO SAVINGS

### Day 15: CDN Caching

#### Task 3.1: Add Cache Headers
- [ ] In `apps/api/src/index.ts` middleware:
```typescript
app.use('*', async (c, next) => {
  await next();
  if (c.req.method === 'GET' && c.req.path.match(/^\/health|\/metrics\/public/)) {
    c.header('Cache-Control', 'public, max-age=300, s-maxage=60');
    c.header('CDN-Cache-Control', 'public, max-age=60');
  }
});
```
- [ ] Also add to web app `_headers` file for static assets

**Savings:** $10/month (reduced Workers invocations)

---

### Day 16: Batch Processing

#### Task 3.2: Implement Async Message Queue
- [ ] Create `apps/api/src/services/queue.ts`
- [ ] Use KV as simple queue: `queue:push()`, `queue:pop()`
- [ ] Move non-critical ops to queue:
  - Conversation indexing
  - Usage metrics
  - Email notifications
  - Leaderboard updates
- [ ] Create worker: `apps/api/src/routes/cron/process-queue.ts`
- [ ] Run every 5 minutes: `*/5 * * * *`

**Savings:** $20/month (fewer immediate DB writes)  
**Risk:** Medium (need to ensure eventual consistency)

---

### Day 17: Data Retention

#### Task 3.3: Auto-Delete Old Data
- [ ] Define policies in constants:
```typescript
const RETENTION = {
  sessions: 30 * 24 * 60 * 60 * 1000,
  voiceLogs: 180 * 24 * 60 * 60 * 1000,
  errorLogs: 30 * 24 * 60 * 60 * 1000,
  tempUploads: 7 * 24 * 60 * 60 * 1000,
};
```
- [ ] Create cron `0 4 * * *` (4 AM daily)
- [ ] For each table, delete where createdAt < cutoff
- [ ] Also clean up R2 orphaned files
- [ ] Log deletions for audit

**Savings:** $15/month  
**Risk:** Low (retention periods are reasonable)

---

### Day 18: Prefetching

#### Task 3.4: Warm Cache on Login
- [ ] After successful auth, trigger prefetch:
```typescript
const user = await getUserFromCache(...);
if (!user) {
  // Prefetch user profile, recent workouts, today's summary
  await prefetchUserData(userId, c.env.HOT_CACHE);
}
```
- [ ] Prefetch in parallel (3-5 queries)
- [ ] Store in cache with appropriate TTLs
- [ ] Reduces first-request latency

**Impact:** UX improvement, not direct cost savings  
**Risk:** Very low

---

## ONGOING MONITORING

### Daily Checks
- [ ] Review cost dashboard
- [ ] Check cache hit rates
- [ ] Monitor error rates
- [ ] Verify cron jobs ran successfully

### Weekly Checks
- [ ] Analyze AI model distribution (should see more cheap models)
- [ ] Review top 10 expensive endpoints
- [ ] Check storage growth rate
- [ ] Review rate limit hits (adjust if needed)

### Monthly Reviews
- [ ] Compare actual vs projected costs
- [ ] Evaluate cache effectiveness
- [ ] Identify new optimization opportunities
- [ ] Adjust limits and TTLs based on usage patterns

---

## ROLLBACK PLAN

If any change causes issues:

1. **Gemini Flash vision:** Revert to GPT-4o immediately (1-line change)
2. **Caching:** Disable by removing middleware (no data loss)
3. **Bulk inserts:** Fall back to Promise.all (already have code)
4. **Rate limiting:** Increase limits or disable temporarily
5. **Indexes:** Can drop new indexes, old queries still work (slower)

**Always have feature flags:**
```typescript
const ENABLE_CACHING = process.env.ENABLE_CACHING === 'true';
if (ENABLE_CACHING) { /* use cache */ }
```

---

## SUCCESS METRICS

### Week 1 Targets
- [ ] Cache hit rate > 40%
- [ ] GPT-4o usage < 10% of AI requests
- [ ] Error rate < 0.5%
- [ ] No user complaints about quality

### Week 2 Targets
- [ ] D1 query latency p95 < 100ms (from ~150ms)
- [ ] Storage growth < 3GB/week
- [ ] WASM size reduced 20%

### Week 3 Targets
- [ ] Total daily cost < $15 (at 100 users)
- [ ] Overall cache hit rate > 60%
- [ ] All rate limits enforced correctly

### Month 1 Target
- [ ] Monthly cost $400 (50% reduction from $795)
- [ ] No degradation in user experience
- [ ] All monitoring dashboards operational

---

## COMMUNICATION

### To Users (if affected)
- Free tier limit changes: Notify 30 days before
- New upgrade prompts: Explain value
- Downtime: Schedule maintenance windows, announce in app

### To Team
- Daily standup: Cost savings progress
- Weekly review: Metrics dashboard
- Monthly: ROI report

---

## APPENDICES

### A. KV Namespace Setup Commands

```bash
# Create KV namespaces
wrangler kv namespace create ai_response_cache
wrangler kv namespace create hot_cache
wrangler kv namespace create rate_limit_kv  # if not exists

# Get namespace IDs from output
# Add to wrangler.toml
```

### B. Migration Commands

```bash
cd packages/db
pnpm exec drizzle-kit generate  # Generate migration from schema changes
pnpm exec drizzle-kit migrate   # Apply migrations
```

### C. Testing Commands

```bash
# Test AI model selection
curl -H "Authorization: Bearer $TOKEN" \
  -X POST https://api.aivo.fitness/api/ai/estimate-cost \
  -d '{"prompt": "hello", "estimatedOutputTokens": 100}'

# Check cache hit rate (after adding logging)
# View in Cloudflare tail
wrangler tail

# Test rate limiting
for i in {1..10}; do
  curl -H "Authorization: Bearer $TOKEN" \
    -X POST https://api.aivo.fitness/api/ai/chat \
    -d '{"userId": "...", "message": "test"}'
done
```

### D. Rollback Commands

```bash
# Revert to previous deployment
git revert <commit-hash>
pnpm run deploy

# Or use Wrangler rollback (if using preview)
wrangler rollback aivo-api
```

---

## CONCLUSION

Follow this checklist religiously. Each task has a clear owner, expected savings, and low risk.

**Total expected savings: $400-600/month at 1K users**

**Priority order:** AI optimizations first (biggest impact), then database caching, then everything else.

**Start now.** Every day of delay is $10-15 of unnecessary cost.

---

**Checklist version:** 1.0  
**Last updated:** 2026-04-28  
**Status:** IN PROGRESS
