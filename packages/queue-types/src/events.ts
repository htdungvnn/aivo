/**
 * Extended Queue Types with Canonical Domain Events
 * 
 * This module extends the existing queue-types with:
 * - Canonical domain event envelope (W3C Trace Context compatible)
 * - Complete event catalog for Auth, Coach, Health, Nutrition, and Notification events
 * - Versioned event schemas
 * - Event type guards and validators
 * 
 * Based on the architecture decision in docs/adr/domain-event-envelope.md
 */

import { z } from 'zod';

// =============================================================================
// Schema Version
// =============================================================================

export const SCHEMA_VERSION = 1 as const;
export const SCHEMA_VERSION_MINOR = 0 as const;

/**
 * Current schema version string (semver compatible)
 */
export const CURRENT_EVENT_SCHEMA_VERSION = `${SCHEMA_VERSION}.${SCHEMA_VERSION_MINOR}` as const;

// =============================================================================
// Supported Locales
// =============================================================================

export const SUPPORTED_LOCALES = ['en', 'vi'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

// =============================================================================
// Canonical Event Envelope
// =============================================================================

/**
 * W3C-compatible trace context for distributed tracing.
 */
export const traceContextSchema = z.object({
  /** W3C traceparent header value */
  traceparent: z.string().optional(),
  /** W3C tracestate header value */
  tracestate: z.string().optional(),
}).optional();

export type TraceContext = z.infer<typeof traceContextSchema>;

/**
 * Canonical domain event envelope.
 * All domain events must conform to this structure.
 * 
 * Key design decisions:
 * - eventId is globally unique (UUID v4)
 * - eventType is stable across versions
 * - eventVersion is an integer for schema evolution
 * - occurredAt is UTC ISO-8601
 * - correlationId follows the business workflow
 * - causationId links events causally
 * - idempotencyKey prevents duplicate processing
 * - payload is event-specific and validated
 * - metadata contains safe operational data only
 */
export const domainEventEnvelopeSchema = z.object({
  /** Globally unique event identifier */
  eventId: z.string().uuid(),
  /** Stable event type identifier */
  eventType: z.string().min(1).max(100),
  /** Event schema version (integer, starts at 1) */
  eventVersion: z.number().int().min(1),
  /** Event occurrence timestamp in UTC */
  occurredAt: z.string().datetime({ offset: true }),
  /** Service that produced the event */
  producer: z.string().min(1).max(50),
  /** Primary subject of the event (e.g., workout-session-id) */
  subjectId: z.string().optional(),
  /** Authorized user ID associated with the event */
  userId: z.string().uuid().optional(),
  /** Correlation ID for distributed tracing */
  correlationId: z.string().uuid().optional(),
  /** Causation ID (event that caused this event) */
  causationId: z.string().uuid().optional(),
  /** Stable key for idempotency (domain-derived) */
  idempotencyKey: z.string().max(256).optional(),
  /** W3C trace context */
  traceContext: traceContextSchema,
  /** Event-specific payload */
  payload: z.record(z.unknown()),
  /** Operational metadata */
  metadata: z.object({
    /** Event schema identifier for validation */
    schema: z.string().regex(/^[a-z0-9-]+\.[a-z0-9-]+\.v\d+$/),
  }),
});

export type DomainEventEnvelope = z.infer<typeof domainEventEnvelopeSchema>;

// =============================================================================
// Event Type Registry
// =============================================================================

/**
 * Event type constants with namespace.
 * Format: {domain}.{entity}.{action}
 */
export const EVENT_TYPES = {
  // Auth Events
  AUTH: {
    USER_REGISTERED: 'auth.user.registered',
    USER_LOGIN_SUCCEEDED: 'auth.user.login_succeeded',
    USER_LOGIN_FAILED: 'auth.user.login_failed',
    USER_SESSION_REVOKED: 'auth.user.session_revoked',
    USER_ACCOUNT_DISABLED: 'auth.user.account_disabled',
    USER_CONSENT_CHANGED: 'auth.user.consent_changed',
  } as const,

  // Coach Events
  COACH: {
    WORKOUT_PLAN_CREATED: 'coach.workout_plan.created',
    WORKOUT_PLAN_ADJUSTED: 'coach.workout_plan.adjusted',
    WORKOUT_STARTED: 'coach.workout.started',
    WORKOUT_COMPLETED: 'coach.workout.completed',
    COACH_SESSION_STARTED: 'coach.coach_session.started',
    COACH_SESSION_COMPLETED: 'coach.coach_session.completed',
    EXERCISE_FORM_WARNING_DETECTED: 'coach.exercise.form_warning_detected',
  } as const,

  // Health Events
  HEALTH: {
    READINESS_CALCULATED: 'health.readiness.calculated',
    RECOVERY_CALCULATED: 'health.recovery.calculated',
    LIFE_SCORE_CALCULATED: 'health.life_score.calculated',
    HEALTH_METRIC_RECORDED: 'health.metric.recorded',
    HABIT_COMPLETED: 'health.habit.completed',
    HABIT_MISSED: 'health.habit.missed',
    HEALTH_REPORT_REQUESTED: 'health.report.requested',
    HEALTH_REPORT_GENERATED: 'health.report.generated',
  } as const,

  // Nutrition Events
  NUTRITION: {
    MEAL_LOGGED: 'nutrition.meal.logged',
    MEAL_ANALYSIS_REQUESTED: 'nutrition.meal.analysis_requested',
    MEAL_ANALYZED: 'nutrition.meal.analyzed',
    MEAL_PLAN_CREATED: 'nutrition.meal_plan.created',
    GROCERY_LIST_GENERATED: 'nutrition.grocery_list.generated',
    NUTRITION_TARGET_UPDATED: 'nutrition.target.updated',
  } as const,

  // Notification Events
  NOTIFICATION: {
    NOTIFICATION_REQUESTED: 'notification.requested',
    NOTIFICATION_DELIVERED: 'notification.delivered',
    NOTIFICATION_FAILED: 'notification.failed',
  } as const,
} as const;

export type EventTypeNamespace = keyof typeof EVENT_TYPES;

/**
 * All valid event types.
 */
export type EventType = 
  | (typeof EVENT_TYPES.AUTH)[keyof typeof EVENT_TYPES.AUTH]
  | (typeof EVENT_TYPES.COACH)[keyof typeof EVENT_TYPES.COACH]
  | (typeof EVENT_TYPES.HEALTH)[keyof typeof EVENT_TYPES.HEALTH]
  | (typeof EVENT_TYPES.NUTRITION)[keyof typeof EVENT_TYPES.NUTRITION]
  | (typeof EVENT_TYPES.NOTIFICATION)[keyof typeof EVENT_TYPES.NOTIFICATION];

// =============================================================================
// Event Payload Schemas
// =============================================================================

// -----------------------------------------------------------------------------
// Auth Event Payloads
// -----------------------------------------------------------------------------

export const userRegisteredPayloadSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().optional(),
  locale: z.enum(SUPPORTED_LOCALES).default('en'),
});

