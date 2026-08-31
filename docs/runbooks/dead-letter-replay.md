# Runbook: Dead Letter Queue Replay

**Severity:** High  
**Last Updated:** 2026-08-31

## Overview

Dead Letter Queue (DLQ) messages require careful replay to avoid data corruption or duplicate side effects.

## Prerequisites

- [ ] Authorized access to DLQ
- [ ] Understanding of message schema
- [ ] Idempotency checks in place
- [ ] Monitoring ready

## Diagnosis

### 1. Check DLQ Size

```bash
# Via wrangler (requires access)
wrangler queues list

# Check message count in DLQ
wrangler queues messages list aivo-domain-events-dlq
```

### 2. Inspect DLQ Message

```bash
# Get message details
wrangler queues messages get aivo-domain-events-dlq <message-id>

# Download batch for analysis
wrangler queues messages export aivo-domain-events-dlq --limit 100
```

### 3. Analyze Failure Reason

```typescript
// DLQ message structure
interface DLQMessage {
  originalMessage: DomainEventEnvelope;
  error: {
    code: string;
    message: string;
  };
  metadata: {
    failedAt: number;
    failedAfterRetries: number;
    correlationId: string;
    eventType: string;
    producer: string;
  };
}
```

## Replay Procedure

### 1. Categorize Messages

| Category | Action |
|----------|--------|
| Transient failure (retryable) | Requeue with delay |
| Permanent failure (fixed) | Requeue after fix |
| Duplicate prevention | Skip already processed |

### 2. Selective Replay

```bash
# Replay specific message type
# (Use consumer CLI tool)

# Example: Replay WorkoutCompleted events
node scripts/replay-dlq.js \
  --queue aivo-domain-events-dlq \
  --event-type coach.workout.completed \
  --from "2026-08-01T00:00:00Z" \
  --to "2026-08-31T23:59:59Z"
```

### 3. Monitor During Replay

```bash
# Watch consumer processing
# (Open metrics dashboard)

# Check for:
# - Increasing DLQ size
# - Error rate spike
# - Consumer lag
```

### 4. Validate Results

```bash
# Check idempotency log
# Verify no duplicate side effects

# Example: Check readiness calculations
SELECT 
  user_id, 
  date, 
  COUNT(*) as count 
FROM daily_readiness_snapshots 
GROUP BY user_id, date 
HAVING count > 1;
```

## Safety Rules

1. **Never replay without understanding the failure**
2. **Verify idempotency is working**
3. **Monitor during replay**
4. **Have rollback plan ready**
5. **Document replay action**

## Prevention

- [ ] Implement proper retry logic
- [ ] Set appropriate max retries
- [ ] Monitor DLQ size
- [ ] Alert on DLQ growth
- [ ] Regular DLQ review

## Escalation

| DLQ Size | Action |
|---------|--------|
| < 10 | Normal review |
| 10-100 | Investigate within 24h |
| > 100 | Immediate investigation |
| Sustained growth | Critical incident |

## Post-Replay

1. Document replayed messages count
2. Verify all side effects completed
3. Clear DLQ if fully resolved
4. Update monitoring thresholds if needed
