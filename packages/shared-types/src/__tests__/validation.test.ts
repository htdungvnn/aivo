import { describe, it, expect } from '@jest/globals';
import { validateEmail, validatePhone, validateUrl, validateISO8601 } from '../validation';

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    it('validates correct email addresses', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.user@domain.co.uk')).toBe(true);
      expect(validateEmail('name+tag@example.org')).toBe(true);
      expect(validateEmail('user_name@example.com')).toBe(true);
    });

    it('rejects invalid email addresses', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('plaintext')).toBe(false);
      expect(validateEmail('missing@domain')).toBe(false);
      expect(validateEmail('@nodomain.com')).toBe(false);
      expect(validateEmail('user@.com')).toBe(false);
      expect(validateEmail('user name@example.com')).toBe(false);
      expect(validateEmail('user@@example.com')).toBe(false);
      expect(validateEmail('user@example.')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('validates correct phone numbers', () => {
      expect(validatePhone('+123456789012')).toBe(true);
      expect(validatePhone('1234567890')).toBe(true);
      expect(validatePhone('+1 234-567-8901')).toBe(true);
      expect(validatePhone('(123) 456-7890')).toBe(true);
      expect(validatePhone('123 456 7890')).toBe(true);
      expect(validatePhone('+44 20 7946 0958')).toBe(true);
    });

    it('rejects invalid phone numbers', () => {
      expect(validatePhone('')).toBe(false);
      expect(validatePhone('123')).toBe(false); // Too short
      expect(validatePhone('abcdefghij')).toBe(false);
      expect(validatePhone('123-abc-4567')).toBe(false);
      expect(validatePhone('+1 234 567')).toBe(false); // Too few digits
    });
  });

  describe('validateUrl', () => {
    it('validates correct URLs', () => {
      expect(validateUrl('https://example.com')).toBe(true);
      expect(validateUrl('http://localhost:3000')).toBe(true);
      expect(validateUrl('https://example.com/path?query=1')).toBe(true);
      expect(validateUrl('https://sub.domain.example.com')).toBe(true);
    });

    it('rejects invalid URLs', () => {
      expect(validateUrl('')).toBe(false);
      expect(validateUrl('not-a-url')).toBe(false);
      expect(validateUrl('example.com')).toBe(false); // Missing protocol
      expect(validateUrl('ftp://example.com')).toBe(true); // ftp is still valid URL
      expect(validateUrl('://missing-protocol.com')).toBe(false);
    });
  });

  describe('validateISO8601', () => {
    it('validates correct ISO 8601 strings', () => {
      expect(validateISO8601('2025-04-30T12:34:56Z')).toBe(true);
      expect(validateISO8601('2025-04-30T12:34:56.789Z')).toBe(true);
      expect(validateISO8601('2025-04-30T12:34:56+00:00')).toBe(true);
      expect(validateISO8601('2025-04-30')).toBe(true); // Date only is also valid
    });

    it('rejects invalid date strings', () => {
      expect(validateISO8601('')).toBe(false);
      expect(validateISO8601('not-a-date')).toBe(false);
      expect(validateISO8601('2025-13-01')).toBe(false); // Invalid month
      expect(validateISO8601('2025-04-32')).toBe(false); // Invalid day
    });

    it('accepts parseable date strings', () => {
      // Date.parse can handle various formats
      expect(validateISO8601('April 30, 2025')).toBe(true);
    });
  });
});
