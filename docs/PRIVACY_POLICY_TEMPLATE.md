# Privacy Policy Template

**AIVO Inc.** ("AIVO", "we", "us", "our") respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your data when you use our AI-powered fitness platform.

**Last Updated:** April 27, 2025  
**Effective Date:** May 1, 2025  
**Jurisdiction:** United States (with GDPR/CCPA compliance for EU/California residents)

---

## 1. Our Privacy Commitment

At AIVO, we believe your fitness data is yours—and yours alone. Our privacy-first architecture is designed to give you complete control over your personal information while delivering powerful AI-driven insights.

**Key Principles:**
- ✅ We do NOT sell your personal data
- ✅ Body photos are deleted within 24 hours of upload
- ✅ You can export or delete your data at any time
- ✅ Industry-standard encryption protects your information
- ✅ Transparent data practices with clear choices

---

## 2. Information We Collect

### 2.1 Personal Information

When you create an account using Google or Facebook OAuth, we collect:

| Data Element | Source | Purpose | Retention |
|--------------|--------|---------|-----------|
| Email address | OAuth provider | Account identification, communications | Until account deletion |
| Full name | OAuth provider | Display name, personalization | Until account deletion |
| Profile photo | OAuth provider | Avatar display | Until account deletion |
| OAuth provider ID | OAuth verification | Authentication | 7 days (session) |
| OAuth access token | OAuth flow | API access to provider data | 7 days (session) |

**What we DON'T collect:**
- ❌ Password (we use OAuth only)
- ❌ Social graph/friends list
- ❌ OAuth refresh tokens (not requested)
- ❌ Sensitive OAuth scopes (only basic profile + email)

### 2.2 Fitness & Health Data

You provide fitness data to enhance your experience:

| Data Category | Examples | Purpose | Retention |
|---------------|----------|---------|-----------|
| **Body Metrics** | Weight, body fat %, muscle mass, height | AI analysis, progress tracking | Indefinite (user-controlled) |
| **Body Photos** | Uploaded images for analysis | AI-powered body composition | **24 hours** (auto-deleted) |
| **Workout History** | Exercises, sets, reps, duration | Training log, progress charts | Indefinite (user-controlled) |
| **Nutrition Logs** | Food entries, calories, macros | Dietary tracking, AI recommendations | Indefinite (user-controlled) |
| **Biometric Data** | Sleep, HRV, resting heart rate | Recovery analysis, wellness insights | Indefinite (user-controlled) |
| **AI Interactions** | Chat queries, AI responses | Service delivery, improvement | 26 months (anonymized) |

**Health Data Sensitivity:** We treat fitness and biometric data as sensitive personal information. This data is encrypted at rest and in transit, with strict access controls.

### 2.3 Technical Data

Automatically collected when you use our platform:

| Data Element | Collection Method | Purpose |
|--------------|-------------------|---------|
| Device information | Browser/OS detection | Compatibility, analytics |
| IP address | Network request | Security (rate limiting, fraud detection) |
| Approximate location | IP geolocation | Content optimization, security |
| Usage analytics | Event tracking | Product improvement (anonymized) |
| Crash logs | Sentry/Bugsnag | Debugging, stability improvement |
| Performance metrics | Web Vitals, API timing | Performance optimization |

**Analytics Anonymization:**
- All analytics data is aggregated and anonymized
- IP addresses truncated to /24 subnet
- User IDs replaced with random identifiers
- Personal data removed before analysis

---

## 3. How We Use Your Data

### 3.1 Service Delivery

We process your data to provide the AIVO platform:

