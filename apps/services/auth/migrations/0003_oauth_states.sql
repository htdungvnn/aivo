-- Migration: 0003_oauth_states
-- Description: Add oauth_states table for persistent OAuth state storage

-- Create oauth_states table
CREATE TABLE IF NOT EXISTS oauth_states (
    id TEXT PRIMARY KEY,
    state TEXT NOT NULL UNIQUE,
    code_verifier TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    client_type TEXT NOT NULL CHECK(client_type IN ('web', 'ios', 'android')),
    provider TEXT NOT NULL CHECK(provider IN ('google', 'facebook')),
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);
