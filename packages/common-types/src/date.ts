/**
 * Date Utilities
 * 
 * Provides common date formatting and manipulation functions
 * used across AIVO services.
 * 
 * @module @repo/common-types/date
 */

// Time constants in milliseconds
export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = MS_PER_SECOND * 60;
export const MS_PER_HOUR = MS_PER_MINUTE * 60;
export const MS_PER_DAY = MS_PER_HOUR * 24;

/**
 * Get current timestamp in milliseconds.
 * Uses Date.now() for consistency across environments.
 * 
 * @returns {number} Current timestamp in milliseconds
 */
export function getTimestamp(): number {
  return Date.now();
}

/**
 * Format a date to ISO string (YYYY-MM-DD).
 * 
 * @param date - Date object or timestamp
 * @returns Formatted date string (YYYY-MM-DD)
 * 
 * @example
 * ```typescript
 * import { formatDate } from '@repo/common-types/date';
 * formatDate(new Date()); // '2026-08-31'
 * formatDate(1725067200000); // '2026-08-31'
 * ```
 */
export function formatDate(date: Date | number): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * Parse a date string (YYYY-MM-DD) to timestamp.
 * 
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Timestamp in milliseconds, or NaN if invalid
 * 
 * @example
 * ```typescript
 * import { parseDate } from '@repo/common-types/date';
 * parseDate('2026-08-31'); // 1725067200000
 * ```
 */
export function parseDate(dateStr: string): number {
  return new Date(dateStr).getTime();
}

/**
 * Get the start of day (midnight) for a given date.
 * 
 * @param date - Date object or timestamp
 * @returns Timestamp of midnight on that day
 */
export function startOfDay(date: Date | number): number {
  const d = typeof date === 'number' ? new Date(date) : date;
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Get the end of day (23:59:59.999) for a given date.
 * 
 * @param date - Date object or timestamp
 * @returns Timestamp of end of day
 */
export function endOfDay(date: Date | number): number {
  const d = typeof date === 'number' ? new Date(date) : date;
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/**
 * Get date range for common periods.
 * 
 * @param period - 'day' | 'week' | 'month' | 'quarter'
 * @returns Object with startDate and endDate timestamps
 * 
 * @example
 * ```typescript
 * import { getDateRange } from '@repo/common-types/date';
 * const { startDate, endDate } = getDateRange('week');
 * ```
 */
export function getDateRange(period: 'day' | 'week' | 'month' | 'quarter'): {
  startDate: number;
  endDate: number;
} {
  const endDate = Date.now();
  let startDate: number;
  
  switch (period) {
    case 'day':
      startDate = endDate - MS_PER_DAY;
      break;
    case 'week':
      startDate = endDate - 7 * MS_PER_DAY;
      break;
    case 'month':
      startDate = endDate - 30 * MS_PER_DAY;
      break;
    case 'quarter':
      startDate = endDate - 90 * MS_PER_DAY;
      break;
    default:
      startDate = endDate - 7 * MS_PER_DAY;
  }
  
  return { startDate, endDate };
}

/**
 * Get timezone offset in hours from UTC.
 * 
 * @param timezone - IANA timezone string (e.g., 'America/New_York')
 * @returns Offset in hours (e.g., -5 for EST)
 */
export function getTimezoneOffset(timezone: string): number {
  try {
    const now = new Date();
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    return (utcDate.getTime() - tzDate.getTime()) / MS_PER_HOUR;
  } catch {
    return 0;
  }
}
