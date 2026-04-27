# AIVO Security Policy

## 1. Overview

This Security Policy establishes the mandatory security standards for the AIVO fitness platform. All developers, contractors, and third parties with access to AIVO systems must adhere to these requirements.

**Effective Date:** April 27, 2025  
**Last Updated:** April 27, 2025  
**Owner:** Security Team  
**Classification:** Confidential

---

## 2. Scope

This policy applies to:
- All AIVO software applications (Web, Mobile, API)
- All infrastructure components (Cloudflare Workers, D1, R2, KV)
- All development, staging, and production environments
- All employees, contractors, and third-party vendors with system access

---

## 3. Security Principles

### 3.1 Defense in Depth
Multiple security layers must protect all systems:
1. Edge security (Cloudflare WAF, DDoS protection)
2. Network security (VPC isolation, private networking)
3. Application security (authZ, validation, encryption)
4. Data security (encryption at rest and in transit)
5. Operational security (monitoring, logging, incident response)

### 3.2 Least Privilege
- Users and systems receive only the minimum access necessary
- Database queries use parameterized statements exclusively
- API endpoints enforce strict authorization checks
- Service accounts have scoped permissions only

### 3.3 Zero Trust
- Never trust, always verify
- All requests must authenticate and authorize
- Session validation on every request
- Continuous monitoring for anomalies

---

## 4. Authentication & Authorization

### 4.1 OAuth Implementation

**Required Standards:**
- **Providers:** Google OAuth 2.0 and Facebook Login only
- **Token Type:** JWT with HS256 signing
- **Token Lifetime:** Maximum 7 days for access tokens
- **Session Storage:** httpOnly, Secure, SameSite=Strict cookies for web
- **Mobile Storage:** Platform secure storage (iOS Keychain, Android Keystore)

**Implementation Requirements:**
```typescript
// Mandatory cookie settings for production
Set-Cookie: auth_token=<token>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800
```

**Prohibited Practices:**
- ❌ Storing JWT in localStorage or sessionStorage (XSS risk)
- ❌ Using implicit OAuth flow (use authorization code flow)
- ❌ Including sensitive data in URL parameters
- ❌ Disabling SSL verification in development

### 4.2 JWT Security

**Signing Requirements:**
- Algorithm: HS256 (AES-256 for symmetric)
- Minimum secret key length: 32 characters (256 bits)
- Secrets must use cryptographically random generation
- Rotate secrets quarterly or after security incidents

**JWT Payload Structure:**
```json
{
  "sub": "session-uuid",
  "userId": "user-uuid",
  "iat": 1714234800,
  "exp": 1714839600
}
```

**Verification:**
- Verify signature on every request
- Check expiration (`exp`) claim
- Validate session exists in database
- Reject tokens with invalid or missing claims

### 4.3 Passwordless Authentication

AIVO uses OAuth exclusively. No password-based authentication is permitted.

---

## 5. Transport Security

### 5.1 TLS Requirements

**Minimum TLS Version:** 1.3  
**Cipher Suites:** AEAD-only (AES-GCM, ChaCha20-Poly1305)

**HSTS Configuration:**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Certificate Management:**
- Use Cloudflare-managed certificates
- Enable automatic renewal
- Monitor certificate expiration (alert at 30 days)
- Consider certificate pinning for mobile apps

---

## 6. Data Protection

### 6.1 Encryption at Rest

**Required Encryption:**
- Cloudflare D1 database: AES-256 (automatic)
- Cloudflare R2 storage: AES-256 (automatic)
- Sensitive fields (access tokens, health data): Application-level encryption

**Key Management:**
- Use Cloudflare Secrets for encryption keys
- Never hardcode keys in source code
- Rotate encryption keys annually
- Separate keys per environment (dev/staging/prod)

### 6.2 Data Classification

| Classification | Examples | Retention | Access Controls |
|----------------|----------|-----------|-----------------|
| **PII** | Email, name, profile photo | Until account deletion | Encrypted, audit logged |
| **Health Data** | Body metrics, workout logs, biometrics | Indefinite (user request) | Encrypted, strict authZ |
| **OAuth Tokens** | Google/Facebook access tokens | 7 days (session) | Encrypted, never expose |
| **Analytics** | Aggregated usage data | 26 months | Anonymized |
| **Logs** | Access logs, error logs | 90 days | Access controlled |

### 6.3 Data Retention

- **Body Photos:** Delete within 24 hours of upload (after AI processing)
- **Access Logs:** Retain 90 days, then archive or delete
- **Error Logs:** 90 days (exclude PII)
- **User Data:** Retain until account deletion + 30 days backup retention
- **Backups:** Encrypted, 30-day retention with geographic separation

