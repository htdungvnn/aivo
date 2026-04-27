# CI/CD Pipeline Documentation

Complete guide to AIVO's continuous integration and deployment pipelines.

## Table of Contents

- [Overview](#overview)
- [GitHub Actions Workflows](#github-actions-workflows)
- [CI Pipeline](#ci-pipeline)
- [Deployment Pipeline](#deployment-pipeline)
- [Web Deployment Pipeline](#web-deployment-pipeline)
- [Manual Deployments](#manual-deployments)
- [Environment Promotion](#environment-promotion)
- [Monitoring and Alerts](#monitoring-and-alerts)
- [Troubleshooting](#troubleshooting)

## Overview

AIVO uses GitHub Actions for CI/CD with three main workflows:

1. **CI** (`ci.yml`) - Runs on every push/PR, builds and tests all packages
2. **Deploy** (`deploy.yml`) - Deploys API to Cloudflare Workers on main/staging
3. **Deploy Web** (`deploy-web.yml`) - Deploys web app to Cloudflare Pages

### Pipeline Triggers

| Workflow | Triggers | Environments |
|----------|----------|--------------|
| CI | Push to any branch, PR to main/staging | All |
| Deploy | Push to main, manual trigger | production, staging |
| Deploy Web | Push to main, manual trigger | production, staging |

### Branch Strategy

- `main` - Production deployments
- `staging` - Staging deployments for integration testing
- `feature/*` - CI only, no deployments

## GitHub Actions Workflows

### CI Workflow (`.github/workflows/ci.yml`)

**Purpose**: Validate code quality, run tests, build artifacts

**Jobs**:
1. `lint` - ESLint across all packages
2. `type-check` - TypeScript type checking
3. `test` - Unit and integration tests with coverage
4. `build` - Build all packages including WASM
5. `upload-artifacts` - Store build artifacts for deployment

**Matrix Strategy**: Tests run on multiple Node.js versions (18, 20)

**Artifacts**:
- `build/` - Compiled packages
- `wasm/` - WASM binaries
- `coverage/` - Test coverage reports

**Timeout**: 60 minutes per job

### Deploy Workflow (`.github/workflows/deploy.yml`)

**Purpose**: Deploy API to Cloudflare Workers

**Conditions**:
- Runs only on `main` or `staging` branches
- Requires CI to pass
- Manual approval for production (via GitHub Environments)

**Jobs**:
1. `setup` - Setup Node, pnpm, install dependencies
2. `build` - Build all packages (WASM, TypeScript)
3. `deploy` - Deploy to Cloudflare Workers using wrangler
4. `health-check` - Verify deployment health

**Environments**:
- `staging` - Auto-deploy on push to staging branch
- `production` - Requires manual approval via `workflow_dispatch`

**Secrets Required** (set in GitHub repo settings):
- `CLOUDFLARE_API_TOKEN` - Cloudflare API token with Workers access
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID
- `CLOUDFLARE_PROJECT_ID` - Worker project ID (optional)

### Deploy Web Workflow (`.github/workflows/deploy-web.yml`)

**Purpose**: Deploy Next.js web app to Cloudflare Pages

**Jobs**:
1. `setup` - Install dependencies
2. `build` - Build Next.js app for Pages
3. `deploy` - Deploy to Cloudflare Pages

**Build Command**:
```bash
cd apps/web
pnpm run build:pages
```

**Deploy Command**:
```bash
npx wrangler pages deploy apps/web/.next/standalone --project-name aivo-web
```

**Secrets**:
- Same as Deploy workflow

## CI Pipeline Details

### Lint Job

```yaml
- name: Lint
  run: pnpm run lint
```

Runs ESLint with project config:
- Checks all packages
- Fails on errors
- Reports warnings

### Type Check Job

```yaml
- name: Type Check
  run: pnpm run type-check
```

Runs TypeScript compiler in `noEmit` mode across all packages.

### Test Job

```yaml
- name: Test
  run: pnpm run test:coverage
```

- Runs all unit and integration tests
- Generates coverage reports in `coverage/`
- Uploads coverage to Codecov (if configured)
- Fails if coverage drops below thresholds

**Coverage thresholds** (defined in `jest.config.js` files):
- Statements: 80%
- Branches: 70%
- Functions: 80%
- Lines: 80%

### Build Job

```yaml
- name: Build
  run: |
    pnpm run build
    pnpm run build:wasm
```

Build steps:
1. Build all TypeScript packages
2. Build Rust WASM packages
3. Verify WASM outputs exist
4. Run post-build validation

**Validation checks**:
- All `pkg/*.wasm` files exist
- Type definitions generated correctly
- No TypeScript errors in generated types

## Deployment Pipeline Details

### Pre-deployment Checks

Before deploying, the pipeline ensures:

1. **CI passed** - All tests, lint, type-check pass
2. **Build artifacts exist** - WASM built, packages compiled
3. **Version bump** - package.json versions are valid semver
4. **Migrations ready** - Database migrations included if schema changed

### Deployment Steps

#### 1. Setup

```yaml
- uses: actions/checkout@v4
- uses: pnpm/action-setup@v3
  with:
    version: 9
- run: pnpm install --frozen-lockfile
```

#### 2. Build

```yaml
- run: pnpm run build
- run: pnpm run build:wasm
```

#### 3. Deploy to Cloudflare Workers

```yaml
- run: npx wrangler deploy
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

Uses `wrangler.toml` configuration from `apps/api/`.

#### 4. Health Check

```yaml
- run: |
    response=$(curl -s -o /dev/null -w "%{http_code}" https://api.aivo.website/health)
    if [ "$response" != "200" ]; then
      echo "Health check failed"
      exit 1
    fi
```

Checks:
- HTTP 200 response
- Response time < 2 seconds
- JSON body has `status: "ok"`

### Post-deployment

- **Slack notification** (if configured) - Notify team of deployment
- **Invalidate cache** - Purge Cloudflare cache if needed
- **Rolling back** - See [Rollback Procedure](#rollback-procedure)

## Web Deployment Pipeline

### Build Configuration

Next.js is configured for Cloudflare Pages in `apps/web/next.config.cloudflare.js`:

```javascript
const withCloudflare = require('@cloudflare/next-on-pages');

module.exports = withCloudflare({
  // Standalone output for Pages
  output: 'standalone',
  // Experimental app router enabled
  experimental: {
    serverComponentsExternalPackages: ['@aivo/db'],
  },
});
```

### Build Process

1. Install dependencies
2. Build Next.js app:
   ```bash
   cd apps/web
   pnpm run build:pages
   ```
3. Output goes to `apps/web/.next/standalone`
4. Deploy to Cloudflare Pages

### Pages Configuration

`apps/web/pages.config.toml`:

```toml
[build]
  command = "pnpm run build:pages"
  publish = ".next/standalone"

[build.environment]
  NODE_VERSION = "20"
  NPM_VERSION = "9"

[[routes]]
  pattern = "/api/*"
  script = "api-proxy.js"
```

### Routing

The `_routes` file controls Cloudflare Pages routing:

```
/api/*    /api/index.js   proxy
/*        /index.html     asset
```

## Manual Deployments

### Deploy API

```bash
# Staging
./scripts/deploy.sh staging

# Production
./scripts/deploy.sh production
```

The `deploy.sh` script:
1. Builds all packages
2. Runs tests
3. Deploys with wrangler to specified environment
4. Runs health checks
5. Logs deployment

### Deploy Web

```bash
# Staging
./scripts/deploy-web-pages.sh staging

# Production
./scripts/deploy-web-pages.sh production
```

### Using Wrangler Directly

```bash
# Preview deployment (staging)
cd apps/api
npx wrangler dev

# Deploy to production
npx wrangler deploy --env production

# Deploy to staging
npx wrangler deploy --env staging
```

## Environment Promotion

### Staging → Promotion

1. Deploy to `staging` branch for testing
2. Run QA tests on staging environment
3. Verify metrics and logs
4. If issues, fix and redeploy
5. When approved, merge `staging` → `main`
6. Production deployment auto-triggers

### Database Migrations

Migrations are applied automatically during deployment via wrangler:

```bash
# Apply migrations to production
npx wrangler d1 migrations apply aivo-db --env production

# Apply to staging
npx wrangler d1 migrations apply aivo-db --env staging
```

**Important**: Always test migrations locally first:
```bash
pnpm --filter @aivo/db exec wrangler d1 migrations apply aivo-db --local
```

### Rollback Procedure

#### Rollback API

```bash
# List previous deployments
npx wrangler deployments list

# Rollback to specific deployment
npx wrangler deployments rollback <deployment-id>
```

Or via GitHub:
1. Go to Actions tab
2. Find the deployment workflow run
3. Click "Re-run jobs" with previous commit

#### Rollback Web

Cloudflare Pages keeps previous deployments:
1. Go to Cloudflare Dashboard → Pages → aivo-web
2. Click "Deployments" tab
3. Find previous deployment
4. Click "Promote" to make it live

#### Database Rollback

If migration fails:

```bash
# List applied migrations
npx wrangler d1 migrations apply aivo-db --local --dry-run

# To revert (if needed):
# 1. Restore from backup
# 2. Reapply previous migration version
```

**Note**: Cloudflare D1 automatic backups are enabled. Contact Cloudflare support for restore if needed.

## Monitoring and Alerts

### Health Checks

API provides `/health` endpoint:

```bash
curl https://api.aivo.website/health
# Response: {"status":"ok","timestamp":"2024-01-15T..."}
```

Used by:
- Load balancers
- Deployment pipelines
- Monitoring systems

### Metrics

Cloudflare Workers analytics:
- Requests per second
- Error rates
- Latency (p50, p95, p99)
- CPU time
- Bandwidth

Access via Cloudflare Dashboard → Workers & Pages.

### Logging

All logs go to Cloudflare Logpush (configured in Dashboard):
- HTTP request logs
- Worker console logs
- Error logs

Can also view real-time:
```bash
npx wrangler tail --format json
```

### Alerts

Set up alerts in Cloudflare Dashboard:
- Error rate > 1%
- Response time p95 > 1s
- CPU time > 50ms per request
- Memory usage > 50MB

## Troubleshooting

### Deployment Failures

#### "No matching worker found"

**Cause**: Project name mismatch in wrangler.toml

**Fix**:
```bash
# Check project name in apps/api/wrangler.toml
# name = "aivo-api"
# Ensure Cloudflare project exists with same name
npx wrangler projects list
```

#### "Authentication error"

**Cause**: Invalid or missing CLOUDFLARE_API_TOKEN

**Fix**:
1. Generate new API token in Cloudflare Dashboard
2. Add to GitHub repo secrets
3. Ensure token has "Edit" permission on Workers

#### Build fails on WASM

**Cause**: Rust toolchain not available in CI

**Fix** (already configured in ci.yml):
```yaml
- uses: dtolnay/rust-toolchain@stable
  with:
    targets: wasm32-unknown-unknown
```

#### "Port already in use"

**Cause**: Local dev server port conflict

**Fix**:
```bash
# Change port in wrangler.toml:
# [dev]
# port = 8788
```

### Rollback Issues

#### Rollback fails

**Cause**: Deployment ID incorrect or too old

**Fix**:
```bash
# List available deployments
npx wrangler deployments list

# Use correct deployment ID
npx wrangler deployments rollback <valid-id>
```

### Health Check Failures

If health check fails post-deployment:

1. Check logs:
   ```bash
   npx wrangler tail
   ```

2. Verify environment variables:
   ```bash
   npx wrangler secret list
   ```

3. Test endpoint manually:
   ```bash
   curl https://api.aivo.website/health -v
   ```

4. Check wrangler.toml configuration

### CI/CD Configuration Files

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | Continuous integration |
| `.github/workflows/deploy.yml` | API deployment |
| `.github/workflows/deploy-web.yml` | Web deployment |
| `apps/api/wrangler.toml` | Cloudflare Workers config |
| `apps/web/pages.config.toml` | Cloudflare Pages config |
| `apps/web/next.config.cloudflare.js` | Next.js Pages config |
| `scripts/deploy.sh` | Manual API deployment script |
| `scripts/deploy-web-pages.sh` | Manual web deployment script |

## Advanced Topics

### Using GitHub Environments

For production deployments requiring approval:

1. Create GitHub Environment:
   - Repo Settings → Environments → New environment
   - Name: `production`
   - Required reviewers: Add team members
   - Wait timer: 5 minutes

2. Reference in workflow:
   ```yaml
   environment:
     name: production
     url: https://api.aivo.website
   ```

### Canary Deployments

To implement canary:

1. Deploy to preview URL first:
   ```bash
   npx wrangler deploy --preview
   ```

2. Route small percentage of traffic via Cloudflare:
   - Use Worker routes with percentage-based routing
   - Gradually increase traffic

3. Monitor metrics for 24 hours
4. Promote to full production

### Blue-Green Deployment

1. Deploy new version to separate project:
   ```bash
   npx wrangler deploy --env green
   ```

2. Test green environment
3. Switch DNS/CNAME to green
4. Keep blue as rollback target

### Feature Flags

Use environment variables for feature toggles:

```typescript
const ENABLE_NEW_FEATURE = process.env.ENABLE_NEW_FEATURE === "true";

if (ENABLE_NEW_FEATURE) {
  // New implementation
} else {
  // Old implementation
}
```

Toggle via wrangler secret:
```bash
npx wrangler secret put ENABLE_NEW_FEATURE --value "true"
```

## Security Considerations

- **Never** commit secrets to git
- Use GitHub Secrets for CI/CD tokens
- Rotate Cloudflare API tokens regularly
- Use least-privilege permissions for tokens
- Enable 2FA on GitHub and Cloudflare accounts
- Audit deployment logs regularly

## Support

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [GitHub Actions Docs](https://docs.github.com/actions)
- [AIVO Deployment Guide](./DEPLOYMENT.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
