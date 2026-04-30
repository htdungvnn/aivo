-- +goose Up
-- Adding comprehensive indexes for performance optimization on Cloudflare D1

-- Ensure muscle_fatigue_readings table exists (safeguard for migration ordering)
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

-- Muscle Fatigue Readings indexes
CREATE INDEX IF NOT EXISTS idx_fatigue_session ON muscle_fatigue_readings (session_id);
CREATE INDEX IF NOT EXISTS idx_fatigue_measured ON muscle_fatigue_readings (user_id, measured_at DESC);
--> statement-breakpoint

-- Activity Events indexes
CREATE INDEX IF NOT EXISTS idx_activity_events_user_id ON activity_events (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_workout_id ON activity_events (workout_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_server_time ON activity_events (server_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_type ON activity_events (type);
--> statement-breakpoint

-- AI Recommendations indexes
CREATE INDEX IF NOT EXISTS idx_ai_recs_user_id ON ai_recommendations (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recs_created ON ai_recommendations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_recs_unread ON ai_recommendations (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_ai_recs_type ON ai_recommendations (type);
--> statement-breakpoint

-- Body Metrics indexes
CREATE INDEX IF NOT EXISTS idx_body_metrics_user_id ON body_metrics (user_id);
CREATE INDEX IF NOT EXISTS idx_body_metrics_timestamp ON body_metrics (user_id, timestamp DESC);
--> statement-breakpoint

-- Achievements indexes
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements (user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_completed ON achievements (completed);
--> statement-breakpoint

-- Plan Deviations indexes
CREATE INDEX IF NOT EXISTS idx_plan_deviations_user_id ON plan_deviations (user_id);
CREATE INDEX IF NOT EXISTS idx_plan_deviations_created ON plan_deviations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plan_deviations_original_routine ON plan_deviations (original_routine_id);
--> statement-breakpoint

-- Vision Analyses indexes
CREATE INDEX IF NOT EXISTS idx_vision_analyses_user_id ON vision_analyses (user_id);
CREATE INDEX IF NOT EXISTS idx_vision_analyses_created ON vision_analyses (created_at DESC);
--> statement-breakpoint

-- Workouts indexes
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts (user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_created ON workouts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workouts_user_status ON workouts (user_id, status);
CREATE INDEX IF NOT EXISTS idx_workouts_start_time ON workouts (user_id, start_time DESC);
--> statement-breakpoint

-- Workout Routines indexes
CREATE INDEX IF NOT EXISTS idx_routines_user_id ON workout_routines (user_id);
CREATE INDEX IF NOT EXISTS idx_routines_active ON workout_routines (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_routines_week_start ON workout_routines (user_id, week_start_date);
--> statement-breakpoint

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_provider_user ON sessions (provider, provider_user_id);
--> statement-breakpoint

-- Form Analysis Videos indexes (updated)
CREATE INDEX IF NOT EXISTS idx_form_videos_user_status ON form_analysis_videos (user_id, status);
--> statement-breakpoint

-- Form Analyses indexes (updated)
CREATE INDEX IF NOT EXISTS idx_form_analyses_exercise ON form_analyses (user_id, exercise_type);
--> statement-breakpoint

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations (user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations (created_at DESC);
--> statement-breakpoint

-- Food Logs indexes (updated)
CREATE INDEX IF NOT EXISTS idx_food_logs_user_id ON food_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_food_logs_logged ON food_logs (user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_logs_food_item ON food_logs (food_item_id);
CREATE INDEX IF NOT EXISTS idx_food_logs_meal_type ON food_logs (user_id, meal_type);
--> statement-breakpoint

-- Body Heatmap History index
CREATE INDEX IF NOT EXISTS idx_heatmap_id ON body_heatmap_history (heatmap_id);
--> statement-breakpoint

-- Shareable Content indexes
CREATE INDEX IF NOT EXISTS idx_shareable_user_id ON shareable_content (user_id);
CREATE INDEX IF NOT EXISTS idx_shareable_created ON shareable_content (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shareable_public ON shareable_content (is_public);
--> statement-breakpoint

-- Social Proof Cards indexes
CREATE INDEX IF NOT EXISTS idx_social_proof_user_id ON social_proof_cards (user_id);
CREATE INDEX IF NOT EXISTS idx_social_proof_created ON social_proof_cards (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_proof_public ON social_proof_cards (is_public);
--> statement-breakpoint

-- User Analytics indexes
CREATE INDEX IF NOT EXISTS idx_user_analytics_risk ON user_analytics (retention_risk);
CREATE INDEX IF NOT EXISTS idx_user_analytics_last_active ON user_analytics (last_active);
--> statement-breakpoint

-- Nutrition Consults indexes (updated)
CREATE INDEX IF NOT EXISTS idx_nutrition_consults_session ON nutrition_consults (session_id);
--> statement-breakpoint

-- Daily Schedules indexes
CREATE INDEX IF NOT EXISTS idx_daily_schedules_user_date ON daily_schedules (user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_schedules_routine ON daily_schedules (routine_id);
--> statement-breakpoint

-- Sleep Logs index (additional)
CREATE INDEX IF NOT EXISTS idx_sleep_created ON sleep_logs (created_at DESC);
--> statement-breakpoint

-- Workout Completions indexes (updated)
CREATE INDEX IF NOT EXISTS idx_workout_completions_created ON workout_completions (created_at DESC);
--> statement-breakpoint

-- Body Insights index (additional)
CREATE INDEX IF NOT EXISTS idx_body_insights_user_time ON body_insights (user_id, timestamp DESC);
--> statement-breakpoint

-- Body Photos indexes (already exists but ensuring consistency)
CREATE INDEX IF NOT EXISTS idx_body_photos_upload_date ON body_photos (upload_date DESC);

-- +goose Down
-- Comprehensive index cleanup for performance optimization

-- Activity Events indexes
DROP INDEX IF EXISTS idx_activity_events_user_id;
DROP INDEX IF EXISTS idx_activity_events_workout_id;
DROP INDEX IF EXISTS idx_activity_events_server_time;
DROP INDEX IF EXISTS idx_activity_events_type;

-- AI Recommendations indexes
DROP INDEX IF EXISTS idx_ai_recs_user_id;
DROP INDEX IF EXISTS idx_ai_recs_created;
DROP INDEX IF EXISTS idx_ai_recs_unread;
DROP INDEX IF EXISTS idx_ai_recs_type;

-- Body Metrics indexes
DROP INDEX IF EXISTS idx_body_metrics_user_id;
DROP INDEX IF EXISTS idx_body_metrics_timestamp;

-- Achievements indexes
DROP INDEX IF EXISTS idx_achievements_user_id;
DROP INDEX IF EXISTS idx_achievements_completed;

-- Plan Deviations indexes
DROP INDEX IF EXISTS idx_plan_deviations_user_id;
DROP INDEX IF EXISTS idx_plan_deviations_created;
DROP INDEX IF EXISTS idx_plan_deviations_original_routine;

-- Vision Analyses indexes
DROP INDEX IF EXISTS idx_vision_analyses_user_id;
DROP INDEX IF EXISTS idx_vision_analyses_created;

-- Workouts indexes
DROP INDEX IF EXISTS idx_workouts_user_id;
DROP INDEX IF EXISTS idx_workouts_created;
DROP INDEX IF EXISTS idx_workouts_user_status;
DROP INDEX IF EXISTS idx_workouts_start_time;

-- Workout Routines indexes
DROP INDEX IF EXISTS idx_routines_user_id;
DROP INDEX IF EXISTS idx_routines_active;
DROP INDEX IF EXISTS idx_routines_week_start;

-- Sessions indexes
DROP INDEX IF EXISTS idx_sessions_user_id;
DROP INDEX IF EXISTS idx_sessions_created;
DROP INDEX IF EXISTS idx_sessions_provider_user;

-- Form Analysis Videos indexes
DROP INDEX IF EXISTS idx_form_videos_user_status;

-- Form Analyses indexes
DROP INDEX IF EXISTS idx_form_analyses_exercise;

-- Conversations indexes
DROP INDEX IF EXISTS idx_conversations_user_id;
DROP INDEX IF EXISTS idx_conversations_created;

-- Food Logs indexes
DROP INDEX IF EXISTS idx_food_logs_user_id;
DROP INDEX IF EXISTS idx_food_logs_logged;
DROP INDEX IF EXISTS idx_food_logs_food_item;
DROP INDEX IF EXISTS idx_food_logs_meal_type;

-- Body Heatmap History index
DROP INDEX IF EXISTS idx_heatmap_id;

-- Shareable Content indexes
DROP INDEX IF EXISTS idx_shareable_user_id;
DROP INDEX IF EXISTS idx_shareable_created;
DROP INDEX IF EXISTS idx_shareable_public;

-- Social Proof Cards indexes
DROP INDEX IF EXISTS idx_social_proof_user_id;
DROP INDEX IF EXISTS idx_social_proof_created;
DROP INDEX IF EXISTS idx_social_proof_public;

-- User Analytics indexes
DROP INDEX IF EXISTS idx_user_analytics_risk;
DROP INDEX IF EXISTS idx_user_analytics_last_active;

-- Nutrition Consults indexes
DROP INDEX IF EXISTS idx_nutrition_consults_session;

-- Daily Schedules indexes
DROP INDEX IF EXISTS idx_daily_schedules_user_date;
DROP INDEX IF EXISTS idx_daily_schedules_routine;

-- Sleep Logs index
DROP INDEX IF EXISTS idx_sleep_created;

-- Workout Completions indexes
DROP INDEX IF EXISTS idx_workout_completions_created;

-- Muscle Fatigue Readings indexes
DROP INDEX IF EXISTS idx_fatigue_session;
DROP INDEX IF EXISTS idx_fatigue_measured;

-- Body Insights index
DROP INDEX IF EXISTS idx_body_insights_user_time;

-- Body Photos index
DROP INDEX IF EXISTS idx_body_photos_upload_date;
