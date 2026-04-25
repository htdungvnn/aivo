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

# Drizzle Kit (included in db package devDependencies)
```

### Cloudflare Setup

1. Create a Cloudflare account at https://dash.cloudflare.com
2. Create a D1 database:
   ```bash
   wrangler d1 database create aivo-db --region=us-east-1
   ```
3. Create an R2 bucket:
   ```bash
   wrangler r2 bucket create aivo-images
   ```
4. Configure `wrangler.toml` with your database ID and bucket name
5. Login to Wrangler:
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

**Important:** All environment variables are managed centrally in `.env/.env.base`.

```bash
# Copy the template
cp .env/.env.example .env/.env.base

# Edit with your actual values
vim .env/.env.base
```

See [`.env/VARIABLES.md`](./VARIABLES.md) for complete variable reference.

**Minimum required for local development:**
```bash
# Generate AUTH_SECRET
openssl rand -base64 32

# Set API URLs
NEXT_PUBLIC_API_URL=http://localhost:8787
EXPO_PUBLIC_API_URL=http://localhost:8787
R2_PUBLIC_URL=https://your-bucket.r2.dev
```

### 3. Distribute to Apps

```bash
./scripts/setup-env.sh
```

This creates:
- `apps/api/.env`
- `apps/web/.env.local`
- `apps/mobile/.env`

### 4. Verify Local Development

Start all services:

```bash
# Terminal 1: Start API (Cloudflare Workers Dev)
cd apps/api && pnpm exec wrangler dev

# Terminal 2: Start Web (Next.js)
cd apps/web && pnpm run dev

# Terminal 3: Start Mobile (Expo)
cd apps/mobile && pnpm exec expo start
```

---

## Database Setup

### 1. Generate Migrations

```bash
cd packages/db
pnpm exec drizzle-kit generate
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

### Build Order

The monorepo uses Turborepo to orchestrate builds:

1. **@aivo/shared-types** - Type definitions
2. **@aivo/compute** - Rust/WASM compilation
3. **@aivo/db** - Drizzle schema and migrations
4. **@aivo/api** - Cloudflare Workers build
5. **@aivo/web** - Next.js production build
6. **@aivo/mobile** - Expo/EAS build

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
# Output: .wrangler/mine with bundled worker
```

**Web (apps/web)**
```bash
cd apps/web
pnpm run build
# Output: .next/standalone and .next/static
```

---

## Deployment

### API (Cloudflare Workers)

#### Automated Deploy (Recommended)

Use the deployment script:

```bash
./scripts/deploy.sh
```

This script:
1. Runs full build
2. Ensures WASM is built
3. Applies database migrations
4. Deploys to Cloudflare Workers

#### Manual Deploy

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

#### Setting Secrets in Production

Set secrets via Wrangler before deployment:

```bash
cd apps/api
wrangler secret put AUTH_SECRET
wrangler secret put OPENAI_API_KEY  # if using
wrangler secret put GEMINI_API_KEY  # if using
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put FACEBOOK_APP_ID
```

Set environment variables in Cloudflare Dashboard (or via wrangler.toml `[vars]`):
- `ALLOWED_ORIGINS` - Your production domains (comma-separated)
- `R2_PUBLIC_URL` - Your production R2 public URL

### Web Application (Next.js)

#### Vercel (Recommended)

```bash
cd apps/web
vercel --prod
```

Or connect repository to Vercel for automatic deployments.

#### Cloudflare Pages

```bash
./scripts/deploy-web-pages.sh
```

Or manually:
```bash
cd apps/web
pnpm run build:pages
wrangler pages deploy . --project-name aivo-web
```

**Required environment variables on Cloudflare Pages:**
- `NEXT_PUBLIC_API_URL` - Your production API URL
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_FACEBOOK_CLIENT_ID`
- `NEXT_PUBLIC_R2_PUBLIC_URL`
- `NEXT_PUBLIC_APP_URL`

**Configuration Files for Cloudflare Pages:**

