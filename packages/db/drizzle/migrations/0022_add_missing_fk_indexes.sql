-- +goose Up
-- Migration: 0022_add_missing_fk_indexes
-- Date: 2026-04-29
-- Purpose: Add missing indexes on foreign key columns identified during schema review

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

-- === badges table (from 0000) ===
CREATE TABLE IF NOT EXISTS `badges` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `type` text,
  `name` text NOT NULL,
  `description` text NOT NULL,
  `icon` text,
  `earned_at` integer NOT NULL,
  `tier` text,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

-- === biometric_snapshots table (from 0010) ===
CREATE TABLE IF NOT EXISTS `biometric_snapshots` (
  `id` TEXT PRIMARY KEY,
  `user_id` TEXT NOT NULL,
  `period` TEXT NOT NULL,
  `generated_at` INTEGER NOT NULL,
  `valid_until` INTEGER,
  `exercise_load` TEXT,
  `sleep` TEXT,
  `nutrition` TEXT,
  `body_metrics` TEXT,
  `recovery_score` REAL,
  `warnings` TEXT,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint

-- === correlation_findings table (from 0010) ===
CREATE TABLE IF NOT EXISTS `correlation_findings` (
  `id` TEXT PRIMARY KEY,
  `user_id` TEXT NOT NULL,
  `snapshot_id` TEXT NOT NULL,
  `factor_a` TEXT NOT NULL,
  `factor_b` TEXT NOT NULL,
  `correlation_coefficient` REAL,
  `p_value` REAL,
  `confidence` REAL,
  `anomaly_threshold` REAL,
  `anomaly_count` INTEGER,
  `outlier_dates` TEXT,
  `explanation` TEXT,
  `actionable_insight` TEXT,
  `detected_at` INTEGER NOT NULL,
  `valid_until` INTEGER,
  `is_dismissed` INTEGER DEFAULT 0,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`snapshot_id`) REFERENCES `biometric_snapshots`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint

-- === clubs table (from 0018) ===
CREATE TABLE IF NOT EXISTS `clubs` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `owner_id` text NOT NULL,
  `privacy_type` text NOT NULL DEFAULT 'public',
  `avatar_url` text,
  `cover_image_url` text,
  `category` text,
  `location` text,
  `max_members` integer DEFAULT 1000,
  `requires_approval` integer DEFAULT 0,
  `allow_member_posts` integer DEFAULT 1,
  `is_active` integer DEFAULT 1,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

-- === club_events table (from 0018) ===
CREATE TABLE IF NOT EXISTS `club_events` (
  `id` text PRIMARY KEY NOT NULL,
  `club_id` text NOT NULL,
  `title` text NOT NULL,
  `description` text,
  `event_type` text NOT NULL,
  `start_time` integer NOT NULL,
  `duration_minutes` integer,
  `location` text,
  `recurrence_rule` text,
  `max_participants` integer,
  `is_cancelled` integer DEFAULT 0,
  `created_by` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

-- === daily_checkins table (from 0000) ===
CREATE TABLE IF NOT EXISTS `daily_checkins` (
  `user_id` text NOT NULL,
  `date` text NOT NULL,
  `checked_in_at` integer,
  `source` text,
  `workout_id` text,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint

-- === plan_deviations table (from 0002) ===
CREATE TABLE IF NOT EXISTS `plan_deviations` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `original_routine_id` text,
  `adjusted_routine_id` text,
  `deviation_score` real,
  `reason` text,
  `adjustments_json` text,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`original_routine_id`) REFERENCES `workout_routines`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`adjusted_routine_id`) REFERENCES `workout_routines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint

-- Now add the missing foreign key indexes

-- badges: Missing index on user_id (foreign key to users)
CREATE INDEX IF NOT EXISTS idx_badges_user_id ON badges (user_id);
--> statement-breakpoint

-- correlation_findings: Missing index on snapshot_id (foreign key to biometric_snapshots)
CREATE INDEX IF NOT EXISTS idx_findings_snapshot_id ON correlation_findings (snapshot_id);
--> statement-breakpoint

-- plan_deviations: Missing index on adjusted_routine_id (foreign key to workout_routines)
CREATE INDEX IF NOT EXISTS idx_plan_deviations_adjusted_routine ON plan_deviations (adjusted_routine_id);
--> statement-breakpoint

-- club_events: Missing index on created_by (foreign key to users)
CREATE INDEX IF NOT EXISTS idx_club_events_created_by ON club_events (created_by);
--> statement-breakpoint

-- daily_checkins: Missing index on workout_id (foreign key to workouts)
CREATE INDEX IF NOT EXISTS idx_daily_checkins_workout_id ON daily_checkins (workout_id);

-- +goose Down
-- Drop the added indexes
DROP INDEX IF EXISTS idx_badges_user_id;
DROP INDEX IF EXISTS idx_findings_snapshot_id;
DROP INDEX IF EXISTS idx_plan_deviations_adjusted_routine;
DROP INDEX IF EXISTS idx_club_events_created_by;
DROP INDEX IF EXISTS idx_daily_checkins_workout_id;
-- Note: We do NOT drop the tables in Down as they may have been created by earlier migrations
