# AIVO - AI-Powered Health & Fitness Platform

AIVO is a comprehensive monorepo containing microservices and applications for an AI-powered health, fitness, and nutrition coaching platform.

## 📁 Project Structure

```
aivo/
├── apps/
│   ├── web/              # Next.js web application
│   ├── mobile/           # React Native mobile app (Expo)
│   └── services/         # Cloudflare Workers microservices
│       ├── gateway/      # API Gateway - unified entry point
│       ├── auth/         # Authentication & user management
│       ├── health/       # Health tracking & readiness engine
│       ├── coach/        # AI workout coaching
│       ├── nutrition/    # Meal planning & nutrition tracking
│       └── mail/         # Email service
│
├── packages/             # Shared libraries
│   ├── api-client/       # API client utilities
│   ├── common-types/     # Shared TypeScript types & utilities
│   ├── design-system/    # Shared design components
│   ├── exercise-engine/  # WebAssembly-based pose detection
│   ├── fitness-types/    # Fitness domain types
│   ├── health-types/     # Health domain types
│   ├── nutrition-types/  # Nutrition domain types
│   ├── queue-types/      # Queue message types
│   ├── swagger-utils/    # Swagger/OpenAPI utilities
│   ├── ui/               # React UI components
│   ├── wasm-gateway/     # WASM module loader & executor
│   └── eslint-config/    # ESLint configurations
│
├── turbo.json            # Turborepo configuration
├── pnpm-workspace.yaml   # pnpm workspace definition
└── package.json          # Root package.json
```

## 🏃 Applications

### Web Application (`apps/web`)
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4
- **Features**: Dashboard, user settings, nutrition tracking, AI intelligence

### Mobile Application (`apps/mobile`)
- **Framework**: Expo SDK 57
- **Language**: TypeScript
- **Features**: On-the-go tracking, pose detection, real-time coaching

### Microservices (`apps/services/*`)

All services are built on **Cloudflare Workers** with **Hono** framework.

| Service | Port | Description |
|---------|------|-------------|
| `gateway` | 3000 | API Gateway - unified entry point |
| `auth` | 3001 | User authentication, OAuth, JWT tokens |
| `health` | 3002 | Health metrics, readiness scores, AI insights |
| `coach` | 3003 | Workout planning, session tracking, AI coaching |
| `nutrition` | 3004 | Meal logging, AI food analysis, planning |
| `mail` | 3005 | Email notifications (via Resend) |

## 📦 Shared Packages

### `@repo/wasm-gateway`
WASM module loader with automatic TypeScript fallback:
- Unified interface for WASM modules
- Performance monitoring and benchmarking
- Circuit breaker pattern
- Cloudflare Workers native support

### `@repo/api-client`
Type-safe API client for all services with:
- Automatic token refresh
- Request/response typing
- Error handling

### `@repo/common-types`
Shared utilities extracted to reduce duplication:
- UUID generation with fallbacks
- Date/time utilities
- Validation helpers (isFiniteNumber, clamp, roundTo)
- Common enums (CHART_METRIC, CLIENT_TYPE, etc.)

### `@repo/fitness-types`, `@repo/health-types`, `@repo/nutrition-types`
Domain-specific Zod schemas and TypeScript types.

### `@repo/exercise-engine`
WebAssembly-powered pose detection using MediaPipe:
- 33-point body landmark detection
- Real-time angle calculations
- Rep counting
- Form correction feedback

## 🔧 Development

### Prerequisites
- Node.js >= 24
- pnpm 11+
- Wrangler CLI (for Cloudflare Workers)
- Expo CLI (for mobile development)

### Installation

```bash
pnpm install
```

### Commands

```bash
# Build all packages
pnpm build

# Development mode
pnpm dev

# Lint all packages
pnpm lint

# Type check all packages
pnpm check-types

# Format code
pnpm format
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

## 🏗️ Architecture

### API Communication

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│   Web   │────▶│   Auth  │     │  Health │
│ Mobile  │     │ Service │     │ Service │
└─────────┘     └─────────┘     └─────────┘
     │               │               │
     │               │               │
     └───────────────┴───────────────┘
                     │
              JWT Token Validation
```

### Data Flow

1. Client sends request with JWT token
2. Auth service validates token via middleware
3. Service processes request
4. Response returned with appropriate status

### Queue Architecture

```
┌────────────┐     ┌────────────┐     ┌────────────┐
│  Service   │────▶│  Queue    │────▶│  Worker   │
│  (Producer)│     │           │     │  (Consumer│
└────────────┘     └────────────┘     └────────────┘
```

## 📊 Type System

### Zod Schemas

All API inputs should be validated using Zod schemas:

```typescript
import { z } from 'zod';

export const CreateMealSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  items: z.array(z.object({
    name: z.string().min(1),
    quantity: z.number().positive(),
  })).min(1),
});
```

### Type Exports

Types are exported from domain packages:

```typescript
import type { HealthScore } from '@repo/health-types';
import type { MealPlan } from '@repo/nutrition-types';
import type { WorkoutPlan } from '@repo/fitness-types';
```

## 🔒 Security

### Authentication
- JWT tokens with RS256 signing
- Access tokens: 15 minutes expiry
- Refresh tokens: 7 days expiry

### Rate Limiting
- Per-IP rate limiting in middleware
- KV-based for distributed environments
- Configurable limits per endpoint

### Input Validation
- Zod schemas for all API inputs
- TypeScript strict mode enabled
- Sanitization for XSS prevention

## 📝 Documentation

For detailed API documentation, see each service's Swagger endpoint:
- Auth: `GET /swagger`
- Health: `GET /swagger`
- Coach: `GET /swagger`
- Nutrition: `GET /swagger`

## 🤝 Contributing

1. Create a feature branch from `main`
2. Follow the ESLint configuration
3. Add tests for new features
4. Ensure all CI checks pass
5. Submit a pull request

## 📄 License

Private - All rights reserved
