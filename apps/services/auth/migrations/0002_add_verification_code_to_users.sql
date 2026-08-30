-- Migration: 0002_add_verification_code_to_users
-- Description: Add verification_code column to users table (for existing databases without the column)

-- Add verification_code columns if they don't exist (for existing databases)
-- SQLite doesn't support ADD COLUMN IF NOT EXISTS, so we use a workaround
-- This will fail silently if column already exists, which is fine for migrations
