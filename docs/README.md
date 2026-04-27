# AIVO Documentation

Welcome to AIVO - the AI-native fitness coaching platform.

## Getting Started

- **[QUICKSTART.md](./QUICKSTART.md)** - Get up and running in 15 minutes
- **[ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)** - Detailed environment configuration
- **[ENV_VARIABLES_REFERENCE.md](./ENV_VARIABLES_REFERENCE.md)** - Complete environment variable reference
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contribution guidelines and code standards

## Architecture & Design

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and ADRs
- **[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)** - **✅ Complete** UI/UX components, tokens, and patterns
- **[design-system/](./design-system/)** - Detailed specs, quick reference, accessibility guidelines
- **[DATABASE_SCHEMAS.md](./DATABASE_SCHEMAS.md)** - Database schemas and relationships *(complete)*

## API Documentation

- **[API_REFERENCE.md](./API_REFERENCE.md)** - Complete endpoint documentation with examples
- **[API_CONTRACTS.md](./API_CONTRACTS.md)** - API specifications for planned features *(coming soon)*

## Features

- **[FEATURES.md](./FEATURES.md)** - Feature catalog with business value and user stories *(coming soon)*
- **[USER_GUIDES.md](./USER_GUIDES.md)** - End-user documentation *(coming soon)*

## Development Guides

- **[MOBILE_DEVELOPMENT.md](./MOBILE_DEVELOPMENT.md)** - React Native/Expo development
- **[WASM_DEVELOPMENT.md](./WASM_DEVELOPMENT.md)** - Rust WebAssembly development
- **[FRONTEND.md](./FRONTEND.md)** - Next.js web development
- **[TESTING.md](./TESTING.md)** - Testing strategies and coverage

## Operations

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment to Cloudflare Workers and Pages
- **[CI_CD.md](./CI_CD.md)** - CI/CD pipeline documentation
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues and solutions

## Package Reference

| Package | Purpose | Docs |
|---------|---------|------|
| `@aivo/aivo-compute` | WASM fitness calculations | [COMPUTE.md](./COMPUTE.md) |
| `@aivo/db` | Drizzle schema & migrations | [DATABASE.md](./DATABASE.md) |
| `@aivo/memory-service` | Semantic memory | [MEMORY_SERVICE.md](./MEMORY_SERVICE.md) |
| `@aivo/api` | Cloudflare Workers API | [API_REFERENCE.md](./API_REFERENCE.md) |
| `@aivo/web` | Next.js web app | [FRONTEND.md](./FRONTEND.md) |
| `@aivo/mobile` | Expo mobile app | [MOBILE_DEVELOPMENT.md](./MOBILE_DEVELOPMENT.md) |

---

## Quick Links

### Development Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Start development (all services)
./scripts/dev.sh

# Run tests
pnpm run test

# Type check
pnpm run type-check

# Lint
pnpm run lint
```

### Environment Variables

Key variables (see [ENV_VARIABLES_REFERENCE.md](./ENV_VARIABLES_REFERENCE.md) for complete list):

```bash
# API
AUTH_SECRET=<generate-with-openssl-rand-base64-32>
GOOGLE_CLIENT_ID=from-google-cloud-console
FACEBOOK_APP_ID=from-facebook-developers
OPENAI_API_KEY=sk-... (optional)

# Web
NEXT_PUBLIC_API_URL=https://api.aivo.website
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
NEXT_PUBLIC_FACEBOOK_CLIENT_ID=...

# Mobile
EXPO_PUBLIC_API_URL=https://api.aivo.website
EXPO_PUBLIC_GOOGLE_CLIENT_ID=...
EXPO_PUBLIC_FACEBOOK_CLIENT_ID=...
EXPO_PUBLIC_SCHEME=aivomobile
```

### Key Source Files

- `packages/db/src/schema.ts` - Database schema
- `apps/api/src/index.ts` - API entry point
- `apps/api/src/routes/ai.ts` - AI chat endpoint
- `packages/memory-service/src/service.ts` - Memory orchestration
- `packages/aivo-compute/src/lib.rs` - WASM compute functions
- `apps/web/src/app/page.tsx` - Next.js homepage
- `apps/mobile/app/(tabs)/index.tsx` - Mobile home screen

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on:
- Code standards (TypeScript, Rust)
- Testing requirements
- Pull request process
- Commit conventions
- Architecture changes (ADRs)

---

## Support

- **Issues:** [GitHub Issues](https://github.com/your-repo/issues)
- **Documentation:** Browse sections above
- **Team Chat:** #aivo-dev (Slack/Discord)

---

## Documentation Status

| Document | Status | Notes |
|----------|--------|-------|
| README (root) | ✅ Complete | - |
| CONTRIBUTING.md | ✅ Complete | - |
| ENVIRONMENT_SETUP.md | ✅ Complete | - |
| ENV_VARIABLES_REFERENCE.md | ✅ Complete | - |
| DESIGN_SYSTEM.md | ✅ Complete | From senior-designer |
| design-system/ | ✅ Complete | Full specs & guidelines |
| DATABASE_SCHEMAS.md | ✅ Complete | All tables documented |
| MOBILE_DEVELOPMENT.md | ✅ Complete | - |
| WASM_DEVELOPMENT.md | ✅ Complete | - |
| CI_CD.md | ✅ Complete | - |
| CHANGELOG.md | ✅ Complete | - |
| ARCHITECTURE.md | ⏳ In Progress | Pending arch analysis #26 |
| API.md | ✅ Complete | Comprehensive reference with all endpoints |
| API_CONTRACTS.md | ⏳ Template | Awaiting senior-hono |
| FEATURES.md | ⏳ Template | Awaiting senior-ba |
| USER_GUIDES.md | ⏳ Template | Depends on features |
| TESTING.md | ✅ Complete | Enhanced with comprehensive strategies |
| DEPLOYMENT.md | ✅ Complete | Full deployment guide |
| TROUBLESHOOTING.md | ✅ Complete | Common issues and solutions |

---

**Version:** 2.0.0  
**Last Updated:** 2025-04-27  
**Maintained by:** AIVO Team
