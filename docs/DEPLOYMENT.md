# AIVO Deployment Guide

Complete guide for deploying all AIVO monorepo projects.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Build Process](#build-process)
5. [Deployment](#deployment)
6. [Post-Deployment](#post-deployment)
7. [Rollback](#rollback)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

- **Node.js** >= 18
- **pnpm** >= 9 - Package manager
- **Rust** + **wasm-pack** - For WASM compilation
- **Wrangler CLI** - Cloudflare Workers deployment
- **Drizzle Kit** - Database migrations
- **Git** - Version control

### Install Prerequisites

```bash
# Node.js (includes npm)
# Download from https://nodejs.org/ or use nvm

# pnpm
npm install -g pnpm

# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# wasm-pack
cargo install wasm-pack

# Wrangler CLI
npm install -g wrangler

# Drizzle Kit (included in db package)
# Already in db package devDependencies
```

### Cloudflare Setup

1. Create a Cloudflare account at https://dash.cloudflare.com
2. Create a D1 database:
   ```bash
   wrangler d1 database create aivo-db --region=us-east-1
   ```
3. Configure `wrangler.toml` with your database ID
4. Login to Wrangler:
   ```bash
   wrangler login
   ```

---

## Environment Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd aivo
pnpm install
```

### 2. Configure Environment Variables

Create `.env` files for each package as needed:

**API (apps/api/.env)**
```env
# Cloudflare configuration
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_D1_DATABASE_ID=aivo-db

# OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
```

**Web (apps/web/.env.local)**
```env
NEXT_PUBLIC_API_URL=https://api.aivo.yourdomain.com
NEXT_PUBLIC_OAUTH_GOOGLE_CLIENT_ID=your_google_client_id
```

### 3. Verify Local Development

Start all services in development mode:

```bash
# Terminal 1: Start API (Cloudflare Workers Dev)
cd apps/api && pnpmx wrangler dev

# Terminal 2: Start Web (Next.js)
cd apps/web && pnpm run dev

# Terminal 3: Start Mobile (Expo)
cd apps/mobile && pnpmx expo start
```

---

## Database Setup

### 1. Generate Migrations

```bash
cd packages/db
pnpmx drizzle-kit generate
```

This creates migration files in `packages/db/drizzle/migrations/`.

### 2. Apply Migrations Locally (Development)

```bash
cd packages/db
pnpm run migrate:local
```

### 3. Apply Migrations to Production

**Important:** Production migrations are applied during API deployment via `deploy.sh`. Manual production migrations can be run:

```bash
cd packages/db
pnpm run migrate:remote
```

---

## Build Process

### Build All Packages

```bash
# Clean previous builds
pnpm run clean

# Build all packages in correct order
pnpm run build
```

### Build Order Explained

The monorepo uses Turborepo to orchestrate builds. The dependency order is:

1. **@aivo/shared-types** - Type definitions (type-check only)
2. **@aivo/compute** - Rust/WASM compilation
3. **@aivo/db** - Drizzle schema and migrations
4. **@aivo/api** - Cloudflare Workers build
5. **@aivo/web** - Next.js production build
6. **@aivo/mobile** - Expo/EAS build (platform-specific)

### Individual Package Builds

**WASM Compute (packages/aivo-compute)**
```bash
cd packages/aivo-compute
pnpm run build
# Output: pkg/aivo_compute.js, pkg/aivo_compute_bg.wasm
```

**API (apps/api)**
```bash
cd apps/api
pnpm run build
# Output: .wrangler/mine目录 with bundled worker
```

**Web (apps/web)**
```bash
cd apps/web
pnpm run build
# Output: .next/standalone and .next/static
```

**Mobile (apps/mobile)**
```bash
cd apps/mobile
pnpm run build:web  # Web export
# OR
pnpm run build      # Native builds (iOS/Android via EAS)
```

---

## Deployment

### API (Cloudflare Workers)

#### Option A: Automated Deploy (Recommended)

Use the deployment script:

```bash
./scripts/deploy.sh
```

This script:
1. Runs full build
2. Ensures WASM is built
3. Applies database migrations
4. Deploys to Cloudflare Workers

#### Option B: Manual Deploy

```bash
# Build everything
pnpm run build

# Apply database migrations
cd packages/db
pnpm run migrate:remote

# Deploy API
cd apps/api
pnpm run deploy
```

### Web (Next.js)

Deploy to your preferred hosting platform:

#### Vercel (Recommended for Next.js)

```bash
cd apps/web
vercel --prod
```

Or connect repository to Vercel for automatic deployments.

#### Other Platforms

Build and upload:
```bash
cd apps/web
pnpm run build

# Output is in apps/web/.next/standalone
# Upload to your hosting provider
```

### Mobile (React Native / Expo)

#### EAS Build (Recommended)

```bash
cd apps/mobile
pnpmx eas build --platform ios --profile production
pnpmx eas build --platform android --profile production
```

#### Submit to App Stores

```bash
# iOS App Store
pnpmx eas submit --platform ios

# Google Play Store
pnpmx eas submit --platform android
```

---

## Post-Deployment

### Health Checks

1. **API Health**
   ```bash
   curl https://api.aivo.yourdomain.com/health
   # Expected: {"status":"ok"}
   ```

2. **Web Application**
   Visit `https://aivo.yourdomain.com`
   - Check page loads
   - Test API connectivity
   - Verify static assets

3. **Database Connection**
   - Check API logs for DB connection success
   - Test a write operation (e.g., create a workout)

### Verification Checklist

- [ ] API responds with 200 OK
- [ ] Database tables exist and accessible
- [ ] WASM module loads in browser (check Network tab)
- [ ] OAuth flows work (if configured)
- [ ] Web can make API calls successfully
- [ ] Mobile builds succeed (if deploying)

---

## Rollback

### API Rollback

```bash
cd apps/api
pnpmx wrangler deployments list
pnpmx wrangler rollback <deployment-id>
```

### Web Rollback

**Vercel**: Use Vercel dashboard to rollback to previous deployment.

**Manual**: Redeploy previous git commit:
```bash
git checkout <previous-commit>
cd apps/web
pnpm run build
# Deploy to hosting
```

### Database Rollback

```bash
cd packages/db

# List migrations
ls drizzle/migrations/

# Rollback (requires manual SQL or restore from backup)
# Recommended: restore from Cloudflare D1 backup
```

---

## Troubleshooting

### Common Issues

#### WASM Build Fails

```bash
# Ensure Rust is installed
rustc --version

# Clean and rebuild
cd packages/aivo-compute
pnpm run clean
pnpm run build
```

#### Wrangler Build Fails

```bash
# Check wrangler version
wrangler --version  # Should be ^3.99.0

# Clear Wrangler cache
rm -rf .wrangler

# Rebuild
cd apps/api
pnpm run build
```

#### D1 Database Connection Fails

1. Verify database exists:
   ```bash
   wrangler d1 database list
   ```

2. Check `wrangler.toml` has correct `database_id`
3. Ensure database binding name matches (`DB`)

#### Mobile Build Fails

```bash
# Clear Expo cache
cd apps/mobile
pnpmx expo start --clear

# Check EAS credentials
pnpmx eas credentials
```

### Debug Commands

```bash
# Type check all
pnpm run type-check

# Lint all
pnpm run lint

# Test WASM
cd packages/aivo-compute
pnpm run test

# View API logs
cd apps/api
pnpmx wrangler tail

# Database studio (local)
cd packages/db
pnpm run studio
```

### Getting Help

- Cloudflare Workers: https://developers.cloudflare.com/workers/
- Drizzle ORM: https://orm.drizzle.team/
- Next.js: https://nextjs.org/docs
- Expo: https://docs.expo.dev/

---

## Deployment Checklist

Use this checklist before each production deployment:

### Pre-Deployment

- [ ] All tests passing (`pnpm run test`)
- [ ] Type check passes (`pnpm run type-check`)
- [ ] Lint check passes (`pnpm run lint`)
- [ ] Database migrations reviewed
- [ ] Environment variables configured
- [ ] Backup taken (database)

### Build Phase

- [ ] `pnpm run clean` completed
- [ ] WASM build successful
- [ ] API build successful
- [ ] Web build successful
- [ ] All dependencies installed

### Deployment Phase

- [ ] API deployed to Cloudflare Workers
- [ ] Database migrations applied
- [ ] Web deployed to hosting
- [ ] Mobile build published (if applicable)

### Post-Deployment

- [ ] Health checks passing
- [ ] API response times acceptable
- [ ] Error logs checked (no critical errors)
- [ ] Static assets loading
- [ ] OAuth flows tested
- [ ] Monitoring alerts configured

---

## CI/CD Integration

Example GitHub Actions workflow (`.github/workflows/deploy.yml`):

```yaml
name: Deploy AIVO

on:
  push:
    branches: [main]

jobs:
  deploy-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - run: pnpm install
      - run: pnpm run build
      - run: cd packages/db && pnpm run migrate:remote
      - run: cd apps/api && pnpm run deploy
      env:
        CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

---

**Last Updated:** 2026-04-22
**Version:** 1.0.0
**Package Manager:** pnpm 9+