| File | Purpose |
|------|---------|
| `_routes` | Pages routing rules (SPA fallback, API proxy) |
| `_routes.json` | Routes manifest for Pages build |
| `pages.config.toml` | Pages build configuration |
| `next.config.cloudflare.js` | Next.js config optimized for Pages |
| `.env.production.local` | Production environment variables template |

**Key Configuration:**

`next.config.cloudflare.js` key settings:
- `output: 'standalone'` - Bundles all dependencies
- `transpilePackages` - Includes workspace packages
- `images.remotePatterns` - Allows R2.dev image hosting
- Webpack fallbacks for Node.js modules

`pages.config.toml` build settings:
- `command = "pnpm run build:pages"`
- `output_directory = ".next/standalone"`
- Security headers configured
- Static asset caching (1 year for immutable assets)

`_routes` routing rules:
- `/*` → `/index.html` (SPA fallback)
- `/api/*` → Proxy to API worker
- Static assets served directly
- Health check endpoint

**R2 Bucket Setup for Pages:**

1. Create R2 bucket: `wrangler r2 bucket create aivo-images`
2. Enable public access or use signed URLs
3. Set `NEXT_PUBLIC_R2_PUBLIC_URL` to your bucket URL
4. Configure CORS on the bucket for your domain

**Troubleshooting Cloudflare Pages:**

- Build fails: Clean and rebuild (see Troubleshooting section)
- Routing issues: Ensure `_routes` file is at project root
- Environment variables: Use `NEXT_PUBLIC_` prefix for client-side vars
- OAuth not working: Verify client IDs and redirect URIs
- Images not loading: Check R2 bucket public access and `remotePatterns`

**Why Cloudflare Pages for AIVO?**
- Unified with Cloudflare Workers API
- Same account/billing
- Edge network integration
- Cost-effective for high traffic

#### Comparison: Vercel vs Cloudflare Pages

| Feature | Vercel | Cloudflare Pages |
|---------|--------|------------------|
| Image Optimization | Built-in, excellent | Built-in, good |
| Edge Functions | Edge Config | Workers (more flexible) |
| Free Tier | 100GB bandwidth/month | unlimited requests, 500 builds/month |
| Build Speed | Fast | Fast |
| Analytics | Excellent | Good |
| Pricing | $20/mo Pro | $5/mo (Workers paid plan) |

### Mobile Application (Expo)

#### EAS Build (Recommended)

```bash
cd apps/mobile
eas build --platform ios --profile production
eas build --platform android --profile production
```

Configure environment variables in `eas.json` build profiles.

#### Submit to App Stores

```bash
# iOS App Store
eas submit --platform ios

# Google Play Store
eas submit --platform android
```

**OAuth Deep Linking Configuration:**

In `apps/mobile/app.json`:
```json
{
  "expo": {
    "scheme": "aivo",
    "ios": {
      "bundleIdentifier": "com.yourcompany.aivo"
    },
    "android": {
      "package": "com.yourcompany.aivo"
    }
  }
}
```

---

## Post-Deployment

### Health Checks

1. **API Health**
   ```bash
   curl https://api.yourdomain.com/health
   # Expected: {"status":"ok"}
   ```

2. **Web Application**
   Visit `https://yourdomain.com`
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
pnpm exec wrangler deployments list
pnpm exec wrangler rollback <deployment-id>
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

### Build Errors

#### "cannot find module" or "file not found"

**Problem:** TypeScript can't resolve imports.

**Solution:**
```bash
# Clean and rebuild
pnpm run clean
pnpm run build

# Check import paths are correct
# Memory service imports use .ts extension:
import { Something } from "./module.ts";
```

#### "Failed to resolve: @aivo/db"

**Problem:** Package not built or linked.

**Solution:**
```bash
# Build db package first
cd packages/db
pnpm build

# Or rebuild all
pnpm run build
```

#### Rust/WASM Build Fails

**Problem:** `wasm-pack` or Rust toolchain issues.

**Solution:**
```bash
# Verify Rust installation
rustc --version  # Should be 1.70+
cargo --version

# Verify wasm-pack
wasm-pack --version

# Reinstall if needed
rustup update
cargo install wasm-pack

# Clean and rebuild compute package
cd packages/aivo-compute
cargo clean
pnpm run build
```

