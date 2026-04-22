-- Migration: 0004_add_memory_timestamps
-- Description: Add extractedAt and updatedAt columns to memory_nodes for tracking memory lifecycle
-- Created: 2025-04-22

-- Add extractedAt column (when the memory was extracted from conversation)
ALTER TABLE memory_nodes ADD COLUMN extracted_at INTEGER NOT NULL DEFAULT (unixepoch());

-- Add updatedAt column (when the memory was last updated)
ALTER TABLE memory_nodes ADD COLUMN updated_at INTEGER NOT NULL DEFAULT (unixepoch());

-- Backfill existing rows with current timestamp if they have 0
UPDATE memory_nodes SET extracted_at = unixepoch(), updated_at = unixepoch() WHERE extracted_at = 0 OR updated_at = 0;

-- Create index on extracted_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_memory_nodes_extracted_at ON memory_nodes(extracted_at);
