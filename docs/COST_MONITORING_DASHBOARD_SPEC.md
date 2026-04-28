# COST MONITORING DASHBOARD SPECIFICATION

**Purpose:** Real-time visibility into infrastructure costs with alerting  
**Target Users:** Engineering team, Finance, Leadership  
**Update Frequency:** Real-time (1-minute granularity)  
**Access:** Admin-only, `GET /api/admin/cost-metrics`

---

## 1. DASHBOARD OVERVIEW

### UI Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ AIVO Cost Monitoring Dashboard                              [Last: 2m ago] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📊 TODAY'S COST: $47.32  ⬈ +12% vs yesterday                             │
│  └─ AI APIs: $28.50 (60%) ─────────────────────█░░░░░░░░                  │
│  └─ D1 Database: $12.00 (25%) ─────────────█░░░░░░░░░░                     │
│  └─ R2 Storage: $4.73 (10%) ─────────────█░░░░░░░░░░░░░░░░                │
│  └─ Workers: $2.09 (5%) ─────────────█░░░░░░░░░░░░░░░░░░░░                │
│  └─ KV: $0.00 (0%) ────────────────█░░░░░░░░░░░░░░░░░░░░░░                │
│                                                                             │
│  📈 MONTHLY PROJECTION: $1,425                                             │
│  💰 BUDGET: $2,000/mo     ████████████████░░░░░░░░ 71% used                │
│  ⏳ Days remaining: 13    At current rate: $1,425 (under budget) ✅        │
│                                                                             │
│  🎯 CACHE PERFORMANCE                                                      │
│  └─ AI Cache Hit Rate: 78% ───────█░░░░░░░░░░░░░░░░░░░░░░ Target: >70% ✅ │
│  └─ Hot Cache Hit Rate: 65% ──────█░░░░░░░░░░░░░░░░░░░░░░ Target: >60% ⚠️ │
│  └─ CDN Cache Hit Rate: 92% ──────████████████░░░░░░░░░░ Target: >90% ✅ │
│                                                                             │
│  ⚡ PERFORMANCE                                                             │
│  └─ Workers CPU Time: 4.2s/hr ─────█░░░░░░░░░░░░░░░░░░░░ Target: <5s ✅   │
│  └─ D1 Reads/sec: 48 ─────────────█░░░░░░░░░░░░░░░░░░░░░ Target: <50 ✅   │
│  └─ D1 Writes/sec: 1.8 ───────────█░░░░░░░░░░░░░░░░░░░░ Target: <2 ✅    │
│  └─ API p95 Latency: 120ms ────────█░░░░░░░░░░░░░░░░░░░░ Target: <150 ✅ │
│                                                                             │
│  🖼️ STORAGE                                                                │
│  └─ R2 Total: 47GB ──────────────██████████████░░░░░░░░ Growing 2GB/wk ⚠️ │
│  └─ D1 Size: 2.1GB ──────────────██████████░░░░░░░░░░░░░ Stable ✅        │
│  └─ KV Size: 156MB ──────────────█████████████░░░░░░░░░░ Small ✅         │
│                                                                             │
│  🔴 ALERTS (2)                                                             │
│  └─ ⚠️ Storage growth accelerating (2GB/week > 1.5GB target)              │
│  └─ ℹ️ Cache hit rate dropped to 65% (threshold: 60%)                     │
│                                                                             │
│  [Refresh] [Export CSV] [Configure Alerts] [View Details →]               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. API SPECIFICATION

### Endpoint: `GET /api/admin/cost-metrics`

**Authentication:** Admin only (JWT with admin claim)

**Response Format:**

