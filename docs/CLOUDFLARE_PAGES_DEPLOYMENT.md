# Cloudflare Pages Deployment Guide for AIVO Web

This guide covers deploying the Next.js web application to Cloudflare Pages.

## Prerequisites

- Cloudflare account
- Wrangler CLI installed: `npm install -g wrangler`
- Authenticated with Cloudflare: `wrangler login`
- pnpm installed

## Quick Deploy

```bash
# From the project root
./scripts/deploy-web-pages.sh
```

Or manually:

```bash
cd apps/web
pnpm run build:pages
wrangler pages deploy . --project-name aivo-web
```

## Configuration Files

The following files have been created for Cloudflare Pages:

| File | Purpose |
|------|---------|
| `_routes` | Pages routing rules (SPA fallback, API proxy) |
| `_routes.json` | Routes manifest for Pages build |
| `pages.config.toml` | Pages build configuration |
| `next.config.cloudflare.js` | Next.js config optimized for Pages |
| `.env.production.local.example` | Production environment variables template |

## Environment Variables

### Development (`.env.local`)
```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
NEXT_PUBLIC_FACEBOOK_CLIENT_ID=...
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_R2_PUBLIC_URL=https://your-r2-bucket.r2.dev
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production (`.env.production.local`)
```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
NEXT_PUBLIC_FACEBOOK_CLIENT_ID=...
NEXT_PUBLIC_API_URL=https://api.aivo.yourdomain.com
NEXT_PUBLIC_R2_PUBLIC_URL=https://your-r2-bucket.r2.dev
NEXT_PUBLIC_APP_URL=https://aivo.yourdomain.com
```

**Important**: Cloudflare Pages does NOT support secret environment variables in the free tier. Use:
- `wrangler pages secret put SECRET_NAME` (for paid plans)
- Or configure in Cloudflare Dashboard → Pages → Project → Environment variables

## Build Configuration

### `next.config.cloudflare.js`

Key settings for Cloudflare compatibility:
- `output: 'standalone'` - Bundles all dependencies
- `transpilePackages` - Includes workspace packages
- `images.remotePatterns` - Allows R2.dev image hosting
- Webpack fallbacks for Node.js modules

### `pages.config.toml`

Build settings:
- `command = "pnpm run build:pages"`
- `output_directory = ".next/standalone"`
- Security headers configured
- Static asset caching (1 year for immutable assets)

### `_routes`

Routing rules:
- `/*` → `/index.html` (SPA fallback)
- `/api/*` → Proxy to API worker
- Static assets served directly
- Health check endpoint

## Deployment Steps

### 1. Prepare Production Environment

```bash
# Copy production env template
cp apps/web/.env.production.local.example apps/web/.env.production.local

# Edit with your production values
# - OAuth client IDs
# - API URL (your Cloudflare Workers domain)
# - R2 public URL
```

### 2. Build Locally (Optional Test)

```bash
cd apps/web
pnpm run build:pages

# Test the build
pnpm start
# Visit http://localhost:3000
```

### 3. Deploy to Cloudflare Pages

```bash
# Using the deployment script
./scripts/deploy-web-pages.sh

# Or manually
cd apps/web
wrangler pages deploy . --project-name aivo-web
```

### 4. Configure Custom Domain (Optional)

1. Go to Cloudflare Dashboard → Pages → aivo-web
2. Click "Custom domains" → "Add custom domain"
3. Enter your domain (e.g., `aivo.yourdomain.com`)
4. Follow DNS configuration instructions

### 5. Update OAuth Redirect URIs

In Google Cloud Console and Facebook Developers, add:
- `https://aivo.yourdomain.com/login` (or your custom domain)

## API Integration

The `_routes` file proxies `/api/*` requests to your API worker:

```
/api/* → https://api.aivo.yourdomain.com/:splat
```

**Important**: Update the API URL in `_routes` to match your actual API domain.

## Static Assets and Images

### R2 Bucket Setup

1. Create R2 bucket: `wrangler r2 bucket create aivo-images`
2. Enable public access or use signed URLs
3. Set `NEXT_PUBLIC_R2_PUBLIC_URL` to your bucket URL
4. Configure CORS on the bucket for your domain

### Next.js Image Optimization

Cloudflare Pages supports Next.js Image component with:
- Remote patterns configured in `next.config.cloudflare.js`
- R2.dev domains allowed by default
- For custom R2 buckets, add to `remotePatterns`:

```javascript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'your-bucket.r2.dev',
    },
  ],
}
```

## Troubleshooting

### Build Fails

```bash
# Clean and rebuild
cd apps/web
rm -rf .next node_modules
pnpm install
pnpm run build:pages
```

Check for:
- TypeScript errors: `pnpm run type-check`
- ESLint errors: `pnpm run lint`
- Missing dependencies in package.json

### Routing Issues

- Ensure `_routes` file is at the project root (same level as `package.json`)
- Check Pages Dashboard → Routes configuration
- SPA fallback rule must be last: `/* /index.html 200`

### Environment Variables Not Available

- Cloudflare Pages injects env vars at build time
- Use `NEXT_PUBLIC_` prefix for client-side variables
- Server-side only vars should NOT have `NEXT_PUBLIC_` prefix
- Set in Dashboard → Pages → Project → Environment variables

### OAuth Not Working

1. Verify client IDs in `.env.production.local`
2. Check OAuth redirect URIs match production domain
3. Ensure API is deployed and accessible
4. Check browser console for CORS errors

### Images Not Loading

1. Verify R2 bucket is publicly accessible
2. Check `NEXT_PUBLIC_R2_PUBLIC_URL` is set correctly
3. Add bucket hostname to `remotePatterns` in next.config
4. Check Cloudflare Pages → Settings → Image optimization is enabled

## Performance Optimization

### Enable Image Optimization

Cloudflare Pages automatically optimizes images via:
- Polish (automatic optimization)
- Mirage (responsive images)

Enable in Dashboard → Pages → Project → Settings → Image optimization

### Caching Strategy

Static assets are cached via `_routes` and `pages.config.toml`:
- `/_next/static/*` - 1 year, immutable
- `/static/*` - 1 year, immutable
- `/favicon.ico` - Browser default

### Bundle Analysis

```bash
cd apps/web
pnpm run build:pages
# Check .next/analyze for bundle stats
```

## Monitoring

### Pages Analytics

- Dashboard: https://dash.cloudflare.com → Pages → aivo-web → Analytics
- Requests, bandwidth, errors, response times

### Logs

```bash
# View recent logs
wrangler pages tail aivo-web

# Follow logs
wrangler pages tail aivo-web --format json
```

### Error Tracking

Consider adding:
- Sentry for error tracking
- LogRocket for session replay
- Cloudflare Web Analytics

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Cloudflare Pages
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      - name: Build
        run: |
          cd apps/web
          pnpm run build:pages
      - name: Deploy to Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy apps/web --project-name aivo-web
```

## Rollback

```bash
# List deployments
wrangler pages deployment list aivo-web

# Rollback to specific deployment
wrangler pages deployment rollback aivo-web <deployment-id>
```

## Comparison: Vercel vs Cloudflare Pages

| Feature | Vercel | Cloudflare Pages |
|---------|--------|------------------|
| Image Optimization | Built-in, excellent | Built-in, good |
| Edge Functions | Edge Config | Workers (more flexible) |
| Free Tier | 100GB bandwidth/month | unlimited requests, 500 builds/month |
| Build Speed | Fast | Fast |
| Analytics | Excellent | Good |
| Pricing | $20/mo Pro | $5/mo (Workers paid plan) |

**Why Cloudflare Pages for AIVO?**
- Unified with Cloudflare Workers API
- Same account/billing
- Edge network integration
- Cost-effective for high traffic

## Next Steps

After deploying the web app:

1. Deploy the API to Cloudflare Workers: `./scripts/deploy.sh`
2. Configure custom domains for both services
3. Update OAuth redirect URIs
4. Test full authentication flow
5. Set up monitoring and alerts
6. Configure SSL/TLS settings

See also:
- [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) - Full production guide
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Next.js on Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-a-nextjs-site/)
