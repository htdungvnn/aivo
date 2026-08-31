-- Migration: 0003_event_idempotency_store
-- Description: Add event processing log table for idempotent event consumption
-- Risk: Low
-- Reversible: Yes

PRAGMA foreign_keys = ON;

-- Event processing log for idempotent consumer
CREATE TABLE IF NOT EXISTS event_processing_log (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_version INTEGER NOT NULL,
    consumer TEXT NOT NULL,
    processed_at INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('processed', 'failed')),
    result_reference TEXT,
    error_code TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Unique index on consumer + event_id for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_log_consumer_event 
    ON event_processing_log(consumer, event_id);

-- Index for finding failed events
CREATE INDEX IF NOT EXISTS idx_event_log_status 
    ON event_processing_log(status, retry_count) 
    WHERE status = 'failed';

-- Index for finding events by type
CREATE INDEX IF NOT EXISTS idx_event_log_type 
    ON event_processing_log(event_type, created_at);

--[[REVERSE:
DROP INDEX IF EXISTS idx_event_log_consumer_event;
DROP INDEX IF EXISTS idx_event_log_status;
DROP INDEX IF EXISTS idx_event_log_type;
DROP TABLE IF EXISTS event_processing_log;
]]
