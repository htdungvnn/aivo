/**
 * Validation Middleware for Hono API
 * Provides reusable validation for request body, query, and params
 */

import type { Context } from "hono";
import type { ZodSchema} from "zod";
import { ZodError, z } from "zod";
import { ValidationError, formatZodError } from "../utils/errors";

// Store validated data in context (use string key - Hono context doesn't support Symbol keys)
const VALIDATED_DATA_KEY = "__validated_data";

/**
 * Middleware factory for validating request body
 * Usage: router.post("/", validateBody(schema), handler)
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return async (c: Context, next: () => Promise<Response>) => {
    try {
      const json = await c.req.json();
      const validated = schema.parse(json);

      // Store validated data in context
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c as any).set(VALIDATED_DATA_KEY, validated);

      return await next();
    } catch (error) {
      if (error instanceof ZodError) {
        throw formatZodError(error);
      }
      throw error;
    }
  };
}

/**
 * Middleware factory for validating query parameters
 * Usage: router.get("/", validateQuery(schema), handler)
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return async (c: Context, next: () => Promise<Response>) => {
    try {
      const query: Record<string, unknown> = {};
      const url = new URL(c.req.url);
      url.searchParams.forEach((value, key) => {
        // Try to parse as JSON, otherwise keep as string
        try {
          query[key] = JSON.parse(value);
        } catch {
          query[key] = value;
        }
      });

      const validated = schema.parse(query);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c as any).set(VALIDATED_DATA_KEY, validated);

      return await next();
    } catch (error) {
      if (error instanceof ZodError) {
        throw formatZodError(error);
      }
      throw error;
    }
  };
}

/**
 * Get validated data from context
 * Should be called after validation middleware
 */
export function getValidated<T>(c: Context): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (c as any).get(VALIDATED_DATA_KEY);
  if (data === undefined) {
    throw new ValidationError("No validated data found. Did you forget to use validateBody/validateQuery?");
  }
  return data as T;
}

/**
 * Utility to create common query validation schemas
 */
export const QuerySchemas = {
  pagination: z.object({
    page: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .optional()
      .default("1"),
    limit: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .optional()
      .default("20"),
  }),
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
};
