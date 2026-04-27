# Security Best Practices Guide for AIVO Developers

**Purpose:** This guide provides actionable security practices for all AIVO developers. Following these guidelines is mandatory for maintaining platform security.

**Audience:** All engineers working on AIVO Web, Mobile, or API codebases  
**Last Updated:** April 27, 2025  
**Enforcement:** Automated checks in CI + code review requirements

---

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Input Validation](#input-validation)
3. [Output Encoding & Injection Prevention](#output-encoding--injection-prevention)
4. [Cryptography & Secrets](#cryptography--secrets)
5. [API Security](#api-security)
6. [Database Security](#database-security)
7. [Mobile Security](#mobile-security)
8. [Web Security](#web-security)
9. [Error Handling & Logging](#error-handling--logging)
10. [Dependencies](#dependencies)
11. [Testing Security](#testing-security)
12. [CI/CD Security](#cicd-security)
13. [Security Checklist for PRs](#security-checklist-for-prs)
14. [Incident Response](#incident-response)

---

## 1. Authentication & Authorization

### 1.1 Never Implement Password Authentication

AIVO uses OAuth 2.0 exclusively. **Do NOT** add password-based authentication.

✅ **Correct:**
```typescript
// Use OAuth via our API endpoints
const response = await fetch(`${API_URL}/api/auth/google`, {
  method: 'POST',
  body: JSON.stringify({ token: googleIdToken })
});
```

❌ **Wrong:**
```typescript
// Never do this
const response = await fetch(`${API_URL}/api/auth/login`, {
  method: 'POST',
  body: JSON.stringify({ email, password }) // No passwords!
});
```

### 1.2 Protect API Endpoints

**All API routes must enforce authentication:**

```typescript
// GOOD - Apply auth middleware
router.get("/me", async (c) => {
  const authUser = getUserFromContext(c); // Throws if not authenticated
  // ... handle request
});

// BAD - No authentication
router.get("/me", async (c) => {
  // This is publicly accessible - BAD!
  const userId = c.req.header("X-User-Id"); // Client-controlled
});
```

### 1.3 Authorization Checks

**Users can only access their own data:**

```typescript
// ALWAYS verify ownership
router.get("/:id", async (c) => {
  const authUser = getUserFromContext(c);
  const requestedId = c.req.param("id");

  if (authUser.id !== requestedId) {
    throw new ForbiddenError("Cannot access other users' data");
  }

  // Now safe to query
  const user = await drizzle.query.users.findFirst({
    where: eq(users.id, requestedId)
  });
  return c.json(user);
});
```

**Exception:** Admin endpoints (future) will have role-based access control.

### 1.4 Session Management

**Web: Use httpOnly cookies** (already handled by auth middleware):
```typescript
// App side: Send token to set-cookie endpoint
await fetch(`${API_URL}/api/auth/set-session`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  credentials: 'include' // Required for cookies
});

// Browser automatically sends cookies on subsequent requests
// No need to manually attach Authorization header
```

**Mobile: Use SecureStore:**
```typescript
import * as SecureStore from 'expo-secure-store';

// Store
await SecureStore.setItemAsync('aivo_token', token);

// Retrieve
const token = await SecureStore.getItemAsync('aivo_token');
```

**Never store tokens in:**
- ❌ `localStorage` or `sessionStorage` (XSS vulnerable)
- ❌ `AsyncStorage` (unencrypted)
- ❌ In-memory only (lost on app restart)

---

## 2. Input Validation

### 2.1 Validate ALL User Input

Use Zod schemas for every endpoint that accepts user data:

```typescript
import { z } from "zod";

// Define schema
const CreateWorkoutSchema = z.object({
  type: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  duration: z.number().int().positive().optional(),
  caloriesBurned: z.number().nonnegative().optional(),
  exercises: z.array(z.object({
    name: z.string().min(1),
    sets: z.number().int().positive(),
    reps: z.number().int().positive(),
    weight: z.number().nonnegative().optional(),
  })).optional(),
});

// Use in endpoint
router.post("/workouts", async (c) => {
  const body = await c.req.json();
  const validated = CreateWorkoutSchema.parse(body); // Throws ValidationError if invalid
  // validated is now type-safe
  await createWorkout(validated);
});
```

### 2.2 Common Validation Patterns

**Strings:**
```typescript
z.string()
  .min(1, "Required")
  .max(255, "Too long")
  .regex(/^[a-zA-Z0-9\s-_]*$/, "Invalid characters") // If needed
```

**Numbers:**
```typescript
z.number()
  .int("Must be integer")
  .positive("Must be positive")
  .min(0, "Cannot be negative")
  .max(1000, "Too large")
```

**Dates:**
```typescript
z.string().datetime("Invalid date format") // ISO 8601
// OR
z.number().int("Unix timestamp expected")
```

**Arrays:**
```typescript
z.array(z.string()).max(50, "Too many items")
z.array(z.object({ /* ... */ })).nonempty("At least one required")
```

### 2.3 Sanitize Before Database

Even with parameterized queries, validate data ranges:

```typescript
// Prevent absurd values
if (age < 13 || age > 120) {
  throw new ValidationError("Age must be between 13 and 120");
}

if (weight < 20 || weight > 300) {
  throw new ValidationError("Weight seems unreasonable");
}
```

---

## 3. Output Encoding & Injection Prevention

### 3.1 Never Build SQL with String Concatenation

✅ **ALWAYS use Drizzle ORM:**
```typescript
const user = await drizzle.query.users.findFirst({
  where: eq(users.id, userId) // Parameterized
});
```

❌ **NEVER do this:**
```typescript
// DANGEROUS - SQL injection vulnerability
const query = `SELECT * FROM users WHERE id = '${userId}'`;
const result = await drizzle.execute(query); // UNSAFE!
```

### 3.2 Escape HTML in Dynamic Content

**Web:** React auto-escapes by default. Only use `dangerouslySetInnerHTML` as last resort:
```typescript
// BAD - vulnerable to XSS
<div dangerouslySetInnerHTML={{ __html: userComment }} />

// GOOD - React escapes automatically
<div>{userComment}</div>

// If you MUST use HTML, sanitize first:
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userComment) }} />
```

**API JSON responses:** Automatically escaped by JSON.stringify(). No action needed.

---

## 4. Cryptography & Secrets

### 4.1 Never Hardcode Secrets

❌ **Wrong:**
```typescript
const API_KEY = "sk-proj-abc123..."; // In source code
const SECRET = "my-secret-key-123"; // Committed to git
```

✅ **Correct:**
```typescript
// Use environment variables from Cloudflare Secrets
const secret = process.env.AUTH_SECRET; // Set via wrangler secret put
if (!secret) {
  throw new Error("AUTH_SECRET environment variable required");
}
```

### 4.2 Generate Strong Secrets

**For JWT signing:**
```bash
# Generate 64 random bytes (128 hex chars)
openssl rand -hex 64

# Example output: a3f5c8e2b1d4... (128 characters)
```

**Minimum requirements:**
- AUTH_SECRET: 64+ random hex characters (256 bits)
- Use cryptographically secure random generator
- Never use passwords, dictionary words, or predictable strings

### 4.3 Secret Rotation

**How to rotate AUTH_SECRET:**

1. Generate new secret: `openssl rand -hex 64`
2. Set as secondary secret in code temporarily
3. Deploy - accepts both old and new secrets
4. Wait 7 days (all existing tokens expire)
5. Remove old secret, keep only new
6. Repeat quarterly

---

## 5. API Security

### 5.1 Rate Limiting is Mandatory

**All public endpoints need rate limiting:**

```typescript
// Apply to route or router
router.post("/login", async (c, next) => {
  await applyRateLimit(c, 5, 15 * 60 * 1000); // 5 per 15min
  await next();
});
```

**Rate limit by user (authenticated) or IP (unauthenticated):**
```typescript
const userId = c.req.header("X-User-Id") || c.req.header("cf-connecting-ip") || "anonymous";
// ⚠️ Don't trust X-User-Id header - extract from JWT instead!
const authUser = getUserFromContext(c);
const identifier = authUser?.id || c.req.header("cf-connecting-ip");
```

### 5.2 Standardized Error Responses

**Use the APIError class:**
```typescript
import { APIError, ValidationError, AuthError, NotFoundError } from "./utils/errors";

// Throw errors
throw new ValidationError("Invalid input", { field: "email" });
throw new AuthError("Invalid credentials");
throw new NotFoundError("User");

// Error handler middleware catches and formats
```

**Never leak internal details:**
```typescript
// BAD - exposes database structure
return c.json({ error: "User not found in database users table" }, 404);

// GOOD - Generic message
throw new NotFoundError("User");
```

### 5.3 CORS Configuration

**Production MUST specify exact origins:**
```typescript
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") ?? [];

if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
  throw new Error("ALLOWED_ORIGINS must be set in production");
}

app.use("*", cors({
  origin: allowedOrigins, // NEVER use "*" with credentials
  credentials: true,
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
}));
```

---

## 6. Database Security

### 6.1 Use Drizzle for All Queries

**✅ ALWAYS use Drizzle ORM:**
```typescript
import { eq } from "drizzle-orm";
import { users } from "@aivo/db";

const user = await drizzle.query.users.findFirst({
  where: eq(users.id, userId) // Safe parameterized query
});
```

**❌ NEVER use raw SQL:**
```typescript
// UNSAFE - SQL injection risk
const query = `SELECT * FROM users WHERE id = '${userId}'`;
```

### 6.2 Select Only Needed Columns

```typescript
// GOOD - Only fetch what you need
const user = await drizzle.query.users.findFirst({
  where: eq(users.id, userId),
  columns: { id: true, email: true, name: true } // Exclude sensitive fields
});

// BAD - Select all (may include sensitive data)
```

### 6.3 Database Migrations

**Generate migrations for schema changes:**
```bash
cd packages/db
pnpm exec drizzle-kit generate
pnpm exec drizzle-kit migrate
```

**Review migrations for security:**
- Index sensitive fields used in WHERE clauses
- Add constraints (NOT NULL, UNIQUE) where appropriate
- Don't store plaintext sensitive data (use encryption if needed)

---

## 7. Mobile Security

### 7.1 Secure Token Storage

**✅ ALWAYS use expo-secure-store:**
```typescript
import * as SecureStore from 'expo-secure-store';

await SecureStore.setItemAsync('aivo_token', token, {
  keychainAccessible: SecureStore.WHEN_UNLOCKED // iOS only
});
```

**❌ NEVER use AsyncStorage for tokens:**
```typescript
// UNSAFE - stored in plaintext
await AsyncStorage.setItem('aivo_token', token);
```

### 7.2 Certificate Pinning (Production)

**Prevent man-in-the-middle attacks:**

```typescript
// Install: expo install expo-network
import * as Network from 'expo-network';

const isSecureConnection = await Network.isAsyncLocalhostAvailable();
// Add custom certificate validation in native code
```

**Recommended:** Implement native certificate pinning for release builds using:
- iOS: `URLSession` with pinning
- Android: `NetworkSecurityConfig` with pinsets

### 7.3 OAuth Flow Must Use PKCE

**See OAuth Security Review for full implementation.** Summary:

```typescript
// 1. Generate code verifier before OAuth
const codeVerifier = generateRandomCodeVerifier(); // 43-128 chars
const codeChallenge = await base64UrlEncode(sha256(codeVerifier));

// 2. Store verifier securely
await SecureStore.setItemAsync('oauth_code_verifier', codeVerifier);

// 3. Open auth URL with code_challenge parameter
const authUrl = `${API_URL}/api/auth/google?code_challenge=${codeChallenge}&state=${state}`;

// 4. On callback, exchange code (NOT token in URL)
const code = url.searchParams.get('code');
const response = await fetch(`${API_URL}/api/auth/google/exchange`, {
  body: JSON.stringify({ code, code_verifier: await SecureStore.getItemAsync('oauth_code_verifier') })
});
```

---

## 8. Web Security

### 8.1 Content Security Policy (CSP)

**Current CSP is too permissive.** Work with security team to tighten:

```typescript
// next.config.cloudflare.js headers()
{
  key: 'Content-Security-Policy',
  value: "default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'nonce-${nonce}'; img-src 'self' data: https:; connect-src 'self' https://api.aivo.website"
}
```

**Remove:**
- ❌ `'unsafe-inline'` - use nonces instead
- ❌ `'unsafe-eval'` - avoid eval() and new Function()

### 8.2 XSS Protection

**React provides auto-escaping. But be careful:**

```typescript
// BAD - vulnerable
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// GOOD - use when HTML needed
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userContent, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong'] });
<div dangerouslySetInnerHTML={{ __html: clean }} />
```

### 8.3 CSRF Protection

**Even with SameSite=Strict, add CSRF tokens for defense-in-depth:**

```typescript
// On page load, generate CSRF token
const csrfToken = crypto.randomUUID();
document.cookie = `csrf_token=${csrfToken}; SameSite=Strict; Path=/`;

// Include in state-changing requests
fetch('/api/workouts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  body: JSON.stringify(workout)
});

// Server validates token matches cookie
```

---

## 9. Error Handling & Logging

### 9.1 Never Leak Sensitive Data in Errors

❌ **Wrong:**
```typescript
try {
  const user = await drizzle.query.users.findFirst({ ... });
} catch (error) {
  console.error("Database error:", error); // May leak query with data
  return c.json({ error: error.message }, 500); // Exposes internal details
}
```

✅ **Correct:**
```typescript
try {
  const user = await drizzle.query.users.findFirst({ ... });
} catch (error) {
  // Log sanitized error (no PII, no tokens)
  console.error("Database query failed", {
    error: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  });

  // Return generic message to user
  throw new APIError(500, "DATABASE_ERROR", "Failed to fetch user");
}
```

### 9.2 Structured Logging

**Use JSON logs in production:**
```typescript
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: "info",
  requestId: c.req.header("X-Request-Id"),
  userId: authUser?.id,
  action: "user_login",
  success: true,
}));
```

**Never log:**
- ❌ JWT tokens
- ❌ Passwords
- ❌ OAuth access tokens
- ❌ Full request bodies (may contain PII)
- ❌ API keys or secrets

---

## 10. Dependencies

### 10.1 Keep Dependencies Updated

```bash
# Check for vulnerabilities weekly
pnpm audit

# Update dependencies monthly (at minimum)
pnpm update --latest
```

**Critical vulnerabilities must be patched within 48 hours.**

### 10.2 Review New Dependencies

**Before adding a new package:**
1. Check npm for known vulnerabilities: `npm audit <package>`
2. Review package size (keep bundle small)
3. Check maintenance status (last commit, open issues)
4. Verify license is compatible (MIT, Apache 2.0, BSD)
5. Consider if functionality can be built with existing deps

**Red flags:**
- ❌ Last commit >1 year ago (abandoned)
- ❌ >50 open vulnerabilities
- ❌ Unusual license (GPL without commercial compatibility)
- ❌ No tests or poor test coverage

---

## 11. Testing Security

### 11.1 Required Test Cases

**Authentication tests:**
```typescript
describe("Authentication", () => {
  it("rejects invalid JWT", async () => {
    const res = await fetch("/api/protected", {
      headers: { Authorization: "Bearer invalid-token" }
    });
    expect(res.status).toBe(401);
  });

  it("rejects access to other users' data", async () => {
    const userA = await loginAs("userA");
    const res = await fetch(`/api/users/${userB.id}`, {
      headers: { Authorization: `Bearer ${userA.token}` }
    });
    expect(res.status).toBe(403);
  });
});
```

**Rate limiting tests:**
```typescript
it("rate limits after 5 failed login attempts", async () => {
  for (let i = 0; i < 5; i++) {
    await loginWithInvalidToken();
  }
  const res = await loginWithInvalidToken();
  expect(res.status).toBe(429);
});
```

**Validation tests:**
```typescript
it("rejects oversized request body", async () => {
  const hugeBody = "x".repeat(11 * 1024 * 1024); // 11MB
  const res = await fetch("/api/endpoint", {
    method: "POST",
    body: hugeBody
  });
  expect(res.status).toBe(413);
});
```

---

## 12. CI/CD Security

### 12.1 Pre-commit Hooks

**Install pre-commit hooks:**
```bash
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
```

**This prevents:**
- Committing API keys
- Committing AUTH_SECRET
- Committing database URLs

### 12.2 CI Security Scanning

**GitHub Actions must include:**
```yaml
- name: Run security audit
  run: pnpm audit --audit-level=high

- name: Run Snyk scan
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

**Build must fail on:**
- ❌ High or critical vulnerabilities
- ❌ Secret detection findings
- ❌ TypeScript type errors (already enforced)

---

## 13. Security Checklist for PRs

**Reviewers must verify:**

### Authentication & Authorization
- [ ] All API endpoints have authentication (if needed)
- [ ] Authorization checks prevent horizontal privilege escalation
- [ ] No hardcoded secrets or credentials
- [ ] OAuth flows use best practices (PKCE, state)

### Input Validation
- [ ] All user inputs validated with Zod schemas
- [ ] No string concatenation for SQL queries
- [ ] File uploads validated (type, size, content)
- [ ] Request size limits enforced

### Data Protection
- [ ] Sensitive data not logged
- [ ] PII encrypted at rest (if applicable)
- [ ] HTTPS enforced (HSTS header)
- [ ] Secure cookie flags (HttpOnly, Secure, SameSite)

### API Security
- [ ] Rate limiting applied
- [ ] CORS configured correctly (no wildcard with credentials)
- [ ] Error messages don't leak information
- [ ] Request timeouts set

### Mobile/Web Specific
- [ ] Tokens stored in SecureStore/httpOnly cookies (not localStorage)
- [ ] CSP configured (no 'unsafe-inline')
- [ ] No XSS vulnerabilities in dynamic content
- [ ] CSRF tokens for state changes

### Testing
- [ ] Security test cases added
- [ ] Negative tests (invalid input, auth failures)
- [ ] Integration tests cover auth flows

---

## 14. Incident Response

### 14.1 If You Discover a Security Issue

**Immediate Steps:**

1. **DO NOT** create a public issue or discuss in public channels
2. **DO** notify the security team immediately:
   - Email: security@aivo.fitness
   - Slack: #security-alerts (private channel)
3. **DO** document what you found, how to reproduce, and potential impact
4. **DO** fix the issue if it's trivial (with security team review)
5. **DO** rotate any exposed secrets immediately

### 14.2 Severity Classification

| Severity | Response Time | Example |
|----------|---------------|---------|
| **CRITICAL** | < 1 hour | Data breach, RCE, credential theft |
| **HIGH** | < 4 hours | Auth bypass, SQLi, XSS in admin area |
| **MEDIUM** | < 24 hours | Information disclosure, CSRF, rate limit bypass |
| **LOW** | < 72 hours | Missing security headers, weak configs |

### 14.3 Security Event Template

When reporting, include:

```markdown
## Security Incident Report

**Title:** [Brief description]

**Severity:** [CRITICAL/HIGH/MEDIUM/LOW]

**Summary:** [1-2 sentence overview]

**Affected Components:**
- [ ] API endpoint: /api/auth/login
- [ ] Database: sessions table
- [ ] Mobile: Android app OAuth flow

**Attack Vector:** [How can this be exploited?]

**Impact:**
- Data exposure: [What data can be accessed?]
- Privilege escalation: [Can attacker gain admin?]
- Service disruption: [Can attacker DoS?]

**Reproduction Steps:**
1. [Step 1]
2. [Step 2]
3. [Expected vs Actual]

**Recommended Fix:**
[Quick mitigation if known]

**References:**
[CVEs, OWASP IDs, similar vulns]
```

---

## 15. Resources

### Internal Documentation
- [Security Policy](../docs/SECURITY_POLICY.md)
- [OAuth Security Review](../docs/OAUTH_SECURITY_REVIEW.md)
- [Privacy Policy](../docs/PRIVACY_POLICY_TEMPLATE.md)
- [Terms of Service](../docs/TERMS_OF_SERVICE_TEMPLATE.md)

### External References
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OAuth 2.0 Best Practices](https://tools.ietf.org/html/rfc6819)
- [Google OAuth Security](https://developers.google.com/identity/protocols/oauth2)
- [React Security](https://react.dev/learn/escape-hatches)
- [Drizzle Security](https://orm.drizzle.team/docs/get-started)

### Tools
- `pnpm audit` - Check for vulnerable dependencies
- `trufflehog` - Scan for secrets in git history
- `snyk` - Continuous security monitoring
- `eslint-plugin-security` - Linting for security issues

---

## Appendix: Common Pitfalls

### Pitfall 1: "I'll add security later"

**Wrong:** "We'll add rate limiting in v2.0"  
**Right:** Security is non-negotiable. Implement from day 1.

### Pitfall 2: "It's internal, no need for auth"

**Wrong:** "This endpoint is only used by our frontend, so no auth needed."  
**Right:** All endpoints must authenticate. Anyone can call your API directly.

### Pitfall 3: "OAuth provider validates, so we're safe"

**Wrong:** "Google verified the token, so we don't need to check anything else."  
**Right:** Always verify:
- Token signature
- Issuer (`iss` claim)
- Audience (`aud` claim)
- Expiration (`exp` claim)
- Session exists in database

### Pitfall 4: "Error messages help users"

**Wrong:** Returning `"User not found in table users at row 123"`  
**Right:** Return `"User not found"` and log details server-side.

### Pitfall 5: "I'm just testing, I'll remove it"

**Wrong:** `console.log(JSON.stringify(user))` left in code  
**Right:** Never log PII. Use environment-scoped logging:
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log(user); // Only in dev
}
```

---

**Questions?** Contact security@aivo.fitness or #security Slack channel  
**Report Vulnerabilities:** security@aivo.fitness (PGP key available)

---

*This guide is living documentation. Update when security practices evolve.*
