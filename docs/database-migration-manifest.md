# Database Migration Manifest

This document tracks all database migrations across AIVO services.

## Auth Service (`aivo-auth-db`)

| ID | Name | Purpose | Risk | Dependencies | Reversible |
|----|------|---------|------|-------------|------------|
| 0001 | `initial_auth_schema` | Core auth tables (users, sessions, tokens, audit) | Low | None | No |
| 0002 | `verification_codes` | Add verification code columns | Low | 0001 | Yes |

## Health Service (`aivo-health-db`)

| ID | Name | Purpose | Risk | Dependencies | Reversible |
|----|------|---------|------|-------------|------------|
| 0001 | `initial_health_schema` | Core health tables (readiness, intelligence, actions, check-ins, habits) | Low | None | No |
| 0002 | `health_report_schema` | Health report tables (schedules, jobs, reports) | Low | 0001 | Yes |

## Coach Service (`aivo-coach-db`)

| ID | Name | Purpose | Risk | Dependencies | Reversible |
|----|------|---------|------|-------------|------------|
| 0001 | `initial_coach_schema` | Core coach tables (exercises, plans, sessions, summaries) | Low | None | No |

## Nutrition Service (`aivo-nutrition-db`)

| ID | Name | Purpose | Risk | Dependencies | Reversible |
|----|------|---------|------|-------------|------------|
| 0001 | `initial_nutrition_schema` | Core nutrition tables (foods, meals, analyses, plans, targets) | Low | None | No |

## Migration Commands

### Local Development

```bash
# Auth
pnpm --filter @aivo/auth db:migrate

# Health
pnpm --filter @aivo/health db:apply

# Coach
pnpm --filter @aivo/coach db:apply

# Nutrition
pnpm --filter nutrition db:migrate
```

### Remote Production

```bash
# Auth (requires confirmation)
pnpm --filter @aivo/auth db:migrate:remote

# Health (requires confirmation)
pnpm --filter @aivo/health db:apply:prod

# Coach (requires confirmation)
pnpm --filter @aivo/coach db:apply:prod

# Nutrition (requires confirmation)
pnpm --filter nutrition db:migrate:remote
```

### List Migrations

```bash
# Local
pnpm --filter @aivo/auth db:migrate:list

# Remote
pnpm --filter @aivo/auth db:migrate:list:remote
```

## Adding a New Migration

1. Create migration file in service's `migrations/` directory
2. Follow naming convention: `NNNN_description.sql`
3. Use `CREATE TABLE IF NOT EXISTS`
4. Use `CREATE INDEX IF NOT EXISTS`
5. Add reversion comment if applicable
6. Update this manifest

### Example Migration

```sql
-- Migration: 0003_add_user_preferences
-- Description: Add user preferences table
-- Risk: Low
-- Reversible: Yes

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS user_preferences (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    preference_key TEXT NOT NULL,
    preference_value TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_prefs_user_key 
    ON user_preferences(user_id, preference_key);

--[[REVERSE:
DROP INDEX IF EXISTS idx_user_prefs_user_key;
DROP TABLE IF EXISTS user_preferences;
]]
```

## Validation Checklist

Before deploying to production:

- [ ] Migration tested on local database
- [ ] Migration tested on clean database
- [ ] Migration tested on representative previous schema
- [ ] Rollback procedure documented
- [ ] Data backfill plan if needed
- [ ] CI pipeline passes
- [ ] Staging deployment successful

## Emergency Rollback

If a migration causes critical issues:

1. **Stop deployment pipeline**
2. **Do NOT auto-revert** - assess impact first
3. **Contact on-call DBA**
4. **If rollback required:**
   ```bash
   # Export current state
   wrangler d1 export aivo-auth-db --local --output emergency_backup.sql
   
   # Manual rollback (coordinate with team)
   wrangler d1 execute aivo-auth-db --command-file rollback.sql
   ```
5. **Post-incident review**

## Retention Policy

- Migration files: Permanent (git history)
- Database backups: 90 days
- Migration logs: 1 year
