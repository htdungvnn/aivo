/**
 * Request ID Middleware
 * 
 * Adds unique request ID to each request for tracing.
 * Follows Single Responsibility: only handles request ID.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Request ID options
 */
export interface RequestIdOptions {
  /** Header name for incoming request ID */
  headerName?: string;
  /** Header name for outgoing response */
  responseHeaderName?: string;
  /** Generate function (for testing) */
  generator?: () => string;
}

/**
 * Default request ID generator
 */
export function generateRequestId(): string {
  // Use crypto for secure random ID
  const crypto = globalThis as unknown as { crypto?: Crypto };
  if (crypto?.crypto?.randomUUID) {
    return crypto.crypto.randomUUID();
  }
  
  // Fallback for environments without crypto.randomUUID
  return [
    Date.now().toString(36),
    Math.random().toString(36).substring(2, 9),
    Math.random().toString(36).substring(2, 9),
  ].join('-');
}

/**
 * Default configuration
 */
export const DEFAULT_REQUEST_ID_OPTIONS: Required<RequestIdOptions> = {
  headerName: 'X-Request-ID',
  responseHeaderName: 'X-Request-ID',
  generator: generateRequestId,
};

// =============================================================================
// Utilities
// =============================================================================

/**
 * Extract request ID from headers
 */
export function extractRequestId(
  request: Request,
  headerName: string = 'X-Request-ID'
): string | null {
  return request.headers.get(headerName);
}

/**
 * Create context key for request ID
 */
export function createRequestIdContextKey(): unique symbol {
  return Symbol('requestId');
}

/**
 * Validate request ID format
 */
export function isValidRequestId(id: string): boolean {
  // Basic validation: non-empty string, reasonable length
  return (
    typeof id === 'string' &&
    id.length > 0 &&
    id.length <= 128 &&
    /^[a-zA-Z0-9_-]+$/.test(id)
  );
}

/**
 * Sanitize request ID for logging
 */
export function sanitizeRequestId(id: string): string {
  // Remove any potential injection characters
  return id.replace(/[^\w-]/g, '').substring(0, 64);
}
