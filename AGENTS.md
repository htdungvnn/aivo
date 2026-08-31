# AIVO - AI-Powered Health & Fitness Platform

## Project Overview

AIVO is a comprehensive monorepo containing microservices and applications for an AI-powered health, fitness, and nutrition coaching platform. The project is built with modern technologies including Cloudflare Workers, Next.js, React Native (Expo), and TypeScript.

## Repository Structure

```
aivo/
├── apps/
│   ├── web/                    # Next.js 16 web application
│   ├── mobile/                # React Native mobile app (Expo SDK 57)
│   └── services/              # Cloudflare Workers microservices
│       ├── auth/              # Authentication & user management
│       ├── health/            # Health tracking & readiness engine
│       ├── coach/             # AI workout coaching
│       ├── nutrition/         # Meal planning & nutrition tracking
│       ├── mail/              # Email service (Resend)
│       └── gateway/           # API Gateway (unified entry point)
│
├── packages/                  # Shared libraries (@aivo/*)
│   ├── api-client/            # API client utilities
│   ├── common-types/          # Shared TypeScript types & utilities
│   ├── marketing-config/      # Landing page configuration data
│   ├── ui-components/         # React UI components
│   ├── exercise-engine/       # WebAssembly-based pose detection (TS)
│   ├── fitness-types/         # Fitness domain types (Zod schemas)
│   ├── health-types/          # Health domain types (Zod schemas)
│   ├── nutrition-types/       # Nutrition domain types (Zod schemas)
│   ├── queue-types/           # Queue message types
│   ├── swagger-utils/         # Swagger/OpenAPI utilities
│   ├── wasm-gateway/          # WASM module loader & executor
│   ├── wasm-core/             # WASM core utilities
│   ├── middleware/            # HTTP middleware (CORS, rate-limit)
│   ├── auth-core/              # JWT & auth middleware
│   ├── observability/          # Logging, metrics, tracing
│   ├── health-engine/          # Health calculations (WASM)
│   ├── nutrition-engine/       # Nutrition calculations (WASM)
│   ├── readiness-engine/        # Readiness scoring (WASM)
│   ├── analytics-engine/       # Analytics processing (WASM)
│   ├── notification-types/      # Notification type schemas
│   ├── report-types/           # Report type schemas
│   ├── i18n/                  # Internationalization
│   ├── storage-client/         # Storage abstraction
│   ├── runtime/                # Runtime detection
│   └── eslint-config/          # ESLint configurations
│
├── turbo.json                 # Turborepo configuration
├── pnpm-workspace.yaml        # pnpm workspace definition
└── package.json               # Root package.json
```

## Technologies

| Layer | Technology | Version |
|-------|------------|---------|
| Web App | Next.js | 16.x |
| Mobile App | React Native (Expo) | SDK 57 |
| Services | Cloudflare Workers + Hono | - |
| Language | TypeScript | 5.x / 7.x |
| Validation | Zod | 4.x |
| Auth | JWT (ES256) | - |
| Deployment | Cloudflare | - |
| Package Manager | pnpm | 11.x |
| Monorepo | Turborepo | 2.x |

## Key Design Patterns

### 1. Authentication Flow
```
Client → Auth Service → JWT (ES256) → Other Services
```
- Access tokens: 15 minutes expiry
- Refresh tokens: 7 days expiry
- JWT validation in each service middleware

### 2. API Communication
- REST APIs with JSON responses
- Zod schemas for validation at boundaries
- Swagger/OpenAPI documentation at `/swagger`

### 3. Queue Architecture
```
API → Cloudflare Queue → Worker Consumer → AI/DB
```

## Common Tasks

### Building All Packages
```bash
pnpm build
```

### Development Mode
```bash
pnpm dev
```

### Type Checking
```bash
pnpm check-types
```

### Linting
```bash
pnpm lint
```

### Testing
```bash
pnpm test
```

### Service Development
```bash
# Auth service
cd apps/services/auth
pnpm dev

# Nutrition service
cd apps/services/nutrition
pnpm dev
```

### Mobile Development
```bash
cd apps/mobile
pnpm dev
```

## Package Dependencies

### @aivo/common-types
Shared utilities used across all services:
- UUID generation with fallbacks
- Date/time utilities
- Validation helpers (isFiniteNumber, clamp, roundTo)
- Common enums (CHART_METRIC, CLIENT_TYPE, etc.)

### @aivo/health-types
Zod schemas and types for health tracking:
- Readiness scores and calculations
- Daily health data
- Chart configurations
- AI insights

### @aivo/fitness-types
Types for fitness coaching:
- Exercise definitions
- Pose detection types
- Workout sessions
- Correction feedback

### @aivo/nutrition-types
Types for nutrition tracking:
- Meal and food schemas
- Nutrition calculations
- AI analysis types
- Chart data

## Code Style Guidelines

1. **TypeScript**: Strict mode enabled
2. **Validation**: Use Zod schemas for all API inputs
3. **Error Handling**: Consistent error response format
4. **Naming**: 
   - Types: PascalCase (e.g., `UserProfile`)
   - Functions: camelCase (e.g., `getUserById`)
   - Constants: SCREAMING_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)
5. **Imports**: Use path aliases where configured

## Type Exports

Types are exported from domain packages:
```typescript
import type { HealthScore } from '@aivo/health-types';
import type { MealPlan } from '@aivo/nutrition-types';
import type { WorkoutPlan } from '@aivo/fitness-types';
```

## Environment Variables

