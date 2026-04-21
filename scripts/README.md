# AIVO Deployment Scripts

This directory contains scripts for deploying and managing the AIVO platform.

## Quick Start

### One-Command Deploy (Production)
```bash
./scripts/deploy.sh
```

### Local Development
```bash
# Setup everything
./scripts/setup-dev.sh

# Start all services in tmux
./scripts/dev.sh
```

## Available Scripts

| Script | Description | Usage |
|--------|-------------|-------|
| `deploy.sh` | Full production deployment with build, tests, and deploy | `./scripts/deploy.sh` |
| `quick-deploy.sh` | Fast deployment without type-check/lint | `./scripts/quick-deploy.sh` |
| `migrate.sh` | Database migration generator and applier | `./scripts/migrate.sh [--remote]` |
| `health.sh` | Health check for deployed services | `./scripts/health.sh` |
| `setup-dev.sh` | Initial local development setup | `./scripts/setup-dev.sh` |
| `dev.sh` | Start all dev services in tmux | `./scripts/dev.sh` |

## Deployment Options

### Full Deployment
```bash
# Production deploy (full checks)
./scripts/deploy.sh

# Dry run (see what would happen)
./scripts/deploy.sh --dry-run

# Skip tests
./scripts/deploy.sh --skip-tests

# Deploy API only
./scripts/deploy.sh --no-web

# Local deployment
./scripts/deploy.sh --local
```

### Environment Variables (Production)

Before deploying, set these variables:

```bash
export CLOUDFLARE_API_TOKEN="your_api_token"
export CLOUDFLARE_ACCOUNT_ID="your_account_id"
export AUTH_SECRET="random_secret_string"
export API_URL="https://api.aivo.yourdomain.com"
```

### Using pnpm scripts

You can also run these via pnpm:

```json
{
  "scripts": {
    "deploy": "./scripts/deploy.sh",
    "deploy:quick": "./scripts/quick-deploy.sh",
    "dev": "./scripts/dev.sh",
    "migrate": "./scripts/migrate.sh",
    "health": "./scripts/health.sh"
  }
}
```

Then:
```bash
pnpm run deploy
pnpm run dev
```

## Deployment Flow

1. **Check Prerequisites** - Verify Rust, Node, pnpm, wrangler installed
2. **Environment Check** - Ensure required env vars for production
3. **Type Check & Lint** - Run TypeScript and ESLint checks
4. **Tests** - Run test suite (can skip with `--skip-tests`)
5. **Clean** - Remove previous build artifacts
6. **Install** - Install dependencies
7. **Build WASM** - Compile Rust to WebAssembly
8. **Generate Migrations** - Create Drizzle migrations from schema
9. **Build API** - Bundle Cloudflare Workers
10. **Build Web** - Build Next.js app
11. **Apply Migrations** - Run D1 migrations
12. **Deploy API** - Deploy to Cloudflare Workers
13. **Health Check** - Verify services are running

## Individual Package Commands

### API (Cloudflare Workers)
```bash
cd apps/api
pnpm run build      # Build
pnpm run deploy     # Deploy
pnpmx wrangler tail # View logs
```

### Web (Next.js)
```bash
cd apps/web
pnpm run build      # Build
# Deploy via Vercel, Netlify, or copy .next/standalone
```

### Database
```bash
cd packages/db
pnpmx drizzle-kit generate   # Generate migrations
pnpm run migrate:local      # Apply to local DB
pnpm run migrate:remote     # Apply to production DB
pnpm run studio             # Open Drizzle Studio
```

### WASM Compute
```bash
cd packages/aivo-compute
pnpm run build     # Build WASM
pnpm run test      # Run tests
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
cd apps/api && pnpmx wrangler tail

# Database queries (local)
cd packages/db && pnpm run studio

# Health check
./scripts/health.sh
```

## Rollback

```bash
# API rollback
cd apps/api
pnpmx wrangler deployments list
pnpmx wrangler rollback <deployment-id>

# Web rollback (Vercel)
vercel rollback <deployment-url>

# Database rollback
# Manual SQL or restore from Cloudflare backup
```

## CI/CD Integration

These scripts can be used in GitHub Actions, GitLab CI, etc.

Example:
```yaml
- name: Deploy AIVO
  run: |
    ./scripts/deploy.sh --skip-tests
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    AUTH_SECRET: ${{ secrets.AUTH_SECRET }}
```
