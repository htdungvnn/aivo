ALTER TABLE `users` ADD `receive_monthly_reports` integer DEFAULT 1;--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `daily_checkins` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_user_date` ON `daily_checkins` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `point_transactions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_created_at` ON `point_transactions` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_user` ON `social_relationships` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_friend` ON `social_relationships` (`friend_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_user_friend` ON `social_relationships` (`user_id`,`friend_id`);--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `streak_freezes` (`user_id`);