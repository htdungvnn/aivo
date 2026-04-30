# Documentation Migration Guide

**From**: 51 fragmented documentation files  
**To**: 5 consolidated core documentation files

---

## Overview

The AIVO documentation has been consolidated from 51+ individual files into 5 core files to improve discoverability, reduce redundancy, and provide a single source of truth for each major component.

### Before vs After

| Old Structure | New Structure |
|---------------|---------------|
| Scattered across `/docs` with overlapping content | 5 focused files: `WEB.md`, `APP.md`, `API.md`, `DB.md`, `COMPUTE.md` |
| Multiple design system files | Consolidated in `WEB.md` and `APP.md` |
| Separate database schemas | Unified in `DB.md` |
| Dispersed API docs | Centralized in `API.md` |
| Fragmented deployment guides | Integrated into component-specific docs |

---

## New Core Files

### 1. WEB.md (Next.js Web App)
**Purpose**: Everything about the web frontend

**Contents**:
- Quick start guide
- Architecture (Next.js 15, App Router)
- Components & pages
- API integration
- Authentication (OAuth)
- Design system (Tailwind tokens, component specs)
- Deployment (Cloudflare Pages)
- Environment variables
- Performance optimization
- Testing strategies
- Troubleshooting

**Replaces**:
- `FRONTEND.md`
- `DESIGN_SYSTEM.md` (web parts)
- `CLOUDFLARE_PAGES_DEPLOYMENT.md`
- Web sections of `README.md`, `QUICKSTART.md`, `ARCHITECTURE.md`, `TROUBLESHOOTING.md`

---

### 2. APP.md (React Native Mobile)
**Purpose**: Complete mobile app documentation

**Contents**:
- Quick start guide
- Architecture (Expo, NativeWind)
- Navigation (Expo Router)
- Authentication (OAuth with PKCE requirements)
- Components (NativeWind implementation)
- API integration
- Push notifications
- Deployment (EAS Build)
- Environment variables
- Performance tips
- Testing (Jest, Detox)
- Troubleshooting

**Replaces**:
- `MOBILE_DEVELOPMENT.md`
- `DESIGN_SYSTEM.md` (mobile parts)
- Mobile sections of `README.md`, `QUICKSTART.md`, `ARCHITECTURE.md`, `TROUBLESHOOTING.md`

---

### 3. API.md (Hono + Cloudflare Workers)
**Purpose**: Backend API complete reference

**Contents**:
- Quick start
- Architecture (Hono, Workers, D1, Drizzle)
- Authentication & OAuth security
- API reference (all endpoints)
  - AI services (chat, voice, memory)
  - Workout APIs
  - Nutrition APIs
  - Gamification APIs
  - Social features (planned)
  - Body metrics APIs
- Error handling & rate limiting
- Deployment (Wrangler, scripts)
- Testing (unit, integration, load)
- Monitoring & health checks
- Troubleshooting

**Replaces**:
- `MEMORY_SERVICE.md`
- `SOCIAL_FEATURES_API.md`
- `API_CONTRACTS.md`
- API sections of `README.md`, `QUICKSTART.md`, `ARCHITECTURE.md`, `TROUBLESHOOT.md`

---

### 4. DB.md (Database - D1 + Drizzle)
**Purpose**: Database schema, migrations, and queries

**Contents**:
- Quick start
- Architecture (D1, Drizzle, migrations)
- Complete schema documentation
  - 14 core tables (users, sessions, conversations, workouts, etc.)
  - 12 social feature tables (planned)
- Migration workflow
- Drizzle ORM usage examples
- Performance optimizations
- Backup & recovery
- Testing (mock data)
- Troubleshooting

**Replaces**:
- `DATABASE.md`
- `DATABASE_SCHEMAS.md`
- `SOCIAL_FEATURES_DB_SCHEMA.md`
- DB sections of `README.md`, `QUICKSTART.md`, `ARCHITECTURE.md`, `ENVIRONMENT_SETUP.md`

---

### 5. COMPUTE.md (WASM Compute)
**Purpose**: Rust/WASM performance module