```json
{
  "metadata": {
    "generatedAt": "2026-04-28T10:30:00.000Z",
    "period": "24h",
    "timezone": "UTC"
  },
  "costs": {
    "today": {
      "total": 47.32,
      "breakdown": {
        "ai": {
          "total": 28.50,
          "byModel": {
            "gemini-1.5-flash": 12.30,
            "gpt-4o-mini": 10.20,
            "gpt-4o": 5.00,
            "whisper": 1.00
          },
          "requests": 1247,
          "avgCostPerRequest": 0.0228,
          "tokens": {
            "input": 125000,
            "output": 45000,
            "total": 170000
          }
        },
        "d1": {
          "total": 12.00,
          "reads": 240000,
          "writes": 4800,
          "storageGB": 2.1,
          "operationsCost": 11.50,
          "storageCost": 0.50
        },
        "r2": {
          "total": 4.73,
          "storageGB": 47,
          "storageCost": 0.71,
          "egressGB": 125,
          "egressCost": 4.02,
          "operations": 12500
        },
        "workers": {
          "total": 2.09,
          "requests": 15000,
          "cpuMs": 4200000,
          "computeCost": 2.09
        },
        "kv": {
          "total": 0.00,
          "operations": 50000,
          "storageKB": 156000,
          "operationsCost": 0.03,
          "storageCost": 0.00
        },
        "pages": {
          "total": 0.00,
          "buildMinutes": 0,
          "bandwidthGB": 0
        }
      }
    },
    "monthToDate": 425.32,
    "projectedMonth": 1425.00,
    "budget": {
      "monthly": 2000.00,
      "remaining": 574.68,
      "percentUsed": 71,
      "daysRemaining": 13,
      "projectedOverBudget": false,
      "projectedSavings": 575.00
    }
  },
  "performance": {
    "cache": {
      "aiCache": {
        "hitRate": 0.78,
        "hits": 3420,
        "misses": 960,
        "target": 0.70,
        "status": "healthy"
      },
      "hotCache": {
        "hitRate": 0.65,
        "hits": 8900,
        "misses": 4780,
        "target": 0.60,
        "status": "healthy"
      },
      "cdn": {
        "hitRate": 0.92,
        "target": 0.90,
        "status": "healthy"
      }
    },
    "api": {
      "latencyP50": 45,
      "latencyP95": 120,
      "latencyP99": 280,
      "errorRate": 0.0023,
      "requests": 15620
    },
    "database": {
      "readsPerSecond": 48,
      "writesPerSecond": 1.8,
      "slowQueries": 0
    }
  },
  "storage": {
    "r2": {
      "totalGB": 47,
      "growthRateGBPerWeek": 2.1,
      "estimatedDaysUntil100GB": 143,
      "oldestObjectDays": 45
    },
    "d1": {
      "totalGB": 2.1,
      "largestTables": [
        {"name": "food_logs", "rows": 45000, "sizeMB": 512},
        {"name": "conversations", "rows": 28000, "sizeMB": 336},
        {"name": "body_metrics", "rows": 12000, "sizeMB": 180}
      ]
    },
    "kv": {
      "totalKB": 156000
    }
  },
  "alerts": [
    {
      "level": "warning",
      "metric": "storage_growth",
      "message": "R2 storage growing at 2.1GB/week (threshold: 1.5GB)",
      "suggestedAction": "Review image compression, implement orphan cleanup",
      "triggeredAt": "2026-04-28T08:00:00.000Z"
    },
    {
      "level": "info",
      "metric": "cache_performance",
      "message": "Hot cache hit rate 65% (threshold: 60%)",
      "suggestedAction": "Monitor, consider increasing TTLs",
      "triggeredAt": "2026-04-28T06:00:00.000Z"
    }
  ],
  "topCostDrivers": [
    {
      "service": "AI",
      "model": "gpt-4o",
      "cost": 15.50,
      "savingsIfSwitched": 12.00,
      "recommendation": "Switch to gemini-1.5-flash for vision tasks"
    },
    {
      "service": "Database",
      "query": "SELECT * FROM food_logs WHERE userId = ? AND loggedAt BETWEEN ? AND ?",
      "cost": 3.20,
      "executions": 4500,
      "savingsWithCache": 2.50,
      "recommendation": "Cache daily nutrition summaries for 15min"
    },
    {
      "service": "R2",
      "operation": "GET body-images/*",
      "cost": 2.10,
      "count": 8500,
      "recommendation": "Implement WebP with better compression"
    }
  ]
}
```

---

## 3. ALERT THRESHOLDS

### Critical Alerts (Immediate action required)

| Metric | Threshold | Action |
|--------|-----------|--------|
| Daily cost > $100 | PagerDuty + Slack | Investigate immediately |
| AI cost spike > $5/hr | Slack critical | Check model selection |
| Error rate > 5% | PagerDuty | Service degradation |
| D1 connection pool exhausted | Slack critical | Database issue |

### Warning Alerts (Monitor closely)

