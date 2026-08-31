# ADR-004: Event Delivery Semantics

**Status:** Accepted  
**Date:** 2026-08-31  
**Author:** Solution Architecture Team

## Context

AIVO uses Cloudflare Queues for event processing. We must define delivery semantics and ensure consumers handle them correctly.

## Decision

### Delivery Guarantees

| Event Category | Guarantee | Description |
|---------------|-----------|-------------|
| Critical workflows | At least once | Idempotent processing required |
| Notifications | At most once | Best effort, no duplicates |
| Analytics | At most once | Best effort |

### At Least Once Processing

For critical events (e.g., `WorkoutCompleted` → `ReadinessCalculated`):

1. **Producer**: Publishes event to queue with idempotency key
2. **Queue**: May deliver message multiple times
3. **Consumer**: Must check idempotency before processing
4. **Result**: Effectively-once through idempotency

### Idempotency Store Schema

```sql
CREATE TABLE event_processing_log (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  consumer TEXT NOT NULL,
  processed_at INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('processed', 'failed')),
  result_reference TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_event_processing_consumer_event 
  ON event_processing_log(consumer, event_id);
```

### Retry Strategy

- **Retryable errors**: Transient failures (timeout, rate limit)
  - Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, 60s (max)
  - Max 5 retries
- **Permanent errors**: Validation, auth failures
  - No retry, send to DLQ immediately

### Dead Letter Queue

Exhausted messages go to DLQ with:
- Event metadata (type, version, producer)
- Failure reason (sanitized)
- Retry count
- Timestamps

DLQ replay requires explicit authorization.

## Consequences

### Positive

- Clear delivery semantics
- Predictable failure handling
- Audit trail for failures

### Negative

- Additional storage for idempotency
- DLQ operational complexity

## References

- [Queue Idempotency ADR](adr-005-queue-idempotency.md)
- [Dead Letter Replay Runbook](../runbooks/dead-letter-replay.md)
