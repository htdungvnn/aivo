/**
 * AIVO Health Report Types
 * Shared type definitions for Health Report generation system
 * Used by: Health Worker, Queue Consumer, Mobile App, Web App
 */

import { z } from 'zod';

// =============================================================================
// Schema Version
// =============================================================================

/**
 * Schema version for version tracking
 */
export const SCHEMA_VERSION = 1 as const;

/**
 * Report schema version for report content
 */
export const REPORT_CONTENT_VERSION = '1.0.0' as const;

// =============================================================================
// Constants
// =============================================================================

/**
 * Supported locales
 */
export const SUPPORTED_LOCALES = ['en', 'vi'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Report frequencies
 */
export const REPORT_FREQUENCIES = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  CUSTOM: 'custom',
} as const;
export type ReportFrequency = (typeof REPORT_FREQUENCIES)[keyof typeof REPORT_FREQUENCIES];

/**
 * Report types
 */
export const REPORT_TYPES = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  CUSTOM: 'custom',
} as const;
export type ReportType = (typeof REPORT_TYPES)[keyof typeof REPORT_TYPES];

/**
 * Report status state machine
 */
export const REPORT_STATUS = {
  PENDING: 'pending',
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const;
export type ReportStatus = (typeof REPORT_STATUS)[keyof typeof REPORT_STATUS];

/**
 * Schedule status
 */
export const SCHEDULE_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  DELETED: 'deleted',
} as const;
export type ScheduleStatus = (typeof SCHEDULE_STATUS)[keyof typeof SCHEDULE_STATUS];

/**
 * Delivery days
 */
export const DELIVERY_DAYS = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 0,
} as const;
export type DeliveryDay = (typeof DELIVERY_DAYS)[keyof typeof DELIVERY_DAYS];

// =============================================================================
// Report Data Completeness
// =============================================================================

/**
 * Data completeness levels
 */
export const DATA_COMPLETENESS = {
  FULL: 'full',
  PARTIAL: 'partial',
  MINIMAL: 'minimal',
} as const;
export type DataCompleteness = (typeof DATA_COMPLETENESS)[keyof typeof DATA_COMPLETENESS];

// =============================================================================
// Queue Contracts
// =============================================================================

/**
 * Queue names
 */
export const QUEUE_NAMES = {
  REPORT_GENERATE: 'aivo-health-report-queue',
  REPORT_DELIVER: 'aivo-health-report-deliver-queue',
  REPORT_DELETE: 'aivo-health-report-delete-queue',
  DEAD_LETTER: 'aivo-health-report-dlq',
} as const;

/**
 * Queue binding names
 */
export const QUEUE_BINDINGS = {
  REPORT_QUEUE: 'REPORT_QUEUE',
  REPORT_DLQ: 'REPORT_DLQ',
  DELIVER_QUEUE: 'DELIVER_QUEUE',
} as const;

/**
 * Message types for report queue
 */
export const REPORT_MESSAGE_TYPES = {
  GENERATE: 'health.report.generate',
  DELIVER: 'health.report.deliver',
  DELETE: 'health.report.delete',
} as const;
export type ReportMessageType = (typeof REPORT_MESSAGE_TYPES)[keyof typeof REPORT_MESSAGE_TYPES];

// =============================================================================
// Report Schedule
// =============================================================================

/**
 * Report schedule entity
 */
export interface ReportSchedule {
  id: string;
  userId: string;
  frequency: ReportFrequency;
  timezone: string;
  deliveryDay: DeliveryDay | null;
  deliveryTime: string; // HH:MM format
  locale: SupportedLocale;
  emailEnabled: boolean;
  status: ScheduleStatus;
  nextRunAt: number | null; // Unix timestamp
  lastRunAt: number | null;
  createdAt: number;
  updatedAt: number;
}

/**
 * Create report schedule request
 */
export interface CreateScheduleRequest {
  frequency: ReportFrequency;
  timezone: string;
  deliveryDay?: DeliveryDay;
  deliveryTime: string;
  locale?: SupportedLocale;
  emailEnabled?: boolean;
}

/**
 * Update report schedule request
 */
export interface UpdateScheduleRequest {
  frequency?: ReportFrequency;
  timezone?: string;
  deliveryDay?: DeliveryDay | null;
  deliveryTime?: string;
  locale?: SupportedLocale;
  emailEnabled?: boolean;
}

/**
 * Report schedule response
 */
export interface ScheduleResponse {
  id: string;
  frequency: ReportFrequency;
  timezone: string;
  deliveryDay: DeliveryDay | null;
  deliveryTime: string;
  locale: SupportedLocale;
  emailEnabled: boolean;
  status: ScheduleStatus;
  nextRunAt: number | null;
  lastRunAt: number | null;
  createdAt: number;
}

