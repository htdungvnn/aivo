-- +goose Up
-- Migration: 0022_add_missing_fk_indexes
-- Date: 2026-04-29
-- Purpose: Add missing indexes on foreign key columns identified during schema review

-- badges: Missing index on user_id (foreign key to users)
CREATE INDEX IF NOT EXISTS idx_badges_user_id ON badges (user_id);

-- correlation_findings: Missing index on snapshot_id (foreign key to biometric_snapshots)
CREATE INDEX IF NOT EXISTS idx_findings_snapshot_id ON correlation_findings (snapshot_id);

-- plan_deviations: Missing index on adjusted_routine_id (foreign key to workout_routines)
CREATE INDEX IF NOT EXISTS idx_plan_deviations_adjusted_routine ON plan_deviations (adjusted_routine_id);

-- club_events: Missing index on created_by (foreign key to users)
CREATE INDEX IF NOT EXISTS idx_club_events_created_by ON club_events (created_by);

-- daily_checkins: Missing index on workout_id (foreign key to workouts)
CREATE INDEX IF NOT EXISTS idx_daily_checkins_workout_id ON daily_checkins (workout_id);

-- +goose Down

-- Drop the added indexes
DROP INDEX IF EXISTS idx_badges_user_id;
DROP INDEX IF EXISTS idx_findings_snapshot_id;
DROP INDEX IF EXISTS idx_plan_deviations_adjusted_routine;
DROP INDEX IF EXISTS idx_club_events_created_by;
DROP INDEX IF EXISTS idx_daily_checkins_workout_id;
