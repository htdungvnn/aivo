/**
 * Correlation and Trace Context
 * 
 * Manages correlation IDs, trace context, and causation chains
 * across distributed operations.
 * 
 * W3C Trace Context compliant.
 */

import type { CorrelationContext, TraceContext } from './types.js';

// =============================================================================
// Trace Context
// =============================================================================

/**
 * Generate a new trace ID (32 hex characters).
 */
export function generateTraceId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a new span ID (16 hex characters).
 */
export function generateSpanId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a W3C traceparent header value.
 */
export function generateTraceparent(
  traceId: string = generateTraceId(),
  spanId: string = generateSpanId(),
  sampled: boolean = true
): string {
  const flags = sampled ? '01' : '00';
  return `00-${traceId}-${spanId}-${flags}`;
}

/**
 * Parse a W3C traceparent header value.
 */
export function parseTraceparent(traceparent: string): TraceContext | null {
  // Format: 00-{trace-id}-{span-id}-{trace-flags}
  const match = traceparent.match(/^00-([a-f0-9]{32})-([a-f0-9]{16})-([a-f0-9]{2})$/);
  
  if (!match) {
    return null;
  }
  
  const [, traceId, spanId, flags] = match;
  
  return {
    traceparent,
    traceId,
    spanId,
    traceFlags: flags,
    // Note: tracestate is separate
  };
}

/**
 * Validate trace context values.
 */
export function isValidTraceId(traceId: string): boolean {
  return /^[a-f0-9]{32}$/.test(traceId);
}

export function isValidSpanId(spanId: string): boolean {
  return /^[a-f0-9]{16}$/.test(spanId);
}

export function isValidTraceFlags(flags: string): boolean {
  return /^[a-f0-9]{2}$/.test(flags);
}

/**
 * Sanitize trace context to prevent injection.
 */
export function sanitizeTraceContext(context: TraceContext): TraceContext {
  const sanitized: TraceContext = {};
  
  if (context.traceparent) {
    // Only use traceparent if it's valid
    const parsed = parseTraceparent(context.traceparent);
    if (parsed) {
      sanitized.traceparent = parsed.traceparent;
      sanitized.traceId = parsed.traceId;
      sanitized.traceFlags = parsed.traceFlags;
    }
  } else {
    // Generate new trace if none provided
    sanitized.traceId = generateTraceId();
    sanitized.spanId = generateSpanId();
  }
  
  // Always generate new span ID for current operation
  sanitized.spanId = generateSpanId();
  
  return sanitized;
}

// =============================================================================
// Correlation ID
// =============================================================================

/**
 * Generate a correlation ID (UUID v4 format).
 */
export function generateCorrelationId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  
  // Set version (4) and variant (8, 9, A, or B)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Validate correlation ID format.
 */
export function isValidCorrelationId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

// =============================================================================
// Correlation Context
// =============================================================================

/**
 * Create a new correlation context for an operation.
 */
export function createCorrelationContext(params?: {
  correlationId?: string;
  traceContext?: TraceContext;
  causationId?: string;
  requestId?: string;
  sessionId?: string;
  userIdHash?: string;
}): CorrelationContext {
  const correlationId = params?.correlationId || generateCorrelationId();
  const trace = params?.traceContext
    ? sanitizeTraceContext(params.traceContext)
    : sanitizeTraceContext({});
  
  return {
    correlationId,
    trace,
    causationId: params?.causationId,
    requestId: params?.requestId,
    sessionId: params?.sessionId,
    userIdHash: params?.userIdHash,
  };
}

/**
 * Extract trace context from request headers.
 */
export function extractTraceContext(headers: Headers): TraceContext | null {
  const traceparent = headers.get('traceparent');
  const tracestate = headers.get('tracestate');
  
  if (!traceparent) {
    return null;
  }
  
  const parsed = parseTraceparent(traceparent);
  if (!parsed) {
    return null;
  }
  
  return {
    ...parsed,
    tracestate: tracestate || undefined,
  };
}

/**
 * Extract correlation ID from request headers.
 */
export function extractCorrelationId(headers: Headers): string | null {
  return headers.get('x-correlation-id') || headers.get('x-request-id') || null;
}

/**
 * Inject trace context into headers.
 */
export function injectTraceContext(headers: Headers, context: TraceContext): void {
  if (context.traceparent) {
    headers.set('traceparent', context.traceparent);
  }
  if (context.tracestate) {
    headers.set('tracestate', context.tracestate);
  }
}

/**
 * Inject correlation ID into headers.
 */
export function injectCorrelationId(headers: Headers, correlationId: string): void {
  headers.set('x-correlation-id', correlationId);
}

// =============================================================================
// Causation Chain
// =============================================================================

/**
 * Create causation context for an event-driven workflow.
 * Links events in a causal chain.
 */
export function createCausationContext(
  causedByEventId?: string,
  causedByCorrelationId?: string
): { causationId: string | undefined; previousCorrelationId: string | undefined } {
  return {
    causationId: causedByEventId,
    previousCorrelationId: causedByCorrelationId,
  };
}

// =============================================================================
// Context Storage
// =============================================================================

// Use globalThis for storage in Workers
const STORAGE_KEY = 'aivo:correlation:context';

/**
 * Get current correlation context from storage.
 */
export function getCurrentContext(): CorrelationContext | null {
  try {
    const stored = (globalThis as Record<string, unknown>)[STORAGE_KEY];
    if (stored && typeof stored === 'object') {
      return stored as CorrelationContext;
    }
  } catch {
    // Storage not available
  }
  return null;
}

/**
 * Set current correlation context in storage.
 */
export function setCurrentContext(context: CorrelationContext | null): void {
  try {
    if (context) {
      (globalThis as Record<string, unknown>)[STORAGE_KEY] = context;
    } else {
      delete (globalThis as Record<string, unknown>)[STORAGE_KEY];
    }
  } catch {
    // Storage not available
  }
}

/**
 * Clear current correlation context.
 */
export function clearCurrentContext(): void {
  setCurrentContext(null);
}

// =============================================================================
// Context Scopes
// =============================================================================

/**
 * Execute a function with a specific correlation context.
 */
export async function withCorrelationContext<T>(
  context: CorrelationContext,
  fn: () => Promise<T>
): Promise<T> {
  const previousContext = getCurrentContext();
  setCurrentContext(context);
  
  try {
    return await fn();
  } finally {
    setCurrentContext(previousContext);
  }
}

/**
 * Execute a function with a new child correlation context.
 */
export async function withChildContext<T>(
  parentContext: CorrelationContext,
  fn: (context: CorrelationContext) => Promise<T>
): Promise<T> {
  const childContext = createCorrelationContext({
    correlationId: parentContext.correlationId,
    traceContext: parentContext.trace,
    causationId: parentContext.correlationId,
    userIdHash: parentContext.userIdHash,
  });
  
  return withCorrelationContext(childContext, () => fn(childContext));
}

/**
 * Execute a function with trace propagation from headers.
 */
export async function withTraceFromHeaders<T>(
  headers: Headers,
  fn: (context: CorrelationContext) => Promise<T>
): Promise<T> {
  const traceContext = extractTraceContext(headers);
  const correlationId = extractCorrelationId(headers);
  
  const context = createCorrelationContext({
    correlationId: correlationId || undefined,
    traceContext: traceContext ?? undefined,
  });
  
  return withCorrelationContext(context, () => fn(context));
}
