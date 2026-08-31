/**
 * Metrics Module
 * 
 * Low-cardinality operational metrics collection.
 * Supports counters, gauges, and histograms.
 */

import type { MetricPoint, MetricsCollector } from './types.js';

// =============================================================================
// Metric Name Prefixes
// =============================================================================

export const METRIC_PREFIXES = {
  // HTTP metrics
  HTTP_REQUEST_COUNT: 'http_request_count',
  HTTP_REQUEST_DURATION_MS: 'http_request_duration_ms',
  HTTP_REQUEST_ERROR_COUNT: 'http_request_error_count',
  
  // Database metrics
  DB_OPERATION_COUNT: 'db_operation_count',
  DB_OPERATION_DURATION_MS: 'db_operation_duration_ms',
  DB_OPERATION_ERROR_COUNT: 'db_operation_error_count',
  DB_MIGRATION_STATUS: 'db_migration_status',
  
  // Queue metrics
  QUEUE_PUBLISH_COUNT: 'queue_publish_count',
  QUEUE_PUBLISH_FAILURE_COUNT: 'queue_publish_failure_count',
  QUEUE_CONSUME_COUNT: 'queue_consume_count',
  QUEUE_CONSUME_DURATION_MS: 'queue_consume_duration_ms',
  QUEUE_RETRY_COUNT: 'queue_retry_count',
  QUEUE_DLQ_COUNT: 'queue_dlq_count',
  QUEUE_BATCH_SIZE: 'queue_batch_size',
  QUEUE_MESSAGE_AGE_MS: 'queue_message_age_ms',
  
  // WASM metrics
  WASM_INITIALIZATION_DURATION_MS: 'wasm_initialization_duration_ms',
  WASM_INITIALIZATION_FAILURE_COUNT: 'wasm_initialization_failure_count',
  WASM_OPERATION_DURATION_MS: 'wasm_operation_duration_ms',
  WASM_OPERATION_ERROR_COUNT: 'wasm_operation_error_count',
  WASM_FALLBACK_COUNT: 'wasm_fallback_count',
  
  // AI metrics
  AI_REQUEST_COUNT: 'ai_request_count',
  AI_REQUEST_DURATION_MS: 'ai_request_duration_ms',
  AI_REQUEST_FAILURE_COUNT: 'ai_request_failure_count',
  AI_SCHEMA_VALIDATION_FAILURE_COUNT: 'ai_schema_validation_failure_count',
  AI_SAFETY_REJECTION_COUNT: 'ai_safety_rejection_count',
  AI_TOKEN_USAGE: 'ai_token_usage',
  AI_ESTIMATED_COST: 'ai_estimated_cost',
  
  // Application metrics
  READINESS_CALCULATION_COUNT: 'readiness_calculation_count',
  MEAL_ANALYSIS_COUNT: 'meal_analysis_count',
  WORKOUT_COMPLETION_COUNT: 'workout_completion_count',
  REPORT_GENERATION_COUNT: 'report_generation_count',
  NOTIFICATION_DELIVERY_COUNT: 'notification_delivery_count',
} as const;

// =============================================================================
// Metric Labels (Low-Cardinality)
// =============================================================================

/**
 * Standard labels that are safe to use in metrics.
 */
export const STANDARD_LABELS = [
  'service',
  'environment',
  'status',
  'error_code',
  'engine',
  'operation',
  'method',
  'route',
  'queue_name',
  'event_type',
  'event_version',
  'provider',
  'model',
  'repository',
  'runtime',
] as const;

/**
 * Forbidden labels that may leak sensitive data.
 */
export const FORBIDDEN_LABELS = [
  'user_id',
  'user_id_hash',
  'email',
  'correlation_id',
  'trace_id',
  'span_id',
  'request_id',
  'session_id',
  'ip_address',
  'token',
  'api_key',
  'password',
  'secret',
] as const;

/**
 * Validate metric labels.
 * Ensures labels are low-cardinality and don't contain sensitive data.
 */
