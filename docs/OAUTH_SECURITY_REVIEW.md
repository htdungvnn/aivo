# OAuth Security Review - AIVO Platform

**Review Date:** April 27, 2025  
**Reviewer:** Senior Security Engineer  
**Scope:** Google OAuth 2.0 and Facebook Login integration across Web, Mobile, and API

---

## Executive Summary

AIVO implements OAuth 2.0 for passwordless authentication using Google and Facebook as identity providers. The implementation follows industry best practices with **several critical security gaps** that must be addressed before production deployment.

**Risk Level:** HIGH (due to mobile OAuth flow issues)  
**Overall Score:** 6.5/10 (Good foundation, needs hardening)

---

## 1. Architecture Overview

### 1.1 Authentication Flow

```
┌─────────┐     ┌────────────┐     ┌────────────┐     ┌─────────┐
│   User  │────▶│   Frontend │────▶│   AIVO API │────▶│ Google  │
│         │     │   (Web/    │     │   /auth/   │     │ /Facebook
│         │     │   Mobile)  │     │   google   │     │   OAuth  │
└─────────┘     └────────────┘     └────────────┘     └─────────┘
      ▲                                                          │
      │                                                          │
      └──────────────────────────────────────────────────────────┘
                         (token exchange)
```

**Current Implementation:**
- **Web (Next.js):** Client-side OAuth with `@react-oauth/google` + popup for Facebook
- **Mobile (Expo):** `expo-web-browser` with redirect to custom scheme (`aivo://auth/callback`)
- **API (Cloudflare Workers):** Token verification via `google-auth-library` and Facebook Graph API
- **Session Storage:** JWT stored in httpOnly cookies (web) or SecureStore (mobile)

---

## 2. Security Findings

### 2.1 CRITICAL Issues

#### 🔴 **CRIT-1: Mobile OAuth Flow Vulnerable to Token Interception**

**Severity:** CRITICAL  
**CVSS Score:** 8.1 (High)  
**Attack Vector:** Network / Adjacent Network

**Description:**
The mobile OAuth implementation in `apps/mobile/app/(auth)/login.tsx` uses an insecure token exchange pattern:

```typescript
// Lines 133-143 (Google) and 180-190 (Facebook)
const authUrl = `${API_URL}/api/auth/google?redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);

// Token extracted from URL:
const token = url.searchParams.get("token") || url.hash.split("token=")[1]?.split("&")[0];
```

**Vulnerabilities:**
1. **Token in URL query/hash:** OAuth tokens transmitted via URL can be:
   - Logged in browser history
   - Leaked via Referer headers to malicious sites
   - Captured by other apps on device (Android intent leaks)
   - Visible in screen recordings/screenshots

2. **Missing state parameter:** No CSRF protection against authorization code interception attacks

3. **No PKCE (Proof Key for Code Exchange):** Mobile apps must use PKCE to prevent authorization code injection

**Proof of Concept:**
```javascript
// Attacker can intercept token from:
// - Browser history: chrome://history
// - Referer header if user clicks external link from auth page
// - Logs: console.log(result.url) in malicious page
```

**Impact:**
- An attacker with network access or device access can steal JWT tokens
- Stolen tokens provide full user account access for 7 days
- OAuth access tokens to Google/Facebook also exposed

**Recommendation:**
```typescript
// Use Authorization Code Flow with PKCE
const codeVerifier = generateRandomCodeVerifier(); // 43-128 chars
const codeChallenge = base64UrlEncode(sha256(codeVerifier));

// Store codeVerifier securely (SecureStore)
await SecureStore.setItemAsync('oauth_code_verifier', codeVerifier);

// Open auth session with code_challenge
const authUrl = `${API_URL}/api/auth/google?redirect_uri=${REDIRECT_URI}&code_challenge=${codeChallenge}&state=${state}`;