### Auth Service
```
AUTH_JWT_PRIVATE_KEY=<base64-encoded-private-key>
AUTH_JWT_PUBLIC_KEY=<base64-encoded-public-key>
AUTH_JWT_ISSUER=aivo
AUTH_JWT_AUDIENCE=aivo-app
AUTH_JWT_ACCESS_TOKEN_TTL=900
```

### Common
```
WEB_APP_URL=https://app.aivo.app
MOBILE_REDIRECT_URI=aivo://callback
```

## Testing

Tests are located in `test/` directories within each package/service:
```bash
# Run all tests
pnpm test

# Run specific package tests
cd packages/health-types
pnpm test
```

## CI/CD

The project uses Turborepo for task orchestration:
- `build`: Builds all packages
- `check-types`: Type checks all packages
- `lint`: Lints all packages
- `test`: Runs tests

## Common Issues

### Type Errors with globalThis
When accessing `globalThis.crypto` or other Web APIs:
```typescript
// ❌ Wrong
globalThis.crypto.randomUUID()

// ✅ Correct
const crypto = globalThis as unknown as { crypto?: CryptoGlobal };
crypto?.randomUUID?.()
```

### Zod v4 API Changes
- Use `error.issues` instead of `error.errors`
- `z.record()` requires two arguments: `z.record(keySchema, valueSchema)`

### Module Resolution
- Use `.js` extensions in imports for ESM compatibility
- Use `moduleResolution: "bundler"` in tsconfig

## Contributing

1. Create a feature branch from `main`
2. Follow the ESLint configuration
3. Add tests for new features
4. Ensure all CI checks pass
5. Submit a pull request

## API Documentation

Each service exposes Swagger UI at `/swagger` for interactive API documentation:
- Auth: `GET /swagger`
- Health: `GET /swagger`
- Coach: `GET /swagger`
- Nutrition: `GET /swagger`

## Security

### Authentication
- JWT tokens with ES256 signing
- Access tokens: 15 minutes expiry
- Refresh tokens: 7 days expiry

### Input Validation
- Zod schemas for all API inputs
- TypeScript strict mode enabled
- Sanitization for XSS prevention

### Rate Limiting
- Per-IP rate limiting in middleware
- KV-based for distributed environments

## API Gateway Service

The API Gateway (`apps/services/gateway`) provides a unified entry point for all AIVO services:

### Features
- **Service Routing**: Routes requests to backend services (auth, health, coach, nutrition, mail)
- **Rate Limiting**: Built-in rate limiting with configurable limits
- **CORS**: Configurable CORS with allowlist support
- **Circuit Breaker**: Prevents cascading failures between services
- **Metrics**: Request/response metrics and latency tracking
- **Health Checks**: Aggregated health status for all services

### Routes
```
/health                    # Gateway health check
/metrics                   # Prometheus metrics
/api/v1/auth/*            # → Auth service
/api/v1/health/*          # → Health service
/api/v1/coach/*           # → Coach service
/api/v1/nutrition/*       # → Nutrition service
/api/v1/mail/*            # → Mail service
```

### Environment Variables
```bash
AUTH_SERVICE_URL=http://localhost:3001
HEALTH_SERVICE_URL=http://localhost:3002
COACH_SERVICE_URL=http://localhost:3003
NUTRITION_SERVICE_URL=http://localhost:3004
MAIL_SERVICE_URL=http://localhost:3005
ALLOWED_ORIGINS=http://localhost:3000,https://aivo.app
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
```

### Development
```bash
cd apps/services/gateway
pnpm dev    # Start gateway on port 3000
pnpm deploy # Deploy to Cloudflare
```

## WASM Gateway Package

The WASM Gateway (`packages/wasm-gateway`) provides unified WASM module loading and execution:

### Features
- **Automatic Fallback**: Falls back to TypeScript if WASM fails
- **Performance Monitoring**: Tracks execution time, memory usage
- **Benchmarking**: Compares WASM vs TypeScript performance
- **Circuit Breaker**: Handles WASM failures gracefully
- **Cloudflare Workers**: Native Workers integration

### Usage
```typescript
import { WASMGateway, createWasmGateway } from '@aivo/wasm-gateway';

// Create gateway
const gateway = createWasmGateway({
  engineType: 'auto',
  strategy: 'prefer-wasm',
});

// Initialize
await gateway.init();

// Process input
const result = gateway.process({
  landmarks: {...},
  exerciseCode: 'squat',
  currentPhase: 'ready',
  ...
});

// Get metrics
const metrics = gateway.getMetrics();
console.log(`Ops/sec: ${metrics.opsPerSecond}`);
```

### Engine Types
- `wasm`: Uses compiled Rust WASM module
- `typescript`: Uses TypeScript fallback implementation
- `auto`: Automatically selects based on benchmark

### API Endpoints (Worker)
```
POST /process          # Process single pose
POST /process/batch    # Process multiple poses
GET  /status          # Gateway status
POST /benchmark        # Run performance benchmark
GET  /metrics          # Prometheus metrics
POST /reset            # Reset gateway state
GET  /health           # Health check
```

## Architecture Diagrams

### API Gateway Flow
```
Client Request
     ↓
[Rate Limiter] ←── In-memory or KV
     ↓
[CORS Check]
     ↓
[API Key Validation] (optional)
     ↓
[Route to Service]
     ↓
Backend Service (auth|health|coach|nutrition|mail)
     ↓
Response with metrics
```

### WASM Execution Flow
```
Pose Input (landmarks)
     ↓
[WASM Gateway]
     ↓
┌────┴────┐
↓         ↓
[TypeScript] [WASM Module]
   Fallback  if available
     ↓         ↓
     └────┬────┘
          ↓
    [Output/Metrics]
```