#### "Target `wasm32-unknown-unknown` not installed"

**Solution:**
```bash
rustup target add wasm32-unknown-unknown
```

### Runtime Errors

#### "OpenAI error: rate limit"

**Problem:** Too many API calls.

**Solution:**
- Add retry logic with exponential backoff
- Cache embeddings aggressively
- Batch requests where possible
- Upgrade OpenAI plan if needed

#### "Memory service not available"

**Problem:** OpenAI API key missing or invalid.

**Solution:**
- Verify `OPENAI_API_KEY` is set in environment
- Check API key is valid and has credits
- Ensure no trailing spaces in key

### Database Issues

#### "no such table: memoryNodes"

**Problem:** Migrations not applied.

**Solution:**
```bash
cd packages/db
pnpm run migrate:local  # Development
# OR
pnpm run migrate:remote # Production
```

#### D1 Connection Fails

**Problem:** Database binding misconfigured.

**Solution:**

1. Verify database exists:
   ```bash
   wrangler d1 database list
   ```

2. Check `wrangler.toml`:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "aivo-db"
   database_id = "your-db-id"
   ```

3. Ensure binding name matches in code:
   ```typescript
   interface Env {
     DB: D1Database;  // Binding name must match wrangler.toml
   }
   ```

#### Migrations Won't Apply

**Problem:** Migration SQL errors.

**Solution:**
```bash
# Check migration file syntax
cat packages/db/drizzle/migrations/0000_*.sql

# Apply with verbose output
wrangler d1 migrations apply aivo-db --local --verbose

# Rollback and reapply
wrangler d1 migrations apply aivo-db --local --rollback
```

### OAuth Issues

#### Google OAuth "redirect_uri_mismatch"

**Problem:** OAuth client not configured for localhost.

**Solution:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Edit OAuth 2.0 Client
3. Add authorized JavaScript origin:
   ```
   http://localhost:3000   (Web)
   ```
4. Add authorized redirect URI:
   ```
   http://localhost:3000/login
   ```

For mobile, add package name and SHA-1 fingerprint.

#### Facebook OAuth "App Not Setup"

**Problem:** Facebook app in development mode.

**Solution:**
1. Go to [Facebook Developers](https://developers.facebook.com/apps)
2. Switch app to "Live" mode
3. Or add test users in "Roles" section

#### JWT Verification Fails

**Problem:** `AUTH_SECRET` mismatch or token expired.

**Solution:**
- Ensure `AUTH_SECRET` is same across all deployments
- Use a strong random key (32+ chars)
- Tokens expire after 7 days by default (refresh by re-login)

### Frontend Issues

#### "Failed to fetch" or CORS errors

**Problem:** API URL incorrect or CORS blocking.

**Solution:**

1. Verify `NEXT_PUBLIC_API_URL` / `EXPO_PUBLIC_API_URL` is correct
2. For web, CORS headers should be set by API

#### Chat not showing memories

**Problem:** Memory service not returning context.

**Solution:**
1. Check API logs for memory errors
2. Verify `OPENAI_API_KEY` is set
3. Ensure user has memories stored:
   ```sql
   SELECT COUNT(*) FROM memoryNodes WHERE userId = 'user-123';
   ```
4. Test with `processConversationTurn` first to populate memories

#### Mobile app crashes on startup

**Problem:** Native module not linked.

**Solution:**
```bash
cd apps/mobile
pnpm exec expo install -s  # Install all deps
pnpm exec expo start -c    # Clear cache
```

If using custom native modules:
```bash
pnpm exec expo prebuild
```

### Deployment Issues

#### Wrangler build fails

**Problem:** Missing bindings or config.

**Solution:**
```bash
# Verify wrangler.toml
cat apps/api/wrangler.toml

