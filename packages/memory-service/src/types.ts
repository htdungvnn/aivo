/**
 * Semantic Coaching Memory System - Type Definitions
 * Provides complete type system for memory nodes, edges, and operations
 */

/**
 * Core memory types representing different kinds of information
 */
export enum MemoryType {
  /** People, places, gyms, equipment, brands */
  ENTITY = "entity",
  /** Likes, dislikes, dietary restrictions, preferences */
  PREFERENCE = "preference",
  /** Static information: age, weight, height, fitness level */
  FACT = "fact",
  /** Completed workouts, achievements, milestones, progress markers */
  EVENT = "event",
  /** Motivation levels, energy, mood, pain, discomfort */
  EMOTIONAL = "emotional",
  /** Goals, constraints, time availability, equipment access */
  CONSTRAINT = "constraint",
}

/**
 * Conversation message format
 */
export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
  timestamp?: number;
}

/**
 * Types of relationships between memory nodes
 */
export enum RelationshipType {
  RELATED_TO = "related_to",
  CONTRADICTS = "contradicts",
  TEMPORAL_BEFORE = "temporal_before",
  TEMPORAL_AFTER = "temporal_after",
  CAUSES = "causes",
  PRECLUDES = "precludes",
  STRENGTHENS = "strengthens",
  WEAKENS = "weakens",
  SUPERTOPIC = "supertopic",
  SUBTOPIC = "subtopic",
}

/**
 * Health-related facts that should ALWAYS be included in context
 * These are critical for safety and must not be filtered out
 */
export const CRITICAL_HEALTH_KEYWORDS = new Set([
  "injury", "injured", "pain", "hurt", "damage", "strain", "sprain",
  "herniated", "bulging", "disc", "surgery", "recovery", "rehab",
  "hernia", "fracture", "broken", "torn", "rupture", "dislocated",
  "medical", "doctor", "physical therapy", "pt ", "chiropractor",
  "lower back", "upper back", "neck", "shoulder", "knee", "ankle",
  "hip", "elbow", "wrist", "pre-existing", "condition",
]);

/**
 * Check if a memory content contains critical health information
 */
export function isHealthCritical(content: string): boolean {
  const lowerContent = content.toLowerCase();
  for (const keyword of CRITICAL_HEALTH_KEYWORDS) {
    if (lowerContent.includes(keyword)) {
      return true;
    }
  }
  return false;
}

/**
 * Metadata for a memory node
 */
export interface MemoryMetadata {
  /** Source of the memory: conversation, workout, body_metric, manual */
  source: "conversation" | "workout" | "body_metric" | "manual" | "system";
  /** Confidence score from extraction (0-1) */
  confidence: number;
  /** Unix timestamp when this memory was extracted/created */
  extractedAt: number;
  /** ID of the source conversation/workout that generated this */
  sourceId?: string;
  /** How many times this fact has been reinforced/verified */
  verifications: number;
  /** User confirmation status if manually added */
  confirmed?: boolean;
  /** Tags for additional categorization */
  tags?: string[];
  /** Last time this memory was accessed/retrieved */
  lastAccessed?: number;
}

/**
 * A memory node represents a single fact or piece of information
 */
export interface MemoryNode {
  /** Unique identifier */
  id: string;
  /** User this memory belongs to */
  userId: string;
  /** Type of memory (entity, preference, fact, event, emotional) */
  type: MemoryType;
  /** Human-readable content of the memory */
  content: string;
  /** Vector embedding from OpenAI (array of 1536 floats for text-embedding-3-small) */
  embedding: number[];
  /** Structured metadata */
  metadata: MemoryMetadata;
  /** IDs of related memory nodes */
  relatedNodes: string[];
  /** When this node was created in the database */
  createdAt: number;
  /** When this node was last updated */
  updatedAt: number;
}

/**
 * Create a partial memory node with defaults
 */
