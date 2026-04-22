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

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 9
- [Rust](https://rustup.rs/) with wasm32 target
- [wasm-pack](https://rustwasm.github.io/wasm-pack/install/)
- [Cloudflare Wrangler](https://developers.cloudflare.com/workers/wrangler/) CLI
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (for mobile development)

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo>
cd aivo
pnpm install
```

### 2. Build WASM Compute Package

```bash
pnpm run build:wasm
```

### 3. Start Development Services

Using Turborepo (runs all services):

```bash
pnpm run dev
```

Or start individual services:

```bash
# Web (Next.js)
cd apps/web && pnpm run dev

# Mobile App
cd apps/mobile && pnpmx expo start

# API (Cloudflare Workers)
cd apps/api && pnpmx wrangler dev

# Database Studio
cd packages/db && pnpmx drizzle-kit studio
```

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

## Database Setup

### Initialize D1 Database

```bash
cd apps/api
pnpmx wrangler d1 create aivo-db
```

### Create Migration

```bash
cd packages/db
pnpmx drizzle-kit generate
```

### Apply Migrations

```bash
# Local development
pnpmx wrangler d1 migrations apply aivo-db --local

# Production
pnpmx wrangler d1 migrations apply aivo-db
```

## Building for Production

### 1. Build WASM

```bash
pnpm run build:wasm
```

### 2. Build All Packages

```bash
pnpm run build
```

### 3. Deploy API

```bash
cd apps/api
pnpmx wrangler deploy
```

## Key Technologies

| Component | Technology | Version |
|-----------|------------|---------|
| Web UI | Next.js | 15.2+ |
| Mobile | Expo | 54.0+ |
| Mobile UI | NativeWind | 4.x |
| API Framework | Hono | 4.7+ |
| Database | Cloudflare D1 | - |
| ORM | Drizzle | 0.40+ |
| Compute | Rust WASM | stable |
| Package Manager | pnpm | 9+ |
| Build System | Turborepo | 2.3+ |
| Linting | ESLint | 10.x |
| TypeScript | 5.x (strict mode) |

## Development Guidelines

1. **Shared Types**: Always update `packages/shared-types` when changing interfaces
2. **WASM Changes**: Run `pnpm run build:wasm` after any Rust modifications
3. **Database**: Use Drizzle migrations for all schema changes
4. **Type Safety**: All TypeScript should be in strict mode
5. **Workers**: No Node.js standard library in Cloudflare Workers

## API Endpoints

### Authentication (Google/Facebook OAuth Only)
- `POST /api/auth/google` - Google OAuth callback
- `POST /api/auth/facebook` - Facebook OAuth callback
- `POST /api/auth/verify` - Verify JWT token
- `POST /api/auth/logout` - Invalidate session

### Health
- `GET /health` - Service health check

### Users
- `GET /users` - List users
- `GET /users/:id` - Get user by ID

### Workouts
- `GET /workouts?userId=` - List workouts
- `POST /workouts` - Create workout

### AI Coach
- `POST /ai/chat` - Send chat message
- `GET /ai/history/:userId` - Get conversation history

### Calculations (WASM)
- `POST /calc/bmi` - Calculate BMI
- `POST /calc/calories` - Calculate TDEE and targets
- `POST /calc/one-rep-max` - Calculate 1RM

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

See `.claude/CLAUDE.md` for detailed authentication documentation.

## Deployment

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed deployment instructions.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Run `pnpm run type-check` and `pnpm run lint`
4. Commit your changes (follow conventional commits)
5. Push to the branch
6. Open a Pull Request

### Code Quality Standards

- All TypeScript code must pass strict type checking
- ESLint rules are enforced across all packages
- Import statements must use `import type` for type-only imports
- Enums used as values must use regular `import` (not `import type`)
- Console statements are allowed in production code for logging

## License

MIT

---

**Version:** 1.0.1  
**Last Updated:** 2026-04-22  
**Maintained by:** AIVO Team


