import { type Context, type Next } from "hono";
import { REQUEST_ID_KEY } from "../utils/context-keys";

/**
 * Request Metrics Middleware
 *
 * Collects structured metrics for each request and logs them in JSON format.
 * Optimized to reuse request ID from errorHandler.
 */
export const metricsMiddleware = async (c: Context, next: Next): Promise<void> => {
  const startTime = Date.now();

  try {
    await next();
  } finally {
    const duration = Date.now() - startTime;
    const status = c.res.status;
    const requestId = (c as any).get(REQUEST_ID_KEY) || "unknown";

    // Compact metrics with short keys for less overhead
    const metrics = {
      m: c.req.method,
      r: c.req.path,
      s: status,
      d: duration,
      uid: c.req.header("X-User-ID") || null,
      rid: requestId,
      ts: new Date().toISOString(),
      cf_colo: c.req.header("CF-COLOCATION") || null,
      cf_ray: c.req.header("CF-RAY") || null,
    };

    // Single JSON log line
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(metrics));
  }
};
