-- +goose Up
-- Migration: 0022_add_remaining_fk_indexes
-- Date: 2026-04-29
-- Purpose: Add missing indexes on foreign key columns and critical query patterns

-- badges: Missing index on user_id (foreign key)
CREATE INDEX IF NOT EXISTS idx_badges_user_id ON badges (user_id);

-- streak_freezes: Missing index on user_id (foreign key)
CREATE INDEX IF NOT EXISTS idx_streak_freezes_user_id ON streak_freezes (user_id);

-- social_relationships: Missing index on friend_id (foreign key)
CREATE INDEX IF NOT EXISTS idx_social_relationships_friend_id ON social_relationships (friend_id);

-- correlation_findings: Missing index on snapshot_id (foreign key)
CREATE INDEX IF NOT EXISTS idx_correlation_findings_snapshot_id ON correlation_findings (snapshot_id);

-- muscle_fatigue_readings: Missing index on session_id (foreign key)
CREATE INDEX IF NOT EXISTS idx_muscle_fatigue_readings_session_id ON muscle_fatigue_readings (session_id);

-- macro_adjustment_logs: Missing index on session_id (foreign key)
CREATE INDEX IF NOT EXISTS idx_macro_adjustment_logs_session_id ON macro_adjustment_logs (session_id);

-- body_projections: Missing index on user_id (foreign key)
CREATE INDEX IF NOT EXISTS idx_body_projections_user_id ON body_projections (user_id);

-- club_members: Missing index on club_id (foreign key)
CREATE INDEX IF NOT EXISTS idx_club_members_club_id ON club_members (club_id);

-- club_events: Missing index on club_id (foreign key)
CREATE INDEX IF NOT EXISTS idx_club_events_club_id ON club_events (club_id);

-- event_attendees: Missing index on event_id (foreign key)
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON event_attendees (event_id);

-- comments: Composite index for entity_type + entity_id queries (common pattern)
CREATE INDEX IF NOT EXISTS idx_comments_entity_type_id ON comments (entity_type, entity_id);

-- reactions: Composite index for entity_type + entity_id queries (common pattern)
CREATE INDEX IF NOT EXISTS idx_reactions_entity_type_id ON reactions (entity_type, entity_id);

-- activity_feed_entries: Missing index on actor_id (foreign key)
CREATE INDEX IF NOT EXISTS idx_activity_feed_entries_actor_id ON activity_feed_entries (actor_id);

-- activity_feed_entries: Composite index for entity queries
CREATE INDEX IF NOT EXISTS idx_activity_feed_entity ON activity_feed_entries (entity_type, entity_id);

-- club_challenges: Missing index on club_id (foreign key)
CREATE INDEX IF NOT EXISTS idx_club_challenges_club_id ON club_challenges (club_id);

-- challenge_participants: Missing index on challenge_id (foreign key)
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge_id ON challenge_participants (challenge_id);

-- challenge_leaderboard_snapshots: Missing index on challenge_id (foreign key)
CREATE INDEX IF NOT EXISTS idx_challenge_leaderboard_snapshots_challenge_id ON challenge_leaderboard_snapshots (challenge_id);

-- club_posts: Missing index on club_id (foreign key)
CREATE INDEX IF NOT EXISTS idx_club_posts_club_id ON club_posts (club_id);

-- user_blocks: Missing index on blocked_id (for blocking lookup)
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_id ON user_blocks (blocked_id);

-- social_insights: Composite index for period queries
CREATE INDEX IF NOT EXISTS idx_social_insights_period_start ON social_insights (period, start);

-- club_search: Already has indexes, but ensure club_id is primary key (it is)

-- +goose Down

-- Drop all indexes created in this migration
DROP INDEX IF EXISTS idx_badges_user_id;
DROP INDEX IF EXISTS idx_streak_freezes_user_id;
DROP INDEX IF EXISTS idx_social_relationships_friend_id;
DROP INDEX IF EXISTS idx_correlation_findings_snapshot_id;
DROP INDEX IF EXISTS idx_muscle_fatigue_readings_session_id;
DROP INDEX IF EXISTS idx_macro_adjustment_logs_session_id;
DROP INDEX IF EXISTS idx_body_projections_user_id;
DROP INDEX IF EXISTS idx_club_members_club_id;
DROP INDEX IF EXISTS idx_club_events_club_id;
DROP INDEX IF EXISTS idx_event_attendees_event_id;
DROP INDEX IF EXISTS idx_comments_entity_type_id;
DROP INDEX IF EXISTS idx_reactions_entity_type_id;
DROP INDEX IF EXISTS idx_activity_feed_entries_actor_id;
DROP INDEX IF EXISTS idx_activity_feed_entity;
DROP INDEX IF EXISTS idx_club_challenges_club_id;
DROP INDEX IF EXISTS idx_challenge_participants_challenge_id;
DROP INDEX IF EXISTS idx_challenge_leaderboard_snapshots_challenge_id;
DROP INDEX IF EXISTS idx_club_posts_club_id;
DROP INDEX IF EXISTS idx_user_blocks_blocked_id;
DROP INDEX IF EXISTS idx_social_insights_period_start;
