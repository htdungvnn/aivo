# Event Catalog

This document catalogs all domain events in the AIVO system.

## Event Schema

All events follow the canonical envelope structure:

```typescript
interface DomainEventEnvelope {
  eventId: string;           // UUID v4
  eventType: string;          // e.g., "coach.workout.completed"
  eventVersion: number;        // Starts at 1
  occurredAt: string;          // ISO-8601 UTC
  producer: string;            // e.g., "coach-service"
  subjectId?: string;          // Primary entity ID
  userId?: string;            // User UUID
  correlationId?: string;      // Workflow correlation
  causationId?: string;       // Immediate cause
  idempotencyKey?: string;     // Stable domain key
  traceContext?: TraceContext;
  payload: Record<string, unknown>;
  metadata: { schema: string };
}
```

## Event Definitions

### Auth Events

| Event Type | Version | Producer | Purpose |
|-----------|---------|----------|---------|
| `auth.user.registered` | 1 | Auth Service | New user registration |
| `auth.user.login_succeeded` | 1 | Auth Service | Successful login |
| `auth.user.login_failed` | 1 | Auth Service | Failed login attempt |
| `auth.user.session_revoked` | 1 | Auth Service | Session ended/revoked |
| `auth.user.account_disabled` | 1 | Auth Service | Account disabled |
| `auth.user.consent_changed` | 1 | Auth Service | User consent updated |

### Coach Events

| Event Type | Version | Producer | Purpose |
|-----------|---------|----------|---------|
| `coach.workout_plan.created` | 1 | Coach Service | Workout plan created |
| `coach.workout_plan.adjusted` | 1 | Coach Service | Workout plan adjusted |
| `coach.workout.started` | 1 | Coach Service | Workout session started |
| `coach.workout.completed` | 1 | Coach Service | Workout session completed |
| `coach.coach_session.started` | 1 | Coach Service | Coach session started |
| `coach.coach_session.completed` | 1 | Coach Service | Coach session completed |
| `coach.exercise.form_warning_detected` | 1 | Coach Service | Form issue detected |

### Health Events

| Event Type | Version | Producer | Purpose |
|-----------|---------|----------|---------|
| `health.readiness.calculated` | 1 | Health Service | Daily readiness score calculated |
| `health.recovery.calculated` | 1 | Health Service | Recovery metrics calculated |
| `health.life_score.calculated` | 1 | Health Service | Life score calculated |
| `health.metric.recorded` | 1 | Health Service | Health metric recorded |
| `health.habit.completed` | 1 | Health Service | Habit completed |
| `health.habit.missed` | 1 | Health Service | Habit missed |
| `health.report.requested` | 1 | Health Service | Health report requested |
| `health.report.generated` | 1 | Health Service | Health report generated |

### Nutrition Events

| Event Type | Version | Producer | Purpose |
|-----------|---------|----------|---------|
| `nutrition.meal.logged` | 1 | Nutrition Service | Meal logged |
| `nutrition.meal.analysis_requested` | 1 | Nutrition Service | AI meal analysis requested |
| `nutrition.meal.analyzed` | 1 | Nutrition Service | AI meal analysis completed |
| `nutrition.meal_plan.created` | 1 | Nutrition Service | Meal plan created |
| `nutrition.grocery_list.generated` | 1 | Nutrition Service | Grocery list generated |
| `nutrition.target.updated` | 1 | Nutrition Service | Nutrition targets updated |

### Notification Events

| Event Type | Version | Producer | Purpose |
|-----------|---------|----------|---------|
| `notification.requested` | 1 | Any Service | Notification requested |
| `notification.delivered` | 1 | Mail Service | Notification delivered |
| `notification.failed` | 1 | Mail Service | Notification delivery failed |

## Event Flow Diagrams

### WorkoutCompleted → ReadinessCalculated

```
┌─────────────┐
│ Coach Service│
└──────┬──────┘
       │
       │ 1. User completes workout
       │ 2. Local transaction: Update session status
       │ 3. Publish DomainEvent
       ▼
┌─────────────┐
│ Domain Queue │
└──────┬──────┘
       │
       │ 4. Consumer extracts context
       │ 5. Check idempotency
       ▼
┌─────────────┐
│Health Service│
└──────┬──────┘
       │
       │ 6. Load Health-owned data
       │ 7. Call readiness engine (WASM)
       │ 8. Save readiness snapshot
       │ 9. Mark event processed
       ▼
┌─────────────────┐
│ Readiness Snapshot│
└─────────────────┘
```

### Event Dependencies

```
auth.user.registered
    ↓
nutrition.meal.logged ─────→ health.metric.recorded
coach.workout.completed ─→ health.readiness.calculated
    ↓                         ↓
health.habit.completed   health.habit.missed
```

## Adding a New Event

1. Define event type constant in `packages/queue-types/src/events.ts`
2. Define payload schema with Zod
3. Create event creator function
4. Add to this catalog
5. Implement producer in source service
6. Implement consumer in target service
7. Add integration test

## Versioning

| Change Type | Action |
|-------------|--------|
| Add optional field | Version unchanged, consumer must handle null |
| Add required field | New version required |
| Remove field | New version, deprecate old |
| Rename field | New version, support both temporarily |
| Change field type | New version required |

## Compatibility Matrix

| Producer Version | Consumer v1 Support |
|-----------------|---------------------|
| v1 | ✓ |
| v2 | Requires migration period |

## Testing Events

```typescript
// Test event creation
const event = createWorkoutCompletedEvent({
  sessionId: 'uuid',
  userId: 'uuid',
  completedAt: new Date(),
  // ... other fields
});

// Test envelope validation
const result = domainEventEnvelopeSchema.safeParse(event);
expect(result.success).toBe(true);

// Test idempotency
const key = event.idempotencyKey;
expect(key).toBe('workout_completed:uuid');
```
