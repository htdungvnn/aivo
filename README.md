# AIVO

High-performance fitness platform and AI-native conversational platform.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![Expo](https://img.shields.io/badge/Expo-54-blue)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers--orange)
![Rust](https://img.shields.io/badge/Rust-wasm-brightgreen)

## Features

- **Web**: Next.js 15 web app with Tailwind CSS
- **Mobile**: Expo SDK 54 React Native app with NativeWind v4
- **API**: Cloudflare Workers with Hono framework
- **Compute**: Rust WebAssembly for performance-critical fitness calculations
- **Database**: Cloudflare D1 with Drizzle ORM

## Prerequisites

- [Bun](https://bun.sh) >= 1.2.0
- [Rust](https://rustup.rs/) with wasm32 target
- [wasm-pack](https://rustwasm.github.io/wasm-pack/install/)
- [Node.js](https://nodejs.org/) (for compatibility)
- [Cloudflare Wrangler](https://developers.cloudflare.com/workers/wrangler/) CLI
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (for mobile development)

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo>
cd aivo
bun install
```

### 2. Build WASM Compute Package

```bash
bun run build:wasm
```

### 3. Start Development Services

Using Turborepo (runs all services):

```bash
bun run dev
```

Or start individual services:

```bash
# Web (Next.js)
cd apps/web && bun run dev

# Mobile App
cd apps/mobile && bunx expo start

# API (Cloudflare Workers)
cd apps/api && bunx wrangler dev

# Database Studio
cd packages/db && bunx drizzle-kit studio
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
└── turbo.json             # Turborepo pipeline config
```

## Available Scripts

### Root Level

```bash
bun run build        # Build all packages
bun run dev          # Run all dev services (via turborepo)
bun run lint         # Lint all packages
bun run type-check   # Type check all packages
bun run test         # Run tests for all packages
bun run clean        # Clean all build artifacts
bun run build:wasm   # Build WASM package only
```

### Package-Specific

See individual `package.json` files in each package for specific scripts.

## Database Setup

### Initialize D1 Database

```bash
cd apps/api
bunx wrangler d1 create aivo-db
```

### Create Migration

```bash
cd packages/db
bunx drizzle-kit generate
```

### Apply Migrations

```bash
# Local development
bunx wrangler d1 migrations apply aivo-db --local

# Production
bunx wrangler d1 migrations apply aivo-db
```

## Building for Production

### 1. Build WASM

```bash
bun run build:wasm
```

### 2. Build All Packages

```bash
bun run build
```

### 3. Deploy API

```bash
cd apps/api
bunx wrangler deploy
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
| Package Manager | Bun | 1.2+ |
| Build System | Turborepo | 2.3+ |

## Development Guidelines

1. **Shared Types**: Always update `packages/shared-types` when changing interfaces
2. **WASM Changes**: Run `bun run build:wasm` after any Rust modifications
3. **Database**: Use Drizzle migrations for all schema changes
4. **Type Safety**: All TypeScript should be in strict mode
5. **Workers**: No Node.js standard library in Cloudflare Workers

## API Endpoints

### Health
- `GET /health` - Service health check

### Users
- `GET /users` - List users
- `GET /users/:id` - Get user by ID
- `POST /users` - Create user

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

## Contributing

1. Fork the repository
2. Create your feature branch
3. Run `bun run type-check` and `bun run lint`
4. Commit your changes
5. Push to the branch
6. Open a Pull Request

## License

MIT
