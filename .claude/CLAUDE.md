# AIVO | MASTER INTELLIGENCE CONTEXT

## 1. PROJECT VISION & ARCHITECTURE

- **Name:** AIVO
- **Core:** High-performance fitness platform and AI-native conversational platform.
- **Monorepo:** Managed via pnpm + Turborepo.
- **Execution Layers:**
    - **Compute Engine:** Rust (`packages/aivo-compute`) compiled to WebAssembly (WASM).
    - **Backend/Infrastructure:** Cloudflare Workers, D1 SQL Database, R2 Storage.
    - **Web Interface:** Next.js 15 (App Router) in `apps/web`.
    - **Mobile App:** React Native (Expo) in `apps/mobile`.

## 2. TECHNOLOGY STACK SPECIFICS
- **Languages:** TypeScript (Strict), Rust.
- **Frameworks:** Hono (API), Tailwind CSS (Web), NativeWind (Mobile).
- **Database:** Drizzle ORM / SQL for Cloudflare D1.
- **Communication:** Shared types in `packages/shared-types`.

## 3. MANDATORY WORKFLOWS (AUTO-EXECUTE)

### **The WASM Bridge**
1. Modify Rust logic in `packages/aivo-compute/src`.
2. **Build Command:** `pnpm run build:wasm` (must target `wasm-pack` or `wasm32-unknown-unknown`).
3. After build, ensure the WASM binary is correctly linked in the Worker/Frontend environment.

### **Database Evolutions (D1)**
1. Always use migrations: `pnpm --filter @aivo/db exec drizzle-kit generate`.
2. Apply locally for dev: `pnpm --filter @aivo/db exec wrangler d1 migrations apply aivo-db --local`.
3. Apply to production only during deployment via `./scripts/deploy.sh`.

### **Deployment Pipeline**
- Deployments are manual via script. Claude must verify build artifacts in the `dist` or `.wrangler` folders before declaring success.

## 4. CODING GUIDELINES
- **Functional First:** Use functional components and hooks. Avoid classes.
- **Rust Safety:** Use `Result<T, JsError>` for WASM boundaries. No unhandled `unwrap()` or `panic!`.
- **Naming:** PascalCase for Components, camelCase for variables/functions, snake_case for Rust.
- **AI Efficiency:** If a package installation is required, run `pnpm add <package> -w` automatically.

## 5. CLAUDE CLI / VIBE CODING PROTOCOLS
- **Autonomy:** You are authorized to create, delete, and modify files.
- **Non-Interactive Mode:** Use `-y` or `--yes` for all CLI tool prompts (Wrangler, pnpm, etc.).
- **Multi-Package Execution:** You must maintain consistency across the monorepo. If a type changes in `packages/shared-types`, immediately update the Web and Mobile apps.
- **Terminal Context:** Optimized for Ghostty + tmux. Feel free to suggest shell commands that leverage tmux split-panes for monitoring logs while coding.

## 6. PROJECT CONSTRAINTS
- **Worker Environment:** No Node.js standard library. Use Web APIs only.
- **Performance:** Complex fitness math must stay in the Rust layer.
- **Context:** If the conversation history becomes too long, use `/compact` to save token space while keeping the project goals in memory.

## 7. QUICK REFERENCE

### Development Commands
```bash
# Install dependencies
pnpm install

# Run everything in dev mode
pnpm run dev

# Build all packages
pnpm run build

# Build WASM only
pnpm run build:wasm

# Type check all packages
pnpm run type-check

# Lint all packages
pnpm run lint

# Clean all builds
pnpm run clean
```

### Package-Specific Commands
```bash
# Web (Next.js)
cd apps/web && pnpm run dev

# Mobile (Expo)
cd apps/mobile && pnpmx expo start

# API (Cloudflare Workers)
cd apps/api && pnpmx wrangler dev

# Database
cd packages/db && pnpmx drizzle-kit studio
```

## 8. ARCHITECTURAL DECISIONS

### Why WASM for Compute?
- Performance-critical fitness calculations run in Rust/WASM for near-native speed
- Type-safe interface with TypeScript via wasm-bindgen
- Consistent across web, mobile, and edge environments

