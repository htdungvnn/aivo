/**
 * Health Report API Routes
 */

import { Hono } from 'hono';
import type { HealthEnv } from '../types/env.js';
import type {
  ReportSchedule,
  ReportJob,
  HealthReport,
  SupportedLocale,
} from '@repo/report-types';
import {
  requireAuth,
  parseTimezone,
  getHealthError,
  HEALTH_ERROR_CODES,
} from '../middleware/index.js';
import {
  createReportSchedule,
  getReportSchedule,
  updateReportSchedule,
  deleteReportSchedule,
  getSchedulesForUser,
} from '../db/reports.js';
import {
  createReportJob,
  getReportJob,
  getReportJobsForUser,
  updateReportJobStatus,
} from '../db/reports.js';
import {
  getReport,
  getReportWithJob,
  listReportsForUser,
  deleteReport,
} from '../db/reports.js';
import {
  createReportRequestSchema,
  createScheduleRequestSchema,
  updateScheduleRequestSchema,
  generateIdempotencyKey,
  calculateReportDateRange,
  calculateNextRunTime,
  REPORT_ERROR_CODES,
  SCHEDULE_STATUS,
} from '@repo/report-types';
import {
  generateSecureDownloadUrl,
  serveSecureDownload,
  isReportOwner,
  isReportExpired,
} from '../lib/report-storage.js';
import { createReportGenerateTask } from '@repo/report-types';

// Context type
type Context = {
  Bindings: HealthEnv;
  Variables: {
    requestId: string;
    userId: string;
  };
};

// =============================================================================
// Schedule Routes
// =============================================================================

/**
 * Create a report schedule
 */
async function createSchedule(c: Context) {
  const userId = c.get('userId');
  const db = c.env.DB;
  
  const body = await c.req.json();
  const parsed = createScheduleRequestSchema.safeParse(body);
  
  if (!parsed.success) {
    throw getHealthError(
      HEALTH_ERROR_CODES.VALIDATION_ERROR,
      'Invalid schedule data',
      400,
      { errors: parsed.error.errors }
    );
  }
  
  const { frequency, timezone, deliveryDay, deliveryTime, locale, emailEnabled } = parsed.data;
  
  // Calculate initial next run time
  const nextRunAt = calculateNextRunTime({
    frequency,
    deliveryDay: deliveryDay ?? null,
    deliveryTime,
    timezone,
  });
  
  const schedule = await createReportSchedule(db, {
    id: crypto.randomUUID(),
    userId,
    frequency,
    timezone,
    deliveryDay: deliveryDay ?? null,
    deliveryTime,
    locale: locale ?? 'en',
    emailEnabled: emailEnabled ?? true,
  });
  
  // Update with calculated next run time
  await updateReportSchedule(db, schedule.id, userId, { nextRunAt });
  
  return c.json({
    data: {
      id: schedule.id,
      frequency: schedule.frequency,
      timezone: schedule.timezone,
      deliveryDay: schedule.deliveryDay,
      deliveryTime: schedule.deliveryTime,
      locale: schedule.locale,
      emailEnabled: schedule.emailEnabled,
      status: schedule.status,
      nextRunAt,
      lastRunAt: null,
      createdAt: schedule.createdAt,
    },
  }, 201);
}

/**
 * Get user's report schedule
 */
async function getSchedule(c: Context) {
  const userId = c.get('userId');
  const db = c.env.DB;
  
  const schedules = await getSchedulesForUser(db, userId);
  
  return c.json({
    data: {
      schedules: schedules.map(s => ({
        id: s.id,
        frequency: s.frequency,
        timezone: s.timezone,
        deliveryDay: s.deliveryDay,
        deliveryTime: s.deliveryTime,
        locale: s.locale,
        emailEnabled: s.emailEnabled,
        status: s.status,
        nextRunAt: s.nextRunAt,
        lastRunAt: s.lastRunAt,
        createdAt: s.createdAt,
      })),
    },
  });
}

/**
 * Update report schedule
 */