---

## 7. API Security

### 7.1 Input Validation

**All API endpoints MUST:**
- Validate request bodies against Zod schemas
- Sanitize user inputs before database queries
- Enforce size limits (max 10MB request body)
- Reject malformed JSON with 400 status

**Example Validation Pattern:**
```typescript
const UserUpdateSchema = z.object({
  name: z.string().max(255).optional(),
  age: z.number().int().min(13).max(120).optional(),
  // ... other fields
});

router.patch("/me", async (c) => {
  const body = await c.req.json();
  const validated = UserUpdateSchema.parse(body); // Throws on invalid
  // ... use validated data
});
```

### 7.2 Output Encoding

- Never return raw database errors to clients
- Use standardized error format:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": { "field": "age", "issue": "Must be >= 13" }
  }
}
```

- In production, hide stack traces (log only)
- In development, provide detailed errors with request IDs

### 7.3 Rate Limiting

**Rate Limit Configuration:**
| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/auth/*` | 5 attempts | 15 minutes |
| `/ai` | 60 requests | 1 minute |
| `/upload` | 30 uploads | 1 minute |
| All others | 300 requests | 1 minute |

**Implementation:**
- Use Cloudflare KV for distributed rate limiting
- Identify clients by `X-User-Id` header or `cf-connecting-ip`
- Include rate limit headers in responses:
```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 298
X-RateLimit-Reset: 45
```

### 7.4 CORS Configuration

**Allowed Origins:** Configured via `ALLOWED_ORIGINS` environment variable
**Allowed Methods:** GET, POST, PUT, PATCH, DELETE, OPTIONS
**Allowed Headers:** Content-Type, Authorization, X-User-Id
**Credentials:** Required for session cookies

**Production Configuration:**
```typescript
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];
app.use("*", cors({
  origin: allowedOrigins,
  credentials: true,
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
}));
```

**Never use `origin: "*"` with credentials enabled**

---

## 8. Database Security

### 8.1 Query Safety

**Mandatory Practices:**
- ✅ Use Drizzle ORM for all database queries
- ✅ Parameterized queries only (Drizzle enforces this)
- ❌ Never use raw SQL with string concatenation
- ❌ Never interpolate user input into queries

**Example Safe Query:**
```typescript
// GOOD - Drizzle uses parameterized queries
const user = await drizzle.query.users.findFirst({
  where: eq(users.id, userId), // userId is safely bound
});

// BAD - NEVER DO THIS
const query = `SELECT * FROM users WHERE id = '${userId}'`;
```

### 8.2 Access Control

- Database connection strings stored in Cloudflare Secrets
- Each environment uses separate database (dev/staging/prod)
- Database backups encrypted at rest
- Enable database audit logging
- Principle of least privilege for service accounts

### 8.3 Sensitive Data Storage

**Encrypt Before Storing:**
- OAuth access tokens (Google/Facebook)
- Refresh tokens (if implemented)
- Health data (PHI considerations)
- Any PII required to be encrypted per compliance

**Schema Example:**
```typescript
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  provider: text("provider"),
  providerUserId: text("provider_user_id").notNull(),
  accessToken: text("access_token").notNull(), // Encrypted at rest (D1)
  refreshToken: text("refresh_token"), // Will encrypt in application
  expiresAt: integer("expires_at"),
});
```

---

## 9. Mobile App Security

### 9.1 Secure Storage

**Required:**
- Use `expo-secure-store` for all sensitive data
- Store JWT tokens in iOS Keychain / Android Keystore
- Never store tokens in `AsyncStorage` or `localStorage`

**Implementation:**
```typescript
import * as SecureStore from 'expo-secure-store';

// Store token
await SecureStore.setItemAsync('aivo_token', jwtToken);

// Retrieve token
const token = await SecureStore.getItemAsync('aivo_token');
```

### 9.2 Certificate Pinning

**Recommended for Production:**
- Pin Cloudflare API endpoints
- Implement using `expo-network` or custom native modules
- Provide fallback for certificate rotation

### 9.3 Code Obfuscation

**Android:**
- Enable ProGuard/R8 minification (already in app.json)
- Use proguard-rules.pro to keep required classes
- Enable code shrinking and optimization

**iOS:**
- Enable bitcode (if applicable)
- Use Swift compiler optimization flags
- Consider commercial obfuscation tools for release builds

### 9.4 Root/Jailbreak Detection

