CREATE TABLE `body_insights` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`timestamp` integer NOT NULL,
	`source` text,
	`recovery_score` real,
	`fatigue_level` integer,
	`muscle_soreness` text,
	`sleep_quality` integer,
	`sleep_hours` real,
	`stress_level` integer,
	`hydration_level` integer,
	`notes` text,
	`raw_data` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `body_photos` (
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
CREATE INDEX `idx_user_id` ON `body_photos` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_analysis_status` ON `body_photos` (`analysis_status`);--> statement-breakpoint
CREATE TABLE `plan_deviations` (
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
CREATE TABLE `routine_exercises` (
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
CREATE TABLE `user_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`target_metric` text,
	`current_value` real,
	`target_value` real,
	`deadline` text,
	`priority` integer DEFAULT 1,
	`status` text DEFAULT 'active',
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `workout_completions` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_id` text NOT NULL,
	`routine_exercise_id` text,
	`completed` integer DEFAULT 1,
	`completion_rate` real,
	`actual_sets` integer,
	`actual_reps` integer,
	`actual_weight` real,
	`rpe_reported` real,
	`skipped_reason` text,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`routine_exercise_id`) REFERENCES `routine_exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_workout_id` ON `workout_completions` (`workout_id`);--> statement-breakpoint
CREATE INDEX `idx_routine_exercise` ON `workout_completions` (`routine_exercise_id`);--> statement-breakpoint
CREATE TABLE `workout_routines` (
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
ALTER TABLE `daily_schedules` ADD `routine_id` text REFERENCES workout_routines(id);