export const userLoginSucceededPayloadSchema = z.object({
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),
  clientType: z.enum(['web', 'ios', 'android']),
  timestamp: z.string().datetime({ offset: true }),
});

export const userLoginFailedPayloadSchema = z.object({
  email: z.string().email().optional(),
  reason: z.enum(['invalid_credentials', 'account_locked', 'account_suspended', 'mfa_required']),
  timestamp: z.string().datetime({ offset: true }),
});

export const userSessionRevokedPayloadSchema = z.object({
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),
  reason: z.enum(['user_initiated', 'admin_action', 'security_event', 'expired']),
  timestamp: z.string().datetime({ offset: true }),
});

// -----------------------------------------------------------------------------
// Coach Event Payloads
// -----------------------------------------------------------------------------

export const workoutPlanCreatedPayloadSchema = z.object({
  planId: z.string().uuid(),
  userId: z.string().uuid(),
  goal: z.enum(['fat_loss', 'muscle_gain', 'general_fitness', 'mobility']),
  durationWeeks: z.number().int().positive(),
  createdWithAi: z.boolean(),
  aiModel: z.string().optional(),
});

export const workoutPlanAdjustedPayloadSchema = z.object({
  planId: z.string().uuid(),
  userId: z.string().uuid(),
  reason: z.string().max(500),
  adjustmentType: z.enum(['intensity', 'volume', 'exercise_selection', 'timing', 'recovery']),
  previousVersion: z.string().optional(),
});

