-- Biometric Correlation Tables Migration
-- Created for Phase 1.3: Stress & Recovery Correlation Feature

-- ============================================
-- TABLE: sleep_logs
-- ============================================
CREATE TABLE IF NOT EXISTS `sleep_logs` (
  `id` TEXT PRIMARY KEY,
  `user_id` TEXT NOT NULL,
  `date` TEXT NOT NULL, -- ISO date YYYY-MM-DD
  `duration_hours` REAL,
  `quality_score` INTEGER,
  `deep_sleep_minutes` INTEGER,
  `rem_sleep_minutes` INTEGER,
  `awake_minutes` INTEGER,
  `bedtime` TEXT,
  `waketime` TEXT,
  `consistency_score` INTEGER,
  `notes` TEXT,
  `source` TEXT DEFAULT 'manual',
  `created_at` INTEGER NOT NULL,
  `updated_at` INTEGER NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS `unique_sleep_user_date` ON `sleep_logs` (`user_id`, `date`);
CREATE INDEX IF NOT EXISTS `idx_sleep_user_date` ON `sleep_logs` (`user_id`, `date`);
CREATE INDEX IF NOT EXISTS `idx_sleep_date` ON `sleep_logs` (`date`);

-- ============================================
-- TABLE: biometric_snapshots
-- ============================================
CREATE TABLE IF NOT EXISTS `biometric_snapshots` (
  `id` TEXT PRIMARY KEY,
  `user_id` TEXT NOT NULL,
  `period` TEXT NOT NULL, -- '7d' or '30d'
  `generated_at` INTEGER NOT NULL,
  `valid_until` INTEGER,
  `exercise_load` TEXT, -- JSON
  `sleep` TEXT, -- JSON
  `nutrition` TEXT, -- JSON
  `body_metrics` TEXT, -- JSON
  `recovery_score` REAL,
  `warnings` TEXT, -- JSON array
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS `idx_snapshot_user_period` ON `biometric_snapshots` (`user_id`, `period`);
CREATE INDEX IF NOT EXISTS `idx_snapshot_generated` ON `biometric_snapshots` (`generated_at`);
CREATE INDEX IF NOT EXISTS `idx_snapshot_valid_until` ON `biometric_snapshots` (`valid_until`);

-- ============================================
-- TABLE: correlation_findings
-- ============================================
CREATE TABLE IF NOT EXISTS `correlation_findings` (
  `id` TEXT PRIMARY KEY,
  `user_id` TEXT NOT NULL,
  `snapshot_id` TEXT NOT NULL,
  `factor_a` TEXT NOT NULL,
  `factor_b` TEXT NOT NULL,
  `correlation_coefficient` REAL,
  `p_value` REAL,
  `confidence` REAL,
  `anomaly_threshold` REAL,
  `anomaly_count` INTEGER,
  `outlier_dates` TEXT, -- JSON array
  `explanation` TEXT,
  `actionable_insight` TEXT,
  `detected_at` INTEGER NOT NULL,
  `valid_until` INTEGER,
  `is_dismissed` INTEGER DEFAULT 0,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`snapshot_id`) REFERENCES `biometric_snapshots`(`id`) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS `idx_findings_user_snapshot` ON `correlation_findings` (`user_id`, `snapshot_id`);
CREATE INDEX IF NOT EXISTS `idx_findings_detected` ON `correlation_findings` (`detected_at`);
CREATE INDEX IF NOT EXISTS `idx_findings_dismissed` ON `correlation_findings` (`is_dismissed`);
CREATE INDEX IF NOT EXISTS `idx_findings_confidence` ON `correlation_findings` (`confidence` DESC);