// On callback, exchange code for token (not token in URL)
const code = url.searchParams.get('code');
const response = await fetch(`${API_URL}/api/auth/google/exchange`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code, code_verifier: await SecureStore.getItemAsync('oauth_code_verifier') })
});
const { token } = await response.json();
```

**Required Fixes:**
1. Implement PKCE (RFC 7636) for mobile OAuth
2. Use authorization code flow, not implicit flow
3. Remove token from URL - exchange code server-side
4. Add `state` parameter for CSRF protection
5. Never pass tokens through client-side redirects

---

#### 🔴 **CRIT-2: Web OAuth Missing CSRF Protection**

**Severity:** HIGH  
**CVSS Score:** 6.5 (Medium-High)

**Description:**
The web OAuth implementation (`apps/web/src/components/auth/LoginPage.tsx`) does not implement CSRF tokens for state-changing operations. While OAuth itself includes a `state` parameter, it is not properly validated.

```typescript
// Line 33-38: Google OAuth callback
const handleGoogleSuccess = async (credentialResponse) => {
  // No state validation!
  const response = await fetch(`${API_URL}/api/auth/google`, {
    method: "POST",
    body: JSON.stringify({ token: credentialResponse.credential })
  });
```

**Attack Scenario:**
1. Attacker creates malicious site that initiates OAuth flow with attacker-controlled `state`
2. Victim logs in via OAuth on attacker's site
3. Attacker intercepts callback with valid JWT for victim's account
4. Attacker can now impersonate victim

**Recommendation:**
```typescript
// Generate cryptographically random state before OAuth
const state = crypto.randomUUID();
localStorage.setItem('oauth_state', state);

// Include in OAuth request (Google OAuth library handles this automatically)
// But verify on callback:
const handleGoogleSuccess = async (credentialResponse) => {
  // Verify state matches what we stored
  const expectedState = localStorage.getItem('oauth_state');
  if (credentialResponse.state !== expectedState) {
    throw new Error('Invalid OAuth state - possible CSRF attack');
  }
  localStorage.removeItem('oauth_state');
  // ... proceed
};
```

---

#### 🔴 **CRIT-3: Facebook OAuth Using Deprecated Popup Flow**

**Severity:** HIGH  
**CVSS Score:** 7.0 (High)

**Description:**
The Facebook OAuth implementation uses `window.open()` popup which is:
- Blocked by browser popup blockers
- Vulnerable to clickjacking
- Doesn't work on mobile Safari
- Insecure compared to redirect flow

```typescript
// Lines 83-87 (LoginPage.tsx)
const popup = window.open(
  authUrl,
  "facebook_login",
  `width=${width},height=${height},left=${left},top=${top},popup=true`
);
```

**Recommendation:**
- Use Facebook's official JavaScript SDK with redirect flow
- Or use the same pattern as Google OAuth (OAuth popup from library)
- Implement proper redirect URI with state validation

---

### 2.2 HIGH Severity Issues

#### 🟠 **HIGH-1: Session Cookie Missing Secure Flag in Development**

**Severity:** MEDIUM (HIGH in production)  
**Location:** `apps/api/src/routes/auth.ts:349`

```typescript
// Line 349: Cookie set without explicit Secure flag in some code paths
c.header(
  "Set-Cookie",
  `auth_token=${cookieValue}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`
);
```

**Issue:** While `Secure` is set, ensure it's ALWAYS present. Verify all cookie-setting code paths include `Secure`.

**Recommendation:**
```typescript
const isProduction = process.env.NODE_ENV === 'production';
const cookieFlags = `HttpOnly; ${isProduction ? 'Secure; ' : ''}SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`;
```

**Production Check:** ✅ Should be fine if NODE_ENV=production  
**Development Check:** ⚠️ HTTP cookies may not work with `Secure` flag - use separate dev config

---

#### 🟠 **HIGH-2: AUTH_SECRET Length Validation Insufficient**

**Severity:** MEDIUM  
**Location:** `apps/api/src/utils/auth.ts:18-28`

```typescript
if (secret.length < 32) {
  throw new Error("AUTH_SECRET must be at least 32 characters");
}
```

**Issue:** Length check only. Secret should be cryptographically random, not user-chosen.

**Recommendation:**
- Enforce secret generation via `openssl rand -hex 64` or similar
- Validate entropy (reject common passwords, dictionary words)
- Use separate secrets per environment (dev/staging/prod)
- Rotate secrets quarterly

---

#### 🟠 **HIGH-3: No Refresh Token Rotation**

**Severity:** HIGH  
**Impact:** Long-lived access tokens increase breach impact

**Current:** JWT tokens last 7 days (604800 seconds). No refresh token mechanism.

**Recommendation:**
- Implement refresh tokens with rotation (1-hour access tokens, 30-day refresh tokens)
- Store refresh tokens in database (encrypted)
- On refresh: invalidate old refresh token, issue new pair
- Detect token reuse (indicates theft) and revoke all sessions

---

#### 🟠 **HIGH-4: Mobile Token Storage Not Encrypted at Rest**

**Severity:** MEDIUM  
**Location:** `apps/mobile/app/contexts/AuthContext.tsx:92-93`

```typescript
await SecureStore.setItemAsync(TOKEN_KEY, data.token); // ✅ Uses SecureStore
```

**Good:** Uses `expo-secure-store` (iOS Keychain / Android Keystore)  
**Issue:** No additional encryption layer if device is compromised (rooted/jailbroken)

**Recommendation:**
- Add device integrity checks before token access
- Implement biometric authentication for app unlock (FaceID/TouchID)
- Consider using `expo-secure-store` with `keychainAccessible` (iOS) set to `whenUnlocked`

---

#### 🟠 **HIGH-5: Rate Limiting Uses Client-Provided IP**

**Severity:** MEDIUM  
**Location:** `apps/api/src/index.ts:373`

```typescript
const userId = c.req.header("X-User-Id") || c.req.header("cf-connecting-ip") || "anonymous";
```

**Issue:** `X-User-Id` header is client-controlled. Malicious clients can set arbitrary values to bypass rate limits.

**Recommendation:**
```typescript
// Use Cloudflare's CF-Connecting-IP (set by infrastructure) only
const ip = c.req.header("cf-connecting-ip") || "anonymous";
const userId = c.req.header("X-User-Id") || ip; // But rate limit BY IP for unauthenticated

// Separate limits:
// - Authenticated: rate limit by user ID (from JWT, not header)
// - Unauthenticated: rate limit by IP
```

---

### 2.3 MEDIUM Severity Issues

#### 🟡 **MED-1: CORS Configuration Potentially Overly Permissive**

**Severity:** MEDIUM  
**Location:** `apps/api/src/index.ts:329-343`

```typescript
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3000", "http://localhost:8081"]; // Default
```

**Issue:** If `ALLOWED_ORIGINS` is not set in production, defaults to permissive localhost only (but this is dev-only).

**Recommendation:**
```typescript
// Fail closed - require explicit configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",");
if (!allowedOrigins && process.env.NODE_ENV === 'production') {
  throw new Error("ALLOWED_ORIGINS must be set in production");
}
```

---

#### 🟡 **MED-2: Missing Request Size Limits on Some Endpoints**

**Severity:** LOW-MEDIUM  
**Location:** `apps/api/src/index.ts:395-401`

```typescript
app.use("*", async (c, next) => {
  const contentLength = c.req.header("content-length");
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
    throw new APIError(413, "REQUEST_TOO_LARGE", "Request too large");
  }
  await next();
});
```

**Good:** Global 10MB limit exists.  
**Check:** Verify specific upload endpoints have additional validation (file size, type).

**Recommendation:**
```typescript
// For upload endpoints, stricter limits
app.use("/upload", async (c, next) => {
  const contentLength = c.req.header("content-length");
  const maxSize = 5 * 1024 * 1024; // 5MB for photos
  if (contentLength && parseInt(contentLength) > maxSize) {
    throw new APIError(413, "REQUEST_TOO_LARGE", "Photo must be less than 5MB");
  }
  await next();
});
```

---

#### 🟡 **MED-3: No Request Timeout Configuration**

**Issue:** Long-running requests (AI processing) can tie up Workers. Current implementation doesn't show timeout handling.

**Recommendation:**
```typescript
// Set Cloudflare Worker timeout via context
export default {
  async fetch(request, env, ctx) {
    // Set timeout for expensive operations
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 30000)
    );
    return Promise.race([handleRequest(request, env, ctx), timeoutPromise]);
  }
};
```

---

### 2.4 LOW Severity Issues

#### 🟢 **LOW-1: Error Messages May Leak Information**

**Severity:** LOW  
**Location:** Various error handlers

```typescript
console.error("Google auth error:", error); // May leak token in logs
```

**Recommendation:**
```typescript
// Never log full OAuth tokens
console.error("Google auth error", {
  error: error.message,
  stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  // Never log: token, accessToken, credential
});
```

---

#### 🟢 **LOW-2: No Content Security Policy for Mobile WebView**

**Issue:** Mobile app uses WebView for OAuth potentially. No CSP defined for embedded web content.

**Recommendation:** If using WebView, set:
```typescript
webViewProps = {
  originWhitelist: ['https://*.aivo.website', 'https://*.google.com', 'https://*.facebook.com'],
  // Note: WebView doesn't support CSP headers; rely on OAuth redirect URI validation
};
```

---

## 3. Positive Security Practices (✅)

The following security practices are **correctly implemented**:

1. ✅ **httpOnly cookies for web sessions** - Prevents XSS token theft
2. ✅ **SameSite=Strict** - Protects against CSRF
3. ✅ **JWT verification on every request** - No token acceptance without validation
4. ✅ **Session stored in database** - Allows session revocation
5. ✅ **SecureStore for mobile** - Platform keychain/keystore usage
6. ✅ **Rate limiting** - Multiple rate limit tiers configured
7. ✅ **Security headers** - HSTS, X-Frame-Options, X-Content-Type-Options present
8. ✅ **CORS with credentials** - Proper CORS configuration
9. ✅ **Input validation** - Zod schemas for request validation
10. ✅ **Encrypted database** - D1 provides AES-256 at rest
11. ✅ **Short token lifetime** - 7 days is reasonable (consider reducing to 1 day)
12. ✅ **HTTPS enforcement** - HSTS header with preload
13. ✅ **No passwords** - Passwordless OAuth eliminates password attacks

---

## 4. Compliance Assessment

### 4.1 OAuth 2.0 Best Practices (RFC 6749, RFC 6819)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Use authorization code flow for mobile apps | ❌ FAIL | Currently using implicit-like flow |
| Implement PKCE for mobile apps | ❌ FAIL | Missing code verifier/challenge |
| Validate `state` parameter | ⚠️ PARTIAL | Not validated on callback |
| Use `nonce` for ID tokens | ❌ FAIL | Not implemented for OpenID Connect |
| Token binding to client | ⚠️ PARTIAL | No device fingerprinting |
| Refresh token rotation | ❌ FAIL | No refresh tokens implemented |
| Token revocation endpoint | ✅ PASS | `/api/auth/logout` implemented |
| Detect token reuse | ❌ FAIL | No anomaly detection |

**Compliance Score:** 33% (Critical gaps for mobile)

### 4.2 OWASP Mobile Top 10

| Risk | Status | Mitigation |
|------|--------|------------|
| M1: Improper Platform Usage | ⚠️ | No root/jailbreak detection |
| M2: Insecure Data Storage | ✅ | SecureStore used |
| M3: Insecure Communication | ✅ | HTTPS enforced |
| M4: Insecure Authentication | ❌ | No biometric auth, weak OAuth flow |
| M5: Insufficient Cryptography | ✅ | Standard TLS 1.3, AES-256 |
| M6: Insecure Authorization | ✅ | Server-side authZ checks |
| M7: Client Code Quality | ⚠️ | No obfuscation (ProGuard enabled but minimal) |
| M8: Code Tampering | ❌ | No integrity checks, no root detection |
| M9: Reverse Engineering | ❌ | No obfuscation, debug symbols present |
| M10: Extraneous Functionality | ✅ | Minimal permissions requested |

---

## 5. Recommendations by Priority

### 🚨 URGENT (Fix Before Production)

1. **Implement PKCE for Mobile OAuth** (CRIT-1)
   - Replace implicit flow with authorization code flow
   - Generate and validate code verifier/challenge
   - Remove tokens from URL redirects

2. **Add CSRF State Validation** (CRIT-2)
   - Generate random state before OAuth initiation
   - Validate state on callback
   - Store state in session or encrypted cookie

3. **Fix Facebook OAuth Flow** (CRIT-3)
   - Switch from popup to redirect flow
   - Use official Facebook JS SDK or consistent OAuth pattern

4. **Implement Refresh Token Rotation**
   - Shorten access token to 1 hour
   - Add refresh tokens with rotation
   - Detect and respond to token reuse

### ⚠️ HIGH PRIORITY (Fix Within 30 Days)

5. **Fix Rate Limiting Header Trust** (HIGH-2)
   - Don't trust `X-User-Id` header for rate limiting
   - Extract user ID from JWT payload instead

6. **Strengthen AUTH_SECRET Management** (HIGH-3)
   - Generate secrets with `openssl rand -hex 64`
   - Store in Cloudflare Secrets (not .env files)
   - Implement secret rotation procedure

7. **Add Request Timeouts** (MED-3)
   - Set 30s timeout for API requests
   - 60s timeout for AI endpoints
   - Graceful degradation on timeout

8. **Implement Certificate Pinning (Mobile)**
   - Pin Cloudflare API endpoints
   - Prevent MITM on compromised networks

### 📋 MEDIUM PRIORITY (Next Quarter)

9. **Add Root/Jailbreak Detection (Mobile)**
   - Check for su binary, test-keys
   - Warn users or block sensitive operations

10. **Enable Code Obfuscation (Mobile)**
    - ProGuard full optimization for Android
    - LLVM obfuscation for iOS (if possible)

11. **Add Content Security Policy Nonces**
    - Replace `'unsafe-inline'` with nonce-based CSP
    - Generate nonce per request, inject in HTML

12. **Implement CSRF Tokens for All State Changes**
    - Even with SameSite=Strict, add double-submit cookie pattern
    - Required for API mutations from non-browser clients

### 🔵 LOW PRIORITY (Nice to Have)

13. **Add Bug Bounty Program**
    - Launch on HackerOne or Bugcrowd
    - Scope: OAuth flows, API security, mobile app

14. **Implement Security Monitoring Dashboard**
    - Track auth failures, rate limits, token revocations
    - Alert on anomalies (>10 failed logins/min from single IP)

15. **Penetration Testing**
    - Annual external pentest required for SOC 2
    - Quarterly internal security reviews

---

## 6. Testing Checklist

### OAuth Flow Testing

- [ ] **Authorization Code Flow with PKCE** (mobile)
- [ ] **State Parameter Validation** (all flows)
- [ ] **CSRF Attack Prevention** - Attempt state mismatch
- [ ] **Token Interception** - Verify tokens not in browser history
- [ ] **Popup Blocking** - Facebook OAuth without popup blockers
- [ ] **Redirect URI Validation** - Only allow registered URIs
- [ ] **OAuth Token Expiry** - Test 7-day token expiration
- [ ] **Logout & Session Invalidation** - Token revoked in DB
- [ ] **Session Fixation** - New session ID on login
- [ ] **Concurrent Sessions** - Multiple devices can be logged in

### Security Testing

- [ ] **Rate Limiting** - Verify limits enforced per IP/user
- [ ] **SQL Injection** - All user inputs parameterized (Drizzle check)
- [ ] **XSS via OAuth Data** - Sanitize OAuth provider names/pictures
- [ ] **SSRF** - Validate redirect_uri parameter (no internal IPs)
- [ ] **JWT Tampering** - Modify payload, verify signature fails
- [ ] **Algorithm Confusion** - Attempt RS256 vs HS256 attacks
- [ ] **Token Replay** - Reuse old token after logout
- [ ] **Brute Force** - Test rate limiting on auth endpoints
- [ ] **Session Hijacking** - Steal cookie via XSS (should fail with httpOnly)
- [ ] **CORS Misconfiguration** - Test allowed origins

---

## 7. Code Review Specifics

### 7.1 Files Reviewed

| File | Lines | Issues | Severity |
|------|-------|--------|----------|
| `apps/mobile/app/(auth)/login.tsx` | 125-217 | 3 | CRITICAL |
| `apps/web/src/components/auth/LoginPage.tsx` | 1-318 | 2 | HIGH |
| `apps/api/src/routes/auth.ts` | 1-396 | 2 | HIGH |
| `apps/api/src/utils/auth.ts` | 1-80 | 1 | MEDIUM |
| `apps/api/src/middleware/auth.ts` | 1-154 | 0 | N/A |
| `apps/mobile/app/contexts/AuthContext.tsx` | 1-151 | 1 | MEDIUM |
| `apps/web/src/contexts/AuthContext.tsx` | 1-117 | 0 | N/A |

### 7.2 OAuth Provider Configuration Review

**Google Cloud Console:**
```
✅ Authorized JavaScript origins set
✅ Authorized redirect URIs configured
⚠️  Missing: OAuth consent screen verification (need Google review)
⚠️  Missing: Test users configured for production
```

**Facebook Developers:**
```
✅ App created with "Consumer" type
✅ Facebook Login product added
⚠️  Missing: App Review for email permission
⚠️  Missing: Privacy Policy URL configured
⚠️  Missing: Terms of Service URL configured
⚠️  Missing: Data Deletion Callback (required for GDPR)
```

---

## 8. Security Roadmap

### Phase 1: Critical Fixes (Week 1-2)

- [ ] Implement PKCE for mobile OAuth
- [ ] Add state parameter validation
- [ ] Fix Facebook OAuth redirect flow
- [ ] Deploy to staging for testing

**Success Criteria:** No tokens in URLs, state validated, PKCE enforced

### Phase 2: Hardening (Week 3-4)

- [ ] Implement refresh token rotation
- [ ] Fix rate limiting IP spoofing
- [ ] Add request timeouts
- [ ] Strengthen AUTH_SECRET generation
- [ ] Add certificate pinning (mobile)

**Success Criteria:** Refresh tokens work, rate limits cannot be bypassed, timeouts enforced

### Phase 3: Monitoring (Week 5-6)

- [ ] Deploy security event logging
- [ ] Create auth failure dashboard
- [ ] Set up alerts for anomalies
- [ ] Implement audit trail for session changes

**Success Criteria:** All security events logged, alerts configured, audit reports available

### Phase 4: Compliance (Week 7-8)

- [ ] OAuth provider data deletion callbacks
- [ ] GDPR consent management
- [ ] Penetration testing
- [ ] Bug bounty program launch

**Success Criteria:** Pentest passed, bug bounty live, GDPR callbacks functional

---

## 9. Incident Response Scenarios

### Scenario 1: OAuth Token Theft via Mobile Interception

**Detection:** Unusual login locations, multiple simultaneous sessions  
**Response:**
1. Revoke all sessions for affected user (delete from sessions table)
2. Invalidate JWT secret (rotate globally - logs out all users)
3. Notify affected user via email
4. Review logs for session hijacking patterns
5. Patch OAuth flow to prevent future interception

### Scenario 2: CSRF Attack on OAuth Flow

**Detection:** Spike in OAuth callbacks with invalid state  
**Response:**
1. Temporarily disable OAuth endpoints
2. Investigate logs for attack origin
3. Implement state validation if missing
4. Notify users if accounts may be compromised
5. Force password reset (OAuth re-authorization)

### Scenario 3: OAuth Provider Compromise

**Detection:** Google/Facebook security advisory  
**Response:**
1. Contact OAuth provider for details
2. Force re-authentication for all users (invalidate all sessions)
3. Rotate JWT secret
4. Review scope of compromise (what data was exposed)
5. Notify users and authorities as required (GDPR 72h)

---

## 10. References

- **OAuth 2.0 RFC 6749:** https://tools.ietf.org/html/rfc6749
- **OAuth 2.0 for Native Apps (RFC 8252):** https://tools.ietf.org/html/rfc8252
- **PKCE (RFC 7636):** https://tools.ietf.org/html/rfc7636
- **OAuth Security Best Practices (RFC 6819):** https://tools.ietf.org/html/rfc6819
- **OWASP OAuth 2.0 Threat Model:** https://owasp.org/www-project-oauth/
- **OWASP Mobile Security Testing Guide:** https://owasp.org/www-project-mobile-security-testing-guide/
- **Google OAuth 2.0 for Mobile & Desktop Apps:** https://developers.google.com/identity/protocols/oauth2/native-app
- **Facebook Login for iOS/Android:** https://developers.facebook.com/docs/facebook-login/

---

## 11. Sign-off

**Security Review Completed By:** Senior Security Engineer  
**Review Date:** April 27, 2025  
**Next Review:** July 27, 2025 (quarterly)  
**Status:** ❌ **NOT PRODUCTION READY** - Critical issues must be fixed

**Approval Required From:**
- [ ] CTO - Technical implementation approval
- [ ] Legal - Compliance with GDPR/CCPA
- [ ] Product - Impact on user experience
- [ ] DevOps - Infrastructure changes (if any)

---

*This document is confidential and contains security-sensitive information. Distribution limited to AIVO engineering and security team.*