**Contents**:
- Quick start (prerequisites, build)
- Architecture (why WASM, modules)
- Module reference:
  - AdaptivePlanner
  - CorrelationAnalyzer
  - TokenOptimizer
  - ImageProcessor
- Error handling
- Performance benchmarks
- Testing (unit, integration)
- Development workflow
- Deployment integration
- Limitations & future enhancements
- Troubleshooting

**Replaces**:
- `COMPUTE.md` (expanded)
- `WASM_DEVELOPMENT.md`
- Compute sections of `README.md`, `QUICKSTART.md`, `ARCHITECTURE.md`

---

## File Mapping Table

### General Documentation (Distributed)

| Old File | New Location | Notes |
|----------|--------------|-------|
| `README.md` | **WEB.md**, **APP.md**, **API.md**, **DB.md**, **COMPUTE.md** | Central navigation removed; info redistributed |
| `QUICKSTART.md` | **All 5 files** (Quick Start sections) | Step-by-step per component |
| `ARCHITECTURE.md` | **All 5 files** (Architecture sections) | Component-specific architecture |
| `DEPLOYMENT.md` | **WEB.md**, **APP.md**, **API.md** | Deployment integrated per platform |
| `CI_CD.md` | **API.md** (Deployment) | CI info in API deployment |
| `CONTRIBUTING.md` | **No direct replacement** | Keep separately if contributing guidelines needed |
| `ENV_VARIABLES_REFERENCE.md` | **All 5 files** (Env Variables sections) | Split by component |
| `TROUBLESHOOTING.md` | **All 5 files** (Troubleshooting sections) | Component-specific issues |
| `ENVIRONMENT_SETUP.md` | **All 5 files** (Setup sections) | Setup integrated |
| `TESTING.md` | **All 5 files** (Testing sections) | Testing strategies per component |
| `FEATURES.md` | **No direct replacement** | Product specs, keep if needed |
| `USER_GUIDES.md` | **No direct replacement** | End-user docs, keep separately |
| `INCIDENT_RESPONSE_PLAYBOOK.md` | **No direct replacement** | Security/ops docs, keep separately |
| `ARCHITECTURE_REVIEW_2026Q2.md` | **Archive** | Historical, superseded by current docs |

---

### Web-Specific Files

| Old File | New Location | Action |
|----------|--------------|--------|
| `FRONTEND.md` | **WEB.md** | Fully merged |
| `DESIGN_SYSTEM.md` | **WEB.md** & **APP.md** | Split: web tokens → WEB.md, mobile tokens → APP.md |
| `CLOUDFLARE_PAGES_DEPLOYMENT.md` | **WEB.md** | Merged into WEB.md Deployment section |

---

### Mobile-Specific Files

| Old File | New Location | Action |
|----------|--------------|--------|
| `MOBILE_DEVELOPMENT.md` | **APP.md** | Fully merged |
| `DESIGN_SYSTEM.md` (mobile parts) | **APP.md** | NativeWind specs moved |

---

### API-Specific Files

| Old File | New Location | Action |
|----------|--------------|--------|
| `MEMORY_SERVICE.md` | **API.md** | Merged into AI Services section |
| `SOCIAL_FEATURES_API.md` | **API.md** | Social APIs integrated |
| `API_CONTRACTS.md` | **API.md** | API design patterns incorporated |
| `OAUTH_SECURITY_REVIEW.md` | **API.md** & **APP.md** | Security findings referenced in Auth sections |

---

### Database Files

| Old File | New Location | Action |
|----------|--------------|--------|
| `DATABASE.md` | **DB.md** | Merged, expanded with full schemas |
| `DATABASE_SCHEMAS.md` | **DB.md** | All 14 core tables documented |
| `SOCIAL_FEATURES_DB_SCHEMA.md` | **DB.md** | 12 social tables added (planned) |

---

### Compute Files

| Old File | New Location | Action |
|----------|--------------|--------|
| `COMPUTE.md` | **COMPUTE.md** | Expanded with full module docs |
| `WASM_DEVELOPMENT.md` | **COMPUTE.md** | Development guide integrated |

