-- +goose Up
-- Social Features Schema - 15 new tables for clubs, events, comments, reactions, feed, challenges, posts, blocking, analytics
-- Migration: 0018_social_features
-- Designed for Cloudflare D1 (SQLite)
-- Total estimated rows: 40M for 100K users (2-3GB)

--> statement-breakpoint
CREATE TABLE `clubs` (
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
CREATE INDEX `idx_clubs_owner_id` ON `clubs` (`owner_id`);
--> statement-breakpoint
CREATE INDEX `idx_clubs_privacy_type` ON `clubs` (`privacy_type`);
--> statement-breakpoint
CREATE INDEX `idx_clubs_created_at` ON `clubs` (`created_at` DESC);

--> statement-breakpoint
CREATE TABLE `club_members` (
  `id` text PRIMARY KEY NOT NULL,
  `club_id` text NOT NULL,
  `user_id` text NOT NULL,
  `role` text NOT NULL DEFAULT 'member',
  `joined_at` integer NOT NULL,
  `last_active_at` integer,
  `is_muted` integer DEFAULT 0,
  FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE UNIQUE INDEX `uq_club_member` ON `club_members` (`club_id`, `user_id`);
--> statement-breakpoint
CREATE INDEX `idx_club_members_user_id` ON `club_members` (`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_club_members_club_role` ON `club_members` (`club_id`, `role`);

--> statement-breakpoint
CREATE TABLE `club_events` (
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
CREATE INDEX `idx_club_events_club_id` ON `club_events` (`club_id`);
--> statement-breakpoint
CREATE INDEX `idx_club_events_start_time` ON `club_events` (`start_time`);

--> statement-breakpoint
CREATE TABLE `event_attendees` (
  `id` text PRIMARY KEY NOT NULL,
  `event_id` text NOT NULL,
  `user_id` text NOT NULL,
  `rsvp_status` text NOT NULL DEFAULT 'going',
  `attended` integer DEFAULT 0,
  `signed_up_at` integer NOT NULL,
  FOREIGN KEY (`event_id`) REFERENCES `club_events`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE UNIQUE INDEX `uq_event_attendee` ON `event_attendees` (`event_id`, `user_id`);
--> statement-breakpoint
CREATE INDEX `idx_event_attendees_event` ON `event_attendees` (`event_id`);
--> statement-breakpoint
CREATE INDEX `idx_event_attendees_user` ON `event_attendees` (`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_event_attendees_status` ON `event_attendees` (`event_id`, `rsvp_status`);
--> statement-breakpoint
CREATE INDEX `idx_event_attendees_attended` ON `event_attendees` (`event_id`, `attended`);

--> statement-breakpoint
CREATE TABLE `comments` (
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
CREATE INDEX `idx_comments_entity` ON `comments` (`entity_type`, `entity_id`);
--> statement-breakpoint
CREATE INDEX `idx_comments_user` ON `comments` (`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_comments_parent` ON `comments` (`parent_id`);
--> statement-breakpoint
CREATE INDEX `idx_comments_created` ON `comments` (`created_at` DESC);

--> statement-breakpoint
CREATE TABLE `reactions` (
  `id` text PRIMARY KEY NOT NULL,
  `entity_type` text NOT NULL,
  `entity_id` text NOT NULL,
  `user_id` text NOT NULL,
  `reaction_type` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE UNIQUE INDEX `uq_reaction` ON `reactions` (`entity_type`, `entity_id`, `user_id`, `reaction_type`);
--> statement-breakpoint
CREATE INDEX `idx_reactions_entity` ON `reactions` (`entity_type`, `entity_id`);
--> statement-breakpoint
CREATE INDEX `idx_reactions_user` ON `reactions` (`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_reactions_created` ON `reactions` (`created_at` DESC);

--> statement-breakpoint
CREATE TABLE `activity_feed_entries` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `actor_id` text NOT NULL,
  `action` text NOT NULL,
  `entity_type` text NOT NULL,
  `entity_id` text NOT NULL,
  `metadata` text NOT NULL,
  `visibility` integer NOT NULL DEFAULT 1,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE INDEX `idx_feed_user_created` ON `activity_feed_entries` (`user_id`, `created_at` DESC);
--> statement-breakpoint
CREATE INDEX `idx_feed_actor_id` ON `activity_feed_entries` (`actor_id`);
--> statement-breakpoint
CREATE INDEX `idx_feed_entity` ON `activity_feed_entries` (`entity_type`, `entity_id`);

--> statement-breakpoint
CREATE TABLE `club_challenges` (
  `id` text PRIMARY KEY NOT NULL,
  `club_id` text NOT NULL,
  `title` text NOT NULL,
  `description` text,
  `challenge_type` text NOT NULL,
  `metric` text NOT NULL,
  `unit` text NOT NULL,
  `start_date` integer NOT NULL,
  `end_date` integer NOT NULL,
  `target_value` real,
  `is_individual` integer DEFAULT 1,
  `is_active` integer DEFAULT 1,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE INDEX `idx_club_challenges_club_id` ON `club_challenges` (`club_id`);
--> statement-breakpoint
CREATE INDEX `idx_club_challenges_dates` ON `club_challenges` (`start_date`, `end_date`);

--> statement-breakpoint
CREATE TABLE `challenge_participants` (
  `id` text PRIMARY KEY NOT NULL,
  `challenge_id` text NOT NULL,
  `user_id` text NOT NULL,
  `status` text NOT NULL DEFAULT 'active',
  `initial_value` real DEFAULT 0,
  `current_value` real DEFAULT 0,
  `joined_at` integer NOT NULL,
  `completed_at` integer,
  FOREIGN KEY (`challenge_id`) REFERENCES `club_challenges`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE UNIQUE INDEX `uq_challenge_participant` ON `challenge_participants` (`challenge_id`, `user_id`);
--> statement-breakpoint
CREATE INDEX `idx_challenge_participants_challenge_status` ON `challenge_participants` (`challenge_id`, `status`);
--> statement-breakpoint
CREATE INDEX `idx_challenge_participants_user_id` ON `challenge_participants` (`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_challenge_participants_current_value` ON `challenge_participants` (`challenge_id`, `current_value`);

--> statement-breakpoint
CREATE TABLE `challenge_leaderboard_snapshots` (
  `id` text PRIMARY KEY NOT NULL,
  `challenge_id` text NOT NULL,
  `user_id` text NOT NULL,
  `rank` integer NOT NULL,
  `metric_value` real NOT NULL,
  `snapshot_date` integer NOT NULL,
  FOREIGN KEY (`challenge_id`) REFERENCES `club_challenges`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE INDEX `idx_leaderboard_snapshots_challenge_date` ON `challenge_leaderboard_snapshots` (`challenge_id`, `snapshot_date`);
--> statement-breakpoint
CREATE INDEX `idx_leaderboard_snapshots_user_id` ON `challenge_leaderboard_snapshots` (`user_id`);

--> statement-breakpoint
CREATE TABLE `club_posts` (
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
  FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE INDEX `idx_club_posts_club_id` ON `club_posts` (`club_id`);
--> statement-breakpoint
CREATE INDEX `idx_club_posts_author_id` ON `club_posts` (`author_id`);
--> statement-breakpoint
CREATE INDEX `idx_club_posts_club_pinned_created` ON `club_posts` (`club_id`, `is_pinned`, `created_at` DESC);

--> statement-breakpoint
CREATE TABLE `notification_templates` (
  `id` text PRIMARY KEY NOT NULL,
  `type` text NOT NULL UNIQUE,
  `title_template` text NOT NULL,
  `body_template` text NOT NULL,
  `icon` text,
  `sound` text DEFAULT 'default',
  `action_url` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

--> statement-breakpoint
CREATE INDEX `idx_notification_templates_type` ON `notification_templates` (`type`);

--> statement-breakpoint
CREATE TABLE `user_blocks` (
  `id` text PRIMARY KEY NOT NULL,
  `blocker_id` text NOT NULL,
  `blocked_id` text NOT NULL,
  `reason` text,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`blocker_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`blocked_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE UNIQUE INDEX `uq_user_block` ON `user_blocks` (`blocker_id`, `blocked_id`);
--> statement-breakpoint
CREATE INDEX `idx_user_blocks_blocker_id` ON `user_blocks` (`blocker_id`);
--> statement-breakpoint
CREATE INDEX `idx_user_blocks_blocked_id` ON `user_blocks` (`blocked_id`);

--> statement-breakpoint
CREATE TABLE `social_insights` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `period` text NOT NULL,
  `start` integer NOT NULL,
  `end` integer NOT NULL,
  `metrics` text NOT NULL,
  `generated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE UNIQUE INDEX `uq_social_insight` ON `social_insights` (`user_id`, `period`, `start`);
--> statement-breakpoint
CREATE INDEX `idx_social_insights_period_start` ON `social_insights` (`period`, `start`);
--> statement-breakpoint
CREATE INDEX `idx_social_insights_user_id` ON `social_insights` (`user_id`);

--> statement-breakpoint
CREATE TABLE `club_search` (
  `club_id` text PRIMARY KEY NOT NULL,
  `search_blob` text NOT NULL,
  `member_count` integer NOT NULL DEFAULT 0,
  `last_activity_at` integer NOT NULL,
  FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE INDEX `idx_club_search_blob` ON `club_search` (`search_blob`);
--> statement-breakpoint
CREATE INDEX `idx_club_search_member_count` ON `club_search` (`member_count` DESC);

-- +goose Down
-- Drop all social features tables in reverse dependency order

--> statement-breakpoint
DROP TABLE IF EXISTS `social_insights`;
--> statement-breakpoint
DROP TABLE IF EXISTS `club_search`;
--> statement-breakpoint
DROP TABLE IF EXISTS `user_blocks`;
--> statement-breakpoint
DROP TABLE IF EXISTS `notification_templates`;
--> statement-breakpoint
DROP TABLE IF EXISTS `club_posts`;
--> statement-breakpoint
DROP TABLE IF EXISTS `challenge_leaderboard_snapshots`;
--> statement-breakpoint
DROP TABLE IF EXISTS `challenge_participants`;
--> statement-breakpoint
DROP TABLE IF EXISTS `club_challenges`;
--> statement-breakpoint
DROP TABLE IF EXISTS `activity_feed_entries`;
--> statement-breakpoint
DROP TABLE IF EXISTS `reactions`;
--> statement-breakpoint
DROP TABLE IF EXISTS `comments`;
--> statement-breakpoint
DROP TABLE IF EXISTS `event_attendees`;
--> statement-breakpoint
DROP TABLE IF EXISTS `club_events`;
--> statement-breakpoint
DROP TABLE IF EXISTS `club_members`;
--> statement-breakpoint
DROP TABLE IF EXISTS `clubs`;
