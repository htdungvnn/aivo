// Framework-agnostic structured logger for Cloudflare Workers
// This module provides utilities for structured logging without framework dependencies

interface LogEntry {
  timestamp: string;
  method?: string;
  path?: string;
  status?: number;
  latencyMs?: number;
  userId?: string;
  userAgent?: string;
  ip?: string;
  error?: Record<string, unknown>; // Changed from string to object
  context?: string;
  [key: string]: unknown; // Allow additional properties
}

/**
 * Format a log entry as JSON
 */
export function formatLog(entry: LogEntry): string {
  return JSON.stringify(entry);
}

/**
 * Log a request lifecycle event
 * Compatible with Hono, Workerd, or any Cloudflare Workers environment
 */
export function logRequest(
  method: string,
  path: string,
  status: number,
  latencyMs: number,
  options: {
    userId?: string;
    userAgent?: string;
    ip?: string;
  } = {}
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    method,
    path,
    status,
    latencyMs,
    userId: options.userId,
    userAgent: options.userAgent,
    ip: options.ip,
  };
  console.log(formatLog(entry));
}

/**
 * Log an error with context
 */
export function logError(
  context: string,
  error: Error,
  extra?: Record<string, unknown>
): void {
  const errorLog: LogEntry = {
    timestamp: new Date().toISOString(),
    context,
    error: {
      message: error.message,
      stack: error.stack,
      ...extra,
    },
  };
  console.error(formatLog(errorLog));
}

/**
 * Create a request logging middleware compatible with Hono
 */
export function createRequestLogger() {
  return async <T extends Record<string, unknown>>(
    c: any, // Context from Hono - using any for framework compatibility
    next: () => Promise<void>
  ): Promise<void> => {
    const startTime = Date.now();
    try {
      await next();
      const status = c.res?.status || 200;
      const method = c.req?.method || 'unknown';
      const path = c.req?.path || 'unknown';
      const ip = c.req?.header('cf-connecting-ip') ||
                 c.req?.header('x-forwarded-for') ||
                 'unknown';
      const userAgent = c.req?.header('user-agent') || '';

      logRequest(method, path, status, Date.now() - startTime, {
        ip,
        userAgent,
      });
    } catch (error) {
      const status = c.res?.status || 500;
      const method = c.req?.method || 'unknown';
      const path = c.req?.path || 'unknown';

      logRequest(method, path, status, Date.now() - startTime);
      logError('request_handler', error as Error, { status });
      throw error;
    }
  };
}

/**
 * Simple structured log for any context
 */
export function log(message: string, data?: Record<string, unknown>): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    context: message,
    ...data,
  };
  console.log(formatLog(entry));
}

/**
 * Log metric/telemetry data
 */
export function logMetric(name: string, value: number, tags?: Record<string, string>): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    context: 'metric',
    [`metric_${name}`]: value,
    ...tags,
  };
  console.log(formatLog(entry));
}
