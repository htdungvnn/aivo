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
