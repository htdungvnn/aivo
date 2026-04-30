/**
 * Global Error Handling Middleware for AIVO API
 * Catches all errors and formats consistent JSON responses
 */

import type { Context, Next } from "hono";
import { APIError } from "../utils/errors";
import { REQUEST_ID_KEY, AUTH_USER_KEY } from "../utils/context-keys";

/**
 * Request ID storage key
 */
// const REQUEST_ID_KEY = "__request_id__"; // Now imported from context-keys

/**
 * Generate or get request ID
 */
export function getRequestId(c: Context): string {
  let requestId = (c as any).get(REQUEST_ID_KEY);
  if (!requestId) {
    requestId = crypto.randomUUID();
    (c as any).set(REQUEST_ID_KEY, requestId);
  }
  return requestId as string;
}

/**
 * Attach request ID to response headers
 */
export function attachRequestId(c: Context): void {
  const requestId = getRequestId(c);
  c.header("X-Request-Id", requestId);
}

/**
 * Structured logger (optimized with minimal allocations)
 */
function logError(
  requestId: string,
  error: Error,
  context: {
    method: string;
    path: string;
    userId?: string;
    statusCode: number;
  }
): void {
  // Build log entry efficiently
  const logEntry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    requestId,
    level: "error",
    message: error.message,
    ...context,
  };

  // Add error code and details for APIError
  if (error instanceof APIError) {
    logEntry.errorCode = error.code;
    if (error.details) {
      logEntry.errorDetails = error.details;
    }
  }

  // Include stack trace only in development
  if (process.env.NODE_ENV !== "production") {
    logEntry.stack = error.stack;
  }

  // In production, log as single JSON line (better for Logpush)
  if (process.env.NODE_ENV === "production") {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify(logEntry));
  } else {
    // Development: readable format with colors could be added
    // eslint-disable-next-line no-console
    console.error(
      `[${logEntry.timestamp}] ${logEntry.method} ${logEntry.path} - ${logEntry.statusCode} - ${(logEntry as any).errorCode || "ERROR"}: ${error.message}`
    );
  }
}

/**
 * Error handling middleware
 * Note: This should be early in the middleware chain but after request ID
 */
export async function errorHandler(c: Context, next: Next) {
  try {
    // Attach request ID to all requests (idempotent - also done by attachRequestId middleware)
    attachRequestId(c);
    return await next();
  } catch (error) {
    const requestId = getRequestId(c);
    const method = c.req.method;
    const path = c.req.url.split("?")[0];

    // Determine status code and error format
    let statusCode: number;
    let response: { success: boolean; error: { code: string; message: string; details?: Record<string, unknown> } };

    if (error instanceof APIError) {
      statusCode = error.statusCode;
      response = error.toJSON();
    } else if (error instanceof Error) {
      // Generic server error
      statusCode = 500;
      response = {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: process.env.NODE_ENV === "production"
            ? "An unexpected error occurred"
            : error.message,
        },
      };
    } else {
      // Unknown error type
      statusCode = 500;
      response = {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unknown error occurred",
        },
      };
    }

    // Get user ID from auth context if available
    const userId = ((c as any).get(AUTH_USER_KEY) as { id?: string } | undefined)?.id;

    // Log the error with context
    logError(requestId, error as Error, {
      method,
      path,
      userId,
      statusCode,
    });

    // Ensure request ID is in response headers (might already be set)
    c.header("X-Request-Id", requestId);

    // Cast statusCode to any to satisfy Hono's type system
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return c.json(response, statusCode as any);
  }
}

/**
 * Not found handler for undefined routes
 */
export async function notFoundHandler(c: Context) {
  const requestId = getRequestId(c);
  c.header("X-Request-Id", requestId);

  return c.json(
    {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Endpoint not found",
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    404 as any
  );
}