async function updateSchedule(c: Context) {
  const userId = c.get('userId');
  const db = c.env.DB;
  const scheduleId = c.req.param('id');
  
  const body = await c.req.json();
  const parsed = updateScheduleRequestSchema.safeParse(body);
  
  if (!parsed.success) {
    throw getHealthError(
      HEALTH_ERROR_CODES.VALIDATION_ERROR,
      'Invalid schedule data',
      400,
      { errors: parsed.error.errors }
    );
  }
  
  // Check schedule exists and belongs to user
  const existing = await getReportSchedule(db, scheduleId, userId);
  if (!existing) {
    throw getHealthError(
      REPORT_ERROR_CODES.SCHEDULE_NOT_FOUND,
      'Schedule not found',
      404
    );
  }
  
  // Update schedule
  const success = await updateReportSchedule(db, scheduleId, userId, {
    ...parsed.data,
    nextRunAt: parsed.data.deliveryTime || parsed.data.deliveryDay || parsed.data.frequency || parsed.data.timezone
      ? calculateNextRunTime({
          frequency: parsed.data.frequency ?? existing.frequency,
          deliveryDay: parsed.data.deliveryDay !== undefined ? parsed.data.deliveryDay : existing.deliveryDay,
          deliveryTime: parsed.data.deliveryTime ?? existing.deliveryTime,
          timezone: parsed.data.timezone ?? existing.timezone,
        })
      : undefined,
  });
  
  if (!success) {
    throw getHealthError(
      REPORT_ERROR_CODES.INTERNAL_ERROR,
      'Failed to update schedule',
      500
    );
  }
  
  // Get updated schedule
  const updated = await getReportSchedule(db, scheduleId, userId);
  
  return c.json({
    data: {
      id: updated!.id,
      frequency: updated!.frequency,
      timezone: updated!.timezone,
      deliveryDay: updated!.deliveryDay,
      deliveryTime: updated!.deliveryTime,
      locale: updated!.locale,
      emailEnabled: updated!.emailEnabled,
      status: updated!.status,
      nextRunAt: updated!.nextRunAt,
      lastRunAt: updated!.lastRunAt,
      createdAt: updated!.createdAt,
    },
  });
}

/**
 * Pause schedule
 */
async function pauseSchedule(c: Context) {
  const userId = c.get('userId');
  const db = c.env.DB;
  const scheduleId = c.req.param('id');
  
  const existing = await getReportSchedule(db, scheduleId, userId);
  if (!existing) {
    throw getHealthError(
      REPORT_ERROR_CODES.SCHEDULE_NOT_FOUND,
      'Schedule not found',
      404
    );
  }
  
  const success = await updateReportSchedule(db, scheduleId, userId, {
    status: 'paused',
  });
  
  if (!success) {
    throw getHealthError(
      REPORT_ERROR_CODES.INTERNAL_ERROR,
      'Failed to pause schedule',
      500
    );
  }
  
  return c.json({ data: { success: true } });
}

/**
 * Resume schedule
 */
async function resumeSchedule(c: Context) {
  const userId = c.get('userId');
  const db = c.env.DB;
  const scheduleId = c.req.param('id');
  
  const existing = await getReportSchedule(db, scheduleId, userId);
  if (!existing) {
    throw getHealthError(
      REPORT_ERROR_CODES.SCHEDULE_NOT_FOUND,
      'Schedule not found',
      404
    );
  }
  
  const nextRunAt = calculateNextRunTime({
    frequency: existing.frequency,
    deliveryDay: existing.deliveryDay,
    deliveryTime: existing.deliveryTime,
    timezone: existing.timezone,
  });
  
  const success = await updateReportSchedule(db, scheduleId, userId, {
    status: 'active',
    nextRunAt,
  });
  
  if (!success) {
    throw getHealthError(
      REPORT_ERROR_CODES.INTERNAL_ERROR,
      'Failed to resume schedule',
      500
    );
  }
  
  return c.json({ data: { success: true } });
}

/**
 * Delete schedule
 */