---

### ADRs (Architecture Decision Records)

| Old File | New Location | Action |
|----------|--------------|--------|
| `adr/` directory | **No change** | Keep ADRs separate (decision history) |
| `adr/README.md` | `adr/README.md` | Unchanged |
| `adr/0001-0005/` | `adr/0001-0005/` | Keep as-is |
| `adr/001-008/` | `adr/001-008/` | Keep as-is |

**Note**: ADRs remain in `/docs/adr/` - they are decision records, not user guides.

---

### Design System Files

| Old File | New Location | Action |
|----------|--------------|--------|
| `design-system/index.md` | **WEB.md** & **APP.md** | Design tokens duplicated in both |
| `design-system/accessibility-guidelines.md` | **WEB.md** & **APP.md** | Accessibility requirements in both |
| `design-system/figma-specs.md` | **Keep separate** | Design specs, keep in `design-system/` |
| `design-system/QUICK_REFERENCE.md` | **Keep separate** | Quick ref for designers |
| `design-system/social-gamification-specs.md` | **Keep separate** | UI specs for social features |
| `design-system/push-notifications-specs.md` | **APP.md** | Push specs integrated |

---

## Removed Files (Redundant/Outdated)

These files were **deleted** after consolidation:

- `README.md` - Replaced by component-specific docs
- `QUICKSTART.md` - Distributed to component Quick Start sections
- `ARCHITECTURE.md` - Distributed, no longer needed as standalone
- `DEPLOYMENT.md` - Integrated into each component's Deployment section
- `CI_CD.md` - Moved to API.md
- `ENV_VARIABLES_REFERENCE.md` - Split across components
- `TROUBLESHOOTING.md` - Component-specific troubleshooting added
- `ENVIRONMENT_SETUP.md` - Setup integrated
- `TESTING.md` - Testing sections added to components
- `DATABASE.md` - Merged into DB.md (enhanced)
- `DATABASE_SCHEMAS.md` - Merged into DB.md
- `SOCIAL_FEATURES_DB_SCHEMA.md` - Merged into DB.md
- `FRONTEND.md` - Merged into WEB.md
- `MOBILE_DEVELOPMENT.md` - Merged into APP.md
- `MEMORY_SERVICE.md` - Merged into API.md
- `SOCIAL_FEATURES_API.md` - Merged into API.md
- `API_CONTRACTS.md` - Merged into API.md
- `COMPUTE.md` - Merged into COMPUTE.md (expanded)
- `WASM_DEVELOPMENT.md` - Merged into COMPUTE.md
- `OAUTH_SECURITY_REVIEW.md` - Referenced in API.md/APP.md, keep separate as security reference (not deleted but not part of core 5)

**Keep but not in core 5**:
- `INCIDENT_RESPONSE_PLAYBOOK.md` (security/ops)
- `FEATURES.md` (product specs)
- `USER_GUIDES.md` (end-user documentation)
- `OAUTH_SECURITY_REVIEW.md` (security audit)
- All `design-system/*` except what's integrated
- All `adr/*` (architecture decisions)
- `CONTRIBUTING.md` (if you maintain contribution guidelines)

---

## How to Find Information

### I need to...

| Task | Document |
|------|----------|
| Set up the web app locally | **WEB.md** - Quick Start |
| Set up the mobile app locally | **APP.md** - Quick Start |
| Run the API locally | **API.md** - Quick Start |
| Understand the database schema | **DB.md** - Schema section |
| Work on WASM compute module | **COMPUTE.md** - Quick Start |
| Deploy the web app | **WEB.md** - Deployment |
| Deploy the mobile app | **APP.md** - Deployment |
| Deploy the API | **API.md** - Deployment |
| Call an API endpoint | **API.md** - API Reference |
| Understand OAuth flow | **API.md** - Authentication **or** **APP.md** - Authentication |
| Fix a database issue | **DB.md** - Troubleshooting |
| Optimize performance | Each component's Performance section |
| Add a new API endpoint | **API.md** - Development Workflow |
| Add a new database table | **DB.md** - Migrations |
| Write tests | Each component's Testing section |
| Understand design tokens | **WEB.md** / **APP.md** - Design System |
| Use the WASM module | **COMPUTE.md** - Usage |

