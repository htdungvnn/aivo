/**
 * AIVO Observability Types
 * 
 * Core type definitions for the observability package.
 * These types are used across all instrumentation modules.
 */

// =============================================================================
// Log Levels and Entries
// =============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogEntry {
  /** ISO 8601 timestamp in UTC */
  timestamp: string;
  /** Log level */
  severity: LogLevel;
  /** Service name */
  service: string;
  /** Environment (development, staging, production) */
  environment: string;
  /** Service version */
  version: string;
  /** Runtime identifier */
  runtime: string;
  /** Event name for categorization */
  eventName: string;
  /** Human-readable message */
  message: string;
  /** Correlation ID for distributed tracing */
  correlationId?: string;
  /** Trace ID from W3C trace context */
  traceId?: string;
  /** Current span ID */
  spanId?: string;
  /** Operation name for spans */
  operation?: string;
  /** Operation duration in milliseconds */
  durationMs?: number;
  /** Operation result (success, failure, partial) */
  result?: 'success' | 'failure' | 'partial';
  /** Normalized error code */
  errorCode?: string;
  /** Whether the error is retryable */
  retryable?: boolean;
  /** Queue name when applicable */
  queueName?: string;
  /** Event type when applicable */
  eventType?: string;
  /** Event version when applicable */
  eventVersion?: number;
  /** Engine name (wasm, typescript) */
  engine?: string;
  /** Engine version */
  engineVersion?: string;
  /** Formula version for calculations */
  formulaVersion?: string;
  /** Privacy-safe user identifier hash */
  userIdHash?: string;
  /** Privacy-safe subject identifier hash */
  subjectIdHash?: string;
  /** Tenant identifier hash */
  tenantIdHash?: string;
  /** Additional structured data */
  [key: string]: unknown;
}

// =============================================================================
// Logger Configuration
// =============================================================================

export interface LoggerConfig {
  /** Service name */
  service: string;
  /** Environment */
  environment: 'development' | 'staging' | 'production' | 'test';
  /** Service version (defaults to package.json version) */
  version?: string;
  /** Runtime identifier */
  runtime: 'cloudflare-workers' | 'node' | 'browser' | 'react-native';
  /** Minimum log level */
  minimumLevel: LogLevel;
  /** Enable structured JSON output (default: true in production) */
  structuredJson?: boolean;
  /** Enable pretty printing in development */
  prettyPrint?: boolean;
  /** Redaction configuration */
  redaction?: RedactionConfig;
  /** Sample rate for high-volume logs (0-1) */
  sampleRate?: number;
  /** Batch configuration for remote export */
  batch?: BatchConfig;
}

export interface RedactionConfig {
  /** Fields to redact (supports nested paths with dot notation) */
  fields: string[];
  /** Replacement string */
  replacement?: string;
  /** Maximum depth for recursive redaction */
  maxDepth?: number;
  /** Custom redaction rules */
  customRules?: RedactionRule[];
}

export interface RedactionRule {
  /** Pattern to match (regex string) */
  pattern: string;
  /** Replacement value or function */
  replacement: string | ((match: string) => string);
}

export interface BatchConfig {
  /** Maximum batch size */
  maxSize: number;
  /** Maximum wait time in milliseconds */
  maxWaitMs: number;
  /** Remote export endpoint (optional) */
  exportUrl?: string;
}

// =============================================================================
// Service Context
// =============================================================================

export interface ServiceContext {
  /** Service name */
  service: string;
  /** Environment */
  environment: string;
  /** Version */
  version: string;
  /** Runtime */
  runtime: string;
  /** Deployment region */
  region?: string;
  /** Instance ID (for stateful services) */
  instanceId?: string;
}

// =============================================================================
// Trace Context (W3C Compatible)
// =============================================================================

export interface TraceContext {
  /** W3C traceparent */
  traceparent?: string;
  /** W3C tracestate */
  tracestate?: string;
  /** Extracted trace ID */
  traceId?: string;
  /** Current span ID */
  spanId?: string;
  /** Trace flags (01 = sampled) */
  traceFlags?: string;
}

// =============================================================================
// Correlation Context
// =============================================================================

export interface CorrelationContext {
  /** Request or workflow correlation ID */
  correlationId: string;
  /** Trace context */
  trace: TraceContext;
  /** Causation ID (immediate cause) */
  causationId?: string;
  /** Request ID (for HTTP requests) */
  requestId?: string;
  /** Session ID */
  sessionId?: string;
  /** User ID (privacy-safe hash) */
  userIdHash?: string;
}

// =============================================================================
// Metrics
// =============================================================================

export interface MetricPoint {
  /** Metric name */
  name: string;
  /** Metric value */
  value: number;
  /** Metric type */
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  /** Labels (low-cardinality only) */
  labels: Record<string, string>;
  /** Timestamp */
  timestamp: number;
  /** Unit for the metric */
  unit?: string;
}

