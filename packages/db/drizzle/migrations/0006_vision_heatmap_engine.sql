-- ============================================
-- VISION-TO-SVG HEATMAP ENGINE MIGRATION
-- Updates body_heatmaps structure (body_photos already exists from 0002)
-- ============================================

-- Recreate body_heatmaps with new structure
-- Note: This drops the old body_heatmaps table. Data migration not needed for new feature.

--> statement-breakpoint
DROP TABLE IF EXISTS `body_heatmaps`;

--> statement-breakpoint
CREATE TABLE `body_heatmaps` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `photo_id` text NOT NULL,
  `regions` text NOT NULL,
  `metrics` text,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`photo_id`) REFERENCES `body_photos`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE INDEX `body_heatmaps_user_id_idx` ON `body_heatmaps` (`user_id`);

--> statement-breakpoint
CREATE INDEX `body_heatmaps_photo_id_idx` ON `body_heatmaps` (`photo_id`);

-- Create body_heatmap_history table
--> statement-breakpoint
CREATE TABLE `body_heatmap_history` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `heatmap_id` text NOT NULL,
  `snapshot_date` text NOT NULL,
  `comparison_note` text,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`heatmap_id`) REFERENCES `body_heatmaps`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE INDEX `body_heatmap_history_user_id_idx` ON `body_heatmap_history` (`user_id`);

--> statement-breakpoint
CREATE INDEX `body_heatmap_history_snapshot_date_idx` ON `body_heatmap_history` (`snapshot_date`);
