-- +goose Up
-- Migration: 0021_storage_optimizations_and_constraints
-- Date: 2026-04-29
-- Purpose: Add critical constraints and indexes for D1 performance optimization

-- Safeguard: Create missing tables that may not exist due to earlier migration issues

-- === body_heatmaps table (from 0000) ===
CREATE TABLE IF NOT EXISTS `body_heatmaps` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `timestamp` integer NOT NULL,
  `image_url` text,
  `vector_data` text,
  `metadata` text,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

-- === body_photos table (from 0002) ===
CREATE TABLE IF NOT EXISTS `body_photos` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `r2_url` text NOT NULL,
  `thumbnail_url` text,
  `upload_date` integer DEFAULT 0 NOT NULL,
  `analysis_status` text(20) DEFAULT 'pending' NOT NULL,
  `pose_detected` integer DEFAULT 0,
  `metadata` text,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

-- === daily_nutrition_summaries table (from 0005) ===
CREATE TABLE IF NOT EXISTS `daily_nutrition_summaries` (
  `user_id` text NOT NULL,
  `date` text NOT NULL,
  `total_calories` real DEFAULT 0,
  `total_protein_g` real DEFAULT 0,
  `total_carbs_g` real DEFAULT 0,
  `total_fat_g` real DEFAULT 0,
  `total_fiber_g` real,
  `total_sugar_g` real,
  `food_log_count` integer DEFAULT 0,
  `updated_at` integer NOT NULL,
  PRIMARY KEY (`user_id`, `date`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

-- Now add the performance indexes

-- 1. Add composite primary key/unique constraint on daily_nutrition_summaries
-- This ensures data integrity and improves query performance for daily summaries
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_nutrition_summaries_user_date ON daily_nutrition_summaries (user_id, date);
--> statement-breakpoint

-- 2. Add index on body_heatmaps for efficient user queries with chronological ordering
-- Optimizes: WHERE userId = ? ORDER BY createdAt DESC
CREATE INDEX IF NOT EXISTS idx_body_heatmaps_user_created ON body_heatmaps (user_id, created_at DESC);
--> statement-breakpoint

-- 3. Add index on body_photos for efficient user queries with chronological ordering
-- Optimizes: WHERE userId = ? ORDER BY upload_date DESC
CREATE INDEX IF NOT EXISTS idx_body_photos_user_uploaded ON body_photos (user_id, upload_date DESC);

-- +goose Down
-- Drop the added indexes
DROP INDEX IF EXISTS idx_daily_nutrition_summaries_user_date;
DROP INDEX IF EXISTS idx_body_heatmaps_user_created;
DROP INDEX IF EXISTS idx_body_photos_user_uploaded;
-- Note: We do NOT drop the tables in Down as they may have been created by earlier migrations
