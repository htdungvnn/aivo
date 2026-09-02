/**
 * Tests for Queue Message Schema Validation
 */

import { describe, it, expect } from 'vitest';
import {
  queueMessageSchema,
  createEmailVerificationMessage,
  isQueueMessage,
  isEmailVerificationMessage,
  SUPPORTED_LOCALES,
  AUTH_MESSAGE_TYPES,
  SCHEMA_VERSION,
} from '../src/index';

describe('Queue Message Schema', () => {
  describe('queueMessageSchema', () => {
    const validMessage = {
      schemaVersion: 1,
      messageId: crypto.randomUUID(),
      type: 'auth.email_verification_code',
      occurredAt: new Date().toISOString(),
      recipient: {
        email: 'test@example.com',
        displayName: 'Test User',
      },
      locale: 'en',
      data: {
        verificationCode: '123456',
        expiresInMinutes: 10,
      },
      metadata: {
        userId: crypto.randomUUID(),
        correlationId: crypto.randomUUID(),
      },
    };

    it('should validate a correct message', () => {
      const result = queueMessageSchema.safeParse(validMessage);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.schemaVersion).toBe(1);
        expect(result.data.type).toBe('auth.email_verification_code');
      }
    });

    it('should reject invalid email in recipient', () => {
      const invalidMessage = {
        ...validMessage,
        recipient: {
          email: 'not-an-email',
        },
      };

      const result = queueMessageSchema.safeParse(invalidMessage);
      
      expect(result.success).toBe(false);
    });

    it('should reject invalid verification code format', () => {
      const invalidMessage = {
        ...validMessage,
        data: {
          verificationCode: '12345', // Only 5 digits
          expiresInMinutes: 10,
        },
      };

      const result = queueMessageSchema.safeParse(invalidMessage);
      
      expect(result.success).toBe(false);
    });

    it('should reject non-numeric verification code', () => {
      const invalidMessage = {
        ...validMessage,
        data: {
          verificationCode: 'abcdef',
          expiresInMinutes: 10,
        },
      };

      const result = queueMessageSchema.safeParse(invalidMessage);
      
      expect(result.success).toBe(false);
    });

    it('should reject invalid locale', () => {
      const invalidMessage = {
        ...validMessage,
        locale: 'fr', // Not supported
      };

      const result = queueMessageSchema.safeParse(invalidMessage);
      
      expect(result.success).toBe(false);
    });

    it('should reject invalid schema version', () => {
      const invalidMessage = {
        ...validMessage,
        schemaVersion: 2, // Wrong version
      };

      const result = queueMessageSchema.safeParse(invalidMessage);
      
      expect(result.success).toBe(false);
    });

    it('should reject invalid message type', () => {
      const invalidMessage = {
        ...validMessage,
        type: 'unknown.type',
      };

      const result = queueMessageSchema.safeParse(invalidMessage);
      
      expect(result.success).toBe(false);
    });

    it('should accept optional displayName', () => {
      const messageWithoutDisplayName = {
        ...validMessage,
        recipient: {
          email: 'test@example.com',
        },
      };

      const result = queueMessageSchema.safeParse(messageWithoutDisplayName);
      
      expect(result.success).toBe(true);
    });

    it('should validate expiresInMinutes within range', () => {
      const message = {
        ...validMessage,
        data: {
          verificationCode: '123456',
          expiresInMinutes: 5,
        },
      };

      const result = queueMessageSchema.safeParse(message);
      
      expect(result.success).toBe(true);
    });

    it('should reject expiresInMinutes below minimum', () => {
      const invalidMessage = {
        ...validMessage,
        data: {
          verificationCode: '123456',
          expiresInMinutes: 0,
        },
      };

      const result = queueMessageSchema.safeParse(invalidMessage);
      
      expect(result.success).toBe(false);
    });

    it('should reject expiresInMinutes above maximum', () => {
      const invalidMessage = {
        ...validMessage,
        data: {
          verificationCode: '123456',
          expiresInMinutes: 120, // 2 hours - too long
        },
      };

      const result = queueMessageSchema.safeParse(invalidMessage);
      
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID for messageId', () => {
      const invalidMessage = {
        ...validMessage,
        messageId: 'not-a-uuid',
      };

      const result = queueMessageSchema.safeParse(invalidMessage);
      
      expect(result.success).toBe(false);
    });

    it('should reject invalid datetime for occurredAt', () => {
      const invalidMessage = {
        ...validMessage,
        occurredAt: 'not-a-datetime',
      };

      const result = queueMessageSchema.safeParse(invalidMessage);
      
      expect(result.success).toBe(false);
    });
  });

  describe('createEmailVerificationMessage', () => {
    it('should create a valid message', () => {
      const message = createEmailVerificationMessage({
        messageId: crypto.randomUUID(),
        recipient: {
          email: 'test@example.com',
          displayName: 'Test User',
        },
        locale: 'en',
        verificationCode: '123456',
        expiresInMinutes: 10,
        userId: crypto.randomUUID(),
      });

      expect(message.schemaVersion).toBe(1);
      expect(message.type).toBe('auth.email_verification_code');
      expect(message.recipient.email).toBe('test@example.com');
      expect(message.data.verificationCode).toBe('123456');
    });

    it('should create message with en locale', () => {
      const message = createEmailVerificationMessage({
        messageId: crypto.randomUUID(),
        recipient: { email: 'test@example.com' },
        locale: 'en',
        verificationCode: '123456',
        expiresInMinutes: 10,
        userId: crypto.randomUUID(),
      });

      expect(message.locale).toBe('en');
    });

    it('should generate correlationId automatically', () => {
      const message = createEmailVerificationMessage({
        messageId: crypto.randomUUID(),
        recipient: { email: 'test@example.com' },
        verificationCode: '123456',
        expiresInMinutes: 10,
        userId: crypto.randomUUID(),
      });

      expect(message.metadata.correlationId).toBeDefined();
      expect(message.metadata.correlationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });
  });

  describe('isQueueMessage', () => {
    it('should return true for valid message', () => {
      const message = createEmailVerificationMessage({
        messageId: crypto.randomUUID(),
        recipient: { email: 'test@example.com' },
        verificationCode: '123456',
        expiresInMinutes: 10,
        userId: crypto.randomUUID(),
      });

      expect(isQueueMessage(message)).toBe(true);
    });

    it('should return false for invalid message', () => {
      expect(isQueueMessage({ invalid: 'data' })).toBe(false);
    });

    it('should return false for null', () => {
      expect(isQueueMessage(null)).toBe(false);
    });
  });

  describe('isEmailVerificationMessage', () => {
    it('should return true for email verification type', () => {
      const message = createEmailVerificationMessage({
        messageId: crypto.randomUUID(),
        recipient: { email: 'test@example.com' },
        verificationCode: '123456',
        expiresInMinutes: 10,
        userId: crypto.randomUUID(),
      });

      expect(isEmailVerificationMessage(message)).toBe(true);
    });

    it('should return false for other message types', () => {
      const otherMessage = {
        schemaVersion: 1,
        messageId: crypto.randomUUID(),
        type: 'unknown.type',
        occurredAt: new Date().toISOString(),
        recipient: { email: 'test@example.com' },
        locale: 'en',
        data: {},
        metadata: { userId: crypto.randomUUID(), correlationId: crypto.randomUUID() },
      };

      expect(isEmailVerificationMessage(otherMessage)).toBe(false);
    });
  });

  describe('Constants', () => {
    it('should have correct schema version', () => {
      expect(SCHEMA_VERSION).toBe(1);
    });

    it('should have correct supported locales', () => {
      expect(SUPPORTED_LOCALES).toEqual(['en', 'vi']);
    });

    it('should have correct message types', () => {
      expect(AUTH_MESSAGE_TYPES).toEqual(['auth.email_verification_code']);
    });
  });
});