| Processing Activity | Legal Basis (GDPR) | Data Types |
|---------------------|--------------------|------------|
| Account creation & authentication | Performance of contract | Email, name, OAuth ID |
| AI body composition analysis | Consent + Legitimate interest | Body photos, metrics |
| Workout tracking & scheduling | Performance of contract | Workout logs, goals |
| Nutrition logging & AI advice | Performance of contract | Food logs, preferences |
| Progress visualization | Legitimate interest | All fitness data |
| Push notifications | Consent | Device token, user ID |
| Customer support | Legitimate interest | Account info, relevant data |
| Service improvement | Legitimate interest | Anonymized analytics |
| Fraud prevention | Legitimate interest | IP, device, usage patterns |

### 3.2 AI Model Training

**What we do:**
- Use aggregated, anonymized data to improve AI models
- Remove all personally identifiable information
- Use differential privacy techniques where applicable
- You may opt out via account settings (coming soon)

**What we DON'T do:**
- ❌ Train on your body photos (deleted after processing)
- ❌ Use your chat conversations for training (unless explicitly opted in)
- ❌ Share raw training data with third parties
- ❌ Re-identify anonymized data

### 3.3 Marketing & Communications

**Optional communications:**
- Product updates (required for account holders)
- Security alerts (required)
- Educational content (opt-in)
- Promotional offers (opt-in)

**Unsubscribe:** Any marketing email includes one-click unsubscribe. You may also opt out via account settings.

---

## 4. Data Sharing & Third Parties

### 4.1 We Do NOT Sell Your Data

AIVO does not and will never sell your personal information to advertisers or data brokers.

### 4.2 Service Providers

We share data only with trusted partners who help deliver our services:

| Partner | Purpose | Data Shared | Location |
|---------|---------|-------------|----------|
| **Cloudflare** | Hosting, CDN, D1 database, R2 storage | All operational data | Global edge network |
| **Stripe** | Payment processing (subscriptions) | Billing info only | US/EU (based on customer) |
| **Google** | OAuth authentication, AI services | Email, name (OAuth only) | US |
| **Facebook** | OAuth authentication | Email, name (OAuth only) | US |
| **Sentry** | Error monitoring (optional) | Stack traces, user ID | US/EU |

**Partner Obligations:**
- All partners sign Data Processing Agreements (DPAs)
- Partners may only use data for specified purposes
- Partners must comply with GDPR/CCPA as applicable
- Partners cannot sell or share data with sub-processors without consent

### 4.3 Legal Disclosures

We may disclose data if required by law or to protect rights:
- Comply with valid legal requests (subpoenas, court orders)
- Protect AIVO's rights, property, or safety
- Investigate potential violations of our Terms
- Emergency situations requiring disclosure

We will notify you of such disclosures when legally permissible.

### 4.4 Business Transfers

If AIVO undergoes merger, acquisition, or asset sale:
- Your data will remain subject to this Privacy Policy
- You will be notified of any change in data controller
- You may choose to delete your account within 30 days

---

## 5. Data Security

### 5.1 Security Measures

**Technical Safeguards:**
- **Encryption:** AES-256 at rest, TLS 1.3 in transit
- **Authentication:** OAuth 2.0 + JWT with 7-day expiry
- **Access Control:** Role-based access with audit logging
- **Network Security:** Cloudflare WAF, DDoS protection, firewall rules
- **Secrets Management:** Cloudflare Secrets, never in code
- **Monitoring:** Real-time security event detection
- **Penetration Testing:** Annual external security assessments

**Organizational Safeguards:**
- Security training for all employees
- Background checks for engineers with production access
- Incident response procedures (24/7 on-call)
- Principle of least privilege for all systems

### 5.2 Data Breach Notification

**If your personal data is compromised:**
- **EU Residents:** Notify within 72 hours per GDPR
- **California Residents:** Notify per CCPA requirements
- **All Users:** We will notify via email and in-app message
- Notification includes: breach details, data types affected, steps we're taking, recommended user actions

---

## 6. Your Rights & Choices

### 6.1 GDPR Rights (EU Residents)

You have the following rights under GDPR:

