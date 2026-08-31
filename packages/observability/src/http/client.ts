/**
 * HTTP Client Instrumentation
 * 
 * Instruments outbound HTTP requests with correlation context,
 * retry handling, and metrics.
 */

import { recordHttpRequest } from '../metrics.js';
import { injectCorrelationId, injectTraceContext } from '../context.js';
import { createServiceLogger, type Logger } from '../logger.js';
import type { ServiceContext, NormalizedError } from '../types.js';

// =============================================================================
// HTTP Client Instrumentation
// =============================================================================

export interface HttpClientInstrumentationOptions {
  serviceContext: ServiceContext;
  logger?: Logger;
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

/**
 * Create HTTP client instrumentation.
 */
export function createHttpClientInstrumentation(
  options: HttpClientInstrumentationOptions
): {
  fetch: typeof fetch;
  createRequest: (
    input: RequestInfo,
    init?: RequestInit,
    correlationId?: string,
    traceContext?: { traceparent?: string; tracestate?: string }
  ) => RequestInit & { headers: Headers };
} {
  const logger = options.logger || createServiceLogger(options.serviceContext.service);
  const defaultHeaders = new Headers(options.defaultHeaders || {});
  
  /**
   * Create instrumented request init.
   */
  function createRequest(
    input: RequestInfo,
    init: RequestInit = {},
    correlationId?: string,
    traceContext?: { traceparent?: string; tracestate?: string }
  ): RequestInit & { headers: Headers } {
    const headers = new Headers(defaultHeaders);
    
    // Add custom headers
    if (init.headers) {
      const customHeaders = init.headers instanceof Headers
        ? init.headers
        : new Headers(init.headers as Record<string, string>);
      for (const [key, value] of customHeaders.entries()) {
        headers.set(key, value);
      }
    }
    
    // Inject correlation ID
    if (correlationId) {
      injectCorrelationId(headers, correlationId);
    }
    
    // Inject trace context
    if (traceContext) {
      injectTraceContext(headers, traceContext);
    }
    
    return {
      ...init,
      headers,
      // Apply timeout if configured
      ...(options.timeout && { signal: AbortSignal.timeout(options.timeout) }),
    };
  }
  
  /**
   * Instrumented fetch function.
   */
  async function instrumentedFetch(
    input: RequestInfo,
    init: RequestInit = {}
  ): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : (input as URL).href;
    const method = init.method || (typeof input === 'object' && 'method' in input ? (input as Request).method : 'GET');
    const startTime = Date.now();
    
    // Extract correlation and trace from init headers if available
    const headers = init.headers instanceof Headers ? init.headers
      : init.headers ? new Headers(init.headers as Record<string, string>) : new Headers();
    
    const correlationId = headers.get('x-correlation-id') || undefined;
    const traceContext = headers.get('traceparent')
      ? { traceparent: headers.get('traceparent')!, tracestate: headers.get('tracestate') || undefined }
      : undefined;
    
    const requestInit = createRequest(input, init, correlationId, traceContext);
    
    // Log outbound request
    logger.info(`Outbound HTTP ${method} ${url}`, {
      operation: 'http_client_request',
      correlationId,
      method,
      url: options.baseUrl ? url.replace(options.baseUrl, '') : url,
    });
    
    try {
      const response = await fetch(input, requestInit);
      const durationMs = Date.now() - startTime;
      const statusCode = response.status;
      
      // Record metrics
      const route = normalizeRoute(url, options.baseUrl);
      recordHttpRequest(
        method,
        route,
        statusCode,
        durationMs,
        { service: options.serviceContext.service }
      );
      
      // Log response
      const result = statusCode >= 500 ? 'failure' : statusCode >= 400 ? 'partial' : 'success';
      logger.info(`Outbound HTTP ${method} ${route} ${statusCode}`, {
        operation: 'http_client_response',
        correlationId,
        statusCode,
        durationMs,
        result,
      });
      
      return response;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      
      // Record error metrics
      const route = normalizeRoute(url, options.baseUrl);
      recordHttpRequest(
        method,
        route,
        0, // Unknown status
        durationMs,
        { service: options.serviceContext.service, error_code: 'NETWORK_ERROR' }
      );
      
      // Log error
      logger.error(`Outbound HTTP ${method} ${route} failed`, error instanceof Error ? error : undefined, {
        operation: 'http_client_error',
        correlationId,
        durationMs,
        result: 'failure',
        errorCode: 'NETWORK_ERROR',
        retryable: true,
      });
      
      throw error;
    }
  }
  
  return {
    fetch: instrumentedFetch,
    createRequest,
  };
}

// =============================================================================
// Route Normalization
// =============================================================================

/**
 * Normalize URL path for metrics (remove IDs, normalize patterns).
 */
function normalizeRoute(url: string, baseUrl?: string): string {
  let path = url;
  
  // Remove base URL if present
  if (baseUrl) {
    path = path.replace(new RegExp(`^${baseUrl}`), '');
  }
  
  // Parse URL to get pathname
  try {
    const parsed = new URL(path, 'http://localhost');
    path = parsed.pathname;
  } catch {
    // Use as-is if URL parsing fails
  }
  
  // Normalize patterns
  return path
    // Replace UUIDs
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    // Replace numeric IDs
    .replace(/\/\d+/g, '/:id')
    // Normalize trailing slashes
    .replace(/\/$/, '') || '/';
}

// =============================================================================
// Retry Logic
// =============================================================================

export interface RetryOptions {
  maxRetries?: number;
  backoffMs?: number;
  backoffMultiplier?: number;
  retryableStatuses?: number[];
}

/**
 * Create a fetch function with automatic retry.
 */
export function createRetryFetch(
  baseFetch: typeof fetch,
  options: RetryOptions = {}
): typeof fetch {
  const {
    maxRetries = 3,
    backoffMs = 1000,
    backoffMultiplier = 2,
    retryableStatuses = [408, 429, 500, 502, 503, 504],
  } = options;
  
  return async function retryFetch(
    input: RequestInfo,
    init?: RequestInit
  ): Promise<Response> {
    let lastError: Error | undefined;
    let attempt = 0;
    
    while (attempt <= maxRetries) {
      try {
        const response = await baseFetch(input, init);
        
        // Success or non-retryable status
        if (response.ok || !retryableStatuses.includes(response.status)) {
          return response;
        }
        
        // Retryable status
        lastError = new Error(`HTTP ${response.status}`);
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
      
      attempt++;
      
      // Don't wait after last attempt
      if (attempt <= maxRetries) {
        const delay = backoffMs * Math.pow(backoffMultiplier, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    
    throw lastError || new Error('Max retries exceeded');
  };
}