### Why D1 + Drizzle?
- Serverless SQL with zero-configuration
- Type-safe queries with Drizzle ORM
- Built-in migrations and schema management
- Seamless integration with Cloudflare Workers

### Why Hono?
- Lightweight, fast, and fully compatible with Workers
- Built-in middleware support (CORS, auth, etc.)
- Type-safe routing and handlers
- Excellent for building RESTful APIs

## 10. AUTHENTICATION

### OAuth Flow (Google & Facebook Only)

AIVO uses **Google and Facebook OAuth exclusively** for authentication. No email/password login.

#### API Endpoints
```
POST /api/auth/google      # Verify Google ID token, create/find user
POST /api/auth/facebook    # Verify Facebook access token, create/find user
POST /api/auth/verify      # Verify app JWT token
POST /api/auth/logout      # Invalidate session
```

#### Database Schema
- `users`: Core user data (id, email, name, fitness profile)
- `sessions`: OAuth session tracking (provider, provider_user_id, tokens)

#### Web Implementation (Next.js)
1. Install `@react-oauth/google` package
2. Use `GoogleLogin` component from the package
3. Facebook uses popup-based OAuth flow via `window.open`
4. Store JWT in `localStorage` (use httpOnly cookies in production)

#### Mobile Implementation (Expo)
1. Install `expo-auth-session`, `expo-web-browser`, `expo-crypto`
2. Use `WebBrowser.openAuthSessionAsync()` for OAuth flows
3. Store JWT in `AsyncStorage`
4. Implement proper deep linking for callbacks

#### Environment Variables Required
**Web (`apps/web/.env.local`)**:
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - Google OAuth client ID
- `NEXT_PUBLIC_FACEBOOK_CLIENT_ID` - Facebook App ID

**Mobile (`apps/mobile/.env`)**:
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID` - Google OAuth client ID
- `EXPO_PUBLIC_FACEBOOK_CLIENT_ID` - Facebook App ID

**API (`apps/api/wrangler.toml`)**:
- `AUTH_SECRET` - JWT signing secret (change in production!)

### OAuth Provider Setup

#### Google Cloud Console
1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID
3. Add authorized JavaScript origins:
   - `http://localhost:3000` (dev)
   - `https://your-domain.com` (prod)
4. Add authorized redirect URIs:
   - `http://localhost:3000/login` (dev)
5. Copy Client ID to environment variables

#### Facebook Developers
1. Go to https://developers.facebook.com/apps
2. Create new app with "Consumer" type
3. Add "Facebook Login" product
4. Configure OAuth redirect URIs
5. Copy App ID to environment variables

## 12. ENVIRONMENT SETUP

### Development Environment

Use the provided setup scripts:

```bash
# 1. Create .env files from templates
./scripts/setup-env.sh

# 2. Generate secure secrets
./scripts/generate-secrets.sh

# 3. Validate configuration
./scripts/validate-env.sh

# 4. Start development
./scripts/dev.sh
```

### Required Environment Variables

**API (Cloudflare Workers)**:
- `AUTH_SECRET` (required) - JWT signing secret
- `GOOGLE_CLIENT_ID` (optional) - Google OAuth client ID
- `FACEBOOK_APP_ID` (optional) - Facebook App ID
- `OPENAI_API_KEY` (optional) - OpenAI API key
- `ALLOWED_ORIGINS` (optional) - CORS origins, defaults to localhost
- `R2_PUBLIC_URL` (optional) - R2 public URL for images

**Web (Next.js)**:
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (required for OAuth)
- `NEXT_PUBLIC_FACEBOOK_CLIENT_ID` (required for OAuth)
- `NEXT_PUBLIC_API_URL` - API endpoint URL
- `NEXT_PUBLIC_R2_PUBLIC_URL` - R2 public URL

