-- Migration: 0005_add_edge_timestamps
-- Description: Add createdAt to memory_edges for edge creation tracking
-- Created: 2025-04-22

-- Add createdAt column
ALTER TABLE memory_edges ADD COLUMN created_at INTEGER NOT NULL DEFAULT (unixepoch());

-- Backfill existing rows
UPDATE memory_edges SET created_at = unixepoch() WHERE created_at = 0;

-- Index on created_at for cleanup and queries
CREATE INDEX IF NOT EXISTS idx_memory_edges_created_at ON memory_edges(created_at);