| Metric | Threshold | Action |
|--------|-----------|--------|
| Daily cost > $50 | Slack #cost-alerts | Review top cost drivers |
| AI cache hit rate < 40% | Slack #engineering | Cache misconfiguration |
| Hot cache hit rate < 50% | Slack #engineering | TTL too short |
| R2 growth > 3GB/week | Slack #infra | Storage creep |
| GitHub Actions > 60min/day | Slack #ci-cd | Build optimization needed |

### Informational (Weekly review)

| Metric | Threshold | Review |
|--------|-----------|--------|
| GPT-4o usage > 20% of AI | Weekly cost review | Model selection tuning |
| KV operations > 10M/day | Monthly | Consider higher tier |
| Any single user > $10/day | Weekly | Potential abuse |

---

## 4. ALERTING IMPLEMENTATION

### Slack Webhook Setup

```typescript
// apps/api/src/lib/alerting.ts

interface Alert {
  level: 'critical' | 'warning' | 'info';
  metric: string;
  message: string;
  suggestedAction?: string;
  metadata?: Record<string, any>;
}

export async function sendAlert(alert: Alert) {
  const webhookUrl = process.env.SLACK_COST_ALERT_WEBHOOK;
  if (!webhookUrl) return;

  const emoji = {
    critical: '🚨',
    warning: '⚠️',
    info: 'ℹ️'
  }[alert.level];

  const color = {
    critical: '#FF0000',
    warning: '#FFA500',
    info: '#0066CC'
  }[alert.level];

  await fetch(webhookUrl, {
    method: 'POST',
    contentType: 'application/json',
    body: JSON.stringify({
      attachments: [{
        color,
        fields: [
          { title: 'Level', value: alert.level.toUpperCase(), short: true },
          { title: 'Metric', value: alert.metric, short: true },
          { title: 'Message', value: alert.message, short: false },
          ...(alert.suggestedAction ? [{ title: 'Action', value: alert.suggestedAction, short: false }] : []),
        ],
        footer: 'AIVO Cost Monitor',
        ts: Math.floor(Date.now() / 1000),
      }],
    }),
  });
}
```

---

### Hourly Cost Check Cron

```typescript
// apps/api/src/routes/cron/check-costs.ts

router.get('/cron/check-costs', async (c) => {
  const yesterday = Date.now() - 24 * 60 * 60 * 1000;
  const metrics = await calculateCostMetrics(yesterday, Date.now());

  // Check thresholds
  const alerts: Alert[] = [];

  if (metrics.today > 100) {
    alerts.push({
      level: 'critical',
      metric: 'daily_cost',
      message: `Daily cost $${metrics.today.toFixed(2)} exceeds critical threshold`,
      suggestedAction: 'Check AI usage, consider rate limiting'
    });
  } else if (metrics.today > 50) {
    alerts.push({
      level: 'warning',
      metric: 'daily_cost',
      message: `Daily cost $${metrics.today.toFixed(2)} exceeds warning threshold`,
      suggestedAction: 'Review top cost drivers in dashboard'
    });
  }

  if (metrics.aiCacheHitRate < 0.4) {
    alerts.push({
      level: 'warning',
      metric: 'cache_hit_rate',
      message: `AI cache hit rate ${(metrics.aiCacheHitRate*100).toFixed(0)}% below 40%`,
      suggestedAction: 'Check cache TTLs, verify caching enabled'
    });
  }

  if (metrics.r2GrowthGBPerWeek > 3) {
    alerts.push({
      level: 'info',
      metric: 'storage_growth',
      message: `R2 growing ${metrics.r2GrowthGBPerWeek.toFixed(1)}GB/week`,
      suggestedAction: 'Review image compression, consider orphan cleanup'
    });
  }

  // Send alerts
  for (const alert of alerts) {
    await sendAlert(alert);
  }

  return c.json({ alerts, count: alerts.length });
});
```

**Add cron:** `0 * * * *` (every hour)

---

## 5. DATA COLLECTION STRATEGY

### Metrics to Collect

#### 1. AI Costs
**Source:** `conversations` table (tokensUsed, model fields)  
**Query:**
```sql
SELECT
  model,
  SUM(tokensUsed) as totalTokens,
  COUNT(*) as requestCount
FROM conversations
WHERE createdAt >= ?  -- last 24h
GROUP BY model;
```

**Cost calculation:** Use model pricing table from `model-selector.ts`

---

#### 2. D1 Operations
**Challenge:** D1 doesn't provide real-time metrics API  
**Solution:** Track in application middleware

