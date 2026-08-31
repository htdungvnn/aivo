/**
 * Structured Logger
 * 
 * Production-ready structured logging with:
 * - JSON output format
 * - Log level filtering
 * - Correlation context propagation
 * - Recursive redaction
 * - Multiple runtime support (Workers, Node, Browser, React Native)
 * - Batched export capability
 */

import { redact } from './redaction.js';
import {
  createDefaultConfig,
  detectRuntime,
  type LoggerConfig,
  type RuntimeType,
} from './config.js';
import type { LogEntry, LogLevel, CorrelationContext } from './types.js';

// =============================================================================
// Log Level Hierarchy
// =============================================================================

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  critical: 4,
};

// =============================================================================
// Logger Implementation
// =============================================================================

/**
 * Structured logger for AIVO services.
 * Supports Cloudflare Workers, Node.js, Browser, and React Native.
 */
export class Logger {
  private config: LoggerConfig;
  private context: CorrelationContext | null = null;
  private metrics: Map<string, number> = new Map();
  private pendingLogs: LogEntry[] = [];
  private flushTimeout: ReturnType<typeof setTimeout> | null = null;
  
  constructor(config: Partial<LoggerConfig> & { service: string }) {
    this.config = createDefaultConfig(config.service, config);
  }
  
  /**
   * Update configuration.
   */
  updateConfig(updates: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...updates };
  }
  
  /**
   * Set correlation context for the current operation.
   */
  setCorrelationContext(context: CorrelationContext | null): void {
    this.context = context;
  }
  
  /**
   * Get current correlation context.
   */
  getCorrelationContext(): CorrelationContext | null {
    return this.context;
  }
  
  /**
   * Clear correlation context.
   */
  clearCorrelationContext(): void {
    this.context = null;
  }
  
  // =============================================================================
  // Logging Methods
  // =============================================================================
  
  /**
   * Log a debug message.
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }
  
  /**
   * Log an info message.
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }
  
  /**
   * Log a warning message.
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }
  
  /**
   * Log an error message.
   */
  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log('error', message, {
      ...data,
      error: error ? this.serializeError(error) : undefined,
    });
  }
  
  /**
   * Log a critical message.
   */
  critical(message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log('critical', message, {
      ...data,
      error: error ? this.serializeError(error) : undefined,
    });
  }
  
  /**
   * Core logging method.
   */
  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    // Check minimum level
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.config.minimumLevel]) {
      return;
    }
    
    // Check sample rate
    if (this.config.sampleRate !== undefined && this.config.sampleRate < 1) {
      if (Math.random() > this.config.sampleRate) {
        return;
      }
    }
    
    // Build log entry
    const entry = this.buildLogEntry(level, message, data);
    
    // Output
    this.output(entry);
  }
  
  /**
   * Build a structured log entry.
   */
  private buildLogEntry(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>
  ): LogEntry {
    const now = new Date();
    
    // Redact sensitive data
    const redactedData = data ? redact(data, this.config.redaction) : undefined;
    
    const entry: LogEntry = {
      timestamp: now.toISOString(),
      severity: level,
      service: this.config.service,
      environment: this.config.environment,
      version: this.config.version || '1.0.0',
      runtime: this.config.runtime,
      eventName: this.extractEventName(message),
      message: message,
    };
    
    // Add correlation context
    if (this.context) {
      entry.correlationId = this.context.correlationId;
      if (this.context.trace.traceId) {
        entry.traceId = this.context.trace.traceId;
      }
      if (this.context.trace.spanId) {
        entry.spanId = this.context.trace.spanId;
      }
      if (this.context.userIdHash) {
        entry.userIdHash = this.context.userIdHash;
      }
    }
    
    // Add operation context from data
    if (redactedData) {
      if (redactedData.operation) {
        entry.operation = String(redactedData.operation);
        delete redactedData.operation;
      }
      if (redactedData.durationMs !== undefined) {
        entry.durationMs = Number(redactedData.durationMs);
        delete redactedData.durationMs;
      }
      if (redactedData.result) {
        entry.result = String(redactedData.result) as 'success' | 'failure' | 'partial';
        delete redactedData.result;
      }
      if (redactedData.errorCode) {
        entry.errorCode = String(redactedData.errorCode);
        delete redactedData.errorCode;
      }
      if (redactedData.retryable !== undefined) {
        entry.retryable = Boolean(redactedData.retryable);
        delete redactedData.retryable;
      }
      if (redactedData.queueName) {
        entry.queueName = String(redactedData.queueName);
        delete redactedData.queueName;
      }
      if (redactedData.eventType) {
        entry.eventType = String(redactedData.eventType);
        delete redactedData.eventType;
      }
      if (redactedData.eventVersion !== undefined) {
        entry.eventVersion = Number(redactedData.eventVersion);
        delete redactedData.eventVersion;
      }
      if (redactedData.engine) {
        entry.engine = String(redactedData.engine);
        delete redactedData.engine;
      }
      if (redactedData.engineVersion) {
        entry.engineVersion = String(redactedData.engineVersion);
        delete redactedData.engineVersion;
      }
      if (redactedData.formulaVersion) {
        entry.formulaVersion = String(redactedData.formulaVersion);
        delete redactedData.formulaVersion;
      }
      if (redactedData.userIdHash) {
        entry.userIdHash = String(redactedData.userIdHash);
        delete redactedData.userIdHash;
      }
      
      // Merge remaining data
      Object.assign(entry, redactedData);
    }
    
    return entry;
  }
  
  /**
   * Extract event name from message.
   */
  private extractEventName(message: string): string {
    // Convert to snake_case
    return message
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 50);
  }
  
  /**
   * Serialize error for logging.
   */
  private serializeError(error: Error): Record<string, unknown> {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  
  /**
   * Output the log entry.
   */
  private output(entry: LogEntry): void {
    if (this.config.batch && this.config.batch.exportUrl) {
      this.batchLog(entry);
    } else {
      this.writeLog(entry);
    }
  }
  
  /**
   * Write log entry (immediate output).
   */
  private writeLog(entry: LogEntry): void {
    const output = this.config.structuredJson
      ? JSON.stringify(entry)
      : this.formatPretty(entry);
    
    // Use appropriate console method based on level
    switch (entry.severity) {
      case 'debug':
        console.debug(output);
        break;
      case 'info':
        console.info(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
      case 'critical':
        console.error(output);
        break;
    }
  }
  
  /**
   * Format log entry for pretty printing.
   */
  private formatPretty(entry: LogEntry): string {
    const parts = [
      `[${entry.timestamp}]`,
      `[${entry.severity.toUpperCase()}]`,
      `[${entry.service}]`,
    ];
    
    if (entry.correlationId) {
      parts.push(`[${entry.correlationId.slice(0, 8)}]`);
    }
    
    parts.push(entry.message);
    
    // Add key fields
    const extras: string[] = [];
    if (entry.operation) extras.push(`op=${entry.operation}`);
    if (entry.durationMs !== undefined) extras.push(`${entry.durationMs}ms`);
    if (entry.result) extras.push(entry.result);
    if (entry.errorCode) extras.push(`err=${entry.errorCode}`);
    
    if (extras.length > 0) {
      parts.push(`{${extras.join(', ')}}`);
    }
    
    return parts.join(' ');
  }
  
  /**
   * Batch log entry for export.
   */
  private batchLog(entry: LogEntry): void {
    this.pendingLogs.push(entry);
    
    if (this.pendingLogs.length >= (this.config.batch?.maxSize || 100)) {
      this.flush();
    } else if (!this.flushTimeout) {
      this.flushTimeout = setTimeout(() => this.flush(), this.config.batch?.maxWaitMs || 5000);
    }
  }
  
  /**
   * Flush pending logs to export endpoint.
   */
  async flush(): Promise<void> {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }
    
    if (this.pendingLogs.length === 0) return;
    
    const logs = [...this.pendingLogs];
    this.pendingLogs = [];
    
    if (this.config.batch?.exportUrl) {
      try {
        await fetch(this.config.batch.exportUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logs }),
        });
      } catch (error) {
        // Fall back to console output
        for (const log of logs) {
          this.writeLog(log);
        }
      }
    }
  }
  
  // =============================================================================
  // Metric Methods
  // =============================================================================
  
  /**
   * Increment a counter.
   */
  incrementCounter(name: string, labels?: Record<string, string>): void {
    const key = this.counterKey(name, labels);
    this.metrics.set(key, (this.metrics.get(key) || 0) + 1);
  }
  
  /**
   * Record a gauge value.
   */
  recordGauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.counterKey(name, labels);
    this.metrics.set(key, value);
  }
  
  /**
   * Get current metrics.
   */
  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }
  
  /**
   * Reset metrics.
   */
  resetMetrics(): void {
    this.metrics.clear();
  }
  
  private counterKey(name: string, labels?: Record<string, string>): string {
    if (!labels) return name;
    const sorted = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${sorted}}`;
  }
}

// =============================================================================
// Global Logger Instance
// =============================================================================

let globalLogger: Logger | null = null;

/**
 * Get or create the global logger instance.
 */
export function getLogger(service?: string): Logger {
  if (!globalLogger && service) {
    globalLogger = new Logger({ service });
  }
  if (!globalLogger) {
    throw new Error('Logger not initialized. Call getLogger(service) first.');
  }
  return globalLogger;
}

/**
 * Initialize the global logger.
 */
export function initLogger(config: Partial<LoggerConfig> & { service: string }): Logger {
  globalLogger = new Logger(config);
  return globalLogger;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a child logger with additional context.
 */
export function createChildLogger(
  parent: Logger,
  additionalContext: Record<string, unknown>
): Logger {
  // For now, we just return the parent with the context included
  // In a more sophisticated implementation, this could create a new instance
  // with prefixed keys or additional default fields
  return parent;
}

// =============================================================================
// Typed Log Helpers
// =============================================================================

/**
 * Create a logger bound to a specific service.
 */
export function createServiceLogger(
  serviceName: string,
  config?: Partial<LoggerConfig>
): Logger {
  return new Logger({ service: serviceName, ...config });
}

/**
 * Create a logger for Cloudflare Workers.
 */
export function createWorkerLogger(serviceName: string): Logger {
  return new Logger({
    service: serviceName,
    runtime: 'cloudflare-workers',
    structuredJson: true,
  });
}

/**
 * Create a logger for development.
 */
export function createDevLogger(serviceName: string): Logger {
  return new Logger({
    service: serviceName,
    runtime: detectRuntime(),
    environment: 'development',
    minimumLevel: 'debug',
    structuredJson: false,
    prettyPrint: true,
  });
}

/**
 * Create a logger for tests.
 */
export function createTestLogger(serviceName: string): Logger {
  return new Logger({
    service: serviceName,
    runtime: detectRuntime(),
    environment: 'test',
    minimumLevel: 'debug',
    structuredJson: false,
    prettyPrint: true,
  });
}
