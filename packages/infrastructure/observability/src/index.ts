/**
 * AIVO Observability Package
 * 
 * Production-ready observability infrastructure for:
 * - Cloudflare Workers
 * - Next.js server runtime
 * - Browser (limited safe logging)
 * - Expo React Native
 * - Node-based tests
 * 
 * Features:
 * - Structured JSON logging
 * - Recursive redaction of sensitive data
 * - Correlation and trace context propagation
 * - Normalized error handling
 * - HTTP, queue, database, WASM, and AI instrumentation
 * - Health checks
 */

export * from './config.js';
export * from './logger.js';
export * from './redaction.js';
export * from './errors.js';
export * from './context.js';
export * from './correlation.js';
export * from './tracing.js';
export * from './metrics.js';
export * from './runtime.js';

// HTTP instrumentation
export { createHttpServerInstrumentation } from './http/server.js';
export { createHttpClientInstrumentation } from './http/client.js';

// Queue instrumentation
export { createQueueProducerInstrumentation } from './queue/producer.js';
export { createQueueConsumerInstrumentation } from './queue/consumer.js';

// Database instrumentation
export { createDatabaseInstrumentation } from './database/instrumentation.js';

// WASM instrumentation
export { createWasmInstrumentation } from './wasm/instrumentation.js';

// AI instrumentation
export { createAiInstrumentation } from './ai/instrumentation.js';

// Types re-exports
export type {
  LogLevel,
  LogEntry,
  LoggerConfig,
  ServiceContext,
  TraceContext,
  MetricPoint,
  HealthStatus,
} from './types.js';