async function deleteSchedule(c: Context) {
  const userId = c.get('userId');
  const db = c.env.DB;
  const scheduleId = c.req.param('id');
  
  const existing = await getReportSchedule(db, scheduleId, userId);
  if (!existing) {
    throw getHealthError(
      REPORT_ERROR_CODES.SCHEDULE_NOT_FOUND,
      'Schedule not found',
      404
    );
  }
  
  const success = await deleteReportSchedule(db, scheduleId, userId);
  
  if (!success) {
    throw getHealthError(
      REPORT_ERROR_CODES.INTERNAL_ERROR,
      'Failed to delete schedule',
      500
    );
  }
  
  return c.json({ data: { success: true } });
}

// =============================================================================
// Report Generation Routes
// =============================================================================

/**
 * Generate report manually
 */
async function generateReport(c: Context) {
  const userId = c.get('userId');
  const db = c.env.DB;
  const queue = c.env.REPORT_QUEUE;
  
  const body = await c.req.json();
  const parsed = createReportRequestSchema.safeParse(body);
  
  if (!parsed.success) {
    throw getHealthError(
      HEALTH_ERROR_CODES.VALIDATION_ERROR,
      'Invalid report request',
      400,
      { errors: parsed.error.errors }
    );
  }
  
  const { reportType, periodStart, periodEnd, timezone, locale } = parsed.data;
  
  // Generate idempotency key
  const idempotencyKey = generateIdempotencyKey(userId, reportType, periodStart, periodEnd);
  
  // Check for existing job with same key
  const existingJob = await db
    .prepare('SELECT id, status FROM health_report_jobs WHERE idempotency_key = ?')
    .bind(idempotencyKey)
    .first();
  
  if (existingJob) {
    const status = existingJob.status as string;
    if (status === 'completed') {
      // Return existing completed report
      return c.json({
        data: {
          jobId: existingJob.id as string,
          status: 'completed',
          message: 'Report already exists',
        },
      }, 200);
    }
    if (status === 'processing' || status === 'queued' || status === 'pending') {
      // Return existing job
      return c.json({
        data: {
          jobId: existingJob.id as string,
          status,
          message: 'Report is being generated',
        },
      }, 200);
    }
    // If failed, allow retry
  }
  
  // Create new job
  const jobId = crypto.randomUUID();
  const job = await createReportJob(db, {
    id: jobId,
    userId,
    scheduleId: null,
    reportType,
    periodStart,
    periodEnd,
    timezone: timezone ?? 'UTC',
    locale: locale ?? 'en',
  });
  
  // Update status to queued
  await updateReportJobStatus(db, jobId, 'queued');
  
  // Create and publish queue task
  const task = createReportGenerateTask({
    reportJobId: jobId,
    userId,
  });
  
  await queue.send(task);
  
  return c.json({
    data: {
      jobId: job.id,
      status: 'queued',
      message: 'Report generation started',
    },
  }, 202);
}

/**
 * Get report job status
 */
async function getJobStatus(c: Context) {
  const userId = c.get('userId');
  const db = c.env.DB;
  const jobId = c.req.param('id');
  
  const job = await getReportJob(db, jobId, userId);
  
  if (!job) {
    throw getHealthError(
      REPORT_ERROR_CODES.REPORT_JOB_NOT_FOUND,
      'Report job not found',
      404
    );
  }
  
  // Get report if completed
  let reportId: string | null = null;
  if (job.status === 'completed') {
    const report = await db
      .prepare('SELECT id FROM health_reports WHERE job_id = ? AND deleted_at IS NULL LIMIT 1')
      .bind(jobId)
      .first();
    reportId = report?.id as string | null;
  }
  
  return c.json({
    data: {
      id: job.id,
      reportType: job.reportType,
      periodStart: job.periodStart,
      periodEnd: job.periodEnd,
      status: job.status,
      attemptCount: job.attemptCount,
      errorCategory: job.errorCategory,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      createdAt: job.createdAt,
      reportId,
    },
  });
}

/**
 * Get job history
 */
