-- +goose Up
-- Health Data Schema Optimization - Time-series query performance
-- Migration: 0019_health_optimizations
-- Optimizes sensor_data_snapshots and sleep_logs for edge performance

--> statement-breakpoint
-- Add covering index for latest snapshot per period (daily, hourly, weekly)
-- This optimizes queries like: "Get latest daily steps" or "Get latest hourly HR"
CREATE INDEX IF NOT EXISTS idx_sensor_snapshot_user_period_time ON sensor_data_snapshots(user_id, period, timestamp DESC);

-- +goose Down

--> statement-breakpoint
DROP INDEX IF EXISTS idx_sensor_snapshot_user_period_time;
