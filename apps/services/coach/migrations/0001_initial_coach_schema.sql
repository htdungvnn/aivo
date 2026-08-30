-- AIVO Coach Service Database Schema
-- Migration: Initial fitness and coaching schema

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- =============================================================================
-- Exercise Definitions (seed data, managed by code)
-- =============================================================================

CREATE TABLE IF NOT EXISTS exercises (
    code TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_vi TEXT NOT NULL,
    description_en TEXT NOT NULL,
    description_vi TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK(difficulty IN ('beginner', 'intermediate', 'advanced')),
    goals TEXT NOT NULL, -- JSON array
    camera_orientation TEXT NOT NULL CHECK(camera_orientation IN ('front', 'side', 'any')),
    range_of_motion_json TEXT NOT NULL, -- JSON object
    form_rules_json TEXT NOT NULL, -- JSON array of correction codes
    version TEXT NOT NULL DEFAULT '1.0.0',
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_exercises_difficulty ON exercises(difficulty);

-- =============================================================================
-- Workout Plans
-- =============================================================================

CREATE TABLE IF NOT EXISTS workout_plans (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'active', 'completed', 'archived')),
    goal TEXT NOT NULL CHECK(goal IN ('fat_loss', 'muscle_gain', 'general_fitness', 'mobility')),
    duration_weeks INTEGER NOT NULL DEFAULT 4,
    workout_days_per_week INTEGER NOT NULL DEFAULT 4,
    revision INTEGER NOT NULL DEFAULT 1,
    previous_revision_id TEXT,
    workouts_json TEXT NOT NULL DEFAULT '[]', -- JSON array of workout days
    created_with_ai INTEGER NOT NULL DEFAULT 0,
    ai_model TEXT,
    last_adjustment_reason TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    activated_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_plans_user_id ON workout_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plans_status ON workout_plans(status);
