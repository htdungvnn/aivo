-- +goose Up
ALTER TABLE users ADD COLUMN receive_monthly_reports INTEGER DEFAULT 1;

-- +goose Down
-- SQLite doesn't support DROP COLUMN directly, but since this is just adding a column with a default,
-- we can't easily rollback. In production, we'd need to recreate the table.
-- For development purposes, we'll note that rollback requires table recreation.
