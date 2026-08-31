# ADR-006: Observability Context Propagation

**Status:** Accepted  
**Date:** 2026-08-31  
**Author:** Solution Architecture Team

## Context

AIVO has multiple execution contexts: HTTP requests, queue processing, WASM calculations, AI calls. We need consistent correlation across all operations.

## Decision

### Correlation Context

```typescript
interface CorrelationContext {
  correlationId: string;    // UUID v4, follows workflow
  trace: {
    traceparent?: string;    // W3C traceparent
    traceId?: string;        // Extracted trace ID
    spanId?: string;         // Current span
  };
  causationId?: string;      // Immediate cause event
  userIdHash?: string;       // Privacy-safe hash
}
```

### Propagation Flow

```
HTTP Request
    ↓
Extract/Generate correlationId
Inject trace context from headers
    ↓
Service Operation
    ↓
Database span ← inherits context
Queue publish ← injects context
    ↓
Queue Consumer
    ↓
Extract correlationId from message
Extract trace context
    ↓
WASM span ← inherits context
AI span ← inherits context
Database span ← inherits context
    ↓
Response / Acknowledgement
```

### Header Propagation

| Direction | Headers |
|-----------|---------|
| HTTP In | `traceparent`, `tracestate`, `x-correlation-id` |
| HTTP Out | `traceparent`, `x-correlation-id` |
| Queue Message | `traceparent` in envelope |

## Consequences

### Positive

- End-to-end traceability
- W3C compatibility
- Privacy-safe user identification

### Negative

- Header overhead
- Context management complexity

## References

- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [Telemetry Data Redaction ADR](adr-007-telemetry-data-redaction.md)
