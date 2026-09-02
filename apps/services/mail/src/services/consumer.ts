/**
 * Queue Consumer Service
 * Handles batch processing of email Queue messages with:
 * - Schema validation using Zod
 * - Deduplication using messageId
 * - Retry classification
 * - Error handling
 */

import type { Queue } from '@cloudflare/workers-types';
import {
  queueMessageSchema,
  EmailVerificationQueueMessage,
  ReportReadyQueueMessage,
  isEmailVerificationMessage,
  isReportReadyMessage,
  BINDING_NAMES,
} from '@aivo/queue-types';
import { EmailService, EmailServiceError } from './email';
import { getTemplateContent, ReportReadyTemplateData } from '../templates/email';

export interface ProcessedMessage {
  messageId: string;
  success: boolean;
  error?: string;
  isRetryable: boolean;
  message: EmailVerificationQueueMessage | ReportReadyQueueMessage;
}

export interface QueueConsumerResult {
  success: boolean;
  processed: number;
  succeeded: number;
  failed: number;
  results: ProcessedMessage[];
}

/**
 * Deduplication store interface
 */
export interface DeduplicationStore {
  isProcessed(messageId: string): Promise<boolean>;
  markProcessed(messageId: string): Promise<void>;
}

/**
 * In-memory deduplication store
 */
export class InMemoryDeduplicationStore implements DeduplicationStore {
  private processed = new Set<string>();

  async isProcessed(messageId: string): Promise<boolean> {
    return this.processed.has(messageId);
  }

  async markProcessed(messageId: string): Promise<void> {
    this.processed.add(messageId);
  }

  clear(): void {
    this.processed.clear();
  }
}

/**
 * Queue Consumer Service
 */
export class QueueConsumerService {
  private emailService: EmailService;
  private deduplicationStore: DeduplicationStore;
  private dlq: Queue<EmailVerificationQueueMessage | ReportReadyQueueMessage>;
  private maxRetries: number;

  constructor(params: {
    emailService: EmailService;
    deduplicationStore?: DeduplicationStore;
    dlq: Queue<EmailVerificationQueueMessage | ReportReadyQueueMessage>;
    maxRetries?: number;
  }) {
    this.emailService = params.emailService;
    this.deduplicationStore = params.deduplicationStore || new InMemoryDeduplicationStore();
    this.dlq = params.dlq;
    this.maxRetries = params.maxRetries ?? 3;
  }

  /**
   * Process a batch of Queue messages
   */
  async processBatch(
    messages: (EmailVerificationQueueMessage | ReportReadyQueueMessage)[]
  ): Promise<QueueConsumerResult> {
    const results: ProcessedMessage[] = [];
    let succeeded = 0;
    let failed = 0;

    // Process messages in parallel
    const processingPromises = messages.map((message) =>
      this.processMessage(message)
    );

    const processedResults = await Promise.all(processingPromises);

    for (const result of processedResults) {
      results.push(result);
      if (result.success) {
        succeeded++;
      } else {
        failed++;
      }
    }

    return {
      success: failed === 0,
      processed: messages.length,
      succeeded,
      failed,
      results,
    };
  }

  /**
   * Process a single message
   */
  private async processMessage(
    message: EmailVerificationQueueMessage | ReportReadyQueueMessage
  ): Promise<ProcessedMessage> {
    const messageId = message.messageId;

    try {
      // Check for duplicate
      const isDuplicate = await this.deduplicationStore.isProcessed(messageId);
      if (isDuplicate) {
        console.log(`Duplicate message detected: ${messageId}`);
        return {
          messageId,
          success: true,
          isRetryable: false,
          message,
        };
      }

      // Validate schema
      const validationResult = queueMessageSchema.safeParse(message);
      if (!validationResult.success) {
        console.error(`Invalid message schema for ${messageId}:`, validationResult.error.issues);
        
        // Send to DLQ for invalid schemas
        await this.sendToDLQ(message, 'Invalid schema');
        
        return {
          messageId,
          success: false,
          error: 'Invalid message schema',
          isRetryable: false,
          message,
        };
      }

      // Process based on message type
      await this.processByType(message);

      // Mark as processed
      await this.deduplicationStore.markProcessed(messageId);

      return {
        messageId,
        success: true,
        isRetryable: false,
        message,
      };
    } catch (error) {
      console.error(`Error processing message ${messageId}:`, error);

      if (error instanceof EmailServiceError) {
        if (error.isRetryable) {
          return {
            messageId,
            success: false,
            error: error.message,
            isRetryable: true,
            message,
          };
        }

        // Non-retryable error - send to DLQ
        await this.sendToDLQ(message, error.message);
      }

      return {
        messageId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        isRetryable: false,
        message,
      };
    }
  }

