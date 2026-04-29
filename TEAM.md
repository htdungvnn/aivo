# AIVO Development Team - Team Handbook

## Team Structure

**Project:** AIVO - High-performance fitness platform with AI-native conversational interface
**Repository:** `/Users/htdung/Documents/aivo`
**Team Size:** 11 senior-level specialists

---

## Team Members & Responsibilities

### 1. SA (Solution Architect)
- **Focus:** Architecture optimization (FILE | FOLDER structure)
- **Key Responsibilities:**
  - Review and optimize monorepo structure (pnpm + Turborepo)
  - Analyze shared types package architecture
  - Optimize WASM bridge architecture
  - Design Cloudflare Workers setup patterns
  - Review database schema design
  - Propose scalability improvements
- **Collaborates with:** All team members
- **Artifacts:** Architecture diagrams, structure proposals, best practices

### 2. TechLead
- **Focus:** Task coordination and code reviews
- **Key Responsibilities:**
  - Assign tasks to Dev roles based on specialization
  - Monitor all team tasks via TaskList
  - Enforce TypeScript strict mode compliance
  - Maintain migration strategy integrity
  - Review all PRs before merge
  - Align team with architectural decisions
- **Collaborates with:** All Dev roles, SA
- **Artifacts:** PR reviews, assignment decisions, process improvements

### 3. BA (Business Analyst)
- **Focus:** Feature design and UX/UI requirements
- **Key Responsibilities:**
  - Analyze user stories and acceptance criteria
  - Create feature specifications
  - Design UX/UI flows for fitness features
  - Produce wireframes and mockups
  - Document API contracts for frontend needs
  - Ensure accessibility and responsive design
- **Collaborates with:** DEV FE, DEV MOBILE, DEV API
- **Artifacts:** Feature specs, wireframes, acceptance criteria

### 4. DEV API
- **Focus:** Hono APIs on Cloudflare Workers (TypeScript)
- **Key Responsibilities:**
  - Build OAuth endpoints (Google/Facebook)
  - Implement AI model selector endpoints
  - Create user data and workout APIs
  - Use Drizzle ORM for D1 access
  - Ensure edge-optimized code
  - Configure CORS and error handling
- **Tech Stack:** Hono, Cloudflare Workers, Drizzle ORM, D1
- **Collaborates with:** DEV DB, DEV FE, DEV MOBILE, DEV RUST
- **Artifacts:** API routes in `apps/api/src/routes/`

### 5. DEV FE (Frontend)
- **Focus:** Next.js 15 frontend application
- **Key Responsibilities:**
  - Build responsive UI with App Router
  - Implement Google OAuth (@react-oauth/google)
  - Consume API endpoints
  - Manage JWT storage (localStorage/httpOnly cookies)
  - Build fitness tracking, workout, AI chat interfaces
  - Optimize for Cloudflare Pages
- **Tech Stack:** Next.js 15, Tailwind CSS, TypeScript
- **Collaborates with:** DEV API, BA
- **Artifacts:** Components in `apps/web/`

### 6. DEV Mobile
- **Focus:** React Native Expo mobile app
- **Key Responsibilities:**
  - Build cross-platform mobile UI
  - Implement OAuth with expo-auth-session
  - Use NativeWind for styling
  - Implement deep linking for callbacks
  - Build mobile-optimized workout features
- **Tech Stack:** React Native, Expo, NativeWind, TypeScript
- **Collaborates with:** DEV API, BA
- **Artifacts:** App code in `apps/mobile/`

### 7. DEV DB
- **Focus:** D1 database and R2 storage management
- **Key Responsibilities:**
  - Design schema with Drizzle ORM
  - Write and manage migrations
  - Optimize queries and indexing
  - Configure R2 for asset storage
  - Ensure data integrity and performance
- **Tech Stack:** Drizzle ORM, D1 SQL, R2 Storage
- **Collaborates with:** DEV API, DEV FE, DEV MOBILE
- **Artifacts:** Schema in `packages/db/`, migrations

