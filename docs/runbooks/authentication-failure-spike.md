# Runbook: Authentication Failure Spike

**Severity:** High  
**Last Updated:** 2026-08-31

## Symptoms

- Spike in `auth.user.login_failed` events
- Increased latency on auth endpoints
- User complaints of login issues
- Alert: Auth failure rate > 10%

## Diagnosis

### 1. Check Metrics

```bash
# View auth metrics
# (Open Grafana dashboard for auth-service)

# Key metrics:
# - login_failed count
# - token_refresh_failed count
# - verification_code_failed count
```

### 2. Check Logs

```bash
# Filter for authentication errors
# (Use observability dashboard)

# Look for patterns:
# - Specific email domains
# - Specific IP addresses
# - Specific error codes
```

### 3. Identify Root Cause

| Error Code | Likely Cause | Action |
|-----------|--------------|--------|
| `INVALID_CREDENTIALS` | User error vs attack | Check if targeted |
| `ACCOUNT_LOCKED` | Brute force | Check IP patterns |
| `TOKEN_EXPIRED` | Client bug | Check mobile app version |
| `INVALID_TOKEN` | Clock skew | Check NTP sync |

## Resolution

### If Brute Force Attack

1. **Block attacking IPs**:
   ```bash
   # Update rate limiting rules
   wrangler kv:key put "blocked_ip:{ip}" "blocked" --expiration 86400
   ```

2. **Enable stricter rate limiting**:
   - Reduce `RATE_LIMIT_MAX` temporarily
   - Increase lockout duration

3. **Notify affected users** (if breach suspected)

### If Infrastructure Issue

1. Check Auth service health:
   ```bash
   curl https://auth.aivo.app/health
   ```

2. Check database connectivity:
   ```bash
   # Check D1 binding
   wrangler d1 execute aivo-auth-db --command "SELECT 1"
   ```

3. Rollback recent changes if needed

### If Client Bug

1. Check error patterns for specific app versions
2. Notify mobile/web team
3. Prepare hotfix if critical

## Investigation Checklist

- [ ] Time range of spike
- [ ] Geographic distribution
- [ ] Affected endpoints
- [ ] Error code breakdown
- [ ] IP address patterns
- [ ] User impact estimate

## Prevention

- [ ] Rate limiting configured
- [ ] Account lockout policies
- [ ] Anomaly detection alerts
- [ ] Regular security reviews
- [ ] Client version monitoring

## Escalation

| Impact | Contact |
|--------|---------|
| < 10 users | Engineering Team |
| 10-100 users | Engineering Lead |
| > 100 users | Security Team |
| Possible breach | Security + Engineering Lead |

## Post-Incident

1. Document root cause
2. Implement permanent fix
3. Review security policies
4. Update monitoring thresholds
