-- +goose Up
-- Add AI feedback columns to form_analyses table
ALTER TABLE form_analyses ADD COLUMN ai_feedback_json TEXT;
ALTER TABLE form_analyses ADD COLUMN ai_processing_time_ms INTEGER;

-- +goose Down
-- Remove AI feedback columns from form_analyses table (SQLite doesn't support DROP COLUMN directly)
-- This would require table recreation, but for simplicity we note this limitation
-- In production, we'd create a new table and migrate data
