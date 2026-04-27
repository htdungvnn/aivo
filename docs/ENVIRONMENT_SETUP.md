# Environment Setup Guide

This guide covers setting up the AIVO development environment, including all required environment variables and configuration.

## Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Setup Scripts](#setup-scripts)
- [Environment Variables](#environment-variables)
- [Configuration Files](#configuration-files)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

## Quick Start

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd aivo
   pnpm install
   ```

2. **Run the setup script (creates .env files):**
   ```bash
   ./scripts/setup.sh env
   ```

3. **Generate secure secrets:**
   ```bash
   ./scripts/setup.sh secrets
   ```
   Copy the generated `AUTH_SECRET` to `apps/api/.env`.

4. **Validate configuration:**
   ```bash
   ./scripts/setup.sh validate
   ```

5. **Set up local development (dependencies, WASM, database):**
   ```bash
   ./scripts/setup.sh dev
   ```

6. **Start all development services:**
   ```bash
   ./scripts/dev.sh
   ```

   Or use the quick setup that runs steps 2-5 automatically:
   ```bash
   ./scripts/setup.sh all
   ```

## Prerequisites

### Required Software

| Tool | Version | Install Command/Guide |
|------|---------|----------------------|
| Node.js | 24+ | Use [fnm](https://github.com/Schniz/fnm) or [nvm](https://github.com/nvm-sh/nvm) |
| pnpm | 10.33.0+ | `corepack enable && corepack prepare pnpm@10.33.0 --activate` |
| Rust | stable | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| wasm-pack | latest | Installed automatically by Rust installer or `curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf \| sh` |
| wrangler | latest | `npm install -g wrangler` |
| expo-cli | latest | `npm install -g expo-cli` |
| tmux | latest (optional) | `brew install tmux` (macOS) or `apt-get install tmux` (Linux) |
| git | 2+ | [git-scm.com](https://git-scm.com/) |

**Note**: The `setup.sh dev` command requires `tmux` for the development environment. Install it or use your own terminal setup.

### OAuth Provider Accounts

For authentication features, you need accounts with:

- **Google Cloud Console** - Create OAuth 2.0 credentials
- **Facebook Developers** - Create a Facebook App with Login product

See [AUTHENTICATION.md](./AUTHENTICATION.md) for detailed setup.

## Setup Scripts

All setup is consolidated into a single `setup.sh` script with subcommands:

### `./scripts/setup.sh env`

Creates all necessary `.env` files from the central `.env/.env.base` template:

```bash
./scripts/setup.sh env
```

This script:
- Checks for existing `.env` files to avoid overwriting
- Creates `apps/web/.env.local` for web app
- Creates `apps/api/.env` for API
- Creates `apps/mobile/.env` for mobile app
- Extracts the relevant sections from the central config

### `./scripts/setup.sh secrets`

Generates secure random secrets:

```bash
./scripts/setup.sh secrets
```

Generates:
- `AUTH_SECRET` for API (JWT signing)
- Alternative JWT secret
- Internal API key

**Important**: Copy generated secrets to your `.env` files or set via `wrangler secret put`.

### `./scripts/setup.sh validate`

Validates all environment variables and configuration:

```bash
./scripts/setup.sh validate
```

Checks:
- Required variables are present
- Variable formats are correct
- OAuth credentials are valid length
- No placeholder values remain
- Cloudflare secrets are set (if wrangler available)
- wrangler.toml configuration is complete

### `./scripts/setup.sh dev`

Sets up local development environment:

```bash
./scripts/setup.sh dev
```

This performs:
- `pnpm install` (if needed)
- `pnpm run build:wasm` (build Rust WASM modules)
- Creates and applies local database migrations

### `./scripts/setup.sh migrate`

Database migration helper:

```bash
# Generate migrations from schema changes
./scripts/setup.sh migrate

# Generate and apply to local database
./scripts/setup.sh migrate --apply

# Generate and apply to production database
./scripts/setup.sh migrate --apply --remote
```

### `./scripts/setup.sh all`

Runs the full setup flow interactively: `env` → `validate` → `dev`

```bash
./scripts/setup.sh all
```

### `./scripts/dev.sh`

Starts all development services in a tmux session:

```bash
./scripts/dev.sh
```

Runs in parallel:
- API (Cloudflare Workers dev on port 8787)
- Web (Next.js dev server on port 3000)
- Mobile (Expo dev tools on port 8081)
- Logs tail window

Use `./scripts/dev.sh --vibe` to also start the Claude Code helper.

### `./scripts/health.sh`

Health check script for production or local:

```bash
# Production health check
./scripts/health.sh

# Local development health check
./scripts/health.sh --local
```

## Environment Variables

### API (`apps/api/.env`)

#### Required Variables

| Variable | Description | Example | How to Get |
|----------|-------------|---------|------------|
| `AUTH_SECRET` | JWT signing secret (min 32 chars) | `openssl rand -hex 32` | Generate with `./scripts/generate-secrets.sh` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `123456-abc.apps.googleusercontent.com` | Google Cloud Console |
| `FACEBOOK_APP_ID` | Facebook App ID | `123456789012345` | Facebook Developers |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` | OpenAI Platform |
| `GEMINI_API_KEY` | Google Gemini API key | `AI...` | Google AI Studio |

#### Optional Variables

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:3000,http://localhost:8080` | Set to your frontend URLs |
| `R2_PUBLIC_URL` | Public R2 bucket URL | (none) | For serving images/assets |
| `NODE_ENV` | Environment mode | `development` | `production` for deployed |
| `LOG_LEVEL` | Logging verbosity | `info` | `debug`, `info`, `warn`, `error` |
| `PORT` | Dev server port | `8787` | Only used in local dev |

### Web (`apps/web/.env.local`)

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID (same as API) |
| `NEXT_PUBLIC_FACEBOOK_CLIENT_ID` | Facebook App ID (same as API) |
| `NEXT_PUBLIC_API_URL` | API endpoint URL | `http://localhost:8787` |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | R2 public URL (if using) | `https://bucket.your-account.workers.dev` |

#### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_NAME` | Application name | `AIVO` |
| `NEXT_PUBLIC_APP_VERSION` | App version | From package.json |
| `NEXT_PUBLIC_ENV` | Environment identifier | `development` |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for error tracking | (none) |
| `NEXT_PUBLIC_GA_ID` | Google Analytics ID | (none) |

### Mobile (`apps/mobile/.env`)

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `EXPO_PUBLIC_FACEBOOK_CLIENT_ID` | Facebook App ID |
| `EXPO_PUBLIC_API_URL` | API endpoint URL | `http://localhost:8787` |
| `EXPO_PUBLIC_R2_PUBLIC_URL` | R2 public URL |
| `EXPO_PUBLIC_SCHEME` | Deep linking scheme | `aivomobile` |

#### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `EXPO_PUBLIC_APP_NAME` | Application name | `AIVO Mobile` |
| `EXPO_PUBLIC_ENV` | Environment | `development` |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry DSN | (none) |

### Database (`packages/db/.env`)

The database package uses wrangler.toml for configuration. Environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `WRANGLER_LOG` | Wrangler logging | `info` |

### Shared

The `packages/shared-types` package has no environment variables.

## Configuration Files

### API: `apps/api/wrangler.toml`

Configuration for Cloudflare Workers:

```toml
name = "aivo-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[durable_objects.bindings]]
name = "MEMORY_SESSIONS"
class_name = "MemorySession"

[[migrations]]
tag = "v1"
new_classes = ["MemorySession"]

[vars]
# Environment-specific vars (usually set via wrangler secret)

[env.production]
# Production-specific overrides

[env.staging]
# Staging-specific overrides
```

### Web: `apps/web/next.config.ts`

Next.js configuration:

```typescript
import { nextConfig } from '@aivo/config';

export default nextConfig({
  // Production Cloudflare Pages settings
  output: 'export',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
    ],
  },
  // Environment-specific settings
});
```

### Mobile: `apps/mobile/app.json`

Expo configuration:

```json
{
  "expo": {
    "name": "AIVO",
    "slug": "aivo",
    "scheme": "aivomobile",
    "platforms": ["ios", "android"],
    "ios": {
      "bundleIdentifier": "com.aivo.app",
      "config": {
        "googleSignIn": {
          "reservedClientId": "com.googleusercontent.apps.YOUR_CLIENT_ID"
        }
      }
    },
    "android": {
      "package": "com.aivo.app"
    }
  }
}
```

### Database: `packages/db/drizzle.config.ts`

Drizzle ORM configuration:

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: 'file:./data/aivo.db',
  },
});
```

## Verification

After setup, verify everything is working:

### 1. Check TypeScript

```bash
pnpm run type-check
```

Should output: `All packages type-checked successfully`

### 2. Run Lint

```bash
pnpm run lint
```

Should output: `No lint errors found`

### 3. Build WASM

```bash
pnpm run build:wasm
```

Should generate `.wasm` files in `packages/*/pkg/`

### 4. Start Dev Servers

```bash
./scripts/dev.sh
```

Verify:
- API: http://localhost:8787 → `{"name":"AIVO API",...}`
- Web: http://localhost:3000 → AIVO homepage
- Health: http://localhost:8787/health → health status JSON
- Database: Local D1 is running

### 5. Run Tests

```bash
pnpm run test
```

All tests should pass.

## Troubleshooting

### Common Issues

#### 1. "AUTH_SECRET not set"

**Error**: `Error: AUTH_SECRET is required`

**Solution**:
```bash
./scripts/setup.sh secrets
# Copy the generated AUTH_SECRET to apps/api/.env
# Or set as Cloudflare secret:
cd apps/api && wrangler secret put AUTH_SECRET
```

#### 2. "GOOGLE_CLIENT_ID mismatch"

**Error**: `Google OAuth: Invalid client_id`

**Solution**:
- Ensure `GOOGLE_CLIENT_ID` in API `.env` matches `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in web `.env.local`
- Check Google Cloud Console authorized origins include `http://localhost:3000`

#### 3. "wrangler: command not found"

**Solution**:
```bash
npm install -g wrangler
# Or use npx:
npx wrangler dev
```

#### 4. "Rust compiler not found"

**Error**: `error: could not find `rustc` executable`

**Solution**:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# Restart terminal or source:
source "$HOME/.cargo/env"
```

#### 5. "Port already in use"

**Error**: `Port 8787 is already in use`

**Solution**:
```bash
# Find and kill process
lsof -ti:8787 | xargs kill -9
# Or change port in wrangler.toml:
# [dev]
# port = 8788
```

#### 6. "Database migration failed"

**Solution**:
```bash
cd packages/db
# Reset local database:
rm -rf data/*.db .wrangler
# Reapply migrations:
pnpm exec drizzle-kit generate
pnpm exec wrangler d1 migrations apply aivo-db --local
# Or use the setup script:
cd ../.. && ./scripts/setup.sh dev
```

#### 7. "Module not found" errors

**Solution**:
```bash
# Reinstall dependencies:
rm -rf node_modules
pnpm install
# Rebuild WASM:
pnpm run build:wasm
```

#### 8. Expo build fails on iOS

**Error**: `Pod install failed`

**Solution**:
```bash
cd apps/mobile/ios
pod repo update
pod install
# Or use:
cd ..
pnpm exec expo run:ios --clear-cache
```

### Getting Additional Help

1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for more issues
2. Search existing GitHub issues
3. Join our team chat for real-time help
4. Create a new issue with:
   - OS and versions (Node, pnpm, Rust)
   - Error messages (full stack trace)
   - Steps to reproduce
   - `.env` values (remove secrets!)

## Production Setup

For production deployment, see [DEPLOYMENT.md](./DEPLOYMENT.md).

Key production considerations:
- Use `wrangler secret put` for all secrets
- Set `NODE_ENV=production`
- Configure custom domains in Cloudflare
- Enable R2 bucket with proper CORS
- Set up monitoring and logging

## Next Steps

- Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the system design
- Review [API_REFERENCE.md](./API_REFERENCE.md) for API endpoints
- Check [MOBILE_DEVELOPMENT.md](./MOBILE_DEVELOPMENT.md) for mobile-specific setup
- See [WASM_DEVELOPMENT.md](./WASM_DEVELOPMENT.md) for Rust development

Happy coding! 🚀
