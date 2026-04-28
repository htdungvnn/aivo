-- +goose Up
-- Create body_avatar_models table for digital twin avatar storage
CREATE TABLE IF NOT EXISTS body_avatar_models (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  -- Current body composition snapshot
  current_weight REAL,
  current_body_fat_pct REAL,
  current_muscle_mass REAL,
  height_cm REAL,
  age_years INTEGER,
  gender TEXT,

  -- Somatotype classification
  somatotype TEXT,
  somatotype_confidence REAL,

  -- Morph targets for current body state (JSON)
  morph_targets_json TEXT,

  -- Avatar rendering preferences
  avatar_style TEXT DEFAULT 'realistic',
  skin_tone TEXT,
  show_muscle_definitions INTEGER DEFAULT 1
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_avatar_user_id ON body_avatar_models(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS unique_avatar_user ON body_avatar_models(user_id);
--> statement-breakpoint

-- Create body_projections table for digital twin projection results
CREATE TABLE IF NOT EXISTS body_projections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,

  -- Projection parameters
  time_horizon_days INTEGER NOT NULL,
  adherence_factor REAL,

  -- Base projection (without adherence adjustment)
  base_projection_json TEXT,

  -- Adjusted projection (with adherence factor applied)
  adjusted_projection_json TEXT,

  -- Projected body composition at target date
  projected_weight REAL,
  projected_body_fat_pct REAL,
  projected_muscle_mass REAL,
  confidence REAL,

  -- Scenario bounds
  best_case_weight REAL,
  worst_case_weight REAL,
  scenario_spread REAL,

  -- Morph targets for the projected state (for avatar animation)
  morph_targets_json TEXT,

  -- AI-generated narrative explaining the projection
  narrative TEXT,

  -- Metadata
  generated_by TEXT DEFAULT 'wasm',
  cache_key TEXT,
  expires_at INTEGER
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_projection_user_created ON body_projections(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projection_cache_key ON body_projections(cache_key);
CREATE INDEX IF NOT EXISTS idx_projection_expires ON body_projections(expires_at);
--> statement-breakpoint

-- +goose Down
-- Drop indexes
DROP INDEX IF EXISTS idx_projection_expires;
DROP INDEX IF EXISTS idx_projection_cache_key;
DROP INDEX IF EXISTS idx_projection_user_created;
DROP INDEX IF EXISTS unique_avatar_user;
DROP INDEX IF EXISTS idx_avatar_user_id;
--> statement-breakpoint

-- Drop tables
DROP TABLE IF EXISTS body_projections;
DROP TABLE IF EXISTS body_avatar_models;
