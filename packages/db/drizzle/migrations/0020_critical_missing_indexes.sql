-- +goose Up
-- Critical missing indexes for performance optimization
-- Migration: 0020_critical_missing_indexes
-- Based on query analysis report (2026-04-29)

-- workout_exercises: Missing foreign key index
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises (workout_id);

-- routine_exercises: Missing foreign key index
CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine_id ON routine_exercises (routine_id);

-- food_logs: Optimize queries with meal_type filter
-- Covers: WHERE user_id = ? AND meal_type = ? ORDER BY logged_at DESC
CREATE INDEX IF NOT EXISTS idx_food_logs_user_meal_logged ON food_logs (user_id, meal_type, logged_at DESC);

-- workouts: Optimize stats queries with status + start_time filter
-- Covers: WHERE user_id = ? AND status = ? AND start_time >= ? AND end_time <= ?
CREATE INDEX IF NOT EXISTS idx_workouts_user_status_start ON workouts (user_id, status, start_time);

-- comments: Optimize comment thread queries with ordering
-- Covers: WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_comments_entity_created ON comments (entity_type, entity_id, created_at DESC);

-- +goose Down

-- Drop the added indexes
DROP INDEX IF EXISTS idx_workout_exercises_workout_id;
DROP INDEX IF EXISTS idx_routine_exercises_routine_id;
DROP INDEX IF EXISTS idx_food_logs_user_meal_logged;
DROP INDEX IF EXISTS idx_workouts_user_status_start;
DROP INDEX IF EXISTS idx_comments_entity_created;
