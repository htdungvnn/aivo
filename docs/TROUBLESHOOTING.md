# Troubleshooting

Solutions to common AIVO development and deployment issues.

---

## Build Errors

### "cannot find module" or "file not found"

**Problem:** TypeScript can't resolve imports.

**Solution:**
```bash
# Clean and rebuild
pnpm run clean
pnpm run build

# Check import paths are correct
# Memory service imports use .ts extension:
import { Something } from "./module.ts";
```

### "Failed to resolve: @aivo/db"

**Problem:** Package not built or linked.

**Solution:**
```bash
# Build db package first
cd packages/db
pnpm build

# Or rebuild all
pnpm run build
```

### Rust/WASM Build Fails

**Problem:** `wasm-pack` or Rust toolchain issues.

**Solution:**
```bash
# Verify Rust installation
rustc --version  # Should be 1.70+
cargo --version

# Verify wasm-pack
wasm-pack --version

# Reinstall if needed
rustup update
cargo install wasm-pack

# Clean and rebuild compute package
cd packages/aivo-compute
cargo clean
pnpm run build
```

### "Target `wasm32-unknown-unknown` not installed"

**Solution:**
```bash
rustup target add wasm32-unknown-unknown
```

---

## Runtime Errors

### "OpenAI error: rate limit"

**Problem:** Too many API calls.

**Solution:**
- Add retry logic with exponential backoff
- Cache embeddings aggressively
- Batch requests where possible
- Upgrade OpenAI plan if needed

### "Memory service not available"

**Problem:** OpenAI API key missing or invalid.

**Solution:**
- Verify `OPENAI_API_KEY` is set in environment
- Check API key is valid and has credits
- Ensure no trailing spaces in key

### "Cannot find module 'react-is'"

**Problem:** Jest module resolution conflict.

**Solution:**
This was fixed in memory-service by using `tsconfig.test.json` with `rewriteRelativeImportExtensions: false`.

If it recurs:
- Verify `jest.config.js` has no `moduleNameMapper` interfering
- Clear Jest cache: `jest --clearCache`

---

## Database Issues

### "no such table: memoryNodes"

**Problem:** Migrations not applied.

**Solution:**
```bash
cd packages/db
pnpm run migrate:local  # Development
# OR
pnpm run migrate:remote # Production
```

### D1 Connection Fails

**Problem:** Database binding misconfigured.

**Solution:**

1. Verify database exists:
   ```bash
   wrangler d1 database list
   ```

2. Check `wrangler.toml`:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "aivo-db"
   database_id = "your-db-id"
   ```

3. Ensure binding name matches in code:
   ```typescript
   interface Env {
     DB: D1Database;  // Binding name must match wrangler.toml
   }
   ```

### Migrations Won't Apply

**Problem:** Migration SQL errors.

**Solution:**
```bash
# Check migration file syntax
cat packages/db/drizzle/migrations/0000_*.sql

# Apply with verbose output
wrangler d1 migrations apply aivo-db --local --verbose

# Rollback and reapply
wrangler d1 migrations apply aivo-db --local --rollback
```

---

## OAuth Issues

### Google OAuth "redirect_uri_mismatch"

**Problem:** OAuth client not configured for localhost.

**Solution:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Edit OAuth 2.0 Client
3. Add authorized JavaScript origin:
   ```
   http://localhost:3000   (Web)
   ```
4. Add authorized redirect URI:
   ```
   http://localhost:3000/login
   ```

For mobile, add package name and SHA-1 fingerprint.

### Facebook OAuth "App Not Setup"

**Problem:** Facebook app in development mode.

**Solution:**
1. Go to [Facebook Developers](https://developers.facebook.com/apps)
2. Switch app to "Live" mode
3. Or add test users in "Roles" section

### JWT Verification Fails

**Problem:** `AUTH_SECRET` mismatch or token expired.

**Solution:**
- Ensure `AUTH_SECRET` is same across all deployments
- Use a strong random key (32+ chars)
- Tokens expire after 7 days by default (refresh by re-login)

---

## Frontend Issues

### "Failed to fetch" or CORS errors

**Problem:** API URL incorrect or CORS blocking.

**Solution:**

1. Verify `NEXT_PUBLIC_API_URL` / `EXPO_PUBLIC_API_URL` is correct
2. For web, CORS headers should be set by API:
   ```typescript
   // In ai.ts
   router.post("/chat", async (c) => {
     c.header("Access-Control-Allow-Origin", "*");
   });
   ```

### Chat not showing memories

**Problem:** Memory service not returning context.

**Solution:**
1. Check API logs for memory errors
2. Verify `OPENAI_API_KEY` is set
3. Ensure user has memories stored:
   ```sql
   SELECT COUNT(*) FROM memoryNodes WHERE userId = 'user-123';
   ```
4. Test with `processConversationTurn` first to populate memories

### Mobile app crashes on startup

**Problem:** Native module not linked.

**Solution:**
```bash
cd apps/mobile
pnpm exec expo install -s  # Install all deps
pnpm exec expo start -c    # Clear cache
```

If using custom native modules:
```bash
pnpm exec expo prebuild
```

---

## Performance Issues

### Slow chat responses

**Problem:** Memory retrieval taking too long.

**Solution:**
1. Add database index on `memoryNodes(userId, createdAt)`
2. Reduce memory limit (default 100) in `enforceMemoryLimit()`
3. Implement `compressedContexts` caching
4. Warm embedding cache

### High API costs

**Problem:** Too many OpenAI calls.

**Solution:**
- Cache embeddings (already implemented)
- Limit fact extraction to important conversations
- Use `minConfidence` threshold to reduce stored facts
- Consider batch embedding generation

---

## Development Issues

### Port already in use

**Solution:**
```bash
# Find process using port
lsof -i :8788  # API
lsof -i :3000  # Web
lsof -i :8081  # Mobile

