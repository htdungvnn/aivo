/**
 * Test Helpers for Observability Package
 * 
 * Utilities for testing logging, metrics, and tracing behavior.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { redact, shouldRedact, verifyRedaction, verifyMultipleRedactions } from '../redaction.js';
import { createNormalizedError, ERROR_CODES, isRetryableCode } from '../errors.js';
import {
  generateCorrelationId,
  generateTraceId,
  isValidCorrelationId,
  createCorrelationContext,
} from '../context.js';
import { createTestLogger, type Logger } from '../logger.js';
import { InMemoryMetricsCollector, validateLabels } from '../metrics.js';
import { createWasmInstrumentation, resetWasmMetrics } from '../wasm/instrumentation.js';
import { createAiInstrumentation, resetAiMetrics, estimateCost } from '../ai/instrumentation.js';

// =============================================================================
// Redaction Tests
// =============================================================================

export function runRedactionTests(): void {
  describe('Redaction', () => {
    describe('shouldRedact', () => {
      it('should redact exact matches', () => {
        expect(shouldRedact('password', ['password'])).toBe(true);
        expect(shouldRedact('Authorization', ['authorization'])).toBe(true);
      });

      it('should redact with wildcard suffix', () => {
        expect(shouldRedact('authorization.bearer', ['authorization.*'])).toBe(true);
        expect(shouldRedact('authorization.basic', ['authorization.*'])).toBe(true);
        expect(shouldRedact('password', ['authorization.*'])).toBe(false);
      });

      it('should redact with wildcard prefix', () => {
        expect(shouldRedact('user.password', ['*.password'])).toBe(true);
        expect(shouldRedact('data.password', ['*.password'])).toBe(true);
        expect(shouldRedact('password', ['*.password'])).toBe(false);
      });
    });

    describe('redact', () => {
      it('should redact sensitive fields', () => {
        const data = {
          username: 'john',
          password: 'secret123',
          email: 'john@example.com',
        };

        const redacted = redact(data, {
          fields: ['password', 'email'],
          replacement: '[REDACTED]',
        });

        expect(redacted.username).toBe('john');
        expect(redacted.password).toBe('[REDACTED]');
        expect(redacted.email).toBe('[REDACTED]');
      });

      it('should redact nested objects', () => {
        const data = {
          user: {
            credentials: {
              password: 'secret123',
            },
          },
        };

        const redacted = redact(data, {
          fields: ['password'],
          replacement: '[REDACTED]',
        });

        expect((redacted as Record<string, unknown>).user).toBeDefined();
        const user = (redacted as Record<string, unknown>).user as Record<string, unknown>;
        const credentials = user.credentials as Record<string, unknown>;
        expect(credentials.password).toBe('[REDACTED]');
      });

      it('should redact arrays', () => {
        const data = {
          users: [
            { name: 'john', password: 'pass1' },
            { name: 'jane', password: 'pass2' },
          ],
        };

        const redacted = redact(data, {
          fields: ['password'],
          replacement: '[REDACTED]',
        });

        const users = (redacted as Record<string, unknown>).users as Array<Record<string, unknown>>;
        expect(users[0].password).toBe('[REDACTED]');
        expect(users[1].password).toBe('[REDACTED]');
      });
    });

    describe('verifyRedaction', () => {
      it('should return true when secret is redacted', () => {
        const data = { password: 'secret' };
        expect(verifyRedaction(data, 'secret')).toBe(true);
      });

      it('should return false when secret is not redacted', () => {
        const data = { name: 'secret' };
        expect(verifyRedaction(data, 'secret')).toBe(false);
      });
    });
  });
}

// =============================================================================
// Error Tests
// =============================================================================

export function runErrorTests(): void {
  describe('Error Normalization', () => {
    it('should normalize error with code', () => {
      const error = createNormalizedError(
        new Error('Test error'),
        ERROR_CODES.DATABASE_TIMEOUT
      );

      expect(error.code).toBe(ERROR_CODES.DATABASE_TIMEOUT);
      expect(error.category).toBe('database');
      expect(error.retryable).toBe(true);
      expect(error.severity).toBe('error');
      expect(error.safeMessage).toBeTruthy();
    });

    it('should identify retryable errors', () => {
      expect(isRetryableCode(ERROR_CODES.DATABASE_TIMEOUT)).toBe(true);
      expect(isRetryableCode(ERROR_CODES.PROVIDER_TIMEOUT)).toBe(true);
      expect(isRetryableCode(ERROR_CODES.RATE_LIMITED)).toBe(true);
    });

    it('should identify non-retryable errors', () => {
      expect(isRetryableCode(ERROR_CODES.VALIDATION_ERROR)).toBe(false);
      expect(isRetryableCode(ERROR_CODES.INVALID_TOKEN)).toBe(false);
      expect(isRetryableCode(ERROR_CODES.NOT_FOUND)).toBe(false);
    });
  });
}

// =============================================================================
// Correlation Tests
// =============================================================================

export function runCorrelationTests(): void {
  describe('Correlation', () => {
    it('should generate valid UUID correlation ID', () => {
      const correlationId = generateCorrelationId();
      expect(isValidCorrelationId(correlationId)).toBe(true);
    });

    it('should generate valid trace ID', () => {
      const traceId = generateTraceId();
      expect(traceId).toHaveLength(32);
      expect(/^[a-f0-9]{32}$/.test(traceId)).toBe(true);
    });

    it('should create correlation context', () => {
      const context = createCorrelationContext({
        correlationId: 'test-id',
      });

      expect(context.correlationId).toBe('test-id');
      expect(context.trace.traceId).toBeDefined();
      expect(context.trace.spanId).toBeDefined();
    });
  });
}

// =============================================================================
// Metrics Tests
// =============================================================================

export function runMetricsTests(): void {
  describe('Metrics', () => {
    let collector: InMemoryMetricsCollector;

    beforeEach(() => {
      collector = new InMemoryMetricsCollector();
    });

    it('should increment counters', () => {
      collector.increment('test_counter');
      collector.increment('test_counter');
      collector.increment('test_counter', { label: 'value' });

      const metrics = collector.getMetrics();
      expect(metrics['test_counter']).toBe(2);
      expect(metrics['test_counter{label="value"}']).toBe(1);
    });

    it('should record gauges', () => {
      collector.gauge('test_gauge', 100);
      collector.gauge('test_gauge', 200);

      const metrics = collector.getMetrics();
      expect(metrics['test_gauge']).toBe(200);
    });

    it('should record histograms', () => {
      collector.histogram('test_histogram', 10);
      collector.histogram('test_histogram', 20);
      collector.histogram('test_histogram', 30);

      const metrics = collector.getMetrics();
      expect(metrics['test_histogram_count']).toBe(3);
      expect(metrics['test_histogram_sum']).toBe(60);
    });

    it('should validate labels', () => {
      const result = validateLabels({
        service: 'auth',
        status: 'success',
        user_id: '123', // Should be filtered
      });

      expect(result.sanitized.service).toBe('auth');
      expect(result.sanitized.status).toBe('success');
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
}

// =============================================================================
// WASM Instrumentation Tests
// =============================================================================

export function runWasmTests(): void {
  describe('WASM Instrumentation', () => {
    beforeEach(() => {
      resetWasmMetrics();
    });

    it('should record initialization', () => {
      const instrumentation = createWasmInstrumentation({
        serviceContext: {
          service: 'test-service',
          environment: 'test',
          version: '1.0.0',
          runtime: 'cloudflare-workers',
        },
        engineName: 'test-engine',
        engineVersion: '1.0.0',
      });

      instrumentation.recordInitialization(true, 50, 'wasm');
      instrumentation.recordInitialization(false, 100, 'wasm');

      const metrics = instrumentation.getMetrics();
      expect(metrics['wasm_init_avg_ms']).toBeDefined();
      expect(metrics['wasm_init_failures']).toBeDefined();
    });

    it('should record calculations', () => {
      const instrumentation = createWasmInstrumentation({
        serviceContext: {
          service: 'test-service',
          environment: 'test',
          version: '1.0.0',
          runtime: 'cloudflare-workers',
        },
        engineName: 'test-engine',
        engineVersion: '1.0.0',
      });

      instrumentation.recordCalculation('calculate', 10, true, 'wasm', 6);
      instrumentation.recordCalculation('calculate', 20, false, 'wasm', 6);

      const metrics = instrumentation.getMetrics();
      expect(metrics['test-engine:calculate_avg_ms']).toBeDefined();
    });
  });
}

// =============================================================================
// AI Instrumentation Tests
// =============================================================================

export function runAiTests(): void {
  describe('AI Instrumentation', () => {
    beforeEach(() => {
      resetAiMetrics();
    });

    it('should record requests', () => {
      const instrumentation = createAiInstrumentation({
        serviceContext: {
          service: 'test-service',
          environment: 'test',
          version: '1.0.0',
          runtime: 'cloudflare-workers',
        },
        providerName: 'openai',
      });

      instrumentation.recordRequest('gpt-4o', '1.0', true, 1000, {
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
      });

      const metrics = instrumentation.getMetrics();
      expect(metrics['ai_openai:gpt-4o_requests']).toBe(1);
      expect(metrics['ai_openai:gpt-4o_prompt_tokens']).toBe(100);
    });

    it('should estimate costs', () => {
      const cost = estimateCost('gpt-4o', {
        promptTokens: 1000000,
        completionTokens: 500000,
        totalTokens: 1500000,
      });

      // gpt-4o: $5/M input, $15/M output
      // 1M * $5 + 0.5M * $15 = $5 + $7.50 = $12.50
      expect(cost).toBeCloseTo(12.5, 1);
    });
  });
}

// =============================================================================
// Test Logger
// =============================================================================

export function createMockLogger(): {
  logs: Array<{ level: string; message: string; data?: Record<string, unknown> }>;
  logger: Logger;
} {
  const logs: Array<{ level: string; message: string; data?: Record<string, unknown> }> = [];

  const logger = createTestLogger('test-service') as Logger;

  // Override output methods
  (logger as unknown as Record<string, unknown>).writeLog = (entry: unknown) => {
    const logEntry = entry as Record<string, unknown>;
    logs.push({
      level: logEntry.severity as string,
      message: logEntry.message as string,
      data: logEntry as Record<string, unknown>,
    });
  };

  return { logs, logger };
}

// =============================================================================
// Integration Test Helpers
// =============================================================================

export interface TestContext {
  correlationId: string;
  traceId: string;
  logs: Array<{ level: string; message: string }>;
}

export function createTestContext(): TestContext {
  return {
    correlationId: generateCorrelationId(),
    traceId: generateTraceId(),
    logs: [],
  };
}

export async function withTestContext<T>(
  context: TestContext,
  fn: (ctx: TestContext) => Promise<T>
): Promise<T> {
  // Set up test context
  return fn(context);
}

// =============================================================================
// Run All Tests
// =============================================================================

export function runAllObservabilityTests(): void {
  runRedactionTests();
  runErrorTests();
  runCorrelationTests();
  runMetricsTests();
  runWasmTests();
  runAiTests();
}
