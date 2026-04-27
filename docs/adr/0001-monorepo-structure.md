# ADR 0001: Monorepo Package Organization

## Status
**Accepted** (Proposed - needs team approval)

## Context

The AIVO project currently has 16 packages in the monorepo with unclear boundaries and overlapping concerns:

- Core: `db`, `shared-types`
- WASM: `aivo-compute`, `optimizer`, `infographic-generator`
- Utilities: `body-compute`, `memory-service`, `api-client`, `email-reporter`, `excel-export`
- Config: `eslint-config`, `jest-config`

Issues identified:
1. `shared-types` is a monolithic 2000+ line file with all types mixed together
2. WASM packages are separate crates but conceptually part of the same compute domain
3. Utility packages like `body-compute` (TypeScript) coexist with WASM packages doing similar calculations
4. Unclear which package owns which domain
5. Package export patterns are inconsistent (some export `dist/`, some `src/`, some `pkg/`)

## Decision

We will reorganize the monorepo into **feature-based domains** with clear ownership:

### 1. Core Domain (`packages/core/`)
- `core/types/` - Shared types organized by bounded context
- `core/db/` - Drizzle schema and migrations (existing `db` package)
- `core/compute/` - Unified compute layer (WASM + TypeScript)

### 2. Infrastructure Domain (`packages/infrastructure/`)
- `infrastructure/api-client/` - HTTP client for all apps
- `infrastructure/email/` - Email service (merge `email-reporter`)
- `infrastructure/storage/` - R2, D1 utilities, file handling
- `infrastructure/cache/` - KV namespace abstractions

### 3. Config Domain (`packages/config/`)
- `config/eslint/`
- `config/jest/`
- `config/typescript/`
- `config/turbo/`

### 4. Apps remain unchanged
- `apps/web/`
- `apps/mobile/`
- `apps/api/`

## Package Migration Strategy

**Phase 1 - Create new structure without breaking:**
```
packages/
├── core/ (new)
│   ├── types/ (create from shared-types)
│   └── compute/ (new - see ADR 0002)
├── infrastructure/ (new)
│   ├── api-client/ (move existing)
│   ├── email/ (create from email-reporter)
│   └── storage/ (new)
└── (old packages remain during transition)
```

**Phase 2 - Update dependencies gradually:**
1. Update `apps/api` to use new `core/types` first
2. Migrate `apps/web` and `apps/mobile` incrementally
3. Remove old packages only when all dependents migrated

**Phase 3 - Delete old packages:**
- `@aivo/shared-types` → replaced by `@aivo/core/types`
- `@aivo/body-compute` → merged into `@aivo/core/compute`
- `@aivo/email-reporter` → merged into `@aivo/infrastructure/email`
- `@aivo/excel-export` → merge into `@aivo/infrastructure/storage` or keep separate

## Consequences

### Positive
- Clear domain boundaries and ownership
- Easier to navigate and find code
- Reduced coupling between unrelated concerns
- Better test organization
- Scalable structure for future growth

### Negative
- Migration effort (estimated 2-3 weeks)
- Temporary duplication during transition
- Need to update all imports across codebase
- Build scripts need adjustment

### Risks
- Breaking existing functionality if migration incomplete
- Team confusion during transition period
- Potential circular dependencies if domain boundaries not clear

## Implementation Notes

1. **Use path aliases** in `tsconfig.base.json`:
```json
{
  "paths": {
    "@aivo/core/types": ["packages/core/types/src"],
    "@aivo/core/compute": ["packages/core/compute/src"],
    "@aivo/infrastructure/*": ["packages/infrastructure/*/src"]
  }
}
```

2. **Maintain backward compatibility** with re-export shims in old packages during transition:
```typescript
// In old @aivo/shared-types/src/index.ts (temporary)
export * from '@aivo/core/types';
```

3. **Update workspace config** (`package.json`):
```json
{
  "workspaces": [
    "apps/*",
    "packages/core/*",
    "packages/infrastructure/*",
    "packages/config/*"
  ]
}
```

4. **Document the migration** in `docs/package-migration.md` with timeline and checklist.

---

## Related Decisions
- ADR 0002: WASM Compute Architecture
- ADR 0003: Shared Types Organization
- ADR 0004: API Route Structure
