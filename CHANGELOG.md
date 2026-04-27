# Changelog

All notable changes to AIVO will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive documentation set (CONTRIBUTING.md, ENVIRONMENT_SETUP.md, MOBILE_DEVELOPMENT.md, WASM_DEVELOPMENT.md, CI_CD.md)
- WASM optimization guidelines and development workflow
- Mobile development guide for Expo/React Native
- CI/CD pipeline documentation with troubleshooting

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A

## [1.0.0] - 2025-04-20

### Added
- Initial release of AIVO platform
- Monorepo structure with pnpm + Turborepo
- Cloudflare Workers API with Hono framework
- Next.js 15 web application (Cloudflare Pages)
- React Native mobile app (Expo)
- Rust WASM compute packages:
  - `@aivo/aivo-compute` - Fitness calculations
  - `@aivo/infographic-generator` - Image generation
  - `@aivo/optimizer` - Text optimization
- Database with Drizzle ORM on Cloudflare D1
- OAuth authentication (Google & Facebook)
- AI model selector with OpenAI & Gemini integration
- Memory service with vector search
- Real-time workout streaming
- Body analysis and biometric tracking
- Posture analysis with computer vision
- Metabolic twin simulation
- Nutrition tracking and meal planning
- Gamification system with achievements
- Monthly reporting and analytics
- Export functionality (PDF, Excel, images)
- Comprehensive test suite
- GitHub Actions CI/CD pipelines
- Automated deployment to Cloudflare Workers and Pages

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- JWT-based authentication with secure secrets
- CORS configuration for cross-origin requests
- Input validation on all API endpoints
- Rate limiting on sensitive routes

## [0.1.0] - 2025-03-01 (Alpha)

### Added
- Initial alpha release for internal testing
- Basic API endpoints
- Prototype web interface
- Database schema foundation
- WASM compute module (basic functions)
- Authentication scaffolding

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A

---

## Release Notes Template

When creating a new release, update this CHANGELOG:

### Version Format

`[X.Y.Z] - YYYY-MM-DD`

Where:
- **X** = Major version (breaking changes)
- **Y** = Minor version (new features, backward compatible)
- **Z** = Patch version (bug fixes, backward compatible)

### Categories

- **Added** - New features, components, functionalities
- **Changed** - Changes to existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security-related updates

### Example Entry

```markdown
## [2.1.0] - 2025-05-01

### Added
- New `POST /api/workouts/suggestions` endpoint for AI workout suggestions
- Support for Gemini 2.0 Flash model in AI selector
- Real-time posture correction notifications

### Changed
- Improved BMI calculation accuracy (wasm-bindgen update)
- Updated CORS policy to include mobile app origins
- Enhanced error messages in auth flow

### Fixed
- Fixed memory leak in infographic generator (issue #123)
- Resolved race condition in React Query cache
- Fixed type error in biometric data submission

### Security
- Updated JWT secret rotation policy
- Added rate limiting to `/api/auth/*` endpoints
```

### Process for Releases

1. **Update CHANGELOG** - Add new version section with all changes
2. **Update package.json versions** - Bump versions across monorepo
3. **Create Git tag** - `git tag -a v1.2.0 -m "Release 1.2.0"`
4. **Push tag** - `git push origin v1.2.0`
5. **GitHub Actions** - CI/CD will auto-deploy on tag push
6. **Create Release** - On GitHub, create release from tag with notes

### Linking to Issues

Reference issues in changelog:

```markdown
### Fixed
- Fixed login bug causing session timeout (closes #456)
- Resolved WASM memory allocation error (refs #789)
```

## Migration Guides

For breaking changes, provide migration guides in this section.

### Migrating from 0.x to 1.0.0

[See MIGRATION_1.0.md for detailed migration steps]

## Version History

| Version | Date | Notes |
|---------|------|-------|
| 1.0.0 | 2025-04-20 | Initial stable release |
| 0.1.0 | 2025-03-01 | Alpha release |