export interface MetricsCollector {
  /** Increment a counter */
  increment(name: string, labels?: Record<string, string>, value?: number): void;
  /** Set a gauge value */
  gauge(name: string, value: number, labels?: Record<string, string>): void;
  /** Record a histogram value */
  histogram(name: string, value: number, labels?: Record<string, string>): void;
  /** Get all collected metrics */
  getMetrics(): MetricPoint[];
  /** Reset metrics (for testing) */
  reset(): void;
}

// =============================================================================
// Health Status
// =============================================================================

export interface HealthStatus {
  /** Overall status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Component statuses */
  components: ComponentHealth[];
  /** Timestamp */
  timestamp: string;
  /** Version info */
  version: string;
}

export interface ComponentHealth {
  /** Component name */
  name: string;
  /** Component status */
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  /** Response time in ms (if applicable) */
  latencyMs?: number;
  /** Error message if unhealthy */
  error?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Error Categories
// =============================================================================

export type ErrorCategory =
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'not_found'
  | 'conflict'
  | 'rate_limit'
  | 'database'
  | 'queue'
  | 'external_provider'
  | 'ai_provider'
  | 'wasm'
  | 'configuration'
  | 'internal';

export interface NormalizedError {
  /** Error code */
  code: string;
  /** Error category */
  category: ErrorCategory;
  /** Whether the operation can be retried */
  retryable: boolean;
  /** Severity level */
  severity: 'info' | 'warn' | 'error' | 'critical';
  /** Safe message for clients */
  safeMessage: string;
  /** Correlation ID for debugging */
  correlationId?: string;
  /** Original error (internal only) */
  cause?: unknown;
}

// =============================================================================
// Span Attributes
// =============================================================================

export interface SpanAttributes {
  /** Operation name */
  name: string;
  /** Span type */
  type: 'http' | 'database' | 'queue' | 'wasm' | 'ai' | 'internal';
  /** Start time */
  startTime: number;
  /** End time (set when span completes) */
  endTime?: number;
  /** Status */
  status: 'ok' | 'error' | 'unset';
  /** Attributes */
  attributes: Record<string, string | number | boolean>;
  /** Error if status is error */
  error?: NormalizedError;
}

// =============================================================================
// Instrumentation Interfaces
// =============================================================================

export interface HttpServerInstrumentation {
  /** Start a server span */
  startSpan(request: Request, context: ServiceContext): HttpServerSpan;
}

export interface HttpServerSpan {
  /** Complete the span */
  end(responseStatus: number, durationMs: number): void;
  /** Record an error */
  recordError(error: NormalizedError): void;
  /** Set response attributes */
  setAttributes(attributes: Record<string, string | number | boolean>): void;
}

export interface HttpClientInstrumentation {
  /** Instrument an outgoing request */
  instrumentRequest(
    url: string,
    method: string,
    options?: RequestInit
  ): RequestInit & { headers: Headers };
  /** Record response */
  recordResponse(
    url: string,
    status: number,
    durationMs: number,
    error?: NormalizedError
  ): void;
}

export interface QueueProducerInstrumentation {
  /** Record message publication */
  recordPublish(
    queueName: string,
    eventType: string,
    eventVersion: number,
    success: boolean,
    durationMs: number,
    error?: NormalizedError
  ): void;
}

export interface QueueConsumerInstrumentation {
  /** Record message consumption */
  recordConsume(
    queueName: string,
    eventType: string,
    eventVersion: number,
    success: boolean,
    durationMs: number,
    retryable: boolean
  ): void;
  /** Record retry attempt */
  recordRetry(queueName: string, attempt: number, delayMs: number): void;
  /** Record message sent to DLQ */
  recordDlq(queueName: string, reason: string): void;
}

export interface DatabaseInstrumentation {
  /** Record database operation */
  recordOperation(
    operation: string,
    repository: string,
    durationMs: number,
    success: boolean,
    rowsAffected?: number,
    error?: NormalizedError
  ): void;
  /** Record transaction */
  recordTransaction(operation: string, durationMs: number, success: boolean): void;
}

export interface WasmInstrumentation {
  /** Record engine initialization */
  recordInitialization(
    engineName: string,
    engineVersion: string,
    success: boolean,
    durationMs: number,
    runtime: 'wasm' | 'typescript'
  ): void;
  /** Record calculation */
  recordCalculation(
    engineName: string,
    operation: string,
    durationMs: number,
    success: boolean,
    runtime: 'wasm' | 'typescript',
    inputMetricCount?: number,
    error?: NormalizedError
  ): void;
  /** Record fallback */
  recordFallback(fromRuntime: string, toRuntime: string): void;
}

export interface AiInstrumentation {
  /** Record AI request */
  recordRequest(
    provider: string,
    model: string,
    promptVersion: string,
    success: boolean,
    durationMs: number,
    tokenUsage?: AiTokenUsage,
    error?: NormalizedError
  ): void;
  /** Record validation result */
  recordValidation(
    provider: string,
    model: string,
    passed: boolean,
    failureReason?: string
  ): void;
}

export interface AiTokenUsage {
  /** Prompt tokens */
  promptTokens: number;
  /** Completion tokens */
  completionTokens: number;
  /** Total tokens */
  totalTokens: number;
  /** Estimated cost in USD */
  estimatedCostUsd?: number;
}