async function getJobHistory(c: Context) {
  const userId = c.get('userId');
  const db = c.env.DB;
  
  const limit = Math.min(parseInt(c.req.query('limit') ?? '20', 10), 100);
  const offset = parseInt(c.req.query('offset') ?? '0', 10);
  
  const jobs = await getReportJobsForUser(db, userId, { limit, offset });
  
  return c.json({
    data: {
      jobs: jobs.map(job => ({
        id: job.id,
        reportType: job.reportType,
        periodStart: job.periodStart,
        periodEnd: job.periodEnd,
        status: job.status,
        attemptCount: job.attemptCount,
        errorCategory: job.errorCategory,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt,
      })),
      pagination: {
        limit,
        offset,
      },
    },
  });
}

// =============================================================================
// Report History Routes
// =============================================================================

/**
 * List reports
 */
async function listReports(c: Context) {
  const userId = c.get('userId');
  const db = c.env.DB;
  
  const limit = Math.min(parseInt(c.req.query('limit') ?? '20', 10), 100);
  const offset = parseInt(c.req.query('offset') ?? '0', 10);
  
  const { reports, total } = await listReportsForUser(db, userId, { limit, offset });
  
  // Get job info for each report
  const reportsWithJobs = await Promise.all(
    reports.map(async (report) => {
      const job = await db
        .prepare('SELECT report_type, period_start, period_end, status FROM health_report_jobs WHERE id = ?')
        .bind(report.jobId)
        .first();
      
      return {
        id: report.id,
        reportType: job?.report_type as string,
        periodStart: job?.period_start as string,
        periodEnd: job?.period_end as string,
        fileName: report.fileName,
        fileSize: report.fileSize,
        dataCompleteness: report.dataCompleteness,
        generatedAt: report.generatedAt,
        expiresAt: report.expiresAt,
      };
    })
  );
  
  return c.json({
    data: {
      reports: reportsWithJobs,
      pagination: {
        limit,
        offset,
        total,
      },
    },
  });
}

/**
 * Get report details
 */
async function getReportDetails(c: Context) {
  const userId = c.get('userId');
  const db = c.env.DB;
  const reportId = c.req.param('id');
  
  const reportWithJob = await getReportWithJob(db, reportId, userId);
  
  if (!reportWithJob) {
    throw getHealthError(
      REPORT_ERROR_CODES.REPORT_NOT_FOUND,
      'Report not found',
      404
    );
  }
  
  if (isReportExpired(reportWithJob)) {
    throw getHealthError(
      REPORT_ERROR_CODES.REPORT_EXPIRED,
      'Report has expired',
      410
    );
  }
  
  return c.json({
    data: {
      id: reportWithJob.id,
      reportType: reportWithJob.job.reportType,
      periodStart: reportWithJob.job.periodStart,
      periodEnd: reportWithJob.job.periodEnd,
      locale: reportWithJob.job.locale,
      fileName: reportWithJob.fileName,
      fileSize: reportWithJob.fileSize,
      dataCompleteness: reportWithJob.dataCompleteness,
      generatedAt: reportWithJob.generatedAt,
      expiresAt: reportWithJob.expiresAt,
    },
  });
}

/**
 * Get download URL
 */
async function getDownloadUrl(c: Context) {
  const userId = c.get('userId');
  const db = c.env.DB;
  const bucket = c.env.REPORT_BUCKET;
  const reportId = c.req.param('id');
  
  const report = await getReport(db, reportId, userId);
  
  if (!report) {
    throw getHealthError(
      REPORT_ERROR_CODES.REPORT_NOT_FOUND,
      'Report not found',
      404
    );
  }
  
  if (!isReportOwner(report, userId)) {
    throw getHealthError(
      REPORT_ERROR_CODES.FORBIDDEN,
      'Access denied',
      403
    );
  }
  
  if (isReportExpired(report)) {
    throw getHealthError(
      REPORT_ERROR_CODES.REPORT_EXPIRED,
      'Report has expired',
      410
    );
  }
  
  const expirySeconds = Math.min(
    parseInt(c.req.query('expiresIn') ?? '3600', 10),
    86400
  );
  
  const { url, expiresAt } = await generateSecureDownloadUrl(
    bucket,
    report.r2ObjectKey,
    report.fileName,
    expirySeconds
  );
  
  return c.json({
    data: {
      downloadUrl: url,
      expiresAt,
      fileName: report.fileName,
    },
  });
}

/**
 * Download report (serves the file)
 */