**Mobile (Expo)**:
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID` (required for OAuth)
- `EXPO_PUBLIC_FACEBOOK_CLIENT_ID` (required for OAuth)
- `EXPO_PUBLIC_API_URL` - API endpoint URL
- `EXPO_PUBLIC_R2_PUBLIC_URL` - R2 public URL
- `EXPO_PUBLIC_SCHEME` - Deep linking scheme

### Production Deployment

See [docs/PRODUCTION_DEPLOYMENT.md](./docs/PRODUCTION_DEPLOYMENT.md) for complete production setup.

Key steps:
1. Set Cloudflare secrets via `wrangler secret put`
2. Configure `wrangler.toml` with actual resource IDs
3. Update OAuth redirect URIs to production domain
4. Deploy with `./scripts/deploy.sh`

### Web Deployment (Cloudflare Pages)

The web app is configured for Cloudflare Pages deployment:

```bash
# Deploy web app
./scripts/deploy-web-pages.sh

# Or manually
cd apps/web
pnpm run build:pages
wrangler pages deploy . --project-name aivo-web
```

Configuration files:
- `next.config.cloudflare.js` - Next.js config for Pages
- `pages.config.toml` - Pages build configuration
- `_routes` - Routing rules (SPA fallback, API proxy)
- `.env.production.local` - Production environment variables

See [docs/CLOUDFLARE_PAGES_DEPLOYMENT.md](./docs/CLOUDFLARE_PAGES_DEPLOYMENT.md) for detailed web deployment guide.

## 11. CURRENT PROJECT STATUS
- Monorepo structure initialized ✅
- Next.js web scaffolded ✅
- Expo mobile scaffolded ✅
- Cloudflare Workers API scaffolded ✅
- Rust WASM compute package scaffolded ✅
- Shared types defined ✅
- Drizzle ORM schema defined ✅
- Build pipelines configured ✅
- Migrated from Bun to pnpm ✅

## 12. AI MODEL SELECTOR SYSTEM

### Overview
AIVO uses an intelligent model selection system that automatically chooses between OpenAI and Google Gemini based on cost optimization while maintaining quality requirements.

### Features
- **Automatic Model Selection**: Analyzes task complexity and requirements to select the best model
- **Cost Optimization**: Prefers cheaper models (Gemini Flash) for simple tasks, uses premium models (GPT-4o, Gemini Pro) only when needed
- **Capability Matching**: Filters models based on required features (vision, reasoning, code, JSON mode)
- **Transparent Pricing**: All costs are tracked and reported per request

### Available Models
| Model | Provider | Input/1M | Output/1M | Quality |
|-------|----------|----------|-----------|---------|
| gpt-4o-mini | OpenAI | $0.15 | $0.60 | 8.5/10 |
| gpt-4o | OpenAI | $2.50 | $10.00 | 9.5/10 |
| o3-mini | OpenAI | $1.10 | $4.40 | 9.2/10 |
| gemini-1.5-flash | Google | $0.075 | $0.30 | 8.0/10 |
| gemini-1.5-pro | Google | $1.25 | $5.00 | 9.3/10 |
| gemini-2.0-flash | Google | $0.10 | $0.40 | 8.7/10 |

### Configuration
Set environment variables in `apps/api/.env`:
```bash
OPENAI_API_KEY=sk-your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
```

### API Endpoints
- `POST /api/ai/chat` - Chat with auto-selected model (includes cost info in response)
- `GET /api/ai/models` - List all available models with pricing
- `POST /api/ai/estimate-cost` - Estimate cost for a given prompt

### Implementation
The model selector is implemented in:
- `apps/api/src/utils/model-selector.ts` - Core selection logic and model definitions
- `apps/api/src/utils/unified-ai-service.ts` - Unified service for both providers
- `apps/api/src/routes/ai.ts` - Updated to use the new service

### Cost Optimization Strategy
1. **Aggressive** (`costOptimization: 'aggressive'`): Always pick cheapest capable model
2. **Balanced** (default): Balance cost and quality based on task requirements
3. **Quality** (`costOptimization: 'quality'`): Prioritize quality over cost

### Task Complexity Detection
The system automatically detects:
- **Simple**: Short greetings, basic questions
- **Moderate**: Standard queries, simple analysis
- **Complex**: Multi-step reasoning, detailed analysis
- **Expert**: Research-level, novel problems, advanced calculations

### Capability Requirements
- Vision (image analysis)
- Reasoning (logical thinking)
- Code (programming tasks)
- Creative (writing, content)
- JSON mode (structured output)
- Function calling (tool use)