CREATE INDEX IF NOT EXISTS idx_plans_user_active ON workout_plans(user_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_plans_activated_at ON workout_plans(activated_at);

-- =============================================================================
-- Workout Sessions
-- =============================================================================

CREATE TABLE IF NOT EXISTS workout_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan_id TEXT,
    status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned', 'in_progress', 'paused', 'completed', 'cancelled', 'synced', 'failed_sync')),
    exercises_json TEXT NOT NULL DEFAULT '[]', -- JSON array of exercises
    notes TEXT,
    device_info_json TEXT, -- JSON object
    engine_version TEXT NOT NULL DEFAULT '1.0.0',
    wasm_version TEXT NOT NULL DEFAULT '1.0.0',
    idempotency_key TEXT UNIQUE,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    started_at INTEGER,
    paused_at INTEGER,
    completed_at INTEGER,
    last_sync_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_plan_id ON workout_sessions(plan_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON workout_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON workout_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_idempotency ON workout_sessions(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON workout_sessions(user_id, status) 
    WHERE status IN ('planned', 'in_progress', 'paused');

-- =============================================================================
-- Workout Sets
-- =============================================================================

CREATE TABLE IF NOT EXISTS workout_sets (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    exercise_code TEXT NOT NULL,
    set_number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'skipped', 'failed')),
    target_reps INTEGER NOT NULL,
    completed_reps INTEGER NOT NULL DEFAULT 0,
    avg_range_of_motion REAL,
    avg_quality_score REAL,
    avg_tempo_seconds REAL,
    duration_ms INTEGER,
    rest_duration_ms INTEGER DEFAULT 0,
    correction_counts_json TEXT DEFAULT '{}',
    avg_confidence REAL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sets_session_id ON workout_sets(session_id);
CREATE INDEX IF NOT EXISTS idx_sets_exercise ON workout_sets(exercise_code);
CREATE INDEX IF NOT EXISTS idx_sets_created_at ON workout_sets(created_at);

-- =============================================================================
-- Workout Reps (optional detailed rep data)
-- =============================================================================

CREATE TABLE IF NOT EXISTS workout_reps (
    id TEXT PRIMARY KEY,
    set_id TEXT NOT NULL,
    rep_number INTEGER NOT NULL,
    range_of_motion REAL,
    tempo_seconds REAL,
    quality_score REAL,
    corrections_json TEXT DEFAULT '[]',
    duration_ms INTEGER,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (set_id) REFERENCES workout_sets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reps_set_id ON workout_reps(set_id);

-- =============================================================================
-- Workout Corrections
-- =============================================================================

CREATE TABLE IF NOT EXISTS workout_corrections (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    exercise_code TEXT NOT NULL,
    set_number INTEGER,
    correction_code TEXT NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('info', 'hint', 'warning', 'critical')),
    acknowledged INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_corrections_session ON workout_corrections(session_id);
CREATE INDEX IF NOT EXISTS idx_corrections_code ON workout_corrections(correction_code);

-- =============================================================================
-- Workout Summaries (completed session aggregations)
-- =============================================================================

CREATE TABLE IF NOT EXISTS workout_summaries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    plan_id TEXT,
    created_at INTEGER NOT NULL,
    started_at INTEGER NOT NULL,
    completed_at INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    exercises_json TEXT NOT NULL, -- JSON array of exercise summaries
    total_sets INTEGER NOT NULL DEFAULT 0,
    completed_sets INTEGER NOT NULL DEFAULT 0,
    skipped_sets INTEGER NOT NULL DEFAULT 0,
    total_reps INTEGER NOT NULL DEFAULT 0,
    overall_range_of_motion REAL,
    overall_quality_score REAL,
    overall_confidence REAL,
    form_compliance_rate REAL,
    completion_percentage REAL,
    total_correction_count INTEGER DEFAULT 0,
    correction_breakdown_json TEXT DEFAULT '{}',
    user_rating INTEGER CHECK(user_rating BETWEEN 1 AND 5),
    user_notes TEXT,
    engine_version TEXT NOT NULL,
    wasm_version TEXT NOT NULL,
    validated_at INTEGER,
    validated_by TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_summaries_user_id ON workout_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_summaries_completed_at ON workout_summaries(completed_at);
CREATE INDEX IF NOT EXISTS idx_summaries_plan_id ON workout_summaries(plan_id);

-- =============================================================================
-- User Fitness Goals
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_fitness_goals (
    user_id TEXT PRIMARY KEY,
    primary_goal TEXT NOT NULL CHECK(primary_goal IN ('fat_loss', 'muscle_gain', 'general_fitness', 'mobility')),
    secondary_goals TEXT DEFAULT '[]', -- JSON array
    experience_level TEXT NOT NULL DEFAULT 'beginner' CHECK(experience_level IN ('beginner', 'intermediate', 'advanced')),
    limitations TEXT DEFAULT '[]', -- JSON array
    equipment TEXT DEFAULT '[]', -- JSON array
    preferred_workout_days TEXT DEFAULT '[]', -- JSON array of day numbers
    preferred_session_duration_ms INTEGER,
    reminder_enabled INTEGER NOT NULL DEFAULT 1,
    reminder_time TEXT, -- HH:MM format
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================================================
-- User Exercise Preferences
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_exercise_preferences (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    exercise_code TEXT NOT NULL,
    experience_level TEXT NOT NULL DEFAULT 'beginner' CHECK(experience_level IN ('beginner', 'intermediate', 'advanced')),
    personal_records_json TEXT, -- JSON object
    excluded INTEGER NOT NULL DEFAULT 0,
    exclusion_reason TEXT,
    modifications_json TEXT DEFAULT '[]', -- JSON array
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, exercise_code)
);

CREATE INDEX IF NOT EXISTS idx_prefs_user_id ON user_exercise_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_prefs_exercise ON user_exercise_preferences(exercise_code);

-- =============================================================================
-- AI Planning Jobs
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_planning_jobs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
    request_json TEXT NOT NULL, -- JSON object
    generated_plan_json TEXT,
    adjustment_reason TEXT,
    error_message TEXT,
    model TEXT,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    started_at INTEGER,
    completed_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_planning_user_id ON ai_planning_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_planning_status ON ai_planning_jobs(status);
CREATE INDEX IF NOT EXISTS idx_planning_created_at ON ai_planning_jobs(created_at);

-- =============================================================================
-- Workout Progress Summaries (periodic aggregations)
-- =============================================================================

CREATE TABLE IF NOT EXISTS workout_progress_summaries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    period_start INTEGER NOT NULL,
    period_end INTEGER NOT NULL,
    period_type TEXT NOT NULL CHECK(period_type IN ('day', 'week', 'month')),
    total_workouts INTEGER NOT NULL DEFAULT 0,
    completed_workouts INTEGER NOT NULL DEFAULT 0,
    total_duration_ms INTEGER DEFAULT 0,
    total_reps INTEGER DEFAULT 0,
    exercises_json TEXT DEFAULT '{}', -- JSON object by exercise code
    average_quality_score REAL,
    average_range_of_motion REAL,
    form_compliance_rate REAL,
    adherence_rate REAL,
    quality_trend TEXT CHECK(quality_trend IN ('improving', 'stable', 'declining')),
    volume_trend TEXT CHECK(volume_trend IN ('increasing', 'stable', 'decreasing')),
    last_updated INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_progress_user_id ON workout_progress_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_period ON workout_progress_summaries(period_start, period_end);

-- =============================================================================
-- Seed initial exercise definitions
-- =============================================================================

INSERT OR IGNORE INTO exercises (code, name_en, name_vi, description_en, description_vi, difficulty, goals, camera_orientation, range_of_motion_json, form_rules_json) VALUES
('squat', 'Squat', 'Ngồi xổm', 'A fundamental lower body exercise targeting quadriceps, hamstrings, and glutes.', 'Bài tập cơ bản cho phần thân dưới, targets cơ đùi trước, đùi sau và mông.', 'beginner', '["fat_loss", "muscle_gain", "general_fitness"]', 'front', '{"minAngle": 70, "maxAngle": 170, "requiredChange": 60, "measurementJoint": "left_knee"}', '["KNEE_COLLAPSE_INWARD", "SQUAT_NOT_DEEP_ENOUGH", "FORWARD_LEAN_TOO_MUCH", "ROUNDED_LOWER_BACK"]'),
('push_up', 'Push-up', 'Chống đẩy', 'A classic upper body exercise targeting chest, shoulders, and triceps.', 'Bài tập kinh điển cho phần thân trên, hoạt động ngực, vai và cơ tay sau.', 'intermediate', '["muscle_gain", "general_fitness"]', 'side', '{"minAngle": 80, "maxAngle": 180, "requiredChange": 60, "measurementJoint": "left_elbow"}', '["ELBOWS_FLARE_OUT", "SHOULDERS_NOT_STACKED", "HIP_SAGGING"]'),
('lunge', 'Lunge', 'Lunge', 'A unilateral leg exercise improving balance and targeting quads and glutes.', 'Bài tập một chân cải thiện thăng bằng và targets cơ đùi trước và mông.', 'intermediate', '["fat_loss", "muscle_gain", "general_fitness"]', 'front', '{"minAngle": 70, "maxAngle": 170, "requiredChange": 50, "measurementJoint": "front_knee"}', '["FRONT_KNEE_PAST_TOES", "TORSO_LEANING_FORWARD", "LUNGE_UNEVEN_DEPTH"]'),
('shoulder_press', 'Shoulder Press', 'Đẩy vai', 'An overhead pressing movement targeting deltoids and triceps.', 'Bài tập đẩy qua đầu targets cơ delta và cơ tay sau.', 'intermediate', '["muscle_gain", "general_fitness"]', 'front', '{"minAngle": 90, "maxAngle": 180, "requiredChange": 70, "measurementJoint": "left_elbow"}', '["ARCH_IN_LOWER_BACK", "PRESS_NOT_SYMMETRIC", "INCOMPLETE_LOCKOUT"]'),
('plank', 'Plank', 'Plank', 'A static core exercise building endurance and stability.', 'Bài tập tĩnh core xây dựng sức bền và ổn định.', 'beginner', '["general_fitness", "mobility"]', 'side', '{"minAngle": 150, "maxAngle": 180, "requiredChange": 5, "measurementJoint": "body_line"}', '["HIP_SAGGING", "HIP_PIKING_UP", "SHOULDERS_NOT_ALIGNED", "HEAD_DROPPING"]');
