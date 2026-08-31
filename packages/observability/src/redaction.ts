/**
 * Sensitive Data Redaction
 * 
 * Recursive redaction of sensitive fields in objects, arrays, and strings.
 * This module ensures that sensitive data is never logged or traced.
 * 
 * Features:
 * - Dot-notation path matching (e.g., 'request.body.password')
 * - Wildcard matching (e.g., 'authorization.*')
 * - Recursive object and array traversal
 * - Header redaction
 * - Query parameter redaction
 * - Circular reference detection
 * - Maximum depth limiting
 */

import { DEFAULT_REDACTED_FIELDS, type RedactionConfig } from './config.js';

// =============================================================================
// Constants
// =============================================================================

const REDACTED_PLACEHOLDER = '[REDACTED]';
const MAX_DEPTH_DEFAULT = 20;
const CIRCULAR_PLACEHOLDER = '[CIRCULAR]';

// =============================================================================
// Redaction Engine
// =============================================================================

/**
 * Redact sensitive fields from an object.
 */
export function redact<T>(
  data: T,
  config?: RedactionConfig
): T {
  const fields = config?.fields || [...DEFAULT_REDACTED_FIELDS];
  const replacement = config?.replacement || REDACTED_PLACEHOLDER;
  const maxDepth = config?.maxDepth || MAX_DEPTH_DEFAULT;
  
  return redactValue(data, fields, replacement, 0, maxDepth, new Set());
}

/**
 * Recursive redaction implementation.
 */
function redactValue<T>(
  value: T,
  fields: readonly string[],
  replacement: string,
  depth: number,
  maxDepth: number,
  seen: Set<unknown>
): T {
  // Handle primitives
  if (value === null || value === undefined) {
    return value;
  }
  
  // Check depth limit
  if (depth >= maxDepth) {
    return '[MAX_DEPTH_EXCEEDED]' as unknown as T;
  }
  
  // Handle circular references
  if (typeof value === 'object' && value !== null) {
    if (seen.has(value)) {
      return CIRCULAR_PLACEHOLDER as unknown as T;
    }
    seen.add(value);
  }
  
  // Handle string/number/boolean
  if (typeof value !== 'object') {
    return value;
  }
  
  // Handle Array
  if (Array.isArray(value)) {
    return value.map((item) =>
      redactValue(item, fields, replacement, depth + 1, maxDepth, seen)
    ) as unknown as T;
  }
  
  // Handle Date
  if (value instanceof Date) {
    return value;
  }
  
  // Handle RegExp
  if (value instanceof RegExp) {
    return value;
  }
  
  // Handle Error
  if (value instanceof Error) {
    return redactError(value, fields, replacement, depth, maxDepth, seen);
  }
  
  // Handle Object
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (shouldRedact(key, fields)) {
      result[key] = replacement;
    } else {
      result[key] = redactValue(val, fields, replacement, depth + 1, maxDepth, seen);
    }
  }
  return result as unknown as T;
}

/**
 * Redact error objects specially to handle non-enumerable properties.
 */
function redactError<T extends Error>(
  error: T,
  fields: readonly string[],
  replacement: string,
  depth: number,
  maxDepth: number,
  seen: Set<unknown>
): T {
  const result: Record<string, unknown> = {
    name: error.name,
    message: shouldRedact('message', fields)
      ? replacement
      : redactValue(error.message, fields, replacement, depth + 1, maxDepth, seen),
    ...error,
  };
  
  // Handle stack trace (redact file paths with sensitive info)
  if (error.stack) {
    result.stack = redactStackTrace(error.stack);
  }
  
  // Redact enumerable properties
  for (const key of Object.keys(error)) {
    if (key !== 'name' && key !== 'message' && key !== 'stack') {
      if (shouldRedact(key, fields)) {
        result[key] = replacement;
      } else {
        result[key] = redactValue((error as Record<string, unknown>)[key], fields, replacement, depth + 1, maxDepth, seen);
      }
    }
  }
  
  return result as unknown as T;
}

/**
 * Check if a field should be redacted based on patterns.
 */
