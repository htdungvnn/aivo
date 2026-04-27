# Environment Variables Reference

Complete reference for all environment variables used in the AIVO platform.

## Table of Contents

- [Quick Reference](#quick-reference)
- [API Environment Variables](#api-environment-variables)
- [Web Environment Variables](#web-environment-variables)
- [Mobile Environment Variables](#mobile-environment-variables)
- [Database Environment Variables](#database-environment-variables)
- [Validation and Defaults](#validation-and-defaults)
- [Security Best Practices](#security-best-practices)

---

## Quick Reference

### Most Commonly Used Variables

| Variable | Used In | Purpose | Required |
|----------|---------|---------|----------|
| `AUTH_SECRET` | API | JWT signing secret | Yes |
| `NEXT_PUBLIC_API_URL` | Web | API endpoint URL | Yes |
| `EXPO_PUBLIC_API_URL` | Mobile | API endpoint URL | Yes |
| `GOOGLE_CLIENT_ID` | API | Google OAuth client ID | Yes (for OAuth) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Web | Google OAuth client ID | Yes (for OAuth) |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Mobile | Google OAuth client ID | Yes (for OAuth) |
| `FACEBOOK_APP_ID` | API | Facebook App ID | Yes (for OAuth) |
| `NEXT_PUBLIC_FACEBOOK_CLIENT_ID` | Web | Facebook App ID | Yes (for OAuth) |
| `EXPO_PUBLIC_FACEBOOK_CLIENT_ID` | Mobile | Facebook App ID | Yes (for OAuth) |
| `OPENAI_API_KEY` | API | OpenAI API key | Optional |
| `GEMINI_API_KEY` | API | Google Gemini API key | Optional |

---

## API Environment Variables

**File**: `apps/api/.env` (or set via wrangler secret)

### Required Variables

#### `AUTH_SECRET`
- **Description**: Secret key for signing JWT tokens. Must be at least 32 characters.
- **Type**: String
- **Example**: `openssl rand -hex 32`
- **Required**: Yes
- **Used in**: `apps/api/src/utils/auth.ts`
- **Validation**: Min length 32, recommended to use cryptographically random

#### `GOOGLE_CLIENT_ID`
- **Description**: Google OAuth 2.0 Client ID
- **Type**: String
- **Example**: `123456-abc.apps.googleusercontent.com`
- **Required**: Yes (if Google OAuth enabled)
- **Used in**: `apps/api/src/routes/auth.ts`
- **How to get**: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

#### `FACEBOOK_APP_ID`
- **Description**: Facebook App ID for OAuth
- **Type**: String
- **Example**: `123456789012345`
- **Required**: Yes (if Facebook OAuth enabled)
- **Used in**: `apps/api/src/routes/auth.ts`
- **How to get**: [Facebook Developers](https://developers.facebook.com/apps)

### Optional Variables

#### `ALLOWED_ORIGINS`
- **Description**: Comma-separated list of allowed CORS origins
- **Type**: String
- **Default**: `http://localhost:3000,http://localhost:8080`
- **Example**: `https://aivo.website,https://app.aivo.website`
- **Used in**: `apps/api/src/index.ts`
- **Note**: Mobile apps typically use `*` or include all app origins

#### `OPENAI_API_KEY`
- **Description**: OpenAI API key for GPT models
- **Type**: String
- **Default**: (none)
- **Example**: `sk-proj-...`
- **Used in**: `apps/api/src/utils/openai.ts`
- **Required for**: OpenAI model selection

#### `GEMINI_API_KEY`
- **Description**: Google Gemini API key
- **Type**: String
- **Default**: (none)
- **Example**: `AIza...`
- **Used in**: `apps/api/src/utils/gemini.ts` (if implemented)
- **Required for**: Gemini model selection

#### `R2_PUBLIC_URL`
- **Description**: Public URL for Cloudflare R2 bucket (for serving images/assets)
- **Type**: String
- **Default**: (none)
- **Example**: `https://bucket.your-account.r2.cloudflarestorage.com`
- **Used in**: Various services for image URLs

#### `LOG_LEVEL`
- **Description**: Logging verbosity level
- **Type**: String
- **Default**: `info`
- **Options**: `debug`, `info`, `warn`, `error`
- **Used in**: Logging configuration

#### `PORT`
- **Description**: Development server port
- **Type**: Number
- **Default**: `8787`
- **Used in**: Dev server configuration
- **Note**: Only used in local development

#### `PUBLIC_SWAGGER`
- **Description**: Whether to expose Swagger/OpenAPI docs in production
- **Type**: String (`"true"` or `"false"`)
- **Default**: `false`
- **Used in**: `apps/api/src/index.ts` (API documentation routing)
- **Security**: Set to `false` in production to protect API docs

#### `NODE_ENV`
- **Description**: Environment mode
- **Type**: String
- **Default**: `development`
- **Options**: `development`, `staging`, `production`
- **Used in**: Throughout codebase for conditional logic
- **Note**: Automatically set by wrangler in deployed environments

### Internal/System Variables (Do Not Set)

These are set by the runtime or build system:

- `FUNCTION_NAME` - Cloudflare Workers function name
- `FUNCTION_TARGET` - Worker target
- `K_SERVICE` / `K_CONFIGURATION` - Google Cloud
- `VERCEL_*` - Vercel deployment vars
- `CLOUDFLARE_*` - Cloudflare internal

---

## Web Environment Variables

**File**: `apps/web/.env.local`

### Required Variables

#### `NEXT_PUBLIC_API_URL`
- **Description**: API endpoint URL (must be accessible from browser)
- **Type**: String
- **Default**: `http://localhost:8787` (dev)
- **Example**: `https://api.aivo.website`
- **Used in**: API client throughout web app
- **Note**: Must include protocol (http/https)

#### `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- **Description**: Google OAuth client ID (web-specific)
- **Type**: String
- **Example**: `123456-abc.apps.googleusercontent.com`
- **Required**: Yes (for Google OAuth)
- **Must match**: `GOOGLE_CLIENT_ID` in API (same value)
- **Used in**: `apps/web/src/components/auth/LoginPage.tsx`
- **Note**: Web client ID differs from mobile/API client IDs

#### `NEXT_PUBLIC_FACEBOOK_CLIENT_ID`
- **Description**: Facebook App ID (web-specific)
- **Type**: String
- **Example**: `123456789012345`
- **Required**: Yes (for Facebook OAuth)
- **Must match**: `FACEBOOK_APP_ID` in API
- **Used in**: `apps/web/src/components/auth/LoginPage.tsx`

#### `NEXT_PUBLIC_R2_PUBLIC_URL`
- **Description**: Public R2 bucket URL for images
- **Type**: String
- **Default**: (none)
- **Example**: `https://bucket.your-account.r2.cloudflarestorage.com`
- **Used in**: Image components, API responses
- **Required if**: Using R2 for image storage

### Optional Variables

#### `NEXT_PUBLIC_APP_NAME`
- **Description**: Application name displayed in UI
- **Type**: String
- **Default**: `AIVO`
- **Used in**: Layout, meta tags, branding

#### `NEXT_PUBLIC_APP_VERSION`
- **Description**: Application version
- **Type**: String
- **Default**: From `package.json`
- **Used in**: Footer, About page

#### `NEXT_PUBLIC_ENV`
- **Description**: Environment identifier for UI display
- **Type**: String
- **Default**: `development`
- **Options**: `development`, `staging`, `production`
- **Used in**: Dev mode badges, environment indicators

#### `NEXT_PUBLIC_SENTRY_DSN`
- **Description**: Sentry DSN for error tracking
- **Type**: String
- **Default**: (none)
- **Example**: `https://key@sentry.io/12345`
- **Used in**: Error boundary, Sentry initialization
- **Required for**: Production error tracking

#### `NEXT_PUBLIC_GA_ID`
- **Description**: Google Analytics Measurement ID
- **Type**: String
- **Default**: (none)
- **Example**: `G-XXXXXXXXXX`
- **Used in**: Analytics scripts
- **Required for**: Google Analytics integration

#### `NEXT_PUBLIC_ANALYTICS_ENABLED`
- **Description**: Enable/disable analytics collection
- **Type**: String (`"true"` or `"false"`)
- **Default**: `true` (if GA_ID set)
- **Used in**: Analytics initialization

#### `NEXT_PUBLIC_SENTRY_DSN`
- **Description**: Sentry DSN for error tracking
- **Type**: String
- **Default**: (none)
- **Used in**: Error reporting

### Next.js Internal Variables (Auto-set)

Do not set these manually:

- `__NEXT_BUNDLER` - Build system
- `__NEXT_DIST_DIR` - Build output directory
- `__NEXT_TELEMETRY_DISABLED` - Telemetry opt-out
- `NEXT_DEBUG_BUILD` - Build debugging
- etc.

---

## Mobile Environment Variables

**File**: `apps/mobile/.env`

### Required Variables

#### `EXPO_PUBLIC_API_URL`
- **Description**: API endpoint URL
- **Type**: String
- **Default**: `http://localhost:8787` (dev)
- **Example**: `https://api.aivo.website`
- **Used in**: All API service calls
- **Note**: Must be accessible from mobile device/emulator

#### `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
- **Description**: Google OAuth client ID for mobile
- **Type**: String
- **Example**: `123456-abc.apps.googleusercontent.com`
- **Required**: Yes (for Google OAuth)
- **Used in**: `expo-auth-session` Google provider
- **Note**: Mobile/Android/iOS client ID may differ from web

#### `EXPO_PUBLIC_FACEBOOK_CLIENT_ID`
- **Description**: Facebook App ID for mobile
- **Type**: String
- **Example**: `123456789012345`
- **Required**: Yes (for Facebook OAuth)
- **Used in**: `expo-auth-session` Facebook provider

#### `EXPO_PUBLIC_SCHEME`
- **Description**: Deep linking scheme for OAuth callbacks
- **Type**: String
- **Default**: `aivomobile`
- **Example**: `aivomobile`
- **Used in**: Deep linking configuration
- **Must match**: `app.json` scheme and OAuth redirect URIs
- **Format**: lowercase, alphanumeric, no special chars

### Optional Variables

#### `EXPO_PUBLIC_R2_PUBLIC_URL`
- **Description**: Public R2 bucket URL
- **Type**: String
- **Default**: (none)
- **Example**: `https://bucket.r2.cloudflarestorage.com`
- **Used in**: Image display, upload URLs

#### `EXPO_PUBLIC_APP_NAME`
- **Description**: Mobile app name
- **Type**: String
- **Default**: `AIVO Mobile`
- **Used in**: UI, splash screen

#### `EXPO_PUBLIC_ENV`
- **Description**: Environment identifier
- **Type**: String
- **Default**: `development`
- **Options**: `development`, `staging`, `production`
- **Used in**: Debug builds, environment indicators

#### `EXPO_PUBLIC_SENTRY_DSN`
- **Description**: Sentry DSN for mobile error tracking
- **Type**: String
- **Default**: (none)
- **Used in**: Sentry React Native SDK

---

## Database Environment Variables

**File**: `packages/db/.env` (optional, mostly configured via wrangler.toml)

#### `NODE_ENV`
- **Description**: Environment mode
- **Type**: String
- **Default**: `development`

#### `WRANGLER_LOG`
- **Description**: Wrangler CLI logging level
- **Type**: String
- **Default**: `info`
- **Options**: `debug`, `info`, `warn`, `error`

---

## Validation and Defaults

### Validation Rules

| Variable | Validation | Error if Invalid |
|----------|------------|------------------|
| `AUTH_SECRET` | Min 32 chars, hex or base64 | Yes - server won't start |
| `GOOGLE_CLIENT_ID` | Non-empty string, valid format | Yes - OAuth fails |
| `FACEBOOK_APP_ID` | Non-empty string, numeric | Yes - OAuth fails |
| `API_URL` | Valid URL with protocol | Yes - API calls fail |
| `EXPO_PUBLIC_SCHEME` | Lowercase alphanumeric | No - but deep linking breaks |

### Default Fallbacks

Code typically uses:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
```

**Important**: Fallbacks are for development only. Production must have all required vars set.

### Startup Validation

The API validates required vars on startup:

```typescript
// apps/api/src/index.ts
const requiredEnvVars = ['AUTH_SECRET', 'GOOGLE_CLIENT_ID', 'FACEBOOK_APP_ID'];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    throw new Error(`${varName} is required`);
  }
}
```

---

## Security Best Practices

### 1. Never Commit Secrets

- Add all `.env*` files to `.gitignore`
- Use `.env.example` templates with placeholder values
- Never commit actual API keys, client secrets, or JWT secrets

### 2. Use Strong Secrets

```bash
# Generate secure AUTH_SECRET
openssl rand -hex 32

# Or
pwgen -s 32 1
```

### 3. Rotate Regularly

- Rotate API keys monthly
- Rotate JWT secrets quarterly (requires re-login for all users)
- Use short-lived OAuth tokens

### 4. Environment-Specific Secrets

Different values for:
- Development (local `.env`)
- Staging (GitHub Secrets + wrangler secret)
- Production (GitHub Secrets + wrangler secret)

### 5. Least Privilege

- OAuth client IDs should be specific to each platform (web, mobile, API)
- Don't reuse production credentials in development
- Use test/sandbox OAuth apps for development

### 6. Secret Management in Production

Set secrets via wrangler:

```bash
# API secrets
cd apps/api
npx wrangler secret put AUTH_SECRET --value "your-secret"
npx wrangler secret put GOOGLE_CLIENT_ID --value "your-client-id"
npx wrangler secret put OPENAI_API_KEY --value "sk-..."

# For staging
npx wrangler secret put AUTH_SECRET --env staging --value "staging-secret"

# For production
npx wrangler secret put AUTH_SECRET --env production --value "prod-secret"
```

### 7. GitHub Secrets for CI/CD

Add to GitHub repo → Settings → Secrets and variables → Actions:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_PROJECT_ID` (optional)

### 8. OAuth Redirect URI Validation

Ensure OAuth providers only allow authorized redirect URIs:

**Google Cloud Console**:
- Development: `http://localhost:3000/login`
- Production: `https://aivo.website/login`

**Facebook Developers**:
- Development: `aivomobile://auth` (mobile), `http://localhost:3000/login` (web)
- Production: Your production domain

---

## Environment Setup Checklist

### API

- [ ] `AUTH_SECRET` - Generated strong secret
- [ ] `GOOGLE_CLIENT_ID` - From Google Cloud Console
- [ ] `FACEBOOK_APP_ID` - From Facebook Developers
- [ ] `OPENAI_API_KEY` - From OpenAI Platform (optional)
- [ ] `GEMINI_API_KEY` - From Google AI Studio (optional)
- [ ] `ALLOWED_ORIGINS` - Set to frontend URLs
- [ ] `R2_PUBLIC_URL` - If using R2 storage
- [ ] `LOG_LEVEL` - Set to `info` or `warn` for production

### Web

- [ ] `NEXT_PUBLIC_API_URL` - API endpoint
- [ ] `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - Web OAuth client ID
- [ ] `NEXT_PUBLIC_FACEBOOK_CLIENT_ID` - Facebook App ID
- [ ] `NEXT_PUBLIC_R2_PUBLIC_URL` - R2 bucket URL
- [ ] `NEXT_PUBLIC_SENTRY_DSN` - For production error tracking
- [ ] `NEXT_PUBLIC_GA_ID` - For production analytics

### Mobile

- [ ] `EXPO_PUBLIC_API_URL` - API endpoint
- [ ] `EXPO_PUBLIC_GOOGLE_CLIENT_ID` - Mobile OAuth client ID
- [ ] `EXPO_PUBLIC_FACEBOOK_CLIENT_ID` - Mobile Facebook App ID
- [ ] `EXPO_PUBLIC_SCHEME` - Deep linking scheme
- [ ] `EXPO_PUBLIC_R2_PUBLIC_URL` - R2 bucket URL
- [ ] `EXPO_PUBLIC_SENTRY_DSN` - For production error tracking

---

## Troubleshooting Environment Variables

### "Variable is required" error

**Check**:
1. Variable is defined in correct `.env` file
2. No typos in variable name
3. `.env` file is loaded (server restart required)
4. For production: Secret set via `wrangler secret put`

### OAuth fails with "invalid client_id"

**Check**:
1. Client ID matches between API and frontend
2. OAuth provider has correct redirect URIs configured
3. Client ID is for correct platform (web vs mobile)
4. No extra spaces or characters

### API calls fail from web/mobile

**Check**:
1. `NEXT_PUBLIC_API_URL` / `EXPO_PUBLIC_API_URL` is correct
2. URL includes protocol (http/https)
3. API is running and accessible
4. CORS allows the origin (check `ALLOWED_ORIGINS`)

### "Port already in use"

**Fix**: Change `PORT` in API `.env` or stop process using port 8787

```bash
# Find process
lsof -ti:8787
# Kill
kill -9 <pid>
```

### Wrangler secret not working

**Check**:
1. Secret was set for correct environment (production/staging)
2. Secret name is exactly as referenced in code
3. Redeployed after setting secret (wrangler secrets are read on deployment)
4. No spaces in secret value

---

## Environment Templates

### API `.env.example`

```bash
# Authentication
AUTH_SECRET=change-me-min-32-chars

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
FACEBOOK_APP_ID=123456789012345

# AI Services (optional)
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AI...

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# Storage
R2_PUBLIC_URL=https://your-bucket.r2.cloudflarestorage.com

# Logging
LOG_LEVEL=info
PORT=8787

# Documentation (optional)
PUBLIC_SWAGGER=false
```

### Web `.env.local.example`

```bash
# API
NEXT_PUBLIC_API_URL=http://localhost:8787

# OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
NEXT_PUBLIC_FACEBOOK_CLIENT_ID=123456789012345

# Storage
NEXT_PUBLIC_R2_PUBLIC_URL=https://your-bucket.r2.cloudflarestorage.com

# Monitoring (production)
NEXT_PUBLIC_SENTRY_DSN=https://key@sentry.io/12345
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# App info
NEXT_PUBLIC_APP_NAME=AIVO
NEXT_PUBLIC_ENV=development
```

### Mobile `.env.example`

```bash
# API
EXPO_PUBLIC_API_URL=http://localhost:8787

# OAuth
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
EXPO_PUBLIC_FACEBOOK_CLIENT_ID=123456789012345

# Deep Linking
EXPO_PUBLIC_SCHEME=aivomobile

# Storage
EXPO_PUBLIC_R2_PUBLIC_URL=https://your-bucket.r2.cloudflarestorage.com

# Monitoring
EXPO_PUBLIC_SENTRY_DSN=https://key@sentry.io/12345

# App info
EXPO_PUBLIC_APP_NAME=AIVO Mobile
EXPO_PUBLIC_ENV=development
```

---

## Further Reading

- [Environment Setup Guide](./ENVIRONMENT_SETUP.md) - Step-by-step setup
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment
- [AUTHENTICATION.md](./AUTHENTICATION.md) - OAuth setup
- [CI/CD Guide](./CI_CD.md) - CI/CD configuration
