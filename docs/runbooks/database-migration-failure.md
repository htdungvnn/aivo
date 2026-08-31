# Runbook: Database Migration Failure

**Severity:** Critical  
**Last Updated:** 2026-08-31

## Symptoms

- Migration command fails with error
- Database schema is in inconsistent state
- Application errors after migration

## Diagnosis

### 1. Check Migration Status

```bash
# List applied migrations
pnpm --filter @aivo/auth db:migrate:list
pnpm --filter @aivo/health db:migrate:list

# Check for pending migrations
wrangler d1 migrations list aivo-auth-db --local
```

### 2. Identify the Error

```bash
# Run migration with verbose output
wrangler d1 migrations apply aivo-auth-db --local --verbose
```

### 3. Check Database State

```sql
-- Check for partial changes
SELECT * FROM sqlite_master WHERE type='table';

-- Check table schemas
.schema table_name

-- Check for orphaned records
SELECT COUNT(*) FROM table_name;
```

## Resolution

### If Migration is Safe to Retry

1. Fix the migration file
2. Re-run migration:

```bash
# Local
pnpm --filter @aivo/auth db:migrate

# Remote (requires confirmation)
pnpm --filter @aivo/auth db:migrate:remote
```

### If Migration Caused Data Loss

1. **STOP** - Do not proceed
2. Contact on-call DBA
3. Prepare rollback plan:
   ```bash
   # Export current state
   wrangler d1 export aivo-auth-db --local --output backup.sql
   
   # Restore from last known good backup
   # (Coordinate with DBA for production)
   ```

### If Schema is Inconsistent

1. Identify inconsistent tables
2. Manually fix or restore from backup
3. Document the incident

## Rollback Procedure

### For Additive Changes (Safe)

```sql
-- Example: Remove added column
ALTER TABLE users DROP COLUMN new_column;
```

### For Destructive Changes (Not Recommended)

1. Restore from backup
2. Coordinate with application team
3. Plan proper expand-contract migration

## Prevention

- [ ] Test migrations on local database first
- [ ] Use `IF NOT EXISTS` for tables and indexes
- [ ] Use `ON CONFLICT DO UPDATE` for upserts
- [ ] Never drop columns directly
- [ ] Include rollback validation in CI

## Escalation

| Scenario | Contact |
|----------|---------|
| Production data at risk | On-call DBA, Engineering Lead |
| Migration blocking deployment | DevOps Team |
| Unknown error | Engineering Team |

## Post-Incident

1. Document root cause
2. Update migration strategy if needed
3. Add validation tests
4. Update runbook if procedure changed
