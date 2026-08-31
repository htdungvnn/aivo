# AIVO Environment Configuration Guide

## Overview

This document describes the environment configuration for the AIVO monorepo across development and production environments.

## Quick Start

### 1. Setup Cloudflare Infrastructure

```bash
# Set your Cloudflare API token
export CLOUDFLARE_API_TOKEN=cfut_xxxxx
export CLOUDFLARE_ACCOUNT_ID=312b98fff6f54aa11ae59cb06d30015a

# Or add to .env file
echo "CLOUDFLARE_API_TOKEN=cfut_xxxxx" >> .env
echo "CLOUDFLARE_ACCOUNT_ID=312b98fff6f54aa11ae59cb06d30015a" >> .env

# Generate JWT keys
./scripts/setup-infra.sh keys

# Create all infrastructure
./scripts/setup-infra.sh all

# Or create individual components
./scripts/setup-infra.sh d1    # D1 databases
./scripts/setup-infra.sh kv    # KV namespaces
./scripts/setup-infra.sh r2    # R2 buckets
./scripts/setup-infra.sh queues # Queues
```

### 2. Start Development Environment

```bash
# Start all services
./scripts/dev.sh all

# Or start individual services
./scripts/dev.sh auth
./scripts/dev.sh nutrition
./scripts/dev.sh coach
./scripts/dev.sh health
./scripts/dev.sh mail
./scripts/dev.sh gateway
./scripts/dev.sh web
```

---

## Service Ports

| Service | Port | URL |
|---------|------|-----|
| Web App | 3000 | http://localhost:3000 |
| Gateway | 4000 | http://localhost:4000 |
| Auth | 3001 | http://localhost:3001 |
| Nutrition | 3002 | http://localhost:3002 |
| Coach | 3003 | http://localhost:3003 |
| Health | 3004 | http://localhost:3004 |
| Mail | 3005 | http://localhost:3005 |

---

## Environment Variables by Service

### Root `.env` / `.env.development`

Common variables shared across all services during development:

| Variable | Description | Example |
|----------|-------------|---------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token | `cfut_xxxxx` |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID | `312b98fff6f54aa11ae59cb06d30015a` |
| `AUTH_JWT_PRIVATE_KEY` | Base64 encoded EC private key | (generated) |
| `AUTH_JWT_PUBLIC_KEY` | Base64 encoded EC public key | (generated) |
| `AUTH_JWT_ISSUER` | JWT issuer | `aivo` |
| `AUTH_JWT_AUDIENCE` | JWT audience | `aivo-app` |
| `AUTH_JWT_ACCESS_TOKEN_TTL` | Access token TTL (seconds) | `900` |
| `AUTH_JWT_REFRESH_TOKEN_TTL` | Refresh token TTL (seconds) | `604800` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | (from Google Cloud) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | (from Google Cloud) |
| `FACEBOOK_CLIENT_ID` | Facebook OAuth client ID | (from Meta) |
| `FACEBOOK_CLIENT_SECRET` | Facebook OAuth client secret | (from Meta) |
| `WEB_APP_URL` | Web app URL | `http://localhost:3000` |
| `MOBILE_REDIRECT_URI` | Mobile OAuth redirect | `aivo://oauth/callback` |
| `AI_ENABLED` | Enable AI features | `true` |
| `AI_MODEL` | AI model to use | `@cf/meta/llama-3.1-8b-instruct` |
| `LOG_LEVEL` | Logging level | `debug` |

### Auth Service (`apps/services/auth`)

| Variable | Description | Required |
|----------|-------------|----------|
| `AUTH_JWT_PRIVATE_KEY` | JWT signing private key | ✅ |
| `AUTH_JWT_PUBLIC_KEY` | JWT signing public key | ✅ |
| `AUTH_JWT_ISSUER` | Token issuer | ✅ |
| `AUTH_JWT_AUDIENCE` | Token audience | ✅ |
| `AUTH_D1_DATABASE_ID` | D1 database ID | ✅ |
| `OAUTH_STATE_KV_ID` | KV namespace for OAuth state | ✅ |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | For Google login |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | For Google login |
| `FACEBOOK_CLIENT_ID` | Facebook OAuth client ID | For Facebook login |
| `FACEBOOK_CLIENT_SECRET` | Facebook OAuth client secret | For Facebook login |
| `ALLOWED_ORIGINS` | CORS allowed origins | ✅ |
| `WEB_APP_URL` | Web app URL for redirects | ✅ |

### Health Service (`apps/services/health`)

| Variable | Description | Required |
|----------|-------------|----------|
| `AUTH_SERVICE_URL` | Auth service URL | ✅ |
| `SCHEMA_VERSION` | Data schema version | ✅ |
| `ALGORITHM_VERSION` | Algorithm version | ✅ |
| `BASELINE_MIN_DAYS` | Minimum days for baseline | ✅ |
| `BASELINE_ROLLING_WINDOW` | Rolling window days | ✅ |
| `CACHE_TTL_SECONDS` | Cache TTL | ✅ |
| `REPORT_RETENTION_DAYS` | Report retention | ✅ |
| `AI_ENABLED` | Enable AI insights | ✅ |
| `AI_MODEL` | AI model | ✅ |
| `AI_MAX_TOKENS` | Max AI tokens | ✅ |
| `AI_TEMPERATURE` | AI temperature | ✅ |
| `RATE_LIMIT_REQUESTS` | Rate limit requests | ✅ |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | ✅ |

