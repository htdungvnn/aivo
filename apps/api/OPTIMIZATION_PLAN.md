# AIVO API Optimization Plan

## Executive Summary

Comprehensive optimization plan for the AIVO Hono-based Cloudflare Workers API focusing on:
- Standardized error handling and response formats
- Enhanced Swagger/OpenAPI documentation
- Improved health checks with dependency status
- Performance optimizations and caching strategies
- Security hardening
- Testing and monitoring improvements

---

## Current State Analysis

### ✅ What's Working Well
1. **Solid Foundation**: Hono with OpenAPI support, TypeScript strict mode
2. **Security**: Security headers, CORS, rate limiting, request size limits already in place
3. **Authentication**: JWT-based auth with OAuth integration (Google/Facebook)
4. **Documentation**: Basic Swagger UI integration at `/docs` and `/openapi.json`
5. **Health Checks**: Comprehensive health endpoint at `/health` with service status checks
6. **Validation**: Zod schemas used across most routes
7. **WASM Integration**: Compute packages ready (though currently commented out)

### ⚠️ Areas for Improvement

#### 1. Error Handling Inconsistency
- **Issue**: Mixed error response formats: `{ error: "..." }`, `{ success: false, error: "..." }`
- **Impact**: Difficult for clients to handle errors predictably
- **Example**: `users.ts` returns `{ error: "..." }` while `auth.ts` returns `{ success: false, error: "..." }`

#### 2. Documentation Gaps
- **Issue**: Many routes lack Swagger decorators (`@swagger`)
- **Issue**: Error responses not documented in OpenAPI spec
- **Issue**: No security scheme definition for Bearer tokens
- **Impact**: API documentation incomplete, harder for developers to use

#### 3. Health Check Limitations
- **Issue**: WASM module checks commented out due to init issues
- **Issue**: No memory/CPU metrics (Cloudflare-specific)
- **Issue**: Cache check only tests BODY_INSIGHTS_CACHE, not all KV namespaces
- **Issue**: No check for AI service configuration (Gemini API key missing)

#### 4. Request/Response Validation
- **Issue**: Some routes (e.g., `users.ts` PATCH) use ad-hoc validation instead of Zod
- **Issue**: No centralized validation error handler
- **Impact**: Inconsistent validation errors, potential type safety issues

#### 5. Performance & Caching
- **Issue**: No caching strategy for frequently accessed data (user profiles, workout plans)
- **Issue**: Database queries could benefit from query optimization
- **Issue**: WASM modules lazy-loaded but initialization issues not resolved

#### 6. Testing Coverage
- **Issue**: Only 9 test files for entire API
- **Issue**: Missing integration tests for critical flows
- **Impact**: Low confidence in code changes, regression risk

#### 7. Logging & Monitoring
- **Issue**: Inconsistent logging (some `console.error`, some silent)
- **Issue**: No request ID tracing
- **Issue**: No structured logging format
- **Impact**: Hard to debug issues in production

#### 8. Code Organization
- **Issue**: Some routes are very large (nutrition.ts: 40KB, ai.ts: 32KB)
- **Issue**: Business logic mixed with route handlers
- **Impact**: Maintainability, testability concerns

---

## Optimization Plan

### Phase 1: Foundation Improvements (Priority: HIGH)

#### 1.1 Standardized Error Handling
**Files to create:**
- `apps/api/src/middleware/error-handler.ts` - Global error catching middleware
- `apps/api/src/utils/errors.ts` - Error classes and response formatter

