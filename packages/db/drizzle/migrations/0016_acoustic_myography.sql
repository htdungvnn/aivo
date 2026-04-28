-- +goose Up
-- Create acoustic_baselines table for storing muscle baseline measurements
CREATE TABLE IF NOT EXISTS acoustic_baselines (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  muscle_group TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  median_frequency REAL NOT NULL,
  rms_amplitude REAL NOT NULL,
  spectral_entropy REAL NOT NULL,
  contraction_rate REAL NOT NULL,
  quality_score REAL NOT NULL,
  sample_rate INTEGER DEFAULT 8000,
  chunk_duration_ms INTEGER DEFAULT 500,
  ambient_noise_level REAL,
  notes TEXT,
  raw_features_json TEXT
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_acoustic_baseline_user_muscle ON acoustic_baselines(user_id, muscle_group);
CREATE UNIQUE INDEX IF NOT EXISTS unique_baseline_user_muscle ON acoustic_baselines(user_id, muscle_group);
--> statement-breakpoint

-- Create acoustic_sessions table for workout sessions with acoustic monitoring
CREATE TABLE IF NOT EXISTS acoustic_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workout_id TEXT REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_name TEXT,
  muscle_group TEXT NOT NULL,
  start_time INTEGER NOT NULL,
  end_time INTEGER,
  total_chunks INTEGER DEFAULT 0,
  valid_chunks INTEGER DEFAULT 0,
  avg_fatigue_level REAL,
  peak_fatigue_level REAL,
  fatigue_trend TEXT,
  baseline_id TEXT REFERENCES acoustic_baselines(id),
  device_type TEXT DEFAULT 'iphone',
  sample_rate INTEGER DEFAULT 8000,
  ambient_noise_level REAL,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_acoustic_session_user_time ON acoustic_sessions(user_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_acoustic_session_workout ON acoustic_sessions(workout_id);
--> statement-breakpoint

-- Create acoustic_audio_chunks table for individual audio samples
CREATE TABLE IF NOT EXISTS acoustic_audio_chunks (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES acoustic_sessions(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  timestamp INTEGER NOT NULL,
  pcm_data_key TEXT,
  features_json TEXT,
  is_valid INTEGER DEFAULT 1,
  confidence REAL,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_chunks_session_index ON acoustic_audio_chunks(session_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_chunks_timestamp ON acoustic_audio_chunks(session_id, timestamp);
--> statement-breakpoint

-- Create muscle_fatigue_readings table for latest fatigue state per muscle
CREATE TABLE IF NOT EXISTS muscle_fatigue_readings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  muscle_group TEXT NOT NULL,
  session_id TEXT REFERENCES acoustic_sessions(id) ON DELETE CASCADE,
  fatigue_level REAL NOT NULL,
  fatigue_category TEXT NOT NULL,
  median_frequency REAL,
  median_freq_shift REAL,
  confidence REAL NOT NULL,
  recommendations TEXT,
  measured_at INTEGER NOT NULL,
  session_start_time INTEGER,
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_fatigue_user_muscle ON muscle_fatigue_readings(user_id, muscle_group);
CREATE INDEX IF NOT EXISTS idx_fatigue_updated ON muscle_fatigue_readings(updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS unique_fatigue_user_muscle ON muscle_fatigue_readings(user_id, muscle_group);
--> statement-breakpoint

-- Create acoustic_fatigue_trends table for aggregated trend analytics
CREATE TABLE IF NOT EXISTS acoustic_fatigue_trends (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  period_start TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  avg_fatigue_level REAL,
  peak_fatigue_level REAL,
  recovery_rate REAL,
  sessions_count INTEGER DEFAULT 0,
  total_duration_minutes INTEGER DEFAULT 0,
  avg_workout_intensity REAL,
  correlation_with_volume REAL,
  calculated_at INTEGER NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_trend_user_period ON acoustic_fatigue_trends(user_id, period, period_start);
CREATE INDEX IF NOT EXISTS idx_trend_muscle ON acoustic_fatigue_trends(muscle_group);
--> statement-breakpoint

-- +goose Down
-- Drop indexes
DROP INDEX IF EXISTS idx_trend_muscle;
DROP INDEX IF EXISTS idx_trend_user_period;
DROP INDEX IF EXISTS unique_fatigue_user_muscle;
DROP INDEX IF EXISTS idx_fatigue_updated;
DROP INDEX IF EXISTS idx_fatigue_user_muscle;
DROP INDEX IF EXISTS idx_chunks_timestamp;
DROP INDEX IF EXISTS idx_chunks_session_index;
DROP INDEX IF EXISTS idx_acoustic_session_workout;
DROP INDEX IF EXISTS idx_acoustic_session_user_time;
DROP INDEX IF EXISTS unique_baseline_user_muscle;
DROP INDEX IF EXISTS idx_acoustic_baseline_user_muscle;
--> statement-breakpoint

-- Drop tables
DROP TABLE IF EXISTS acoustic_fatigue_trends;
DROP TABLE IF EXISTS muscle_fatigue_readings;
DROP TABLE IF EXISTS acoustic_audio_chunks;
DROP TABLE IF EXISTS acoustic_sessions;
DROP TABLE IF EXISTS acoustic_baselines;