| Right | Description | How to Exercise |
|-------|-------------|-----------------|
| **Access** | Obtain copy of your personal data | Email privacy@aivo.fitness |
| **Rectify** | Correct inaccurate data | Update via app settings |
| **Erase** | Delete your data ("right to be forgotten") | Delete account in settings |
| **Restrict** | Limit certain processing | Contact DPO@aivo.fitness |
| **Data Portability** | Export data in machine-readable format | Use `/api/export` endpoint |
| **Object** | Opt out of certain processing | Adjust consent preferences |
| **Withdraw Consent** | Remove consent for marketing | Unsubscribe or update settings |

**Response Time:** We respond within 30 days (may extend to 60 days for complex requests)

### 6.2 CCPA Rights (California Residents)

- **Right to Know:** Request disclosure of personal information collected, sold, or disclosed
- **Right to Delete:** Request deletion of personal information
- **Right to Opt Out:** We do not sell data, but you may opt out of sharing for cross-context behavioral advertising
- **Right to Non-Discrimination:** We will not discriminate for exercising CCPA rights

**Submit Requests:** privacy@aivo.fitness or mail to AIVO Inc., Attn: Privacy Team, San Francisco, CA 94105

**Verification:** We may verify your identity before fulfilling requests to protect your data.

### 6.3 Account Management

**Via the App:**
- **Export Data:** Settings → Privacy → Export My Data (JSON/CSV)
- **Delete Account:** Settings → Privacy → Delete Account
- **Download Photos:** Photos are auto-deleted; use export to retain copies
- **Opt Out of Marketing:** Settings → Notifications → Marketing emails OFF

**Effects of Deletion:**
- Account deactivated immediately
- Data deleted from production within 30 days
- Backups retained for 30 days then destroyed
- Anonymized analytics retained for research

---

## 7. Data Retention

We retain personal data only as long as necessary:

| Data Type | Retention Period | Deletion Trigger |
|-----------|------------------|------------------|
| Account info (email, name) | Until account deletion | User-initiated deletion |
| Fitness data (workouts, metrics) | Indefinite | User deletion or account closure |
| Body photos | **24 hours** | Automatic deletion after AI processing |
| AI chat history | 26 months | Automatic anonymization after 26mo |
| Access logs | 90 days | Automatic deletion |
| Error logs | 90 days | Automatic deletion |
| Backups | 30 days | Retention period expiry |

**Retention Appeals:** Contact privacy@aivo.fitness to request shorter retention periods (we may accommodate reasonable requests).

---

## 8. Cookies & Tracking

### 8.1 Cookie Categories

| Category | Purpose | Examples | Duration |
|----------|---------|----------|----------|
| **Essential** | Authentication, session management | `auth_token` (httpOnly) | Session or 7 days |
| **Preference** | Language, theme, display settings | `locale`, `theme` | 1 year |
| **Analytics** | Usage tracking, performance (optional) | `_ga`, `_gid` | 2 years |

**Essential cookies** are required for the service to function. Disabling them will log you out and prevent platform use.

### 8.2 Third-Party Cookies

We do NOT use third-party advertising cookies (Google Analytics, Facebook Pixel, etc.).

**Analytics Implementation:**
- If enabled, uses self-hosted Matomo or Plausible
- No cross-site tracking
- IP anonymization enabled
- Do Not Track respected

### 8.3 Cookie Management

**Browser Controls:** Use browser settings to block/delete cookies  
**Consent Banner:** First-time visitors see cookie consent (EU requirement)  
**Opt-Out Link:** "Cookie Settings" link in footer (coming soon)

---

## 9. Children's Privacy

AIVO is **not intended for users under 16 years of age**.

We do not knowingly collect personal information from children. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately at privacy@aivo.fitness and we will delete that information.

**Age Verification:** OAuth providers require minimum age 13-16 depending on jurisdiction. We rely on providers' age gates.

---

## 10. International Data Transfers

### 10.1 Global Infrastructure

AIVO uses Cloudflare's global edge network. Your data may be processed in any country where Cloudflare maintains servers, including:

