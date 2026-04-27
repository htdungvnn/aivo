# Contributing to AIVO

Thank you for your interest in contributing to AIVO! This guide will help you get started with the development process.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Commit Guidelines](#commit-guidelines)

## Code of Conduct

We expect all contributors to:
- Be respectful and inclusive
- Focus on constructive feedback
- Accept responsibility and apologize for mistakes
- Show empathy towards others

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20+ (we recommend using `fnm` or `nvm`)
- **pnpm** 9+ (our package manager)
- **Rust** (for WASM development) - install via `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **wrangler** (Cloudflare Workers CLI) - `npm install -g wrangler`
- **expo-cli** (for mobile development) - `npm install -g expo-cli`
- **git** (for version control)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/aivo.git
   cd aivo
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/original-owner/aivo.git
   ```
4. Install dependencies:
   ```bash
   pnpm install
   ```
5. Set up environment variables (see [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md))

## Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `staging` - Integration branch for testing
- Feature branches: `feature/<description>` or `fix/<description>`

Always create a new branch for your work:
```bash
git checkout -b feature/my-new-feature
```

### Running the Development Environment

We provide a convenient script to start all services:

```bash
./scripts/dev.sh
```

This will start:
- API server (Cloudflare Workers dev) on http://localhost:8787
- Web app (Next.js) on http://localhost:3000
- Database (D1 local)
- Any required WASM build watchers

#### Manual Startup

If you need to start services individually:

```bash
# Terminal 1: Database
cd packages/db
pnpm exec drizzle-kit studio

# Terminal 2: API
cd apps/api
pnpm exec wrangler dev

# Terminal 3: Web
cd apps/web
pnpm run dev

# Terminal 4: Mobile
cd apps/mobile
pnpm exec expo start

# Terminal 5: WASM (auto-watches)
cd packages/aivo-compute
pnpm run dev
```

### Building for Production

```bash
# Build all packages
pnpm run build

# Build specific package
pnpm --filter <package-name> run build
```

## Code Standards

### TypeScript

- Use strict TypeScript mode (`strict: true` in tsconfig)
- Prefer functional components and hooks
- Avoid `any` type - use proper types or `unknown`
- Enable `exactOptionalPropertyTypes` for better type safety

### Rust (WASM)

- Use `Result<T, JsError>` for WASM boundary functions
- Never use `unwrap()` or `panic!()` in production code
- Write comprehensive tests for all public functions
- Follow Rust naming conventions: `snake_case` for functions/variables, `PascalCase` for types

### General

- Keep functions small and focused (single responsibility)
- Write self-documenting code with clear variable/function names
- Add comments for complex algorithms or non-obvious logic
- Maintain 100% test coverage for critical paths

## Testing Requirements

### Before Submitting a PR

- ✅ All unit tests pass: `pnpm run test`
- ✅ Integration tests pass: `pnpm run test:integration`
- ✅ Type checking passes: `pnpm run type-check`
- ✅ Linting passes: `pnpm run lint`
- ✅ No console errors in browser tests
- ✅ Database migrations are included if schema changed
- ✅ WASM build succeeds and generates correct types

### Test Coverage

We require:
- **Critical paths** (auth, payments, data processing): 100% coverage
- **Business logic**: >90% coverage
- **UI components**: >80% coverage

Use coverage reporting:
```bash
pnpm run test:coverage
```

## Pull Request Process

1. **Create an issue first** for significant changes to discuss approach
2. **Squash commits** into logical units before merging
3. **Fill out the PR template** completely
4. **Link related issues** in the PR description
5. **Request review** from at least one maintainer
6. **Address review feedback** promptly
7. **Ensure CI passes** (GitHub Actions)

### PR Template Checklist

- [ ] Tests added/updated for changes
- [ ] Documentation updated (code comments, docs/)
- [ ] Type checking passes
- [ ] Linting passes
- [ ] No breaking changes (or clearly documented)
- [ ] Environment variables documented if added
- [ ] Migration included if database schema changed
- [ ] WASM build tested if Rust code changed

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Formatting, missing semicolons, etc. (no code change)
- `refactor`: Code restructuring
- `test`: Adding or updating tests
- `chore`: Build process, tooling changes
- `perf`: Performance improvements
- `ci`: CI/CD changes
- `build`: Build system changes
- `revert`: Revert a previous commit

### Examples

```
feat(auth): add Google OAuth support

- Implement Google OAuth flow
- Add user profile mapping
- Store tokens in secure session

Closes #123

fix(api): correct CORS headers for mobile app

The mobile app was blocked by CORS. This fix adds
proper origin checking and preflight handling.

Refs #456
```

## Environment Variables

All environment variables must be:
1. Documented in [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)
2. Have sensible defaults where possible
3. Never commit actual values to git (use `.env.local`)
4. Be validated at application startup

### Adding New Environment Variables

1. Add to the appropriate `.env.example` file:
   - `apps/api/.env.example`
   - `apps/web/.env.local.example`
   - `apps/mobile/.env.example`

2. Update the validation logic in the respective app
3. Document the variable in ENVIRONMENT_SETUP.md with:
   - Purpose
   - Required/Optional
   - Example value
   - Default behavior if not set

## Architecture Changes

Significant architecture changes require:

1. **ADR (Architecture Decision Record)**: Create a markdown file in `docs/architecture/decisions/`
2. **Team discussion**: Present at team meeting or async discussion
3. **Implementation plan**: Document the migration steps
4. **Backward compatibility**: Ensure existing data and APIs remain functional during transition

### ADR Template

```markdown
# ADR-XXX: [Title]

## Status
[Proposed | Accepted | Deprecated | Superseded]

## Context
[Problem statement, forces at play]

## Decision
[Chosen approach with justification]

## Consequences
[Positive and negative outcomes]

## Alternatives Considered
[List options rejected and why]
```

## CI/CD

### GitHub Actions

Our CI/CD pipeline runs automatically on:
- Push to `main` or `staging` branches
- Pull request creation/updates

### Manual Deployment

To trigger a deployment manually:

```bash
# Deploy API to Cloudflare Workers
./scripts/deploy.sh

# Deploy Web to Cloudflare Pages
./scripts/deploy-web-pages.sh
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment procedures.

## Code Review Process

All code changes require review:

1. **Self-review**: Check your own PR thoroughly before requesting review
2. **Reviewer selection**: Choose someone familiar with the code area
3. **Review time**: Allow 24-48 hours for review
4. **Address feedback**: Make requested changes or discuss alternatives
5. **Approval**: At least 1 approval required for merge
6. **Squash and merge**: We squash commits to maintain clean history

### Review Checklist

Reviewers should check:
- Code correctness and security
- Performance implications
- Test coverage
- Documentation completeness
- Backward compatibility
- Error handling
- Edge cases

## Performance Guidelines

- Minimize WASM boundary crossings (batch operations)
- Use streaming for large responses
- Implement proper caching headers
- Avoid blocking the event loop
- Profile before optimizing

## Security Best Practices

- Never log sensitive data (tokens, passwords, PII)
- Validate all inputs (including from trusted sources)
- Use parameterized queries (Drizzle handles this)
- Implement rate limiting for public endpoints
- Keep dependencies up to date (`pnpm update`)

## Getting Help

- **Documentation**: Check [docs/](./) and [README.md](../README.md)
- **Issues**: Search existing issues before creating new ones
- **Team chat**: Use designated team communication channel
- **Office hours**: Weekly team sync (check calendar)

## Recognition

Contributors will be:
- Listed in [CREDITS.md](../CREDITS.md)
- Mentioned in release notes for significant contributions
- Eligible for AIVO contributor perks (coming soon)

Thank you for contributing to AIVO! 💪
