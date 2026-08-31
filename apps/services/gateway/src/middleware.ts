/**
 * Gateway Middleware
 * Cross-cutting concerns for the API Gateway
 */

import { Context, Next } from 'hono';
import type { GatewayEnv } from './env';

// =============================================================================
// Types
// =============================================================================

interface RequestLog {
  timestamp: number;
  method: string;
  path: string;
  status?: number;
  duration?: number;
  service?: string;
  error?: string;
}

// =============================================================================
// Metrics
// =============================================================================

const metrics = {
  requests: {
    total: 0,
    byService: {} as Record<string, number>,
    byStatus: {} as Record<string, number>,
  },
  errors: {
    total: 0,
    byType: {} as Record<string, number>,
  },
  latency: {
    sum: 0,
    count: 0,
    buckets: {
      '0-100ms': 0,
      '100-500ms': 0,
      '500-1000ms': 0,
      '1s+': 0,
    },
  },
};

export function getMetrics() {
  return {
    ...metrics,
    latency: {
      ...metrics.latency,
      average: metrics.latency.count > 0 
        ? metrics.latency.sum / metrics.latency.count 
        : 0,
    },
  };
}

export function resetMetrics(): void {
  metrics.requests.total = 0;
  metrics.requests.byService = {};
  metrics.requests.byStatus = {};
  metrics.errors.total = 0;
  metrics.errors.byType = {};
  metrics.latency.sum = 0;
  metrics.latency.count = 0;
  metrics.latency.buckets = {
    '0-100ms': 0,
    '100-500ms': 0,
    '500-1000ms': 0,
    '1s+': 0,
  };
}

// =============================================================================
// Request Logging Middleware
// =============================================================================

export function requestLogger() {
  return async (c: Context, next: Next) => {
    const start = Date.now();
    const requestId = c.get('requestId') || crypto.randomUUID();
    
    // Log request
    console.log(`[${requestId}] → ${c.req.method} ${c.req.path}`);
    
    await next();
    
    // Log response
    const duration = Date.now() - start;
    const service = c.get('service') || 'unknown';
    
    console.log(
      `[${requestId}] ← ${c.res.status} ${c.req.method} ${c.req.path} (${duration}ms) [${service}]`
    );
    
    // Update metrics
    metrics.requests.total++;
    metrics.requests.byService[service] = (metrics.requests.byService[service] || 0) + 1;
    metrics.requests.byStatus[String(c.res.status)] = 
      (metrics.requests.byStatus[String(c.res.status)] || 0) + 1;
    
    // Latency tracking
    metrics.latency.sum += duration;
    metrics.latency.count++;
    
    if (duration < 100) metrics.latency.buckets['0-100ms']++;
    else if (duration < 500) metrics.latency.buckets['100-500ms']++;
    else if (duration < 1000) metrics.latency.buckets['500-1000ms']++;
    else metrics.latency.buckets['1s+']++;
    
    // Track errors
    if (c.res.status >= 400) {
      metrics.errors.total++;
    }
  };
}

// =============================================================================
// Circuit Breaker
// =============================================================================

interface CircuitState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}

const circuits: Record<string, CircuitState> = {};

export function getCircuitState(service: string): CircuitState {
  if (!circuits[service]) {
    circuits[service] = { failures: 0, lastFailure: 0, state: 'closed' };
  }
  return circuits[service];
}

export function recordFailure(service: string): void {
  const circuit = getCircuitState(service);
  circuit.failures++;
  circuit.lastFailure = Date.now();
  
  if (circuit.failures >= 5) {
    circuit.state = 'open';
    console.warn(`[CircuitBreaker] ${service} opened due to ${circuit.failures} failures`);
  }
}

export function recordSuccess(service: string): void {
  const circuit = getCircuitState(service);
  circuit.failures = 0;
  circuit.state = 'closed';
}

export function isCircuitOpen(service: string): boolean {
  const circuit = getCircuitState(service);
  
  if (circuit.state === 'closed') return false;
  
  // Half-open after 30 seconds
  if (circuit.state === 'open' && Date.now() - circuit.lastFailure > 30000) {
    circuit.state = 'half-open';
    return false;
  }
  
  return circuit.state === 'open';
}

export function getAllCircuitStates(): Record<string, CircuitState> {
  return { ...circuits };
}

// =============================================================================
// Request ID
// =============================================================================

export function withRequestId() {
  return async (c: Context, next: Next) => {
    const requestId = c.req.header('X-Request-ID') || crypto.randomUUID();
    c.set('requestId', requestId);
    c.header('X-Request-ID', requestId);
    await next();
  };
}

// =============================================================================
// Service Context
// =============================================================================

export function withService(service: string) {
  return async (c: Context, next: Next) => {
    c.set('service', service);
    await next();
  };
}

// =============================================================================
// Timeout
// =============================================================================

export function withTimeout(ms: number) {
  return async (c: Context, next: Next) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ms);
    
    try {
      // Store original request
      const originalRequest = c.req.raw;
      
      // Create timeout-aware request
      c.req.raw = new Request(originalRequest.url, {
        method: originalRequest.method,
        headers: originalRequest.headers,
        body: originalRequest.body,
        signal: controller.signal,
        redirect: originalRequest.redirect,
        credentials: originalRequest.credentials,
        mode: originalRequest.mode,
      } as RequestInit);
      
      await next();
    } finally {
      clearTimeout(timeout);
    }
  };
}

// =============================================================================
// Retry Logic
// =============================================================================

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    backoff?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 2,
    onRetry,
  } = options;
  
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxAttempts) {
        const waitTime = delay * Math.pow(backoff, attempt - 1);
        if (onRetry) onRetry(attempt, lastError);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError;
}

// =============================================================================
// Health Check Aggregator
// =============================================================================

export interface ServiceHealth {
  name: string;
  status: 'up' | 'down' | 'unknown';
  latency?: number;
  error?: string;
}

export async function checkServiceHealth(
  name: string,
  url: string,
  timeout: number = 5000
): Promise<ServiceHealth> {
  const start = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      return {
        name,
        status: 'up',
        latency: Date.now() - start,
      };
    }
    
    return {
      name,
      status: 'down',
      latency: Date.now() - start,
      error: `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      name,
      status: 'down',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function checkAllServices(
  services: Array<{ name: string; url: string }>
): Promise<ServiceHealth[]> {
  return Promise.all(
    services.map(s => checkServiceHealth(s.name, s.url))
  );
}
