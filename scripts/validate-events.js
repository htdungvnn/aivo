#!/usr/bin/env node
/**
 * Events Validation Script
 * 
 * Validates the queue-types package for:
 * - Canonical event envelope structure
 * - Event type registry completeness
 * - Payload schema validation
 * - Backward compatibility
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('.', import.meta.url).pathname;
const ESCAPE = '\x1b[';
const RESET = `${ESCAPE}0m`;
const RED = `${ESCAPE}31m`;
const GREEN = `${ESCAPE}32m`;
const YELLOW = `${ESCAPE}33m`;
const BLUE = `${ESCAPE}34m`;

let errors = 0;
let warnings = 0;

function log(message, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function error(msg) {
  log(`✗ ${msg}`, RED);
  errors++;
}

function warn(msg) {
  log(`⚠ ${msg}`, YELLOW);
  warnings++;
}

function info(msg) {
  log(`ℹ ${msg}`, BLUE);
}

function success(msg) {
  log(`✓ ${msg}`, GREEN);
}

// ============================================================================
// VALIDATION 1: Check queue-types package exists
// ============================================================================

log('\n🔍 Checking queue-types package...', BLUE);

const queueTypesPath = join(ROOT, 'packages', 'queue-types');
const pkgJson = readFileSync(join(queueTypesPath, 'package.json'), 'utf8');

if (existsSync(join(queueTypesPath, 'src', 'events.ts'))) {
  success('events.ts exists');
} else {
  error('events.ts not found in queue-types/src');
}

if (existsSync(join(queueTypesPath, 'src', 'original.ts'))) {
  success('original.ts exists (backward compatibility)');
} else {
  warn('original.ts not found (backward compatibility may be affected)');
}

// ============================================================================
// VALIDATION 2: Read events.ts and validate structure
// ============================================================================

log('\n🔍 Validating event envelope schema...', BLUE);

const eventsContent = readFileSync(join(queueTypesPath, 'src', 'events.ts'), 'utf8');

const requiredSchemas = [
  'domainEventEnvelopeSchema',
  'EVENT_TYPES',
  'createWorkoutCompletedEvent',
  'createReadinessCalculatedEvent',
  'isDomainEvent',
  'validateEventPayload',
  'EVENT_QUEUE_NAMES',
];

let schemaCount = 0;
for (const schema of requiredSchemas) {
  if (eventsContent.includes(schema)) {
    schemaCount++;
    success(`Found ${schema}`);
  } else {
    error(`Missing ${schema}`);
  }
}

// ============================================================================
// VALIDATION 3: Event type registry
// ============================================================================

log('\n🔍 Validating event type registry...', BLUE);

const requiredNamespaces = [
  'AUTH',
  'COACH',
  'HEALTH',
  'NUTRITION',
  'NOTIFICATION',
];

for (const ns of requiredNamespaces) {
  if (eventsContent.includes(`${ns}:`)) {
    success(`Namespace ${ns} defined`);
  } else {
    error(`Namespace ${ns} not found`);
  }
}

// ============================================================================
// VALIDATION 4: Check for canonical envelope fields
// ============================================================================

log('\n🔍 Checking canonical envelope fields...', BLUE);

const envelopeFields = [
  'eventId',
  'eventType',
  'eventVersion',
  'occurredAt',
  'producer',
  'subjectId',
  'userId',
  'correlationId',
  'causationId',
  'idempotencyKey',
  'traceContext',
  'payload',
  'metadata',
];

for (const field of envelopeFields) {
  if (eventsContent.includes(field)) {
    success(`Envelope field: ${field}`);
  } else {
    error(`Missing envelope field: ${field}`);
  }
}

// ============================================================================
// VALIDATION 5: Check event creators
// ============================================================================

log('\n🔍 Checking event creators...', BLUE);

const eventCreators = [
  'createWorkoutCompletedEvent',
  'createReadinessCalculatedEvent',
];

for (const creator of eventCreators) {
  if (eventsContent.includes(`function ${creator}`)) {
    success(`Event creator: ${creator}`);
  } else {
    error(`Missing event creator: ${creator}`);
  }
}

// ============================================================================
// VALIDATION 6: Check payload schemas
// ============================================================================

log('\n🔍 Checking payload schemas...', BLUE);

const payloadSchemas = [
  'workoutCompletedPayloadSchema',
  'readinessCalculatedPayloadSchema',
  'mealAnalyzedPayloadSchema',
  'notificationRequestedPayloadSchema',
];

for (const schema of payloadSchemas) {
  if (eventsContent.includes(schema)) {
    success(`Payload schema: ${schema}`);
  } else {
    warn(`Payload schema not found: ${schema}`);
  }
}

// ============================================================================
// VALIDATION 7: Check queue names
// ============================================================================

log('\n🔍 Checking queue configuration...', BLUE);

if (eventsContent.includes('DOMAIN_EVENTS')) {
  success('Domain events queue configured');
} else {
  warn('DOMAIN_EVENTS queue not configured');
}

if (eventsContent.includes('DLQ') || eventsContent.includes('DEAD_LETTER')) {
  success('Dead letter queue configured');
} else {
  warn('Dead letter queue not explicitly configured');
}

// ============================================================================
// SUMMARY
// ============================================================================

log('\n' + '='.repeat(60), BLUE);
log('EVENTS VALIDATION SUMMARY', BLUE);
log('='.repeat(60), BLUE);
log(`Errors: ${errors}`, errors > 0 ? RED : GREEN);
log(`Warnings: ${warnings}`, warnings > 0 ? YELLOW : GREEN);
log('='.repeat(60), BLUE);

if (errors > 0) {
  log('\n❌ Events validation FAILED', RED);
  process.exit(1);
} else if (warnings > 0) {
  log('\n⚠️  Events validation passed with warnings', YELLOW);
  process.exit(0);
} else {
  log('\n✅ All events validations passed!', GREEN);
  process.exit(0);
}
