-- +goose Up
-- Critical missing indexes for performance optimization
-- Migration: 0020_critical_missing_indexes
-- Based on query analysis report (2026-04-29)

-- Safeguard: Create missing tables that may not exist due to earlier migration issues

-- === workouts table (from 0000) ===
CREATE TABLE IF NOT EXISTS `workouts` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `type` text,
  `name` text,
  `duration` integer,
  `calories_burned` real,
  `start_time` integer,
  `end_time` integer,
  `notes` text,
  `metrics` text,
  `created_at` integer NOT NULL,
  `completed_at` integer,
  `status` text,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

-- === workout_routines table (from 0002) ===
CREATE TABLE IF NOT EXISTS `workout_routines` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `week_start_date` text,
  `is_active` integer DEFAULT 1,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

-- === workout_exercises table (from 0000) ===
CREATE TABLE IF NOT EXISTS `workout_exercises` (
  `id` text PRIMARY KEY NOT NULL,
  `workout_id` text NOT NULL,
  `name` text NOT NULL,
  `sets` integer,
  `reps` integer,
  `weight` real,
  `rest_time` integer,
  `notes` text,
  `order` integer,
  `rpe` real,
  FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

-- === routine_exercises table (from 0002) ===
CREATE TABLE IF NOT EXISTS `routine_exercises` (
  `id` text PRIMARY KEY NOT NULL,
  `routine_id` text NOT NULL,
  `day_of_week` integer NOT NULL,
  `exercise_name` text NOT NULL,
  `exercise_type` text,
  `target_muscle_groups` text,
  `sets` integer,
  `reps` integer,
  `weight` real,
  `rpe` real,
  `duration` integer,
  `rest_time` integer,
  `order_index` integer,
  `notes` text,
  FOREIGN KEY (`routine_id`) REFERENCES `workout_routines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

-- === food_logs table (from 0005) ===
CREATE TABLE IF NOT EXISTS `food_logs` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `meal_type` text,
  `food_item_id` text,
  `custom_name` text,
  `image_url` text,
  `estimated_portion_g` real,
  `confidence` real,
  `calories` real NOT NULL,
  `protein_g` real NOT NULL,
  `carbs_g` real NOT NULL,
  `fat_g` real NOT NULL,
  `fiber_g` real,
  `sugar_g` real,
  `logged_at` integer NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`food_item_id`) REFERENCES `food_items`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint

-- === comments table (from 0018) ===
CREATE TABLE IF NOT EXISTS `comments` (
  `id` text PRIMARY KEY NOT NULL,
  `entity_type` text NOT NULL,
  `entity_id` text NOT NULL,
  `user_id` text NOT NULL,
  `parent_id` text,
  `content` text NOT NULL,
  `mentions` text,
  `is_deleted` integer DEFAULT 0,
  `deleted_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`parent_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

-- Now add the performance indexes

-- workout_exercises: Missing foreign key index
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises (workout_id);
--> statement-breakpoint

-- routine_exercises: Missing foreign key index
CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine_id ON routine_exercises (routine_id);
--> statement-breakpoint

-- food_logs: Optimize queries with meal_type filter
-- Covers: WHERE user_id = ? AND meal_type = ? ORDER BY logged_at DESC
CREATE INDEX IF NOT EXISTS idx_food_logs_user_meal_logged ON food_logs (user_id, meal_type, logged_at DESC);
--> statement-breakpoint

-- workouts: Optimize stats queries with status + start_time filter
-- Covers: WHERE user_id = ? AND status = ? AND start_time >= ? AND end_time <= ?
CREATE INDEX IF NOT EXISTS idx_workouts_user_status_start ON workouts (user_id, status, start_time);
--> statement-breakpoint

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
-- Note: We do NOT drop the tables in Down as they may have been created by earlier migrations
