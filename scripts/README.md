# AIVO Deployment Scripts

This directory contains optimized scripts for deploying and managing the AIVO platform.

## Quick Start

### One-Command Setup (Development)

```bash
# 1. Full setup (env + validate + dev dependencies)
./scripts/setup.sh all

# 2. Start all services
./scripts/dev.sh
```

### One-Command Deploy (Production)

```bash
# Full deployment with all checks
./scripts/deploy.sh

# Fast deployment (skip type-check, lint, tests)
./scripts/deploy.sh --quick
```

## Consolidated Commands

| Command | Description | Flags |
|---------|-------------|-------|
| `setup.sh` | Environment setup | `env`, `validate`, `dev`, `all`, `secrets` |
| `dev.sh` | Start development services | `--vibe` |
| `deploy.sh` | Deploy to production | `--quick`, `--skip-tests`, `--dry-run`, `--local`, `--no-web`, `--no-api` |
| `health.sh` | Health check | `--local` |
| `migrate.sh` | Database migrations | `--remote` |
| `generate-secrets.sh` | Generate secure secrets | - |
| `deploy-web-pages.sh` | Deploy web to Cloudflare Pages | - |
| `fix_claude.sh` | Claude CLI retry wrapper | - |

## Backwards Compatibility

All original script names continue to work as thin wrappers:

```bash
# These all work identically:
./scripts/setup.sh env        == ./scripts/setup-env.sh
./scripts/setup.sh validate   == ./scripts/validate-env.sh
./scripts/setup.sh dev        == ./scripts/setup-dev.sh
./scripts/deploy.sh --quick   == ./scripts/quick-deploy.sh
./scripts/dev.sh --vibe       == ./scripts/vibe_start.sh
./scripts/health.sh --local   == ./scripts/health-check.sh
```

## Command Reference

### setup.sh - Environment Setup

```bash
# Create .env files from templates
./scripts/setup.sh env

# Validate environment configuration
./scripts/setup.sh validate

# Set up local development (deps, WASM, database)
./scripts/setup.sh dev

# Generate secrets (same as generate-secrets.sh)
./scripts/setup.sh secrets

# Run full setup flow
./scripts/setup.sh all
```

### dev.sh - Development Services

```bash
# Start all services in tmux
./scripts/dev.sh

# Start with Claude helper (fix_claude.sh auto-retry)
./scripts/dev.sh --vibe
```

When attached to tmux session:
- Windows: `api` (port 8787), `web` (port 3000), `mobile` (Expo), `logs`, `claude` (if --vibe)
- Switch windows: `Ctrl+B` then `0,1,2,3,4`
- Detach: `Ctrl+B` then `D`

### deploy.sh - Production Deployment

```bash
# Full deployment with all checks
./scripts/deploy.sh

# Fast deployment (skip type-check, lint, tests)
./scripts/deploy.sh --quick

# Skip tests only
./scripts/deploy.sh --skip-tests

# Dry run (show what would happen)
./scripts/deploy.sh --dry-run

# Local development deployment
./scripts/deploy.sh --local

# Deploy API only
./scripts/deploy.sh --no-web

# Deploy web only
./scripts/deploy.sh --no-api
```

### health.sh - Health Checks

```bash
# Production health check (curl endpoints)
./scripts/health.sh

# Local development health check (ports, processes, build artifacts)
./scripts/health.sh --local
```

### migrate.sh - Database Migrations

```bash
# Generate and optionally apply migrations
./scripts/migrate.sh

# Apply to remote/production database
./scripts/migrate.sh --remote
```

## Environment Setup

### Initial Development Setup

1. **Create environment files**:
   ```bash
   ./scripts/setup.sh env
   ```

2. **Generate secrets**:
   ```bash
   ./scripts/setup.sh secrets
   # or: ./scripts/generate-secrets.sh
   ```

3. **Edit `.env` files** with your actual credentials:
   - `AUTH_SECRET` (from generate-secrets.sh)
   - `GOOGLE_CLIENT_ID` (from Google Cloud Console)
   - `FACEBOOK_APP_ID` (from Facebook Developers)
   - `OPENAI_API_KEY` (optional, for AI features)

