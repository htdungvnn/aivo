# ADR-003: Domain Event Envelope

**Status:** Accepted  
**Date:** 2026-08-31  
**Author:** Solution Architecture Team

## Context

AIVO services need to communicate through reliable domain events. Events must support distributed tracing, idempotent processing, and schema evolution.

## Decision

### Canonical Event Envelope

```typescript
interface DomainEventEnvelope {
  eventId: string;           // UUID v4, globally unique
  eventType: string;          // Stable, e.g., "coach.workout.completed"
  eventVersion: number;       // Integer, starts at 1
  occurredAt: string;         // ISO-8601 UTC
  producer: string;           // Service name, e.g., "coach-service"
  subjectId?: string;         // Primary entity ID
  userId?: string;            // Authorized user
  correlationId?: string;     // Workflow correlation
  causationId?: string;      // Immediate cause event
  idempotencyKey?: string;    // Stable domain key
  traceContext?: {
    traceparent?: string;      // W3C traceparent
    tracestate?: string;      // W3C tracestate
  };
  payload: Record<string, unknown>;  // Event-specific
  metadata: {
    schema: string;           // e.g., "aivo.coach.workout.completed.v1"
  };
}
```

### Event Type Naming

Format: `{domain}.{entity}.{action}`

Examples:
- `auth.user.registered`
- `coach.workout.completed`
- `health.readiness.calculated`
- `nutrition.meal.logged`

### Versioning Rules

1. Event schemas are **immutable** after release
2. Breaking changes require new `eventVersion`
3. Consumers must support old and new versions during transition
4. Unknown event types are handled gracefully

## Consequences

### Positive

- W3C trace context compatibility
- Idempotency support
- Schema evolution path
- Clear event catalog

### Negative

- Additional envelope overhead
- Schema validation at boundaries

## References

- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [Event Delivery Semantics ADR](adr-004-event-delivery-semantics.md)
