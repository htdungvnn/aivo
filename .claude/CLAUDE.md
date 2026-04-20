# AIVO | MASTER INTELLIGENCE CONTEXT

## 1. PROJECT VISION & ARCHITECTURE

- **Name:** AIVO
- **Core:** High-performance fitness platform and AI-native conversational platform.
- **Monorepo:** Managed via Bun + Turborepo.
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
2. **Build Command:** `bun run build:wasm` (must target `wasm-pack` or `wasm32-unknown-unknown`).
3. After build, ensure the WASM binary is correctly linked in the Worker/Frontend environment.

### **Database Evolutions (D1)**
1. Always use migrations: `bunx wrangler d1 migrations create aivo-db <name>`.
2. Apply locally for dev: `bunx wrangler d1 migrations apply aivo-db --local`.
3. Apply to production only during deployment via `./scripts/deploy.sh`.

### **Deployment Pipeline**
- Deployments are manual via script. Claude must verify build artifacts in the `dist` or `.wrangler` folders before declaring success.

## 4. CODING GUIDELINES
- **Functional First:** Use functional components and hooks. Avoid classes.
- **Rust Safety:** Use `Result<T, JsError>` for WASM boundaries. No unhandled `unwrap()` or `panic!`.
- **Naming:** PascalCase for Components, camelCase for variables/functions, snake_case for Rust.
- **AI Efficiency:** If a package installation is required, run `bun add <package> -y` automatically.

## 5. CLAUDE CLI / VIBE CODING PROTOCOLS
- **Autonomy:** You are authorized to create, delete, and modify files.
- **Non-Interactive Mode:** Use `-y` or `--yes` for all CLI tool prompts (Wrangler, Bun, etc.).
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
bun install

# Run everything in dev mode
bun run dev

# Build all packages
bun run build

# Build WASM only
bun run build:wasm

# Type check all packages
bun run type-check

# Lint all packages
bun run lint

# Clean all builds
bun run clean
```

### Package-Specific Commands
```bash
# Web (Next.js)
cd apps/web && bun run dev

# Mobile (Expo)
cd apps/mobile && bunx expo start

# API (Cloudflare Workers)
cd apps/api && bunx wrangler dev

# Database
cd packages/db && bunx drizzle-kit studio
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

## 9. CURRENT PROJECT STATUS
- Monorepo structure initialized ✅
- Next.js web scaffolded ✅
- Expo mobile scaffolded ✅
- Cloudflare Workers API scaffolded ✅
- Rust WASM compute package scaffolded ✅
- Shared types defined ✅
- Drizzle ORM schema defined ✅
- Build pipelines configured ✅
