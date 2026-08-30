/**
 * Shared Queue Message Types for AIVO Email System
 * Type-safe contract between Auth Worker and Mail Worker
 */

import { z } from 'zod';

// Schema version for future-proofing
export const SCHEMA_VERSION = 1 as const;

// Supported locales
export const SUPPORTED_LOCALES = ['en', 'vi'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

// Message types
export const MESSAGE_TYPES = ['auth.email_verification_code'] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

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

// Queue message schema - this defines the complete contract
export const queueMessageSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  messageId: z.string().uuid(),
  type: z.enum(MESSAGE_TYPES),
  occurredAt: z.string().datetime({ offset: true }),
  recipient: recipientSchema,
  locale: z.enum(SUPPORTED_LOCALES).default('en'),
  data: emailVerificationDataSchema,
  metadata: metadataSchema,
});

/**
 * Queue message type - represents a typed message to be sent via email
 */
export type QueueMessage = z.infer<typeof queueMessageSchema>;

/**
 * Email verification queue message - specialized type for verification emails
 */
export type EmailVerificationQueueMessage = Extract<QueueMessage, { type: 'auth.email_verification_code' }>;

// Message type guards
export function isQueueMessage(value: unknown): value is QueueMessage {
  return queueMessageSchema.safeParse(value).success;
}

export function isEmailVerificationMessage(msg: unknown): msg is EmailVerificationQueueMessage {
  return (
    queueMessageSchema.safeParse(msg).success &&
    (msg as QueueMessage).type === 'auth.email_verification_code'
  );
}

// Constants
export const QUEUE_NAMES = {
  PRIMARY: 'aivo-email-queue',
  DEAD_LETTER: 'aivo-email-dlq',
} as const;

export const BINDING_NAMES = {
  EMAIL_QUEUE: 'EMAIL_QUEUE',
  EMAIL_DLQ: 'EMAIL_DLQ',
} as const;

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
