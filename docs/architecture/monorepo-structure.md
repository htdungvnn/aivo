# AIVO Monorepo Structure

This document describes the architecture and organization of the AIVO monorepo.

## Repository Overview

AIVO is an AI-powered health, fitness, and nutrition coaching platform built as a monorepo using:

- **Turborepo** for task orchestration and caching
- **PNPM** for package management
- **TypeScript** throughout
- **Cloudflare Workers** for backend services
- **Next.js 16** for the web application
- **Expo SDK 57** for the mobile application
- **Rust + WebAssembly** for performance-critical computations

## Directory Structure

```
aivo/
├── apps/
│   ├── mobile/                    # React Native (Expo) mobile app
│   ├── web/                      # Next.js web application
│   └── services/                 # Cloudflare Workers microservices
│       ├── auth/                 # Authentication & user management
│       ├── coach/                # AI workout coaching
│       ├── gateway/              # API Gateway
│       ├── health/               # Health tracking & readiness engine
│       ├── mail/                 # Email service
│       └── nutrition/            # Meal planning & nutrition tracking
│
├── packages/                     # Shared libraries (organized by function)
│   ├── auth/                     # Authentication packages
│   ├── configs/                  # ESLint & TypeScript configurations
│   ├── contracts/                 # Shared domain schemas (Zod)
│   ├── engines/                   # WASM/Rust computation engines
│   ├── infrastructure/            # Cross-cutting concerns (middleware, observability)
│   ├── openapi/                   # Swagger/OpenAPI utilities
│   ├── wasm/                      # WebAssembly core & gateway
│   └── web/                       # Web-specific packages (UI, i18n, marketing)
│
├── docs/                         # Documentation
├── scripts/                      # Dev and deployment scripts
├── turbo.json                    # Turborepo configuration
└── pnpm-workspace.yaml           # PNPM workspace configuration
```

## Package Groups

### `packages/auth/`

Authentication packages for the AIVO platform.

| Package | Description |
|---------|-------------|
| `@aivo/auth-core` | JWT utilities, auth middleware, and authentication helpers |

### `packages/configs/`

Shared configuration packages.

| Package | Description |
|---------|-------------|
| `@aivo/eslint-config` | ESLint configurations for TypeScript, React, Next.js |
| `@aivo/typescript-config` | TypeScript configuration presets |

### `packages/contracts/`

Domain type definitions and Zod schemas. These packages represent **shared contracts** between services.

| Package | Description |
|---------|-------------|
| `@aivo/common-types` | UUID, date utilities, validation helpers |
| `@aivo/fitness-types` | Exercise definitions, pose detection, workout sessions |
| `@aivo/health-types` | Readiness scores, daily health data, chart configs |
| `@aivo/nutrition-types` | Meal schemas, nutrition calculations |
| `@aivo/notification-types` | Notification type definitions |
| `@aivo/queue-types` | Queue message schemas, event types |
| `@aivo/report-types` | Report schemas and types |

### `packages/engines/`

WASM/Rust computation engines for performance-critical operations.

| Package | Description |
|---------|-------------|
| `@aivo/exercise-engine` | Pose detection and exercise analysis |
| `@aivo/health-engine` | Health calculations |
| `@aivo/nutrition-engine` | Nutrition calculations |
| `@aivo/readiness-engine` | Readiness scoring |
| `@aivo/analytics-engine` | Analytics processing |

### `packages/infrastructure/`

Cross-cutting infrastructure packages used by services and applications.

| Package | Description |
|---------|-------------|
| `@aivo/api-client` | HTTP client utilities |
| `@aivo/middleware` | Worker middleware (CORS, rate limiting, errors) |
| `@aivo/observability` | Logging, metrics, tracing |
| `@aivo/runtime` | Runtime detection and utilities |
| `@aivo/storage-client` | Storage abstraction |

### `packages/openapi/`

API documentation utilities.

| Package | Description |
|---------|-------------|
| `@aivo/swagger-utils` | OpenAPI spec builders, Swagger handlers |

### `packages/wasm/`

WebAssembly runtime and gateway packages.

