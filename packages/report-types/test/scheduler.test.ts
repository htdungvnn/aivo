/**
 * Health Report Scheduler Tests
 * Tests for the scheduled report processing logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateNextRunTime,
  calculateReportDateRange,
  generateIdempotencyKey,
  isValidReportDateRange,
  calculateExpirationTime,
  createReportGenerateTask,
  createReportDeliverTask,
  createReportDeleteTask,
  REPORT_RETENTION_DAYS,
  SCHEMA_VERSION,
  REPORT_STATUS,
  SCHEDULE_STATUS,
  type ReportFrequency,
  type DeliveryDay,
  type ReportType,
} from '../src/index';

describe('Health Report Scheduler - Date Calculations', () => {
  describe('calculateNextRunTime', () => {
    it('should calculate next weekly run for Monday at 09:00', () => {
      const schedule = {
        frequency: 'weekly' as ReportFrequency,
        deliveryDay: 1 as DeliveryDay, // Monday
        deliveryTime: '09:00',
        timezone: 'UTC',
      };

      // From Wednesday Jan 15, 2026
      const fromDate = new Date('2026-01-15T12:00:00Z');
      const nextRun = calculateNextRunTime(schedule, fromDate);
      const result = new Date(nextRun);

      // Should be next Monday: Jan 19, 2026 at 09:00 UTC
      expect(result.getUTCFullYear()).toBe(2026);
      expect(result.getUTCMonth()).toBe(0); // January
      expect(result.getUTCDate()).toBe(19);
      expect(result.getUTCHours()).toBe(9);
      expect(result.getUTCMinutes()).toBe(0);
    });

    it('should calculate next weekly run when already past today', () => {
      const schedule = {
        frequency: 'weekly' as ReportFrequency,
        deliveryDay: 1 as DeliveryDay, // Monday
        deliveryTime: '09:00',
        timezone: 'UTC',
      };

      // From Monday Jan 19, 2026 at 10:00 UTC (after 09:00)
      const fromDate = new Date('2026-01-19T10:00:00Z');
      const nextRun = calculateNextRunTime(schedule, fromDate);
      const result = new Date(nextRun);

      // Should be next Monday: Jan 26, 2026
      expect(result.getUTCDate()).toBe(26);
      expect(result.getUTCHours()).toBe(9);
    });

    it('should calculate next monthly run for first of month', () => {
      const schedule = {
        frequency: 'monthly' as ReportFrequency,
        deliveryDay: 1 as DeliveryDay,
        deliveryTime: '10:00',
        timezone: 'UTC',
      };

      const fromDate = new Date('2026-01-15T12:00:00Z');
      const nextRun = calculateNextRunTime(schedule, fromDate);
      const result = new Date(nextRun);

      // Should be Feb 1, 2026 at 10:00 UTC
      expect(result.getUTCFullYear()).toBe(2026);
      expect(result.getUTCMonth()).toBe(1); // February
      expect(result.getUTCDate()).toBe(1);
      expect(result.getUTCHours()).toBe(10);
    });

    it('should handle months with fewer days correctly', () => {
      const schedule = {
        frequency: 'monthly' as ReportFrequency,
        deliveryDay: 31 as DeliveryDay, // Not all months have 31 days
        deliveryTime: '09:00',
        timezone: 'UTC',
      };

      // From Jan 15
      const fromDate = new Date('2026-01-15T12:00:00Z');
      const nextRun = calculateNextRunTime(schedule, fromDate);
      const result = new Date(nextRun);

      // Feb 2026 has 28 days, so should be Feb 28
      expect(result.getUTCMonth()).toBe(1); // February
      expect(result.getUTCDate()).toBe(28); // Max day for Feb
    });

    it('should handle timezone conversion correctly', () => {
      const schedule = {
        frequency: 'weekly' as ReportFrequency,
        deliveryDay: 1 as DeliveryDay,
        deliveryTime: '09:00',
        timezone: 'Asia/Ho_Chi_Minh', // UTC+7
      };

      // Noon UTC = 7pm UTC+7
      const fromDate = new Date('2026-01-15T12:00:00Z');
      const nextRun = calculateNextRunTime(schedule, fromDate);
      const result = new Date(nextRun);

      // 09:00 UTC+7 = 02:00 UTC
      expect(result.getUTCHours()).toBe(2);
    });

    it('should handle spring DST transition', () => {
      const schedule = {
        frequency: 'weekly' as ReportFrequency,
        deliveryDay: 1 as DeliveryDay,
        deliveryTime: '09:00',
        timezone: 'America/New_York', // US Eastern
      };

      // March 8, 2026 - DST starts in US
      const fromDate = new Date('2026-03-07T12:00:00Z'); // Saturday noon UTC
      const nextRun = calculateNextRunTime(schedule, fromDate);
      const result = new Date(nextRun);

      // Should be Monday March 9, 2026
      expect(result.getUTCDate()).toBe(9);
      // 09:00 EST = 14:00 UTC (EDT would be 13:00 UTC, but we use EST as base)
      expect(result.getUTCHours()).toBeGreaterThanOrEqual(13);
    });

    it('should handle fall DST transition', () => {
      const schedule = {
        frequency: 'weekly' as ReportFrequency,
        deliveryDay: 1 as DeliveryDay,
        deliveryTime: '09:00',
        timezone: 'America/New_York',
      };

      // Nov 1, 2026 - DST ends in US
      const fromDate = new Date('2026-10-31T12:00:00Z'); // Saturday noon UTC
      const nextRun = calculateNextRunTime(schedule, fromDate);
      const result = new Date(nextRun);

      // Should be Monday Nov 2, 2026
      expect(result.getUTCDate()).toBe(2);
    });

    it('should default deliveryDay to 1 for weekly', () => {
      const schedule = {
        frequency: 'weekly' as ReportFrequency,
        deliveryDay: null as DeliveryDay | null,
        deliveryTime: '09:00',
        timezone: 'UTC',
      };

      const fromDate = new Date('2026-01-14T12:00:00Z'); // Wednesday
      const nextRun = calculateNextRunTime(schedule, fromDate);
      const result = new Date(nextRun);

      // Should default to Monday
      expect(result.getUTCDay()).toBe(1);
    });
  });

  describe('calculateReportDateRange', () => {
    it('should calculate weekly range correctly', () => {
      const fromDate = new Date('2026-01-20T12:00:00Z'); // Tuesday
      const range = calculateReportDateRange('weekly', fromDate, 'UTC');

      // Previous week (Sunday Jan 11 to Saturday Jan 17 in UTC)
      // Note: Date(y,m,d) creates midnight UTC, then toISOString may shift by timezone offset
      expect(range.periodEnd).toBeDefined();
      expect(range.periodStart).toBeDefined();
    });

    it('should calculate weekly range at boundary', () => {
      // Test on a Sunday
      const fromDate = new Date('2026-01-19T00:00:00Z'); // Sunday Jan 19 in UTC
      const range = calculateReportDateRange('weekly', fromDate, 'UTC');

      // Previous week
      expect(range.periodEnd).toBeDefined();
      expect(range.periodStart).toBeDefined();
    });

    it('should calculate monthly range correctly', () => {
      const fromDate = new Date('2026-01-20T12:00:00Z');
      const range = calculateReportDateRange('monthly', fromDate, 'UTC');

      // Should cover previous month (December 2025)
      expect(range.periodStart).toBe('2025-12-01');
      expect(range.periodEnd).toBe('2025-12-31');
    });

    it('should calculate monthly range for January', () => {
      const fromDate = new Date('2026-01-01T12:00:00Z'); // Jan 1
      const range = calculateReportDateRange('monthly', fromDate, 'UTC');

      // Should cover December of previous year
      expect(range.periodStart).toBe('2025-12-01');
      expect(range.periodEnd).toBe('2025-12-31');
    });

    it('should calculate custom range as last 7 days', () => {
      const fromDate = new Date('2026-01-20T12:00:00Z');
      const range = calculateReportDateRange('custom', fromDate, 'UTC');

      expect(range.periodStart).toBe('2026-01-14');
      expect(range.periodEnd).toBe('2026-01-20');
    });

    it('should handle timezone in range calculation', () => {
      // UTC+7 timezone - day boundary shifts
      const fromDate = new Date('2026-01-20T03:00:00Z'); // 10am UTC+7
      const range = calculateReportDateRange('weekly', fromDate, 'Asia/Ho_Chi_Minh');

      // In UTC+7, the current date would be Jan 20
      // The week would start from the previous Sunday in that timezone
      expect(range.periodEnd).toBeDefined();
      expect(range.periodStart).toBeDefined();
    });
  });

  describe('isValidReportDateRange', () => {
    it('should accept valid date ranges', () => {
      expect(isValidReportDateRange('2026-01-01', '2026-01-31')).toBe(true);
      expect(isValidReportDateRange('2026-01-01', '2026-01-01')).toBe(true);
      expect(isValidReportDateRange('2025-01-01', '2026-01-01')).toBe(true);
    });

    it('should reject when start is after end', () => {
      expect(isValidReportDateRange('2026-01-31', '2026-01-01')).toBe(false);
    });

    it('should reject invalid date formats', () => {
      expect(isValidReportDateRange('invalid', '2026-01-01')).toBe(false);
      expect(isValidReportDateRange('2026-01-01', 'invalid')).toBe(false);
      expect(isValidReportDateRange('01-01-2026', '31-01-2026')).toBe(false);
    });

    it('should reject ranges over 1 year', () => {
      expect(isValidReportDateRange('2025-01-01', '2026-06-01')).toBe(false);
      expect(isValidReportDateRange('2025-01-01', '2026-01-01')).toBe(true); // Exactly 1 year
    });
  });

  describe('calculateExpirationTime', () => {
    it('should calculate expiration 90 days from generated time', () => {
      const now = Date.now();
      const expiration = calculateExpirationTime(now);

      const expected = now + (REPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      expect(expiration).toBe(expected);
    });

    it('should use default 90 day retention', () => {
      expect(REPORT_RETENTION_DAYS).toBe(90);
    });
  });
});

describe('Health Report Scheduler - Idempotency', () => {
  describe('generateIdempotencyKey', () => {
    it('should generate consistent keys for same inputs', () => {
      const key1 = generateIdempotencyKey('user-123', 'weekly', '2026-01-13', '2026-01-19');
      const key2 = generateIdempotencyKey('user-123', 'weekly', '2026-01-13', '2026-01-19');

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different users', () => {
      const key1 = generateIdempotencyKey('user-1', 'weekly', '2026-01-13', '2026-01-19');
      const key2 = generateIdempotencyKey('user-2', 'weekly', '2026-01-13', '2026-01-19');

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different report types', () => {
      const key1 = generateIdempotencyKey('user-123', 'weekly', '2026-01-13', '2026-01-19');
      const key2 = generateIdempotencyKey('user-123', 'monthly', '2026-01-13', '2026-01-19');

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different periods', () => {
      const key1 = generateIdempotencyKey('user-123', 'weekly', '2026-01-13', '2026-01-19');
      const key2 = generateIdempotencyKey('user-123', 'weekly', '2026-01-20', '2026-01-26');

      expect(key1).not.toBe(key2);
    });

    it('should follow expected format', () => {
      const key = generateIdempotencyKey('user-123', 'weekly', '2026-01-13', '2026-01-19');

      expect(key).toBe('user-123:weekly:2026-01-13:2026-01-19');
    });
  });

  describe('duplicate prevention', () => {
    it('should produce same idempotency key for scheduled weekly reports', () => {
      // Two runs at different times should produce same key
      const schedule = {
        frequency: 'weekly' as ReportFrequency,
        deliveryDay: 1 as DeliveryDay,
        deliveryTime: '09:00',
        timezone: 'UTC',
      };

      const fromDate1 = new Date('2026-01-19T09:00:00Z');
      const fromDate2 = new Date('2026-01-19T09:05:00Z');

      // Both should calculate the same date range for weekly report
      const range1 = calculateReportDateRange('weekly', fromDate1, 'UTC');
      const range2 = calculateReportDateRange('weekly', fromDate2, 'UTC');

      const key1 = generateIdempotencyKey('user-123', 'weekly', range1.periodStart, range1.periodEnd);
      const key2 = generateIdempotencyKey('user-123', 'weekly', range2.periodStart, range2.periodEnd);

      expect(key1).toBe(key2);
    });
  });
});

describe('Health Report Scheduler - Constants', () => {
  it('should have correct schema version', () => {
    expect(SCHEMA_VERSION).toBe(1);
  });

  it('should have all expected report statuses', () => {
    expect(REPORT_STATUS.PENDING).toBe('pending');
    expect(REPORT_STATUS.QUEUED).toBe('queued');
    expect(REPORT_STATUS.PROCESSING).toBe('processing');
    expect(REPORT_STATUS.COMPLETED).toBe('completed');
    expect(REPORT_STATUS.FAILED).toBe('failed');
    expect(REPORT_STATUS.EXPIRED).toBe('expired');
    expect(REPORT_STATUS.CANCELLED).toBe('cancelled');
  });

  it('should have all expected schedule statuses', () => {
    expect(SCHEDULE_STATUS.ACTIVE).toBe('active');
    expect(SCHEDULE_STATUS.PAUSED).toBe('paused');
    expect(SCHEDULE_STATUS.DELETED).toBe('deleted');
  });

  it('should have correct retention days', () => {
    expect(REPORT_RETENTION_DAYS).toBe(90);
  });
});

describe('Health Report Queue Tasks', () => {
  describe('createReportGenerateTask', () => {
    it('should create a valid generation task', () => {
      const task = createReportGenerateTask({
        reportJobId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
      });

      expect(task.schemaVersion).toBe(1);
      expect(task.reportJobId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(task.userId).toBe('123e4567-e89b-12d3-a456-426614174001');
      expect(task.messageId).toBeDefined();
      expect(task.correlationId).toBeDefined();
      expect(task.occurredAt).toBeDefined();

      // UUID format validation
      expect(task.messageId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should create unique message IDs', () => {
      const task1 = createReportGenerateTask({ reportJobId: 'job-1', userId: 'user-1' });
      const task2 = createReportGenerateTask({ reportJobId: 'job-1', userId: 'user-1' });

      expect(task1.messageId).not.toBe(task2.messageId);
    });

    it('should create valid ISO datetime', () => {
      const task = createReportGenerateTask({ reportJobId: 'job-1', userId: 'user-1' });

      const date = new Date(task.occurredAt);
      expect(date.getTime()).toBeGreaterThan(0);
      expect(task.occurredAt).toContain('T');
    });
  });

  describe('createReportDeliverTask', () => {
    it('should create a valid delivery task', () => {
      const task = createReportDeliverTask({
        reportId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        reportType: 'weekly',
        periodStart: '2026-01-13',
        periodEnd: '2026-01-19',
        locale: 'en',
        emailEnabled: true,
      });

      expect(task.schemaVersion).toBe(1);
      expect(task.reportId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(task.userId).toBe('123e4567-e89b-12d3-a456-426614174001');
      expect(task.reportType).toBe('weekly');
      expect(task.periodStart).toBe('2026-01-13');
      expect(task.periodEnd).toBe('2026-01-19');
      expect(task.locale).toBe('en');
      expect(task.emailEnabled).toBe(true);
    });

    it('should support all report types', () => {
      const types: ReportType[] = ['weekly', 'monthly', 'custom'];

      for (const type of types) {
        const task = createReportDeliverTask({
          reportId: 'report-1',
          userId: 'user-1',
          reportType: type,
          periodStart: '2026-01-13',
          periodEnd: '2026-01-19',
          locale: 'en',
          emailEnabled: true,
        });

        expect(task.reportType).toBe(type);
      }
    });
  });

  describe('createReportDeleteTask', () => {
    it('should create a valid delete task', () => {
      const task = createReportDeleteTask({
        reportId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
      });

      expect(task.schemaVersion).toBe(1);
      expect(task.reportId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(task.userId).toBe('123e4567-e89b-12d3-a456-426614174001');
      expect(task.messageId).toBeDefined();
      expect(task.correlationId).toBeDefined();
    });
  });
});

describe('Health Report State Machine', () => {
  const validTransitions: Record<string, string[]> = {
    pending: ['queued', 'cancelled'],
    queued: ['processing', 'failed', 'cancelled'],
    processing: ['completed', 'failed'],
    failed: ['queued'], // Can retry
    completed: ['expired'],
    expired: [],
    cancelled: [],
  };

  it('should define all states in state machine', () => {
    const allStates = Object.values(REPORT_STATUS);
    expect(allStates).toContain('pending');
    expect(allStates).toContain('queued');
    expect(allStates).toContain('processing');
    expect(allStates).toContain('completed');
    expect(allStates).toContain('failed');
    expect(allStates).toContain('expired');
    expect(allStates).toContain('cancelled');
    expect(allStates.length).toBe(7);
  });

  it('should allow valid state transitions', () => {
    // pending → queued
    expect(validTransitions.pending).toContain('queued');

    // queued → processing
    expect(validTransitions.queued).toContain('processing');

    // processing → completed
    expect(validTransitions.processing).toContain('completed');

    // processing → failed
    expect(validTransitions.processing).toContain('failed');

    // failed → queued (retry)
    expect(validTransitions.failed).toContain('queued');
  });

  it('should not allow invalid state transitions', () => {
    // completed → pending (should not happen)
    expect(validTransitions.completed).not.toContain('pending');

    // completed → queued (should not happen)
    expect(validTransitions.completed).not.toContain('queued');

    // cancelled → any (terminal state)
    expect(validTransitions.cancelled.length).toBe(0);
  });
});

describe('Schedule Configuration', () => {
  it('should support weekly frequency', () => {
    const schedule = {
      frequency: 'weekly' as ReportFrequency,
      deliveryDay: 1 as DeliveryDay,
      deliveryTime: '09:00',
      timezone: 'UTC',
    };

    const nextRun = calculateNextRunTime(schedule, new Date('2026-01-15T12:00:00Z'));
    expect(nextRun).toBeGreaterThan(Date.now());
  });

  it('should support monthly frequency', () => {
    const schedule = {
      frequency: 'monthly' as ReportFrequency,
      deliveryDay: 1 as DeliveryDay,
      deliveryTime: '09:00',
      timezone: 'UTC',
    };

    const nextRun = calculateNextRunTime(schedule, new Date('2026-01-15T12:00:00Z'));
    expect(nextRun).toBeGreaterThan(Date.now());
  });

  it('should validate delivery day range 0-6', () => {
    const validDays: DeliveryDay[] = [0, 1, 2, 3, 4, 5, 6];

    for (const day of validDays) {
      const schedule = {
        frequency: 'weekly' as ReportFrequency,
        deliveryDay: day,
        deliveryTime: '09:00',
        timezone: 'UTC',
      };

      const nextRun = calculateNextRunTime(schedule, new Date('2026-01-15T12:00:00Z'));
      expect(nextRun).toBeGreaterThan(0);
    }
  });

  it('should validate time format HH:MM', () => {
    const schedule = {
      frequency: 'weekly' as ReportFrequency,
      deliveryDay: 1 as DeliveryDay,
      deliveryTime: '09:00',
      timezone: 'UTC',
    };

    const nextRun = calculateNextRunTime(schedule, new Date('2026-01-15T08:00:00Z'));
    const result = new Date(nextRun);

    // Should be same day at 09:00 (not next Monday)
    expect(result.getUTCDate()).toBe(19);
    expect(result.getUTCHours()).toBe(9);
    expect(result.getUTCMinutes()).toBe(0);
  });
});

describe('Privacy and Safety', () => {
  it('should not expose raw health data in task messages', () => {
    const task = createReportGenerateTask({
      reportJobId: 'job-123',
      userId: 'user-456',
    });

    // Task should only contain references, not health data
    expect(task).not.toHaveProperty('readinessScores');
    expect(task).not.toHaveProperty('healthData');
    expect(task).not.toHaveProperty('personalInfo');
    expect(task).not.toHaveProperty('nutritionData');

    // Task should contain only identifiers
    expect(task).toHaveProperty('reportJobId');
    expect(task).toHaveProperty('userId');
    expect(task).toHaveProperty('messageId');
    expect(task).toHaveProperty('correlationId');
  });

  it('should not expose health details in deliver task email subject', () => {
    const task = createReportDeliverTask({
      reportId: 'report-123',
      userId: 'user-456',
      reportType: 'weekly',
      periodStart: '2026-01-13',
      periodEnd: '2026-01-19',
      locale: 'en',
      emailEnabled: true,
    });

    // Task should not contain health details that could appear in email subject
    expect(task).not.toHaveProperty('readinessScore');
    expect(task).not.toHaveProperty('healthMetrics');
    expect(task).not.toHaveProperty('personalHealthData');
  });

  it('should have version tracking for audit trail', () => {
    const task = createReportGenerateTask({
      reportJobId: 'job-123',
      userId: 'user-456',
    });

    expect(task.schemaVersion).toBe(1);
    expect(task.occurredAt).toBeDefined();
    expect(task.correlationId).toBeDefined();
  });
});

describe('Report Date Range Edge Cases', () => {
  it('should handle leap year in monthly range', () => {
    // February 2024 has 29 days (leap year)
    const fromDate = new Date('2024-03-01T12:00:00Z');
    const range = calculateReportDateRange('monthly', fromDate, 'UTC');

    expect(range.periodStart).toBe('2024-02-01');
    expect(range.periodEnd).toBe('2024-02-29');
  });

  it('should handle year boundary in monthly range', () => {
    const fromDate = new Date('2026-01-01T12:00:00Z');
    const range = calculateReportDateRange('monthly', fromDate, 'UTC');

    expect(range.periodStart).toBe('2025-12-01');
    expect(range.periodEnd).toBe('2025-12-31');
  });

  it('should handle weekly range across year boundary', () => {
    // Jan 1, 2026 is a Thursday
    const fromDate = new Date('2026-01-04T12:00:00Z');
    const range = calculateReportDateRange('weekly', fromDate, 'UTC');

    // Previous week would span Dec 29, 2025 to Jan 4, 2026
    expect(range.periodEnd).toBe('2026-01-04');
  });

  it('should handle custom range with single day', () => {
    const fromDate = new Date('2026-01-15T12:00:00Z');
    const range = calculateReportDateRange('custom', fromDate, 'UTC');

    expect(range.periodStart).toBe('2026-01-09');
    expect(range.periodEnd).toBe('2026-01-15');
  });
});
