-- +goose Up
-- Migration: 0021_storage_optimizations_and_constraints
-- Date: 2026-04-29
-- Purpose: Add critical constraints and indexes for D1 performance optimization

-- 1. Add composite primary key/unique constraint on daily_nutrition_summaries
-- This ensures data integrity and improves query performance for daily summaries
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_nutrition_summaries_user_date ON daily_nutrition_summaries (user_id, date);

-- 2. Add index on body_heatmaps for efficient user queries with chronological ordering
-- Optimizes: WHERE userId = ? ORDER BY createdAt DESC
CREATE INDEX IF NOT EXISTS idx_body_heatmaps_user_created ON body_heatmaps (user_id, created_at DESC);

-- 3. Add index on body_photos for efficient user queries with chronological ordering
-- Optimizes: WHERE userId = ? ORDER BY upload_date DESC
CREATE INDEX IF NOT EXISTS idx_body_photos_user_uploaded ON body_photos (user_id, upload_date DESC);

-- +goose Down

-- Drop the added indexes
DROP INDEX IF EXISTS idx_daily_nutrition_summaries_user_date;
DROP INDEX IF EXISTS idx_body_heatmaps_user_created;
DROP INDEX IF EXISTS idx_body_photos_user_uploaded;
