-- Migration: 0003_add_memory_indexes
-- Description: Add indexes for memoryNodes and memoryEdges tables to optimize query performance
-- Created: 2025-04-22

-- Index on memory_nodes for user_id + type queries (common filter)
CREATE INDEX IF NOT EXISTS idx_memory_nodes_user_id_type ON memory_nodes(user_id, type);

-- Index on memory_nodes for user_id + extracted_at (time-based queries and ordering)
CREATE INDEX IF NOT EXISTS idx_memory_nodes_user_id_extracted_at ON memory_nodes(user_id, extracted_at);

-- Index on memory_nodes for user_id + confidence (confidence-based filtering)
CREATE INDEX IF NOT EXISTS idx_memory_nodes_user_id_confidence ON memory_nodes(user_id, json_extract(metadata, '$.confidence'));

-- Index on memory_edges for from_node_id (traversing outgoing edges)
CREATE INDEX IF NOT EXISTS idx_memory_edges_from_node ON memory_edges(from_node_id);

-- Index on memory_edges for to_node_id (traversing incoming edges)
CREATE INDEX IF NOT EXISTS idx_memory_edges_to_node ON memory_edges(to_node_id);

-- Composite index for finding edges by from_node_id and relationship type
CREATE INDEX IF NOT EXISTS idx_memory_edges_from_relationship ON memory_edges(from_node_id, relationship);

-- Index on compressed_contexts for user_id + created_at (context retrieval and cleanup)
CREATE INDEX IF NOT EXISTS idx_compressed_contexts_user_created ON compressed_contexts(user_id, created_at);

-- Note: SQLite's query planner will use these indexes for:
-- - Memory queries filtered by userId and type
-- - Time-based memory pruning and ordering
-- - Graph traversals for related memory lookup
-- - Compressed context cleanup and expiry