| Package | Description |
|---------|-------------|
| `@aivo/wasm-core` | Core WASM utilities and bindings |
| `@aivo/wasm-gateway` | WASM module loader and execution gateway |

### `packages/web/`

Web-specific packages for the Next.js application.

| Package | Description |
|---------|-------------|
| `@aivo/i18n` | Internationalization (next-intl) |
| `@aivo/marketing-config` | Landing page configuration (pricing, features, navigation) |
| `@aivo/ui-components` | Shared React components |

## Dependency Direction Rules

1. **Deployable applications** (`apps/*`) may depend on shared packages
2. **Shared packages must never depend on applications**
3. **Contract packages** may depend only on:
   - Other contract packages
   - Zod or equivalent schema libraries
   - Lightweight platform-neutral utilities
4. **Contract packages must NOT depend on:**
   - React
   - Next.js
   - Expo
   - Hono
   - Wrangler
   - Cloudflare bindings
   - Application services
5. **WASM engines** must remain platform-neutral and must NOT access:
   - Databases
   - Queues
   - HTTP clients
   - Environment variables
   - Cloudflare bindings
6. **Infrastructure packages** may provide adapters for runtimes and external systems
7. **Web packages** may depend on React and Next.js-compatible code
8. **Mobile-specific code** must not be added to shared Web UI packages

## Naming Conventions

### Package Names

All internal packages use the `@aivo/*` namespace:

```json
{
  "name": "@aivo/health-types"
}
```

### Imports

```typescript
import type { HealthRecord } from "@aivo/health-types";
import { roundTo, clamp } from "@aivo/common-types";
import { requireAuth } from "@aivo/auth-core/middleware";
```

### Deployable Applications

Deployable applications use flat private names:

- `web` - Next.js web application
- `mobile` - React Native mobile app
- `aivo-auth` - Auth service
- `aivo-health` - Health service
- `aivo-coach` - Coach service
- `aivo-nutrition` - Nutrition service
- `aivo-mail` - Mail service
- `@aivo/gateway` - API Gateway service

## Adding New Packages

### Adding a New Service

1. Create the service directory: `apps/services/my-service/`
2. Add package.json with a private name: `"name": "aivo-my-service"`
3. Add to `pnpm-workspace.yaml` (already covered by `apps/services/*`)
4. Create `wrangler.jsonc` for Cloudflare Workers configuration

### Adding a New Contract

1. Create the package directory: `packages/contracts/my-types/`
2. Add package.json with name: `"name": "@aivo/my-types"`
3. Keep the package platform-neutral (no React, no Cloudflare bindings)
4. Use Zod for all schema definitions

### Adding a New Engine

1. Create the engine directory: `packages/engines/my-engine/`
2. Add package.json with name: `"name": "@aivo/my-engine"`
3. Keep the engine platform-neutral
4. Add Cargo.toml for Rust/WASM compilation

### Adding a New Infrastructure Package

1. Create the package directory: `packages/infrastructure/my-package/`
2. Add package.json with name: `"name": "@aivo/my-package"`
3. Provide adapters for different runtimes (Worker, Node.js, etc.)

## WASM Portability Requirements

WASM engines must:

- Have no dependencies on Node.js or browser APIs
- Accept all configuration via function parameters
- Return pure data (no side effects)
- Be testable in isolation

## Environment Variables

### Root Level
- `NODE_ENV` - Development, production, or test
- `CARGO_TARGET_DIR` - Rust compilation cache
- `RUSTUP_TOOLCHAIN` - Rust toolchain version
- `WASM_TARGET` - WebAssembly target

### Service-Specific
See individual service documentation for required environment variables.

## Common Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Type check all packages
pnpm check-types

# Lint all packages
pnpm lint

# Run tests
pnpm test

# Start development mode
pnpm dev

# Start specific service
pnpm --filter aivo-health dev
pnpm --filter web dev
```

## CI/CD

GitHub Actions workflows are defined in `.github/workflows/`. The CI pipeline runs:

1. Security checks
2. Dependency validation
3. Linting
4. Type checking
5. Tests
6. WASM compilation
7. Integration tests
8. Build verification
