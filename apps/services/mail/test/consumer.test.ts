/**
 * Tests for Queue Consumer Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createQueueConsumer,
  InMemoryDeduplicationStore,
  QueueConsumerService,
} from '../src/services/consumer';
import { createEmailService, EmailService, EmailServiceError } from '../src/services/email';
import type { EmailVerificationQueueMessage } from '@repo/queue-types';

// Mock queue interface
interface MockQueue {
  messages: EmailVerificationQueueMessage[];
  send: (messages: EmailVerificationQueueMessage[]) => Promise<{ failures: any[] }>;
}

// Create a valid test message
function createTestMessage(overrides: Partial<EmailVerificationQueueMessage> = {}): EmailVerificationQueueMessage {
  return {
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
    ...overrides,
  };
}

describe('Queue Consumer Service', () => {
  describe('InMemoryDeduplicationStore', () => {
    it('should track processed messages', async () => {
      const store = new InMemoryDeduplicationStore();
      const messageId = crypto.randomUUID();

      expect(await store.isProcessed(messageId)).toBe(false);
      await store.markProcessed(messageId);
      expect(await store.isProcessed(messageId)).toBe(true);
    });

    it('should clear all processed messages', async () => {
      const store = new InMemoryDeduplicationStore();
      const messageId = crypto.randomUUID();

      await store.markProcessed(messageId);
      store.clear();
      expect(await store.isProcessed(messageId)).toBe(false);
    });
  });

  describe('processBatch', () => {
    let mockQueue: MockQueue;
    let emailService: EmailService;
    let consumer: QueueConsumerService;

    beforeEach(() => {
      mockQueue = {
        messages: [],
        send: vi.fn().mockResolvedValue({ failures: [] }),
      };

      emailService = createEmailService({
        apiKey: 'test-api-key',
        fromAddress: 'test@example.com',
        enabled: true,
      });

      consumer = createQueueConsumer({
        emailService,
        deduplicationStore: new InMemoryDeduplicationStore(),
        dlq: mockQueue as any,
        maxRetries: 3,
      });
    });

    it('should process valid messages successfully', async () => {
      const message = createTestMessage();
      const result = await consumer.processBatch([message]);

      expect(result.success).toBe(true);
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.processed).toBe(1);
    });

    it('should detect duplicate messages', async () => {
      const message = createTestMessage();
      
      // Process once
      await consumer.processBatch([message]);
      
      // Process again - should be treated as duplicate
      const result = await consumer.processBatch([message]);

      expect(result.success).toBe(true);
      expect(result.succeeded).toBe(1);
      expect(result.results[0].success).toBe(true);
    });

    it('should handle batch processing', async () => {
      const messages = [
        createTestMessage(),
        createTestMessage(),
        createTestMessage(),
      ];

      const result = await consumer.processBatch(messages);

      expect(result.processed).toBe(3);
      expect(result.succeeded).toBe(3);
    });

    it('should classify retryable errors', async () => {
      const message = createTestMessage();

      // Mock email service to throw retryable error
      const failingEmailService = {
        sendEmail: vi.fn().mockRejectedValue(
          new EmailServiceError('Network error', true)
        ),
      } as any;

      const failingConsumer = createQueueConsumer({
        emailService: failingEmailService,
        deduplicationStore: new InMemoryDeduplicationStore(),
        dlq: mockQueue as any,
        maxRetries: 3,
      });

      const result = await failingConsumer.processBatch([message]);

      expect(result.failed).toBe(1);
      const failedResult = result.results[0];
      expect(failedResult.isRetryable).toBe(true);
    });

    it('should classify non-retryable errors', async () => {
      const message = createTestMessage();

      // Mock email service to throw non-retryable error
      const failingEmailService = {
        sendEmail: vi.fn().mockRejectedValue(
          new EmailServiceError('Invalid recipient', false, 400)
        ),
      } as any;

      const failingConsumer = createQueueConsumer({
        emailService: failingEmailService,
        deduplicationStore: new InMemoryDeduplicationStore(),
        dlq: mockQueue as any,
        maxRetries: 3,
      });

      const result = await failingConsumer.processBatch([message]);

      expect(result.failed).toBe(1);
      const failedResult = result.results[0];
      expect(failedResult.isRetryable).toBe(false);
    });

    it('should send invalid schemas to DLQ', async () => {
      const invalidMessage = {
        schemaVersion: 1,
        messageId: crypto.randomUUID(),
        type: 'auth.email_verification_code',
        occurredAt: new Date().toISOString(),
        recipient: {
          email: 'not-an-email', // Invalid email
          displayName: 'Test',
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
      } as any;

      const result = await consumer.processBatch([invalidMessage]);

      expect(result.failed).toBe(1);
      expect(mockQueue.send).toHaveBeenCalled();
    });
  });
});
