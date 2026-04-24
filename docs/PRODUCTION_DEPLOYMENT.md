# Production Deployment Guide

This guide covers setting up AIVO for production deployment.

## Prerequisites

- Cloudflare account with Workers and D1 access
- Domain name configured with Cloudflare
- OAuth apps configured (Google & Facebook)
- OpenAI API key (optional, for AI features)

## 1. Cloudflare Setup

### Create D1 Database (Production)

```bash
# Login to Cloudflare
wrangler login

# Create D1 database
wrangler d1 database create aivo-db --name=aivo-db --location=auto
# {
#   "d1_databases": [
#     {
#       "binding": "aivo_db",
#       "database_name": "aivo-db",
#       "database_id": "c262737b-ab5f-4973-841a-7c75ef0dcb20"
#     }
#   ]
# }

# Note the database_id from the output
```

### Create R2 Bucket

```bash
# Create R2 bucket
wrangler r2 bucket create aivo-images
# {
#   "r2_buckets": [
#     {
#       "bucket_name": "aivo-images",
#       "binding": "aivo_images"
#     }
#   ]
# }

# Enable public access (optional, for image hosting)
# Configure bucket policy in Cloudflare dashboard
```

### Create KV Namespaces

```bash
# Body insights cache
wrangler kv namespace create BODY_INSIGHTS_CACHE
# {
#   "kv_namespaces": [
#     {
#       "binding": "BODY_INSIGHTS_CACHE",
#       "id": "f453355bae1a43bb944ce8d01cc40356"
#     }
#   ]
# }
# Note the namespace_id

# Leaderboard cache
wrangler kv namespace create LEADERBOARD_CACHE
# {
#   "kv_namespaces": [
#     {
#       "binding": "LEADERBOARD_CACHE",
#       "id": "c09a3fb62443492389f1675371e1c4d8"
#     }
#   ]
# }

# Rate limiting
wrangler kv namespace create RATE_LIMIT_KV
# {
#   "kv_namespaces": [
#     {
#       "binding": "RATE_LIMIT_KV",
#       "id": "cecb209e86dc4b36b3661e6b8d595b74"
#     }
#   ]
# }

wrangler kv namespace create BIOMETRIC_CACHE 
# {
#   "kv_namespaces": [
#     {
#       "binding": "BIOMETRIC_CACHE",
#       "id": "0e2ea990aa4441fc84b2bd0a38496524"
#     }
#   ]
# }
```

## 2. Update wrangler.toml

Update `apps/api/wrangler.toml` with your actual IDs:

```toml
[[d1_databases]]
binding = "DB"
database_name = "aivo-db"
database_id = "c262737b-ab5f-4973-841a-7c75ef0dcb20"  # Replace with actual ID

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "aivo-images"

[[kv_namespaces]]
binding = "BODY_INSIGHTS_CACHE"
id = "f453355bae1a43bb944ce8d01cc40356"  # Replace with actual ID

[[kv_namespaces]]
binding = "LEADERBOARD_CACHE"
id = "c09a3fb62443492389f1675371e1c4d8"  # Replace with actual ID

[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "cecb209e86dc4b36b3661e6b8d595b74"  # Replace with actual ID

[vars]
R2_PUBLIC_URL = "https://312b98fff6f54aa11ae59cb06d30015a.r2.cloudflarestorage.com/aivo-images"  # Your R2 public URL
```

## 3. Set Production Secrets

Set secrets via Wrangler (these are NOT in wrangler.toml):

```bash
cd apps/api

# Generate AUTH_SECRET if you haven't already
openssl rand -base64 32

# Set secrets
wrangler secret put AUTH_SECRET
wrangler secret put OPENAI_API_KEY
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put FACEBOOK_APP_ID
```

## 4. OAuth Provider Configuration

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized JavaScript origins:
   - `https://your-domain.com` (production)
4. Add authorized redirect URIs:
   - `https://your-domain.com/login`
5. Copy Client ID to:
   - `apps/api/.env` (GOOGLE_CLIENT_ID)
   - `apps/web/.env.local` (NEXT_PUBLIC_GOOGLE_CLIENT_ID)
   - `apps/mobile/.env` (EXPO_PUBLIC_GOOGLE_CLIENT_ID)

### Facebook OAuth

