-- Migration: 0002_verification_code
-- Description: Add verification code columns to users table for 6-digit code verification

-- Add verification code columns to users table
ALTER TABLE users ADD COLUMN verification_code_hash TEXT;
ALTER TABLE users ADD COLUMN verification_code_expires_at INTEGER;
ALTER TABLE users ADD COLUMN verification_code_attempts INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_users_verification_code_expires_at ON users(verification_code_expires_at);
