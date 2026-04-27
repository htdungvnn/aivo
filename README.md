# AIVO

High-performance fitness platform and AI-native conversational platform.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![Expo](https://img.shields.io/badge/Expo-54-blue)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers--orange)
![Rust](https://img.shields.io/badge/Rust-wasm-brightgreen)

## Features

- **Web**: Next.js 15 web app with Tailwind CSS + Google/Facebook OAuth
- **Mobile**: Expo SDK 54 React Native app with NativeWind v4 + Google/Facebook OAuth
- **API**: Cloudflare Workers with Hono framework
- **Compute**: Rust WebAssembly for performance-critical fitness calculations
- **Database**: Cloudflare D1 with Drizzle ORM
- **Auth**: Google & Facebook OAuth (passwordless login)

## Quick Start

### 1. Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 9
- [Rust](https://rustup.rs/) with wasm32 target
- [wasm-pack](https://rustwasm.github.io/wasm-pack/install/)
- [Cloudflare Wrangler](https://developers.cloudflare.com/workers/wrangler/) CLI
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (for mobile development)

### 2. Clone and Install

```bash
git clone <your-repo>
cd aivo
pnpm install
```

### 3. Environment Setup

```bash
# Run the setup script to create .env files from templates
./scripts/setup-env.sh

# Validate your configuration
./scripts/validate-env.sh
```

Edit the created `.env` files with your actual credentials:
- Generate `AUTH_SECRET`: `openssl rand -base64 32`
- Get OAuth client IDs from Google Cloud Console and Facebook Developers
- (Optional) Add OpenAI API key for AI features

See [`.env/ENVIRONMENT.md`](./.env/ENVIRONMENT.md) for complete environment variable reference.

### 4. Start Development

Using Turborepo (runs all services):

```bash
pnpm run dev
```

Or start individual services:

```bash
# Web (Next.js)
cd apps/web && pnpm run dev

# Mobile App
cd apps/mobile && pnpm exec expo start

# API (Cloudflare Workers)
cd apps/api && pnpm exec wrangler dev

# Database Studio
cd packages/db && pnpm exec drizzle-kit studio
```

---

## Documentation

| Topic | Guide |
|-------|-------|
| **Getting Started** | [QUICKSTART.md](./docs/QUICKSTART.md) |
| **Environment Setup** | [ENVIRONMENT_SETUP.md](./docs/ENVIRONMENT_SETUP.md) |
| **Environment Variables** | [ENV_VARIABLES_REFERENCE.md](./docs/ENV_VARIABLES_REFERENCE.md) |
| **Contributing** | [CONTRIBUTING.md](./docs/CONTRIBUTING.md) |
| **Architecture** | [ARCHITECTURE.md](./docs/ARCHITECTURE.md) |
| **API Reference** | [API.md](./docs/API.md) |
| **Database Schema** | [DATABASE.md](./docs/DATABASE.md) |
| **Compute Engine** | [COMPUTE.md](./docs/COMPUTE.md) |
| **Memory Service** | [MEMORY_SERVICE.md](./docs/MEMORY_SERVICE.md) |
| **Frontend Apps** | [FRONTEND.md](./docs/FRONTEND.md) |
| **Mobile Development** | [MOBILE_DEVELOPMENT.md](./docs/MOBILE_DEVELOPMENT.md) |
| **WASM Development** | [WASM_DEVELOPMENT.md](./docs/WASM_DEVELOPMENT.md) |
| **CI/CD Pipeline** | [CI_CD.md](./docs/CI_CD.md) |
| **Deployment** | [DEPLOYMENT.md](./docs/DEPLOYMENT.md) |
| **Testing** | [TESTING.md](./docs/TESTING.md) |
| **Troubleshooting** | [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) |
| **Changelog** | [CHANGELOG.md](./CHANGELOG.md) |

---

## Project Structure

```
aivo/
├── apps/
│   ├── web/               # Next.js 15 web application
│   ├── mobile/            # Expo SDK 54 React Native app
│   └── api/               # Cloudflare Workers API (Hono)
├── packages/
│   ├── aivo-compute/      # Rust WASM fitness calculations
│   ├── shared-types/      # TypeScript type definitions
│   └── db/                # Drizzle ORM schema & migrations
├── .claude/               # Claude Code configuration
├── package.json           # Root workspace config
├── pnpm-workspace.yaml    # pnpm workspace configuration
└── turbo.json             # Turborepo pipeline config
```

---

## Available Scripts

### Root Level

```bash
pnpm run build        # Build all packages
pnpm run dev          # Run all dev services (via turborepo)
pnpm run lint         # Lint all packages
pnpm run type-check   # Type check all packages
pnpm run test         # Run tests for all packages
pnpm run clean        # Clean all build artifacts
pnpm run build:wasm   # Build WASM package only
```

### Package-Specific

See individual `package.json` files in each package for specific scripts.

---

## Database Setup

### Initialize D1 Database

```bash
cd apps/api
pnpm exec wrangler d1 create aivo-db
```

### Create Migration

```bash
cd packages/db
pnpm exec drizzle-kit generate
```

### Apply Migrations

```bash
# Local development
pnpm exec wrangler d1 migrations apply aivo-db --local

# Production (via deploy script)
./scripts/deploy.sh
```

---

## Building for Production

### 1. Build WASM

```bash
pnpm run build:wasm
```

### 2. Build All Packages

```bash
pnpm run build
```

### 3. Deploy

**API (Cloudflare Workers):**
```bash
cd apps/api
pnpm exec wrangler deploy
```

**Web (Cloudflare Pages):**
```bash
./scripts/deploy-web-pages.sh
```

**Mobile (Expo EAS):**
```bash
cd apps/mobile
eas build --platform all
```

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for complete deployment guide.

---

## Development Guidelines

1. **Shared Types**: Always update `packages/shared-types` when changing interfaces
2. **WASM Changes**: Run `pnpm run build:wasm` after any Rust modifications
3. **Database**: Use Drizzle migrations for all schema changes
4. **Type Safety**: All TypeScript code must pass strict type checking
5. **Workers**: No Node.js standard library in Cloudflare Workers

---

## OAuth Setup

### Google Cloud Console

1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID
3. Add authorized JavaScript origins and redirect URIs
4. Copy Client ID to environment variables

### Facebook Developers

1. Go to https://developers.facebook.com/apps
2. Create app with "Consumer" type
3. Add "Facebook Login" product
4. Configure OAuth redirect URIs
5. Copy App ID to environment variables

---

## Contributing

1. Fork the repository
2. Create your feature branch
3. Run `pnpm run type-check && pnpm run lint`
4. Commit your changes (follow conventional commits)
5. Push to the branch
6. Open a Pull Request

### Code Quality Standards

- All TypeScript code must pass strict type checking
- ESLint rules are enforced across all packages
- Import statements must use `import type` for type-only imports
- Enums used as values must use regular `import` (not `import type`)
- Console statements are allowed for logging

---

## License

MIT

---

**Version:** 2.0.0
**Last Updated:** 2026-04-25
**Maintained by:** AIVO Team