// =============================================================================
// Report Job
// =============================================================================

/**
 * Report job entity
 */
export interface ReportJob {
  id: string;
  userId: string;
  scheduleId: string | null;
  reportType: ReportType;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  timezone: string;
  locale: SupportedLocale;
  status: ReportStatus;
  idempotencyKey: string;
  attemptCount: number;
  errorCategory: string | null;
  startedAt: number | null;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

/**
 * Create report job request
 */
export interface CreateReportRequest {
  reportType: ReportType;
  periodStart: string;
  periodEnd: string;
  timezone?: string;
  locale?: SupportedLocale;
}

/**
 * Report job response
 */
export interface ReportJobResponse {
  id: string;
  reportType: ReportType;
  periodStart: string;
  periodEnd: string;
  status: ReportStatus;
  attemptCount: number;
  errorCategory: string | null;
  startedAt: number | null;
  completedAt: number | null;
  createdAt: number;
}

// =============================================================================
// Report Metadata
// =============================================================================

/**
 * Report entity (metadata only)
 */
export interface HealthReport {
  id: string;
  userId: string;
  jobId: string;
  reportVersion: string;
  fileName: string;
  r2ObjectKey: string;
  fileSize: number;
  contentType: string;
  checksum: string | null;
  dataCompleteness: DataCompleteness;
  generatedAt: number;
  expiresAt: number;
  deletedAt: number | null;
}

/**
 * Report list response
 */
export interface ReportListItem {
  id: string;
  reportType: ReportType;
  periodStart: string;
  periodEnd: string;
  dataCompleteness: DataCompleteness;
  generatedAt: number;
  expiresAt: number;
  status: ReportStatus;
}

/**
 * Report details response
 */
export interface ReportDetailsResponse {
  id: string;
  reportType: ReportType;
  periodStart: string;
  periodEnd: string;
  locale: SupportedLocale;
  fileName: string;
  fileSize: number;
  dataCompleteness: DataCompleteness;
  generatedAt: number;
  expiresAt: number;
  status: ReportStatus;
}

/**
 * Download URL response
 */
export interface DownloadUrlResponse {
  downloadUrl: string;
  expiresAt: number;
  fileName: string;
}

// =============================================================================
// Report Generation Queue Messages
// =============================================================================

/**
 * Report generation task - minimal payload for queue
 */
export interface ReportGenerateTask {
  schemaVersion: typeof SCHEMA_VERSION;
  messageId: string;
  reportJobId: string;
  userId: string;
  correlationId: string;
  occurredAt: string; // ISO datetime
}

/**
 * Report delivery task
 */
export interface ReportDeliverTask {
  schemaVersion: typeof SCHEMA_VERSION;
  messageId: string;
  reportId: string;
  userId: string;
  reportType: ReportType;
  periodStart: string;
  periodEnd: string;
  locale: SupportedLocale;
  emailEnabled: boolean;
  correlationId: string;
  occurredAt: string;
}

/**
 * Report delete task
 */
export interface ReportDeleteTask {
  schemaVersion: typeof SCHEMA_VERSION;
  messageId: string;
  reportId: string;
  userId: string;
  correlationId: string;
  occurredAt: string;
}

// =============================================================================
// Zod Schemas for Validation
// =============================================================================

/**
 * Report schedule Zod schema
 */
export const reportScheduleSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  frequency: z.enum(['weekly', 'monthly', 'custom']),
  timezone: z.string().min(1),
  deliveryDay: z.number().int().min(0).max(6).nullable(),
  deliveryTime: z.string().regex(/^\d{2}:\d{2}$/),
  locale: z.enum(['en', 'vi']),
  emailEnabled: z.boolean(),
  status: z.enum(['active', 'paused', 'deleted']),
  nextRunAt: z.number().int().nullable(),
  lastRunAt: z.number().int().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

/**
 * Create schedule request schema
 */
export const createScheduleRequestSchema = z.object({
  frequency: z.enum(['weekly', 'monthly', 'custom']),
  timezone: z.string().min(1),
  deliveryDay: z.number().int().min(0).max(6).optional(),
  deliveryTime: z.string().regex(/^\d{2}:\d{2}$/),
  locale: z.enum(['en', 'vi']).optional(),
  emailEnabled: z.boolean().optional(),
});

/**
 * Update schedule request schema
 */
export const updateScheduleRequestSchema = z.object({
  frequency: z.enum(['weekly', 'monthly', 'custom']).optional(),
  timezone: z.string().min(1).optional(),
  deliveryDay: z.number().int().min(0).max(6).nullable().optional(),
  deliveryTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  locale: z.enum(['en', 'vi']).optional(),
  emailEnabled: z.boolean().optional(),
});

/**
 * Create report request schema
 */
export const createReportRequestSchema = z.object({
  reportType: z.enum(['weekly', 'monthly', 'custom']),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().optional(),
  locale: z.enum(['en', 'vi']).optional(),
});

/**
 * Report generation task schema
 */
export const reportGenerateTaskSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  messageId: z.string().uuid(),
  reportJobId: z.string().uuid(),
  userId: z.string().uuid(),
  correlationId: z.string().uuid(),
  occurredAt: z.string().datetime(),
});

