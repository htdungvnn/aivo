-- +goose Up
-- Migration: 0023_add_composite_user_feed_indexes
-- Date: 2026-04-30
-- Purpose: Add missing composite indexes for optimal user feed queries
--          These indexes support common "user's items sorted by date" patterns
--
-- This migration adds composite indexes (user_id, timestamp DESC) to tables
-- that are frequently queried for a user's recent items but lack the composite index.
--
-- Based on query pattern analysis from API routes:
-- - GET /workouts (list user workouts)
-- - GET /nutrition/logs (list food logs)
-- - GET /conversations (chat history)
-- - GET /ai/recommendations (unread + recent)
-- - GET /gamification/badges (user's badges)
-- - GET /gamification/achievements (user's achievements)
-- - GET /social/feed (user's activity)
-- - GET /body/metrics (user's body measurements)
-- - etc.

-- ============================================
-- SAFEGUARDS: Create missing tables if they don't exist
-- ============================================

-- workout_templates (from 0000)
CREATE TABLE IF NOT EXISTS `workout_templates` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `name` text NOT NULL,
  `type` text,
  `duration` integer,
  `exercises` text,
  `tags` text,
  `is_public` integer DEFAULT 0,
  `popularity` real,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint

-- conversations (from 0000)
CREATE TABLE IF NOT EXISTS `conversations` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `message` text NOT NULL,
  `response` text NOT NULL,
  `context` text,
  `tokens_used` integer,
  `model` text,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint

-- ai_recommendations (from 0000)
CREATE TABLE IF NOT EXISTS `ai_recommendations` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `type` text,
  `title` text NOT NULL,
  `description` text NOT NULL,
  `confidence` real,
  `reasoning` text,
  `actions` text,
  `expires_at` integer,
  `is_read` integer DEFAULT 0,
  `is_dismissed` integer DEFAULT 0,
  `feedback` text,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint

-- badges (from 0000)
CREATE TABLE IF NOT EXISTS `badges` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `type` text,
  `name` text NOT NULL,
  `description` text NOT NULL,
  `icon` text,
  `earned_at` integer NOT NULL,
  `tier` text,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint

-- achievements (from 0000)
CREATE TABLE IF NOT EXISTS `achievements` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `type` text,
  `progress` real,
  `target` integer,
  `reward` integer,
  `completed` integer DEFAULT 0,
  `completed_at` integer,
  `claimed` integer DEFAULT 0,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint

-- social_proof_cards (from 0000)
CREATE TABLE IF NOT EXISTS `social_proof_cards` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `type` text,
  `title` text NOT NULL,
  `subtitle` text,
  `data` text,
  `shareable_image_url` text,
  `created_at` integer NOT NULL,
  `is_public` integer DEFAULT 0,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint

-- comments (from 0018)
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
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`parent_id`) REFERENCES `comments`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint

-- reactions (from 0018)
CREATE TABLE IF NOT EXISTS `reactions` (
  `id` text PRIMARY KEY NOT NULL,
  `entity_type` text NOT NULL,
  `entity_id` text NOT NULL,
  `user_id` text NOT NULL,
  `reaction_type` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint

-- point_transactions (from 0000)
CREATE TABLE IF NOT EXISTS `point_transactions` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `type` text NOT NULL,
  `amount` integer NOT NULL,
  `reason` text NOT NULL,
  `related_id` text,
  `balance_after` integer NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint

-- streak_freezes (from 0000)
CREATE TABLE IF NOT EXISTS `streak_freezes` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `purchased_at` integer NOT NULL,
  `used_at` integer,
  `used_on_date` text,
  `expires_at` integer,
  `points_spent` integer DEFAULT 50,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint

-- live_workout_sessions (from 0012)
CREATE TABLE IF NOT EXISTS `live_workout_sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `workout_template_id` text,
  `name` text NOT NULL,
  `started_at` integer NOT NULL,
  `last_activity_at` integer NOT NULL,
  `status` text NOT NULL,
  `fatigue_level` integer DEFAULT 0,
  `fatigue_category` text NOT NULL,
  `total_planned_volume` real DEFAULT 0,
  `total_completed_volume` real DEFAULT 0,
  `sets_completed` integer DEFAULT 0,
  `total_planned_sets` integer DEFAULT 0,
  `target_rpe` real DEFAULT 8.0,
  `ideal_rest_seconds` integer DEFAULT 90,
  `has_spotter` integer DEFAULT 0,
  `ended_at` integer,
  `total_duration_ms` integer,
  `early_exit_reason` text,
  `early_exit_suggestion` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint

-- set_rpe_logs (from 0012)
CREATE TABLE IF NOT EXISTS `set_rpe_logs` (
  `id` text PRIMARY KEY NOT NULL,
  `session_id` text NOT NULL,
  `user_id` text NOT NULL,
  `set_number` integer NOT NULL,
  `exercise_name` text NOT NULL,
  `weight` real,
  `planned_reps` integer NOT NULL,
  `completed_reps` integer NOT NULL,
  `rpe` real NOT NULL,
  `rest_time_seconds` integer NOT NULL,
  `timestamp` integer NOT NULL,
  `notes` text,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`session_id`) REFERENCES `live_workout_sessions`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint

-- body_photos (from 0000)
CREATE TABLE IF NOT EXISTS `body_photos` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `r2_url` text NOT NULL,
  `thumbnail_url` text,
  `upload_date` integer NOT NULL DEFAULT 0,
  `analysis_status` text NOT NULL DEFAULT 'pending',
  `pose_detected` integer DEFAULT 0,
  `metadata` text,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint

-- club_posts (from 0018)
CREATE TABLE IF NOT EXISTS `club_posts` (
  `id` text PRIMARY KEY NOT NULL,
  `club_id` text NOT NULL,
  `author_id` text NOT NULL,
  `title` text NOT NULL,
  `content` text NOT NULL,
  `is_pinned` integer DEFAULT 0,
  `is_announcement` integer DEFAULT 0,
  `like_count` integer DEFAULT 0,
  `comment_count` integer DEFAULT 0,
  `last_activity_at` integer NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint

-- challenge_participants (from 0018)
CREATE TABLE IF NOT EXISTS `challenge_participants` (
  `id` text PRIMARY KEY NOT NULL,
  `challenge_id` text NOT NULL,
  `user_id` text NOT NULL,
  `status` text NOT NULL DEFAULT 'active',
  `initial_value` real DEFAULT 0,
  `current_value` real DEFAULT 0,
  `joined_at` integer NOT NULL,
  `completed_at` integer,
  FOREIGN KEY (`challenge_id`) REFERENCES `club_challenges`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint

-- activity_events (from 0000)
CREATE TABLE IF NOT EXISTS `activity_events` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `workout_id` text,
  `type` text,
  `payload` text,
  `client_timestamp` integer NOT NULL,
  `server_timestamp` integer NOT NULL,
  `device_info` text,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint

-- notifications (from 0009)
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `type` text NOT NULL,
  `title` text NOT NULL,
  `body` text NOT NULL,
  `data` text,
  `channel` text DEFAULT 'push',
  `status` text DEFAULT 'pending',
  `expo_push_ticket` text,
  `sent_at` integer,
  `delivered_at` integer,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint

-- ============================================
-- ADD MISSING COMPOSITE INDEXES
-- ============================================

-- 1. workout_templates: Basic user index (no created_at column exists)
CREATE INDEX IF NOT EXISTS idx_workout_templates_user_id ON workout_templates (user_id);
--> statement-breakpoint

-- 2. conversations: Composite index for user's chat history
-- Covers: SELECT * FROM conversations WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_conversations_user_created ON conversations (user_id, created_at DESC);
--> statement-breakpoint

-- 3. ai_recommendations: Composite index for user's recommendations feed
-- Covers: SELECT * FROM ai_recommendations WHERE user_id = ? ORDER BY created_at DESC
-- Note: idx_ai_recs_unread (user_id, is_read) already exists for unread filter
CREATE INDEX IF NOT EXISTS idx_ai_recs_user_created ON ai_recommendations (user_id, created_at DESC);
--> statement-breakpoint

-- 4. badges: Composite index for user's badge history
-- Covers: SELECT * FROM badges WHERE user_id = ? ORDER BY earned_at DESC
CREATE INDEX IF NOT EXISTS idx_badges_user_earned ON badges (user_id, earned_at DESC);
--> statement-breakpoint

-- 5. achievements: Composite index for user's achievement history
-- Covers: SELECT * FROM achievements WHERE user_id = ? ORDER BY completed_at DESC
CREATE INDEX IF NOT EXISTS idx_achievements_user_completed ON achievements (user_id, completed_at DESC);
--> statement-breakpoint

-- 6. social_proof_cards: Composite index for user's social proof feed
-- Covers: SELECT * FROM social_proof_cards WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_social_proof_user_created ON social_proof_cards (user_id, created_at DESC);
--> statement-breakpoint

-- 7. comments: Composite index for user's comment history
-- Covers: SELECT * FROM comments WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_comments_user_created ON comments (user_id, created_at DESC);
--> statement-breakpoint

-- 8. reactions: Composite index for user's reaction history
-- Covers: SELECT * FROM reactions WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_reactions_user_created ON reactions (user_id, created_at DESC);
--> statement-breakpoint

-- 9. point_transactions: Composite index for user's points ledger
-- Covers: SELECT * FROM point_transactions WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_created ON point_transactions (user_id, created_at DESC);
--> statement-breakpoint

-- 10. streak_freezes: Composite index for user's freeze history
-- Covers: SELECT * FROM streak_freezes WHERE user_id = ? ORDER BY purchased_at DESC
CREATE INDEX IF NOT EXISTS idx_streak_freezes_user_purchased ON streak_freezes (user_id, purchased_at DESC);
--> statement-breakpoint

-- 11. live_workout_sessions: Composite index for user's live sessions
-- Covers: SELECT * FROM live_workout_sessions WHERE user_id = ? ORDER BY started_at DESC
-- Also useful for filtering by status: (user_id, status, started_at)
CREATE INDEX IF NOT EXISTS idx_live_sessions_user_started ON live_workout_sessions (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_sessions_user_status_started ON live_workout_sessions (user_id, status, started_at DESC);
--> statement-breakpoint

-- 12. set_rpe_logs: Composite index for user's RPE logs
-- Covers: SELECT * FROM set_rpe_logs WHERE user_id = ? ORDER BY timestamp DESC
-- Also: index for session + set number to get sets in order
CREATE INDEX IF NOT EXISTS idx_rpe_logs_user_timestamp ON set_rpe_logs (user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_rpe_logs_session_setnumber ON set_rpe_logs (session_id, set_number);
--> statement-breakpoint

-- 13. body_photos: Composite index for user's photo gallery
-- Covers: SELECT * FROM body_photos WHERE user_id = ? ORDER BY upload_date DESC
CREATE INDEX IF NOT EXISTS idx_body_photos_user_upload ON body_photos (user_id, upload_date DESC);
--> statement-breakpoint

-- 14. club_posts: Composite index for author's posts feed
-- Covers: SELECT * FROM club_posts WHERE author_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_club_posts_author_created ON club_posts (author_id, created_at DESC);
--> statement-breakpoint

-- 15. challenge_participants: Additional index for user's challenge list by status
-- Covers: SELECT * FROM challenge_participants WHERE user_id = ? AND status = ?
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user_status ON challenge_participants (user_id, status);
--> statement-breakpoint

-- 16. social_relationships: Additional index for user's relationships by status
-- Covers: SELECT * FROM social_relationships WHERE user_id = ? AND status = ?
CREATE INDEX IF NOT EXISTS idx_social_relationships_user_status ON social_relationships (user_id, status);
--> statement-breakpoint

-- 17. activity_events: Composite index for user's activity timeline
-- Covers: SELECT * FROM activity_events WHERE user_id = ? ORDER BY server_timestamp DESC
CREATE INDEX IF NOT EXISTS idx_activity_events_user_server_time ON activity_events (user_id, server_timestamp DESC);
--> statement-breakpoint

-- 18. notifications: Composite index for user's notification feed
-- Covers: SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC
-- Also: partial index for unread notifications would be ideal but D1 partial indexes
-- are created differently. We'll add composite for now.
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications (user_id, created_at DESC);
--> statement-breakpoint

-- 19. body_metrics: Already has idx_body_metrics_timestamp (user_id, timestamp DESC)
-- Verified in schema - good! No action needed.

-- 20. food_logs: Already has idx_food_logs_user_logged (user_id, logged_at DESC)
-- Verified in schema - good! No action needed.

-- 21. workouts: Already has idx_workouts_user_status_start (user_id, status, start_time)
-- and idx_workouts_created (user_id, created_at DESC) - good!

-- 22. daily_nutrition_summaries: Already has idx_user_date (user_id, date) unique - good!

-- +goose Down
-- Drop all added indexes in reverse order

DROP INDEX IF EXISTS idx_notifications_user_created;
DROP INDEX IF EXISTS idx_activity_events_user_server_time;
DROP INDEX IF EXISTS idx_social_relationships_user_status;
DROP INDEX IF EXISTS idx_challenge_participants_user_status;
DROP INDEX IF EXISTS idx_club_posts_author_created;
DROP INDEX IF EXISTS idx_body_photos_user_upload;
DROP INDEX IF EXISTS idx_rpe_logs_session_setnumber;
DROP INDEX IF EXISTS idx_rpe_logs_user_timestamp;
DROP INDEX IF EXISTS idx_live_sessions_user_status_started;
DROP INDEX IF EXISTS idx_live_sessions_user_started;
DROP INDEX IF EXISTS idx_streak_freezes_user_purchased;
DROP INDEX IF EXISTS idx_point_transactions_user_created;
DROP INDEX IF EXISTS idx_reactions_user_created;
DROP INDEX IF EXISTS idx_comments_user_created;
DROP INDEX IF EXISTS idx_social_proof_user_created;
DROP INDEX IF EXISTS idx_achievements_user_completed;
DROP INDEX IF EXISTS idx_badges_user_earned;
DROP INDEX IF EXISTS idx_ai_recs_user_created;
DROP INDEX IF EXISTS idx_conversations_user_created;
DROP INDEX IF EXISTS idx_workout_templates_user_id;
-- Note: We do NOT drop tables in Down migration as they may have been created earlier
