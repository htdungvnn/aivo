/**
 * Validation Utilities
 * 
 * Common validation functions used across AIVO services.
 * These utilities are extracted from health-types, nutrition-types, and fitness-types
 * to eliminate duplication.
 * 
 * @module @aivo/common-types/validation
 */

/**
 * Check if a value is a finite number (not NaN, not Infinity).
 * 
 * @param value - Value to check
 * @returns True if value is a finite number
 * 
 * @example
 * ```typescript
 * import { isFiniteNumber } from '@aivo/common-types/validation';
 * isFiniteNumber(42); // true
 * isFiniteNumber(NaN); // false
 * isFiniteNumber(Infinity); // false
 * ```
 */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Clamp a number between min and max values.
 * 
 * @param value - Value to clamp
 * @param min - Minimum bound
 * @param max - Maximum bound
 * @returns Clamped value
 * 
 * @example
 * ```typescript
 * import { clamp } from '@aivo/common-types/validation';
 * clamp(150, 0, 100); // 100
 * clamp(-5, 0, 100); // 0
 * clamp(50, 0, 100); // 50
 * ```
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Round a number to specified decimal places.
 * 
 * @param value - Value to round
 * @param decimals - Number of decimal places (default: 0)
 * @returns Rounded number
 * 
 * @example
 * ```typescript
 * import { roundTo } from '@aivo/common-types/validation';
 * roundTo(3.14159, 2); // 3.14
 * roundTo(3.5, 0); // 4
 * roundTo(3.14159); // 3
 * ```
 */
export function roundTo(value: number, decimals: number = 0): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Validate email address format.
 * 
 * @param email - Email string to validate
 * @returns True if valid email format
 * 
 * @example
 * ```typescript
 * import { isValidEmail } from '@aivo/common-types/validation';
 * isValidEmail('user@example.com'); // true
 * isValidEmail('not-an-email'); // false
 * ```
 */
export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format using regex pattern.
 * Note: This is a simple validation that checks basic URL format.
 * For full validation, use a proper URL parser in your application.
 * 
 * @param url - URL string to validate
 * @returns True if valid URL format
 * 
 * @example
 * ```typescript
 * import { isValidUrl } from '@aivo/common-types/validation';
 * isValidUrl('https://example.com'); // true
 * isValidUrl('not-a-url'); // false
 * ```
 */
export function isValidUrl(url: string): boolean {
  if (typeof url !== 'string') return false;
  // Basic URL pattern that matches http/https URLs
  const urlRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
  return urlRegex.test(url);
}

/**
 * Validate that a string is within length bounds.
 * 
 * @param value - String to validate
 * @param minLength - Minimum length (default: 0)
 * @param maxLength - Maximum length (default: Infinity)
 * @returns True if within bounds
 */
export function isValidLength(
  value: string,
  minLength: number = 0,
  maxLength: number = Infinity
): boolean {
  if (typeof value !== 'string') return false;
  return value.length >= minLength && value.length <= maxLength;
}

/**
 * Safe JSON parse with default fallback.
 * 
 * @param json - JSON string to parse
 * @param fallback - Default value if parsing fails
 * @returns Parsed object or fallback
 * 
 * @example
 * ```typescript
 * import { safeJsonParse } from '@aivo/common-types/validation';
 * safeJsonParse('{"key": "value"}', {}); // { key: "value" }
 * safeJsonParse('invalid json', {}); // {}
 * ```
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Validate ISO date string format (YYYY-MM-DD).
 * 
 * @param dateStr - Date string to validate
 * @returns True if valid ISO date format
 */
export function isValidDateString(dateStr: string): boolean {
  if (typeof dateStr !== 'string') return false;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return false;
  
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Validate numeric range.
 * 
 * @param value - Value to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns True if within range and is a number
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return isFiniteNumber(value) && value >= min && value <= max;
}
