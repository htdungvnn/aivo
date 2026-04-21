CREATE TABLE `achievements` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text,
	`progress` real,
	`target` integer,
	`reward` integer,
	`completed` integer DEFAULT 0,
	`completed_at` integer,
	`claimed` integer DEFAULT 0,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `activity_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`workout_id` text,
	`type` text,
	`payload` text,
	`client_timestamp` integer NOT NULL,
	`server_timestamp` integer NOT NULL,
	`device_info` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ai_recommendations` (
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
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `badges` (
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
CREATE TABLE `body_heatmaps` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`timestamp` integer NOT NULL,
	`image_url` text,
	`vector_data` text,
	`metadata` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `body_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`timestamp` integer NOT NULL,
	`weight` real,
	`body_fat_percentage` real,
	`muscle_mass` real,
	`bone_mass` real,
	`water_percentage` real,
	`bmi` real,
	`waist_circumference` real,
	`chest_circumference` real,
	`hip_circumference` real,
	`source` text,
	`notes` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `compressed_contexts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`original_tokens` integer,
	`compressed_tokens` integer,
	`compression_ratio` real,
	`strategy` text,
	`context` text,
	`created_at` integer NOT NULL,
	`expires_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`message` text NOT NULL,
	`response` text NOT NULL,
	`context` text,
	`tokens_used` integer,
	`model` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `daily_checkins` (
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`checked_in_at` integer,
	`source` text,
	`workout_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_checkins_user_id_date_unique` ON `daily_checkins` (`user_id`, `date`);
--> statement-breakpoint
CREATE TABLE `daily_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date` text,
	`workout_id` text,
	`recovery_tasks` text,
	`nutrition_goals` text,
	`sleep_goal` text,
	`generated_by` text,
	`optimization_score` real,
	`adjustments_made` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `gamification_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`total_points` integer DEFAULT 0,
	`level` integer DEFAULT 1,
	`current_xp` integer DEFAULT 0,
	`xp_to_next_level` integer DEFAULT 100,
	`streak_current` integer DEFAULT 0,
	`streak_longest` integer DEFAULT 0,
	`last_activity_date` text,
	`freeze_count` integer DEFAULT 0,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gamification_profiles_user_id_unique` ON `gamification_profiles` (`user_id`);--> statement-breakpoint
CREATE TABLE `leaderboard_snapshots` (
	`date` text PRIMARY KEY NOT NULL,
	`snapshot_at` integer NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `memory_edges` (
	`id` text PRIMARY KEY NOT NULL,
	`from_node_id` text NOT NULL,
	`to_node_id` text NOT NULL,
	`relationship` text,
	`weight` real,
	FOREIGN KEY (`from_node_id`) REFERENCES `memory_nodes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_node_id`) REFERENCES `memory_nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `memory_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text,
	`content` text NOT NULL,
	`embedding` text,
	`metadata` text,
	`related_nodes` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `migrations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`applied_at` integer NOT NULL,
	`hash` text NOT NULL,
	`version` integer
);
--> statement-breakpoint
CREATE TABLE `point_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`reason` text NOT NULL,
	`related_id` text,
	`balance_after` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `point_transactions_user_id_idx` ON `point_transactions` (`user_id`);
--> statement-breakpoint
CREATE INDEX `point_transactions_created_at_idx` ON `point_transactions` (`created_at`);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text,
	`provider_user_id` text(255) NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text,
	`expires_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `shareable_content` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`image_url` text NOT NULL,
	`platform` text,
	`is_public` integer DEFAULT 0,
	`likes` integer DEFAULT 0,
	`shares` integer DEFAULT 0,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `social_proof_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text,
	`title` text NOT NULL,
	`subtitle` text,
	`data` text,
	`shareable_image_url` text,
	`created_at` integer NOT NULL,
	`is_public` integer DEFAULT 0,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `social_relationships` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`friend_id` text NOT NULL,
	`status` text DEFAULT 'accepted',
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`friend_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `social_relationships_user_id_idx` ON `social_relationships` (`user_id`);
--> statement-breakpoint
CREATE INDEX `social_relationships_friend_id_idx` ON `social_relationships` (`friend_id`);
--> statement-breakpoint
CREATE TABLE `streak_freezes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`purchased_at` integer NOT NULL,
	`used_at` integer,
	`used_on_date` text,
	`expires_at` integer,
	`points_spent` integer DEFAULT 50,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `streak_freezes_user_id_idx` ON `streak_freezes` (`user_id`);
--> statement-breakpoint
CREATE TABLE `system_metrics` (
	`timestamp` integer PRIMARY KEY NOT NULL,
	`active_users` integer,
	`new_users` integer,
	`workouts_completed` integer,
	`ai_requests` integer,
	`api_latency` real,
	`error_rate` real,
	`storage_used` integer
);
--> statement-breakpoint
CREATE TABLE `user_analytics` (
	`user_id` text PRIMARY KEY NOT NULL,
	`engagement_score` real,
	`retention_risk` text,
	`predicted_ltv` real,
	`churn_probability` real,
	`preferred_communication` text,
	`last_active` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text(255) NOT NULL,
	`name` text(255) NOT NULL,
	`age` integer,
	`gender` text,
	`height` real,
	`weight` real,
	`resting_heart_rate` integer,
	`max_heart_rate` integer,
	`fitness_level` text,
	`goals` text,
	`picture` text,
	`email_verified` integer DEFAULT 0,
	`onboarding_completed` integer DEFAULT 0,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `vision_analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`image_url` text NOT NULL,
	`processed_url` text,
	`analysis` text,
	`confidence` real,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `workout_exercises` (
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
CREATE TABLE `workout_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text,
	`duration` integer,
	`exercises` text,
	`tags` text,
	`is_public` integer DEFAULT 0,
	`popularity` real,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `workouts` (
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
