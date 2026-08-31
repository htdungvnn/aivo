-- Migration: 0002_health_report_schema
-- Description: Health Report system tables for scheduled and manual report generation

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- =============================================================================
-- HEALTH REPORT SCHEDULES
-- =============================================================================

CREATE TABLE IF NOT EXISTS health_report_schedules (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    frequency TEXT NOT NULL CHECK(frequency IN ('weekly', 'monthly', 'custom')),
    timezone TEXT NOT NULL DEFAULT 'UTC',
    delivery_day INTEGER CHECK(delivery_day BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday, etc.
    delivery_time TEXT NOT NULL CHECK(delivery_time LIKE '__:__'), -- HH:MM format
    locale TEXT NOT NULL DEFAULT 'en' CHECK(locale IN ('en', 'vi')),
    email_enabled INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused', 'deleted')),
    next_run_at INTEGER,
    last_run_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Index for finding due schedules (CRON job query)
CREATE INDEX IF NOT EXISTS idx_report_schedules_due 
    ON health_report_schedules(status, next_run_at) 
    WHERE status = 'active' AND next_run_at IS NOT NULL;

-- Index for user ownership
CREATE INDEX IF NOT EXISTS idx_report_schedules_user 
    ON health_report_schedules(user_id);

-- Unique constraint for single active schedule per user
-- Note: Allow multiple schedules in future versions
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_report_schedules_user_active 
--     ON health_report_schedules(user_id) 
--     WHERE status = 'active';

-- =============================================================================
-- HEALTH REPORT JOBS
-- =============================================================================

CREATE TABLE IF NOT EXISTS health_report_jobs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    schedule_id TEXT REFERENCES health_report_schedules(id) ON DELETE SET NULL,
    report_type TEXT NOT NULL CHECK(report_type IN ('weekly', 'monthly', 'custom')),
    period_start TEXT NOT NULL, -- YYYY-MM-DD
    period_end TEXT NOT NULL,   -- YYYY-MM-DD
    timezone TEXT NOT NULL DEFAULT 'UTC',
    locale TEXT NOT NULL DEFAULT 'en' CHECK(locale IN ('en', 'vi')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN (
        'pending', 'queued', 'processing', 'completed', 'failed', 'expired', 'cancelled'
    )),
    idempotency_key TEXT NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    error_category TEXT,
    started_at INTEGER,
    completed_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Unique idempotency constraint to prevent duplicate jobs
CREATE UNIQUE INDEX IF NOT EXISTS idx_report_jobs_idempotency 
    ON health_report_jobs(idempotency_key);

-- Index for user and period queries
CREATE INDEX IF NOT EXISTS idx_report_jobs_user_period 
    ON health_report_jobs(user_id, period_start, period_end);

-- Index for finding jobs by status and schedule
CREATE INDEX IF NOT EXISTS idx_report_jobs_status 
    ON health_report_jobs(status, created_at);

-- Index for schedule to jobs relationship
CREATE INDEX IF NOT EXISTS idx_report_jobs_schedule 
    ON health_report_jobs(schedule_id) 
    WHERE schedule_id IS NOT NULL;

-- =============================================================================
-- HEALTH REPORTS (Metadata only, PDF stored in R2)
-- =============================================================================

CREATE TABLE IF NOT EXISTS health_reports (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    job_id TEXT NOT NULL REFERENCES health_report_jobs(id) ON DELETE CASCADE,
    report_version TEXT NOT NULL DEFAULT '1.0.0',
    file_name TEXT NOT NULL,
    r2_object_key TEXT NOT NULL, -- Private R2 key: health-reports/{userId}/{year}/{reportId}.pdf
    file_size INTEGER NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'application/pdf',
    checksum TEXT, -- SHA-256 hash of file content
    data_completeness TEXT NOT NULL DEFAULT 'partial' CHECK(data_completeness IN ('full', 'partial', 'minimal')),
    generated_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    deleted_at INTEGER
);

-- Index for user report history
CREATE INDEX IF NOT EXISTS idx_reports_user 
    ON health_reports(user_id, generated_at DESC);

-- Index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_reports_expires 
    ON health_reports(expires_at) 
    WHERE deleted_at IS NULL;

-- Index for job relationship
CREATE INDEX IF NOT EXISTS idx_reports_job 
    ON health_reports(job_id);

-- =============================================================================
// Report Generation Queue Processing Log (Optional - for debugging)
// =============================================================================

-- This table can be used for tracking queue message processing
-- Not required for basic operation but helpful for debugging

-- CREATE TABLE IF NOT EXISTS report_queue_log (
--     id TEXT PRIMARY KEY,
--     message_id TEXT NOT NULL,
--     job_id TEXT NOT NULL,
--     action TEXT NOT NULL CHECK(action IN ('queued', 'processing', 'completed', 'failed', 'retried')),
--     error_message TEXT,
--     processed_at INTEGER NOT NULL DEFAULT (unixepoch())
-- );

-- CREATE INDEX IF NOT EXISTS idx_queue_log_message 
--     ON report_queue_log(message_id);

-- CREATE INDEX IF NOT EXISTS idx_queue_log_job 
--     ON report_queue_log(job_id);