1. Go to [Facebook Developers](https://developers.facebook.com/apps)
2. Create new app with "Consumer" type
3. Add "Facebook Login" product
4. Configure:
   - Client OAuth Settings → Valid OAuth Redirect URIs:
     - `https://your-domain.com/login`
   - Settings → Basic: Copy App ID
5. Add App ID to all .env files (same as Google above)

## 5. Web Application (Next.js)

### Configure for Production

Update `apps/web/next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@aivo/shared-types", "@aivo/compute"],
  output: 'standalone',  // Add for Vercel/Node deployment
  // Add production-specific config
};
```

### Deploy Options

**Option A: Vercel (Recommended)**
```bash
cd apps/web
vercel --prod
```

**Option B: Self-host with Docker**
```bash
cd apps/web
pnpm run build
# Output in .next/standalone - deploy to your server
```

## 6. Mobile App (Expo)

### Configure for Production

1. Update `apps/mobile/app.json`:
   - Set `slug` to your app name
   - Update `ios.bundleIdentifier` and `android.package` with your domain
   - Configure OAuth redirect URIs

2. Build for production:
```bash
cd apps/mobile
eas build --platform all
```

3. Submit to stores:
```bash
eas submit --platform ios
eas submit --platform android
```

### OAuth Deep Linking

Configure deep linking in `apps/mobile/app.json`:

```json
{
  "expo": {
    "scheme": "aivo",
    "ios": {
      "bundleIdentifier": "com.yourcompany.aivo"
    },
    "android": {
      "package": "com.yourcompany.aivo"
    }
  }
}
```

## 7. API Deployment (Cloudflare Workers)

### Build and Deploy

```bash
# From project root
./scripts/deploy.sh

# Or manually:
cd apps/api
pnpm run build
pnpm run deploy
```

### Verify Deployment

```bash
# Check health endpoint
curl https://api.your-domain.com/health

# View logs
cd apps/api
pnpmx wrangler tail
```

## 8. Database Migrations

### Apply Migrations to Production

```bash
cd packages/db
pnpm run migrate:remote
```

### Seed Production Data (Optional)

```bash
# Create admin user, etc.
pnpm run seed
```

## 9. Environment Variables Summary

### API (Cloudflare Workers)
Set via `wrangler secret put`:
- `AUTH_SECRET` (required)
- `OPENAI_API_KEY` (optional)
- `GOOGLE_CLIENT_ID` (optional)
- `FACEBOOK_APP_ID` (optional)

Set in `wrangler.toml` [vars]:
- `R2_PUBLIC_URL` (your R2 public URL)

### Web (Next.js) - `.env.local`
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
NEXT_PUBLIC_FACEBOOK_CLIENT_ID=...
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_R2_PUBLIC_URL=https://your-bucket.r2.dev
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Mobile (Expo) - `.env`
```
EXPO_PUBLIC_GOOGLE_CLIENT_ID=...
EXPO_PUBLIC_FACEBOOK_CLIENT_ID=...
EXPO_PUBLIC_API_URL=https://api.your-domain.com
EXPO_PUBLIC_R2_PUBLIC_URL=https://your-bucket.r2.dev
EXPO_PUBLIC_SCHEME=aivo
```

## 10. Post-Deployment Checklist

- [ ] API deployed and responding at `https://api.your-domain.com/health`
- [ ] Web app deployed and accessible
- [ ] Mobile app built with production credentials
- [ ] OAuth login working (test with Google/Facebook)
- [ ] Database migrations applied
- [ ] R2 bucket configured with correct CORS
- [ ] Rate limiting working (test API)
- [ ] SSL certificates valid
- [ ] Monitoring/logging configured

## 11. Monitoring

### Cloudflare Workers Analytics
- Dashboard: https://dash.cloudflare.com
- Workers & Pages → Your worker → Analytics

### Logs
```bash
cd apps/api
pnpmx wrangler tail --format json
```

### Database
```bash
# D1 Studio (local)
cd packages/db
pnpmx drizzle-kit studio

# Production: Use Cloudflare dashboard or wrangler CLI
wrangler d1 execute aivo-db --command "SELECT COUNT(*) FROM users"
```

## 12. Troubleshooting

### CORS Issues
Check `ALLOWED_ORIGINS` in API environment. For production, add your domain.

### OAuth Not Working
1. Verify client IDs are correct in all .env files
2. Check OAuth redirect URIs match your domain
3. Ensure secrets are set in Cloudflare

### Database Connection Fails
1. Verify D1 database_id in wrangler.toml
2. Check database exists: `wrangler d1 database list`
3. Apply migrations: `pnpm run migrate:remote`

### R2 Access Denied
1. Check bucket exists and name is correct
2. Verify R2_PUBLIC_URL is set correctly
3. Check bucket permissions in Cloudflare dashboard

## Security Notes

- Never commit `.env` files to git (already in .gitignore)
- Rotate AUTH_SECRET periodically
- Use strong, unique passwords for all OAuth apps
- Enable 2FA on Cloudflare account
- Monitor Workers usage for unexpected spikes
- Set up rate limiting (already configured in code)