### Nutrition Service (`apps/services/nutrition`)

| Variable | Description | Required |
|----------|-------------|----------|
| `AUTH_SERVICE_URL` | Auth service URL | ✅ |
| `IMAGE_MAX_DIMENSION_PX` | Max image dimension | ✅ |
| `IMAGE_QUALITY` | Image quality % | ✅ |
| `AI_ENABLED` | Enable AI food analysis | ✅ |
| `AI_DAILY_LIMIT` | Daily AI requests limit | ✅ |
| `AI_HOURLY_LIMIT` | Hourly AI requests limit | ✅ |
| `AI_RETRY_LIMIT` | AI retry limit | ✅ |
| `AI_CONFIDENCE_THRESHOLD` | Min AI confidence | ✅ |
| `DEFAULT_MODEL` | Default AI model | ✅ |
| `FALLBACK_MODEL` | Fallback AI model | ✅ |

### Coach Service (`apps/services/coach`)

| Variable | Description | Required |
|----------|-------------|----------|
| `AUTH_SERVICE_URL` | Auth service URL | ✅ |
| `SCHEMA_VERSION` | Data schema version | ✅ |
| `ENGINE_VERSION` | Engine version | ✅ |
| `WASM_ENGINE_VERSION` | WASM engine version | ✅ |
| `WASM_ENGINE_ENABLED` | Enable WASM engine | ✅ |
| `WASM_FALLBACK_TO_TYPESCRIPT` | Fallback to TS | ✅ |
| `AI_ENABLED` | Enable AI coaching | ✅ |
| `AI_MODEL` | AI model | ✅ |
| `AI_MAX_TOKENS` | Max AI tokens | ✅ |
| `AI_TEMPERATURE` | AI temperature | ✅ |
| `PLANNING_ENABLED` | Enable workout planning | ✅ |

### Mail Service (`apps/services/mail`)

| Variable | Description | Required |
|----------|-------------|----------|
| `RESEND_API_KEY` | Resend API key (secret) | ✅ |
| `EMAIL_FROM` | From email address | ✅ |
| `EMAIL_REPLY_TO` | Reply-to address | ✅ |
| `EMAIL_ENABLED` | Enable email sending | ✅ |
| `WEB_APP_URL` | Web app URL | ✅ |
| `SUPPORT_EMAIL` | Support email address | ✅ |
| `TEMPLATE_BASE_URL` | Email template base URL | ✅ |

### Gateway Service (`apps/services/gateway`)

| Variable | Description | Required |
|----------|-------------|----------|
| `ALLOWED_ORIGINS` | CORS origins | ✅ |
| `RATE_LIMIT_MAX` | Max requests per window | ✅ |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | ✅ |
| `ENABLE_SWAGGER` | Enable Swagger docs | ✅ |
| `ENABLE_METRICS` | Enable metrics endpoint | ✅ |

