-- Migration: 0001_initial_health_schema
-- Description: Initial health and readiness schema for Daily Intelligence

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- =============================================================================
-- DAILY READINESS SNAPSHOTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS daily_readiness_snapshots (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    timezone TEXT NOT NULL DEFAULT 'UTC',
    score INTEGER NOT NULL,
    level TEXT NOT NULL CHECK(level IN ('low', 'moderate', 'good', 'high')),
    confidence REAL NOT NULL,
    data_completeness REAL NOT NULL,
    factors_json TEXT NOT NULL, -- JSON array of ReadinessFactor
    recommendation_json TEXT NOT NULL, -- JSON object
    input_snapshot_json TEXT NOT NULL, -- JSON object of key inputs
    source_data_timestamps_json TEXT NOT NULL DEFAULT '{}', -- JSON object
    algorithm_version TEXT NOT NULL DEFAULT '1.0.0',
    idempotency_key TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_readiness_user_date ON daily_readiness_snapshots(user_id, date);
CREATE INDEX IF NOT EXISTS idx_readiness_score ON daily_readiness_snapshots(score);
CREATE INDEX IF NOT EXISTS idx_readiness_level ON daily_readiness_snapshots(level);
CREATE INDEX IF NOT EXISTS idx_readiness_created_at ON daily_readiness_snapshots(created_at);
CREATE INDEX IF NOT EXISTS idx_readiness_algorithm ON daily_readiness_snapshots(algorithm_version);

-- =============================================================================
-- READINESS FACTOR SNAPSHOTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS readiness_factor_snapshots (
    id TEXT PRIMARY KEY,
    readiness_snapshot_id TEXT NOT NULL,
    factor_code TEXT NOT NULL,
    score REAL NOT NULL,
    weight REAL NOT NULL,
    contribution REAL NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('negative', 'neutral', 'positive')),
    message_key TEXT NOT NULL,
    value REAL,
    unit TEXT,
    source TEXT,
    confidence REAL NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (readiness_snapshot_id) REFERENCES daily_readiness_snapshots(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_factor_snapshot_readiness ON readiness_factor_snapshots(readiness_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_factor_snapshot_code ON readiness_factor_snapshots(factor_code);
CREATE INDEX IF NOT EXISTS idx_factor_snapshot_created ON readiness_factor_snapshots(created_at);

-- =============================================================================
-- DAILY INTELLIGENCE SNAPSHOTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS daily_intelligence_snapshots (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    timezone TEXT NOT NULL DEFAULT 'UTC',
    
    -- Readiness summary
    readiness_score INTEGER NOT NULL,
    readiness_level TEXT NOT NULL,
    readiness_confidence REAL NOT NULL,
    readiness_factors_json TEXT NOT NULL,
    
    -- Next action
    next_action_json TEXT NOT NULL,
    
    -- Today's plan
    today_plan_json TEXT NOT NULL,
    
    -- Current status (JSON summaries)
    current_nutrition_json TEXT NOT NULL,
    current_activity_json TEXT NOT NULL,
    current_recovery_json TEXT NOT NULL,
    
    -- AI insight (cached)
    ai_insight_json TEXT,
    ai_insight_prompt_version TEXT,
    
    -- Data quality
    data_completeness REAL NOT NULL,
    last_sync_at INTEGER NOT NULL,
    
    -- Metadata
    idempotency_key TEXT NOT NULL,
    algorithm_version TEXT NOT NULL DEFAULT '1.0.0',
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_intelligence_user_date ON daily_intelligence_snapshots(user_id, date);
CREATE INDEX IF NOT EXISTS idx_intelligence_score ON daily_intelligence_snapshots(readiness_score);
CREATE INDEX IF NOT EXISTS idx_intelligence_created_at ON daily_intelligence_snapshots(created_at);

-- =============================================================================
-- DAILY PLAN ADAPTATIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS daily_plan_adaptations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    original_plan_id TEXT,
    adaptation_type TEXT NOT NULL CHECK(adaptation_type IN (
        'intensity', 'volume', 'exercise_selection', 'timing', 'recovery'
    )),
    status TEXT NOT NULL DEFAULT 'recommended' CHECK(status IN (
        'recommended', 'accepted', 'rejected', 'restored'
    )),
    
    -- What was changed
    field TEXT NOT NULL,
    original_value TEXT, -- Can be string or number as JSON
    adapted_value TEXT NOT NULL, -- Can be string or number as JSON
    
    -- Reason for change
    reason TEXT NOT NULL,
    readiness_score INTEGER NOT NULL,
    contributing_factors_json TEXT NOT NULL DEFAULT '[]', -- JSON array of factor codes
    
    -- User decision
    accepted_at INTEGER,
    rejected_at INTEGER,
    restored_at INTEGER,
    
    -- Metadata
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_adaptation_user_date ON daily_plan_adaptations(user_id, date);
CREATE INDEX IF NOT EXISTS idx_adaptation_status ON daily_plan_adaptations(status);
CREATE INDEX IF NOT EXISTS idx_adaptation_type ON daily_plan_adaptations(adaptation_type);
CREATE INDEX IF NOT EXISTS idx_adaptation_original_plan ON daily_plan_adaptations(original_plan_id);
CREATE INDEX IF NOT EXISTS idx_adaptation_created_at ON daily_plan_adaptations(created_at);

-- =============================================================================
-- DAILY ACTIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS daily_actions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    action_type TEXT NOT NULL CHECK(action_type IN (
        'start_workout', 'light_workout', 'recovery', 'rest', 'add_protein',
        'drink_water', 'short_walk', 'prepare_sleep', 'complete_checkin'
    )),
    priority INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'skipped')),
    completed_at INTEGER,
    skipped_at INTEGER,
    skip_reason TEXT,
    metadata_json TEXT NOT NULL DEFAULT '{}', -- JSON object
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_actions_user_date ON daily_actions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_actions_status ON daily_actions(status);
CREATE INDEX IF NOT EXISTS idx_actions_priority ON daily_actions(priority);
CREATE INDEX IF NOT EXISTS idx_actions_type ON daily_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_actions_created_at ON daily_actions(created_at);

-- =============================================================================
-- HEALTH METRIC DAILY SUMMARIES
-- =============================================================================

CREATE TABLE IF NOT EXISTS health_metric_daily_summaries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    timezone TEXT NOT NULL DEFAULT 'UTC',
    metric_code TEXT NOT NULL,
    
    -- Values
    value REAL,
    unit TEXT NOT NULL,
    target REAL,
    
    -- Quality indicators
    confidence REAL NOT NULL DEFAULT 0,
    source TEXT NOT NULL,
    timestamp INTEGER,
    
    -- Metadata
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_health_summary_user_date_metric 
    ON health_metric_daily_summaries(user_id, date, metric_code);
CREATE INDEX IF NOT EXISTS idx_health_summary_metric ON health_metric_daily_summaries(metric_code);
CREATE INDEX IF NOT EXISTS idx_health_summary_date ON health_metric_daily_summaries(date);
CREATE INDEX IF NOT EXISTS idx_health_summary_created ON health_metric_daily_summaries(created_at);

-- =============================================================================
-- USER CHECK-INS
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_check_ins (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    timezone TEXT NOT NULL DEFAULT 'UTC',
    
    -- Self-reported values (1-10 scale for most, 0-10 for soreness)
    energy INTEGER CHECK(energy BETWEEN 1 AND 10),
    stress INTEGER CHECK(stress BETWEEN 1 AND 10),
    sleep_quality INTEGER CHECK(sleep_quality BETWEEN 1 AND 10),
    muscle_soreness INTEGER CHECK(muscle_soreness BETWEEN 0 AND 10),
    
    -- Notes
    notes TEXT,
    
    -- Completion
    completed INTEGER NOT NULL DEFAULT 0,
    completed_at INTEGER,
    
    -- Metadata
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_checkin_user_date ON user_check_ins(user_id, date);
CREATE INDEX IF NOT EXISTS idx_checkin_completed ON user_check_ins(completed);
CREATE INDEX IF NOT EXISTS idx_checkin_created_at ON user_check_ins(created_at);

-- =============================================================================
-- CHART AGGREGATION SNAPSHOTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS chart_aggregation_snapshots (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    metric_code TEXT NOT NULL,
    range_type TEXT NOT NULL CHECK(range_type IN ('1d', '7d', '30d', '90d', '1y')),
    
    -- Aggregated data
    points_json TEXT NOT NULL, -- JSON array of {timestamp, value, target, confidence}
    summary_json TEXT NOT NULL, -- JSON object with avg, min, max, changePercent
    
    -- Config
    target REAL,
    unit TEXT NOT NULL,
    
    -- Metadata
    generated_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chart_snapshot_user_date_metric_range 
    ON chart_aggregation_snapshots(user_id, date, metric_code, range_type);
CREATE INDEX IF NOT EXISTS idx_chart_snapshot_metric ON chart_aggregation_snapshots(metric_code);
CREATE INDEX IF NOT EXISTS idx_chart_snapshot_range ON chart_aggregation_snapshots(range_type);
CREATE INDEX IF NOT EXISTS idx_chart_snapshot_expires ON chart_aggregation_snapshots(expires_at);
CREATE INDEX IF NOT EXISTS idx_chart_snapshot_created ON chart_aggregation_snapshots(created_at);

-- =============================================================================
-- AI INSIGHT CACHE
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_insight_cache (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    snapshot_id TEXT NOT NULL,
    insight_type TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    
    -- Cached content
    content_json TEXT NOT NULL, -- JSON object with insight text and metadata
    
    -- Cache management
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    expires_at INTEGER NOT NULL,
    
    FOREIGN KEY (snapshot_id) REFERENCES daily_intelligence_snapshots(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_user ON ai_insight_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_cache_snapshot ON ai_insight_cache(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_ai_cache_type ON ai_insight_cache(insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_insight_cache(expires_at);

-- =============================================================================
-- USER HEALTH TARGETS
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_health_targets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    
    -- Activity targets
    steps_target INTEGER NOT NULL DEFAULT 10000,
    active_minutes_target INTEGER NOT NULL DEFAULT 30,
    
    -- Hydration
    hydration_ml_target INTEGER NOT NULL DEFAULT 2000,
    
    -- Sleep
    sleep_hours_target REAL NOT NULL DEFAULT 8.0,
    
    -- Cardiovascular
    resting_hr_max INTEGER,
    resting_hr_min INTEGER,
    hrv_min INTEGER,
    
    -- Body
    weight_target REAL,
    body_fat_target REAL,
    
    -- Nutrition
    calories_target INTEGER DEFAULT 2000,
    protein_g_target INTEGER DEFAULT 150,
    carbs_g_target INTEGER DEFAULT 250,
    fat_g_target INTEGER DEFAULT 65,
    
    -- Goals
    primary_goal TEXT CHECK(primary_goal IN ('fat_loss', 'muscle_gain', 'general_fitness', 'maintenance')),
    
    -- Metadata
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_health_targets_user ON user_health_targets(user_id);

-- =============================================================================
-- USER HABITS
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_habits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    target TEXT NOT NULL, -- e.g., "2 liters daily" or "30 minutes"
    category TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_habits_user ON user_habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_active ON user_habits(is_active);

-- =============================================================================
-- DAILY HABIT COMPLETIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS daily_habit_completions (
    id TEXT PRIMARY KEY,
    habit_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    completed INTEGER NOT NULL DEFAULT 0,
    completed_at INTEGER,
    value REAL, -- For numeric habits (e.g., liters of water)
    notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    
    FOREIGN KEY (habit_id) REFERENCES user_habits(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_completion_user_date_habit 
    ON daily_habit_completions(user_id, date, habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_completion_date ON daily_habit_completions(date);
CREATE INDEX IF NOT EXISTS idx_habit_completion_habit ON daily_habit_completions(habit_id);

-- =============================================================================
-- HYDRATION TRACKING
-- =============================================================================

CREATE TABLE IF NOT EXISTS hydration_entries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    amount_ml INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual',
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_hydration_user_date ON hydration_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_hydration_timestamp ON hydration_entries(timestamp);

-- =============================================================================
-- INDEXES FOR QUERIES
-- =============================================================================

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_health_data_user_date ON health_metric_daily_summaries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_readiness_history ON daily_readiness_snapshots(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_intelligence_history ON daily_intelligence_snapshots(user_id, date DESC);
