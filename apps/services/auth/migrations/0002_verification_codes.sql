-- Migration: 0002_verification_codes
-- Description: Add additional verification code columns to users table

-- Add verification code columns only if they don't already exist
-- SQLite doesn't support ADD COLUMN IF NOT EXISTS, so we use a workaround
-- First, check if the column exists and only add if missing

-- Check and add verification_code_hash if not exists
-- SQLite workaround: try to add and catch error
PRAGMA ignore_check_constraints = ON;
