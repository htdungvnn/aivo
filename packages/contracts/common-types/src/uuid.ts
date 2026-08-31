/**
 * UUID Utilities
 * 
 * Provides cross-environment UUID generation with fallbacks for
 * environments that may not support crypto.randomUUID().
 * 
 * @module @aivo/common-types/uuid
 */

/**
 * Generate a UUID v4 string.
 * Uses crypto.randomUUID() with a fallback for environments that don't support it.
 * 
 * @returns {string} A UUID v4 string
 * 
 * @example
 * ```typescript
 * import { generateUUID } from '@aivo/common-types/uuid';
 * const id = generateUUID(); // '550e8400-e29b-41d4-a716-446655440000'
 * ```
 */
export function generateUUID(): string {
  // Use native crypto.randomUUID if available
  if (typeof crypto !== 'undefined' && typeof (crypto as unknown as { randomUUID?: () => string }).randomUUID === 'function') {
    try {
      return (crypto as unknown as { randomUUID: () => string }).randomUUID();
    } catch {
      // Fall through to fallback
    }
  }
  
  // Fallback implementation using crypto.getRandomValues
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof (crypto as unknown as { getRandomValues?: (array: Uint8Array) => Uint8Array }).getRandomValues === 'function') {
    (crypto as unknown as { getRandomValues: (array: Uint8Array) => Uint8Array }).getRandomValues(bytes);
  } else {
    // Last resort fallback - less secure
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  
  // Set version (4) and variant (RFC 4122)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  
  const hex = Array.from(bytes)
    .map((b: number) => b.toString(16).padStart(2, '0'))
    .join('');
  
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Validate if a string is a valid UUID v4.
 * 
 * @param value - The string to validate
 * @returns boolean - True if valid UUID v4 format
 * 
 * @example
 * ```typescript
 * import { isValidUUID } from '@aivo/common-types/uuid';
 * isValidUUID('550e8400-e29b-41d4-a716-446655440000'); // true
 * isValidUUID('not-a-uuid'); // false
 * ```
 */
export function isValidUUID(value: string): boolean {
  if (typeof value !== 'string') return false;
  
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(value);
}