export const workoutStartedPayloadSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string().uuid(),
  planId: z.string().uuid().optional(),
  exerciseCount: z.number().int().nonnegative(),
  estimatedDurationMs: z.number().int().positive(),
  startedAt: z.string().datetime({ offset: true }),
});

export const workoutCompletedPayloadSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string().uuid(),
  planId: z.string().uuid().optional(),
  completedAt: z.string().datetime({ offset: true }),
  durationMs: z.number().int().nonnegative(),
  totalSets: z.number().int().nonnegative(),
  completedSets: z.number().int().nonnegative(),
  skippedSets: z.number().int().nonnegative(),
  totalReps: z.number().int().nonnegative(),
  overallQualityScore: z.number().min(0).max(100).optional(),
  formComplianceRate: z.number().min(0).max(100).optional(),
  totalCorrectionCount: z.number().int().nonnegative(),
});

// -----------------------------------------------------------------------------
// Health Event Payloads
// -----------------------------------------------------------------------------

export const readinessCalculatedPayloadSchema = z.object({
  snapshotId: z.string().uuid(),
  userId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  score: z.number().int().min(0).max(100),
  level: z.enum(['low', 'moderate', 'good', 'high']),
  confidence: z.number().min(0).max(1),
  dataCompleteness: z.number().min(0).max(1),
  algorithmVersion: z.string(),
});

export const healthMetricRecordedPayloadSchema = z.object({
  userId: z.string().uuid(),
  metricCode: z.string(),
  value: z.number(),
  unit: z.string(),
  source: z.enum(['device', 'manual', 'calculated', 'imported']),
  timestamp: z.string().datetime({ offset: true }),
});

export const habitCompletedPayloadSchema = z.object({
  habitId: z.string().uuid(),
  userId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  completedAt: z.string().datetime({ offset: true }),
});

export const habitMissedPayloadSchema = z.object({
  habitId: z.string().uuid(),
  userId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().optional(),
});

// -----------------------------------------------------------------------------
// Nutrition Event Payloads
// -----------------------------------------------------------------------------

