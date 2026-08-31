# OpenAPI Packages

This directory contains API documentation utilities.

## Packages

### `@aivo/swagger-utils`

OpenAPI specification builders and Swagger UI handlers.

**Features:**
- Type-safe spec builder
- Route metadata registry
- Swagger UI integration for Hono
- Auto-generated API documentation

## Usage

```typescript
import { createSpec, registerRoute } from "@aivo/swagger-utils";
import { Hono } from "hono";

// Create spec
const spec = createSpec({
  info: {
    title: "AIVO Health API",
    version: "1.0.0",
  },
});

// Register routes
registerRoute(spec, "GET /health", {
  responses: {
    200: { description: "Health check response" },
  },
});

// Add Swagger UI
app.get("/swagger", swaggerUI({ spec }));
```

## Allowed Dependencies

- `hono` (for type definitions)
- Contract packages
- `@aivo/typescript-config`
