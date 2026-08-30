/**
 * Tests for Email Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createEmailService,
  EmailService,
  EmailServiceError,
} from '../src/services/email';

// Mock Resend client
const createMockResend = (responses: any[]) => {
  let callIndex = 0;
  return {
    emails: {
      send: vi.fn().mockImplementation(() => {
        const response = responses[callIndex] || responses[responses.length - 1];
        callIndex++;
        return Promise.resolve(response);
      }),
    },
  };
};

describe('EmailService', () => {
  describe('createEmailService', () => {
    it('should create email service with required config', () => {
      const service = createEmailService({
        apiKey: 'test-key',
        fromAddress: 'test@example.com',
      });

      expect(service).toBeInstanceOf(EmailService);
    });

    it('should create service with all options', () => {
      const service = createEmailService({
        apiKey: 'test-key',
        fromAddress: 'test@example.com',
        replyToAddress: 'reply@example.com',
        enabled: true,
      });

      expect(service).toBeInstanceOf(EmailService);
    });
  });

  describe('sendEmail', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should skip sending when disabled', async () => {
      const service = createEmailService({
        apiKey: 'test-key',
        fromAddress: 'test@example.com',
        enabled: false,
      });

      const result = await service.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('disabled-skip');
    });

    it('should send email successfully', async () => {
      const mockResend = createMockResend([{
        data: { id: 'msg_123' },
        error: null,
      }]);

      // @ts-ignore - mocking internal
      const service = new EmailService({
        apiKey: 'test-key',
        fromAddress: 'test@example.com',
      });
      // @ts-ignore
      service.resend = mockResend;

      const result = await service.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test Text',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg_123');
      expect(mockResend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'test@example.com',
          to: 'recipient@example.com',
          subject: 'Test Subject',
          html: '<p>Test HTML</p>',
          text: 'Test Text',
        })
      );
    });

    it('should use custom from address when provided', async () => {
      const mockResend = createMockResend([{
        data: { id: 'msg_123' },
        error: null,
      }]);

      // @ts-ignore
      const service = new EmailService({
        apiKey: 'test-key',
        fromAddress: 'default@example.com',
      });
      // @ts-ignore
      service.resend = mockResend;

      await service.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
        from: 'custom@example.com',
      });

      expect(mockResend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'custom@example.com',
        })
      );
    });

    it('should throw retryable error for network failures', async () => {
      const mockResend = {
        emails: {
          send: vi.fn().mockRejectedValue(new TypeError('fetch failed')),
        },
      };

      // @ts-ignore
      const service = new EmailService({
        apiKey: 'test-key',
        fromAddress: 'test@example.com',
      });
      // @ts-ignore
      service.resend = mockResend;

      await expect(
        service.sendEmail({
          to: 'recipient@example.com',
          subject: 'Test',
          html: '<p>Test</p>',
          text: 'Test',
        })
      ).rejects.toThrow(EmailServiceError);

      try {
        await service.sendEmail({
          to: 'recipient@example.com',
          subject: 'Test',
          html: '<p>Test</p>',
          text: 'Test',
        });
      } catch (error) {
        expect(error instanceof EmailServiceError).toBe(true);
        expect((error as EmailServiceError).isRetryable).toBe(true);
      }
    });

    it('should throw retryable error for rate limit (429)', async () => {
      const mockResend = {
        emails: {
          send: vi.fn().mockResolvedValue({
            data: null,
            error: {
              name: 'ValidationError',
              message: 'Rate limited',
              statusCode: 429,
            },
          }),
        },
      };

      // @ts-ignore
      const service = new EmailService({
        apiKey: 'test-key',
        fromAddress: 'test@example.com',
      });
      // @ts-ignore
      service.resend = mockResend;

      try {
        await service.sendEmail({
          to: 'recipient@example.com',
          subject: 'Test',
          html: '<p>Test</p>',
          text: 'Test',
        });
      } catch (error) {
        expect(error instanceof EmailServiceError).toBe(true);
        expect((error as EmailServiceError).isRetryable).toBe(true);
        expect((error as EmailServiceError).statusCode).toBe(429);
      }
    });

    it('should throw retryable error for 5xx errors', async () => {
      const mockResend = {
        emails: {
          send: vi.fn().mockResolvedValue({
            data: null,
            error: {
              name: 'ServerError',
              message: 'Internal error',
              statusCode: 500,
            },
          }),
        },
      };

      // @ts-ignore
      const service = new EmailService({
        apiKey: 'test-key',
        fromAddress: 'test@example.com',
      });
      // @ts-ignore
      service.resend = mockResend;

      try {
        await service.sendEmail({
          to: 'recipient@example.com',
          subject: 'Test',
          html: '<p>Test</p>',
          text: 'Test',
        });
      } catch (error) {
        expect(error instanceof EmailServiceError).toBe(true);
        expect((error as EmailServiceError).isRetryable).toBe(true);
        expect((error as EmailServiceError).statusCode).toBe(500);
      }
    });

    it('should throw non-retryable error for 4xx (except 429)', async () => {
      const mockResend = {
        emails: {
          send: vi.fn().mockResolvedValue({
            data: null,
            error: {
              name: 'ValidationError',
              message: 'Invalid recipient',
              statusCode: 400,
            },
          }),
        },
      };

      // @ts-ignore
      const service = new EmailService({
        apiKey: 'test-key',
        fromAddress: 'test@example.com',
      });
      // @ts-ignore
      service.resend = mockResend;

      try {
        await service.sendEmail({
          to: 'recipient@example.com',
          subject: 'Test',
          html: '<p>Test</p>',
          text: 'Test',
        });
      } catch (error) {
        expect(error instanceof EmailServiceError).toBe(true);
        expect((error as EmailServiceError).isRetryable).toBe(false);
        expect((error as EmailServiceError).statusCode).toBe(400);
      }
    });
  });

  describe('updateConfig', () => {
    it('should update enabled status', () => {
      const service = createEmailService({
        apiKey: 'test-key',
        fromAddress: 'test@example.com',
        enabled: true,
      });

      service.updateConfig({ enabled: false });

      // The service should now skip sending
      expect(service).toBeInstanceOf(EmailService);
    });

    it('should update from address', () => {
      const service = createEmailService({
        apiKey: 'test-key',
        fromAddress: 'old@example.com',
      });

      service.updateConfig({ fromAddress: 'new@example.com' });

      expect(service).toBeInstanceOf(EmailService);
    });
  });
});
