# AIVO Documentation

Welcome to AIVO - the AI-native fitness coaching platform.

## Getting Started

- **[Quick Start Guide](./QUICKSTART.md)** - Get up and running in 15 minutes
- **[System Architecture](./ARCHITECTURE.md)** - High-level design and components
- **[API Reference](./API.md)** - Complete endpoint documentation
- **[Database Schema](./DATABASE.md)** - Tables, relationships, and migrations

## Core Features

### Semantic Memory System

- **[Memory Service](./MEMORY_SERVICE.md)** - AI fact extraction, vector search, and context building
- Solves the "Goldfish Memory" problem by remembering user facts
- Critical health information prioritization
- Graph-based memory storage with relationships
- **Recent:** TypeScript strict mode compliant, 100% lint pass, 48 passing tests

### AI Coaching

- **Chat Integration** - Real-time AI fitness coaching
- **Adaptive Planning** - Auto-adjust routines based on deviation and recovery
- **Body Insights** - AI analysis of metrics and progress

### Compute Engine

- **[WASM Compute](./COMPUTE.md)** - Rust-based high-performance calculations
- Deviation scoring
- Recovery curve analysis
- Token optimization
- Correlation analysis

### Complete Feature Catalog

- **[All Features](./FEATURES.md)** - Comprehensive list of all 50+ features across API, Web, Mobile, and packages

## Frontend Applications

- **[Web App](./FRONTEND.md)** - Next.js dashboard and chat
- **Mobile App** - Expo React Native (iOS/Android)
- OAuth integration (Google + Facebook)
- Responsive design (Tailwind / NativeWind)

## Operations

- **[Deployment Guide](./DEPLOYMENT.md)** - Deploy to Cloudflare Workers and app stores
- **[Testing Guide](./TESTING.md)** - Unit, integration, and E2E tests
- **[Mock Data Guide](./MOCK_DATA.md)** - Admin test data for UI/UX testing
- **[Troubleshooting](./TROUBLESHOOTING.md)** - Common issues and solutions

## Package Reference

| Package | Purpose | Docs |
|---------|---------|------|
| `@aivo/compute` | WASM fitness calculations | [COMPUTE.md](./COMPUTE.md) |
| `@aivo/db` | Drizzle schema & migrations | [DATABASE.md](./DATABASE.md) |
| `@aivo/memory-service` | Semantic memory | [MEMORY_SERVICE.md](./MEMORY_SERVICE.md) |
| `@aivo/api` | Cloudflare Workers API | [API.md](./API.md) |
| `@aivo/web` | Next.js web app | [FRONTEND.md](./FRONTEND.md) |
| `@aivo/mobile` | Expo mobile app | [FRONTEND.md](./FRONTEND.md) |

---

## Quick Links

### Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Start development
pnpm run dev

# Run tests
pnpm run test

# Type check
pnpm run type-check
```

### Environment Setup

```bash
# Required environment variables
OPENAI_API_KEY=sk-...
GOOGLE_CLIENT_ID=...
AUTH_SECRET=...

# Optional (mobile)
FACEBOOK_APP_ID=...
```

### Key Files

- `CLAUDE.md` - Project instructions and workflows
- `packages/db/src/schema.ts` - Database schema
- `apps/api/src/routes/ai.ts` - Main AI endpoint
- `packages/memory-service/src/service.ts` - Memory orchestration
- `packages/aivo-compute/src/lib.rs` - WASM compute functions

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Run `pnpm run type-check && pnpm run lint && pnpm run test`
5. Submit a pull request

---

## Support

- **Issues:** [GitHub Issues](https://github.com/your-repo/issues)
- **Docs:** See sections above
- **Community:** [Discord/Slack link]

---

**Version:** 1.1.0  
**Last Updated:** 2026-04-22  
**Maintained by:** AIVO Team