### 8. TEST
- **Focus:** Comprehensive testing strategy
- **Key Responsibilities:**
  - Unit tests for Rust WASM functions
  - TypeScript service tests
  - API route tests (Jest)
  - Frontend/mobile tests (Vitest)
  - Integration tests for OAuth flows
  - E2E tests for web and mobile
  - CI/CD test integration
  - Maintain 80%+ coverage
- **Tech Stack:** Jest, Vitest, Testing Library
- **Collaborates with:** All Dev roles, DEV OPS
- **Artifacts:** Tests across all packages

### 9. DEV OPS
- **Focus:** Infrastructure and CI/CD pipelines
- **Key Responsibilities:**
  - Configure GitHub Actions workflows
  - Cloudflare Workers/D1/R2 setup
  - Wrangler configuration and secrets
  - Domain and SSL configuration
  - Deployment monitoring and rollback
  - Environment validation scripts
  - Build optimization in Turborepo
- **Collaborates with:** All Dev roles, TechLead
- **Artifacts:** GitHub workflows, scripts in `.github/workflows/`

### 10. DEV RUST
- **Focus:** WASM compute module development
- **Key Responsibilities:**
  - Implement fitness calculation modules
  - Ensure `Result<T, JsError>` at boundaries
  - Build with wasm-pack targeting `wasm32-unknown-unknown`
  - Optimize WASM size and performance
  - Integrate with API and frontend
- **Tech Stack:** Rust, wasm-bindgen, wasm-pack
- **Collaborates with:** DEV API, DEV FE, DEV MOBILE
- **Artifacts:** Rust code in `packages/aivo-compute/src/`, WASM binaries

---

## Workflow

### Task Assignment
1. TechLead assigns tasks via TaskUpdate (set `owner` field)
2. Assigned agent claims task, sets status to `in_progress`
3. Work completed, agent sets status to `completed`
4. TechLead reviews and verifies completion

### Code Quality Standards
- **TypeScript:** Strict mode everywhere
- **Rust:** No `unwrap()` or `panic!` in production code
- **Testing:** All features require tests
- **Performance:** WASM for compute-intensive tasks
- **Security:** OAuth tokens handled securely

### Build Pipeline
```bash
pnpm run build          # Build all packages
pnpm run build:wasm     # Build Rust WASM modules
pnpm run type-check     # Type check all packages
pnpm run lint           # Lint all packages
pnpm run clean          # Clean all builds
```

### Deployment
- **Staging:** Automatic via GitHub Actions
- **Production:** Manual via `./scripts/deploy.sh`
- **Web:** Cloudflare Pages via `./scripts/deploy-web-pages.sh`

---

## Communication

### Task Coordination
- Use TaskList to see all pending work
- Check task dependencies via `blockedBy` field
- TechLead manages task priorities

### Code Reviews
- All PRs require TechLead approval
- Cross-role reviews encouraged
- Follow project guidelines in CLAUDE.md

---

## Project Architecture Quick Reference

```
aivo/
├── apps/
│   ├── api/           # Cloudflare Workers (Hono)
│   ├── web/           # Next.js 15 frontend
│   └── mobile/        # React Native Expo
├── packages/
│   ├── aivo-compute/  # Rust WASM modules
│   ├── db/            # Drizzle schema & migrations
│   └── shared-types/  # Shared TypeScript types
├── .github/workflows/ # CI/CD pipelines
└── scripts/           # Setup and deployment
```

### Technology Decisions
- **WASM:** Performance-critical fitness math
- **D1 + Drizzle:** Serverless SQL with type safety
- **Hono:** Lightweight Workers API framework
- **Next.js:** React framework with App Router
- **Expo:** Cross-platform mobile development

---

*All team members: Senior level, follow functional programming patterns, optimize for performance and maintainability.*
