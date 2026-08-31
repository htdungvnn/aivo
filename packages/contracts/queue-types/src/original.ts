/**
 * Original Queue Types
 * 
 * This file re-exports the original queue-types implementation
 * for backward compatibility. New code should use the events module.
 * 
 * @deprecated Use events.ts for new domain event implementations
 */

import { z } from 'zod';

// Schema version for future-proofing
export const SCHEMA_VERSION = 1 as const;

// Supported locales
export const SUPPORTED_LOCALES = ['en', 'vi'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

// =============================================================================
// Auth Queue Messages
// =============================================================================

// Auth message types
export const AUTH_MESSAGE_TYPES = ['auth.email_verification_code'] as const;
export type AuthMessageType = (typeof AUTH_MESSAGE_TYPES)[number];

// Recipient schema
export const recipientSchema = z.object({
  email: z.string().email(),
  displayName: z.string().max(100).optional(),
});

// Email verification data schema
export const emailVerificationDataSchema = z.object({
  verificationCode: z.string().length(6).regex(/^\d{6}$/),
  expiresInMinutes: z.number().int().min(1).max(60).default(10),
});

// Queue message metadata schema
export const metadataSchema = z.object({
  userId: z.string().uuid(),
  correlationId: z.string().uuid(),
});

// Auth queue message schema
export const authQueueMessageSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  messageId: z.string().uuid(),
  type: z.enum(AUTH_MESSAGE_TYPES),
  occurredAt: z.string().datetime({ offset: true }),
  recipient: recipientSchema,
  locale: z.enum(SUPPORTED_LOCALES).default('en'),
  data: emailVerificationDataSchema,
  metadata: metadataSchema,
});

/**
 * Email verification queue message
 */
export type EmailVerificationQueueMessage = z.infer<typeof authQueueMessageSchema>;

// =============================================================================
// Health Report Queue Messages
// =============================================================================

// Health report message types
export const REPORT_MESSAGE_TYPES = [
  'health.weekly_report_ready',
  'health.monthly_report_ready',
  'health.custom_report_ready',
] as const;
export type ReportMessageType = (typeof REPORT_MESSAGE_TYPES)[number];

// Report email data schema
export const reportEmailDataSchema = z.object({
  reportId: z.string().uuid(),
  reportType: z.enum(['weekly', 'monthly', 'custom']),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  downloadUrl: z.string().url(),
  expiresAt: z.number().int(),
  dataCompleteness: z.enum(['full', 'partial', 'minimal']),
});

// Report queue message schema
export const reportQueueMessageSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  messageId: z.string().uuid(),
  type: z.enum(REPORT_MESSAGE_TYPES),
  occurredAt: z.string().datetime({ offset: true }),
  recipient: recipientSchema,
  locale: z.enum(SUPPORTED_LOCALES).default('en'),
  data: reportEmailDataSchema,
  metadata: metadataSchema,
});

/**
 * Health report ready queue message
 */
export type ReportReadyQueueMessage = z.infer<typeof reportQueueMessageSchema>;

// =============================================================================
// Union Types
// =============================================================================

/**
 * Combined queue message type
 */
export const queueMessageSchema = z.union([authQueueMessageSchema, reportQueueMessageSchema]);
export type QueueMessage = z.infer<typeof queueMessageSchema>;

// Message type guards
export function isQueueMessage(value: unknown): value is QueueMessage {
  return queueMessageSchema.safeParse(value).success;
}

export function isEmailVerificationMessage(msg: unknown): msg is EmailVerificationQueueMessage {
  return (
    authQueueMessageSchema.safeParse(msg).success &&
    (msg as EmailVerificationQueueMessage).type === 'auth.email_verification_code'
  );
}

export function isReportReadyMessage(msg: unknown): msg is ReportReadyQueueMessage {
  return (
    reportQueueMessageSchema.safeParse(msg).success &&
    REPORT_MESSAGE_TYPES.includes((msg as ReportReadyQueueMessage).type)
  );
}

// =============================================================================
// Queue Constants
// =============================================================================

export const QUEUE_NAMES = {
  // Auth queues
  AUTH_PRIMARY: 'aivo-email-queue',
  AUTH_DEAD_LETTER: 'aivo-email-dlq',
  // Report queues
  REPORT_DELIVER: 'aivo-health-report-deliver-queue',
  REPORT_DEAD_LETTER: 'aivo-health-report-dlq',
} as const;

export const BINDING_NAMES = {
  EMAIL_QUEUE: 'EMAIL_QUEUE',
  EMAIL_DLQ: 'EMAIL_DLQ',
  REPORT_QUEUE: 'REPORT_QUEUE',
  REPORT_DLQ: 'REPORT_DLQ',
} as const;

// =============================================================================
// Message Creators
// =============================================================================

/**
 * Create a typed email verification queue message
 */
export function createEmailVerificationMessage(params: {
  messageId: string;
  recipient: {
    email: string;
    displayName?: string;
  };
  locale: SupportedLocale;
  verificationCode: string;
  expiresInMinutes: number;
  userId: string;
}): EmailVerificationQueueMessage {
  return {
    schemaVersion: SCHEMA_VERSION,
    messageId: params.messageId,
    type: 'auth.email_verification_code',
    occurredAt: new Date().toISOString(),
    recipient: {
      email: params.recipient.email,
      displayName: params.recipient.displayName,
    },
    locale: params.locale,
    data: {
      verificationCode: params.verificationCode,
      expiresInMinutes: params.expiresInMinutes,
    },
    metadata: {
      userId: params.userId,
      correlationId: crypto.randomUUID(),
    },
  };
}

/**
 * Create a health report ready queue message
 */
export function createReportReadyMessage(params: {
  messageId: string;
  recipient: {
    email: string;
    displayName?: string;
  };
  locale: SupportedLocale;
  reportId: string;
  reportType: 'weekly' | 'monthly' | 'custom';
  periodStart: string;
  periodEnd: string;
  downloadUrl: string;
  expiresAt: number;
  dataCompleteness: 'full' | 'partial' | 'minimal';
  userId: string;
}): ReportReadyQueueMessage {
  const typeMap = {
    weekly: 'health.weekly_report_ready',
    monthly: 'health.monthly_report_ready',
    custom: 'health.custom_report_ready',
  } as const;

  return {
    schemaVersion: SCHEMA_VERSION,
    messageId: params.messageId,
    type: typeMap[params.reportType],
    occurredAt: new Date().toISOString(),
    recipient: {
      email: params.recipient.email,
      displayName: params.recipient.displayName,
    },
    locale: params.locale,
    data: {
      reportId: params.reportId,
      reportType: params.reportType,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      downloadUrl: params.downloadUrl,
      expiresAt: params.expiresAt,
      dataCompleteness: params.dataCompleteness,
    },
    metadata: {
      userId: params.userId,
      correlationId: crypto.randomUUID(),
    },
  };
}
