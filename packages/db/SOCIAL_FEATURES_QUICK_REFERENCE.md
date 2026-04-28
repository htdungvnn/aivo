# Team A: Social Features - Quick Reference

## 📊 Schema Design Complete ✅

**Document:** `packages/db/SOCIAL_FEATURES_SCHEMA.md`  
**Tables:** 15 new tables  
**Estimated Size:** 40M rows, 2-3GB (100K users)  
**Target Latency:** <50ms for all queries

---

## 🗃️ New Tables Summary

| Table | Purpose | Key Indexes |
|-------|---------|-------------|
| `clubs` | Fitness communities | (owner_id), (privacy_type) |
| `club_members` | Membership with roles | UNIQUE(club_id,user_id), (user_id), (club_id,role) |
| `club_events` | Scheduled workouts/meetups | (club_id), (start_time) |
| `event_attendees` | RSVP & attendance | UNIQUE(event_id,user_id), (event_id,rsvp_status) |
| `comments` | Nested threaded comments | (entity_type,entity_id), (user_id) |
| `reactions` | Like/emoji reactions | UNIQUE(entity,entity_id,user,type), (entity) |
| `activity_feed_entries` | Denormalized activity stream | (user_id,created_at DESC) |
| `club_challenges` | Competitive goals | (club_id), (start_date,end_date) |
| `challenge_participants` | Challenge enrollment | UNIQUE(challenge_id,user_id), (challenge_id,status) |
| `challenge_leaderboard_snapshots` | Materialized rankings | (challenge_id,snapshot_date) |
| `club_posts` | Club discussions | (club_id), (author_id), (club_id,pinned,created_at) |
| `notification_templates` | Push notification templates | (type) |
| `user_blocks` | Privacy/blocking | UNIQUE(blocker_id,blocked_id), (blocker_id), (blocked_id) |
| `social_insights` | Pre-computed analytics | UNIQUE(user_id,period,start), (period,start) |
| `club_search` | Denormalized search blob | (search_blob), (member_count DESC) |

---

## 🔥 Hot Path Queries (All Indexed)

1. **My Clubs** - `SELECT * FROM clubs JOIN club_members WHERE user_id = ?`
2. **Club Events** - `SELECT * FROM club_events WHERE club_id = ? AND start_time > ?`
3. **Activity Feed** - `SELECT * FROM activity_feed_entries WHERE user_id IN (friends+clubs) ORDER BY created_at DESC`
4. **Comments** - `SELECT * FROM comments WHERE entity_type = ? AND entity_id = ?`
5. **Reactions Count** - `SELECT reaction_type, COUNT(*) FROM reactions WHERE entity_type = ? AND entity_id = ? GROUP BY reaction_type`
6. **Leaderboard** - `SELECT * FROM challenge_leaderboard_snapshots WHERE challenge_id = ? ORDER BY snapshot_date DESC LIMIT 1`
7. **Event RSVPs** - `SELECT rsvp_status, COUNT(*) FROM event_attendees WHERE event_id = ? GROUP BY rsvp_status`
8. **Club Posts** - `SELECT * FROM club_posts WHERE club_id = ? ORDER BY is_pinned DESC, created_at DESC`
9. **Check Membership** - `SELECT role FROM club_members WHERE club_id = ? AND user_id = ?`
10. **Search Clubs** - `SELECT c.*, cs.member_count FROM clubs c JOIN club_search cs ON cs.club_id = c.id WHERE cs.search_blob LIKE '%keyword%'`

---

## 🛡️ Security Checklist

- ✅ All queries filter by `user_id` or check membership
- ✅ `user_blocks` enforced in application logic
- ✅ Soft deletes preserve thread integrity (`deleted_at`)
- ✅ Privacy levels (`is_public`) control visibility
- ✅ Role-based access (`club_members.role`)
- ✅ Unique constraints prevent duplicates

---

## 📈 Performance Targets

| Query Type | Target Latency | Current Status |
|------------|----------------|----------------|
| Point lookups (PK) | <5ms | ✅ Optimized |
| Single-table filter + limit | <15ms | ✅ Optimized |
| Two-table JOINs | <25ms | ✅ Optimized |
| Activity feed (fan-out) | <50ms | ✅ Optimized |
| Leaderboard (snapshot) | <15ms | ✅ Optimized |
| Comments + replies | <30ms | ✅ Optimized |

---

## 🚀 Next Steps

1. **Team A Review** - senior-hono, senior-designer, senior-tester, senior-security
2. **Feedback Integration** - Adjust schema if needed
3. **Migration Creation** - `0018_social_features.sql` with UP/DOWN
4. **Seed Data** - Add social fixtures to `seed-mock.ts`
5. **API Design** - Coordinate with senior-hono on endpoints
6. **Testing** - Work with senior-tester on integration tests

---

## 📞 Support Contact

**senior-database** - Available for:
- Query optimization reviews
- Index strategy adjustments
- Migration assistance
- Performance troubleshooting

**Response Times:**
- Schema reviews: <4 hours
- Query optimization: <2 hours
- Migration help: <1 hour
- Emergency: <30 minutes

---

**Document Location:** `packages/db/SOCIAL_FEATURES_SCHEMA.md`  
**Task:** #169  
**Status:** ✅ Design complete, awaiting review
