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
 * } from '@repo/queue-types';
 * ```
 */

// Re-export everything from original (backward compatible)
export * from './original.js';

// Re-export domain events
export * from './events.js';
