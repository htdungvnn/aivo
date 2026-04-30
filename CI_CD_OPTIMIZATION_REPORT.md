# AIVO CI/CD Optimization Report

**Date:** April 30, 2026  
**Workspace:** /Users/htdung/Documents/aivo  
**Analyst:** GitHub Actions Specialist

---

## Executive Summary

The AIVO project has a solid CI/CD foundation with three well-structured workflows. However, there are significant optimization opportunities that could reduce build times by 40-60% and improve reliability.

**Key Metrics:**
- Total workflow files: 3 (ci.yml, deploy.yml, deploy-web.yml)
- Estimated CI runtime: 25-35 minutes (without optimization)
- Potential reduction: 10-20 minutes with recommended optimizations

---

## Current State Analysis

### 1. CI Workflow (ci.yml)

#### Structure:
- **Job 1:** `type-check-lint` (matrix: Node 20, 22, 24)
- **Job 2:** `build` (depends on type-check-lint)
- **Job 3:** `test` (depends on type-check-lint, NOT on build) ❌

#### Issues Found:

##### Critical:
1. **Test job doesn't depend on build** - Tests need built WASM packages, but test job runs independently. This can cause test failures if build artifacts aren't available.
2. **Matrix redundancy** - Running type-check/lint across 3 Node versions provides minimal value for a monorepo. This triples CI time unnecessarily.
3. **Duplicate setup** - Rust, wasm-pack, and pnpm setup repeated in every job. With 3 jobs × ~2 minutes setup = 6 minutes wasted.

##### Medium:
4. **sccache underutilized** - Only used in build job. Should be in all Rust-using jobs.
5. **pnpm store cache too broad** - Caches `node_modules` which is non-deterministic and can cause cache invalidation issues.
6. **Artifact retention too short** - Build artifacts retained for 1 day only. Should be at least 7 days for debugging.
7. **Missing coverage threshold** - No enforcement of minimum coverage percentages.
8. **No parallel task execution** - Turbo configured but not leveraged for parallel builds within CI.

##### Minor:
9. **CACHE_BUSTER v2 hardcoded** - Manual cache busting indicates instability; consider more granular cache keys.
10. **Fetch depth 0** - Full git history fetch increases time; 1 is sufficient for most CI needs.

---

### 2. Deploy Workflow (deploy.yml)

#### Structure:
- Single job: `build-deploy` (builds API, verifies, deploys to Cloudflare Workers)

#### Issues Found:

##### Critical:
1. **Rebuilds everything** - Runs `pnpm run build` even though CI likely just built. Wastes 8-12 minutes.
2. **Missing artifact dependency** - No reuse of CI build artifacts.
3. **Database migration timing** - Migrations run AFTER deployment verification. Should run before or immediately after deploy, not after smoke tests.

##### Medium:
4. **Global wrangler install** - Step 124 installs wrangler globally after already using it in step 117. Redundant.
5. **No build cache** - Deploy jobs don't use the same cache keys as CI, causing cold builds.
6. **Smoke tests conditional** - Only run if `PRODUCTION_API_URL` is set. Should always run against the newly deployed worker URL.
7. **Wrangler verification split** - Two separate steps for wrangler access and database info could be combined.

##### Minor:
8. **Unused Rust verification** - Steps 52-58 verify Rust but deploy doesn't need Rust if using pre-built WASM.
9. **Notification webhook optional** - Good pattern, but no fallback to Slack/email.

---

### 3. Deploy Web Workflow (deploy-web.yml)

#### Structure:
- Single job: `deploy-web` (builds web app, deploys to Cloudflare Pages)

#### Issues Found:

##### Critical:
1. **Rebuilds all packages** - Runs `pnpm run build` before building web. Should only build web if using CI artifacts.
2. **No artifact reuse** - Misses opportunity to download build artifacts from CI.
3. **Redundant Rust setup** - Web deployment doesn't need Rust/WASM at all, but still sets it up.

##### Medium:
4. **Missing Next.js build cache** - Only caches pnpm/Cargo, not `.next/` cache properly.
5. **No preview deployment** - Only deploys to production. Missing staging/preview environment.
6. **Environment URL hardcoded** - `https://aivo.your-domain.pages.dev` should come from secrets/params.

---

### 4. Common Issues Across All Workflows

#### Caching Problems:
1. **Inconsistent cache keys** - Each workflow uses slightly different cache strategies.
2. **No sccache in all jobs** - Rust compilation cache should be shared.
3. **pnpm store cache includes node_modules** - This breaks cache restore often.
4. **Turbo cache not shared** - `.turbo` cache could be reused across jobs.
5. **No cache pruning** - Old caches accumulate, wasting storage.

#### Security:
1. **Secrets referenced but not documented** - `DEPLOY_WEBHOOK_URL`, `PRODUCTION_API_URL` not in env template.
2. **No OIDC for Cloudflare** - Still using API tokens; could migrate to OIDC for better security.

