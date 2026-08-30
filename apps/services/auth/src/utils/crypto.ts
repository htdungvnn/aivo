/**
 * Cryptographic utilities for the auth service
 */

const encoder = new TextEncoder();

/**
 * Generate a cryptographically secure random string
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').slice(0, length);
}

/**
 * Generate a random UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Hash a string using SHA-256
 */
export async function sha256Hash(data: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return bufferToHex(buffer);
}

/**
 * Hash a string using SHA-256 and return base64url encoded
 */
export async function sha256HashBase64Url(data: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return base64UrlEncode(buffer);
}

/**
 * Generate PKCE code verifier
 */
export function generateCodeVerifier(): string {
  return generateSecureToken(64);
}

/**
 * Generate PKCE code challenge from verifier using S256 method
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  return sha256HashBase64Url(verifier);
}

/**
 * Generate PKCE state parameter
 */
export function generateOAuthState(): string {
  return generateSecureToken(32);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Convert ArrayBuffer to hex string
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Base64 URL-safe encoding
 */
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Base64 URL-safe decoding
 */
export function base64UrlDecode(str: string): ArrayBuffer {
  // Add padding if needed
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Create a hash of a refresh token for storage
 */
export async function hashToken(token: string): Promise<string> {
  return sha256Hash(token);
}

/**
 * Normalize email for consistent storage and comparison
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
