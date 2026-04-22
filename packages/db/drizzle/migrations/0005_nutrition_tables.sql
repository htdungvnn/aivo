-- ============================================
-- NUTRITION & FOOD LOGGING MIGRATION
-- Adds food_items, food_logs, daily_nutrition_summaries
-- ============================================

--> statement-breakpoint
CREATE TABLE `food_items` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text(255) NOT NULL,
  `brand` text(255),
  `serving_size` real,
  `serving_unit` text,
  `calories` real NOT NULL,
  `protein_g` real NOT NULL,
  `carbs_g` real NOT NULL,
  `fat_g` real NOT NULL,
  `fiber_g` real,
  `sugar_g` real,
  `sodium_mg` real,
  `is_verified` integer DEFAULT 1,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `food_items_name_idx` ON `food_items` (`name`);
--> statement-breakpoint
CREATE UNIQUE INDEX `food_items_name_brand_unique` ON `food_items` (`name`, `brand`);
--> statement-breakpoint
CREATE TABLE `food_logs` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `meal_type` text,
  `food_item_id` text,
  `custom_name` text,
  `image_url` text,
  `estimated_portion_g` real,
  `confidence` real,
  `calories` real NOT NULL,
  `protein_g` real NOT NULL,
  `carbs_g` real NOT NULL,
  `fat_g` real NOT NULL,
  `fiber_g` real,
  `sugar_g` real,
  `logged_at` integer NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`food_item_id`) REFERENCES `food_items`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `food_logs_user_id_idx` ON `food_logs` (`user_id`);
--> statement-breakpoint
CREATE INDEX `food_logs_logged_at_idx` ON `food_logs` (`logged_at`);
--> statement-breakpoint
CREATE INDEX `food_logs_user_meal_idx` ON `food_logs` (`user_id`, `meal_type`);
--> statement-breakpoint
CREATE TABLE `daily_nutrition_summaries` (
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
CREATE INDEX `daily_nutrition_summaries_user_date_idx` ON `daily_nutrition_summaries` (`user_id`, `date`);
