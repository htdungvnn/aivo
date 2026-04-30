/**
 * Validation Middleware for Hono API
 * Provides reusable validation for request body, query, and params
 */

import type { Context } from "hono";
import { z, ZodError } from "zod";
import { ValidationError, formatZodError } from "../utils/errors";
import { VALIDATED_BODY_KEY, VALIDATED_QUERY_KEY } from "../utils/context-keys";

/**
 * Middleware factory for validating request body
 * Usage: router.post("/", validateBody(schema), handler)
 */
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return async (c: Context, next: () => Promise<Response>) => {
    try {
      const json = await c.req.json();
      const validated = schema.parse(json);
      (c as any).set(VALIDATED_BODY_KEY, validated);
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
export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return async (c: Context, next: () => Promise<Response>) => {
    try {
      const query: Record<string, unknown> = {};
      const url = new URL(c.req.url);
      url.searchParams.forEach((value, key) => {
        try {
          query[key] = JSON.parse(value);
        } catch {
          query[key] = value;
        }
      });

      const validated = schema.parse(query);
      (c as any).set(VALIDATED_QUERY_KEY, validated);
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
 * Get validated body from context (type-safe)
 */
export function getValidatedBody<T>(c: Context): T {
  const data = (c as any).get(VALIDATED_BODY_KEY);
  if (data === undefined) {
    throw new ValidationError("No validated body found. Did you forget to use validateBody?");
  }
  return data as T;
}

/**
 * Get validated query from context (type-safe)
 */
export function getValidatedQuery<T>(c: Context): T {
  const data = (c as any).get(VALIDATED_QUERY_KEY);
  if (data === undefined) {
    throw new ValidationError("No validated query found. Did you forget to use validateQuery?");
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