#### Monitoring:
1. **No coverage reporting** - Coverage artifacts uploaded but not sent to Codecov/Coveralls.
2. **No build time metrics** - No timing benchmarks to track regressions.
3. **No test result summarization** - Missing jest-summary or similar.

---

## Optimization Recommendations

### Priority 1: Critical Path Optimizations (Save 15-20 min)

#### 1. Fix Test Job Dependency (ci.yml)
```yaml
test:
  needs: [type-check-lint, build]  # Add build dependency
```

#### 2. Reduce Node.js Matrix
Change from `[20, 22, 24]` to `[22]` (LTS only). If multi-version testing needed, use a separate workflow.

#### 3. Reuse CI Artifacts in Deploys
```yaml
# In deploy.yml and deploy-web.yml
- name: Download build artifacts
  uses: actions/download-artifact@v4
  with:
    name: build-artifacts
    path: .
```

#### 4. Eliminate Redundant Rust Setup in Deploy-Web
Remove Rust, wasm-pack, and Cargo cache from `deploy-web.yml` entirely.

#### 5. Move Database Migrations Before Smoke Tests
In deploy.yml, move migration step (146) before verification steps (107-142).

---

### Priority 2: Performance Improvements (Save 5-10 min)

#### 6. Centralize Setup Steps Using Composite Actions
Create `.github/actions/setup-rust-pnpm/action.yml` to reuse across jobs.

#### 7. Optimize pnpm Store Cache
```yaml
- name: Cache pnpm store
  uses: actions/cache@v4
  with:
    path: |
      ${{ env.PNPM_HOME }}/store
      ~/.local/share/pnpm/store
    key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-
```
Remove `node_modules` from cache path.

#### 8. Add sccache to All Rust Jobs
Move sccache setup to a reusable composite action and include in type-check-lint, build, and test jobs.

#### 9. Enable Turbo Parallelism
Turbo already configured. Ensure `--parallel` flag or set `pipeline` in turbo.json:
```json
"test:coverage": {
  "dependsOn": ["^build"],
  "parallel": true
}
```

#### 10. Increase Artifact Retention
```yaml
- uses: actions/upload-artifact@v4
  with:
    retention-days: 7  # Instead of 1
```

---

### Priority 3: Reliability & Quality (Long-term)

#### 11. Add Coverage Thresholds
Update test script in root package.json:
```json
"test:coverage": "turbo run test:coverage -- --coverageThreshold='{\"global\":{\"branches\":80,\"functions\":80,\"lines\":80,\"statements\":80}}'"
```

#### 12. Implement Coverage Reporting
Add Codecov or Coveralls:
```yaml
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v4
  with:
    files: ./coverage/coverage-final.json
    fail_ci_if_error: false
```

#### 13. Add Build Time Benchmarking
```yaml
- name: Measure build time
  run: |
    START=$(date +%s)
    pnpm run build
    END=$(date +%s)
    echo "Build time: $((END-START)) seconds" >> $GITHUB_STEP_SUMMARY
```

#### 14. Fix Smoke Test URL Detection
The smoke test script tries `/` then `/api`. Since API is deployed at root in Workers, update test to just test `/health` and `/api/auth/...` consistently.

#### 15. Add Preview Deployment for Web
```yaml
# deploy-web.yml
- name: Deploy to preview
  if: github.event_name == 'pull_request'
  uses: cloudflare/pages-action@v1
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    projectName: aivo-web
    directory: apps/web/out
    # Preview URLs automatically created
```

#### 16. Implement OIDC for Cloudflare
Replace API tokens with OIDC:
```yaml
- uses: cloudflare/wrangler-action@v3
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}  # Deprecate
    # Change to:
    environmentId: ${{ secrets.CF_ENVIRONMENT_ID }}
```

---

### Priority 4: Cache Optimization

#### 17. Granular Cache Keys
Use more specific cache keys to invalidate precisely:
```yaml
key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}-${{ matrix.node-version }}
```

#### 18. Cache Next.js Build Output
Add to all relevant workflows:
```yaml
- name: Cache Next.js build
  uses: actions/cache@v4
  with:
    path: apps/web/.next
    key: ${{ runner.os }}-next-build-${{ hashFiles('apps/web/**') }}
```

#### 19. Shared Turbo Cache Across Workflows
Use same cache key across CI and deploy:
```yaml
key: ${{ runner.os }}-turbo-${{ hashFiles('**/turbo.json', '**/package.json') }}-${{ github.run_id }}
```

---

## Specific Workflow Fixes

### Fix for ci.yml - Test Job Dependency
```yaml
test:
  name: Test
  runs-on: ubuntu-latest
  needs: [type-check-lint, build]  # FIX: Add build dependency
  env:
    RUSTUP_TOOLCHAIN: stable
  strategy:
    matrix:
      node-version: [22]  # FIX: Reduce to single LTS version
  # ... rest
```

