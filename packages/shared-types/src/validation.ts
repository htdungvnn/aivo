// ============================================
// RUNTIME VALIDATION SCHEMAS
// ============================================
// Placeholder for Zod schemas
// These will be implemented as needed for runtime validation

import type { Discriminator } from "./common";

// Re-export common utility types for convenience
export type { Nullable, Optional, Result, Discriminator } from "./common";

// Zod schema type marker (will be replaced with actual Zod imports)
export interface ZodSchema<T> {
  _type: "ZodSchema";
  parse(data: unknown): T;
  safeParse(data: unknown): { success: boolean; data?: T; error?: unknown };
}

// Common validation helpers
export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePhone(phone: string): boolean {
  const re = /^\+?[\d\s\-\(\)]{10,}$/;
  return re.test(phone);
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function validateISO8601(dateString: string): boolean {
  const re = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
  return re.test(dateString) || !isNaN(Date.parse(dateString));
}
