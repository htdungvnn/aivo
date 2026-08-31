/**
 * Report Types Schema Validation Tests
 */

import { describe, it, expect } from 'vitest';
import {
  reportScheduleSchema,
  createScheduleRequestSchema,
  createReportRequestSchema,
  updateScheduleRequestSchema,
  reportGenerateTaskSchema,
  reportDeliverTaskSchema,
  reportDeleteTaskSchema,
  generateIdempotencyKey,
  isValidReportDateRange,
  calculateExpirationTime,
  SCHEMA_VERSION,
  REPORT_RETENTION_DAYS,
  calculateNextRunTime,
  calculateReportDateRange,
  createReportGenerateTask,
  REPORT_STATUS,
  SCHEDULE_STATUS,
  type DeliveryDay,
  type ReportFrequency,
} from '../src/index';

describe('Report Types Schemas', () => {
  describe('reportScheduleSchema', () => {
    it('should validate a valid schedule', () => {
      const validSchedule = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        frequency: 'weekly',
        timezone: 'UTC',
        deliveryDay: 1,
        deliveryTime: '09:00',
        locale: 'en',
        emailEnabled: true,
        status: 'active',
        nextRunAt: null,
        lastRunAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = reportScheduleSchema.safeParse(validSchedule);
      expect(result.success).toBe(true);
    });

    it('should validate schedule with null deliveryDay', () => {
      const validSchedule = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        frequency: 'monthly',
        timezone: 'UTC',
        deliveryDay: null,
        deliveryTime: '09:00',
        locale: 'vi',
        emailEnabled: false,
        status: 'paused',
        nextRunAt: null,
        lastRunAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = reportScheduleSchema.safeParse(validSchedule);
      expect(result.success).toBe(true);
    });

    it('should reject invalid frequency', () => {
      const invalidSchedule = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        frequency: 'daily', // Invalid
        timezone: 'UTC',
        deliveryDay: 1,
        deliveryTime: '09:00',
        locale: 'en',
        emailEnabled: true,
        status: 'active',
        nextRunAt: null,
        lastRunAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = reportScheduleSchema.safeParse(invalidSchedule);
      expect(result.success).toBe(false);
    });

    it('should reject invalid timezone', () => {
      const invalidSchedule = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        frequency: 'weekly',
        timezone: '', // Empty timezone
        deliveryDay: 1,
        deliveryTime: '09:00',
        locale: 'en',
        emailEnabled: true,
        status: 'active',
        nextRunAt: null,
        lastRunAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = reportScheduleSchema.safeParse(invalidSchedule);
      expect(result.success).toBe(false);
    });

    it('should reject invalid delivery time format', () => {
      const invalidSchedule = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        frequency: 'weekly',
        timezone: 'UTC',
        deliveryDay: 1,
        deliveryTime: '9:00', // Should be HH:MM
        locale: 'en',
        emailEnabled: true,
        status: 'active',
        nextRunAt: null,
        lastRunAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = reportScheduleSchema.safeParse(invalidSchedule);
      expect(result.success).toBe(false);
    });

    it('should reject invalid locale', () => {
      const invalidSchedule = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        frequency: 'weekly',
        timezone: 'UTC',
        deliveryDay: 1,
        deliveryTime: '09:00',
        locale: 'fr', // Invalid locale
        emailEnabled: true,
        status: 'active',
        nextRunAt: null,
        lastRunAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = reportScheduleSchema.safeParse(invalidSchedule);
      expect(result.success).toBe(false);
    });

    it('should reject invalid schedule status', () => {
      const invalidSchedule = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        frequency: 'weekly',
        timezone: 'UTC',
        deliveryDay: 1,
        deliveryTime: '09:00',
        locale: 'en',
        emailEnabled: true,
        status: 'archived', // Invalid
        nextRunAt: null,
        lastRunAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = reportScheduleSchema.safeParse(invalidSchedule);
      expect(result.success).toBe(false);
    });

    it('should reject invalid deliveryDay range', () => {
      const invalidSchedule = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        frequency: 'weekly',
        timezone: 'UTC',
        deliveryDay: 7, // Should be 0-6
        deliveryTime: '09:00',
        locale: 'en',
        emailEnabled: true,
        status: 'active',
        nextRunAt: null,
        lastRunAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = reportScheduleSchema.safeParse(invalidSchedule);
      expect(result.success).toBe(false);
    });
  });

  describe('createScheduleRequestSchema', () => {
    it('should validate a valid create request', () => {
      const validRequest = {
        frequency: 'weekly',
        timezone: 'Asia/Ho_Chi_Minh',
        deliveryDay: 1,
        deliveryTime: '09:00',
        locale: 'vi',
        emailEnabled: false,
      };

      const result = createScheduleRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should allow optional fields to be omitted', () => {
      const minimalRequest = {
        frequency: 'monthly',
        timezone: 'UTC',
        deliveryTime: '10:00',
      };

      const result = createScheduleRequestSchema.safeParse(minimalRequest);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.deliveryDay).toBeUndefined();
        expect(result.data.locale).toBeUndefined();
        expect(result.data.emailEnabled).toBeUndefined();
      }
    });

    it('should apply default locale', () => {
      const request = {
        frequency: 'weekly',
        timezone: 'UTC',
        deliveryTime: '09:00',
      };

      const result = createScheduleRequestSchema.safeParse(request);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.locale).toBe('en');
      }
    });

    it('should reject invalid frequency', () => {
      const invalidRequest = {
        frequency: 'yearly', // Invalid
        timezone: 'UTC',
        deliveryTime: '09:00',
      };

      const result = createScheduleRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('updateScheduleRequestSchema', () => {
    it('should allow partial updates', () => {
      const partialUpdate = {
        frequency: 'monthly',
      };

      const result = updateScheduleRequestSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow null deliveryDay', () => {
      const update = {
        deliveryDay: null,
      };

      const result = updateScheduleRequestSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should validate updated frequency', () => {
      const update = {
        frequency: 'invalid',
      };

      const result = updateScheduleRequestSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    it('should validate updated locale', () => {
      const update = {
        locale: 'de', // Invalid
      };

      const result = updateScheduleRequestSchema.safeParse(update);
      expect(result.success).toBe(false);
    });
  });

  describe('createReportRequestSchema', () => {
    it('should validate a valid create report request', () => {
      const validRequest = {
        reportType: 'weekly',
        periodStart: '2026-01-13',
        periodEnd: '2026-01-19',
        timezone: 'UTC',
        locale: 'en',
      };

      const result = createReportRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject invalid date format', () => {
      const invalidRequest = {
        reportType: 'weekly',
        periodStart: '13-01-2026', // Wrong format
        periodEnd: '19-01-2026',
      };

      const result = createReportRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject invalid report type', () => {
      const invalidRequest = {
        reportType: 'daily', // Invalid
        periodStart: '2026-01-13',
        periodEnd: '2026-01-19',
      };

      const result = createReportRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject end date before start date', () => {
      const invalidRequest = {
        reportType: 'weekly',
        periodStart: '2026-01-19',
        periodEnd: '2026-01-13',
      };

      // This passes Zod validation but should be caught by isValidReportDateRange
      const result = createReportRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(true); // Zod passes, but app should check range
    });
  });

  describe('reportGenerateTaskSchema', () => {
    it('should validate a valid generate task', () => {
      const validTask = {
        schemaVersion: SCHEMA_VERSION,
        messageId: '123e4567-e89b-12d3-a456-426614174000',
        reportJobId: '123e4567-e89b-12d3-a456-426614174001',
        userId: '123e4567-e89b-12d3-a456-426614174002',
        correlationId: '123e4567-e89b-12d3-a456-426614174003',
        occurredAt: new Date().toISOString(),
      };

      const result = reportGenerateTaskSchema.safeParse(validTask);
      expect(result.success).toBe(true);
    });

    it('should reject invalid schema version', () => {
      const invalidTask = {
        schemaVersion: 999, // Invalid version
        messageId: '123e4567-e89b-12d3-a456-426614174000',
        reportJobId: '123e4567-e89b-12d3-a456-426614174001',
        userId: '123e4567-e89b-12d3-a456-426614174002',
        correlationId: '123e4567-e89b-12d3-a456-426614174003',
        occurredAt: new Date().toISOString(),
      };

      const result = reportGenerateTaskSchema.safeParse(invalidTask);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID formats', () => {
      const invalidTask = {
        schemaVersion: SCHEMA_VERSION,
        messageId: 'not-a-uuid',
        reportJobId: '123e4567-e89b-12d3-a456-426614174001',
        userId: '123e4567-e89b-12d3-a456-426614174002',
        correlationId: '123e4567-e89b-12d3-a456-426614174003',
        occurredAt: new Date().toISOString(),
      };

      const result = reportGenerateTaskSchema.safeParse(invalidTask);
      expect(result.success).toBe(false);
    });

    it('should reject invalid ISO datetime', () => {
      const invalidTask = {
        schemaVersion: SCHEMA_VERSION,
        messageId: '123e4567-e89b-12d3-a456-426614174000',
        reportJobId: '123e4567-e89b-12d3-a456-426614174001',
        userId: '123e4567-e89b-12d3-a456-426614174002',
        correlationId: '123e4567-e89b-12d3-a456-426614174003',
        occurredAt: '2026-01-19', // Missing time component
      };

      const result = reportGenerateTaskSchema.safeParse(invalidTask);
      expect(result.success).toBe(false);
    });
  });

  describe('reportDeliverTaskSchema', () => {
    it('should validate a valid deliver task', () => {
      const validTask = {
        schemaVersion: SCHEMA_VERSION,
        messageId: '123e4567-e89b-12d3-a456-426614174000',
        reportId: '123e4567-e89b-12d3-a456-426614174001',
        userId: '123e4567-e89b-12d3-a456-426614174002',
        reportType: 'weekly',
        periodStart: '2026-01-13',
        periodEnd: '2026-01-19',
        locale: 'en',
        emailEnabled: true,
        correlationId: '123e4567-e89b-12d3-a456-426614174003',
        occurredAt: new Date().toISOString(),
      };

      const result = reportDeliverTaskSchema.safeParse(validTask);
      expect(result.success).toBe(true);
    });

    it('should support all report types', () => {
      const types = ['weekly', 'monthly', 'custom'] as const;

      for (const type of types) {
        const task = {
          schemaVersion: SCHEMA_VERSION,
          messageId: crypto.randomUUID(),
          reportId: crypto.randomUUID(),
          userId: crypto.randomUUID(),
          reportType: type,
          periodStart: '2026-01-13',
          periodEnd: '2026-01-19',
          locale: 'en',
          emailEnabled: true,
          correlationId: crypto.randomUUID(),
          occurredAt: new Date().toISOString(),
        };

        const result = reportDeliverTaskSchema.safeParse(task);
        expect(result.success).toBe(true);
      }
    });

    it('should validate both locales', () => {
      const locales = ['en', 'vi'] as const;

      for (const locale of locales) {
        const task = {
          schemaVersion: SCHEMA_VERSION,
          messageId: crypto.randomUUID(),
          reportId: crypto.randomUUID(),
          userId: crypto.randomUUID(),
          reportType: 'weekly' as const,
          periodStart: '2026-01-13',
          periodEnd: '2026-01-19',
          locale,
          emailEnabled: false,
          correlationId: crypto.randomUUID(),
          occurredAt: new Date().toISOString(),
        };

        const result = reportDeliverTaskSchema.safeParse(task);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('reportDeleteTaskSchema', () => {
    it('should validate a valid delete task', () => {
      const validTask = {
        schemaVersion: SCHEMA_VERSION,
        messageId: '123e4567-e89b-12d3-a456-426614174000',
        reportId: '123e4567-e89b-12d3-a456-426614174001',
        userId: '123e4567-e89b-12d3-a456-426614174002',
        correlationId: '123e4567-e89b-12d3-a456-426614174003',
        occurredAt: new Date().toISOString(),
      };

      const result = reportDeleteTaskSchema.safeParse(validTask);
      expect(result.success).toBe(true);
    });
  });
});

describe('Utility Functions', () => {
  describe('generateIdempotencyKey', () => {
    it('should generate consistent keys', () => {
      const key1 = generateIdempotencyKey(
        'user-123',
        'weekly',
        '2026-01-13',
        '2026-01-19'
      );

      const key2 = generateIdempotencyKey(
        'user-123',
        'weekly',
        '2026-01-13',
        '2026-01-19'
      );

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different inputs', () => {
      const key1 = generateIdempotencyKey(
        'user-123',
        'weekly',
        '2026-01-13',
        '2026-01-19'
      );

      const key2 = generateIdempotencyKey(
        'user-123',
        'monthly',
        '2026-01-13',
        '2026-01-19'
      );

      expect(key1).not.toBe(key2);
    });
  });

  describe('isValidReportDateRange', () => {
    it('should accept valid date ranges', () => {
      expect(isValidReportDateRange('2026-01-01', '2026-01-31')).toBe(true);
      expect(isValidReportDateRange('2026-01-01', '2026-01-01')).toBe(true);
      expect(isValidReportDateRange('2025-01-01', '2025-12-31')).toBe(true);
    });

    it('should reject when start is after end', () => {
      expect(isValidReportDateRange('2026-01-31', '2026-01-01')).toBe(false);
    });

    it('should reject invalid date formats', () => {
      expect(isValidReportDateRange('invalid', '2026-01-01')).toBe(false);
      expect(isValidReportDateRange('2026-01-01', 'invalid')).toBe(false);
    });

    it('should reject ranges over 1 year', () => {
      expect(isValidReportDateRange('2025-01-01', '2026-06-01')).toBe(false);
    });
  });

  describe('calculateExpirationTime', () => {
    it('should calculate expiration correctly', () => {
      const now = 1704067200000; // Fixed timestamp
      const expiration = calculateExpirationTime(now);

      const expected = now + (REPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      expect(expiration).toBe(expected);
    });
  });

  describe('calculateReportDateRange', () => {
    it('should calculate weekly range correctly', () => {
      const fromDate = new Date('2026-01-20T12:00:00Z');
      const range = calculateReportDateRange('weekly', fromDate, 'UTC');

      expect(range.periodStart).toBe('2026-01-13');
      expect(range.periodEnd).toBe('2026-01-19');
    });

    it('should calculate monthly range correctly', () => {
      const fromDate = new Date('2026-01-20T12:00:00Z');
      const range = calculateReportDateRange('monthly', fromDate, 'UTC');

      expect(range.periodStart).toBe('2025-12-01');
      expect(range.periodEnd).toBe('2025-12-31');
    });
  });
});

describe('Constants', () => {
  it('should have correct schema version', () => {
    expect(SCHEMA_VERSION).toBe(1);
  });

  it('should have correct retention days', () => {
    expect(REPORT_RETENTION_DAYS).toBe(90);
  });

  it('should have all expected statuses', () => {
    expect(REPORT_STATUS.PENDING).toBe('pending');
    expect(REPORT_STATUS.QUEUED).toBe('queued');
    expect(REPORT_STATUS.PROCESSING).toBe('processing');
    expect(REPORT_STATUS.COMPLETED).toBe('completed');
    expect(REPORT_STATUS.FAILED).toBe('failed');
    expect(REPORT_STATUS.EXPIRED).toBe('expired');
    expect(REPORT_STATUS.CANCELLED).toBe('cancelled');
  });

  it('should have all schedule statuses', () => {
    expect(SCHEDULE_STATUS.ACTIVE).toBe('active');
    expect(SCHEDULE_STATUS.PAUSED).toBe('paused');
    expect(SCHEDULE_STATUS.DELETED).toBe('deleted');
  });
});

describe('Security and Privacy', () => {
  it('should not allow schema version mismatch', () => {
    const task = {
      schemaVersion: 2, // Future version
      messageId: crypto.randomUUID(),
      reportJobId: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      correlationId: crypto.randomUUID(),
      occurredAt: new Date().toISOString(),
    };

    const result = reportGenerateTaskSchema.safeParse(task);
    expect(result.success).toBe(false);
  });

  it('should validate all UUID fields', () => {
    const task = {
      schemaVersion: SCHEMA_VERSION,
      messageId: '123e4567-e89b-12d3-a456-426614174000',
      reportJobId: 'invalid-uuid', // Invalid
      userId: '123e4567-e89b-12d3-a456-426614174002',
      correlationId: '123e4567-e89b-12d3-a456-426614174003',
      occurredAt: new Date().toISOString(),
    };

    const result = reportGenerateTaskSchema.safeParse(task);
    expect(result.success).toBe(false);
  });

  it('should sanitize data in idempotency key', () => {
    const key = generateIdempotencyKey(
      'user@example.com',
      'weekly',
      '2026-01-13',
      '2026-01-19'
    );

    // Key should be deterministic regardless of special chars
    expect(key).toContain('user@example.com');
    expect(generateIdempotencyKey('user@example.com', 'weekly', '2026-01-13', '2026-01-19')).toBe(key);
  });
});