---

## Cross-References

### Between Core Files

- **Design System**: Referenced in both `WEB.md` (Tailwind) and `APP.md` (NativeWind)
- **OAuth Security**: Findings in `API.md` Auth section and `APP.md` Auth section; full details in `OAUTH_SECURITY_REVIEW.md`
- **Environment Variables**: Component-specific vars in each file; cross-component reference in `ENV_VARIABLES_REFERENCE.md` (kept separate for master list)
- **API Contracts**: All endpoints documented in `API.md`; client usage in `WEB.md` and `APP.md`

### Outside Core 5

These remain in `/docs/` but are **not part of the core 5**:

- `INCIDENT_RESPONSE_PLAYBOOK.md` - Operations/Security
- `FEATURES.md` - Product management
- `USER_GUIDES.md` - End-user documentation
- `OAUTH_SECURITY_REVIEW.md` - Security audit (reference)
- `CONTRIBUTING.md` - Contribution guidelines (if kept)
- `design-system/` - Designer/developer reference
- `adr/` - Architecture decision records
- `AGGRESSIVE_COST_CUTTING_PLAN.md` - Business/finance (may be outdated)
- `COST_OPTIMIZATION_*.md` - Finance docs

---

## Migration Checklist

For developers transitioning to the new structure:

- [ ] Bookmark `WEB.md`, `APP.md`, `API.md`, `DB.md`, `COMPUTE.md`
- [ ] Update internal links in your tools/IDE to point to new files
- [ ] Search your codebase for references to old docs (e.g., `See FRONTEND.md`) and update
- [ ] If using documentation generators (TypeDoc, etc.), update config to include new files
- [ ] Delete old files from your local clones (they are now redundant)
- [ ] Update any README links in repositories to point to new docs
- [ ] Notify team of documentation changes
- [ ] Update documentation contribution guidelines to reference new structure

---

## FAQ

### Q: Where is the complete architecture diagram?

**A**: Architecture diagrams are distributed:
- System-wide view: `ARCHITECTURE.md` (still exists, not part of core 5)
- Component-specific: Each core file has an Architecture section with component context

### Q: What about deployment scripts?

**A**: Deployment instructions are in each component's Deployment section:
- Web: `WEB.md` - Cloudflare Pages
- Mobile: `APP.md` - EAS Build
- API: `API.md` - Wrangler deploy

Scripts themselves remain in `scripts/` directory.

---

### Q: Are the old files still available?

**A**: No, they have been deleted from the repository. If you need to reference them, check git history:
```bash
git log --oneline -- docs/FRONTEND.md
git show <commit>:docs/FRONTEND.md > old_FRONTEND.md
```

---

### Q: Something's missing! Where did X go?

**A**:
1. Check the **Mapping Table** above
2. If not listed, it may have been moved to "Keep but not in core 5" section
3. Search git history: `git log --all --full-history -- "*filename*"`
4. If truly lost, file an issue with documentation team

---

### Q: Why 5 files? Why not fewer or more?

**A**: The 5-file structure aligns with the 5 main system components:
- **Web** (frontend browser app)
- **App** (mobile app)
- **API** (backend services)
- **DB** (data layer)
- **Compute** (WASM performance)

Each developer typically works on one component at a time, so having a single comprehensive file per component reduces context switching.

---

### Q: Will this change again?

**A**: This structure is stable. Future changes:
- Major architectural shifts → new ADR (not doc restructuring)
- New components → new core file (e.g., `CLI.md` if CLI tool added)
- Keep core files focused; avoid fragmentation

---

## Feedback

Found an issue with the new documentation structure?

- **Missing content**: Create issue in repository
- **Broken links**: Submit PR to fix
- **Suggestions**: Open discussion in Discord #documentation

---

**Migration Date**: 2025-04-27  
**By**: Claude Code (DOC specialist)  
**Status**: ✅ Complete
