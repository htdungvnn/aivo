import { type Context, type Next } from "hono";

// Unique key for storing request ID in Hono context
const REQUEST_ID_KEY = "__request_id__";

/**
 * Request Metrics Middleware
 *
 * Collects structured metrics for each request and logs them in JSON format.
 * These logs can be ingested by Cloudflare Logpush or external monitoring.
 *
 * Metrics include:
 * - HTTP method, route, status code
 * - Response time (duration_ms)
 * - User ID (if authenticated)
 * - Request ID (if available)
 * - Timestamp
 *
 * Example log output:
 * {"method":"GET","route":"/api/users/me","status":200,"duration_ms":45,"user_id":"user-123","request_id":"req-..."}
 */

export const metricsMiddleware = async (c: Context, next: Next): Promise<void> => {
  const startTime = Date.now();

  // Generate request ID if not present
  let requestId = c.req.header("X-Request-Id");
  if (!requestId) {
    // Simple unique ID using timestamp + random
    requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    // Set response header
    c.res.headers.set("X-Request-Id", requestId);
  }

  // Store request ID in context for downstream use
  c.set(REQUEST_ID_KEY, requestId);

  try {
    await next();
  } finally {
    const duration = Date.now() - startTime;
    const status = c.res.status;

    // Build metrics object
    const metrics = {
      method: c.req.method,
      route: c.req.path,
      status,
      duration_ms: duration,
      user_id: c.req.header("X-User-ID") || null,
      request_id: requestId,
      timestamp: new Date().toISOString(),
      // Add Cloudflare-specific context if available
      cf_colo: c.req.header("CF-COLOCATION"),
      cf_ray: c.req.header("CF-RAY"),
    };

    // Log as JSON for structured parsing
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(metrics));
  }
};

/**
 * Helper to get request ID from context
 */
export const getRequestId = (c: Context): string => {
  return c.get<string>(REQUEST_ID_KEY) || "unknown";
};
