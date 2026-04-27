# Incident Response Playbook - AIVO Platform

**Version:** 1.0  
**Effective Date:** April 27, 2025  
**Owner:** Security Team (security@aivo.fitness)  
**Classification:** Confidential - Internal Use Only

---

## Table of Contents

1. [Overview & Purpose](#1-overview--purpose)
2. [Incident Classification](#2-incident-classification)
3. [Response Team & Roles](#3-response-team--roles)
4. [Detection & Alerting](#4-detection--alerting)
5. [Response Procedures](#5-response-procedures)
6. [Communication Plan](#6-communication-plan)
7. [Post-Incident Review](#7-post-incident-review)
8. [Playbooks by Incident Type](#8-playbooks-by-incident-type)
9. [Tools & Resources](#9-tools--resources)
10. [Templates](#10-templates)

---

## 1. Overview & Purpose

### 1.1 Purpose

This playbook provides standardized procedures for detecting, responding to, and recovering from security incidents at AIVO. Its goals are:

- **Minimize damage** from security events
- **Protect user data** and maintain privacy
- **Meet legal obligations** (GDPR 72-hour breach notification, CCPA)
- **Restore services** quickly and safely
- **Learn from incidents** to prevent recurrence

### 1.2 Scope

This playbook covers:
- Security incidents affecting AIVO platform (API, Web, Mobile)
- Data breaches involving personal information
- Authentication compromises (OAuth token theft, session hijacking)
- Denial of Service attacks
- Infrastructure compromises
- Malicious insiders
- Third-party service incidents affecting AIVO

**Not covered:**
- Non-security bugs or outages (use incident management process)
- Privacy complaints (use DSAR procedure)

### 1.3 Incident Definition

A **security incident** is any event that:
- Compromises confidentiality, integrity, or availability of AIVO systems or data
- Results in unauthorized access, disclosure, alteration, or destruction of data
- Affects user privacy or violates GDPR/CCPA
- Poses a risk to AIVO's operations or reputation

**Examples:**
- Unauthorized access to user accounts
- Database exposure or ransomware
- OAuth token theft at scale
- API abuse or credential stuffing
- Code injection vulnerabilities exploited
- Employee account compromise
- Cloudflare Workers security incident

### 1.4 Guiding Principles

1. **Act Quickly:** Detect → Triage → Contain within hours, not days
2. **Preserve Evidence:** Do not delete logs or alter systems prematurely
3. **Communicate Early:** Notify stakeholders promptly, even if details unclear
4. **Comply with Law:** Follow GDPR 72-hour breach notification rule
5. **Be Transparent:** Honest communication with users builds trust
6. **Learn & Improve:** Every incident is an opportunity to strengthen security

---

## 2. Incident Classification

### 2.1 Severity Matrix

| Severity | Impact | Examples | Response Time | Notification |
|----------|--------|----------|---------------|--------------|
| **CRITICAL** | Severe impact, large-scale data breach, system compromise | Database leaked, OAuth token theft >10K users, Ransomware, Infrastructure takeover | < 1 hour | All hands, Legal, PR, Law enforcement |
| **HIGH** | Significant impact, sensitive data exposure, service disruption | Auth bypass vulnerability, SQL injection successful, Session hijacking at scale, DDoS >1 hour | < 4 hours | Security team, Engineering leads, Legal |
| **MEDIUM** | Moderate impact, limited data exposure, non-critical systems | Rate limit bypass, Information disclosure, Single user account takeover, Phishing campaign | < 24 hours | Security team, Engineering manager |
| **LOW** | Minor impact, no data loss, low-severity vulnerability | Missing security headers, OAuth misconfiguration, Low-severity CVE, False positive alert | < 72 hours | Security team via ticket |

### 2.2 Decision Tree

```
Incident Detected
    ↓
Assess Impact:
- How many users affected?
- What data types exposed? (PII, health, financial)
- Is data actively being exfiltrated?
- Is service degraded or down?
    ↓
Determine Severity:
CRITICAL: >10K users OR sensitive health data OR active breach
HIGH: 100-10K users OR PII exposed OR service down >1h
MEDIUM: <100 users OR information disclosure only
LOW: No user impact, configuration issue only
    ↓
Follow corresponding playbook section
```

---

## 3. Response Team & Roles

### 3.1 Incident Response Team (IRT)

**On-Call Rotation:** security@aivo.fitness with PagerDuty escalation

| Role | Responsibilities | Contact | Escalation |
|------|-----------------|---------|------------|
| **Incident Lead** | Coordinates response, makes decisions, declares severity | security@aivo.fitness | CTO |
| **Investigator** | Technical analysis, root cause, evidence collection | security@aivo.fitness | Incident Lead |
| **Communications** | Internal updates, user notifications, PR | support@aivo.fitness | CEO |
| **Legal/Compliance** | GDPR/CCPA obligations, DPA notifications, regulatory | legal@aivo.fitness | General Counsel |
| **DevOps** | Infrastructure changes, containment actions (kill switch, block IPs) | devops@aivo.fitness | Engineering Manager |
| **Product** | Feature decisions, user experience impact | product@aivo.fitness | CPO |

**After-Hours:** On-call security engineer handles initial response, escalates to Engineering Manager if critical.

### 3.2 Escalation Matrix

| Severity | Notify Within | Who to Notify |
|----------|---------------|---------------|
| **CRITICAL** | 15 minutes | All IRT roles + CEO + Board |
| **HIGH** | 1 hour | Incident Lead + Legal + DevOps |
| **MEDIUM** | 4 hours | Incident Lead + Investigator |
| **LOW** | 24 hours | Incident Lead (ticket only) |

---

## 4. Detection & Alerting

### 4.1 Security Monitoring

**Required Monitoring:**

| Event | Detection Method | Alert Threshold | Severity |
|-------|------------------|-----------------|----------|
| Auth failures (401) | Cloudflare logs + Datadog | >10/min from single IP | HIGH |
| Rate limit hits (429) | KV metrics | >50/min globally | MEDIUM |
| OAuth verification failures | API logs | >5/min | HIGH |
| SQL errors | Error logs | Any | MEDIUM |
| Session deletions spike | Audit log | >10x baseline | HIGH |
| New user creation spike | User table | >100/min | MEDIUM |
| 5xx error rate | API metrics | >5% over 5min | HIGH |
| Large file uploads (10MB+) | Request logs | Any from non-whitelisted IP | MEDIUM |
| Turnstile failures | Auth logs | >10/min | MEDIUM |
| JWT signature failures | Auth logs | Any | HIGH |
| Database connection errors | D1 metrics | >10/min | HIGH |
| Suspicious API patterns | SIEM anomaly detection | Statistical outlier | MEDIUM |

### 4.2 Alert Configuration

**Alerting Rules (Datadog/Grafana):**

```yaml
# Example Datadog monitor
- name: "High Auth Failure Rate"
  type: metric alert
  query: |
    sum(last_5m):sum:api.auth.failed{*}.rollup(sum, 60) > 10
  alert_message: |
    High authentication failure rate detected: {{ value }} failures in 5min
    Potential credential stuffing attack in progress.
  notify: ["security-slack", "pagerduty-critical"]
  priority: 1
```

**Alert Channels:**
- **Slack:** #security-alerts (all incidents)
- **PagerDuty:** Critical + High incidents (24/7)
- **Email:** Daily security digest (medium + low)
- **SMS:** Critical incidents only (PD)

### 4.3 Manual Detection

If you discover an incident through other means:

1. **Immediately** notify security@aivo.fitness
2. **Do not** investigate on production without IRT approval
3. **Preserve logs** - do not delete anything
4. **Document** what you observed, when, and how

---

## 5. Response Procedures

### 5.1 Standard Response Workflow

All incidents follow this lifecycle:

```
┌─────────────┐
│  1. DETECT  │ ← Alert or manual report
└──────┬──────┘
       ↓
┌─────────────┐
│  2. TRIAGE  │ ← Classify severity, assign team
└──────┬──────┘
       ↓
┌─────────────┐
│ 3. CONTAIN  │ ← Stop spread, preserve evidence
└──────┬──────┘
       ↓
┌─────────────┐
│ 4. INVESTIGATE │ ← Root cause, scope, impact
└──────┬──────┘
       ↓
┌─────────────┐
│ 5. REMEDIATE  │ ← Fix vulnerability, recover data
└──────┬──────┘
       ↓
┌─────────────┐
│ 6. NOTIFY    │ ← Users, authorities, partners
└──────┬──────┘
       ↓
┌─────────────┐
│7. POST-MORTEM│ ← Lessons learned, improvements
└─────────────┘
```

### 5.2 Step 1: Detection & Initial Response

**When alert triggers or incident reported:**

1. **Acknowledge alert** within 15 minutes (CRITICAL) or 1 hour (HIGH)
2. **Verify** it's not a false positive
3. **Gather initial information:**
   - What systems are affected?
   - What time did it start?
   - Any user reports?
4. **Declare incident** if confirmed
5. **Page Incident Lead** (use PagerDuty "create incident" function)
6. **Create incident channel** in Slack: `#incident-<yyyymmdd>-<short-name>`
7. **Invite** IRT members to channel

**Initial Channel Message Template:**
```
🚨 INCIDENT DECLARED: <Brief description>

Severity: <CRITICAL/HIGH/MEDIUM/LOW>
Time: <timestamp>
Affected systems: <list>
 suspected: <what we think happened>

Incident Lead: @<name>
Investigator: @<name>
Communications: @<name>

All hands: Please join #incident-<id> for coordination.
```

### 5.3 Step 2: Triage & Assessment

**Incident Lead responsibilities:**

1. **Classify severity** using matrix above
2. **Escalate** according to severity matrix
3. **Create incident ticket** in Jira/Linear:
   ```
   Incident: <Title>
   Severity: <level>
   Detected: <time>
   Reported by: <person>
   Initial assessment: <brief description>
   ```
4. **Gather facts** (do not disturb production):
   - Query monitoring dashboards
   - Review recent logs (last 1 hour)
   - Check for similar incidents historically
5. **Determine scope:**
   - How many users affected?
   - What data types?
   - Is it still ongoing?
6. **Document** all findings in incident channel and ticket

**Triage Assessment Template:**
```
ASSESSMENT:
- Start time: <time>
- Detection method: <alert/user report/internal scan>
- Affected systems: <API, Web, Mobile, DB>
- Preliminary impact: <data loss? service down? reputational?>
- Preliminary severity: <level>
- Initial hypothesis: <what we think happened>
```

### 5.4 Step 3: Containment

**Goal: Stop the bleeding. Prevent further damage.**

**Immediate Actions (within 1 hour):**

| Scenario | Containment Action |
|----------|-------------------|
| **OAuth token theft** | Invalidate all sessions (rotate JWT secret), revoke tokens in DB |
| **SQL injection active** | Block malicious IPs at Cloudflare WAF, disable affected endpoint |
| **Data exfiltration** | Identify data accessed, revoke API keys, disable compromised accounts |
| **DDoS attack** | Enable Cloudflare "Under Attack" mode, increase rate limits, block IP ranges |
| **Malware/compromise** | Isolate affected worker/instance, rotate all secrets, force password resets |
| **Account takeover (many users)** | Disable password reset flows, reset all user sessions, notify users |

**Containment Commands:**

```bash
# 1. Rotate JWT secret (logs out all users)
wrangler secret put AUTH_SECRET --new-value <generated>

# 2. Block IP at Cloudflare
curl -X POST "https://api.cloudflare.com/client/v4/zones/<zone>/firewall/rules" \
  -H "Authorization: Bearer <token>" \
  -d '{"paused":false,"description":"Block malicious IP","action":"block","filter":{"expression":"ip.src == 1.2.3.4"}}'

# 3. Disable problematic endpoint (temporary)
# In Cloudflare dashboard → Workers → Routes → Disable route

# 4. Revoke all OAuth sessions (delete from sessions table)
# Via wrangler d1 execute or direct DB access
```

**Important:** Before taking production action:
- **Document** what you're about to do
- **Get approval** from Incident Lead + CTO (if possible)
- **Consider impact** on legitimate users (avoid over-blocking)

### 5.5 Step 4: Investigation

**Goal: Understand what happened, why, and how to fix it.**

**Investigator responsibilities:**

1. **Preserve evidence:**
   - Do not delete logs
   - Create read-only copies of relevant logs
   - Export Cloudflare logs for affected time period
   - Save database query logs
   - Capture network traffic if available

2. **Collect forensic data:**
   ```
   Required evidence:
   - [ ] Cloudflare access logs (last 24h around incident)
   - [ ] Worker console logs
   - [ ] D1 query logs (if available)
   - [ ] R2 access logs (if files accessed)
   - [ ] KV operation logs
   - [ ] GitHub commit history (check for recent changes)
   - [ ] OAuth provider logs (if compromised)
   - [ ] Application logs with request IDs
   - [ ] Screenshots of attacker activity (if observed)
   ```

3. **Timeline reconstruction:**
   - When did attacker first access system?
   - What actions did they take?
   - What data was accessed or modified?
   - How did they gain access? (vulnerability, stolen creds, social engineering)
   - How long were they present?

4. **Impact assessment:**
   - Count affected users (unique user IDs)
   - Classify data types accessed:
     - PII (email, name) → GDPR/CCPA notification required
     - Health data (body metrics, workouts) → GDPR sensitive data
     - OAuth tokens → Must be revoked
   - Determine if data was exfiltrated (downloaded) or just viewed
   - Assess financial impact (fraud potential)

5. **Root cause analysis:**
   - What vulnerability enabled incident?
   - Was it known and unpatched?
   - Configuration error?
   - Human error?
   - Supply chain compromise?

**Investigation Template:**

```
INCIDENT TIMELINE:
<time> - Alert triggered
<time> - Incident declared
<time> - Containment actions taken
<time> - Evidence collected

ROOT CAUSE:
<vulnerability or failure that allowed incident>

ATTACK VECTOR:
<how attacker gained access>

DATA ACCESSED:
- Users affected: <count>
- Data types: <PII, health, etc.>
- Evidence of exfiltration: <yes/no/unknown>

SCOPE:
- Production systems: <list>
- Development systems: <list>
- Third-party services: <list>

CURRENT STATUS:
- Containment: <complete/in progress>
- Eradication: <complete/in progress>
- Recovery: <not started>
```

### 5.6 Step 5: Remediation

**Goal: Fix vulnerability, recover systems, prevent recurrence.**

**Remediation Phases:**

#### 5.6.1 Eradication
- Remove attacker's foothold (delete backdoors, malicious code)
- Rotate all compromised credentials/secrets
- Patch identified vulnerabilities
- Remove attacker-created accounts or data

#### 5.6.2 Recovery
- Restore systems from clean backups (if compromised)
- Bring services back online
- Monitor for recurrence (increased alerting)
- Validate normal operation

#### 5.6.3 Hardening
- Implement additional controls to prevent similar incident
- Update security policies
- Improve monitoring/alerting
- Train staff on lessons learned

**Remediation Checklist:**

| Action | Responsible | Status |
|--------|-------------|--------|
| Patch vulnerable code | Engineering | |
| Rotate all secrets (AUTH_SECRET, API keys) | DevOps | |
| Revoke all active sessions | DevOps | |
| Deploy security fixes to production | DevOps | |
| Update WAF rules | Security | |
| Review and update monitoring | Security | |
| Conduct team retraining | Security Lead | |
| Update incident response plan | Security Lead | |

### 5.7 Step 6: Notification

**Goal: Fulfill legal obligations and maintain user trust.**

#### 5.7.1 Internal Notification

**Who to notify internally:**
- All employees (via company Slack/email) - for CRITICAL incidents
- Engineering team - always
- Legal department - always
- Executive team - for HIGH+ incidents
- Board of Directors - for CRITICAL incidents

**Internal notification template:**
```
Subject: [CONFIDENTIAL] Security Incident - <Title>

Summary:
<Brief description, severity, impact>

Timeline:
- Detected: <time>
- Current status: <containment/recovery/etc.>

Impact:
- Users affected: <count or unknown>
- Data types: <list>
- Service status: <up/down/ degraded>

Actions taken:
- <list of containment actions>

Next steps:
- <remediation plan>

Point of contact: <Incident Lead email/Slack>
```

#### 5.7.2 External Notification (GDPR/CCPA)

**GDPR Breach Notification (72 hours to authority):**

**When required:**
- Personal data breach (unauthorized access, disclosure, alteration, loss)
- Likely to result in risk to rights and freedoms of individuals
- **Unless** unlikely to result in risk (document assessment)

**Who to notify:**
- Lead supervisory authority (where main establishment is, or where most affected users reside)
- For multi-jurisdiction: Notify cross-border DPA (e.g., Irish DPC if EU HQ)
- Use ICO template or authority-specific form

**What to include:**
1. Nature of breach
2. Categories and approximate number of data subjects
3. Likely consequences
4. Measures taken to contain and mitigate
5. Contact point for further information

**CCPA Breach Notification (45 days to users + Cal. AG):**

**When required:**
- Unauthorized access to personal information
- Exfiltration, theft, disclosure
- Reasonable belief that data was accessed by unauthorized person

**Notification method:**
- Individual notice to affected users (email, postal mail)
- Substitute notice (website posting + media) if >500,000 residents affected
- Notify California Attorney General if >500 residents affected

**Content:**
- Incident overview
- Types of personal information involved
- Steps taken to mitigate
- Steps users should take (if identity theft risk)
- Contact information

#### 5.7.3 User Notification

**When to notify users:**
- **HIGH/CRITICAL:** Within 7 days (or sooner if required)
- **MEDIUM:** Within 30 days (if PII exposed)
- **LOW:** May not require notification (document decision)

**User notification template:**
```
Subject: Important Security Notice from AIVO

Dear AIVO User,

We are writing to inform you of a security incident that may have affected your account.

<Brief description of what happened in plain language>
<When it occurred>
<What data was involved - be specific but don't provide attacker details>

What We've Done:
<Containment actions taken>
<Steps we're taking to prevent recurrence>

What You Should Do:
- [Change your password (if password-based - not applicable)]
- [Review account activity]
- [Enable additional security (if available)]
- [Monitor for suspicious emails/charges]
- [Contact us with questions]

We take the security of your data seriously and apologize for any inconvenience.
You may contact our security team at security@aivo.fitness.

Sincerely,
AIVO Security Team
```

#### 5.7.4 Third-Party Notification

**Notify:**
- **Cloudflare** (if Workers/D1 compromised): security@cloudflare.com
- **OAuth providers** (Google/Facebook) if OAuth tokens stolen: Use provider incident reporting
- **Stripe** (if payment data affected): Stripe support immediately
- **Partners/customers** (Enterprise tier users): Direct notification within SLA

---

## 6. Communication Plan

### 6.1 Communication Channels

| Audience | Channel | Timing | Responsible |
|----------|---------|--------|-------------|
| **IRT members** | Slack incident channel | Immediate | Incident Lead |
| **Engineering team** | Engineering Slack | Within 1 hour (HIGH+) | Communications |
| **All employees** | Company-wide email | Within 4 hours (CRITICAL) | CEO/CTO |
| **Affected users** | Email + in-app notification | Within 7 days (HIGH+) | Communications |
| **Regulators** | Email/portal submission | Within 72 hours (GDPR) | Legal |
| **Media/PR** | Press release (if needed) | Within 24 hours (CRITICAL) | PR firm |
| **Investors** | Board email/update | Within 24 hours (CRITICAL) | CEO |

### 6.2 Communication Guidelines

**Do:**
- ✅ Be honest and transparent
- ✅ Use clear, non-technical language for users
- ✅ Take responsibility
- ✅ Provide actionable advice to users
- ✅ Update regularly (daily during incident, weekly during recovery)
- ✅ Document everything

**Don't:**
- ❌ Speculate or assign blame during incident
- ❌ Downplay severity
- ❌ Promise specific outcomes before investigation complete
- ❌ Share technical details that could enable further attacks
- ❌ Use legal jargon in user communications

### 6.3 Status Updates

**During incident (recovery phase):**
- Update incident channel every 4 hours (or more frequently if active)
- Daily summary to all employees (if multi-day)
- User update email if investigation reveals new information

**Post-incident:**
- Final incident report distributed to all employees
- Summary published on status page (if public-facing)
- Lessons learned shared in engineering all-hands

---

## 7. Post-Incident Review

### 7.1 Timeline

- **Immediate (within 24h of resolution):** Quick retrospective with IRT
- **Full post-mortem (within 7 days):** Detailed analysis document
- **Remediation tracking (30 days):** Ensure all improvements implemented
- **Follow-up (90 days):** Verify no recurrence, adjust controls

### 7.2 Post-Mortem Template

```markdown
# Incident Post-Mortem: <Title>

## Incident Overview
- **Incident ID:** INC-2025-XXX
- **Severity:** <level>
- **Start/End:** <datetime> - <datetime>
- **Duration:** <X hours/days>
- **Incident Lead:** <name>

## Timeline
| Time (UTC) | Event |
|------------|-------|
| <time> | Alert triggered |
| <time> | Incident declared |
| <time> | Containment complete |
| <time> | Root cause identified |
| <time> | Services restored |
| <time> | Incident resolved |

## Impact Assessment
- **Users affected:** <count> (X% of total)
- **Data types exposed:** <list>
- **Service downtime:** <duration>
- **Financial loss:** <$X or N/A>
- **Reputation impact:** <low/medium/high>

## Root Cause Analysis
**Primary cause:** <e.g., SQL injection due to unsanitized input>

**Contributing factors:**
1. <factor 1>
2. <factor 2>

**Why did it happen?** (5 Whys)
1. Why was vulnerability present? → <answer>
2. Why wasn't it caught? → <answer>
3. ...

## Evidence Collected
- Cloudflare logs: <link to stored logs>
- Worker console output: <link>
- Database queries: <summary>
- Code changes: <commit SHA>

## What Went Well
- Fast detection (<15 minutes)
- Effective containment (<1 hour)
- Clear communication
- Team coordination

## What Went Wrong
- Slow escalation (2 hours)
- Incomplete logs (missing request IDs)
- No automated rollback capability
- Debugging tools not available

## Action Items (Remediation)

| Item | Owner | Due Date | Status |
|------|-------|----------|--------|
| Add input validation to endpoint | @engineer | 2025-05-05 | Pending |
| Implement audit logging | @security | 2025-05-10 | Pending |
| Rotate all secrets | @devops | 2025-04-28 | ✅ Complete |
| Update monitoring alert | @sre | 2025-05-03 | In Progress |

## Follow-up
- [ ] Review action items at weekly engineering meeting
- [ ] Verify all actions complete by due date
- [ ] Update security policies if needed
- [ ] Schedule team training on incident lessons
```

### 7.3 Blameless Culture

**Post-mortems are NOT about finding who to blame.** They are about:
- Understanding systemic failures
- Improving processes and tools
- Preventing future incidents

**Guidelines:**
- Focus on "what" and "how", not "who"
- Assume good intentions
- Identify process gaps, not individual mistakes
- Celebrate transparency in reporting incidents

---

## 8. Playbooks by Incident Type

### 8.1 OAuth Token Theft

**Scenario:** Attacker intercepts or steals JWT tokens (mobile URL leak, XSS, session hijacking)

**Detection:**
- Spike in token validation failures
- Same user ID authenticating from multiple geographic locations simultaneously
- Unusual API usage patterns from valid tokens

**Response:**

1. **Immediate (<15 min):**
   ```
   - Rotate AUTH_SECRET immediately (invalidates all tokens)
   - Delete all sessions from sessions table
   - Clear rate limit KV namespace (reset counters)
   ```

2. **Investigation (<1 hour):**
   ```
   - Identify how tokens were stolen:
     • Mobile OAuth: Check if token in URL/referrer
     • Web XSS: Check for XSS vulnerabilities
     • Network: Check for MITM (no HTTPS?)
   - Find affected users:
     • Query logs for token usage from suspicious IPs
     • Check for same user ID from multiple locations
   - Determine data accessed
   ```

3. **Notification (<4 hours):**
   ```
   - Notify all users via email (forced logout)
   - Require all users to re-authenticate
   - If >10K users affected, notify authorities (GDPR Article 34)
   ```

4. **Remediation (<24 hours):**
   ```
   - Fix vulnerability (PKCE for mobile, CSP for web, etc.)
   - Implement token binding to device/IP (future)
   - Add anomaly detection for token reuse
   - Reduce token lifetime from 7 days to 1 day
   ```

5. **Follow-up:**
   ```
   - Audit all OAuth flows
   - Implement certificate pinning (mobile)
   - Add login notification emails
   ```

---

### 8.2 Data Breach (Database Exposure)

**Scenario:** Unauthorized access to D1 database, data exfiltration

**Detection:**
- Unusual D1 query patterns (full table scans)
- Alert from Cloudflare about database access
- Anonymous tip or dark web listing

**Response:**

1. **Immediate (<30 min):**
   ```
   - Revoke all database access credentials
   - Enable D1 read-only mode (if possible) or disable API endpoints
   - Preserve database backup for forensics (do not overwrite)
   - Block attacker IPs at Cloudflare
   ```

2. **Investigation (<4 hours):**
   ```
   - Determine access vector:
     • Compromised Worker secret? → Rotate all secrets
     • SQL injection? → Review code for injection vulnerabilities
     • Cloudflare account compromise? → Rotate all Cloudflare API tokens
   - What data accessed?
     • Run audit query: SELECT * FROM <table> WHERE timestamp > <incident_start>
     • Identify unique user IDs affected
   - Was data exfiltrated?
     • Check D1 egress logs
     • Look for large query results
   ```

3. **Assessment (<24 hours):**
   ```
   - Classify data types:
     • PII count (email, name)
     • Health data count (body metrics, workouts)
     • OAuth tokens count
   - Determine GDPR notification requirement:
     • If >500 EU users affected → notify DPA within 72h
     • If risk to rights → notify users without delay
   - Determine CCPA notification requirement:
     • If >500 CA residents → notify AG + users within 45 days
   ```

4. **Notification (<72 hours for GDPR):**
   ```
   - Notify supervisory authority (with DPA template)
   - Notify affected users (individual email or substitute notice)
   - Notify Cloudflare (if their infrastructure involved)
   ```

5. **Remediation (<1 week):**
   ```
   - Rotate all database connection strings
   - Implement column-level encryption for sensitive fields
   - Deploy audit logging (track all data access)
   - Enable D1 access logging (if available)
   - Review and tighten WAF rules
   ```

6. **Long-term (<1 month):**
   ```
   - Implement data loss prevention (DLP) monitoring
   - Quarterly database access audits
   - Penetration testing for SQL injection
   ```

---

### 8.3 DDoS Attack

**Scenario:** Service degraded or unavailable due to overwhelming traffic

**Detection:**
- Spike in Workers request count (Cloudflare analytics)
- Increased latency, timeout errors
- Rate limit alerts (excessive 429s)
- Cloudflare "Under Attack" mode automatically triggered

**Response:**

1. **Immediate (<5 min):**
   ```
   - Enable Cloudflare "I'm Under Attack" mode
     → Requires JavaScript challenge (Turnstile)
   - Increase rate limit thresholds temporarily:
     • Default: 300/min → increase to 1000/min temporarily
     • Auth: 5/15min → keep low to prevent credential stuffing
   - Block top offending IPs (use Cloudflare firewall)
   - Notify team via #incidents channel
   ```

2. **Mitigation (<30 min):**
   ```
   - Deploy additional Cloudflare firewall rules:
     • Block countries not in target market (if applicable)
     • Challenge all traffic from ASNs known for abuse
   - Enable Argo Smart Routing (if subscribed)
   - Increase Worker CPU/memory limits (if hitting limits)
   ```

3. **Analysis (<2 hours):**
   ```
   - Determine attack type:
     • Layer 7 (HTTP flood) → mitigated by WAF/Turnstile
     • Layer 3/4 (SYN flood, UDP flood) → Cloudflare handles automatically
   - Identify source: Targeted or random?
   - Check for ransom demands (typical for DDoS extortion)
   ```

4. **Communication (<1 hour):**
   ```
   - Post status to status.aivo.fitness (if public)
   - Notify users of service degradation
   - Update stakeholders (investors, partners if critical)
   ```

5. **Post-Mortem (<24 hours):**
   ```
   - Analyze traffic logs to understand attack
   - Document Cloudflare rules that were effective
   - Consider DDoS mitigation service upgrade (if severe)
   ```

---

### 8.4 Account Takeover (ATO)

**Scenario:** Attacker gains access to user account via stolen OAuth token or session hijacking

**Detection:**
- User reports unauthorized activity
- Unusual login location/time (detected via anomaly detection)
- Multiple password reset requests from same account

**Response:**

1. **Immediate (<1 hour):**
   ```
   - Force logout of all sessions for affected user:
     • Delete from sessions table WHERE userId = <user_id>
     • Clear user's cached data in KV
   - Reset user's OAuth connections (if Google/Facebook token stolen)
   - Temporarily disable account (prevent further logins)
   - Contact affected user via verified email (out-of-band)
   ```

2. **Investigation (<4 hours):**
   ```
   - Determine how account compromised:
     • Token theft? → Check OAuth flow for PKCE issues
     • Session hijacking? → Check for XSS, insecure storage
     • Phishing? → Review user login history for suspicious IPs
   - What actions did attacker take?
     • Review user's activity logs (workouts created, data viewed)
     • Check for data export/download
     • Check for messages sent to other users (if social features)
   - Is attacker still active? → Check for recent sessions
   ```

3. **User Notification (<24 hours):**
   ```
   Email to affected user:
   - Inform them of incident (if confirmed unauthorized access)
   - List actions taken (sessions revoked, account secured)
   - Provide steps they should take:
     • Review recent activity
     • Check connected apps (Google/Facebook security)
     • Enable 2FA on OAuth provider account
   - Offer credit monitoring if financial data involved
   ```

4. **Remediation (<1 week):**
   ```
   - Implement anomaly detection for login patterns
   - Add device fingerprinting (optional)
   - Send login notification emails for new devices
   - Consider implementing MFA for sensitive operations
   ```

5. **Escalation:**
   ```
   - If >100 accounts affected → treat as data breach (Section 8.2)
   - Notify authorities if required by law (banking/financial data)
   ```

---

### 8.5 API Abuse / Credential Stuffing

**Scenario:** Attacker uses automated tools to brute force accounts or abuse API endpoints

**Detection:**
- High rate of 401/403 responses
- Rate limit triggers at multiple endpoints
- Single IP hitting many different user IDs

**Response:**

1. **Immediate (<15 min):**
   ```
   - Identify offending IP addresses from logs
   - Block IPs at Cloudflare WAF:
     curl -X POST "https://api.cloudflare.com/.../firewall/rules" \
       -d '{"action":"block","expression":"ip.src in {1.2.3.4 5.6.7.8}"}'
   - Increase rate limits on affected endpoints temporarily
   - Enable Turnstile CAPTCHA for auth endpoints
   ```

2. **Investigation (<2 hours):**
   ```
   - Check if any accounts compromised:
     • Review successful logins during attack window
     • Look for unusual activity from those accounts
   - Determine attack vector:
     • Credential stuffing (many usernames, few passwords)?
     • Password spraying (few common passwords, many users)?
     • OAuth token brute force? (unlikely - tokens are long)
   - Review rate limiting effectiveness
   ```

3. **User Notification (if accounts compromised):**
   ```
   - Force password reset (not applicable - OAuth only)
   - Force re-authentication for affected users
   - Notify via email if suspicious activity detected
   ```

4. **Remediation (<1 day):**
   ```
   - Harden rate limiting:
     • Exponential backoff after failed attempts
     • Account-based rate limiting (not just IP)
   - Add anomaly detection for credential stuffing patterns
   - Consider IP reputation service integration
   ```

---

### 8.6 Malicious Insider

**Scenario:** Employee or contractor intentionally misuses access or steals data

**Detection:**
- Unusual data access patterns (large exports, access to unrelated data)
- Whistleblower report
- Audit log review (when implemented)

**Response:**

1. **Immediate (<1 hour):**
   ```
   - Revoke all access for suspect account:
     • Disable Cloudflare Workers access
     • Disable GitHub/GitLab access
     • Disable Stripe/third-party access
     • Change all shared passwords
   - Preserve all logs and system access for investigation
   - Do NOT alert the individual (could destroy evidence)
   - Notify CEO + Legal immediately
   ```

2. **Investigation (Legal-led):**
   ```
   - Legal team leads investigation (HR, external counsel)
   - Preserve digital evidence (logs, commits, API calls)
   - Review audit logs (what data accessed, exported)
   - Interview witnesses (if appropriate)
   - Determine extent of damage
   ```

3. **Notification (Legal-approved):**
   ```
   - Notify affected users if personal data accessed
   - Notify authorities if criminal activity (theft, fraud)
   - Update investors/board as appropriate
   ```

4. **Remediation:**
   ```
   - Implement least-privilege access (no broad admin rights)
   - Deploy user behavior analytics (UBA) monitoring
   - Implement mandatoryvacation policy (detect fraud)
   - Background checks for all employees with production access
   - Quarterly access reviews
   ```

---

## 9. Tools & Resources

### 9.1 Monitoring & Alerting

| Tool | Purpose | Access |
|------|---------|--------|
| **Cloudflare Dashboard** | Workers logs, analytics, WAF | https://dash.cloudflare.com |
| **Datadog** (planned) | SIEM, dashboards, alerting | https://app.datadoghq.com |
| **Grafana** (alternative) | Dashboards, Loki logs | TBD |
| **PagerDuty** | Incident alerting, on-call rotation | https://pagerduty.com |
| **Slack** | Incident communication | #security-alerts, #incident-* |

### 9.2 Forensic Tools

| Tool | Purpose |
|------|---------|
| **Cloudflare Logpush** | Export logs to R2/S3 for long-term storage |
| **Wrangler CLI** | Execute commands against Workers/D1 |
| **Drizzle Studio** | Database inspection (local) |
| **Git log** | Code change history |
| **tcpdump/Wireshark** | Network capture (if needed) |

### 9.3 Contact Information

| Entity | Contact | Notes |
|---------|---------|-------|
| **AIVO Security Team** | security@aivo.fitness | Incident reporting |
| **AIVO Legal** | legal@aivo.fitness | Regulatory notifications |
| **Cloudflare Security** | security@cloudflare.com | Infrastructure incidents |
| **Stripe Support** | https://support.stripe.com | Payment data incidents |
| **Google Security** | https://g.co/security | OAuth token compromise |
| **Facebook Security** | https://www.facebook.com/security | OAuth token compromise |
| **ICO (UK GDPR)** | https://ico.org.uk/ | UK data protection authority |
| **CNIL (France)** | https://www.cnil.fr/ | EU DPA (example) |
| **California AG** | https://oag.ca.gov/ | CCPA enforcement |

**Emergency:** If immediate threat to life or ongoing active breach, call local law enforcement.

---

## 10. Templates

### 10.1 Incident Declaration Template

```
INCIDENT DECLARATION

Incident ID: INC-2025-<auto-increment>
Declared: <datetime UTC>
Declared by: <name>

Title: <Brief descriptive title>

Severity: <CRITICAL/HIGH/MEDIUM/LOW>

Description:
<What we know so far>

Affected Systems:
- [ ] API (Cloudflare Workers)
- [ ] Web (Next.js)
- [ ] Mobile (iOS/Android)
- [ ] Database (D1)
- [ ] Storage (R2)
- [ ] Third-party (Stripe, etc.)

Preliminary Impact:
<Users affected, data types, service impact>

Current Status:
<Detection → Triage → Containment → Investigation → Remediation → Resolved>

Next Steps:
1. <action 1> (owner: @name, ETA: <time>)
2. <action 2> (owner: @name, ETA: <time>)

Incident Channel: #incident-<yyyymmdd>-<slug>
Escalation: PagerDuty incident #<number>

---
Update frequency: Every <n> hours until resolved
Next update: <datetime>
```

### 10.2 User Notification Email Template

```
Subject: [IMPORTANT] Security Notification Regarding Your AIVO Account

Dear AIVO User,

We are writing to inform you about a security incident that may have affected your account.

WHAT HAPPENED?
On <date>, we discovered <brief description of incident>. Our investigation indicates that <what data was potentially accessed>. No financial information was involved. [Adjust based on actual data types]

WHAT WE'VE DONE
- <Containment actions taken, e.g., "Revoked all active sessions">
- <Remediation steps, e.g., "Fixed the vulnerability that allowed this">
- <Monitoring steps, e.g., "Increased security monitoring">

WHAT YOU SHOULD DO
1. Your account has been logged out. Please log in again at https://aivo.fitness
2. Review your account activity for any unusual actions
3. If you notice anything suspicious, contact us immediately at security@aivo.fitness
4. Ensure your OAuth provider (Google/Facebook) account is secure with 2FA enabled

We take the security of your data very seriously and apologize for any inconvenience this may cause. Your trust is important to us, and we are taking additional steps to prevent similar incidents in the future.

If you have questions, please contact our security team at security@aivo.fitness.

Sincerely,
The AIVO Security Team

---
AIVO Inc. • 123 Market Street, San Francisco, CA 94105
```

### 10.3 Regulatory Notification Template (GDPR)

```
To: <Data Protection Authority>

Subject: Personal Data Breach Notification - AIVO Inc.

1. CONTACT INFORMATION
Data controller: AIVO Inc.
Address: 123 Market Street, San Francisco, CA 94105, USA
DPO: DPO@aivo.fitness
Incident reference: INC-2025-XXX

2. DESCRIPTION OF THE BREACH
Date of incident: <date>
Date of discovery: <date>
Date notification made: <date>
Nature of breach: <e.g., unauthorized access to database>
Data affected: <categories, e.g., email, name, fitness data>
Number of data subjects: <approximate or exact>
Number of EU/EEA/UK residents: <approximate>

3. LIKELY CONSEQUENCES
<Describe potential impact: identity theft risk, phishing, etc.>
<Likelihood: high/medium/low>

4. MEASURES TAKEN
<Containment actions: e.g., "All sessions revoked, database access rotated">
<Remediation: e.g., "Vulnerability patched, monitoring enhanced">
<User notification: e.g., "Affected users notified via email">

5. CONTACT INFORMATION FOR FURTHER DETAILS
Contact: <name, email, phone>

---
Signature: <name>, <title>, AIVO Inc.
Date: <date>
```

### 10.4 Post-Mortem Template (Markdown)

See Section 7.3 for full template.

---

## Appendix A: Incident Communication Decision Tree

```
Incident Declared
    ↓
Is this a data breach involving personal data?
├─ Yes → GDPR/CCPA applicable?
│   ├─ EU users affected? → Notify DPA within 72h
│   ├─ CA users affected? → Notify users + AG within 45 days
│   └─ Both → Comply with both
│
└─ No → Is this a critical service outage?
    ├─ Yes → Update status page, notify users
    └─ No → Internal communication only
```

---

## Appendix B: Severity Re-assessment Trigks

**Re-assess severity if:**
- ✅ Containment successful → downgrade 1 level
- ❌ Data exfiltration confirmed → upgrade to HIGH+
- ❌ >10K users affected → CRITICAL
- ❌ Sensitive health data exposed → upgrade severity
- ❌ Regulatory involvement likely → upgrade to HIGH+

---

## Appendix C: Recovery Criteria

**Incident is RESOLVED when:**
1. ✅ Root cause identified and documented
2. ✅ Vulnerability patched and deployed
3. ✅ All compromised credentials/secrets rotated
4. ✅ Affected systems verified clean (scanned)
5. ✅ Monitoring confirms no recurrence (24h observation)
6. ✅ User notifications sent (if required)
7. ✅ Regulatory notifications complete (if required)
8. ✅ Post-mortem scheduled (within 7 days)

**DO NOT resolve incident until all criteria met.**

---

## Appendix D: On-Call Rotation

**Current On-Call Security Engineer:**

| Week | Primary | Secondary |
|------|---------|-----------|
| Apr 28 - May 4 | @senior-security | @cto |
| May 5 - May 11 | @security-engineer-2 | @senior-security |

**On-Call Responsibilities:**
- Monitor security Slack channel (#security-alerts)
- Respond to PagerDuty alerts within 15 minutes (CRITICAL) / 1 hour (HIGH)
- Declare incidents as needed
- Escalate to Engineering Manager if unable to resolve
- Document all incidents in incident channel

**Handoff:** Use PagerDuty handoff notes, update on-call schedule document.

---

**Last Updated:** April 27, 2025  
**Next Review:** July 27, 2025  
**Version:** 1.0

---

## Quick Reference Card

```
INCIDENT RESPONSE CHEAT SHEET

1. DETECTED → Acknowledge alert
2. Declare incident → Page incident lead
3. Create #incident channel → Invite team
4. Classify severity → Escalate per matrix
5. Contain → Stop spread (kill switch, block IPs)
6. Investigate → Preserve evidence, root cause
7. Notify → Internal → External (72h GDPR)
8. Remediate → Patch, rotate secrets, recover
9. Post-mortem → Document, learn, improve

SEVERITY DEFINITIONS:
CRITICAL: Data breach >10K users, infrastructure takeover → <1h response
HIGH: Auth bypass, SQLi, DoS >1h → <4h response
MEDIUM: Rate limit bypass, info disclosure → <24h response
LOW: Config errors, low CVE → <72h response

CONTACTS:
security@aivo.fitness (always)
PagerDuty: (critical alerts)
Legal: legal@aivo.fitness (GDPR notifications)

RESOURCES:
This playbook: /docs/INCIDENT_RESPONSE_PLAYBOOK.md
Security Policy: /docs/SECURITY_POLICY.md
OAuth Review: /docs/OAUTH_SECURITY_REVIEW.md
```

---

*This document is confidential and contains security-sensitive procedures. Distribution limited to AIVO security team and engineering leadership.*
