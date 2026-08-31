# AIVO Development Environment

This document describes how to set up and run the AIVO development environment.

## Prerequisites

- Node.js 24+
- pnpm 11+
- (Optional) Wrangler CLI for Cloudflare Workers development

```bash
# Install pnpm if you don't have it
npm install -g pnpm

# Install wrangler for Cloudflare Workers development
pnpm add -g wrangler
```

## Quick Start

### 1. Setup Environment

Run the setup script to configure your environment:

```bash
pnpm dev:setup
```

### 2. Generate JWT Keys (Required for Auth Service)

```bash
# Generate private key
openssl ecparam -genkey -name prime256v1 -noout -out /tmp/private.pem

# Generate public key
openssl ec -in /tmp/private.pem -pubout -out /tmp/public.pem

# Copy the base64-encoded keys
cat /tmp/private.pem | base64
cat /tmp/public.pem | base64
```

Update `apps/services/auth/.env` with these values:
- `AUTH_JWT_PRIVATE_KEY=<your-private-key-base64>`
- `AUTH_JWT_PUBLIC_KEY=<your-public-key-base64>`

### 3. Configure Cloudflare Resources (Optional for local dev)

For local D1 and KV development:

```bash
# Navigate to auth service
cd apps/services/auth

# Create local D1 database
npx wrangler d1 create aivo-auth-db
# Copy the database_id to AUTH_D1_DATABASE_ID in .env

# Create local KV namespace
npx wrangler kv:namespace create oauth_state
# Copy the id to OAUTH_STATE_KV_ID in .env
```

## Running Services

### Start All Services

```bash
pnpm dev:all
```

This starts all services in parallel using Turborepo.

### Start Individual Services

| Service | Command | URL |
|---------|---------|-----|
| Web App | `pnpm dev:web` | http://localhost:3000 |
| Mobile | `pnpm dev:mobile` | Expo Dev Tools |
| Auth | `pnpm dev:auth` | http://localhost:3001 |
| Nutrition | `pnpm dev:nutrition` | http://localhost:3002 |
| Coach | `pnpm dev:coach` | http://localhost:3003 |
| Health | `pnpm dev:health` | http://localhost:3004 |
| Mail | `pnpm dev:mail` | http://localhost:3005 |
| Gateway | `pnpm dev:gateway` | http://localhost:4000 |

## Service Architecture

```
┌─────────────┐
│   Web App   │ ← Next.js 16 (Port 3000)
│   Mobile    │ ← Expo SDK 57
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Gateway   │ ← API Gateway (Port 4000)
└──────┬──────┘
       │
       ├──► Auth      (Port 3001) ──► D1, KV
       ├──► Nutrition (Port 3002) ──► AI Gateway
       ├──► Coach     (Port 3003) ──► AI Gateway, Queues, WASM
       ├──► Health    (Port 3004) ──► AI Gateway
       └──► Mail      (Port 3005) ──► Resend
```

## Environment Variables

### Root `.env.development`

Shared variables used by all services.

### Service-specific `.env.development`

Each service has its own `.env.development` file with service-specific settings. These inherit from the root file when using `pnpm dev:all`.

### `.env` (Local Overrides)

For local development, copy `.env.development` to `.env` and customize:

```bash
cp .env.development .env
```

**Note:** `.env` is gitignored and should never be committed.

## WASM Engine

The Coach service uses a WebAssembly-based exercise engine for pose detection:

### Development Mode

- `WASM_ENGINE_ENABLED=true` - Enable WASM engine
- `WASM_FALLBACK_TO_TYPESCRIPT=true` - Fallback to TypeScript if WASM fails

### Building WASM

```bash
cd packages/exercise-engine
wasm-pack build --target web --out-dir pkg
```

## API Documentation

Each service exposes Swagger UI at `/swagger`:

- Auth: http://localhost:3001/swagger
- Nutrition: http://localhost:3002/swagger
- Coach: http://localhost:3003/swagger
- Health: http://localhost:3004/swagger
- Mail: http://localhost:3005/swagger
- Gateway: http://localhost:4000/swagger

## Troubleshooting

### Port Already in Use

If a port is already in use, you can change it in the service's `.env`:

```bash
PORT=3001
```

Or kill the process using the port:

```bash
lsof -ti:3000 | xargs kill -9
```

### Auth Service 500 Errors

Check that:
1. JWT keys are properly configured
2. D1 database ID is set
3. KV namespace ID is set

### WASM Module Not Loading

Check that:
1. `WASM_ENGINE_ENABLED=true` in coach service
2. WASM module is built: `cd packages/exercise-engine && wasm-pack build`

### Mobile App Can't Connect to Services

The mobile app uses deep links for OAuth. Make sure:
1. `EXPO_PUBLIC_*` URLs point to your local services
2. The deep link scheme `aivo://` is configured in `app.json`

## Useful Commands

```bash
# Install all dependencies
pnpm install

# Build all packages
pnpm build

# Type check all packages
pnpm check-types

# Lint all packages
pnpm lint

# Format code
pnpm format
```
