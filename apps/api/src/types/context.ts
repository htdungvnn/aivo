import type { Context } from "hono";

/**
 * Extended Hono Context with our custom properties
 */
export interface EnhancedContext<T extends Record<string, unknown> = Record<string, unknown>> extends Context<T> {
  requestId?: string;
}
