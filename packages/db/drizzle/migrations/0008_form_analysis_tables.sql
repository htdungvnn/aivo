-- Create form_analysis_videos table
CREATE TABLE IF NOT EXISTS form_analysis_videos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  exercise_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  video_key TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  frame_count INTEGER,
  duration_seconds INTEGER,
  metadata TEXT, -- JSON
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for user queries
CREATE INDEX IF NOT EXISTS form_analysis_videos_user_id_idx ON form_analysis_videos(user_id);
CREATE INDEX IF NOT EXISTS form_analysis_videos_status_idx ON form_analysis_videos(status);
CREATE INDEX IF NOT EXISTS form_analysis_videos_created_at_idx ON form_analysis_videos(created_at);

-- Create form_analyses table (completed analysis results)
CREATE TABLE IF NOT EXISTS form_analyses (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  exercise_type TEXT NOT NULL,
  status TEXT NOT NULL,
  overall_score REAL NOT NULL,
  grade TEXT NOT NULL,
  issues TEXT NOT NULL, -- JSON array
  corrections TEXT NOT NULL, -- JSON array
  summary_JSON TEXT NOT NULL, -- JSON with strengths, primaryConcern, priority
  frame_analysis_JSON TEXT, -- JSON with keyFrames array
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  processing_time_ms INTEGER,
  FOREIGN KEY (video_id) REFERENCES form_analysis_videos(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS form_analyses_user_id_idx ON form_analyses(user_id);
CREATE INDEX IF NOT EXISTS form_analyses_created_at_idx ON form_analyses(created_at);
CREATE INDEX IF NOT EXISTS form_analyses_grade_idx ON form_analyses(grade);

-- Add expo_push_token column to users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users_new (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  height REAL,
  weight REAL,
  resting_heart_rate INTEGER,
  max_heart_rate INTEGER,
  fitness_level TEXT,
  goals TEXT, -- JSON array
  picture TEXT,
  email_verified INTEGER DEFAULT 0,
  onboarding_completed INTEGER DEFAULT 0,
  receive_monthly_reports INTEGER DEFAULT 1,
  expo_push_token TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Copy data from old users table if it exists
INSERT INTO users_new (id, email, name, age, gender, height, weight, resting_heart_rate, max_heart_rate, fitness_level, goals, picture, created_at, updated_at)
SELECT id, email, name, age, gender, height, weight, resting_heart_rate, max_heart_rate, fitness_level, goals, picture, created_at, updated_at
FROM users
WHERE EXISTS (SELECT 1 FROM users LIMIT 1);

-- Drop old table and rename new one
DROP TABLE IF EXISTS users;
ALTER TABLE users_new RENAME TO users;

-- Ensure indexes
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_created_at_idx ON users(created_at);
CREATE INDEX IF NOT EXISTS users_fitness_level_idx ON users(fitness_level);