### Web App (`apps/web`)

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SITE_URL` | Site URL | ✅ |
| `NEXT_PUBLIC_APP_URL` | App URL | ✅ |
| `NEXT_PUBLIC_AUTH_API_URL` | Auth service URL | ✅ |
| `NEXT_PUBLIC_GATEWAY_API_URL` | Gateway URL | ✅ |
| `NEXT_PUBLIC_HEALTH_API_URL` | Health service URL | ✅ |
| `NEXT_PUBLIC_NUTRITION_API_URL` | Nutrition service URL | ✅ |
| `NEXT_PUBLIC_COACH_API_URL` | Coach service URL | ✅ |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | Enable analytics | ✅ |
| `NEXT_PUBLIC_ENABLE_DEBUG_MODE` | Enable debug mode | ✅ |
| `NEXT_PUBLIC_GOOGLE_REDIRECT_URI` | Google OAuth redirect | For Google login |
| `NEXT_PUBLIC_FACEBOOK_REDIRECT_URI` | Facebook OAuth redirect | For Facebook login |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | Default locale | ✅ |
| `NEXT_PUBLIC_SUPPORTED_LOCALES` | Supported locales | ✅ |
| `NEXT_PUBLIC_WASM_ENABLED` | Enable WASM | ✅ |

### Mobile App (`apps/mobile`)

| Variable | Description | Required |
|----------|-------------|----------|
| `EXPO_PUBLIC_API_VERSION` | API version | ✅ |
| `EXPO_PUBLIC_AUTH_API_URL` | Auth service URL | ✅ |
| `EXPO_PUBLIC_GATEWAY_API_URL` | Gateway URL | ✅ |
| `EXPO_PUBLIC_HEALTH_API_URL` | Health service URL | ✅ |
| `EXPO_PUBLIC_NUTRITION_API_URL` | Nutrition service URL | ✅ |
| `EXPO_PUBLIC_COACH_API_URL` | Coach service URL | ✅ |
| `EXPO_PUBLIC_SITE_URL` | Site URL | ✅ |
| `EXPO_PUBLIC_APP_URL` | App URL scheme | ✅ |
| `EXPO_PUBLIC_GOOGLE_REDIRECT_URI` | Google OAuth redirect | ✅ |
| `EXPO_PUBLIC_FACEBOOK_REDIRECT_URI` | Facebook OAuth redirect | ✅ |
| `EXPO_PUBLIC_ENABLE_ANALYTICS` | Enable analytics | ✅ |
| `EXPO_PUBLIC_ENABLE_DEBUG_MODE` | Enable debug mode | ✅ |
| `EXPO_PUBLIC_ENABLE_AI_FEATURES` | Enable AI features | ✅ |
| `EXPO_PUBLIC_DEFAULT_LOCALE` | Default locale | ✅ |
| `EXPO_PUBLIC_WASM_ENABLED` | Enable WASM | ✅ |
| `EXPO_PUBLIC_USE_MEDIAPIPE` | Use MediaPipe | ✅ |

---

## Cloudflare Infrastructure

### Required D1 Databases

| Service | Database Name | Purpose |
|---------|--------------|---------|
| Auth | `aivo-auth-db` | User accounts, sessions |
| Nutrition | `aivo-nutrition-db` | Meal plans, food database |
| Coach | `aivo-coach-db` | Workout plans, exercise data |
| Health | `aivo-health-db` | Health metrics, readiness scores |

### Required KV Namespaces

| Binding | Purpose |
|---------|---------|
| `OAUTH_STATE` | OAuth state storage |
| `RATE_LIMIT_KV` | Distributed rate limiting |
| `ANALYTICS_KV` | Analytics data |

### Required R2 Buckets

| Bucket Name | Purpose |
|-------------|---------|
| `aivo-meal-images` | Meal/photo uploads |
| `aivo-health-reports` | Generated health reports |

### Required Queues

| Queue Name | Service | Purpose |
|------------|---------|---------|
| `aivo-health-queue` | Health | Health data processing |
| `aivo-health-report-queue` | Health | Report generation |
| `aivo-health-report-deliver-queue` | Health/Mail | Report delivery |
| `aivo-health-report-dlq` | Health | Dead letter queue |
| `aivo-nutrition-queue` | Nutrition | Food analysis |
| `aivo-planning-queue` | Coach | Workout planning |
| `aivo-email-queue` | Mail | Email sending |
| `aivo-email-dlq` | Mail | Email dead letter queue |

---

## Production Endpoints

Based on `.env.production`:

| Service | Production URL |
|---------|---------------|
| Web App | https://app.aivo.app |
| Gateway | https://aivo-gateway.htdung-vnn.workers.dev |
| Auth | https://aivo-auth.htdung-vnn.workers.dev |
| Health | https://aivo-health.htdung-vnn.workers.dev |
| Nutrition | https://aivo-nutrition.htdung-vnn.workers.dev |
| Coach | https://aivo-coach.htdung-vnn.workers.dev |
| Mail | https://aivo-mail.htdung-vnn.workers.dev |

---

## Secrets Management

Production secrets should be set via `wrangler secret put`:

```bash
# Auth service
cd apps/services/auth && wrangler secret put AUTH_JWT_PRIVATE_KEY
cd apps/services/auth && wrangler secret put AUTH_JWT_PUBLIC_KEY
cd apps/services/auth && wrangler secret put GOOGLE_CLIENT_SECRET
cd apps/services/auth && wrangler secret put FACEBOOK_CLIENT_SECRET

# Mail service
cd apps/services/mail && wrangler secret put RESEND_API_KEY
```

---

## Environment File Priority

1. `.env` - Root environment (local, not committed)
2. `.env.development` - Development defaults
3. `.env.production` - Production defaults
4. `.env.local` - Local overrides (not committed)
5. `.env.[service].development` - Service-specific dev
6. `.env.[service].production` - Service-specific prod

---

## Troubleshooting

### "CLOUDFLARE_API_TOKEN not set"

```bash
# Set environment variables
export CLOUDFLARE_API_TOKEN=cfut_xxxxx
export CLOUDFLARE_ACCOUNT_ID=312b98fff6f54aa11ae59cb06d30015a
```

### "JWT keys not set"

```bash
# Generate new JWT keys
./scripts/setup-infra.sh keys
```

### Services won't start

1. Check if ports are in use: `lsof -i :3001`
2. Verify `.env` file exists
3. Ensure all required variables are set
4. Check logs for specific errors

### D1/KV/R2/Queue creation fails

1. Verify Cloudflare API token has correct permissions
2. Check if resources already exist
3. Verify account ID is correct