async function downloadReport(c: Context) {
  const userId = c.get('userId');
  const db = c.env.DB;
  const bucket = c.env.REPORT_BUCKET;
  
  const token = c.req.query('token');
  const fileName = c.req.query('file');
  
  if (!token) {
    throw getHealthError(
      REPORT_ERROR_CODES.VALIDATION_ERROR,
      'Missing download token',
      400
    );
  }
  
  const result = await serveSecureDownload(bucket, token, fileName ?? '');
  
  if (!result.success || !result.data) {
    throw getHealthError(
      REPORT_ERROR_CODES.REPORT_NOT_FOUND,
      result.error ?? 'Failed to download report',
      404
    );
  }
  
  return c.newResponse(result.data, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${result.fileName}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

/**
 * Delete report
 */
async function deleteReportHandler(c: Context) {
  const userId = c.get('userId');
  const db = c.env.DB;
  const bucket = c.env.REPORT_BUCKET;
  const reportId = c.req.param('id');
  
  const report = await getReport(db, reportId, userId);
  
  if (!report) {
    throw getHealthError(
      REPORT_ERROR_CODES.REPORT_NOT_FOUND,
      'Report not found',
      404
    );
  }
  
  if (!isReportOwner(report, userId)) {
    throw getHealthError(
      REPORT_ERROR_CODES.FORBIDDEN,
      'Access denied',
      403
    );
  }
  
  // Delete from R2
  await bucket.delete(report.r2ObjectKey);
  
  // Mark as deleted in D1
  const success = await deleteReport(db, reportId, userId);
  
  if (!success) {
    throw getHealthError(
      REPORT_ERROR_CODES.INTERNAL_ERROR,
      'Failed to delete report',
      500
    );
  }
  
  return c.json({ data: { success: true } });
}

/**
 * Retry failed report
 */
async function retryReport(c: Context) {
  const userId = c.get('userId');
  const db = c.env.DB;
  const queue = c.env.REPORT_QUEUE;
  const jobId = c.req.param('id');
  
  const job = await getReportJob(db, jobId, userId);
  
  if (!job) {
    throw getHealthError(
      REPORT_ERROR_CODES.REPORT_JOB_NOT_FOUND,
      'Report job not found',
      404
    );
  }
  
  if (job.status !== 'failed') {
    throw getHealthError(
      REPORT_ERROR_CODES.VALIDATION_ERROR,
      'Can only retry failed reports',
      400
    );
  }
  
  // Update status to queued
  await updateReportJobStatus(db, jobId, 'queued');
  
  // Create and publish queue task
  const task = createReportGenerateTask({
    reportJobId: jobId,
    userId,
  });
  
  await queue.send(task);
  
  return c.json({
    data: {
      jobId: job.id,
      status: 'queued',
      message: 'Report generation restarted',
    },
  }, 202);
}

// =============================================================================
// Create Routes
// =============================================================================

/**
 * Create all report routes
 */
export function createReportRoutes() {
  const app = new Hono<Context>();
  
  // Schedule routes
  app.post('/schedules', requireAuth(), createSchedule);
  app.get('/schedules', requireAuth(), getSchedule);
  app.patch('/schedules/:id', requireAuth(), updateSchedule);
  app.post('/schedules/:id/pause', requireAuth(), pauseSchedule);
  app.post('/schedules/:id/resume', requireAuth(), resumeSchedule);
  app.delete('/schedules/:id', requireAuth(), deleteSchedule);
  
  // Report generation routes
  app.post('/reports/generate', requireAuth(), generateReport);
  app.get('/reports/jobs', requireAuth(), getJobHistory);
  app.get('/reports/jobs/:id', requireAuth(), getJobStatus);
  app.post('/reports/jobs/:id/retry', requireAuth(), retryReport);
  
  // Report history routes
  app.get('/reports', requireAuth(), listReports);
  app.get('/reports/:id', requireAuth(), getReportDetails);
  app.get('/reports/:id/download', requireAuth(), getDownloadUrl);
  app.get('/reports/download', downloadReport); // No auth - uses token
  app.delete('/reports/:id', requireAuth(), deleteReportHandler);
  
  return app;
}