```typescript
// Middleware to count DB operations
let dbReads = 0;
let dbWrites = 0;

app.use('*', async (c, next) => {
  // Wrap drizzle query methods
  const originalRun = drizzle.run.bind(drizzle);
  drizzle.run = async (...args) => {
    const sql = args[0]?.sql?.toLowerCase() || '';
    if (sql.startsWith('select') || sql.startsWith('pragma')) {
      dbReads++;
    } else if (sql.startsWith('insert') || sql.startsWith('update') || sql.startsWith('delete')) {
      dbWrites++;
    }
    return originalRun(...args);
  };
  await next();
});

// Periodically write to KV for aggregation
setInterval(() => {
  const dayKey = Math.floor(Date.now() / (24*60*60*1000));
  const key = `metrics:d1:${dayKey}`;
  const current = KV.get(key) || { reads: 0, writes: 0 };
  current.reads += dbReads;
  current.writes += dbWrites;
  KV.put(key, JSON.stringify(current));
  dbReads = 0;
  dbWrites = 0;
}, 60000); // Every minute
```

---

#### 3. R2 Storage
**Source:** R2 List API (expensive, don't call frequently)  
**Better:** Track via R2 events (not available) or estimate from upload count  
**Workaround:** Sample size weekly, extrapolate

```typescript
// On each upload, increment counter
const uploadCountKey = `r2:upload_count:${dayKey}`;
await c.env.METRICS_KV.put(uploadCountKey, String(parseInt(await c.env.METRICS_KV.get(uploadCountKey) || '0') + 1));

// Estimate: avg file size 100KB
const estimatedGB = uploadCount * 0.0001;
```

---

#### 4. Workers Compute
**Source:** Cloudflare API (requires API token)  
**Alternative:** Estimate from request count and CPU time logged in middleware

```typescript
app.use('*', async (c, next) => {
  const start = process.hrtime();
  await next();
  const duration = process.hrtime(start);

  // Accumulate CPU ms
  const cpuMs = duration[0] * 1000 + duration[1] / 1000000;
  // Track in KV
});
```

---

## 6. DASHBOARD UI IMPLEMENTATION

### Option 1: Custom Admin Page (Recommended)

```tsx
// apps/web/src/app/admin/costs/page.tsx

export default async function AdminCostsPage() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/cost-metrics`, {
    headers: { Authorization: `Bearer ${cookies().get('auth')?.value}` }
  });
  const data = await res.json();

  return (
    <div className="p-6">
      <h1>Cost Dashboard</h1>

      {/* Today's Cost */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <CostCard title="Today" value={data.costs.today.total} />
        <CostCard title="Month to Date" value={data.costs.monthToDate} />
        <CostCard title="Projected" value={data.costs.projectedMonth} />
        <CostCard title="Budget Remaining" value={data.costs.budget.remaining} />
      </div>

      {/* Cost Breakdown Chart */}
      <CostBreakdownChart breakdown={data.costs.today.breakdown} />

      {/* Cache Performance */}
      <CacheMetrics metrics={data.performance.cache} />

      {/* Alerts */}
      {data.alerts.map((alert, i) => (
        <Alert key={i} {...alert} />
      ))}

      {/* Top Cost Drivers */}
      <TopCostDrivers drivers={data.topCostDrivers} />
    </div>
  );
}
```

---

### Option 2: Cloudflare Analytics + Grafana

**Pros:**
- Native Cloudflare metrics (more accurate)
- Grafana dashboards
- Historical trends

**Cons:**
- Requires Cloudflare API token
- Separate infrastructure
- More complex setup

**Recommendation:** Start with custom API, migrate to Cloudflare Analytics later if needed.

---

## 7. REPORTING

### Daily Digest Email

**Send at 8 AM UTC daily:**

```
Subject: AIVO Daily Cost Report - $XX.XX

Summary:
- Today's cost: $XX.XX (vs $YY.YY yesterday, ΔZZ%)
- Month projection: $ZZZ.ZZ (budget: $2000)
- Cache hit rate: HH% (target 70%)
- Storage: XGB (growing at YGB/week)

Top 3 cost drivers:
1. AI - model gpt-4o: $AA.AA (switch to gemini-flash)
2. D1 reads: $BB.BB (cache more aggressively)
3. R2 storage: $CC.CC (compress images)

Alerts:
- ⚠️ Storage growth exceeding target
- ℹ️ Cache hit rate improved by 5%