**Implementation:**
- Create base `APIError` class with `statusCode`, `code`, `message`, `details`
- Define common error types: `ValidationError`, `AuthError`, `NotFoundError`, `ConflictError`
- Middleware catches all errors and formats response as:
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Invalid request data",
      "details": { "field": "email", "issue": "required" }
    }
  }
  ```
- Update all routes to use standardized errors or throw APIError instances
- Ensure errors are logged with request context (request ID, user ID)

#### 1.2 Request ID & Structured Logging
**Files to create:**
- `apps/api/src/middleware/request-id.ts` - Generate and propagate request IDs
- `apps/api/src/utils/logger.ts` - Structured logger with levels

**Implementation:**
- Generate unique request ID at entry point (UUID or ULID)
- Add `X-Request-Id` header to all responses
- Store request ID in Hono context for propagation
- Create logger that includes request ID, timestamp, user ID, route
- Use appropriate log levels: debug, info, warn, error
- In production, logs should be JSON-structured for Cloudflare Logpush

#### 1.3 Complete Swagger Documentation
**Updates to:**
- All route files: add missing `@swagger` decorators
- `apps/api/src/index.ts`: enhance OpenAPI config

**Implementation:**
- Define security schemes in OpenAPI config:
  ```typescript
  securitySchemes: {
    bearer: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT"
    }
  }
  ```
- Add global security requirement for authenticated routes
- Document all request/response schemas using Zod references
- Add error response schemas (400, 401, 403, 404, 500) with examples
- Add tags organization: Auth, Users, Workouts, AI, Nutrition, etc.
- Add API versioning info in root endpoint
- Ensure `/docs` shows complete documentation

#### 1.4 Enhanced Health Checks
**File to update:** `apps/api/src/routes/health.ts`

**Implementation:**
- Re-enable and fix WASM module checks (or document why disabled)
- Add checks for all KV namespaces (not just BODY_INSIGHTS_CACHE)
- Add Gemini API key check if configured
- Add memory usage metrics using `c.env.CF_MEMORY_LIMIT` if available
- Add uptime breakdown (by service if possible)
- Add database tables count and row counts for key tables
- Add response time percentiles (p50, p95, p99) if monitoring in place
- Consider adding `/health/ready` and `/health/live` for Kubernetes-style probes

---

### Phase 2: Performance & Caching (Priority: HIGH)

#### 2.1 Caching Strategy
**Files to create:**
- `apps/api/src/middleware/cache.ts` - Response caching middleware
- `apps/api/src/services/cache.ts` - Cache service with TTL management

**Implementation:**
- Use KV namespaces for caching:
  - `USER_PROFILE_CACHE` - User profiles (TTL: 5 min)
  - `WORKOUT_PLAN_CACHE` - Workout plans (TTL: 15 min)
  - `NUTRITION_DATA_CACHE` - Nutrition info (TTL: 10 min)
  - `AI_RESPONSE_CACHE` - AI chat responses (TTL: 1 hour, keyed by content hash)
- Cache GET responses with cache-control headers
- Invalidate caches on data mutations (POST/PUT/DELETE)
- Implement cache stampede prevention with locks
- Use R2 for large static assets (already configured)

#### 2.2 Database Query Optimization
**Files to review:**
- All route files with database queries

**Implementation:**
- Add database indexes for frequently queried columns:
  - `users.email` (already unique)
  - `workouts.userId, createdAt`
  - `sessions.userId`
  - `food_logs.userId, date`
  - `conversations.userId, createdAt`
- Use Drizzle's query builder efficiently (avoid N+1 queries)
- Consider read replicas for heavy read operations (Cloudflare D1 doesn't support yet, but plan for future)
- Add query result caching for expensive aggregations
- Use `SELECT specific columns` instead of `SELECT *`

#### 2.3 WASM Module Optimization
**Files to fix:**
- `apps/api/src/routes/nutrition.ts` - Image processor
- `apps/api/src/routes/ai.ts` - Optimizer module
- Any other routes importing WASM

**Implementation:**
- Fix WASM initialization issues (check paths, loading strategy)
- Use `WebAssembly.instantiate` with proper error handling
- Implement fallback when WASM unavailable (graceful degradation)
- Pre-warm WASM modules on cold start if possible
- Measure WASM performance impact and optimize

---

### Phase 3: Code Quality & Maintainability (Priority: MEDIUM)

#### 3.1 Refactor Large Route Files
**Target files:**
- `apps/api/src/routes/nutrition.ts` (40KB)
- `apps/api/src/routes/ai.ts` (32KB)
- `apps/api/src/routes/biometric.ts` (26KB)
- `apps/api/src/routes/digital-twin.ts` (24KB)

**Implementation:**
- Extract service layer: create `apps/api/src/services/nutrition-service.ts`, etc.
- Move business logic out of route handlers
- Keep routes thin: validation → service call → response
- Extract Zod schemas to separate `validations/` directory
- Create shared utilities for common operations (pagination, filtering)

#### 3.2 Type Safety Improvements
**Files to review:**
- All route files

**Implementation:**
- Remove all `any` types, use proper interfaces
- Use `zod` inferred types: `type CreateWorkout = z.infer<typeof WorkoutCreateSchema>`
- Add return type annotations to all route handlers
- Enable `noImplicitAny` and fix all violations
- Add `unknown` instead of `any` for unknown objects

#### 3.3 Validation Consistency
**Implementation:**
- Create validation middleware: `validateBody(schema)`, `validateParams(schema)`, `validateQuery(schema)`
- Use middleware for all route validations instead of inline `await c.req.json()` + `schema.parse()`
- Return standardized 400 responses with validation error details
- Example:
  ```typescript
  router.post("/", validateBody(WorkoutCreateSchema), async (c) => {
    const validated = c.req.valid("json"); // Get validated data from context
    // ... handler logic
  });
  ```

---

### Phase 4: Testing & Quality Assurance (Priority: HIGH)

#### 4.1 Expand Test Coverage
**Targets:**
- Increase test coverage from current ~9 tests to >70%
- Focus on critical paths: auth, user operations, AI chat, nutrition logging

**Files to create:**
- `apps/api/src/__tests__/middleware/error-handler.test.ts`
- `apps/api/src/__tests__/middleware/request-id.test.ts`
- `apps/api/src/__tests__/services/nutrition-service.test.ts`
- `apps/api/src/__tests__/services/ai-service.test.ts`
- `apps/api/src/__tests__/integration/workout-flow.test.ts`
- `apps/api/src/__tests__/integration/nutrition-flow.test.ts`

**Implementation:**
- Unit tests for all middleware
- Unit tests for service layer functions
- Integration tests for full API flows (with mocked DB)
- Add E2E tests using `wrangler dev` and real D1 local database
- Use `jest-environment-miniflare` for Cloudflare Workers environment
- Mock external dependencies (OpenAI, Google OAuth, Facebook API)

#### 4.2 API Contract Testing
**Implementation:**
- Use OpenAPI schema to validate responses in tests
- Ensure all routes conform to documented schemas
- Add test that validates `/openapi.json` is valid OpenAPI 3.0 spec
- Use `zod-openapi` to ensure runtime validation matches documentation

---

### Phase 5: Security Hardening (Priority: MEDIUM)

#### 5.1 Enhanced Authentication
**File to update:** `apps/api/src/middleware/auth.ts`

**Implementation:**
- Add refresh token mechanism (currently only JWT with 7-day expiry)
- Implement token revocation list for immediate logout
- Add `aud` and `iss` claims to JWT
- Consider short-lived access tokens (1 hour) + refresh tokens
- Add rate limiting per user ID, not just IP
- Implement account lockout after failed auth attempts

#### 5.2 Input Sanitization
**Implementation:**
- Sanitize all user inputs to prevent XSS (even though API returns JSON, clients might render)
- Validate file upload types and sizes (already partially in place)
- Use `c.req.text()` with size limits to prevent DoS
- Implement query parameter validation to prevent SQL injection (Drizzle protects, but validate types)

#### 5.3 Sensitive Data Protection
**Implementation:**
- Ensure no secrets logged in error messages
- Mask sensitive fields in logs (tokens, passwords, API keys)
- Use environment variables for all secrets (already done)
- Rotate AUTH_SECRET periodically (requires re-auth for all users)

---

### Phase 6: Monitoring & Observability (Priority: MEDIUM)

#### 6.1 Metrics Collection
**Files to create:**
- `apps/api/src/middleware/metrics.ts` - Collect request metrics
- `apps/api/src/services/metrics-service.ts` - Metrics aggregation

**Implementation:**
- Track:
  - Request count by route, method, status code
  - Response times (p50, p95, p99)
  - Error rates
  - Cache hit/miss rates
  - Database query times
  - WASM execution times
- Use Cloudflare Workers Metrics API or push to external monitoring (Datadog, New Relic)
- Expose metrics at `/metrics` in Prometheus format (if allowed in prod)

#### 6.2 Logging Strategy
**Implementation:**
- Use structured JSON logging in production
- Include in every log: timestamp, requestId, userId (if auth), route, method
- Log levels:
  - `error`: Failures with stack traces
  - `warn`: Recoverable issues, deprecations
  - `info`: Request completions, significant events
  - `debug`: Detailed debugging (only in dev)
- Use Cloudflare Logpush to ship logs to external storage/analysis

#### 6.3 Alerting
**Implementation:**
- Define alert thresholds:
  - Error rate > 5% over 5 minutes
  - P95 latency > 1000ms
  - Health check failures
  - Auth failures spike (>10x baseline)
- Integrate with PagerDuty/Opsgenie or simple webhook alerts
- Daily health report email

---

### Phase 7: Deployment & CI/CD (Priority: HIGH)

#### 7.1 Pre-deployment Checks
**Files to update/create:**
- `apps/api/scripts/predeploy.sh` - Run checks before deployment

**Implementation:**
- Type check: `pnpm run type-check`
- Lint: `pnpm run lint`
- Tests: `pnpm run test:coverage` with minimum coverage threshold (e.g., 70%)
- OpenAPI validation: Ensure schema is valid
- Smoke tests: Run critical API calls against staging
- Verify WASM build artifacts exist
- Check environment variables are set in wrangler.toml

#### 7.2 Canary Deployments
**Implementation:**
- Use Cloudflare's gradual rollouts feature
- Deploy to 5% traffic first, monitor errors/latency
- Gradually increase to 100% if healthy
- Immediate rollback if health checks fail
- Add feature flags for risky changes

#### 7.3 Rollback Procedure
**Implementation:**
- Document rollback steps: `git revert <commit>` + `wrangler deploy`
- Keep previous version's assets for quick rollback
- Database migrations must be reversible (use Drizzle's down migrations)
- Add `rollback.sh` script that automates the process

---

## Implementation Timeline

### Week 1: Foundation
- [ ] Day 1-2: Standardized error handling (errors.ts, error-handler.ts)
- [ ] Day 2-3: Request ID & structured logging middleware
- [ ] Day 4: Swagger documentation completion (security schemes, error docs)
- [ ] Day 5: Enhanced health checks

### Week 2: Performance
- [ ] Day 1-2: Caching middleware and service
- [ ] Day 3: Database query optimization review
- [ ] Day 4-5: WASM module fixes or graceful degradation

### Week 3: Code Quality
- [ ] Day 1-3: Refactor large route files (nutrition, ai)
- [ ] Day 4: Type safety improvements
- [ ] Day 5: Validation consistency

### Week 4: Testing
- [ ] Day 1-3: Unit tests for middleware and services
- [ ] Day 4-5: Integration tests for critical flows

### Week 5: Security & Monitoring
- [ ] Day 1-2: Enhanced auth (refresh tokens, rate limiting improvements)
- [ ] Day 3: Metrics collection
- [ ] Day 4: Logging strategy implementation
- [ ] Day 5: Alerting setup

### Week 6: CI/CD & Final
- [ ] Day 1-2: Pre-deployment checks
- [ ] Day 3: Canary deployment setup
- [ ] Day 4: Rollback procedures
- [ ] Day 5: Documentation finalization and handoff

---

## Success Metrics

### Quantitative Targets
- Test coverage: ≥70% (from current ~10%)
- Error rate: <0.1% of requests
- P95 latency: <500ms for simple endpoints, <2000ms for AI endpoints
- Health check uptime: 100%
- OpenAPI documentation: 100% of routes documented
- TypeScript errors: 0

### Qualitative Improvements
- Consistent error responses across all endpoints
- Request ID tracing for all requests
- Structured logging in production
- Clear Swagger documentation with examples
- Comprehensive health monitoring
- Safe deployment process with rollback

---

## Dependencies & Risks

### Dependencies
- AI Service (Gemini API key) - currently optional
- WASM modules (infographic-generator, aivo-compute) - need to resolve init issues
- Cloudflare KV and D1 - core dependencies
- R2 storage - for image uploads

### Risks
1. **WASM Initialization Issues**: If unfixable, remove or replace with JS fallback
2. **Breaking Changes**: Error format change requires client updates - provide migration guide
3. **Performance Impact**: Caching adds complexity - monitor carefully
4. **Deployment Complexity**: Canary deployments require monitoring - ensure alerts work
5. **Test Coverage Gap**: Legacy code hard to test - use integration tests and mocks

---

## Conclusion

This optimization plan transforms the AIVO API from a functional prototype to a production-ready, observable, maintainable service. By following this plan systematically, we'll achieve:

- **Reliability**: Standardized error handling, comprehensive health checks
- **Developer Experience**: Complete Swagger docs, consistent responses
- **Performance**: Strategic caching, query optimization
- **Observability**: Request tracing, metrics, structured logs
- **Quality**: Extensive testing, type safety, code organization

**Recommended Start**: Begin with Phase 1 (Foundation) as it provides immediate benefits and establishes patterns for later phases.
