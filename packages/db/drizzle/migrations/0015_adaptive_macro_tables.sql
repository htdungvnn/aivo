-- +goose Up
-- Create user_macro_targets table for persisted user macro overrides
CREATE TABLE IF NOT EXISTS user_macro_targets (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  calories INTEGER NOT NULL,
  protein_g INTEGER NOT NULL,
  carbs_g INTEGER NOT NULL,
  fat_g INTEGER NOT NULL,
  water_ml INTEGER DEFAULT 3000,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Create macro_adjustment_sessions table for active adjustment periods
CREATE TABLE IF NOT EXISTS macro_adjustment_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at INTEGER NOT NULL,
  last_activity_at INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active', 'paused', 'completed')),
  base_calories INTEGER,
  base_protein REAL,
  base_carbs REAL,
  base_fat REAL,
  effective_calories INTEGER,
  effective_protein REAL,
  effective_carbs REAL,
  effective_fat REAL,
  ended_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_macro_session_user ON macro_adjustment_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_macro_session_status ON macro_adjustment_sessions(status);

-- Create macro_adjustment_logs table for adjustment history
CREATE TABLE IF NOT EXISTS macro_adjustment_logs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES macro_adjustment_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  timestamp INTEGER NOT NULL,
  adjustment_type TEXT,
  calorie_change INTEGER,
  protein_change REAL,
  carbs_change REAL,
  fat_change REAL,
  reasoning TEXT,
  confidence REAL,
  urgency TEXT,
  user_accepted INTEGER DEFAULT 0,
  user_feedback TEXT
);

CREATE INDEX IF NOT EXISTS idx_macro_logs_session ON macro_adjustment_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_macro_logs_user ON macro_adjustment_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_macro_logs_timestamp ON macro_adjustment_logs(timestamp DESC);

-- Create sensor_data_snapshots table for raw sensor aggregates
CREATE TABLE IF NOT EXISTS sensor_data_snapshots (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  timestamp INTEGER NOT NULL,
  period TEXT,
  steps INTEGER,
  active_minutes INTEGER,
  avg_heart_rate REAL,
  resting_heart_rate INTEGER,
  hrv_ms INTEGER,
  hrv_rmssd REAL,
  stress_score REAL,
  source TEXT,
  raw_data TEXT
);

CREATE INDEX IF NOT EXISTS idx_sensor_snapshot_user_time ON sensor_data_snapshots(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_sensor_snapshot_period ON sensor_data_snapshots(user_id, period);

-- +goose Down
-- Drop indexes
DROP INDEX IF EXISTS idx_sensor_snapshot_period;
DROP INDEX IF EXISTS idx_sensor_snapshot_user_time;
DROP INDEX IF EXISTS idx_macro_logs_timestamp;
DROP INDEX IF EXISTS idx_macro_logs_user;
DROP INDEX IF EXISTS idx_macro_logs_session;
DROP INDEX IF EXISTS idx_macro_session_status;
DROP INDEX IF EXISTS idx_macro_session_user;

-- Drop tables
DROP TABLE IF EXISTS sensor_data_snapshots;
DROP TABLE IF EXISTS macro_adjustment_logs;
DROP TABLE IF EXISTS macro_adjustment_sessions;
DROP TABLE IF EXISTS user_macro_targets;