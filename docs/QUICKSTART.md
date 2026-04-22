# Quick Start Guide

Get AIVO up and running locally in 15 minutes.

## Prerequisites

Install these tools before starting:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **pnpm** 9+ (`npm install -g pnpm`)
- **Rust** ([rustup.rs](https://rustup.rs/))
- **wasm-pack** (`cargo install wasm-pack`)
- **Wrangler CLI** (`npm install -g wrangler`)
- **Git**

---

## 1. Clone & Install

```bash
git clone <your-repo-url>
cd aivo
pnpm install
```

This installs all dependencies across the monorepo.

---

## 2. Environment Setup

### API (`apps/api/.env`)

```env
# Cloudflare Workers
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_D1_DATABASE_ID=aivo-db

# OpenAI (required)
OPENAI_API_KEY=sk-your-openai-key

# Optional: OAuth (for testing)
# Get from Google Cloud Console / Facebook Developers
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_secret
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_secret

# JWT secret (generate random string)
AUTH_SECRET=your-secret-key-min-32-chars
```

### Web (`apps/web/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8788
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

### Mobile (`apps/mobile/.env`)

```env
EXPO_PUBLIC_API_URL=http://localhost:8788
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
EXPO_PUBLIC_FACEBOOK_CLIENT_ID=your_facebook_app_id
```

---

## 3. Database Setup

### Start Local D1 Database

```bash
cd packages/db
pnpmx wrangler d1 migrations apply aivo-db --local
```

Or use the convenience script:

```bash
./scripts/setup-db.sh
```

### Verify Tables

```bash
cd packages/db
pnpm run studio
```

Open `http://localhost:4983` to view database.

---

## 4. Build All Packages

```bash
# From monorepo root
pnpm run build
```

This builds in dependency order:
1. `@aivo/compute` (Rust → WASM)
2. `@aivo/db` (schema & migrations)
3. `@aivo/api` (Cloudflare Workers)
4. `@aivo/web` (Next.js)
5. `@aivo/mobile` (Expo)

---

## 5. Start Development Servers

Open three terminal windows:

**Terminal 1 - API (Cloudflare Workers Dev):**

```bash
cd apps/api
pnpmx wrangler dev
# Running on http://localhost:8788
```

**Terminal 2 - Web (Next.js):**

```bash
cd apps/web
pnpm run dev
# Running on http://localhost:3000
```

**Terminal 3 - Mobile (Expo):**

```bash
cd apps/mobile
pnpmx expo start
# Opens Expo DevTools
# Press 'i' for iOS simulator, 'a' for Android emulator
```

---

## 6. Verify Installation

### Health Check

```bash
curl http://localhost:8788/health
# Expected: {"status":"ok"}
```

### Test Chat (without auth first)

The API requires authentication. Get a test token:

```bash
# Use Google OAuth or create a test user via DB
# For local dev, you can mock auth or add test user manually
```

### Create Test User

```bash
cd packages/db
sqlite3 .wrangler/state/d1/DBNAME.db

INSERT INTO users (id, email, name, createdAt, updatedAt)
VALUES ('user-123', 'test@example.com', 'Test User', 1700000000000, 1700000000000);
```

---

## 7. Common Issues

### Wrangler Dev Won't Start

```bash
# Clear Wrangler state
rm -rf .wrangler
wrangler dev
```

### Port Already in Use

```bash
# Change port
wrangler dev --port 8789
```

### WASM Not Loading (Web)

Ensure `NEXT_PUBLIC_API_URL` is correct and API is running. WASM loads from `/` by default.

### Database Connection Failed

Check D1 database exists:

```bash
wrangler d1 database list
```

Verify `wrangler.toml` has correct database ID in `[[d1_databases]]`.

### TypeScript Errors

```bash
# Clean and rebuild
pnpm run clean
pnpm run build
```

---

## 8. Run Tests

```bash
# All packages
pnpm run test

# Specific package
pnpm --filter @aivo/memory-service test
pnpm --filter @aivo/api test
pnpm --filter @aivo/web test
pnpm --filter @aivo/mobile test

# Type check
pnpm run type-check

# Lint
pnpm run lint
```

---

## 9. Project Structure

```
aivo/
├── apps/
│   ├── api/          # Cloudflare Workers (Hono)
│   ├── web/          # Next.js 15
│   └── mobile/       # Expo (React Native)
├── packages/
│   ├── aivo-compute/ # Rust WASM
│   ├── db/           # Drizzle schema & migrations
│   ├── memory-service/ # Semantic memory (built)
│   └── shared-types/ # TypeScript types
├── docs/             # Documentation
├── scripts/          # Build/deploy scripts
└── package.json      # Root (Turborepo)
```

---

## 10. Next Steps

1. **Set up OAuth** - Create Google/Facebook OAuth apps
2. **Add sample data** - Create workouts, routines, body metrics
3. **Test chat** - Send messages to AI coach
4. **Deploy** - Follow [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## Need Help?

- **Documentation:** See `/docs` folder
- **Issues:** Check [Troubleshooting](./TROUBLESHOOTING.md)
- **Community:** [GitHub Issues](https://github.com/your-repo/issues)

---

**Happy Training! 💪**

---

**Last Updated:** 2026-04-22  
**Minimum Requirements:** Node 18, Rust 1.70, pnpm 9