export const mealLoggedPayloadSchema = z.object({
  mealId: z.string().uuid(),
  userId: z.string().uuid(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalCalories: z.number().int().nonnegative().optional(),
  totalProtein: z.number().int().nonnegative().optional(),
  itemCount: z.number().int().positive(),
  loggedAt: z.string().datetime({ offset: true }),
});

export const mealAnalysisRequestedPayloadSchema = z.object({
  analysisId: z.string().uuid(),
  userId: z.string().uuid(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  imageHash: z.string().optional(),
  requestedAt: z.string().datetime({ offset: true }),
});

export const mealAnalyzedPayloadSchema = z.object({
  analysisId: z.string().uuid(),
  userId: z.string().uuid(),
  status: z.enum(['completed', 'failed', 'needs_review']),
  itemCount: z.number().int().nonnegative(),
  overallConfidence: z.number().min(0).max(1).optional(),
  aiModel: z.string().optional(),
  completedAt: z.string().datetime({ offset: true }),
});

// -----------------------------------------------------------------------------
// Notification Event Payloads
// -----------------------------------------------------------------------------

export const notificationRequestedPayloadSchema = z.object({
  notificationId: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(['email', 'push', 'sms']),
  templateId: z.string(),
  channel: z.string(),
  locale: z.enum(SUPPORTED_LOCALES).default('en'),
  requestedAt: z.string().datetime({ offset: true }),
});

export const notificationDeliveredPayloadSchema = z.object({
  notificationId: z.string().uuid(),
  userId: z.string().uuid(),
  deliveredAt: z.string().datetime({ offset: true }),
  deliveryMethod: z.string(),
});

export const notificationFailedPayloadSchema = z.object({
  notificationId: z.string().uuid(),
  userId: z.string().uuid(),
  reason: z.string().max(500),
  attemptCount: z.number().int().positive(),
  failedAt: z.string().datetime({ offset: true }),
});

// =============================================================================
// Event Creators
// =============================================================================

/**
 * Create a domain event envelope.
 */
export function createDomainEvent<T extends z.ZodTypeAny>(
  params: {
    eventType: EventType;
    eventVersion?: number;
    producer: string;
    userId?: string;
    subjectId?: string;
    correlationId?: string;
    causationId?: string;
    idempotencyKey?: string;
    traceContext?: TraceContext;
    payload: z.infer<T>;
    schema: string;
  }
): DomainEventEnvelope {
  const eventVersion = params.eventVersion ?? 1;
  
  return {
    eventId: crypto.randomUUID(),
    eventType: params.eventType,
    eventVersion,
    occurredAt: new Date().toISOString(),
    producer: params.producer,
    userId: params.userId,
    subjectId: params.subjectId,
    correlationId: params.correlationId,
    causationId: params.causationId,
    idempotencyKey: params.idempotencyKey,
    traceContext: params.traceContext,
    payload: params.payload as Record<string, unknown>,
    metadata: {
      schema: params.schema,
    },
  };
}

/**
 * Create a workout completed event.
 */
export function createWorkoutCompletedEvent(params: {
  sessionId: string;
  userId: string;
  planId?: string;
  completedAt: Date;
  durationMs: number;
  totalSets: number;
  completedSets: number;
  skippedSets: number;
  totalReps: number;
  overallQualityScore?: number;
  formComplianceRate?: number;
  totalCorrectionCount: number;
  correlationId?: string;
  causationId?: string;
}): DomainEventEnvelope {
  return createDomainEvent({
    eventType: EVENT_TYPES.COACH.WORKOUT_COMPLETED,
    eventVersion: 1,
    producer: 'coach-service',
    userId: params.userId,
    subjectId: params.sessionId,
    correlationId: params.correlationId,
    causationId: params.causationId,
    idempotencyKey: `workout_completed:${params.sessionId}`,
    payload: workoutCompletedPayloadSchema.parse({
      sessionId: params.sessionId,
      userId: params.userId,
      planId: params.planId,
      completedAt: params.completedAt.toISOString(),
      durationMs: params.durationMs,
      totalSets: params.totalSets,
      completedSets: params.completedSets,
      skippedSets: params.skippedSets,
      totalReps: params.totalReps,
      overallQualityScore: params.overallQualityScore,
      formComplianceRate: params.formComplianceRate,
      totalCorrectionCount: params.totalCorrectionCount,
    }),
    schema: 'aivo.coach.workout.completed.v1',
  });
}

/**
 * Create a readiness calculated event.
 */
export function createReadinessCalculatedEvent(params: {
  snapshotId: string;
  userId: string;
  date: string;
  score: number;
  level: 'low' | 'moderate' | 'good' | 'high';
  confidence: number;
  dataCompleteness: number;
  algorithmVersion: string;
  correlationId?: string;
  causationId?: string;
}): DomainEventEnvelope {
  return createDomainEvent({
    eventType: EVENT_TYPES.HEALTH.READINESS_CALCULATED,
    eventVersion: 1,
    producer: 'health-service',
    userId: params.userId,
    subjectId: params.snapshotId,
    correlationId: params.correlationId,
    causationId: params.causationId,
    idempotencyKey: `readiness:${params.userId}:${params.date}`,
    payload: readinessCalculatedPayloadSchema.parse({
      snapshotId: params.snapshotId,
      userId: params.userId,
      date: params.date,
      score: params.score,
      level: params.level,
      confidence: params.confidence,
      dataCompleteness: params.dataCompleteness,
      algorithmVersion: params.algorithmVersion,
    }),
    schema: 'aivo.health.readiness.calculated.v1',
  });
}

// =============================================================================
// Event Type Guards
// =============================================================================

/**
 * Check if a value is a valid domain event envelope.
 */
export function isDomainEvent(value: unknown): value is DomainEventEnvelope {
  return domainEventEnvelopeSchema.safeParse(value).success;
}

/**
 * Check if an event is a specific type.
 */
export function isEventType<T extends EventType>(
  event: DomainEventEnvelope,
  type: T
): event is DomainEventEnvelope & { eventType: T } {
  return event.eventType === type;
}

/**
 * Check if an event is from a specific producer.
 */
export function isFromProducer(event: DomainEventEnvelope, producer: string): boolean {
  return event.producer === producer;
}

// =============================================================================
// Event Schema Validation
// =============================================================================

/**
 * Get payload schema for an event type.
 */
export function getPayloadSchema(eventType: EventType): z.ZodType | null {
  const schemas: Record<string, z.ZodType> = {
    [EVENT_TYPES.COACH.WORKOUT_COMPLETED]: workoutCompletedPayloadSchema,
    [EVENT_TYPES.COACH.WORKOUT_STARTED]: workoutStartedPayloadSchema,
    [EVENT_TYPES.HEALTH.READINESS_CALCULATED]: readinessCalculatedPayloadSchema,
    [EVENT_TYPES.HEALTH.HABIT_COMPLETED]: habitCompletedPayloadSchema,
    [EVENT_TYPES.HEALTH.HABIT_MISSED]: habitMissedPayloadSchema,
    [EVENT_TYPES.NUTRITION.MEAL_LOGGED]: mealLoggedPayloadSchema,
    [EVENT_TYPES.NUTRITION.MEAL_ANALYZED]: mealAnalyzedPayloadSchema,
  };

  return schemas[eventType] || null;
}

/**
 * Validate event payload against known schema.
 */
export function validateEventPayload(event: DomainEventEnvelope): {
  valid: boolean;
  errors?: z.ZodError;
} {
  const schema = getPayloadSchema(event.eventType);
  
  if (!schema) {
    // Unknown event type, skip payload validation
    return { valid: true };
  }

  const result = schema.safeParse(event.payload);
  
  if (result.success) {
    return { valid: true };
  } else {
    return { valid: false, errors: result.error };
  }
}

// =============================================================================
// Queue Constants
// =============================================================================

export const EVENT_QUEUE_NAMES = {
  // Domain event queues (new)
  DOMAIN_EVENTS: 'aivo-domain-events',
  DOMAIN_EVENTS_DLQ: 'aivo-domain-events-dlq',
  
  // Legacy queues (kept for backward compatibility)
  EMAIL_QUEUE: 'aivo-email-queue',
  EMAIL_DLQ: 'aivo-email-dlq',
  REPORT_QUEUE: 'aivo-health-report-deliver-queue',
  REPORT_DLQ: 'aivo-health-report-dlq',
} as const;

export const EVENT_BINDING_NAMES = {
  DOMAIN_EVENTS_QUEUE: 'DOMAIN_EVENTS_QUEUE',
  DOMAIN_EVENTS_DLQ: 'DOMAIN_EVENTS_DLQ',
  EMAIL_QUEUE: 'EMAIL_QUEUE',
  EMAIL_DLQ: 'EMAIL_DLQ',
  REPORT_QUEUE: 'REPORT_QUEUE',
  REPORT_DLQ: 'REPORT_DLQ',
} as const;

// =============================================================================
// Re-exports from original queue-types
// =============================================================================

export {
  // Original exports for backward compatibility
  SCHEMA_VERSION as ORIGINAL_SCHEMA_VERSION,
  emailVerificationDataSchema,
  reportEmailDataSchema,
  authQueueMessageSchema,
  reportQueueMessageSchema,
  queueMessageSchema,
  isQueueMessage,
  isEmailVerificationMessage,
  isReportReadyMessage,
  QUEUE_NAMES,
  BINDING_NAMES,
  createEmailVerificationMessage,
  createReportReadyMessage,
} from './original.js';

import { 
  emailVerificationDataSchema,
  reportEmailDataSchema,
  authQueueMessageSchema,
  reportQueueMessageSchema,
  queueMessageSchema,
  isQueueMessage,
  isEmailVerificationMessage,
  isReportReadyMessage,
  QUEUE_NAMES,
  BINDING_NAMES,
  createEmailVerificationMessage,
  createReportReadyMessage,
} from './original.js';