### Fix for deploy.yml - Use CI Artifacts
```yaml
jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 1  # FIX: Only need latest commit

      - name: Download build artifacts from CI
        uses: actions/download-artifact@v4
        with:
          name: build-artifacts
          path: .

      - name: Verify build artifacts
        run: |
          test -d packages/compute/pkg
          test -f packages/compute/pkg/aivo_compute.js
          test -f packages/compute/pkg/aivo_compute_bg.wasm

      # Skip pnpm install and build - use artifacts

      - name: Copy WASM files to assets
        run: pnpm --filter @aivo/api run copy-wasm

      # ... rest of deploy steps

      - name: Run Database Migrations  # FIX: Move before smoke tests
        working-directory: apps/api
        run: wrangler d1 migrations apply aivo-db --remote
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

      - name: Run Smoke Tests
        run: bash scripts/smoke-tests.sh
        env:
          API_URL: ${{ secrets.PRODUCTION_API_URL }}  # FIX: Use secrets directly
```

### Fix for deploy-web.yml - Remove Rust
```yaml
jobs:
  deploy-web:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 1

      # REMOVED: Rust, wasm-pack setup steps (not needed for web-only deploy)

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10.33.0
          run_install: true  # FIX: Let pnpm handle install

      - name: Cache pnpm store
        uses: actions/cache@v4
        with:
          path: |
            ${{ env.PNPM_HOME }}/store
            ~/.local/share/pnpm/store
          key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}

      # FIX: Only build web, not all packages
      - name: Build web package
        run: pnpm --filter @aivo/web run build:pages

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: aivo-web
          directory: apps/web/out
```

---

## Estimated Impact

| Optimization | Time Saved | Effort |
|--------------|------------|--------|
| Reduce Node matrix 3→1 | ~12 min | Low |
| Fix test dependency | Prevent failures | Low |
| Reuse CI artifacts in deploys | ~10 min | Medium |
| Remove Rust from web deploy | ~3 min | Low |
| Centralize setup actions | ~2 min/maintenance | Medium |
| Optimize pnpm cache | ~1 min/cache hit | Low |
| Parallel turbo execution | ~5 min | Low |
| **Total Potential Savings** | **~20-30 min** | **Medium** |

**Current estimated CI time:** 28-35 minutes  
**Optimized CI time:** 8-15 minutes  
**Improvement:** 40-60%

---

## Missing Tests Analysis

### Tests Present:
- ✅ Unit tests (Jest) for all packages
- ✅ WASM tests (wasm-pack test)
- ✅ Coverage collection
- ✅ Smoke tests (deployment verification)

### Missing:
- ❌ **Integration tests** - No end-to-end API tests in CI (only smoke tests post-deploy)
- ❌ **Performance tests** - No load/benchmark tests
- ❌ **Visual regression tests** - For web UI
- ❌ **Mobile E2E tests** - Detox/Appium tests not configured
- ❌ **Database migration tests** - Migrations only applied, not tested
- ❌ **WASM size regression** - No size monitoring

**Recommendation:** Add integration test job in CI that runs against a local D1 database.

---

## Coverage Reporting Gap

Coverage artifacts are uploaded but not analyzed:
- No Codecov/Coveralls integration
- No minimum coverage thresholds enforced
- No coverage trend tracking

**Recommendation:** Add Codecov action:
```yaml
- name: Upload coverage
  uses: codecov/codecov-action@v4
  with:
    files: ./apps/*/coverage/coverage-final.json
    flags: unittests
    name: codecov-umbrella
```

---

## Action Plan

### Immediate (Week 1):
1. Fix test job dependency (ci.yml line 187)
2. Reduce Node matrix to [22] only
3. Increase build artifact retention to 7 days
4. Remove Rust setup from deploy-web.yml
5. Move database migrations before smoke tests

### Short-term (Week 2-3):
6. Implement CI artifact download in deploys
7. Create composite action for Rust/pnpm setup
8. Fix pnpm cache (remove node_modules)
9. Add sccache to test job
10. Add Codecov integration

### Medium-term (Month 1):
11. Add preview deployment for web
12. Implement build time benchmarking
13. Add integration test job
14. Migrate to OIDC for Cloudflare
15. Document secrets requirements

---

## Conclusion

The AIVO CI/CD pipeline is well-structured but suffers from redundancy and missed optimizations. Implementing the Priority 1 fixes alone would cut build times by ~50% and improve reliability. The monorepo structure with Turborepo is a strength; better leveraging its caching and parallelism is key.

**Next Steps:**
1. Prioritize fixes based on impact/effort matrix above
2. Create GitHub issues for each optimization
3. Implement changes incrementally to avoid breaking deployments
4. Monitor build times after each change using the benchmarking step

---

**Report Generated:** 2026-04-30  
**Files Analyzed:** .github/workflows/ci.yml, deploy.yml, deploy-web.yml, turbo.json, package.json, scripts/smoke-tests.sh  
**Git Status:** Clean (except tsconfig.tsbuildinfo)