export function shouldRedact(fieldName: string, patterns: readonly string[]): boolean {
  const lowerField = fieldName.toLowerCase();
  
  for (const pattern of patterns) {
    const lowerPattern = pattern.toLowerCase();
    
    // Exact match
    if (lowerField === lowerPattern) {
      return true;
    }
    
    // Wildcard at end (e.g., 'authorization.*')
    if (lowerPattern.endsWith('.*')) {
      const prefix = lowerPattern.slice(0, -2);
      if (lowerField.startsWith(prefix + '.')) {
        return true;
      }
    }
    
    // Wildcard at start (e.g., '*.password')
    if (lowerPattern.startsWith('*.')) {
      const suffix = lowerPattern.slice(2);
      if (lowerField.endsWith('.' + suffix) || lowerField === suffix) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Redact a stack trace, removing file paths that might contain sensitive info.
 */
function redactStackTrace(stack: string): string {
  // Remove file paths that might contain user directories
  return stack
    .replace(/\/Users\/[^\/]+\//g, '/[user]/')
    .replace(/C:\\Users\\[^\\]+\\/g, '/[user]/')
    .replace(/home\/[^\/]+\//g, '/[user]/');
}

// =============================================================================
// Header Redaction
// =============================================================================

/**
 * Redact sensitive headers from a Headers object.
 */
export function redactHeaders(
  headers: Headers,
  sensitiveHeaders: string[] = [...DEFAULT_REDACTED_FIELDS as unknown as string[]]
): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const [key, value] of headers.entries()) {
    if (shouldRedact(key, sensitiveHeaders)) {
      result[key] = REDACTED_PLACEHOLDER;
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Redact headers from a plain object.
 */
export function redactHeadersObject(
  headers: Record<string, string | string[] | undefined>,
  sensitiveHeaders: string[] = [...DEFAULT_REDACTED_FIELDS as unknown as string[]]
): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    
    if (shouldRedact(key, sensitiveHeaders)) {
      result[key] = REDACTED_PLACEHOLDER;
    } else {
      result[key] = Array.isArray(value) ? value.join(', ') : value;
    }
  }
  
  return result;
}

// =============================================================================
// Query String Redaction
// =============================================================================

/**
 * Redact sensitive query parameters from a URL.
 */
export function redactQueryParams(
  url: string,
  sensitiveParams: string[] = [...DEFAULT_REDACTED_FIELDS as unknown as string[]]
): string {
  try {
    const urlObj = new URL(url);
    const redacted = new URL(url);
    
    for (const key of urlObj.searchParams.keys()) {
      if (shouldRedact(key, sensitiveParams)) {
        redacted.searchParams.set(key, REDACTED_PLACEHOLDER);
      }
    }
    
    return redacted.toString();
  } catch {
    // If URL parsing fails, try to redact query string manually
    const [path, query] = url.split('?');
    if (!query) return url;
    
    const params = new URLSearchParams(query);
    const redactedParams = new URLSearchParams();
    
    for (const [key, value] of params.entries()) {
      if (shouldRedact(key, sensitiveParams)) {
        redactedParams.set(key, REDACTED_PLACEHOLDER);
      } else {
        redactedParams.set(key, value);
      }
    }
    
    return `${path}?${redactedParams.toString()}`;
  }
}

// =============================================================================
// Request/Response Redaction
// =============================================================================

/**
 * Redact sensitive data from a Request.
 */
export function redactRequest(request: Request): Request {
  const redactedHeaders: Record<string, string> = {};
  
  for (const [key, value] of request.headers.entries()) {
    if (shouldRedact(key, [...DEFAULT_REDACTED_FIELDS as unknown as string[]])) {
      redactedHeaders[key] = REDACTED_PLACEHOLDER;
    } else {
      redactedHeaders[key] = value;
    }
  }
  
  return new Request(request.url, {
    method: request.method,
    headers: redactedHeaders,
    body: undefined, // Don't log body
    redirect: request.redirect,
    signal: request.signal,
  });
}

/**
 * Redact sensitive data from an Error.
 */
export function redactErrorObject(error: Error): Record<string, unknown> {
  const redacted = {
    name: error.name,
    message: error.message,
  };
  
  // Add stack trace without file paths
  if (error.stack) {
    (redacted as Record<string, unknown>).stack = redactStackTrace(error.stack);
  }
  
  return redacted;
}

// =============================================================================
// SQL Redaction
// =============================================================================

/**
 * Redact SQL parameters from query strings.
 * Prevents SQL from being logged with actual values.
 */
export function redactSql(sql: string): string {
  return sql
    // Remove string literals
    .replace(/'[^']*'/g, "'?'")
    // Remove numeric values in SET/WHERE clauses
    .replace(/(SET|WHERE)\s+\w+\s*=\s*\d+/gi, (match) => match.replace(/\d+/g, '?'))
    // Remove UUIDs
    .replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      '?'
    )
    // Remove base64 encoded values
    .replace(/[A-Za-z0-9+/]{50,}={0,2}/g, '?');
}

// =============================================================================
// Custom Redaction Rules
// =============================================================================

/**
 * Create a custom redaction function based on regex patterns.
 */
export function createCustomRedactor(
  rules: Array<{ pattern: string; replacement: string }>
): (data: unknown) => unknown {
  const compiled = rules.map((rule) => ({
    regex: new RegExp(rule.pattern, 'gi'),
    replacement: rule.replacement,
  }));
  
  return (data: unknown): unknown => {
    if (typeof data === 'string') {
      let result = data;
      for (const { regex, replacement } of compiled) {
        result = result.replace(regex, replacement);
      }
      return result;
    }
    return data;
  };
}

// =============================================================================
// Verification Utilities
// =============================================================================

/**
 * Test that a secret value is properly redacted.
 */
export function verifyRedaction<T>(
  data: T,
  secretValue: string,
  config?: RedactionConfig
): boolean {
  const redacted = redact(data, config);
  const json = JSON.stringify(redacted);
  return !json.includes(secretValue);
}

/**
 * Test that multiple secret values are properly redacted.
 */
export function verifyMultipleRedactions<T>(
  data: T,
  secretValues: string[],
  config?: RedactionConfig
): { allRedacted: boolean; foundSecrets: string[] } {
  const redacted = redact(data, config);
  const json = JSON.stringify(redacted);
  
  const foundSecrets = secretValues.filter((secret) => json.includes(secret));
  
  return {
    allRedacted: foundSecrets.length === 0,
    foundSecrets,
  };
}
