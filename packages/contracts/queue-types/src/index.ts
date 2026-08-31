/**
 * Queue Types Package
 *
 * Shared queue message types and domain events for AIVO system.
 *
 * Exports:
 * - Legacy queue message types (email verification, health reports)
 * - Canonical domain event envelope and event catalog
 *
 * For new code, prefer the domain event exports:
 *
 * ```typescript
 * import {
 *   domainEventEnvelopeSchema,
 *   EVENT_TYPES,
 *   createWorkoutCompletedEvent,
 *   createReadinessCalculatedEvent,
 * } from '@aivo/queue-types';
 * ```
 */

// Re-export everything from original (backward compatible)
export * from './original.js';

// Re-export domain events (excluding duplicates)
export {
  // Domain event envelope
  domainEventEnvelopeSchema,
  domainEventEnvelopeSchema as DomainEventEnvelopeSchema,
  type DomainEventEnvelope,
  type TraceContext,

  // Event types
  EVENT_TYPES,
  type EventType,
  type EventTypeNamespace,

  // Event validation
  isDomainEvent,
  isEventType,
  isFromProducer,
  getPayloadSchema,
  validateEventPayload,

  // Queue constants (these are unique to events.ts)
  EVENT_QUEUE_NAMES,
  EVENT_BINDING_NAMES,
} from './events.js';
