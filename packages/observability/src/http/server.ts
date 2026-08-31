/**
 * HTTP Server Instrumentation
 * 
 * Instruments HTTP server requests with structured logging,
 * correlation context, and metrics.
 */

import { redactHeadersObject, redactQueryParams } from '../redaction.js';
import { injectCorrelationId, injectTraceContext, sanitizeTraceContext } from '../context.js';
import { recordHttpRequest, normalizePath } from '../metrics.js';
import { createServiceLogger, type Logger } from '../logger.js';
import type { ServiceContext, NormalizedError } from '../types.js';
import { createNormalizedError, ERROR_CODES } from '../errors.js';

// =============================================================================
// HTTP Server Instrumentation
// =============================================================================

export interface HttpServerInstrumentationOptions {
  serviceContext: ServiceContext;
  logger?: Logger;
  redactHeaders?: boolean;
  redactQueryParams?: boolean;
  includeRequestBody?: boolean;
  includeResponseBody?: boolean;
  sampleRate?: number;
}

/**
 * Create HTTP server instrumentation.
 */
export function createHttpServerInstrumentation(
  options: HttpServerInstrumentationOptions
): {
  instrumentRequest: (request: Request) => RequestInstrumented;
  recordResponse: (response: Response, context: RequestInstrumented) => void;
  recordError: (error: NormalizedError, context: RequestInstrumented) => void;
} {
  const logger = options.logger || createServiceLogger(options.serviceContext.service);
  
  return {
    /**
     * Instrument an incoming HTTP request.
     */
    instrumentRequest(request: Request): RequestInstrumented {
      const startTime = Date.now();
      const url = new URL(request.url);
      
      // Extract or generate correlation ID
      const correlationId =
        request.headers.get('x-correlation-id') ||
        request.headers.get('x-request-id') ||
        crypto.randomUUID();
      
      // Extract and sanitize trace context
      const traceparent = request.headers.get('traceparent');
      let trace = sanitizeTraceContext({});
      if (traceparent) {
        const parsed = sanitizeTraceContext({ traceparent });
        if (parsed.traceId) {
          trace = parsed;
        }
      }
      
      // Create correlation context
      const context: RequestInstrumented = {
        request,
        correlationId,
        trace,
        startTime,
        method: request.method,
        path: url.pathname,
        normalizedPath: normalizePath(url.pathname),
        query: options.redactQueryParams !== false
          ? redactQueryParams(request.url)
          : url.search,
        headers: options.redactHeaders !== false
          ? redactHeadersObject(Object.fromEntries(request.headers.entries()))
          : Object.fromEntries(request.headers.entries()),
      };
      
      // Log request start
      logger.info(`HTTP ${request.method} ${url.pathname}`, {
        operation: 'http_request',
        correlationId,
        traceId: trace.traceId,
        method: request.method,
        path: url.pathname,
        query: context.query,
      });
      
      return context;
    },
    
    /**
     * Record HTTP response.
     */
    recordResponse(response: Response, context: RequestInstrumented): void {
      const durationMs = Date.now() - context.startTime;
      const statusCode = response.status;
      
      // Determine result
      const result = statusCode >= 500 ? 'failure' : statusCode >= 400 ? 'partial' : 'success';
      
      // Record metrics
      recordHttpRequest(
        context.method,
        context.path,
        statusCode,
        durationMs,
        { service: options.serviceContext.service }
      );
      
      // Log response
      const logData: Record<string, unknown> = {
        operation: 'http_response',
        correlationId: context.correlationId,
        traceId: context.trace.traceId,
        statusCode,
        durationMs,
        result,
      };
      
      if (statusCode >= 400) {
        logger.warn(`HTTP ${context.method} ${context.path} ${statusCode}`, logData);
      } else {
        logger.info(`HTTP ${context.method} ${context.path} ${statusCode}`, logData);
      }
    },
    
    /**
     * Record HTTP error.
     */
    recordError(error: NormalizedError, context: RequestInstrumented): void {
      const durationMs = Date.now() - context.startTime;
      
      // Record metrics
      recordHttpRequest(
        context.method,
        context.path,
        500,
        durationMs,
        {
          service: options.serviceContext.service,
          error_code: error.code,
        }
      );
      
      // Log error
      logger.error(`HTTP ${context.method} ${context.path} error`, undefined, {
        operation: 'http_error',
        correlationId: context.correlationId,
        traceId: context.trace.traceId,
        durationMs,
        result: 'failure',
        errorCode: error.code,
        retryable: error.retryable,
      });
    },
  };
}

