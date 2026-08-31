/**
 * Tracing Module
 * 
 * OpenTelemetry-compatible span management for distributed tracing.
 * Supports W3C Trace Context propagation.
 */

import { generateSpanId, sanitizeTraceContext } from './context.js';
import type { SpanAttributes, ServiceContext, NormalizedError } from './types.js';

// =============================================================================
// Span Management
// =============================================================================

/**
 * Span status enumeration.
 */
export enum SpanStatus {
  UNSET = 'unset',
  OK = 'ok',
  ERROR = 'error',
}

/**
 * Span type enumeration.
 */
export enum SpanType {
  HTTP = 'http',
  DATABASE = 'database',
  QUEUE = 'queue',
  WASM = 'wasm',
  AI = 'ai',
  INTERNAL = 'internal',
}

/**
 * Create a new span.
 */
export function createSpan(
  name: string,
  type: SpanType,
  serviceContext: ServiceContext,
  parentSpanId?: string
): Span {
  return new Span(name, type, serviceContext, parentSpanId);
}

/**
 * Span implementation.
 */
export class Span implements SpanAttributes {
  name: string;
  type: SpanType;
  startTime: number;
  endTime?: number;
  status: SpanStatus = SpanStatus.UNSET;
  attributes: Record<string, string | number | boolean> = {};
  error?: NormalizedError;
  
  private readonly serviceContext: ServiceContext;
  private readonly spanId: string;
  private readonly traceId: string;
  private readonly parentSpanId?: string;
  
  constructor(
    name: string,
    type: SpanType,
    serviceContext: ServiceContext,
    parentSpanId?: string
  ) {
    this.name = name;
    this.type = type;
    this.serviceContext = serviceContext;
    this.parentSpanId = parentSpanId;
    this.startTime = Date.now();
    
    // Generate IDs
    const traceContext = sanitizeTraceContext({});
    this.traceId = traceContext.traceId || generateSpanId() + generateSpanId();
    this.spanId = generateSpanId();
    
    // Set initial attributes
    this.attributes = {
      'span.name': name,
      'span.type': type,
      'service.name': serviceContext.service,
      'service.version': serviceContext.version,
      'service.environment': serviceContext.environment,
    };
    
    if (parentSpanId) {
      this.attributes['span.parent_id'] = parentSpanId;
    }
  }
  
  /**
   * Set an attribute.
   */
  setAttribute(key: string, value: string | number | boolean): void {
    this.attributes[key] = value;
  }
  
  /**
   * Set multiple attributes.
   */
  setAttributes(attributes: Record<string, string | number | boolean>): void {
    Object.assign(this.attributes, attributes);
  }
  
  /**
   * Record an error.
   */
  recordError(code: string, message: string): void {
    this.status = SpanStatus.ERROR;
    this.error = {
      code,
      category: 'internal',
      retryable: false,
      severity: 'error',
      safeMessage: message,
    };
    this.attributes['error'] = true;
    this.attributes['error.code'] = code;
  }
  
  /**
   * Complete the span successfully.
   */
  end(): void {
    if (this.status === SpanStatus.UNSET) {
      this.status = SpanStatus.OK;
    }
    this.endTime = Date.now();
  }
  
  /**
   * Complete the span with an error.
   */
  endWithError(code: string, message: string): void {
    this.recordError(code, message);
    this.end();
  }
  
  /**
   * Get span duration in milliseconds.
   */
  getDuration(): number {
    if (!this.endTime) {
      return Date.now() - this.startTime;
    }
    return this.endTime - this.startTime;
  }
  
  /**
   * Convert to trace context.
   */
  toTraceContext(): { traceparent: string; spanId: string; traceId: string } {
    return {
      traceparent: `00-${this.traceId}-${this.spanId}-01`,
      spanId: this.spanId,
      traceId: this.traceId,
    };
  }
  
  /**
   * Convert to span attributes (for logging/export).
   */
  toAttributes(): SpanAttributes {
    return {
      name: this.name,
      type: this.type,
      startTime: this.startTime,
      endTime: this.endTime,
      status: this.status,
      attributes: {
        ...this.attributes,
        'span.id': this.spanId,
        'trace.id': this.traceId,
        'span.duration_ms': this.getDuration(),
      },
      error: this.error
        ? { ...this.error }
        : undefined,
    };
  }
}

// =============================================================================
// Span Helpers
// =============================================================================

/**
 * Create an HTTP span.
 */
export function createHttpSpan(
  method: string,
  path: string,
  serviceContext: ServiceContext,
  parentSpanId?: string
): Span {
  const span = createSpan(`${method} ${path}`, SpanType.HTTP, serviceContext, parentSpanId);
  span.setAttribute('http.method', method);
  span.setAttribute('http.route', path);
  return span;
}

/**
 * Create a database span.
 */
export function createDatabaseSpan(
  operation: string,
  repository: string,
  serviceContext: ServiceContext,
  parentSpanId?: string
): Span {
  const span = createSpan(`${repository}.${operation}`, SpanType.DATABASE, serviceContext, parentSpanId);
  span.setAttribute('db.operation', operation);
  span.setAttribute('db.repository', repository);
  return span;
}

/**
 * Create a queue span.
 */
export function createQueueSpan(
  operation: 'publish' | 'consume',
  queueName: string,
  serviceContext: ServiceContext,
  parentSpanId?: string
): Span {
  const span = createSpan(`${operation}:${queueName}`, SpanType.QUEUE, serviceContext, parentSpanId);
  span.setAttribute('queue.operation', operation);
  span.setAttribute('queue.name', queueName);
  return span;
}

/**
 * Create a WASM span.
 */
export function createWasmSpan(
  engine: string,
  operation: string,
  serviceContext: ServiceContext,
  parentSpanId?: string
): Span {
  const span = createSpan(`${engine}:${operation}`, SpanType.WASM, serviceContext, parentSpanId);
  span.setAttribute('wasm.engine', engine);
  span.setAttribute('wasm.operation', operation);
  return span;
}

/**
 * Create an AI span.
 */
export function createAiSpan(
  provider: string,
  model: string,
  operation: string,
  serviceContext: ServiceContext,
  parentSpanId?: string
): Span {
  const span = createSpan(`${provider}:${model}:${operation}`, SpanType.AI, serviceContext, parentSpanId);
  span.setAttribute('ai.provider', provider);
  span.setAttribute('ai.model', model);
  span.setAttribute('ai.operation', operation);
  return span;
}

// =============================================================================
// Span Execution Helpers
// =============================================================================

/**
 * Execute a function within a span context.
 */
export async function withSpan<T>(
  span: Span,
  fn: () => Promise<T>
): Promise<T> {
  try {
    const result = await fn();
    span.end();
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = 'INTERNAL_ERROR';
    span.endWithError(code, message);
    throw error;
  }
}

/**
 * Execute a function within an HTTP span context.
 */
export async function withHttpSpan<T>(
  method: string,
  path: string,
  serviceContext: ServiceContext,
  fn: () => Promise<T>
): Promise<T> {
  const span = createHttpSpan(method, path, serviceContext);
  return withSpan(span, fn);
}

/**
 * Execute a function within a database span context.
 */
export async function withDatabaseSpan<T>(
  operation: string,
  repository: string,
  serviceContext: ServiceContext,
  fn: () => Promise<T>
): Promise<T> {
  const span = createDatabaseSpan(operation, repository, serviceContext);
  return withSpan(span, fn);
}
