# Quick Start Guide

This guide will help you get the AIVO platform running locally in minutes.

## Prerequisites

- Node.js >= 24
- pnpm >= 11.x (`npm install -g pnpm`)
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account (for deployment)

## Installation

```bash
# Clone the repository
cd aivo

# Install dependencies
pnpm install
```

## Development Setup

### 1. Start the Database (Optional - for local D1)

```bash
# Create local D1 databases
cd apps/services/auth
wrangler d1 create aivo-auth-db --local

# Update wrangler.jsonc with database_id
```

### 2. Run Migrations

```bash
# Auth service
cd apps/services/auth
pnpm migrate

# Health service
cd apps/services/health
pnpm db:apply
```

### 3. Set Environment Variables

Create `.dev.vars` files in each service:

```bash
# apps/services/auth/.dev.vars
AUTH_JWT_PRIVATE_KEY=<your-private-key-base64>
AUTH_JWT_PUBLIC_KEY=<your-public-key-base64>
```

### 4. Start Development Servers

```bash
# Option 1: Start all services (recommended)
pnpm dev

# Option 2: Start individual services
cd apps/services/auth && pnpm dev    # Port 3001
cd apps/services/health && pnpm dev  # Port 3004
cd apps/services/coach && pnpm dev   # Port 3003
cd apps/services/nutrition && pnpm dev  # Port 3002
cd apps/services/gateway && pnpm dev  # Port 4000
```

### 5. Start the Web App

```bash
cd apps/web
pnpm dev
# Open http://localhost:3000
```

### 6. Start the Mobile App

```bash
cd apps/mobile
pnpm dev
# Scan QR code with Expo Go
```

## Service Ports

| Service | Port | URL |
|---------|------|-----|
| Web App | 3000 | http://localhost:3000 |
| Auth | 3001 | http://localhost:3001 |
| Nutrition | 3002 | http://localhost:3002 |
| Coach | 3003 | http://localhost:3003 |
| Health | 3004 | http://localhost:3004 |
| Gateway | 4000 | http://localhost:4000 |

## Testing

```bash
# Run all tests
pnpm test

# Run tests for specific service
cd apps/services/auth
pnpm test

# Run tests with coverage
pnpm test --coverage
```

## Building

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter=web build
pnpm --filter=auth build
```

## Deployment

### Deploy to Cloudflare

```bash
# Deploy auth service
cd apps/services/auth
pnpm deploy

# Deploy all services
pnpm -r --filter='./apps/services/*' deploy
```

### Set Production Secrets

```bash
wrangler secret put AUTH_JWT_PRIVATE_KEY
wrangler secret put AUTH_JWT_PUBLIC_KEY
wrangler secret put RESEND_API_KEY
```

## Common Issues

### "Cannot find module"

```bash
pnpm install
pnpm build
```

### "D1 database not found"

```bash
wrangler d1 create aivo-auth-db
# Update wrangler.jsonc with database_id
pnpm migrate
```

### "JWT verification failed"

```bash
# Generate new JWT keys
openssl ecparam -name prime256v1 -genkey -noout -out private.pem
openssl ec -in private.pem -outform PEM -pubout -out public.pem
base64 -i private.pem
base64 -i public.pem
```

## Next Steps

- Read the [Architecture Overview](./docs/ARCHITECTURE.md)
- Review [Optimization Recommendations](./docs/OPTIMIZATION.md)
- Explore the [API Reference](./docs/API.md)
