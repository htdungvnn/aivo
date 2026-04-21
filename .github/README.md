# GitHub Actions CI/CD Setup

## Overview

This project uses GitHub Actions for continuous integration and deployment.

### Workflows

1. **CI** (`.github/workflows/ci.yml`)
   - Runs on every PR and push to `main`
   - Performs type checking, linting, WASM build, full build, and tests
   - Parallel jobs for faster execution

2. **Deploy** (`.github/workflows/deploy.yml`)
   - Runs on push to `main` (can also be triggered manually)
   - Deploys API to Cloudflare Workers

## Required Secrets

For deployment to work, add these secrets to your GitHub repository:

### Settings → Secrets and variables → Actions → New repository secret

- `CLOUDFLARE_API_TOKEN`: Cloudflare API token with Workers permissions
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

### Creating Cloudflare API Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **User Profile** → **API Tokens**
3. Create token with these permissions:
   - **Account** → **Cloudflare Workers** → **Edit**
   - **Zone** → **Workers** → **Edit** (if using custom domain)
4. Copy the token and add as `CLOUDFLARE_API_TOKEN`

### Finding Account ID

- From Cloudflare Dashboard: Overview page shows Account ID
- Or run: `pnpm --filter @aivo/api exec wrangler whoami --account-id`

## Local Development

```bash
# Install dependencies
pnpm install

# Run everything in dev mode
pnpm run dev

# Build everything
pnpm run build

# Type check all packages
pnpm run type-check

# Lint all packages
pnpm run lint

# Build WASM only
pnpm run build:wasm

# Run tests
pnpm run test
```

## Notes

- The CI uses `--frozen-lockfile` to ensure reproducible builds
- WASM build requires Rust toolchain with `wasm32-unknown-unknown` target
- Mobile app build requires Expo/EAS for production builds (manual process)
- Web app can be deployed to any hosting service (build output in `.next`)
