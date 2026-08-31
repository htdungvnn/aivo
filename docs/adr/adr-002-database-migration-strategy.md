# ADR-002: Database Migration Strategy

**Status:** Accepted  
**Date:** 2026-08-31  
**Author:** Solution Architecture Team

## Context

AIVO services use Cloudflare D1 for persistence. Migrations must be deterministic, safe for rolling deployments, and work with D1's SQLite compatibility.

## Decision

### Migration Principles

1. **Deterministic**: Same migration produces same result
2. **Ordered**: Sequential numbering with explicit dependencies
3. **Idempotent**: `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`
4. **Expand-Contract**: Non-breaking changes only

### Migration File Naming

```
migrations/
  0001_initial_{domain}_schema.sql
  0002_add_{feature}_table.sql
  0003_{breaking_change}_migration.sql  # Separate migration
```

### Expand-Contract Pattern

For breaking changes:

1. **Add** new nullable column or table (deploy)
2. **Migrate** write code to support both old and new (deploy)
3. **Backfill** data safely (background job)
4. **Switch** read to new structure (deploy)
5. **Remove** old structure (future deploy)

### Forbidden Practices

- `DROP COLUMN` without expand-contract
- `ALTER TABLE` that loses data
- `TRUNCATE TABLE`
- Production seed execution
- Hardcoded timestamps for deterministic behavior

## Consequences

### Positive

- Safe rolling deployments
- No data loss during migrations
- Clear rollback path

### Negative

- Multi-deploy changes take longer
- More complex than "just update"

## Commands

```bash
# Local development
pnpm --filter @aivo/auth db:migrate
pnpm --filter @aivo/health db:migrate

# Remote production (requires confirmation)
pnpm --filter @aivo/auth db:migrate:remote

# List migrations
pnpm --filter @aivo/auth db:migrate:list
pnpm --filter @aivo/health db:migrate:list:remote
```

## References

- [Cloudflare D1 Migrations](https://developers.cloudflare.com/d1/migrations/)
