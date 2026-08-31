# Infrastructure Packages

This directory contains cross-cutting infrastructure packages used by services and applications.

## Design Principles

1. **Runtime Adapters** - Provide abstractions for different runtime environments
2. **No Business Logic** - Infrastructure packages contain no domain-specific code
3. **Composable** - Easy to use individually or together

## Packages

### `@aivo/api-client`
HTTP client utilities for inter-service communication.

### `@aivo/middleware`
Worker middleware for Cloudflare Workers:
- CORS handling
- Rate limiting
- Error handling
- Request ID injection
- Hono integration

### `@aivo/observability`
Observability infrastructure:
- Structured logging
- Metrics collection
- Distributed tracing
- Database instrumentation
- Queue instrumentation
- AI inference instrumentation
- WASM instrumentation

### `@aivo/runtime`
Runtime detection and feature detection utilities.

### `@aivo/storage-client`
Storage abstraction for different backends (R2, etc.).

## Usage Example

```typescript
import { createRateLimiter, createRequestId, errorHandler } from "@aivo/middleware";
import { createLogger, createMetrics } from "@aivo/observability";

const app = new Hono();

// Add middleware
app.use("*", createRequestId());
app.use("*", createRateLimiter({ limit: 100, window: 60000 }));
app.use("*", errorHandler());

// Add logging
app.use("*", async (c, next) => {
  const logger = createLogger({ service: "my-service" });
  c.set("logger", logger);
  await next();
});
```