/**
 * Report deliver task schema
 */
export const reportDeliverTaskSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  messageId: z.string().uuid(),
  reportId: z.string().uuid(),
  userId: z.string().uuid(),
  reportType: z.enum(['weekly', 'monthly', 'custom']),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  locale: z.enum(['en', 'vi']),
  emailEnabled: z.boolean(),
  correlationId: z.string().uuid(),
  occurredAt: z.string().datetime(),
});

/**
 * Report delete task schema
 */
export const reportDeleteTaskSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  messageId: z.string().uuid(),
  reportId: z.string().uuid(),
  userId: z.string().uuid(),
  correlationId: z.string().uuid(),
  occurredAt: z.string().datetime(),
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a report generation task
 */
export function createReportGenerateTask(params: {
  reportJobId: string;
  userId: string;
}): ReportGenerateTask {
  return {
    schemaVersion: SCHEMA_VERSION,
    messageId: crypto.randomUUID(),
    reportJobId: params.reportJobId,
    userId: params.userId,
    correlationId: crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
  };
}

/**
 * Create a report delivery task
 */
export function createReportDeliverTask(params: {
  reportId: string;
  userId: string;
  reportType: ReportType;
  periodStart: string;
  periodEnd: string;
  locale: SupportedLocale;
  emailEnabled: boolean;
}): ReportDeliverTask {
  return {
    schemaVersion: SCHEMA_VERSION,
    messageId: crypto.randomUUID(),
    reportId: params.reportId,
    userId: params.userId,
    reportType: params.reportType,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    locale: params.locale,
    emailEnabled: params.emailEnabled,
    correlationId: crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
  };
}

/**
 * Create a report delete task
 */
export function createReportDeleteTask(params: {
  reportId: string;
  userId: string;
}): ReportDeleteTask {
  return {
    schemaVersion: SCHEMA_VERSION,
    messageId: crypto.randomUUID(),
    reportId: params.reportId,
    userId: params.userId,
    correlationId: crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
  };
}

/**
 * Generate idempotency key for report
 */
export function generateIdempotencyKey(
  userId: string,
  reportType: ReportType,
  periodStart: string,
  periodEnd: string
): string {
  return `${userId}:${reportType}:${periodStart}:${periodEnd}`;
}

/**
 * Calculate next run time for a schedule
 */
export function calculateNextRunTime(
  schedule: {
    frequency: ReportFrequency;
    deliveryDay: DeliveryDay | null;
    deliveryTime: string;
    timezone: string;
  },
  fromDate: Date = new Date()
): number {
  const [hours, minutes] = schedule.deliveryTime.split(':').map(Number);
  
  // Create a date in the user's timezone
  const userTzDate = new Date(fromDate.toLocaleString('en-US', { timeZone: schedule.timezone }));
  const year = userTzDate.getFullYear();
  const month = userTzDate.getMonth();
  const day = userTzDate.getDate();
  
  let nextRun: Date;
  
  if (schedule.frequency === 'weekly') {
    const targetDay = schedule.deliveryDay ?? 1; // Default to Monday
    
    // Get the next occurrence of target day
    let daysUntilTarget = (targetDay - userTzDate.getDay() + 7) % 7;
    if (daysUntilTarget === 0) {
      // Check if today's time has passed
      if (
        userTzDate.getHours() > hours ||
        (userTzDate.getHours() === hours && userTzDate.getMinutes() >= minutes)
      ) {
        daysUntilTarget = 7;
      }
    }
    
    const nextDate = new Date(year, month, day + daysUntilTarget, hours, minutes);
    nextRun = new Date(nextDate.toLocaleString('en-US', { timeZone: 'UTC' }));
  } else if (schedule.frequency === 'monthly') {
    // First day of next month
    const targetDay = schedule.deliveryDay ?? 1;
    let nextMonth = month + 1;
    let nextYear = year;
    
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    }
    
    // Handle months with fewer days
    const maxDay = new Date(nextYear, nextMonth + 1, 0).getDate();
    const actualDay = Math.min(targetDay, maxDay);
    
    nextRun = new Date(Date.UTC(nextYear, nextMonth, actualDay, hours, minutes));
  } else {
    // Custom - default to one week from now
    const nextDate = new Date(userTzDate);
    nextDate.setDate(nextDate.getDate() + 7);
    nextDate.setHours(hours, minutes, 0, 0);
    nextRun = new Date(nextDate.toLocaleString('en-US', { timeZone: 'UTC' }));
  }
  
  return nextRun.getTime();
}

