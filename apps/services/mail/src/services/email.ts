/**
 * Email Service - Resend Integration
 * Sends transactional emails via Resend API
 */

import { Resend } from 'resend';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Error classification for retry decisions
 */
export class EmailServiceError extends Error {
  constructor(
    message: string,
    public readonly isRetryable: boolean,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'EmailServiceError';
  }
}

/**
 * Email Service using Resend
 */
export class EmailService {
  private resend: Resend;
  private fromAddress: string;
  private replyToAddress?: string;
  private enabled: boolean;

  constructor(params: {
    apiKey: string;
    fromAddress: string;
    replyToAddress?: string;
    enabled?: boolean;
  }) {
    this.resend = new Resend(params.apiKey);
    this.fromAddress = params.fromAddress;
    this.replyToAddress = params.replyToAddress;
    this.enabled = params.enabled ?? true;
  }

  /**
   * Send an email
   * Classifies errors as retryable or non-retryable
   */
  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.enabled) {
      console.log('Email sending is disabled. Skipping email send.');
      return {
        success: true,
        messageId: 'disabled-skip',
      };
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: options.from || this.fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo || this.replyToAddress,
      });

      if (error) {
        throw new EmailServiceError(
          error.message || 'Failed to send email',
          this.isRetryableError(error.name, error.statusCode ?? undefined),
          error.statusCode ?? undefined
        );
      }

      return {
        success: true,
        messageId: data?.id,
      };
    } catch (error) {
      if (error instanceof EmailServiceError) {
        throw error;
      }

      // Handle network errors, timeouts, etc.
      const message = error instanceof Error ? error.message : 'Unknown error';
      const isRetryable =
        error instanceof TypeError && message.includes('fetch') ||
        message.includes('timeout') ||
        message.includes('network');

      throw new EmailServiceError(message, isRetryable);
    }
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(name?: string, statusCode?: number): boolean {
    // Network errors and timeouts
    if (name === 'FetchError' || name === 'TimeoutError') {
      return true;
    }

    // HTTP status codes that are retryable
    if (statusCode) {
      // 429 Rate Limited
      if (statusCode === 429) return true;
      // 5xx Server errors
      if (statusCode >= 500 && statusCode < 600) return true;
      // 408 Request Timeout
      if (statusCode === 408) return true;
    }

    return false;
  }

  /**
   * Update configuration
   */
  updateConfig(params: {
    enabled?: boolean;
    fromAddress?: string;
    replyToAddress?: string;
  }): void {
    if (params.enabled !== undefined) {
      this.enabled = params.enabled;
    }
    if (params.fromAddress) {
      this.fromAddress = params.fromAddress;
    }
    if (params.replyToAddress !== undefined) {
      this.replyToAddress = params.replyToAddress;
    }
  }
}

/**
 * Create an email service instance
 */
export function createEmailService(params: {
  apiKey: string;
  fromAddress: string;
  replyToAddress?: string;
  enabled?: boolean;
}): EmailService {
  return new EmailService(params);
}