export function createMemoryNode(
  userId: string,
  type: MemoryType,
  content: string,
  embedding: number[],
  metadata: Partial<Omit<MemoryMetadata, "extractedAt" | "verifications">> & {
    extractedAt?: number;
    verifications?: number;
  } = {}
): Omit<MemoryNode, "id"> {
  const now = Date.now();
  return {
    userId,
    type,
    content,
    embedding,
    metadata: {
      extractedAt: metadata.extractedAt ?? now,
      verifications: metadata.verifications ?? 1,
      source: metadata.source ?? "conversation",
      confidence: metadata.confidence ?? 1.0,
      sourceId: metadata.sourceId,
      confirmed: metadata.confirmed ?? false,
      tags: metadata.tags,
      lastAccessed: metadata.lastAccessed,
    },
    relatedNodes: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * An edge connects two memory nodes with a relationship
 */
export interface MemoryEdge {
  /** Unique identifier */
  id: string;
  /** Source node ID */
  fromNodeId: string;
  /** Target node ID */
  toNodeId: string;
  /** Type of relationship */
  relationship: RelationshipType;
  /** Weight/strength of the relationship (0-1) */
  weight: number;
  /** When this edge was created */
  createdAt: number;
}

/**
 * Create a memory edge
 */
export function createMemoryEdge(
  fromNodeId: string,
  toNodeId: string,
  relationship: RelationshipType,
  weight: number = 1.0,
  createdAt: number = Date.now()
): Omit<MemoryEdge, "id"> {
  return {
    fromNodeId,
    toNodeId,
    relationship,
    weight,
    createdAt,
  };
}

/**
 * Parameters for querying memories
 */
export interface MemoryQuery {
  /** User ID to query for */
  userId: string;
  /** Optional semantic search query */
  query?: string;
  /** Filter by memory types */
  types?: MemoryType[];
  /** Maximum number of memories to return */
  limit?: number;
  /** Minimum confidence threshold (0-1) */
  minConfidence?: number;
  /** Maximum age in days (null = no limit) */
  maxAgeDays?: number;
  /** Require critical health info even if below confidence threshold */
  includeCritical?: boolean;
  /** Types that should be boosted in ranking */
  priorityTypes?: MemoryType[];
}

/**
 * A fact extracted from a conversation
 */
export interface ExtractedFact {
  /** Type of fact */
  type: MemoryType;
  /** The fact content */
  content: string;
  /** Extraction confidence (0-1) */
  confidence: number;
  /** IDs of related facts (will be resolved to node IDs) */
  relatedTo?: string[];
  /** Source conversation message indices */
  sourceIndices?: number[];
}

/**
 * Result of fact extraction from a conversation
 */
export interface FactExtractionResult {
  /** The extracted facts */
  facts: ExtractedFact[];
  /** Overall extraction confidence */
  confidence: number;
  /** Processing time in ms */
  processingTimeMs: number;
  /** Any errors or warnings */
  warnings?: string[];
}

/**
 * Context builder output
 */
export interface MemoryContext {
  /** Memories included in the context */
  memories: MemoryNode[];
  /** Formatted context string ready for AI prompt */
  contextString: string;
  /** Estimated token count */
  tokens: number;
  /** Sources of memories for debugging */
  sources: {
    criticalHealth: number;
    preferences: number;
    facts: number;
    events: number;
    emotional: number;
    constraints: number;
  };
}

/**
 * Token budget configuration
 */
export interface TokenBudget {
  /** Total tokens available for memory context */
  total: number;
  /** Minimum tokens to reserve for each category */
  reserves: {
    critical: number;
    preferences: number;
    facts: number;
    events: number;
    emotional: number;
    constraints: number;
    entity: number;
  };
  /** Maximum tokens per individual memory */
  maxPerMemory: number;
}

/**
 * Default token budget
 */
export const DEFAULT_TOKEN_BUDGET: TokenBudget = {
  total: 2000,
  reserves: {
    critical: 300,
    preferences: 200,
    facts: 200,
    events: 300,
    emotional: 200,
    constraints: 300,
    entity: 50,
  },
  maxPerMemory: 150,
};

/**
 * Memory deduplication result
 */
export interface DeduplicationResult {
  /** Unique facts after deduplication */
  uniqueFacts: ExtractedFact[];
  /** Facts that were duplicates */
  duplicates: Array<{ original: ExtractedFact; duplicate: ExtractedFact; similarity: number }>;
}

/**
 * Embedding dimensions for text-embedding-3-small
 */
export const EMBEDDING_DIMENSIONS = 1536;

/**
 * Verify a memory node has a valid embedding
 */
export function isValidEmbedding(embedding: number[]): boolean {
  return (
    Array.isArray(embedding) &&
    embedding.length === EMBEDDING_DIMENSIONS &&
    embedding.every((n) => typeof n === "number" && !isNaN(n) && isFinite(n))
  );
}

/**
 * Type guard for MemoryNode
 */
export function isMemoryNode(obj: any): obj is MemoryNode {
  return (
    typeof obj === "object" &&
    typeof obj.id === "string" &&
    typeof obj.userId === "string" &&
    typeof obj.type === "string" &&
    typeof obj.content === "string" &&
    Array.isArray(obj.embedding) &&
    typeof obj.metadata === "object" &&
    Array.isArray(obj.relatedNodes) &&
    typeof obj.createdAt === "number" &&
    typeof obj.updatedAt === "number"
  );
}

/**
 * Type guard for MemoryQuery
 */
export function isMemoryQuery(obj: any): obj is MemoryQuery {
  return (
    typeof obj === "object" &&
    typeof obj.userId === "string" &&
    (obj.query === undefined || typeof obj.query === "string") &&
    (obj.types === undefined || Array.isArray(obj.types)) &&
    (obj.limit === undefined || typeof obj.limit === "number") &&
    (obj.minConfidence === undefined || typeof obj.minConfidence === "number") &&
    (obj.maxAgeDays === undefined || typeof obj.maxAgeDays === "number")
  );
}

/**
 * Format memories into a context string for the AI
 */
export function formatMemoryContext(memories: MemoryNode[]): string {
  if (memories.length === 0) {
    return "";
  }

  const groups = new Map<MemoryType, MemoryNode[]>();

  // Group by type with priority ordering
  const typePriority: MemoryType[] = [
    MemoryType.FACT,
    MemoryType.PREFERENCE,
    MemoryType.CONSTRAINT,
    MemoryType.EMOTIONAL,
    MemoryType.EVENT,
    MemoryType.ENTITY,
  ];

  for (const memory of memories) {
    const existing = groups.get(memory.type) || [];
    groups.set(memory.type, [...existing, memory]);
  }

  const parts: string[] = [];

  for (const type of typePriority) {
    const group = groups.get(type);
    if (group && group.length > 0) {
      const title = type.charAt(0).toUpperCase() + type.slice(1) + "s";
      const contents = group.map((m) => `- ${m.content}`).join("\n");
      parts.push(`### ${title} (Confidence: ${group[0].metadata.confidence.toFixed(2)})\n${contents}\n`);
    }
  }

  return parts.join("\n");
}
