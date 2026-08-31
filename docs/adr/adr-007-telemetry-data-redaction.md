# ADR-007: Telemetry Data Redaction

**Status:** Accepted  
**Date:** 2026-08-31  
**Author:** Solution Architecture Team

## Context

Observability data must never contain sensitive information. Health data, authentication tokens, and personal information must be redacted before logging or tracing.

## Decision

### Redaction Fields

**Authentication & Security**
```
authorization, authorization.*, bearer, bearerToken
accessToken, access_token, refreshToken, refresh_token
idToken, id_token, token, apiKey, api_key
clientSecret, client_secret, privateKey, private_key
password, passwd, pwd, pass
session, sessionId, session_id, cookie, cookies
oauth.*, code, code.*
```

**Health Data**
```
healthData, health_data, medical, medical.*
heartRate, heart_rate, hrv, sleepData, sleep_data
workoutData, workout_data, nutritionData, nutrition_data
mealPlan, meal_plan, mealImage, meal_image
poseLandmarks, pose_landmarks, cameraFrame, camera_frame
voiceRecording, voice_recording
```

**Personal Data**
```
email, email.*, phone, phoneNumber, phone_number
ssn, socialSecurity, address, address.*
dateOfBirth, date_of_birth, dob
```

**Request/Response**
```
requestBody, request.body, requestBody.*
responseBody, response.body, responseBody.*
query, query.*, params, params.*, headers.*
```

### Redaction Rules

1. **Recursive**: Handles nested objects and arrays
2. **Wildcard support**: `authorization.*` matches `authorization.bearer`
3. **Max depth**: 20 levels to prevent infinite recursion
4. **Circular detection**: `[CIRCULAR]` placeholder

### Implementation

```typescript
// All logs pass through redaction before output
const redactedData = redact(sensitiveData, {
  fields: [...DEFAULT_REDACTED_FIELDS],
  replacement: '[REDACTED]',
  maxDepth: 20,
});
```

### Verification

All services must pass redaction tests:

```typescript
it('should not log health data', () => {
  const data = { heartRate: 72, steps: 10000 };
  const result = redact(data);
  expect(JSON.stringify(result)).not.toContain('72');
});
```

## Consequences

### Positive

- Compliance with data protection requirements
- Safe logging in production
- Testable redaction rules

### Negative

- Potential loss of debuggability
- Maintenance of redaction list

## References

- [@aivo/observability package](../../packages/observability/src/redaction.ts)
