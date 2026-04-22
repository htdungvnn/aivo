-- Live workout session tracking for real-time AI adjustments
CREATE TABLE IF NOT EXISTS live_workout_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  workout_template_id TEXT,
  name TEXT NOT NULL,
  started_at INTEGER NOT NULL, -- Unix timestamp in milliseconds
  last_activity_at INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'completed', 'aborted')),

  -- Fatigue tracking
  fatigue_level INTEGER NOT NULL DEFAULT 0, -- 0-100 scale
  fatigue_category TEXT NOT NULL DEFAULT 'fresh', -- 'fresh', 'moderate', 'fatigued', 'exhausted'

  -- Volume tracking
  total_planned_volume REAL NOT NULL DEFAULT 0,
  total_completed_volume REAL NOT NULL DEFAULT 0,
  sets_completed INTEGER NOT NULL DEFAULT 0,
  total_planned_sets INTEGER NOT NULL DEFAULT 0,

  -- Session settings
  target_rpe REAL NOT NULL DEFAULT 8.0,
  ideal_rest_seconds INTEGER NOT NULL DEFAULT 90,
  has_spotter INTEGER NOT NULL DEFAULT 0, -- Boolean as 0/1

  -- Completion data
  ended_at INTEGER,
  total_duration_ms INTEGER,
  early_exit_reason TEXT,
  early_exit_suggestion TEXT,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Indexes for live_workout_sessions
CREATE INDEX IF NOT EXISTS idx_live_session_user_id ON live_workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_live_session_status ON live_workout_sessions(status);
CREATE INDEX IF NOT EXISTS idx_live_session_started_at ON live_workout_sessions(started_at DESC);

-- Set RPE logging for fatigue analysis
CREATE TABLE IF NOT EXISTS set_rpe_logs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  exercise_name TEXT NOT NULL,
  weight REAL, -- kg or lbs, nullable
  planned_reps INTEGER NOT NULL,
  completed_reps INTEGER NOT NULL,
  rpe REAL NOT NULL, -- 1-10 rating of effort
  rest_time_seconds INTEGER NOT NULL,
  timestamp INTEGER NOT NULL, -- when set was logged
  notes TEXT,
  created_at INTEGER NOT NULL
);

-- Indexes for set_rpe_logs
CREATE INDEX IF NOT EXISTS idx_rpe_logs_session_id ON set_rpe_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_rpe_logs_user_id ON set_rpe_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_rpe_logs_timestamp ON set_rpe_logs(timestamp DESC);

-- Foreign key constraint (SQLite doesn't enforce by default but we declare for documentation)
-- Note: D1 doesn't support foreign keys currently; application ensures referential integrity
