/**
 * Global Error Handling Middleware for AIVO API
 * Catches all errors and formats consistent JSON responses
 */

import type { Context, Next } from "hono";
import { APIError } from "../utils/errors";

// Request ID storage key (use string key - Hono context doesn't support Symbol keys)
const REQUEST_ID_KEY = "__request_id";

/**
 * Generate or get request ID
 */
export function getRequestId(c: Context): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let requestId = (c as any).get(REQUEST_ID_KEY);
  if (!requestId) {
    requestId = crypto.randomUUID();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
 * Structured logger (simple implementation for now)
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
  const logEntry = {
    timestamp: new Date().toISOString(),
    requestId,
    level: "error",
    message: error.message,
    ...context,
    ...(error instanceof APIError && {
      errorCode: error.code,
      errorDetails: error.details,
    }),
    // Include stack trace in development
    ...(process.env.NODE_ENV !== "production" && { stack: error.stack }),
  };

  // In production, use structured JSON logging
  if (process.env.NODE_ENV === "production") {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify(logEntry));
  } else {
    // In development, use readable format
    // eslint-disable-next-line no-console
    console.error(
      `[${logEntry.timestamp}] ${logEntry.method} ${logEntry.path} - ${logEntry.statusCode} - ${logEntry.errorCode || "ERROR"}: ${logEntry.message}`
    );
  }
}

/**
 * Error handling middleware
 */
export async function errorHandler(c: Context, next: Next) {
  try {
    // Attach request ID to all requests
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
    const userId = (c.get("auth-user") as { id?: string } | undefined)?.id;

    // Log the error with context
    logError(requestId, error as Error, {
      method,
      path,
      userId,
      statusCode,
    });

    // Ensure request ID is in response headers
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