- **United States** (primary data residency)
- **European Union** (EU data centers available)
- **Canada, United Kingdom, Australia, Japan** (additional locations)

### 10.2 Transfer Mechanisms

**EU-US Data Privacy Framework:**
- Cloudflare participates in the EU-US Data Privacy Framework
- Provides adequacy for transfers from EU/EEA/UK

**Standard Contractual Clauses (SCCs):**
- Available upon request for additional protection
- Contact DPO@aivo.fitness to request SCCs

**EU-Only Storage Option:**
- EU residents may request EU-only data storage
- Contact support@aivo.fitness to enable

---

## 11. Data Processing Agreement (DPA)

Enterprise customers (gyms, trainers, corporate wellness programs) may request a Data Processing Agreement. Contact legal@aivo.fitness for details.

**DPA Includes:**
- Processor obligations (security, assistance, confidentiality)
- Sub-processor list and notification requirements
- Data subject rights assistance
- Security incident notification (24h)
- Data return or deletion upon termination
- Audit rights

---

## 12. Updates to This Policy

We may update this Privacy Policy to reflect:
- Changes in our data practices
- New legal or regulatory requirements
- Evolution of our services

**Notification:**
- We will notify you via email at least 30 days before material changes
- The "Last Updated" date will be revised
- Continued use after changes constitutes acceptance

**Objection Rights:** You may object to changes by deleting your account before they take effect.

---

## 13. Contact Information

**Privacy Team:** privacy@aivo.fitness  
**Data Protection Officer:** DPO@aivo.fitness  
**Legal Department:** legal@aivo.fitness  
**Mailing Address:**  
AIVO Inc.  
Attn: Privacy Team  
123 Market Street, Suite 400  
San Francisco, CA 94105  
United States

**Response Time:** We typically respond within 48 hours. EU residents may also contact our EU representative at eu-representative@aivo.fitness.

**Complaints:** If you are unsatisfied with our response, you may lodge a complaint with your local data protection authority.

---

## 14. Definitions

| Term | Definition |
|------|------------|
| **Personal Data** | Information relating to an identified or identifiable natural person |
| **Processing** | Any operation performed on personal data (collection, storage, use, deletion) |
| **Data Subject** | The individual whose personal data is processed (you) |
| **Data Controller** | Entity determining purposes and means of processing (AIVO Inc.) |
| **Data Processor** | Entity processing data on behalf of controller (Cloudflare, Stripe) |
| **PII** | Personally Identifiable Information (any data that can identify you) |
| **PHI** | Protected Health Information (HIPAA term; AIVO is not a HIPAA covered entity) |

---

## Appendix A: Data Subject Request Form

To exercise your rights, please email privacy@aivo.fitness with:

```
Subject: Data Subject Request - [TYPE: Access/Delete/Export/Rectify]

Body:
1. Your full name: _______________
2. Your email address: _______________
3. Request type: _______________
4. Details of request (e.g., date range for data export): _______________
5. Supporting documentation (if rectification request): _______________

I confirm that I am the data subject or authorized representative.
Signature: _______________
Date: _______________
```

**Processing Time:** 30 days (may extend to 60 days for complex requests)

---

## Appendix B: Cookie Consent Implementation

**Required for EU/EEA/UK visitors:**

```javascript
// Cookie consent banner implementation
const consent = await getCookieConsent();
if (!consent) {
  showBanner({
    essential: true,      // Always required
    analytics: false,     // Opt-in
    marketing: false,     // Opt-in
  });
}

// On user action
function setConsent(preferences) {
  // Save preferences
  setCookie('cookie_consent', JSON.stringify(preferences), 365);
  // Enable/disable analytics accordingly
  if (preferences.analytics) {
    initAnalytics();
  }
}
```

---

*This Privacy Policy is a template. Final legal version must be reviewed by qualified legal counsel before deployment.*