**Recommended for High-Security Mode:**
- Detect rooted/jailbroken devices
- Allow user choice: refuse access or proceed with warnings
- Log security-sensitive actions only

### 9.5 Deep Linking Security

**Validate Redirect URIs:**
- Use custom URL scheme with random component
- Validate state parameter to prevent CSRF
- Verify OAuth response signatures
- Use HTTPS for web redirects

---

## 10. Web Application Security

### 10.1 Content Security Policy (CSP)

**Current CSP (needs tightening):**
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';  // ⚠️ Too permissive
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
connect-src 'self' https://api.openai.com https://*.r2.dev;
font-src 'self';
object-src 'none';
frame-ancestors 'none';
```

**Required Improvements:**
- Remove `'unsafe-inline'` - use nonce-based CSP
- Remove `'unsafe-eval'` - avoid `eval()` and `new Function()`
- Add `script-src` hashes for inline scripts
- Enable CSP reporting: `report-uri /api/security/csp-report`

### 10.2 XSS Protection

**Defenses:**
- ✅ React's automatic escaping (enabled)
- ✅ X-XSS-Protection header (enabled)
- ❌ Missing: CSP nonce for inline scripts
- ❌ Missing: DOMPurify for user-generated HTML (if any)

### 10.3 CSRF Protection

**Current State:** No CSRF tokens implemented  
**Required for state-changing operations:**

**Implementation Options:**
1. **Double Cookie Pattern** (recommended for SPA):
   - Set `csrfToken` cookie (non-httpOnly)
   - JavaScript reads cookie and sends `X-CSRF-Token` header
   - Server verifies token matches session

2. **SameSite Cookies** (already enabled):
   - SameSite=Strict prevents most CSRF
   - Additional CSRF token defense-in-depth

### 10.4 Clickjacking Protection

✅ **Enabled:** `X-Frame-Options: DENY`  
✅ **Additional:** `frame-ancestors 'none'` in CSP

---

## 11. Infrastructure Security

### 11.1 Cloudflare Workers

**Security Configuration:**
- ✅ Isolated execution environment
- ✅ Automatic TLS termination
- ✅ Built-in DDoS protection
- ✅ Global edge network

**Required Settings:**
```toml
# wrangler.toml
[miniflare] # or [vars] for production
AUTH_SECRET = { secret = "AUTH_SECRET" }  # Use secrets, not plaintext
GOOGLE_CLIENT_ID = { secret = "GOOGLE_CLIENT_ID" }
```

**Secrets Management:**
```bash
# Set secrets via Wrangler
wrangler secret put AUTH_SECRET
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put OPENAI_API_KEY
```

### 11.2 KV Namespaces

- Use separate KV namespaces per environment
- Enable encryption at rest (Cloudflare default)
- Set appropriate TTLs to prevent unbounded growth
- Monitor KV usage quotas

### 11.3 D1 Database

- Enable automated backups
- Use parameterized queries (Drizzle enforces)
- Restrict database access to Workers only
- Enable audit logging for sensitive operations
- Regular security patches (managed by Cloudflare)

### 11.4 R2 Storage

- Private buckets by default
- Pre-signed URLs for temporary access (expire in 1 hour)
- Enable bucket-level encryption
- Monitor for unauthorized access patterns
- CORS configuration for direct uploads

---

## 12. Monitoring & Logging

### 12.1 Security Monitoring

**Required Metrics:**
- Authentication failures (rate, IP patterns)
- Rate limit triggers
- Unusual API access patterns
- Database query anomalies
- Error rate spikes
- Geographic anomaly detection

**Alerting Thresholds:**
- >10 auth failures from single IP in 5 minutes
- >100 rate limit hits in 1 minute
- Error rate >5% over 5 minutes
- Database connection errors >10 in 1 minute

### 12.2 Logging Standards

**Never Log:**
- ❌ JWT tokens or session IDs
- ❌ Passwords or credentials
- ❌ Full OAuth access tokens
- ❌ PII in plaintext (email, name)
- ❌ Credit card numbers
- ❌ API keys or secrets

**Acceptable to Log:**
- User IDs (UUIDs, not emails)
- Request IDs (for tracing)
- IP addresses (anonymized last octet)
- HTTP status codes
- Error messages (sanitized)
- Performance metrics

**Log Format:**
```json
{
  "timestamp": "2025-04-27T15:30:00Z",
  "level": "error",
  "requestId": "req_abc123",
  "method": "POST",
  "path": "/api/auth/google",
  "statusCode": 401,
  "userId": "user_abc123",
  "ip": "192.168.1.xxx",
  "userAgent": "Mozilla/5.0...",
  "message": "Invalid OAuth token"
}
```

### 12.3 Incident Response

**Security Event Classification:**
- **Critical:** Data breach, credential theft, ransomware → Immediate response (<1 hour)
- **High:** Unauthorized access, API abuse → Response within 4 hours
- **Medium:** Configuration drift, failed auth spikes → Response within 24 hours
- **Low:** Policy violation, security scanning alerts → Response within 72 hours

**Response Procedure:**
1. **Detection:** Security monitoring triggers alert
2. **Triage:** Determine severity, assign incident lead
3. **Containment:** Isolate affected systems (disable API keys, revoke sessions)
4. **Investigation:** Collect logs, determine scope, preserve evidence
5. **Eradication:** Remove threat, patch vulnerabilities
6. **Recovery:** Restore services, verify integrity
7. **Post-Mortem:** Document lessons learned, update controls

---

## 13. Compliance Requirements

### 13.1 GDPR (EU)

**Requirements:**
- ✅ Data minimization (collect only necessary data)
- ✅ Purpose limitation (use data only for stated purposes)
- ✅ Storage limitation (defined retention periods)
- ✅ Data subject rights (access, rectify, delete, port)
- ✅ Privacy by design (embedded in architecture)
- ✅ Data breach notification (72 hours)
- ✅ Data Protection Officer (DPO@aivo.fitness)

**Implementation:**
- User can export all data via `/api/export`
- User can delete account via `/api/users/delete`
- Data deletion workflow removes all user data within 30 days
- Cookie consent banner (web)
- Privacy Policy accessible and comprehensive

### 13.2 CCPA (California)

**Requirements:**
- Right to know what personal information is collected
- Right to delete personal information
- Right to opt out of data sale (AIVO does not sell data)
- Notice at collection (Privacy Policy)
- Do not discriminate for exercising rights

**Implementation:**
- Privacy Policy covers CCPA requirements
- No data sale - clear statement in policy
- User can request data deletion via privacy@aivo.fitness
- Account deletion removes all personal data

### 13.3 HIPAA Considerations

**Important:** AIVO is NOT a HIPAA-covered entity. However, health/fitness data requires protection.

**Safeguards:**
- Encrypt health data at rest and in transit
- Strict access controls (only user and authorized processes)
- No data sharing with third parties without consent
- Audit logs for data access
- Secure deletion when data is removed

**Disclaimer in Terms of Service:**
"AIVO is not a medical device. Fitness recommendations are for informational purposes only. Consult healthcare providers before starting fitness programs."

---

## 14. Secure Development

### 14.1 Code Review Requirements

**Security Checklist for All PRs:**
- [ ] Input validation present on all user-supplied data
- [ ] Output encoding for dynamic content
- [ ] Authentication required for protected routes
- [ ] Authorization checks (user can only access own data)
- [ ] No secrets committed to repository
- [ ] Error messages don't leak sensitive information
- [ ] Rate limiting applied where appropriate
- [ ] Database queries use ORM/parameterized queries
- [ ] No debug flags left enabled in production code

### 14.2 Dependency Management

**Requirements:**
- Use `pnpm` for dependency management
- Regular security audits: `pnpm audit`
- Update dependencies monthly minimum
- Use `npm audit fix` automatically in CI
- Review CVEs for critical/high severity immediately
- Pin dependency versions (no floating `*` versions)

### 14.3 Secret Scanning

**Pre-commit Hooks:**
- Scan for API keys, tokens, passwords
- Use GitGuardian or similar tooling
- Prevent commits with detected secrets

**GitHub Secrets Scanning:**
- Enable GitHub Advanced Security
- Configure custom patterns for AIVO secrets
- Automatic PR reviews for security issues

---

## 15. Testing Requirements

### 15.1 Security Testing

**Mandatory Tests:**
- ✅ OAuth flow end-to-end tests
- ✅ Authentication bypass attempts (negative testing)
- ✅ Input validation edge cases
- ✅ Rate limiting enforcement
- ✅ Authorization boundary tests (user A cannot access user B data)

**Recommended Tests:**
- Penetration testing quarterly
- OAuth configuration review monthly
- Dependency vulnerability scanning daily
- SSL/TLS configuration scanning weekly
- Mobile app reverse engineering resistance

### 15.2 Static Analysis

**Tools:**
- TypeScript strict mode (enabled)
- ESLint security rules (`eslint-plugin-security`)
- `npm audit` in CI pipeline
- Snyk or similar dependency scanning

---

## 16. Incident Response Playbook

### 16.1 Common Incidents

#### Incident: OAuth Token Compromise

**Detection:** Unusual OAuth access patterns, Google/Facebook alert  
**Response:**
1. Immediately revoke compromised session (delete from sessions table)
2. Invalidate all user tokens (update JWT secret)
3. Force logout all users (clear KV sessions cache)
4. Notify affected users via email within 24 hours
5. Rotate all OAuth client secrets with providers
6. Review logs for lateral movement
7. Post-mortem: enhance monitoring for similar patterns

#### Incident: Database Exposure

**Detection:** Unauthorized database access, misconfiguration  
**Response:**
1. Isolate database (disable public access)
2. Rotate all database connection strings
3. Review access logs for data exfiltration
4. Notify users if PII/health data accessed (GDPR 72h)
5. Restore from clean backup if data modified
6. Implement additional access controls
7. Post-mortem: improve database security controls

#### Incident: DDoS Attack

**Detection:** Traffic spike, Workers quota exceeded  
**Response:**
1. Enable Cloudflare "I'm Under Attack" mode
2. Increase rate limiting thresholds temporarily
3. Block offending IP ranges at Cloudflare
4. Monitor cost implications (R2 egress, Workers billable time)
5. Coordinate with Cloudflare support if severe
6. Post-mortem: adjust rate limiting rules

---

## 17. Security Training

**Required for All Developers:**
- Annual security awareness training
- OWASP Top 10 understanding
- Secure coding practices for TypeScript/React
- Cloudflare Workers security model
- Incident response procedures

**New Hire Onboarding:**
- Security policy review within first week
- Code review shadowing with senior engineers
- Secrets management training
- Access request procedures

---

## 18. Compliance Checklist

### Pre-Launch Checklist

- [ ] All environment variables use secrets, not plaintext
- [ ] AUTH_SECRET is 32+ random characters
- [ ] HTTPS enforced in production (HSTS)
- [ ] CORS configured with specific origins only
- [ ] Rate limiting enabled on all endpoints
- [ ] Input validation on all user inputs
- [ ] No secrets in git history (use `git-secrets` scan)
- [ ] Privacy Policy published and accessible
- [ ] Terms of Service published and accessible
- [ ] Cookie consent banner implemented (EU visitors)
- [ ] Data export endpoint tested
- [ ] Account deletion workflow tested
- [ ] Error messages sanitized for production
- [ ] CSP header configured (no 'unsafe-inline')
- [ ] CSRF tokens implemented for state changes
- [ ] Penetration test completed
- [ ] Dependency vulnerabilities resolved
- [ ] Backup and restore procedures tested
- [ ] Monitoring and alerting configured
- [ ] Incident response playbooks reviewed

---

## 19. Security Contacts

**Security Team:** security@aivo.fitness  
**Incident Response:** incident@aivo.fitness  
**Bug Bounty:** See separate bug bounty program terms  
**Data Protection Officer:** DPO@aivo.fitness  
**Legal:** legal@aivo.fitness

**PGP Key:** Available at https://aivo.fitness/security/pgp

---

## 20. Policy Enforcement

**Violations:**
- Minor: Re-training, mandatory security course
- Moderate: Access revocation, formal warning
- Severe: Termination, legal action (as applicable)

**Audit Frequency:**
- Quarterly internal security audits
- Annual external penetration testing
- Monthly compliance reviews
- Weekly security monitoring reports

---

## Appendix A: Security Headers Reference

```typescript
// Required security headers (all responses)
{
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=(), payment=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Content-Security-Policy": "default-src 'self'; ...", // Tighten as possible
}
```

## Appendix B: Rate Limit Reference

```typescript
const RATE_LIMITS = {
  auth: { max: 5, window: 15 * 60 * 1000 },      // 5 per 15min
  ai: { max: 60, window: 60 * 1000 },            // 60 per minute
  upload: { max: 30, window: 60 * 1000 },        // 30 per minute
  default: { max: 300, window: 60 * 1000 },      // 300 per minute
};
```

## Appendix C: OAuth Provider Configuration

**Google Cloud Console:**
- Authorized JavaScript origins: https://aivo.website, http://localhost:3000
- Authorized redirect URIs: https://aivo.website/login, http://localhost:3000/login
- Enable Google+ API (for profile data)

**Facebook Developers:**
- Valid OAuth Redirect URIs: https://api.aivo.website/api/auth/facebook/callback
- Client OAuth Login: Enabled
- Web OAuth Login: Enabled
- Enforce HTTPS: Enabled

---

*This document is confidential and subject to regular review. Last updated: April 27, 2025.*