// =============================================================================
// Request Context
// =============================================================================

export interface RequestInstrumented {
  /** Original request */
  request: Request;
  /** Correlation ID */
  correlationId: string;
  /** Trace context */
  trace: {
    traceparent?: string;
    traceId?: string;
    spanId?: string;
    traceFlags?: string;
  };
  /** Request start time */
  startTime: number;
  /** HTTP method */
  method: string;
  /** Original path */
  path: string;
  /** Normalized path (for metrics) */
  normalizedPath: string;
  /** Query string (redacted if enabled) */
  query: string;
  /** Request headers (redacted if enabled) */
  headers: Record<string, string>;
}

// =============================================================================
// Hono Middleware Factory
// =============================================================================

/**
 * Create a Hono middleware for HTTP instrumentation.
 */
export function createHonoHttpMiddleware(
  options: HttpServerInstrumentationOptions
): (c: {
  req: { raw: Request; path: string; method: string };
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => void;
  header: (name: string, value: string) => void;
}, next: () => Promise<void>) => Promise<void> {
  const instrumentation = createHttpServerInstrumentation(options);
  
  return async (c, next) => {
    const request = c.req.raw;
    const context = instrumentation.instrumentRequest(request);
    
    // Store context in Hono context
    c.set('correlationId', context.correlationId);
    c.set('traceContext', context.trace);
    
    // Inject correlation ID and trace context into response headers
    c.header('x-correlation-id', context.correlationId);
    if (context.trace.traceparent) {
      c.header('traceparent', context.trace.traceparent);
    }
    
    try {
      await next();
      
      // Get response from context
      const response = c.get('response') as Response | undefined;
      if (response) {
        instrumentation.recordResponse(response, context);
      }
    } catch (error) {
      const normalizedError = createNormalizedError(
        error,
        ERROR_CODES.INTERNAL_ERROR,
        context.correlationId
      );
      instrumentation.recordError(normalizedError, context);
      throw error;
    }
  };
}

// =============================================================================
// Cloudflare Workers Handler Wrapper
// =============================================================================

/**
 * Wrap a Cloudflare Workers fetch handler with instrumentation.
 */
export function instrumentFetchHandler(
  handler: (request: Request, env: Record<string, unknown>, ctx: unknown) => Promise<Response>,
  options: HttpServerInstrumentationOptions
): (request: Request, env: Record<string, unknown>, ctx: unknown) => Promise<Response> {
  const instrumentation = createHttpServerInstrumentation(options);
  
  return async (request, env, ctx) => {
    const context = instrumentation.instrumentRequest(request);
    
    // Inject headers
    const responseHeaders = new Headers();
    responseHeaders.set('x-correlation-id', context.correlationId);
    if (context.trace.traceparent) {
      responseHeaders.set('traceparent', context.trace.traceparent);
    }
    
    try {
      const response = await handler(request, env, ctx);
      
      // Add correlation headers to response
      const enhancedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: new Headers([...response.headers.entries(), ...responseHeaders.entries()]),
      });
      
      instrumentation.recordResponse(enhancedResponse, context);
      return enhancedResponse;
    } catch (error) {
      const normalizedError = createNormalizedError(
        error,
        ERROR_CODES.INTERNAL_ERROR,
        context.correlationId
      );
      instrumentation.recordError(normalizedError, context);
      
      // Return error response with correlation headers
      return new Response(
        JSON.stringify({
          error: {
            code: normalizedError.code,
            message: normalizedError.safeMessage,
          },
        }),
        {
          status: 500,
          headers: new Headers([
            ['content-type', 'application/json'],
            ...responseHeaders.entries(),
          ]),
        }
      );
    }
  };
}
