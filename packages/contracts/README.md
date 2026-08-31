# Contract Packages

This directory contains shared domain type definitions and Zod schemas that represent **cross-service contracts**.

## Design Principles

1. **Platform Neutral** - These packages must not depend on React, Next.js, Expo, Hono, or Cloudflare bindings
2. **Schema-First** - Use Zod for all type definitions and validation
3. **No Side Effects** - Pure type definitions only
4. **Versioned Carefully** - Changes may affect multiple services

## Packages

### `@aivo/common-types`
Shared utilities: UUID generation, date/time helpers, validation helpers

### `@aivo/fitness-types`
Fitness domain types: Exercise definitions, pose detection, workout sessions, correction feedback

### `@aivo/health-types`
Health domain types: Readiness scores, daily health data, chart configurations, AI insights

### `@aivo/nutrition-types`
Nutrition domain types: Meal schemas, food definitions, AI analysis types

### `@aivo/notification-types`
Notification type definitions and schemas

### `@aivo/queue-types`
Queue message schemas and event type definitions for the event-driven architecture

### `@aivo/report-types`
Report type definitions and schemas

## Allowed Dependencies

- `zod` (schema library)
- Other contract packages
- Lightweight utilities from `@aivo/common-types`

## Forbidden Dependencies

- React
- Next.js
- Expo / React Native
- Hono
- Wrangler
- Cloudflare bindings
- Any application packages

## Example Usage

```typescript
import { z } from "zod";
import type { ReadinessLevel } from "@aivo/health-types";
import { READINESS_LEVELS, READINESS_THRESHOLDS } from "@aivo/health-types";

// Use schemas for validation
const HealthDataSchema = z.object({
  date: z.string(),
  score: z.number().min(0).max(100),
  level: z.enum([READINESS_LEVELS.LOW, READINESS_LEVELS.MODERATE, ...]),
});
```
