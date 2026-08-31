# ADR-005: Queue Idempotency

**Status:** Accepted  
**Date:** 2026-08-31  
**Author:** Solution Architecture Team

## Context

Cloudflare Queues provide at-least-once delivery. Consumers must handle duplicate messages idempotently.

## Decision

### Idempotency Strategy

1. **Event-level idempotency**: Each event has a stable `idempotencyKey`
2. **Consumer-level tracking**: Store processed events in service database
3. **Dual-check pattern**: Check before processing, mark during processing

### Implementation Pattern

```typescript
async function processMessage(event: DomainEventEnvelope): Promise<void> {
  // 1. Validate event schema
  const parsed = domainEventEnvelopeSchema.safeParse(event);
  if (!parsed.success) {
    throw new PermanentError('Invalid event schema');
  }
  
  // 2. Check idempotency
  const alreadyProcessed = await checkIdempotency(event.eventId);
  if (alreadyProcessed) {
    logger.info('Duplicate event, skipping', { eventId: event.eventId });
    return; // Idempotent: no-op for duplicates
  }
  
  // 3. Mark as processing (prevents race condition)
  await markProcessing(event.eventId);
  
  try {
    // 4. Process event
    await handleEvent(parsed.data);
    
    // 5. Mark as completed
    await markCompleted(event.eventId);
  } catch (error) {
    // 6. Handle failure - retry or DLQ
    if (isRetryable(error)) {
      await markRetry(event.eventId);
      throw error; // Trigger retry
    } else {
      await markFailed(event.eventId);
      throw new PermanentError(error); // Trigger DLQ
    }
  }
}
```

### Idempotency Key Patterns

| Event | Idempotency Key Pattern |
|-------|------------------------|
| `WorkoutCompleted` | `workout_completed:{sessionId}` |
| `ReadinessCalculated` | `readiness:{userId}:{date}` |
| `MealLogged` | `meal_logged:{mealId}` |

## Consequences

### Positive

- Safe duplicate handling
- Deterministic reprocessing
- Audit trail

### Negative

- Additional database writes
- Idempotency key discipline required

## References

- [Event Delivery Semantics ADR](adr-004-event-delivery-semantics.md)
