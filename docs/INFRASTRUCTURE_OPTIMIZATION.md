# AIVO Infrastructure Optimization Guide

This document outlines the infrastructure optimizations implemented for the AIVO platform on Cloudflare Workers.

## Table of Contents

1. [Resource Limits](#resource-limits)
2. [Staging Environment](#staging-environment)
3. [Database Backups](#database-backups)
4. [R2 Storage Cleanup](#r2-storage-cleanup)
5. [Deployment Notifications](#deployment-notifications)
6. [Smoke Tests](#smoke-tests)
7. [Scheduled Maintenance](#scheduled-maintenance)
8. [Monitoring & Alerts](#monitoring--alerts)
9. [Cost Optimization](#cost-optimization)
10. [Rollback Procedures](#rollback-procedures)

---

## Resource Limits

**File:** `apps/api/wrangler.toml`

Added resource constraints to prevent runaway requests:

```toml
[limits]
cpu_ms = 50        # Max CPU time per request (50ms)
memory_mb = 256    # Max memory per request (256MB)
```

**Impact:**
- Protects against DoS attacks
- Ensures fair resource allocation
- Helps maintain consistent performance

**Adjustment:**
If you see frequent CPU limit errors, increase `cpu_ms` to 100. If memory errors, increase `memory_mb` to 512.

---

## Staging Environment

**Configuration:** `apps/api/wrangler.toml` `[env.staging]` section

A full staging environment is configured to test deployments before production.

### Setup Required

Before first use, create staging resources:

1. **D1 Database:**
   ```bash
   wrangler d1 database create aivo-db-staging --region=us-east-1
   ```
   Update `wrangler.toml` with the database ID.

2. **R2 Bucket:**
   ```bash
   wrangler r2 bucket create aivo-images-staging
   ```

3. **KV Namespaces:**
   ```bash
   wrangler kv namespace create BODY_INSIGHTS_CACHE_STAGING
   wrangler kv namespace create BIOMETRIC_CACHE_STAGING
   wrangler kv namespace create LEADERBOARD_CACHE_STAGING
   wrangler kv namespace create RATE_LIMIT_KV_STAGING
   ```
   Update `wrangler.toml` with the KV IDs.

4. **Domain Configuration:**
   - Add DNS record for staging: `staging-api.aivo.website` or similar
   - Update `ALLOWED_ORIGINS` in staging vars

### Deploy to Staging

```bash
./scripts/deploy.sh --staging
```

Or manually:
```bash
ENVIRONMENT=staging STAGING_MODE=true ./scripts/deploy.sh
```

### Staging Features

- Swagger documentation enabled (`PUBLIC_SWAGGER = "true"`)
- Separate database and storage
- Full isolation from production

---

## Database Backups

**Script:** `scripts/db-backup.sh`

Automated daily backups of D1 database with R2 archival.

### Usage

```bash
# Manual backup
./scripts/db-backup.sh

# Dry run (see what would happen)
DRY_RUN=true ./scripts/db-backup.sh

# Upload to custom R2 bucket
R2_BACKUP_BUCKET=my-backup-bucket ./scripts/db-backup.sh
```

### Automation

Add to crontab (system cron) or Cloudflare Workers cron:

**System cron (recommended for server environments):**
```bash
0 2 * * * /path/to/aivo/scripts/db-backup.sh >> /path/to/aivo/logs/db-backup.log 2>&1
```

**Cloudflare Workers cron:**
Create a maintenance worker that triggers the backup via internal API.

### Retention

- Local backups: 7 days (automatically cleaned)
- R2 backups: Manual cleanup recommended (R2 lacks lifecycle rules)

### Restore

```bash
# List available backups
ls backups/

# Download from R2 if needed
wrangler r2 bucket get-object aivo-backups backups/database/aivo-db-backup-20260429-020000.sql.gz -o backup.sql.gz

# Restore to local D1
wrangler d1 execute aivo-db --file backup.sql
```

**Note:** Restoring to production requires stopping the worker first to avoid conflicts.

---

## R2 Storage Cleanup

**Script:** `scripts/r2-cleanup.sh`

Cleans up orphaned files, temporary uploads, and old assets to control storage costs.

### What Gets Cleaned

- **Temporary uploads:** Files in `temp/`, `uploads/temp/` older than 24 hours
- **Orphaned files:** Files in `orphaned/` or `incomplete/` directories
- **Old files:** Files older than 30 days (heuristic - cross-check with DB in production)

### Usage

```bash
# Dry run first!
./scripts/r2-cleanup.sh --dry-run

# Actually delete
./scripts/r2-cleanup.sh

# Custom retention (e.g., 60 days)
RETENTION_DAYS=60 ./scripts/r2-cleanup.sh
```

### Automation

```bash
# System cron (daily at 3 AM, after backup)
0 3 * * * /path/to/aivo/scripts/r2-cleanup.sh >> /path/to/aivo/logs/r2-cleanup.log 2>&1
```

### Safety Features

- Uses `DRY_RUN` mode by default (set to false to actually delete)
- Logs all actions
- Gracefully handles errors

---

## Deployment Notifications

**Integrated into:** `scripts/deploy.sh`

Deployments can send notifications to Slack, Discord, or any webhook on success/failure.

### Setup

Set `DEPLOY_WEBHOOK_URL` environment variable:

```bash
export DEPLOY_WEBHOOK_URL="https://hooks.slack.com/services/your/webhook/url"
```

### Notification Format

Slack-compatible payload:
```json
{
  "attachments": [{
    "color": "#36a64f" | "#ff4444",
    "fields": [
      {"title": "Environment", "value": "production", "short": true},
      {"title": "Commit", "value": "abc123", "short": true},
      {"title": "Status", "value": "success", "short": true}
    ],
    "text": "Deployment completed successfully..."
  }]
}
```

### Examples

```bash
# With notifications
DEPLOY_WEBHOOK_URL="https://slack.com/..." ./scripts/deploy.sh

# Staging deploy with notifications
./scripts/deploy.sh --staging
```

---

## Smoke Tests

**Script:** `scripts/smoke-tests.sh`

Post-deployment verification of critical endpoints.

### What Gets Tested

1. ✅ Health check endpoint (`/health`)
2. ✅ API root/info
3. ✅ Swagger docs (if enabled)
4. ✅ Auth endpoints (error cases)
5. ✅ Protected endpoints (auth required)
6. ✅ Database connectivity (via health response)
7. ✅ KV cache status (via health response)
8. ✅ R2 storage status (via health response)

### Usage

```bash
# Test production
./scripts/smoke-tests.sh

# Test staging
API_URL=https://staging-api.aivo.website ./scripts/smoke-tests.sh

# Verbose output
./scripts/smoke-tests.sh --verbose

# Custom API URL
./scripts/smoke-tests.sh --api-url http://localhost:8787
```

### Integration with Deploy

Smoke tests run automatically after deployment unless skipped:

```bash
./scripts/deploy.sh --skip-smoke-tests  # Skip
```

### Expected Results

All tests should pass. Failures will be logged but won't fail the deployment by default (configurable).

---

## Scheduled Maintenance

### Cloudflare Workers Cron

Current cron jobs in `wrangler.toml`:

| Schedule | Purpose |
|----------|---------|
| `0 0 * * *` | Daily midnight tasks (stats, cleanup) |
| `0 9 1 * *` | Monthly tasks (1st at 9 AM) |

### Recommended Additional Cron Jobs

Add to `wrangler.toml`:

```toml
[triggers]
crons = [
  "0 0 * * *",      # Daily stats aggregation
  "0 9 1 * *",      # Monthly reports
  "0 2 * * *",      # Daily DB backup trigger (if using worker-based backup)
  "0 3 * * *",      # Daily R2 cleanup trigger
]
```

### System Cron (for non-Worker tasks)

Use `crontab -e` on a server to run:

```bash
# Database backups
0 2 * * * /path/to/aivo/scripts/db-backup.sh >> /path/to/aivo/logs/db-backup-cron.log 2>&1

# R2 cleanup
0 3 * * * /path/to/aivo/scripts/r2-cleanup.sh >> /path/to/aivo/logs/r2-cleanup-cron.log 2>&1
```

---

## Monitoring & Alerts

### Health Check Endpoint

**URL:** `GET /health`

Returns comprehensive status:
```json
{
  "status": "healthy",
  "timestamp": "2025-04-29T...",
  "uptime": 12345,
  "services": [...],
  "database": {...},
  "caches": {...},
  "storage": {...},
  "compute": {...},
  "ai": {...}
}
```

### Key Metrics to Monitor

1. **Response time:** P50 < 100ms, P95 < 500ms
2. **Error rate:** < 0.1%
3. **Database latency:** < 50ms
4. **Cache hit rate:** > 80%
5. **R2 request count:** Watch for spikes
6. **D1 read/write count:** Track costs
7. **KV operations:** Track costs

### Cloudflare Dashboard

Enable these in Cloudflare dashboard:
- Workers Analytics (requests, duration, errors)
- D1 Metrics (reads, writes, storage)
- R2 Metrics (requests, bytes stored)
- KV Metrics (reads, writes)

### External Monitoring

Consider:
- **UptimeRobot / Pingdom:** External ping `/health` every minute
- **Sentry:** Error tracking and alerting
- **Datadog / New Relic:** APM and custom metrics
- **Grafana + Cloudflare Logpush:** Custom dashboards

---

## Cost Optimization

### Understanding the Bill

| Service | Unit Cost | Optimization |
|---------|-----------|--------------|
| D1 Reads | $0.40/M | Cache aggressively (KV) |
| D1 Writes | $1.20/M | Batch writes, use upserts |
| D1 Storage | $0.20/GB-month | Archive old data to R2 |
| KV Reads | $0.20/10K | TTL tuning, reduce calls |
| KV Storage | $0.05/GB-month | Cleanup expired keys |
| R2 Storage | $0.015/GB-month | Lifecycle cleanup |
| R2 GET | $0.01/10K | Cache-Control headers |
| Workers Requests | $0.30/M (after free) | Bundle requests |
| Workers CPU | $4.30/10M ms | Optimize code |

### Immediate Actions

1. **Cache everything possible:**
   - User profiles: 5 min TTL
   - AI responses: 1 hour TTL (by content hash)
   - Aggregated data: 15 min TTL

2. **Reduce D1 reads:**
   - Use covering indexes
   - Select only needed columns
   - Implement materialized views for aggregates

3. **Optimize image storage:**
   - Compress on upload
   - Use WebP/AVIF
   - Set long cache TTL (1 year for immutable)

4. **Monitor costs weekly:**
   ```bash
   # Check current usage
   wrangler d1 databases list
   wrangler r2 bucket list
   wrangler kv namespace list
   ```

### Cost Alerting

Set up alerts at 80% of budget:
```bash
# Example: Alert if D1 reads > 80M in a month
# Use Cloudflare Analytics API or external monitoring
```

---

## Rollback Procedures

### API Rollback

```bash
# List recent deployments
cd apps/api && pnpm exec wrangler deployments list

# Rollback to previous
pnpm exec wrangler rollback <deployment-id>
```

### Database Rollback

Drizzle doesn't auto-generate down migrations. Manual process:

1. **Restore from backup:**
   ```bash
   # Stop the worker temporarily
   wrangler deployments disable <current-deployment>

   # Restore backup
   wrangler d1 execute aivo-db --file backup.sql

   # Re-deploy previous version
   git checkout <previous-commit>
   ./scripts/deploy.sh
   ```

2. **Manual SQL rollback:**
   Write custom SQL to reverse migration. Test on staging first!

### Web Rollback

**Vercel:** Use dashboard to rollback to previous deployment.

**Cloudflare Pages:**
```bash
cd apps/web
git checkout <previous-commit>
./scripts/deploy-web-pages.sh
```

---

## D1 Index Status

### Current Indexes

Migration `0017_add_missing_indexes.sql` added comprehensive indexes:

**Covering:**
- User-centric queries: `(user_id, timestamp DESC)`
- Unread queries: `(user_id, is_read)`
- Composite lookups: `(user_id, status)`, `(user_id, meal_type)`

**Verify Indexes:**

```sql
-- List all indexes
SELECT name FROM sqlite_master WHERE type='index' ORDER BY name;

-- Check index usage (Cloudflare D1 limitation: no EXPLAIN)
-- Instead, monitor query patterns and add indexes as needed
```

### Index Maintenance

- Indexes increase write overhead but improve read performance
- Monitor slow queries and add targeted indexes
- Drop unused indexes (rare in SQLite but can clutter)

---

## Request Metrics Middleware (Optional)

Add to API for detailed logging:

```typescript
// apps/api/src/middleware/metrics.ts
export const metricsMiddleware = async (c: Context, next: Next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;

  console.log(JSON.stringify({
    method: c.req.method,
    route: c.req.path,
    status: c.res.status,
    duration_ms: duration,
    user_id: c.req.header('X-User-ID') || null,
  }));
};
```

Enable Cloudflare Logpush to ship these logs to D1 or R2 for analysis.

---

## Environment Variables Reference

### API (apps/api/.env or wrangler.toml [vars])

| Variable | Required | Purpose |
|----------|----------|---------|
| `AUTH_SECRET` | Yes (prod) | JWT signing secret |
| `OPENAI_API_KEY` | Optional | OpenAI API access |
| `GEMINI_API_KEY` | Optional | Gemini API access |
| `ALLOWED_ORIGINS` | Yes | CORS allowed origins |
| `R2_PUBLIC_URL` | Yes | Public R2 bucket URL |
| `PUBLIC_SWAGGER` | No | Enable Swagger docs |

### Deployment

| Variable | Purpose |
|----------|---------|
| `CLOUDFLARE_API_TOKEN` | Wrangler authentication |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account |
| `DEPLOY_WEBHOOK_URL` | Slack/Discord notifications |
| `STAGING_API_URL` | API URL for smoke tests |

---

## Quick Reference Commands

### Deploy
```bash
# Production (full)
./scripts/deploy.sh

# Staging
./scripts/deploy.sh --staging

# Quick (skip tests)
./scripts/deploy.sh --quick

# Dry run
./scripts/deploy.sh --dry-run
```

### Maintenance
```bash
# Database backup
./scripts/db-backup.sh

# R2 cleanup
./scripts/r2-cleanup.sh

# Smoke tests
./scripts/smoke-tests.sh --api-url https://api.aivo.website
```

### Monitoring
```bash
# View API logs
cd apps/api && pnpm exec wrangler tail

# Check D1 stats
wrangler d1 databases list

# Check R2 usage
wrangler r2 bucket list-objects aivo-images --limit 1

# Health check
curl https://api.aivo.website/health
```

---

## Support

For issues or questions:
- Check logs in `logs/` directory
- Review Cloudflare dashboard
- Consult DEPLOYMENT.md and OPTIMIZATION_PLAN.md
- Contact infrastructure team

---

**Last Updated:** 2025-04-29
**Version:** 1.0.0
