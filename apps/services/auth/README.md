# AIVO Authentication Service

Production-ready authentication and authorization system for AIVO, built on Cloudflare Workers.

## Quick Start

### 1. Environment Setup

Copy the example environment file:

```bash
cd apps/services/auth
cp .env.example .env.local
```

Edit `.env.local` with your actual credentials:
- JWT keys (base64 encoded EC P-256 keys)
- Google OAuth credentials from [Google Cloud Console](https://console.cloud.google.com/)
- Facebook OAuth credentials from [Meta Developer Console](https://developers.facebook.com/)

### 2. Generate JWT Keys (if needed)

```bash
# Generate EC P-256 key pair
openssl ecparam -genkey -name prime256v1 -noout -out private.pem
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in private.pem -out private.pem8
openssl ec -in private.pem -pubout -out public.pem

# Convert to base64 for environment variables
AUTH_JWT_PRIVATE_KEY=$(cat private.pem8 | base64)
AUTH_JWT_PUBLIC_KEY=$(cat public.pem | base64)
```

### 3. Apply Migrations

```bash
# Local D1 database
pnpm migrate

# Or list existing migrations first
pnpm migrate:list
```

### 4. Start Development Server

```bash
cd apps/services/auth
pnpm dev
```

The auth service will run at **http://localhost:3001**

### 5. Update Web App Environment

```bash
cd apps/web
echo "NEXT_PUBLIC_AUTH_API_URL=http://localhost:3001" > .env.local
```

## Commands

### Development

```bash
# Start local dev server (port 3001)
pnpm dev

# Start with external access
pnpm dev:external
```

### Migrations

```bash
# Apply migrations to local D1
pnpm migrate

# List migrations
pnpm migrate:list

# Apply migrations to remote D1
pnpm migrate:remote
```

### Deployment

```bash
# Deploy to production (Cloudflare)
pnpm deploy

# Or deploy dev environment
pnpm deploy:dev
```

### Testing & Validation

```bash
# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint

# Generate Cloudflare types
pnpm cf-typegen
```

## API Endpoints

### Health Check
- `GET /health` - Service health status

### OAuth
- `POST /oauth/start` - Start OAuth flow
- `GET /oauth/callback/:provider` - Web OAuth callback
- `POST /oauth/mobile/callback` - Mobile OAuth callback

### Authentication
- `GET /auth/me` - Get current user
- `POST /auth/refresh` - Refresh tokens
- `POST /auth/logout` - Logout current session
- `POST /auth/logout-all` - Logout all sessions

### Verification
- `POST /verification/send` - Send verification email
- `POST /verification/verify` - Verify email token

### Sessions
- `GET /sessions` - List user sessions
- `DELETE /sessions/:id` - Revoke session
- `DELETE /sessions` - Revoke all except current

### Account
- `GET /account` - Get account info
- `DELETE /account` - Soft delete account

### Admin (requires admin role)
- `GET /admin/users/:id` - Get user info
- `POST /admin/users/:id/suspend` - Suspend user
- `POST /admin/users/:id/reactivate` - Reactivate user
- `POST /admin/users/:id/roles` - Assign role
- `DELETE /admin/users/:id/roles/:role` - Remove role

## Production Deployment

### 1. Set Cloudflare Secrets

```bash
# Set secrets (run once)
wrangler secret put AUTH_JWT_PRIVATE_KEY --name aivo-auth
wrangler secret put AUTH_JWT_PUBLIC_KEY --name aivo-auth
wrangler secret put GOOGLE_CLIENT_SECRET --name aivo-auth
wrangler secret put FACEBOOK_CLIENT_SECRET --name aivo-auth
```

### 2. Update Production Environment

Edit `wrangler.production.jsonc` and update:
- `GOOGLE_REDIRECT_URI` → `https://auth.aivo.app/auth/callback/google`
- `FACEBOOK_REDIRECT_URI` → `https://auth.aivo.app/auth/callback/facebook`
- `WEB_APP_URL` → `https://app.aivo.app`
- `ALLOWED_ORIGINS` → `https://app.aivo.app,https://aivo.app`

### 3. Deploy

```bash
cd apps/services/auth
pnpm deploy
```

## OAuth Provider Setup

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable "OAuth 2.0 Client ID" under "APIs & Services > Credentials"
4. Configure authorized redirect URIs:
   - Development: `http://localhost:3001/auth/callback/google`
   - Production: `https://auth.aivo.app/auth/callback/google`
5. Copy Client ID and Client Secret to `.env.local`

### Facebook OAuth

1. Go to [Meta Developer Console](https://developers.facebook.com/)
2. Create a new app (Consumer type)
3. Add "Facebook Login" product
4. Configure valid OAuth redirect URIs:
   - Development: `http://localhost:3001/auth/callback/facebook`
   - Production: `https://auth.aivo.app/auth/callback/facebook`
5. Copy App ID and App Secret to `.env.local`

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `AUTH_JWT_PRIVATE_KEY` | Base64 encoded EC private key | Yes |
| `AUTH_JWT_PUBLIC_KEY` | Base64 encoded EC public key | Yes |
| `AUTH_JWT_ISSUER` | JWT issuer claim | Yes |
| `AUTH_JWT_AUDIENCE` | JWT audience claim | Yes |
| `AUTH_JWT_ACCESS_TOKEN_TTL` | Access token lifetime in seconds | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Yes |
| `GOOGLE_REDIRECT_URI` | Google OAuth callback URI | Yes |
| `FACEBOOK_CLIENT_ID` | Facebook OAuth app ID | Yes |
| `FACEBOOK_CLIENT_SECRET` | Facebook OAuth app secret | Yes |
| `FACEBOOK_REDIRECT_URI` | Facebook OAuth callback URI | Yes |
| `WEB_APP_URL` | Web application URL | Yes |
| `MOBILE_REDIRECT_URI` | Mobile deep link scheme | Yes |
| `ALLOWED_ORIGINS` | CORS allowed origins | Yes |

## Database

The service uses Cloudflare D1 (SQLite) with the following tables:

- `users` - User accounts
- `user_identities` - OAuth provider identities
- `roles` - System roles (user, admin)
- `user_roles` - User-role assignments
- `sessions` - User sessions
- `refresh_tokens` - Refresh token storage
- `email_verification_tokens` - Email verification tokens
- `audit_logs` - Security audit logs

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Apps                            │
│                    (Web / Mobile)                           │
└─────────────────────────┬───────────────────────────────────┘
                          │ OAuth / API
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      Auth Service                             │
│                   (Cloudflare Worker)                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │  OAuth  │  │   JWT   │  │ Sessions│  │  Admin  │    │
│  │ Routes  │  │ Service │  │  Tokens │  │  APIs   │    │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘    │
│       │              │              │              │         │
│       └──────────────┴──────────────┴──────────────┘      │
│                           │                                   │
│                    ┌──────▼──────┐                          │
│                    │   Database   │                          │
│                    │     (D1)     │                          │
│                    └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

## Security Features

- ✅ PKCE for OAuth flows
- ✅ JWT with asymmetric signing (ES256)
- ✅ Refresh token rotation with reuse detection
- ✅ Secure HttpOnly cookies
- ✅ Rate limiting
- ✅ Account status enforcement
- ✅ Audit logging
- ✅ Timing-safe comparisons