  /**
   * Process message based on type
   */
  private async processByType(message: EmailVerificationQueueMessage | ReportReadyQueueMessage): Promise<void> {
    if (isEmailVerificationMessage(message)) {
      await this.sendVerificationEmail(message);
    } else if (isReportReadyMessage(message)) {
      await this.sendReportReadyEmail(message);
    } else {
      throw new Error(`Unknown message type`);
    }
  }

  /**
   * Send email verification email
   */
  private async sendVerificationEmail(message: EmailVerificationQueueMessage): Promise<void> {
    const { recipient, locale, data } = message;

    const templateContent = getTemplateContent(
      message.type,
      {
        verificationCode: data.verificationCode,
        expiresInMinutes: data.expiresInMinutes,
        recipientName: recipient.displayName,
      },
      locale
    );

    const result = await this.emailService.sendEmail({
      to: recipient.email,
      subject: templateContent.subject,
      html: templateContent.html,
      text: templateContent.text,
    });

    if (!result.success) {
      throw new EmailServiceError(result.error || 'Failed to send email', true);
    }

    console.log(`Verification email sent: ${message.messageId}`);
  }

  /**
   * Send report ready email
   */
  private async sendReportReadyEmail(message: ReportReadyQueueMessage): Promise<void> {
    const { recipient, locale, data } = message;

    const templateData: ReportReadyTemplateData = {
      reportType: data.reportType,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      downloadUrl: data.downloadUrl,
      expiresAt: data.expiresAt,
      dataCompleteness: data.dataCompleteness,
      recipientName: recipient.displayName,
    };

    const templateContent = getTemplateContent(
      message.type,
      templateData,
      locale
    );

    const result = await this.emailService.sendEmail({
      to: recipient.email,
      subject: templateContent.subject,
      html: templateContent.html,
      text: templateContent.text,
    });

    if (!result.success) {
      throw new EmailServiceError(result.error || 'Failed to send email', true);
    }

    console.log(`Report ready email sent: ${message.messageId}`);
  }

  /**
   * Send failed message to Dead Letter Queue
   */
  private async sendToDLQ(
    message: EmailVerificationQueueMessage | ReportReadyQueueMessage,
    reason: string
  ): Promise<void> {
    try {
      // Cast to any to allow additional properties for DLQ tracking
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dlqMessage: any = { ...message };
      dlqMessage._dlqReason = reason;
      dlqMessage._dlqTimestamp = new Date().toISOString();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (this.dlq as any).send([dlqMessage]);
      
      // Log any failures (result is an array of failures or empty if successful)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyResult = result as any;
      if (anyResult?.failures?.length > 0) {
        console.error(`Failed to send message to DLQ: ${message.messageId}`, anyResult.failures);
      }
    } catch (error) {
      console.error(`Error sending to DLQ: ${error}`);
    }
  }

  /**
   * Retry failed messages
   */
  async retryMessages(
    messages: (EmailVerificationQueueMessage | ReportReadyQueueMessage)[],
    retryCount: number
  ): Promise<QueueConsumerResult> {
    const eligibleForRetry = messages.filter(() => retryCount < this.maxRetries);

    if (eligibleForRetry.length !== messages.length) {
      console.log(`Filtered out ${messages.length - eligibleForRetry.length} messages exceeding retry limit`);
    }

    return this.processBatch(eligibleForRetry);
  }
}

/**
 * Create queue consumer service
 */
export function createQueueConsumer(params: {
  emailService: EmailService;
  deduplicationStore?: DeduplicationStore;
  dlq: Queue<EmailVerificationQueueMessage | ReportReadyQueueMessage>;
  maxRetries?: number;
}): QueueConsumerService {
  return new QueueConsumerService(params);
}
