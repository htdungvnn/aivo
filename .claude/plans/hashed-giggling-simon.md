# Docs Consolidation Plan

## Context

The AIVO project has 15 documentation files in the `docs/` folder with significant overlap and redundancy:

- **Deployment docs**: `DEPLOYMENT.md`, `PRODUCTION_DEPLOYMENT.md`, `CLOUDFLARE_PAGES_DEPLOYMENT.md` have substantial duplicate content
- **Frontend docs**: `FEATURES.md` and `FRONTEND.md` both cover frontend features
- **Testing docs**: `MOCK_DATA.md` could be merged into `TESTING.md`

This creates maintenance burden - changes need to be duplicated across multiple files, and users must consult multiple docs for complete information.

## Problem Statement

Reduce documentation complexity by consolidating overlapping files while preserving all unique information in a clear, navigable structure.

## Current Documentation Structure

```
docs/
├── API.md                    ✓ Keep (API reference)
├── ARCHITECTURE.md           ✓ Keep (system architecture)
├── CLOUDFLARE_PAGES_DEPLOYMENT.md  ✗ MERGE into DEPLOYMENT.md
├── COMPUTE.md                ✓ Keep (WASM reference)
├── DATABASE.md               ✓ Keep (DB schema reference)
├── DEPLOYMENT.md             ✓ ENHANCE (merge other deployment docs)
├── FEATURES.md               ✗ MERGE into FRONTEND.md (frontend parts), delete rest
├── FRONTEND.md               ✓ ENHANCE (add frontend features from FEATURES.md)
├── MEMORY_SERVICE.md         ✓ Keep (memory service reference)
├── MOCK_DATA.md              ✗ MERGE into TESTING.md
├── PRODUCTION_DEPLOYMENT.md  ✗ MERGE into DEPLOYMENT.md
├── QUICKSTART.md             ✓ Keep (getting started)
├── README.md                 ✓ Keep (main index)
├── TESTING.md                ✓ ENHANCE (add mock data section)
└── TROUBLESHOOTING.md        ✓ Keep (reference)
```

## Proposed Final Structure

```
docs/
├── README.md                 # Main index with quick links
├── QUICKSTART.md             # Get up and running in 15 min
├── ARCHITECTURE.md           # System design & components
├── API.md                    # Complete API reference
├── DATABASE.md               # Database schema & migrations
├── COMPUTE.md                # WASM compute engine
├── MEMORY_SERVICE.md         # Semantic memory system
├── DEPLOYMENT.md             # All deployment info (consolidated)
├── FRONTEND.md               # Web + Mobile apps (enhanced)
├── TESTING.md                # Testing guide (with mock data)
└── TROUBLESHOOTING.md        # Common issues & solutions
```

## Detailed Consolidation Plan

### 1. DEPLOYMENT.md (Enhanced)

**Merge from:**
- `DEPLOYMENT.md` (current)
- `PRODUCTION_DEPLOYMENT.md`
- `CLOUDFLARE_PAGES_DEPLOYMENT.md`

**New structure:**
```
# Deployment Guide

## Overview
- Quick summary of deployment options
- Environment targets (dev, staging, production)

## Prerequisites
- Tools (Node, pnpm, Rust, Wrangler)
- Cloudflare account setup
- OAuth apps configured

## Environment Setup
- Centralized .env configuration
- Environment variable distribution

## Database Setup
- Local D1 setup
- Migration application (local & remote)

## Build Process
- Build all packages (pnpm run build)
- Individual package builds
- WASM build details

## Deployment Options

### API (Cloudflare Workers)
- Automated deploy (./scripts/deploy.sh)
- Manual deploy steps
- Setting secrets (wrangler secret put)
- Verification checklist

### Web Application
#### Vercel (Recommended)
- Configuration
- Environment variables
- Deployment steps

#### Cloudflare Pages
- Configuration files (_routes, pages.config.toml)
- Build settings
- Custom domain setup
- API integration (proxy)
- R2 bucket setup
- Performance optimization

### Mobile (Expo)
- EAS Build configuration
- App store submission
- OAuth deep linking

## Post-Deployment
- Health checks
- Verification checklist
- Monitoring setup

## Rollback Procedures
- API rollback
- Web rollback
- Database rollback

## CI/CD Integration
- GitHub Actions examples
- Deployment workflows

## Troubleshooting
- Common deployment issues
- Debug commands

## Checklists
- Pre-deployment checklist
- Build phase checklist
- Deployment phase checklist
- Post-deployment checklist
```

**Key:** Preserve all unique info from all 3 files, organize logically, eliminate duplicates.

### 2. FRONTEND.md (Enhanced)

**Merge from:**
- `FEATURES.md` frontend sections only (Web Application, Mobile Application, Packages & Libraries frontend-related)

**Discard from FEATURES.md:**
- API Endpoints (already in API.md)
- Database Features (already in DATABASE.md)
- Core AI & Compute (already in COMPUTE.md, MEMORY_SERVICE.md)
- Infrastructure (already in ARCHITECTURE.md)
- Feature Status table (redundant)

