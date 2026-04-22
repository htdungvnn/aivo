-- ============================================
-- NUTRITION CONSULTATIONS TABLE
-- Stores AI multi-agent nutrition consultation records
-- ============================================

--> statement-breakpoint
CREATE TABLE `nutrition_consults` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `session_id` text NOT NULL,
  `query` text NOT NULL,
  `context` text,
  `agents_consulted` text NOT NULL,
  `responses` text NOT NULL,
  `synthesized_advice` text NOT NULL,
  `warnings` text,
  `processing_time_ms` integer NOT NULL,
  `user_rating` integer,
  `feedback` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE INDEX `nutrition_consults_user_id_idx` ON `nutrition_consults` (`user_id`);

--> statement-breakpoint
CREATE INDEX `nutrition_consults_created_at_idx` ON `nutrition_consults` (`created_at`);

--> statement-breakpoint
CREATE INDEX `nutrition_consults_session_id_idx` ON `nutrition_consults` (`session_id`);

--> statement-breakpoint
CREATE INDEX `nutrition_consults_user_created_idx` ON `nutrition_consults` (`user_id`, `created_at`);