# Kill or change port
wrangler dev --port 8789
```

### Watchman issues (macOS)

**Problem:** Watchman watching too many files.

**Solution:**
```bash
# Clear watchman watches
watchman watch-del-all

# Add ignore patterns (in .watchmanconfig)
{
  "ignore_dirs": ["node_modules", ".git", "dist", "build"]
}
```

---

## Deployment Issues

### Wrangler build fails

**Problem:** Missing bindings or config.

**Solution:**
```bash
# Verify wrangler.toml
cat apps/api/wrangler.toml

# Should have:
# [vars]
# OPENAI_API_KEY = "..."
#
# [[d1_databases]]
# binding = "DB"
# database_name = "aivo-db"
# database_id = "..."
```

### Migration fails on production

**Problem:** SQL syntax error or constraint violation.

**Solution:**
1. Check migration is idempotent (can run multiple times)
2. Test migration locally first:
   ```bash
   wrangler d1 migrations apply aivo-db --remote
   ```
3. Backup database before applying:
   ```bash
   wrangler d1 export aivo-db --output backup.sql
   ```

### Web build fails on Vercel

**Problem:** Missing environment variables.

**Solution:**
1. Check Vercel Environment Variables dashboard
2. Ensure `NEXT_PUBLIC_` prefix for client-exposed vars
3. Redeploy after adding vars

---

## TypeScript Errors

### "Property 'xxx' does not exist on type 'DrizzleD1Database'"

**Problem:** Using wrong Drizzle import.

**Solution:**
```typescript
// Correct import from @aivo/db
import { createDrizzleInstance } from "@aivo/db";

// Not this:
import { drizzle } from "drizzle-orm/d1"; // Wrong, use createDrizzleInstance

const db = createDrizzleInstance(env.DB);
```

### "Cannot find module '@aivo/memory-service'"

**Problem:** Package not built.

**Solution:**
```bash
cd packages/memory-service
pnpm build
```

---

## Debug Commands

### View API Logs (Cloudflare)

```bash
cd apps/api
pnpm exec wrangler tail
```

### Check Database Locally

```bash
cd packages/db
pnpm run studio  # Opens Drizzle Studio at http://localhost:4983
```

### Test OpenAI Connection

```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Inspect WASM

```bash
cd packages/aivo-compute
wasm-objdump -x pkg/aivo_compute_bg.wasm | head -50
```

---

## Getting More Help

1. **Check logs** - Most errors are in wrangler tail or browser console
2. **Search issues** - Check existing GitHub issues
3. **Create issue** - Include:
   - Steps to reproduce
   - Error logs
   - Environment details (OS, Node version)
   - Relevant code snippets

---

## Common Quick Fixes

| Symptom | Likely Fix |
|---------|-----------|
| "module not found" | `pnpm run build` all packages |
| Port conflict | `kill -9 $(lsof -t -i:8788)` |
| Stale cache | `pnpm store prune && rm -rf node_modules/.cache` |
| WASM not loading | Ensure HTTPS or localhost |
| DB locked | Delete `.wrangler/state/d1` and restart |
| Auth failing | Verify `AUTH_SECRET` and re-login |

---

**Still stuck?** Create an issue with details.

---

**Last Updated:** 2026-04-22  
**Maintainer:** AIVO Team
