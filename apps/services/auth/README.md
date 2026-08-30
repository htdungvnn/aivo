# AIVO Authentication Service

Production-ready authentication and authorization system for AIVO, built on Cloudflare Workers.

## Features

- **OAuth 2.0 with PKCE**: Google and Facebook login flows
- **JWT Access Tokens**: Short-lived (15 min), asymmetrically signed
- **Rotating Refresh Tokens**: 30-day lifetime with reuse detection
- **Session Management**: Track and revoke sessions across devices
- **RBAC Authorization**: User and admin roles
- **Email Verification**: Secure verification flow
- **Audit Logging**: Track authentication events

## Architecture

```
apps/services/auth/
├── src/
│   ├── db/           # Database queries and migrations
│   ├── lib/          # JWT and token services
│   ├── middleware/    # Auth and request middleware
│   ├── providers/    # OAuth providers (Google, Facebook)
│   ├── routes/       # API endpoints
│   ├── services/     # Business logic
│   ├── types/        # TypeScript types
│   └── utils/        # Cryptographic utilities
├── drizzle/          # SQL migrations
└── test/             # Vitest tests
```

## API Endpoints

### OAuth
- `POST /oauth/start` - Start OAuth flow
- `GET /oauth/callback/:provider` - Handle OAuth callback (web)
- `POST /oauth/mobile/callback` - Handle mobile OAuth callback

### Authentication
- `GET /auth/me` - Get current user
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout current session
- `POST /auth/logout-all` - Logout all sessions

### Verification
- `POST /verification/send` - Send verification email
- `POST /verification/verify` - Verify email token

### Sessions
- `GET /sessions` - List user sessions
- `DELETE /sessions/:sessionId` - Revoke session
- `DELETE /sessions` - Revoke all sessions except current

### Account
- `GET /account` - Get account info
- `DELETE /account` - Soft delete account

### Admin
- `GET /admin/users/:userId` - Get user info
- `POST /admin/users/:userId/suspend` - Suspend user
- `POST /admin/users/:userId/reactivate` - Reactivate user
- `POST /admin/users/:userId/roles` - Assign role
- `DELETE /admin/users/:userId/roles/:role` - Remove role

## Database Schema

### Tables
- `users` - User accounts
- `user_identities` - OAuth identities
- `roles` - System roles
- `user_roles` - User-role assignments
- `sessions` - User sessions
- `refresh_tokens` - Refresh token storage
- `email_verification_tokens` - Email verification tokens
- `audit_logs` - Audit log entries

## Setup

### 1. Generate JWT Keys

```bash
# Generate EC P-256 key pair
openssl ecparam -genkey -name prime256v1 -noout -out private.pem
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in private.pem -out private.pem8
openssl ec -in private.pem -pubout -out public.pem

# Convert to base64 for environment variables
cat private.pem8 | base64
cat public.pem | base64
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in:
- JWT keys (base64 encoded)
- OAuth credentials from Google/Facebook developer consoles
- Application URLs

### 3. Run Migrations

```bash
# Local D1 database
wrangler d1 create aivo-auth-db
wrangler d1 migrations apply aivo-auth-db --local

# Or use existing database ID
wrangler d1 migrations apply AUTH_D1_DATABASE_ID --remote
```

### 4. Deploy

```bash
pnpm deploy
```

## Development

```bash
# Start local development server
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## Security Features

- **PKCE**: Proof Key for Code Exchange on all OAuth flows
- **Token Rotation**: Refresh tokens rotate on each use
- **Reuse Detection**: Detects and blocks stolen refresh tokens
- **Secure Cookies**: HttpOnly, SameSite, Secure flags
- **Rate Limiting**: Per-IP and per-endpoint limits
- **Auth Version**: Invalidates tokens on account changes
- **Audit Logging**: Tracks all security-relevant events

## User Status Flow

```
pending_verification → active (after email verification)
                   ↘
                 suspended (by admin)
                   ↓
               deleted (soft delete)
```

## Future Extensions

The system is designed to support:

- [ ] Password authentication
- [ ] Apple Sign In
- [ ] Passkeys/WebAuthn
- [ ] Multi-factor authentication (MFA)
- [ ] Permissions (not just roles)
- [ ] Organizations/tenants
- [ ] Subscription plans
- [ ] Coach and Doctor features