export function validateLabels(labels: Record<string, string>): {
  valid: boolean;
  sanitized: Record<string, string>;
  warnings: string[];
} {
  const sanitized: Record<string, string> = {};
  const warnings: string[] = [];
  
  for (const [key, value] of Object.entries(labels)) {
    // Check for forbidden labels
    if (FORBIDDEN_LABELS.includes(key as typeof FORBIDDEN_LABELS[number])) {
      warnings.push(`Forbidden label '${key}' will be excluded`);
      continue;
    }
    
    // Check label value length
    if (value.length > 100) {
      warnings.push(`Label '${key}' value exceeds 100 characters, will be truncated`);
      sanitized[key] = value.slice(0, 100);
      continue;
    }
    
    // Normalize label value
    sanitized[key] = value
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/__+/g, '_')
      .replace(/^_|_$/g, '');
  }
  
  return {
    valid: warnings.length === 0,
    sanitized,
    warnings,
  };
}

// =============================================================================
// Metrics Collector
// =============================================================================

/**
 * In-memory metrics collector.
 * Suitable for local development and testing.
 */
export class InMemoryMetricsCollector implements MetricsCollector {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  
  private keyWithLabels(name: string, labels?: Record<string, string>): string {
    if (!labels) return name;
    const sorted = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${sorted}}`;
  }
  
  increment(name: string, labels?: Record<string, string>, value: number = 1): void {
    const key = this.keyWithLabels(name, labels);
    this.counters.set(key, (this.counters.get(key) || 0) + value);
  }
  
  gauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.keyWithLabels(name, labels);
    this.gauges.set(key, value);
  }
  
  histogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.keyWithLabels(name, labels);
    const values = this.histograms.get(key) || [];
    values.push(value);
    // Keep only last 1000 values
    if (values.length > 1000) {
      values.shift();
    }
    this.histograms.set(key, values);
  }
  
  getMetrics(): MetricPoint[] {
    const points: MetricPoint[] = [];
    const now = Date.now();
    
    // Add counters
    for (const [name, value] of this.counters) {
      const { labels, metricName } = this.parseMetricName(name);
      points.push({
        name: metricName,
        value,
        type: 'counter',
        labels,
        timestamp: now,
      });
    }
    
    // Add gauges
    for (const [name, value] of this.gauges) {
      const { labels, metricName } = this.parseMetricName(name);
      points.push({
        name: metricName,
        value,
        type: 'gauge',
        labels,
        timestamp: now,
      });
    }
    
    // Add histogram summaries
    for (const [name, values] of this.histograms) {
      if (values.length === 0) continue;
      
      const { labels, metricName } = this.parseMetricName(name);
      const sorted = [...values].sort((a, b) => a - b);
      const sum = values.reduce((a, b) => a + b, 0);
      
      points.push(
        {
          name: `${metricName}_count`,
          value: values.length,
          type: 'counter',
          labels,
          timestamp: now,
        },
        {
          name: `${metricName}_sum`,
          value: sum,
          type: 'counter',
          labels,
          timestamp: now,
        },
        {
          name: `${metricName}_min`,
          value: sorted[0],
          type: 'gauge',
          labels,
          timestamp: now,
        },
        {
          name: `${metricName}_max`,
          value: sorted[sorted.length - 1],
          type: 'gauge',
          labels,
          timestamp: now,
        },
        {
          name: `${metricName}_avg`,
          value: sum / values.length,
          type: 'gauge',
          labels,
          timestamp: now,
        }
      );
    }
    
    return points;
  }
  
  private parseMetricName(fullName: string): { metricName: string; labels: Record<string, string> } {
    const match = fullName.match(/^([^,{]+)\{(.*)\}$/);
    if (!match) {
      return { metricName: fullName, labels: {} };
    }
    
    const [, metricName, labelsStr] = match;
    const labels: Record<string, string> = {};
    
    for (const pair of labelsStr.split(',')) {
      const [key, ...valueParts] = pair.split('=');
      if (key && valueParts.length > 0) {
        labels[key] = valueParts.join('=').replace(/^"|"$/g, '');
      }
    }
    
    return { metricName, labels };
  }
  
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }
}

// =============================================================================
// Global Metrics
// =============================================================================

let globalCollector: MetricsCollector | null = null;

/**
 * Get or create the global metrics collector.
 */
export function getMetricsCollector(): MetricsCollector {
  if (!globalCollector) {
    globalCollector = new InMemoryMetricsCollector();
  }
  return globalCollector;
}

/**
 * Initialize the global metrics collector.
 */
export function initMetricsCollector(collector: MetricsCollector): void {
  globalCollector = collector;
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Record HTTP request metrics.
 */
export function recordHttpRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  labels?: Record<string, string>
): void {
  const collector = getMetricsCollector();
  const baseLabels = {
    method,
    route: normalizePath(path),
    status: String(Math.floor(statusCode / 100)) + 'xx',
    ...labels,
  };
  
  collector.increment(METRIC_PREFIXES.HTTP_REQUEST_COUNT, baseLabels);
  collector.histogram(METRIC_PREFIXES.HTTP_REQUEST_DURATION_MS, durationMs, baseLabels);
  
  if (statusCode >= 400) {
    collector.increment(METRIC_PREFIXES.HTTP_REQUEST_ERROR_COUNT, baseLabels);
  }
}

/**
 * Record database operation metrics.
 */
export function recordDatabaseOperation(
  operation: string,
  repository: string,
  durationMs: number,
  success: boolean,
  labels?: Record<string, string>
): void {
  const collector = getMetricsCollector();
  const baseLabels = { operation, repository, ...labels };
  
  collector.increment(METRIC_PREFIXES.DB_OPERATION_COUNT, baseLabels);
  collector.histogram(METRIC_PREFIXES.DB_OPERATION_DURATION_MS, durationMs, baseLabels);
  
  if (!success) {
    collector.increment(METRIC_PREFIXES.DB_OPERATION_ERROR_COUNT, baseLabels);
  }
}

/**
 * Record queue metrics.
 */
export function recordQueuePublish(
  queueName: string,
  eventType: string,
  success: boolean,
  durationMs: number
): void {
  const collector = getMetricsCollector();
  const baseLabels = { queue_name: queueName, event_type: eventType };
  
  if (success) {
    collector.increment(METRIC_PREFIXES.QUEUE_PUBLISH_COUNT, baseLabels);
  } else {
    collector.increment(METRIC_PREFIXES.QUEUE_PUBLISH_FAILURE_COUNT, baseLabels);
  }
  collector.histogram(METRIC_PREFIXES.QUEUE_CONSUME_DURATION_MS, durationMs, baseLabels);
}

export function recordQueueConsume(
  queueName: string,
  eventType: string,
  success: boolean,
  durationMs: number,
  retryable: boolean
): void {
  const collector = getMetricsCollector();
  const baseLabels = { queue_name: queueName, event_type: eventType };
  
  collector.increment(METRIC_PREFIXES.QUEUE_CONSUME_COUNT, baseLabels);
  collector.histogram(METRIC_PREFIXES.QUEUE_CONSUME_DURATION_MS, durationMs, baseLabels);
  
  if (!success) {
    if (retryable) {
      collector.increment(METRIC_PREFIXES.QUEUE_RETRY_COUNT, baseLabels);
    } else {
      collector.increment(METRIC_PREFIXES.QUEUE_DLQ_COUNT, baseLabels);
    }
  }
}

/**
 * Normalize dynamic paths to prevent high-cardinality.
 */
export function normalizePath(path: string): string {
  return path
    // Replace UUIDs
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    // Replace numeric IDs
    .replace(/\/\d+/g, '/:id')
    // Replace date patterns
    .replace(/\/\d{4}-\d{2}-\d{2}/g, '/:date')
    // Normalize trailing slashes
    .replace(/\/$/, '');
}