4. **Validate configuration**:
   ```bash
   ./scripts/setup.sh validate
   ```

5. **Install dependencies and setup database**:
   ```bash
   ./scripts/setup.sh dev
   ```

6. **Start development**:
   ```bash
   ./scripts/dev.sh
   ```

### Production Deployment

1. **Set Cloudflare secrets**:
   ```bash
   cd apps/api
   wrangler secret put AUTH_SECRET
   wrangler secret put OPENAI_API_KEY
   wrangler secret put GOOGLE_CLIENT_ID
   wrangler secret put FACEBOOK_APP_ID
   ```

2. **Configure `wrangler.toml`** with actual resource IDs:
   - `database_id` for D1
   - `id` for each KV namespace
   - `bucket_name` for R2
   - `R2_PUBLIC_URL` in `[vars]`

3. **Deploy**:
   ```bash
   ./scripts/deploy.sh
   ```

## Individual Package Commands

### API (Cloudflare Workers)
```bash
cd apps/api
pnpm run build      # Build
pnpm run deploy     # Deploy
pnpm exec wrangler tail  # View logs
```

### Web (Next.js - Cloudflare Pages)
```bash
cd apps/web
pnpm run build:pages   # Build for Pages
wrangler pages deploy .  # Deploy to Pages
```

### Database
```bash
cd packages/db
pnpm exec drizzle-kit generate   # Generate migrations
pnpm run migrate:local          # Apply to local DB
pnpm run migrate:remote         # Apply to production DB
pnpm run studio                 # Open Drizzle Studio
```

### WASM Compute
```bash
cd packages/aivo-compute
pnpm run build   # Build WASM
pnpm run test    # Run tests
```

## Troubleshooting

### Build fails
- Clean: `pnpm run clean`
- Check Rust: `rustc --version`
- Check wasm-pack: `wasm-pack --version`

### Deploy fails
- Check wrangler: `wrangler whoami`
- Verify env vars
- Check quota: Cloudflare dashboard

### Database migration fails
- Backup first: `wrangler d1 backup create aivo-db`
- Check migrations: `ls packages/db/drizzle/migrations/`
- Review migration files

### Dev services won't start
- Check ports: 3000 (web), 8787 (api), 8081 (expo)
- Kill existing: `lsof -ti:3000 | xargs kill -9`
- Clear cache: `rm -rf node_modules .next .wrangler`

## Monitoring

```bash
# API logs
cd apps/api && pnpm exec wrangler tail

# Database queries (local)
cd packages/db && pnpm run studio

# Health check (production)
./scripts/health.sh

# Health check (local)
./scripts/health.sh --local
```

## Rollback

```bash
# API rollback
cd apps/api
pnpm exec wrangler deployments list
pnpm exec wrangler rollback <deployment-id>

# Web rollback (Vercel)
vercel rollback <deployment-url>

# Database rollback
# Manual SQL or restore from Cloudflare backup
```

## CI/CD Integration

These scripts work well in CI/CD pipelines:

```yaml
- name: Deploy AIVO
  run: |
    ./scripts/deploy.sh --skip-tests
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    AUTH_SECRET: ${{ secrets.AUTH_SECRET }}
```

## Script Consolidation Summary

**Before**: 14 separate scripts with overlapping functionality
**After**: 4 consolidated scripts + 6 thin wrappers + 4 standalone utilities

| Original Scripts | Consolidated Into |
|-----------------|-------------------|
| `health.sh` + `health-check.sh` | `health.sh` (`--local` flag) |
| `deploy.sh` + `quick-deploy.sh` | `deploy.sh` (`--quick` flag) |
| `setup-dev.sh` + `setup-env.sh` + `validate-env.sh` | `setup.sh` (`env`, `validate`, `dev`, `all` subcommands) |
| `dev.sh` + `vibe_start.sh` | `dev.sh` (`--vibe` flag) |

**Benefits**:
- Single source of truth for each domain
- Discoverable options via `--help`
- Backwards compatible (old script names still work)
- Easier maintenance and documentation