Link to dashboard: https://admin.aivo.fitness/costs
```

**Implementation:** Cron job `0 8 * * *` → send email via Resend

---

### Weekly Deep Dive

**Every Monday:**
- Week-over-week comparison
- Cost per user trend
- Optimization impact analysis
- Recommendations for next week

---

## 8. COST ALLOCATION BY FEATURE

Track costs per feature for pricing decisions:

```typescript
const FEATURE_TAGS = {
  'ai.chat': 'AI Chat',
  'nutrition.vision': 'Food Vision',
  'workouts.tracking': 'Workout Tracking',
  'body.analysis': 'Body Analysis',
};

// Tag API routes
router.post('/ai/chat', handler, { feature: 'ai.chat' });
router.post('/nutrition/vision', handler, { feature: 'nutrition.vision' });

// Middleware to track by feature
app.use('*', async (c, next) => {
  const feature = c.req.route?.feature || 'unknown';
  await incrementFeatureCost(feature, estimatedCost);
  await next();
});
```

**Report:** Cost per feature per user → inform pricing tiers

---

## 9. BUDGETING & FORECASTING

### Monthly Budget Setup

```typescript
const MONTHLY_BUDGET = 2000; // USD

function getDailyBudgetRemaining(): number {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const remainingDays = daysInMonth - dayOfMonth + 1;

  const spent = getMonthToDateCost();
  const remaining = MONTHLY_BUDGET - spent;
  const dailyBudget = remaining / remainingDays;

  return dailyBudget;
}
```

**Alert if daily spending > 1.5x daily budget**

---

## 10. ARCHIVING & HISTORICAL DATA

### Retain Metrics For:

| Data | Retention | Storage |
|------|-----------|---------|
| Cost metrics (hourly) | 2 years | ~17KB/day |
| AI model usage (daily) | 5 years | ~5KB/day |
| Cache hit rates (hourly) | 1 year | ~10KB/day |
| Alerts (triggered) | 5 years | ~1KB/alert |

**Storage cost:** Negligible (<$0.01/month)

---

## 11. ACCESS CONTROL

### Roles

1. **Admin** - Full access, view all metrics
2. **Finance** - View cost metrics only
3. **Engineering** - View performance metrics
4. **Public** - None (endpoint returns 403)

**Implementation:**
```typescript
const ROLES = {
  admin: ['cost:*', 'performance:*'],
  finance: ['cost:read'],
  engineering: ['performance:read'],
};

function requireRole(role: string) {
  return async (c: Context, next: Next) => {
    const user = getUserFromContext(c);
    if (!user || !user.roles.includes(role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    await next();
  };
}

app.get('/api/admin/cost-metrics', requireRole('admin'), handler);
```

---

## 12. IMPLEMENTATION PRIORITY

### Phase 1 (Week 1): Basic Monitoring
- [ ] Cost metrics endpoint (admin only)
- [ ] AI cost calculation from conversations
- [ ] Simple dashboard page
- [ ] Daily cost Slack alert

### Phase 2 (Week 2): Advanced Metrics
- [ ] Cache hit rate tracking
- [ ] Performance metrics (latency, error rate)
- [ ] Top cost drivers analysis
- [ ] Monthly budget tracking

### Phase 3 (Week 3): Alerting & Automation
- [ ] Hourly alert cron
- [ ] Slack integration with actions
- [ ] Daily digest email
- [ ] Historical data retention

### Phase 4 (Month 2): Refinement
- [ ] Cost per feature tracking
- [ ] Forecasting model
- [ ] Anomaly detection
- [ ] Multi-region support

---

## APPENDIX: QUICK START

### 1. Add Admin Route
```bash
touch apps/api/src/routes/admin/cost-metrics.ts
```

### 2. Add KV for Metrics
```bash
wrangler kv namespace create metrics
# Add to wrangler.toml
```

### 3. Create Dashboard Page
```bash
mkdir -p apps/web/src/app/admin/costs
touch apps/web/src/app/admin/costs/page.tsx
```

### 4. Set Up Alerts
- Create Slack webhook
- Add to wrangler.toml secrets: `wrangler secret put SLACK_COST_ALERT_WEBHOOK`
- Deploy cron job

### 5. Test
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.aivo.fitness/api/admin/cost-metrics | jq
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-04-28  
**Owner:** DevOps + Finance
