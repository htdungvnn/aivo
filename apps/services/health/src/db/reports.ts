/**
 * Health Reports Database Access Layer
 * D1 database operations for report schedules, jobs, and metadata
 */

import type {
  ReportSchedule,
  ReportJob,
  HealthReport,
  ReportStatus,
  ScheduleStatus,
  ReportType,
  SupportedLocale,
  ReportFrequency,
  DeliveryDay,
  DataCompleteness,
} from '@aivo/report-types';
import {
  generateIdempotencyKey,
  calculateExpirationTime,
  REPORT_RETENTION_DAYS,
} from '@aivo/report-types';

// =============================================================================
// Report Schedules
// =============================================================================

/**
 * Create a new report schedule
 */
export async function createReportSchedule(
  db: D1Database,
  schedule: {
    id: string;
    userId: string;
    frequency: ReportFrequency;
    timezone: string;
    deliveryDay: DeliveryDay | null;
    deliveryTime: string;
    locale: SupportedLocale;
    emailEnabled: boolean;
  }
): Promise<ReportSchedule> {
  const now = Date.now();

  await db
    .prepare(`
      INSERT INTO health_report_schedules (
        id, user_id, frequency, timezone, delivery_day, delivery_time,
        locale, email_enabled, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `)
    .bind(
      schedule.id,
      schedule.userId,
      schedule.frequency,
      schedule.timezone,
      schedule.deliveryDay,
      schedule.deliveryTime,
      schedule.locale,
      schedule.emailEnabled ? 1 : 0,
      now,
      now
    )
    .run();

  return {
    ...schedule,
    status: 'active',
    nextRunAt: null,
    lastRunAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Get report schedule by ID
 */
export async function getReportSchedule(
  db: D1Database,
  scheduleId: string,
  userId: string
): Promise<ReportSchedule | null> {
  const result = await db
    .prepare(`
      SELECT * FROM health_report_schedules
      WHERE id = ? AND user_id = ? AND status != 'deleted'
    `)
    .bind(scheduleId, userId)
    .first();

  if (!result) return null;

  return mapScheduleRow(result);
}

/**
 * Get active schedule for user
 */
export async function getActiveScheduleForUser(
  db: D1Database,
  userId: string
): Promise<ReportSchedule | null> {
  const result = await db
    .prepare(`
      SELECT * FROM health_report_schedules
      WHERE user_id = ? AND status = 'active'
      LIMIT 1
    `)
    .bind(userId)
    .first();

  if (!result) return null;

  return mapScheduleRow(result);
}

/**
 * Get all schedules for user
 */
export async function getSchedulesForUser(
  db: D1Database,
  userId: string
): Promise<ReportSchedule[]> {
  const result = await db
    .prepare(`
      SELECT * FROM health_report_schedules
      WHERE user_id = ? AND status != 'deleted'
      ORDER BY created_at DESC
    `)
    .bind(userId)
    .all();

  return result.results.map(mapScheduleRow);
}

/**
 * Get due schedules for cron processing
 */
export async function getDueSchedules(
  db: D1Database,
  currentTimeMs: number
): Promise<ReportSchedule[]> {
  const result = await db
    .prepare(`
      SELECT * FROM health_report_schedules
      WHERE status = 'active'
        AND next_run_at IS NOT NULL
        AND next_run_at <= ?
      ORDER BY next_run_at ASC
      LIMIT 100
    `)
    .bind(currentTimeMs)
    .all();

  return result.results.map(mapScheduleRow);
}

/**
 * Update report schedule
 */
export async function updateReportSchedule(
  db: D1Database,
  scheduleId: string,
  userId: string,
  updates: {
    frequency?: ReportFrequency;
    timezone?: string;
    deliveryDay?: DeliveryDay | null;
    deliveryTime?: string;
    locale?: SupportedLocale;
    emailEnabled?: boolean;
    status?: ScheduleStatus;
    nextRunAt?: number | null;
    lastRunAt?: number | null;
  }
): Promise<boolean> {
  const setClauses: string[] = [];
  const bindings: (string | number | null)[] = [];
  const now = Date.now();

  if (updates.frequency !== undefined) {
    setClauses.push('frequency = ?');
    bindings.push(updates.frequency);
  }
  if (updates.timezone !== undefined) {
    setClauses.push('timezone = ?');
    bindings.push(updates.timezone);
  }
  if (updates.deliveryDay !== undefined) {
    setClauses.push('delivery_day = ?');
    bindings.push(updates.deliveryDay);
  }
  if (updates.deliveryTime !== undefined) {
    setClauses.push('delivery_time = ?');
    bindings.push(updates.deliveryTime);
  }
  if (updates.locale !== undefined) {
    setClauses.push('locale = ?');
    bindings.push(updates.locale);
  }
  if (updates.emailEnabled !== undefined) {
    setClauses.push('email_enabled = ?');
    bindings.push(updates.emailEnabled ? 1 : 0);
  }
  if (updates.status !== undefined) {
    setClauses.push('status = ?');
    bindings.push(updates.status);
  }
  if (updates.nextRunAt !== undefined) {
    setClauses.push('next_run_at = ?');
    bindings.push(updates.nextRunAt);
  }
  if (updates.lastRunAt !== undefined) {
    setClauses.push('last_run_at = ?');
    bindings.push(updates.lastRunAt);
  }

  if (setClauses.length === 0) return true;

  setClauses.push('updated_at = ?');
  bindings.push(now);
  bindings.push(scheduleId);
  bindings.push(userId);

  const result = await db
    .prepare(`
      UPDATE health_report_schedules
      SET ${setClauses.join(', ')}
      WHERE id = ? AND user_id = ?
    `)
    .bind(...bindings)
    .run();

  return result.success;
}

/**
 * Delete report schedule (soft delete)
 */
export async function deleteReportSchedule(
  db: D1Database,
  scheduleId: string,
  userId: string
): Promise<boolean> {
  const now = Date.now();

  const result = await db
    .prepare(`
      UPDATE health_report_schedules
      SET status = 'deleted', updated_at = ?
      WHERE id = ? AND user_id = ?
    `)
    .bind(now, scheduleId, userId)
    .run();

  return result.success;
}

/**
 * Update schedule's next run time atomically (for cron processing)
 */
export async function claimScheduleAndUpdateNextRun(
  db: D1Database,
  scheduleId: string,
  nextRunAt: number | null
): Promise<boolean> {
  const now = Date.now();

  const result = await db
    .prepare(`
      UPDATE health_report_schedules
      SET last_run_at = next_run_at, next_run_at = ?, updated_at = ?
      WHERE id = ? AND status = 'active'
    `)
    .bind(nextRunAt, now, scheduleId)
    .run();

  return result.success;
}

// =============================================================================
// Report Jobs
// =============================================================================

/**
 * Create a report job
 */
export async function createReportJob(
  db: D1Database,
  job: {
    id: string;
    userId: string;
    scheduleId: string | null;
    reportType: ReportType;
    periodStart: string;
    periodEnd: string;
    timezone: string;
    locale: SupportedLocale;
  }
): Promise<ReportJob> {
  const now = Date.now();
  const idempotencyKey = generateIdempotencyKey(
    job.userId,
    job.reportType,
    job.periodStart,
    job.periodEnd
  );

  await db
    .prepare(`
      INSERT INTO health_report_jobs (
        id, user_id, schedule_id, report_type, period_start, period_end,
        timezone, locale, status, idempotency_key, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `)
    .bind(
      job.id,
      job.userId,
      job.scheduleId,
      job.reportType,
      job.periodStart,
      job.periodEnd,
      job.timezone,
      job.locale,
      idempotencyKey,
      now,
      now
    )
    .run();

  return {
    id: job.id,
    userId: job.userId,
    scheduleId: job.scheduleId,
    reportType: job.reportType,
    periodStart: job.periodStart,
    periodEnd: job.periodEnd,
    timezone: job.timezone,
    locale: job.locale,
    status: 'pending',
    idempotencyKey,
    attemptCount: 0,
    errorCategory: null,
    startedAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Get report job by ID
 */
export async function getReportJob(
  db: D1Database,
  jobId: string,
  userId: string
): Promise<ReportJob | null> {
  const result = await db
    .prepare(`
      SELECT * FROM health_report_jobs
      WHERE id = ? AND user_id = ?
    `)
    .bind(jobId, userId)
    .first();

  if (!result) return null;

  return mapJobRow(result);
}

/**
 * Get report job by idempotency key (for duplicate prevention)
 */
export async function getReportJobByIdempotencyKey(
  db: D1Database,
  idempotencyKey: string
): Promise<ReportJob | null> {
  const result = await db
    .prepare(`
      SELECT * FROM health_report_jobs
      WHERE idempotency_key = ?
    `)
    .bind(idempotencyKey)
    .first();

  if (!result) return null;

  return mapJobRow(result);
}

/**
 * Get jobs for user with optional filters
 */
export async function getReportJobsForUser(
  db: D1Database,
  userId: string,
  options: {
    status?: ReportStatus;
    limit?: number;
    offset?: number;
  } = {}
): Promise<ReportJob[]> {
  const { status, limit = 20, offset = 0 } = options;

  let query = 'SELECT * FROM health_report_jobs WHERE user_id = ?';
  const bindings: (string | number)[] = [userId];

  if (status) {
    query += ' AND status = ?';
    bindings.push(status);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  bindings.push(limit, offset);

  const result = await db.prepare(query).bind(...bindings).all();

  return result.results.map(mapJobRow);
}

/**
 * Update job status
 */
export async function updateReportJobStatus(
  db: D1Database,
  jobId: string,
  status: ReportStatus,
  errorCategory?: string
): Promise<boolean> {
  const now = Date.now();

  let query: string;
  let bindings: (string | number | null)[];

  if (status === 'processing') {
    query = `
      UPDATE health_report_jobs
      SET status = ?, started_at = ?, attempt_count = attempt_count + 1, updated_at = ?
      WHERE id = ?
    `;
    bindings = [status, now, now, jobId];
  } else if (status === 'completed' || status === 'failed') {
    query = `
      UPDATE health_report_jobs
      SET status = ?, completed_at = ?, error_category = ?, updated_at = ?
      WHERE id = ?
    `;
    bindings = [status, now, errorCategory ?? null, now, jobId];
  } else {
    query = `
      UPDATE health_report_jobs
      SET status = ?, updated_at = ?
      WHERE id = ?
    `;
    bindings = [status, now, jobId];
  }

  const result = await db.prepare(query).bind(...bindings).run();

  return result.success;
}

/**
 * Get job with related schedule info
 */
export async function getReportJobWithSchedule(
  db: D1Database,
  jobId: string
): Promise<(ReportJob & { schedule: ReportSchedule | null }) | null> {
  const jobResult = await db
    .prepare(`
      SELECT j.*, s.id as sched_id, s.user_id as sched_user_id, s.frequency as sched_frequency,
             s.timezone as sched_timezone, s.delivery_day as sched_delivery_day,
             s.delivery_time as sched_delivery_time, s.locale as sched_locale,
             s.email_enabled as sched_email_enabled, s.status as sched_status,
             s.next_run_at as sched_next_run_at, s.last_run_at as sched_last_run_at,
             s.created_at as sched_created_at, s.updated_at as sched_updated_at
      FROM health_report_jobs j
      LEFT JOIN health_report_schedules s ON j.schedule_id = s.id
      WHERE j.id = ?
    `)
    .bind(jobId)
    .first();

  if (!jobResult) return null;

  const job = mapJobRow(jobResult);
  let schedule: ReportSchedule | null = null;

  if (jobResult.sched_id) {
    schedule = {
      id: jobResult.sched_id as string,
      userId: jobResult.sched_user_id as string,
      frequency: jobResult.sched_frequency as ReportFrequency,
      timezone: jobResult.sched_timezone as string,
      deliveryDay: jobResult.sched_delivery_day as DeliveryDay | null,
      deliveryTime: jobResult.sched_delivery_time as string,
      locale: jobResult.sched_locale as SupportedLocale,
      emailEnabled: Boolean(jobResult.sched_email_enabled),
      status: jobResult.sched_status as ScheduleStatus,
      nextRunAt: jobResult.sched_next_run_at as number | null,
      lastRunAt: jobResult.sched_last_run_at as number | null,
      createdAt: jobResult.sched_created_at as number,
      updatedAt: jobResult.sched_updated_at as number,
    };
  }

  return { ...job, schedule };
}

// =============================================================================
// Health Reports Metadata
// =============================================================================

/**
 * Create report metadata
 */
export async function createReport(
  db: D1Database,
  report: {
    id: string;
    userId: string;
    jobId: string;
    reportVersion?: string;
    fileName: string;
    r2ObjectKey: string;
    fileSize: number;
    contentType?: string;
    checksum?: string;
    dataCompleteness?: DataCompleteness;
    generatedAt?: number;
  }
): Promise<HealthReport> {
  const now = Date.now();
  const generatedAt = report.generatedAt ?? now;
  const expiresAt = calculateExpirationTime(generatedAt);

  await db
    .prepare(`
      INSERT INTO health_reports (
        id, user_id, job_id, report_version, file_name, r2_object_key,
        file_size, content_type, checksum, data_completeness,
        generated_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      report.id,
      report.userId,
      report.jobId,
      report.reportVersion ?? '1.0.0',
      report.fileName,
      report.r2ObjectKey,
      report.fileSize,
      report.contentType ?? 'application/pdf',
      report.checksum ?? null,
      report.dataCompleteness ?? 'partial',
      generatedAt,
      expiresAt
    )
    .run();

  return {
    id: report.id,
    userId: report.userId,
    jobId: report.jobId,
    reportVersion: report.reportVersion ?? '1.0.0',
    fileName: report.fileName,
    r2ObjectKey: report.r2ObjectKey,
    fileSize: report.fileSize,
    contentType: report.contentType ?? 'application/pdf',
    checksum: report.checksum ?? null,
    dataCompleteness: report.dataCompleteness ?? 'partial',
    generatedAt,
    expiresAt,
    deletedAt: null,
  };
}

/**
 * Get report by ID
 */
export async function getReport(
  db: D1Database,
  reportId: string,
  userId: string
): Promise<HealthReport | null> {
  const result = await db
    .prepare(`
      SELECT * FROM health_reports
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `)
    .bind(reportId, userId)
    .first();

  if (!result) return null;

  return mapReportRow(result);
}

/**
 * Get report by job ID
 */
export async function getReportByJobId(
  db: D1Database,
  jobId: string
): Promise<HealthReport | null> {
  const result = await db
    .prepare(`
      SELECT * FROM health_reports
      WHERE job_id = ? AND deleted_at IS NULL
      ORDER BY generated_at DESC
      LIMIT 1
    `)
    .bind(jobId)
    .first();

  if (!result) return null;

  return mapReportRow(result);
}

/**
 * List reports for user
 */
export async function listReportsForUser(
  db: D1Database,
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    includeExpired?: boolean;
  } = {}
): Promise<{ reports: HealthReport[]; total: number }> {
  const { limit = 20, offset = 0, includeExpired = false } = options;

  const whereClause = includeExpired
    ? 'WHERE user_id = ? AND deleted_at IS NULL'
    : 'WHERE user_id = ? AND deleted_at IS NULL AND expires_at > ?';

  const bindings: (string | number)[] = includeExpired
    ? [userId]
    : [userId, Date.now()];

  // Get total count
  const countResult = await db
    .prepare(`SELECT COUNT(*) as count FROM health_reports ${whereClause}`)
    .bind(...bindings)
    .first();
  const total = countResult?.count as number ?? 0;

  // Get paginated results
  const result = await db
    .prepare(`
      SELECT * FROM health_reports ${whereClause}
      ORDER BY generated_at DESC
      LIMIT ? OFFSET ?
    `)
    .bind(...bindings, limit, offset)
    .all();

  return {
    reports: result.results.map(mapReportRow),
    total,
  };
}

/**
 * Get report with job info
 */
export async function getReportWithJob(
  db: D1Database,
  reportId: string,
  userId: string
): Promise<(HealthReport & { job: ReportJob }) | null> {
  const result = await db
    .prepare(`
      SELECT r.*, j.id as job_id, j.user_id as job_user_id, j.schedule_id as job_schedule_id,
             j.report_type as job_report_type, j.period_start as job_period_start,
             j.period_end as job_period_end, j.timezone as job_timezone,
             j.locale as job_locale, j.status as job_status,
             j.idempotency_key as job_idempotency_key, j.attempt_count as job_attempt_count,
             j.error_category as job_error_category, j.started_at as job_started_at,
             j.completed_at as job_completed_at, j.created_at as job_created_at,
             j.updated_at as job_updated_at
      FROM health_reports r
      JOIN health_report_jobs j ON r.job_id = j.id
      WHERE r.id = ? AND r.user_id = ? AND r.deleted_at IS NULL
    `)
    .bind(reportId, userId)
    .first();

  if (!result) return null;

  const report = mapReportRow(result);
  const job: ReportJob = {
    id: result.job_id as string,
    userId: result.job_user_id as string,
    scheduleId: result.job_schedule_id as string | null,
    reportType: result.job_report_type as ReportType,
    periodStart: result.job_period_start as string,
    periodEnd: result.job_period_end as string,
    timezone: result.job_timezone as string,
    locale: result.job_locale as SupportedLocale,
    status: result.job_status as ReportStatus,
    idempotencyKey: result.job_idempotency_key as string,
    attemptCount: result.job_attempt_count as number,
    errorCategory: result.job_error_category as string | null,
    startedAt: result.job_started_at as number | null,
    completedAt: result.job_completed_at as number | null,
    createdAt: result.job_created_at as number,
    updatedAt: result.job_updated_at as number,
  };

  return { ...report, job };
}

/**
 * Mark report as deleted (soft delete)
 */
export async function deleteReport(
  db: D1Database,
  reportId: string,
  userId: string
): Promise<boolean> {
  const now = Date.now();

  const result = await db
    .prepare(`
      UPDATE health_reports
      SET deleted_at = ?
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `)
    .bind(now, reportId, userId)
    .run();

  return result.success;
}

/**
 * Get expired reports for cleanup
 */
export async function getExpiredReports(
  db: D1Database,
  limit: number = 100
): Promise<HealthReport[]> {
  const result = await db
    .prepare(`
      SELECT * FROM health_reports
      WHERE expires_at < ? AND deleted_at IS NULL
      ORDER BY expires_at ASC
      LIMIT ?
    `)
    .bind(Date.now(), limit)
    .all();

  return result.results.map(mapReportRow);
}

/**
 * Mark reports as expired
 */
export async function markReportsAsExpired(
  db: D1Database,
  reportIds: string[]
): Promise<void> {
  if (reportIds.length === 0) return;

  const placeholders = reportIds.map(() => '?').join(',');
  await db
    .prepare(`
      UPDATE health_reports
      SET deleted_at = ?
      WHERE id IN (${placeholders})
    `)
    .bind(Date.now(), ...reportIds)
    .run();
}

// =============================================================================
// Helper Functions
// =============================================================================

function mapScheduleRow(row: Record<string, unknown>): ReportSchedule {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    frequency: row.frequency as ReportFrequency,
    timezone: row.timezone as string,
    deliveryDay: row.delivery_day as DeliveryDay | null,
    deliveryTime: row.delivery_time as string,
    locale: row.locale as SupportedLocale,
    emailEnabled: Boolean(row.email_enabled),
    status: row.status as ScheduleStatus,
    nextRunAt: row.next_run_at as number | null,
    lastRunAt: row.last_run_at as number | null,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

function mapJobRow(row: Record<string, unknown>): ReportJob {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    scheduleId: row.schedule_id as string | null,
    reportType: row.report_type as ReportType,
    periodStart: row.period_start as string,
    periodEnd: row.period_end as string,
    timezone: row.timezone as string,
    locale: row.locale as SupportedLocale,
    status: row.status as ReportStatus,
    idempotencyKey: row.idempotency_key as string,
    attemptCount: row.attempt_count as number,
    errorCategory: row.error_category as string | null,
    startedAt: row.started_at as number | null,
    completedAt: row.completed_at as number | null,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

function mapReportRow(row: Record<string, unknown>): HealthReport {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    jobId: row.job_id as string,
    reportVersion: row.report_version as string,
    fileName: row.file_name as string,
    r2ObjectKey: row.r2_object_key as string,
    fileSize: row.file_size as number,
    contentType: row.content_type as string,
    checksum: row.checksum as string | null,
    dataCompleteness: row.data_completeness as DataCompleteness,
    generatedAt: row.generated_at as number,
    expiresAt: row.expires_at as number,
    deletedAt: row.deleted_at as number | null,
  };
}
