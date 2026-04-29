// ============================================
// COMMON TYPES
// Shared utility types and functions
// ============================================

/**
 * Utility type for nullable values
 */
export type Nullable<T> = T | null;

/**
 * Utility type for optional properties
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Discriminated union helper
 */
export interface Discriminator<T extends string, V extends Record<string, unknown>> {
  kind: T;
  data: V;
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

/**
 * Create a successful result
 */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/**
 * Create an error result
 */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// ============================================
// TIMESTAMP UTILITIES
// ============================================

/**
 * Current timestamp in milliseconds
 */
export const now = (): number => Date.now();

/**
 * Convert Date to Unix timestamp (seconds)
 */
export const toUnixTimestamp = (date: Date): number => Math.floor(date.getTime() / 1000);

/**
 * Convert Unix timestamp (seconds) to Date
 */
export const fromUnixTimestamp = (timestamp: number): Date => new Date(timestamp * 1000);

/**
 * Generate a Unix timestamp from an ISO date string
 */
export const timestampFromISO = (isoString: string): number => {
  return Math.floor(new Date(isoString).getTime() / 1000);
};

// ============================================
// API RESPONSE HELPERS
// ============================================

/**
 * Create a standard API success response
 */
export function createApiResponse<T>(data: T, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Create a standard API error response
 */
export function createErrorResponse(message: string, status = 500) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Parse JSON body from request
 */
export async function parseJsonBody<T>(request: Request): Promise<Result<T>> {
  try {
    const body = await request.json();
    return ok(body as T);
  } catch (error) {
    return err(error as Error);
  }
}
