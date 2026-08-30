/**
 * Crypto utilities for the Nutrition Worker
 */

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Generate a secure random string
 */
export function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash content using SHA-256
 */
export async function sha256(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash content using SHA-256 and return base64url encoded
 */
export async function sha256Base64Url(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  
  // Convert to base64url
  let base64 = btoa(String.fromCharCode(...hashArray));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Generate content hash for image deduplication
 */
export async function generateImageHash(imageData: ArrayBuffer): Promise<string> {
  return sha256Base64Url(new Uint8Array(imageData).toString());
}

/**
 * Generate a secure R2 object key
 */
export function generateR2Key(userId: string, analysisId: string): string {
  const timestamp = Date.now();
  return `meals/${userId}/${timestamp}-${analysisId}`;
}

/**
 * Parse R2 key to extract metadata
 */
export function parseR2Key(key: string): {
  userId: string;
  timestamp: number;
  analysisId: string;
} | null {
  const match = key.match(/^meals\/([^/]+)\/(\d+)-(.+)$/);
  if (!match) return null;
  
  return {
    userId: match[1],
    timestamp: parseInt(match[2], 10),
    analysisId: match[3],
  };
}

/**
 * Validate that a string is a valid UUID
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Sanitize string for safe logging (remove potential injection)
 */
export function sanitizeForLogging(str: string, maxLength: number = 200): string {
  return str
    .replace(/[\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}