/**
 * Calculate date range for a report type
 */
export function calculateReportDateRange(
  reportType: ReportType,
  referenceDate: Date = new Date(),
  timezone: string = 'UTC'
): { periodStart: string; periodEnd: string } {
  const refDate = new Date(referenceDate.toLocaleString('en-US', { timeZone: timezone }));
  const year = refDate.getFullYear();
  const month = refDate.getMonth();
  const day = refDate.getDate();
  
  let periodStart: Date;
  let periodEnd: Date;
  
  if (reportType === 'weekly') {
    // Previous week
    const dayOfWeek = refDate.getDay();
    const daysToSubtract = dayOfWeek + 7; // Go back to start of week (Sunday)
    
    periodEnd = new Date(year, month, day - dayOfWeek);
    periodStart = new Date(year, month, day - daysToSubtract);
  } else if (reportType === 'monthly') {
    // Previous month
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    
    const maxDay = new Date(year, month, 0).getDate();
    periodEnd = new Date(year, month, 0);
    periodStart = new Date(prevYear, prevMonth, 1);
  } else {
    // Custom - default to last 7 days
    periodEnd = new Date(year, month, day);
    periodStart = new Date(year, month, day - 6);
  }
  
  return {
    periodStart: periodStart.toISOString().split('T')[0] ?? periodStart.toISOString().substring(0, 10),
    periodEnd: periodEnd.toISOString().split('T')[0] ?? periodEnd.toISOString().substring(0, 10),
  };
}

/**
 * Validate date range
 */
export function isValidReportDateRange(periodStart: string, periodEnd: string): boolean {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return false;
  }
  
  if (start > end) {
    return false;
  }
  
  // Max range: 1 year
  const maxRangeMs = 365 * 24 * 60 * 60 * 1000;
  if (end.getTime() - start.getTime() > maxRangeMs) {
    return false;
  }
  
  return true;
}

/**
 * Get retention period in days
 */
export const REPORT_RETENTION_DAYS = 90 as const;

/**
 * Calculate expiration time
 */
export function calculateExpirationTime(generatedAt: number = Date.now()): number {
  return generatedAt + (REPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

// =============================================================================
// Privacy Notice
// =============================================================================

/**
 * Privacy notice for health reports
 */
export const REPORT_PRIVACY_NOTICE = {
  en: "AIVO Health Reports provide automated wellness summaries based on available data. They do not provide medical advice, diagnosis, or treatment.",
  vi: "Báo Cáo Sức Khỏe AIVO cung cấp tóm tắt sức khỏe tự động dựa trên dữ liệu hiện có. Chúng không cung cấp lời khuyên y tế, chẩn đoán hoặc điều trị.",
} as const;

/**
 * Report disclaimer
 */
export const REPORT_DISCLAIMER = {
  en: "This report is a wellness summary generated from your health and fitness data. The information provided is for informational purposes only and should not be considered medical advice. Always consult with a qualified healthcare professional before making any health-related decisions.",
  vi: "Báo cáo này là tóm tắt sức khỏe được tạo từ dữ liệu sức khỏe và thể chất của bạn. Thông tin được cung cấp chỉ nhằm mục đích thông tin và không nên được coi là lời khuyên y tế. Luôn tham khảo ý kiến của chuyên gia chăm sóc sức khỏe có trình độ trước khi đưa ra bất kỳ quyết định nào liên quan đến sức khỏe.",
} as const;

// =============================================================================
// Error Codes
// =============================================================================

/**
 * Report error codes
 */
export const REPORT_ERROR_CODES = {
  SCHEDULE_NOT_FOUND: 'SCHEDULE_NOT_FOUND',
  SCHEDULE_ALREADY_EXISTS: 'SCHEDULE_ALREADY_EXISTS',
  REPORT_NOT_FOUND: 'REPORT_NOT_FOUND',
  REPORT_JOB_NOT_FOUND: 'REPORT_JOB_NOT_FOUND',
  REPORT_JOB_FAILED: 'REPORT_JOB_FAILED',
  REPORT_GENERATION_FAILED: 'REPORT_GENERATION_FAILED',
  REPORT_EXPIRED: 'REPORT_EXPIRED',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
  INVALID_SCHEDULE_CONFIG: 'INVALID_SCHEDULE_CONFIG',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
export type ReportErrorCode = (typeof REPORT_ERROR_CODES)[keyof typeof REPORT_ERROR_CODES];
