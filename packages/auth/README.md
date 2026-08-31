# Auth Packages

This directory contains authentication-related packages for the AIVO platform.

## Packages

### `@aivo/auth-core`

JWT utilities, authentication middleware, and authentication helpers for Cloudflare Workers.

**Key Features:**
- JWT signing and verification (ES256)
- Auth middleware for Hono
- Role-based access control
- Error types and handling

**Usage:**
```typescript
import { JWTService, requireAuth } from "@aivo/auth-core";
import { Hono } from "hono";

const app = new Hono();

app.use("*", requireAuth());

app.get("/protected", (c) => {
  const user = c.get("user");
  return c.json({ user });
});
```

## Dependency Rules

- `@aivo/auth-core` must not depend on any deployable application
- May depend on contract packages (@aivo/common-types, @aivo/queue-types)
- Peer dependency: `hono >= 4.0.0`