**New structure:**
```
# Frontend Applications

## Quick Comparison
Table comparing Web vs Mobile

## Web Application (apps/web)
- Architecture (folder structure)
- Key Features (detailed)
- Setup & development
- Environment variables
- Build commands
- UI Components list

## Mobile Application (apps/mobile)
- Architecture (Expo Router structure)
- Key Features (detailed)
- Setup & development
- Environment variables
- Build commands (dev & EAS)
- Native features

## Shared Components
- Design system (colors, typography, spacing)
- Common UI components
- API client patterns

## Authentication Flow
- Web: Google OAuth flow
- Mobile: Google + Facebook OAuth flow

## State Management
- Web: Context + SWR
- Mobile: React Query + Zustand

## Responsive Design
- Web: Tailwind breakpoints
- Mobile: Native responsive

## Testing
- Jest unit tests
- E2E options (Cypress/Detox)

## Debugging
- DevTools setup
- Log inspection

## Performance Tips
- Optimization strategies

## Known Issues
- Platform-specific limitations

## Future Enhancements
- PWA, widgets, HealthKit integration
```

### 3. TESTING.md (Enhanced)

**Merge from:**
- `TESTING.md` (current)
- `MOCK_DATA.md`

**New structure:**
```
# Testing Guide

## Overview
Testing matrix (unit/integration/e2e per package)

## Running Tests
- All packages: pnpm run test
- Package-specific commands
- Type checking
- Linting

## Memory Service Tests
- 48 unit tests breakdown
- Test locations
- Running commands

## API Tests
- Location (apps/api/src/routes/__tests__/)
- Hono test utils
- Running

## Compute Tests
- Rust tests in lib.rs
- Running (cargo test, pnpm test)

## Database Migration Testing
- Test migration application
- Seeding test data

## Integration Tests
- Setup test environment
- Memory service integration example
- ./scripts/test-integration.sh

## E2E Tests (Optional)
- Web: Cypress
- Mobile: Detox

## Code Coverage
- Generate reports
- Coverage targets per package

## Mock Data for Testing
**[MERGED FROM MOCK_DATA.md]**
- Overview of admin test user
- Quick setup (pnpm run seed:mock)
- Admin API endpoints (development only)
- Sample data characteristics
- Testing scenarios
- Resetting data
- Extending mock data

## Debugging Tests
- Jest debugging
- Rust/WASM debugging
- Test data management

## Best Practices
- Mock external APIs
- Use factories
- Clean up after tests
- Test edge cases

## Known Testing Limitations
- Cannot test actual OpenAI in CI
- WASM performance testing needs
- Mobile E2E requires device
- Cloudflare Workers in CI (slow)

## CI/CD Pipeline
- GitHub Actions workflows
- test.yml
- e2e.yml
```

### 4. Files to DELETE

After merging content:
- `PRODUCTION_DEPLOYMENT.md` → delete (merged into DEPLOYMENT.md)
- `CLOUDFLARE_PAGES_DEPLOYMENT.md` → delete (merged into DEPLOYMENT.md)
- `FEATURES.md` → delete (relevant parts merged into FRONTEND.md)
- `MOCK_DATA.md` → delete (merged into TESTING.md)

### 5. Update Cross-References

After consolidation, update all internal doc links:

**In README.md:**
- Point to new consolidated DEPLOYMENT.md
- Remove references to deleted files

**Check for any other cross-references** in other docs that point to the deleted files.

## Implementation Steps

1. **Backup**: No git changes yet, but be prepared to review diffs

2. **Create consolidated DEPLOYMENT.md:**
   - Start with current DEPLOYMENT.md as base
   - Add Cloudflare Pages section from CLOUDFLARE_PAGES_DEPLOYMENT.md
   - Add production-specific content from PRODUCTION_DEPLOYMENT.md
   - Reorganize to logical flow
   - Remove duplicates within the merged content

3. **Create enhanced FRONTEND.md:**
   - Start with current FRONTEND.md as base
   - Add relevant frontend sections from FEATURES.md
   - Remove any duplicates
   - Ensure consistent structure

4. **Create enhanced TESTING.md:**
   - Start with current TESTING.md as base
   - Add MOCK_DATA.md content as a new section
   - Integrate smoothly

5. **Update README.md:**
   - Remove references to deleted files
   - Update links to point to consolidated docs
   - Verify table of contents is accurate

6. **Check cross-references in all remaining docs:**
   - Search for links to deleted files
   - Update to point to new consolidated locations

7. **Delete old files:**
   - `PRODUCTION_DEPLOYMENT.md`
   - `CLOUDFLARE_PAGES_DEPLOYMENT.md`
   - `FEATURES.md`
   - `MOCK_DATA.md`

8. **Verify:**
   - All unique information preserved
   - No broken internal links
   - Documentation is navigable
   - Consistent formatting

## Verification

After implementation:
1. Check that README.md links are valid
2. Verify DEPLOYMENT.md covers all 3 original deployment scenarios
3. Verify FRONTEND.md covers both web and mobile comprehensively
4. Verify TESTING.md includes mock data documentation
5. No broken internal links (search for `[`.md`]` patterns)
6. Read through each file to ensure coherent flow

## Trade-offs Considered

**Alternative: Keep separate deployment docs with distinct audiences**
- Rejected: Creates confusion about which doc to read
- Duplication increases maintenance burden
- Users miss information if they pick wrong doc

**Alternative: Single mega-doc combining everything**
- Rejected: Too long, harder to navigate
- Current approach keeps focused docs while eliminating duplicates

## Risk Mitigation

- All original files remain in git history (easy to recover)
- I will preserve every unique piece of information
- Cross-references will be systematically updated
- Can undo changes if needed