# Should have:
# [vars]
# OPENAI_API_KEY = "..."
#
# [[d1_databases]]
# binding = "DB"
# database_name = "aivo-db"
# database_id = "..."
```

#### Migration fails on production

**Problem:** SQL syntax error or constraint violation.

**Solution:**
1. Check migration is idempotent (can run multiple times)
2. Test migration locally first:
   ```bash
   wrangler d1 migrations apply aivo-db --remote
   ```
3. Backup database before applying:
   ```bash
   wrangler d1 export aivo-db --output backup.sql
   ```

#### Web build fails on Vercel

**Problem:** Missing environment variables.

**Solution:**
1. Check Vercel Environment Variables dashboard
2. Ensure `NEXT_PUBLIC_` prefix for client-exposed vars
3. Redeploy after adding vars

### TypeScript Errors

#### "Property 'xxx' does not exist on type 'DrizzleD1Database'"

**Problem:** Using wrong Drizzle import.

**Solution:**
```typescript
// Correct import from @aivo/db
import { createDrizzleInstance } from "@aivo/db";

// Not this:
import { drizzle } from "drizzle-orm/d1"; // Wrong, use createDrizzleInstance

const db = createDrizzleInstance(env.DB);
```

#### "Cannot find module '@aivo/memory-service'"

**Problem:** Package not built.

**Solution:**
```bash
cd packages/memory-service
pnpm build
```

### Debug Commands

#### View API Logs (Cloudflare)

```bash
cd apps/api
pnpm exec wrangler tail
```

#### Check Database Locally

```bash
cd packages/db
pnpm run studio  # Opens Drizzle Studio at http://localhost:4983
```

#### Test OpenAI Connection

```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

#### Inspect WASM

```bash
cd packages/aivo-compute
wasm-objdump -x pkg/aivo_compute_bg.wasm | head -50
```

### Common Quick Fixes

| Symptom | Likely Fix |
|---------|-----------|
| "module not found" | `pnpm run build` all packages |
| Port conflict | `kill -9 $(lsof -t -i:8788)` |
| Stale cache | `pnpm store prune && rm -rf node_modules/.cache` |
| WASM not loading | Ensure HTTPS or localhost |
| DB locked | Delete `.wrangler/state/d1` and restart |
| Auth failing | Verify `AUTH_SECRET` and re-login |

---

## CI/CD Integration

### GitHub Actions Example

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

## Deployment Checklists

### Pre-Deployment

- [ ] All tests passing (`pnpm run test`)
- [ ] Type check passes (`pnpm run type-check`)
- [ ] Lint check passes (`pnpm run lint`)
- [ ] Database migrations reviewed
- [ ] Environment variables configured in `.env/.env.base`
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

## Environment Variables Summary

### API (Cloudflare Workers)
Set via `wrangler secret put`:
- `AUTH_SECRET` (required)
- `OPENAI_API_KEY` (optional)
- `GOOGLE_CLIENT_ID` (optional)
- `FACEBOOK_APP_ID` (optional)

Set in `wrangler.toml` [vars]:
- `ALLOWED_ORIGINS` - Allowed CORS origins
- `R2_PUBLIC_URL` - R2 public URL

### Web (Next.js) - `.env.local`
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
NEXT_PUBLIC_FACEBOOK_CLIENT_ID=...
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_R2_PUBLIC_URL=https://your-bucket.r2.dev
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Mobile (Expo) - `.env`
```
EXPO_PUBLIC_GOOGLE_CLIENT_ID=...
EXPO_PUBLIC_FACEBOOK_CLIENT_ID=...
EXPO_PUBLIC_API_URL=https://api.your-domain.com
EXPO_PUBLIC_R2_PUBLIC_URL=https://your-bucket.r2.dev
EXPO_PUBLIC_SCHEME=aivo
```

---

## Production Configuration

### OAuth Provider Setup

#### Google Cloud Console
1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID
3. Add authorized JavaScript origins:
   - `http://localhost:3000` (dev)
   - `https://your-domain.com` (prod)
4. Add authorized redirect URIs:
   - `http://localhost:3000/login` (dev)
   - `https://your-domain.com/login` (prod)
5. Copy Client ID to environment variables

#### Facebook Developers
1. Go to https://developers.facebook.com/apps
2. Create new app with "Consumer" type
3. Add "Facebook Login" product
4. Configure OAuth redirect URIs
5. Copy App ID to environment variables

---

**Last Updated:** 2026-04-25
**Version:** 2.0.0 (Consolidated)
**Package Manager:** pnpm 9+
