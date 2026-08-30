/**
 * Tests for Email Templates
 */

import { describe, it, expect } from 'vitest';
import {
  generateEmailVerificationHtml,
  generateEmailVerificationText,
  getTemplateContent,
} from '../src/templates/email';

describe('Email Templates', () => {
  describe('generateEmailVerificationHtml', () => {
    const baseData = {
      verificationCode: '123456',
      expiresInMinutes: 10,
    };

    it('should generate valid HTML with English content', () => {
      const result = generateEmailVerificationHtml(baseData, 'en');

      expect(result.subject).toBe('Your AIVO Verification Code');
      expect(result.html).toContain('123456');
      expect(result.html).toContain('10 minutes');
      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('AIVO');
    });

    it('should generate valid HTML with Vietnamese content', () => {
      const result = generateEmailVerificationHtml(baseData, 'vi');

      expect(result.subject).toBe('Mã Xác Minh AIVO Của Bạn');
      expect(result.html).toContain('123456');
      expect(result.html).toContain('10 phút');
    });

    it('should include recipient name when provided', () => {
      const result = generateEmailVerificationHtml(
        { ...baseData, recipientName: 'John' },
        'en'
      );

      expect(result.html).toContain('Hello John,');
    });

    it('should escape HTML in recipient name', () => {
      const result = generateEmailVerificationHtml(
        { ...baseData, recipientName: '<script>alert("xss")</script>' },
        'en'
      );

      // Script tag should be escaped
      expect(result.html).toContain('&lt;script&gt;');
      expect(result.html).not.toContain('<script>alert');
    });

    it('should include all required security notices', () => {
      const result = generateEmailVerificationHtml(baseData, 'en');

      expect(result.html).toContain('do not share this code');
      expect(result.html).toContain("didn't request this code");
    });

    it('should be responsive for mobile', () => {
      const result = generateEmailVerificationHtml(baseData, 'en');

      expect(result.html).toContain('@media only screen and (max-width: 480px)');
    });
  });

  describe('generateEmailVerificationText', () => {
    const baseData = {
      verificationCode: '123456',
      expiresInMinutes: 10,
    };

    it('should generate plain text with English content', () => {
      const result = generateEmailVerificationText(baseData, 'en');

      expect(result).toContain('123456');
      expect(result).toContain('10 minutes');
      expect(result).toContain('AIVO');
    });

    it('should generate plain text with Vietnamese content', () => {
      const result = generateEmailVerificationText(baseData, 'vi');

      expect(result).toContain('123456');
      expect(result).toContain('10 phút');
    });

    it('should include recipient name when provided', () => {
      const result = generateEmailVerificationText(
        { ...baseData, recipientName: 'John' },
        'en'
      );

      expect(result).toContain('Hello John,');
    });
  });

  describe('getTemplateContent', () => {
    const baseData = {
      verificationCode: '123456',
      expiresInMinutes: 10,
    };

    it('should return subject, html, and text', () => {
      const result = getTemplateContent(
        'auth.email_verification_code',
        baseData,
        'en'
      );

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('html');
      expect(result).toHaveProperty('text');
    });

    it('should throw for unknown message types', () => {
      expect(() =>
        getTemplateContent('unknown.type' as any, baseData, 'en')
      ).toThrow('Unknown message type');
    });
  });
});
