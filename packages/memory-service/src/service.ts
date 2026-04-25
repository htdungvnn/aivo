/**
 * MemoryService - Core service for semantic coaching memory
 * Integrates summarization, vector search, and context building
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { OpenAI } from "openai";
import {
  memoryNodes,
  memoryEdges,
  conversations,
  schema,
} from "@aivo/db";
import { sql, eq, or, desc, inArray } from "drizzle-orm";
import { drizzle as drizzleClient } from "drizzle-orm/d1";
import type { DrizzleD1Database } from "drizzle-orm/d1";

type DB = DrizzleD1Database<typeof schema>;
import type {
  MemoryNode,
  MemoryEdge,
  MemoryQuery,
  MemoryMetadata,
  TokenBudget,
  ExtractedFact,
  Message,
} from "./types.ts";
import {
  DEFAULT_TOKEN_BUDGET,
  createMemoryNode,
  isHealthCritical,
  MemoryType,
  RelationshipType,
} from "./types.ts";
import { ConversationSummarizer } from "./summarizer.ts";
import { MemorySearcher } from "./vector-search.ts";
import type { ContextBuilder} from "./compression.ts";
import { estimateTokens } from "./compression.ts";

/**
 * MemoryService configuration
 */
export interface MemoryServiceConfig {
  /** OpenAI API key */
  openaiApiKey: string;
  /** Drizzle database instance */
  db: DB;
  /** Summarizer configuration */
  summarizerConfig?: {
    maxFacts?: number;
    minConfidence?: number;
    deduplicationThreshold?: number;
  };
  /** Vector search configuration */
  vectorSearchConfig?: {
    semanticWeight?: number;
    recencyWeight?: number;
    confidenceWeight?: number;
    recencyHalfLifeHours?: number;
  };
  /** Context builder configuration */
  contextBuilderConfig?: {
    tokenBudget?: TokenBudget;
    minimumMemories?: number;
    maxPerType?: number;
  };
  /** Whether to process conversations in real-time */
  realTimeProcessing?: boolean;
  /** Maximum memories to store per user (0 = unlimited) */
  maxMemoriesPerUser?: number;
  /** Age in days after which memories are candidates for compression (0 = disabled) */
  compressionAgeDays?: number;
}

/**
 * Default configuration
 */
const DEFAULT_SERVICE_CONFIG: Required<Omit<MemoryServiceConfig, "openaiApiKey" | "db">> = {
  summarizerConfig: {
    maxFacts: 5,
    minConfidence: 0.7,
    deduplicationThreshold: 0.85,
  },
  vectorSearchConfig: {
    semanticWeight: 0.6,
    recencyWeight: 0.2,
    confidenceWeight: 0.2,
    recencyHalfLifeHours: 168,
  },
  contextBuilderConfig: {
    tokenBudget: DEFAULT_TOKEN_BUDGET,
    minimumMemories: 3,
    maxPerType: 5,
  },
  realTimeProcessing: true,
  maxMemoriesPerUser: 500,
  compressionAgeDays: 30,
};

/**
 * MemoryService provides the complete memory system
 */
export class MemoryService {
  private openai: OpenAI;
  private db: DB;
  private summarizer: ConversationSummarizer;
  private searcher: MemorySearcher;
  private contextBuilder: ContextBuilder;
  private config: Required<Omit<MemoryServiceConfig, "openaiApiKey" | "db">>;

  constructor(config: MemoryServiceConfig) {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    this.db = config.db;
    this.config = { ...DEFAULT_SERVICE_CONFIG, ...config };

    // Initialize components
    this.summarizer = new ConversationSummarizer({
      openaiApiKey: config.openaiApiKey,
      ...this.config.summarizerConfig,
    });

    this.searcher = new MemorySearcher({
      openaiApiKey: config.openaiApiKey,
      ...this.config.vectorSearchConfig,
    });

    // Context builder will be created on-demand in getMemoriesForContext
    this.contextBuilder = null as any; // Will be created when needed
  }

  /**
   * Get the database instance
   */
  getDB(): DB {
    return this.db;
  }

  /**
   * Process a conversation turn - extract facts and store memories
   * This should be called after each AI response
   */
  async processConversationTurn(
    userId: string,
    userMessage: string,
    aiResponse: string,
    conversationId: string
  ): Promise<{
    factsExtracted: number;
    memoriesCreated: number;
    edgesCreated: number;
  }> {
    // 1. Fetch recent conversation history (last 5 turns)
    const recentTurns = await this.getRecentTurns(userId, 5);

    // 2. Fetch existing memories for deduplication
    const existingMemories = await this.getMemories(userId, { limit: 100 });

    // 3. Build conversation for extraction
    const conversation = [
      ...recentTurns,
      { role: "user" as const, content: userMessage },
      { role: "assistant" as const, content: aiResponse },
    ];

    // 4. Extract facts
    const extractedFacts = await this.summarizer.extractFacts(
      userId,
      conversation,
      existingMemories
    );

    if (extractedFacts.length === 0) {
      return { factsExtracted: 0, memoriesCreated: 0, edgesCreated: 0 };
    }

    // 5. Generate embeddings for new facts
    const factsWithEmbeddings = await this.embedFacts(extractedFacts);

    // 6. Create memory nodes
    const createdNodes: Omit<MemoryNode, 'id'>[] = [];
    for (const fact of factsWithEmbeddings) {
      const node = createMemoryNode(userId, fact.type, fact.content, fact.embedding, {
        source: "conversation",
        confidence: fact.confidence,
        sourceId: conversationId,
        verifications: 1,
      });

      createdNodes.push(node);
    }

    // 7. Store memory nodes in database
    const insertedNodes = await this.insertMemoryNodes(createdNodes);

    // 8. Create relationships between new facts and existing memories
    const edgesCreated = await this.createMemoryEdges(
      userId,
      insertedNodes,
      existingMemories,
      extractedFacts
    );

    // 9. Check memory limit and prune if necessary
    await this.enforceMemoryLimit(userId);

    // 10. Update compressed contexts periodically
    await this.updateCompressedContext(userId);

    return {
      factsExtracted: extractedFacts.length,
      memoriesCreated: insertedNodes.length,
      edgesCreated,
    };
  }

  /**
   * Get relevant memories for AI context injection
   */
  async getMemoriesForContext(
    userId: string,
    currentQuery: string,
    tokenBudget: number = DEFAULT_TOKEN_BUDGET.total
  ): Promise<string> {
    // Fetch memories that might be relevant
    const memories = await this.getMemories(userId, {
      limit: 50,
      minConfidence: 0.6,
    });

    if (memories.length === 0) {
      return "";
    }

    // Group memories by type
    const grouped = new Map<string, MemoryNode[]>();
    for (const memory of memories) {
      const key = memory.type;
      const existing = grouped.get(key) || [];
      grouped.set(key, [...existing, memory]);
    }

    // Sort each group by confidence
    for (const group of grouped.values()) {
      group.sort((a, b) => b.metadata.confidence - a.metadata.confidence);
    }

    // Build context string with token budgeting
    const parts: string[] = [];
    const typeLabels: Record<string, string> = {
      fact: "Facts",
      preference: "Preferences",
      constraint: "Constraints",
      emotional: "Emotional State",
      event: "Events & Achievements",
      entity: "Entities",
    };

    const typeOrder = ["fact", "preference", "constraint", "emotional", "event", "entity"];
    const reservePerType = Math.floor(tokenBudget * 0.15); // 15% per type
    const criticalReserve = Math.floor(tokenBudget * 0.2); // 20% for critical health

    let totalTokens = 0;

    // Critical health first
    const criticalFacts = grouped.get("fact")?.filter(m => isHealthCritical(m.content)) || [];
    if (criticalFacts.length > 0) {
      const criticalText = this.formatGroup(criticalFacts, criticalReserve);
      if (criticalText) {
        parts.push("## CRITICAL HEALTH INFORMATION\n" + criticalText);
        totalTokens += estimateTokens(criticalText) + 30;
      }
    }

    // Other types
    for (const type of typeOrder) {
      const group = grouped.get(type);
      if (!group) {continue;}

      if (type === "fact") {
        // Skip non-critical facts if we already showed critical
        const nonCritical = group.filter(m => !isHealthCritical(m.content));
        if (nonCritical.length === 0) {continue;}
        const groupText = this.formatGroup(nonCritical.slice(0, 5), reservePerType);
        if (groupText) {
          parts.push(`## ${typeLabels.facts}\n${groupText}`);
          totalTokens += estimateTokens(groupText) + 20;
        }
      } else {
        const groupText = this.formatGroup(group.slice(0, 5), reservePerType);
        if (groupText) {
          parts.push(`## ${typeLabels[type]}\n${groupText}`);
          totalTokens += estimateTokens(groupText) + 20;
        }
      }
    }

    let contextString = parts.join("\n\n");

    // Truncate if over budget
    if (totalTokens > tokenBudget) {
      const maxChars = tokenBudget * 4;
      if (contextString.length > maxChars) {
        contextString = contextString.slice(0, maxChars - 50) + "... [truncated]";
      }
    }

    if (contextString) {
      return `\n\n### User Profile & Memories\n${contextString}\n`;
    }

    return "";
  }

  /**
   * Format a group of memories into bullet points
   */
  private formatGroup(memories: MemoryNode[], tokenBudget: number): string {
    if (memories.length === 0) {return "";}

    const lines: string[] = [];
    let currentTokens = 0;

    for (const memory of memories) {
      const line = `- ${memory.content} (${Math.round(memory.metadata.confidence * 100)}%)`;
      const lineTokens = estimateTokens(line);

      if (currentTokens + lineTokens > tokenBudget && lines.length > 0) {
        break;
      }

      lines.push(line);
      currentTokens += lineTokens;
    }

    return lines.join("\n");
  }

  /**
   * Fetch memories for search - used by ContextBuilder
   * @internal
   */
  async fetchMemories(query: MemoryQuery): Promise<MemoryNode[]> {
    return this.getMemories(query.userId, {
      types: query.types,
      minConfidence: query.minConfidence,
      maxAgeDays: query.maxAgeDays,
      limit: query.limit,
    });
  }

  /**
   * Get memories for a user with optional filters
   */
  async getMemories(
    userId: string,
    query: Partial<MemoryQuery> = {}
  ): Promise<MemoryNode[]> {
    const drizzle = drizzleClient(this.db as any, { schema }) as any;

    // Build query
    let dbQuery = drizzle.memoryNodes
      .select()
      .where(sql`${memoryNodes.userId} = ${userId}`);

    // Apply type filter
    if (query.types && query.types.length > 0) {
      dbQuery = dbQuery.where(sql`${memoryNodes.type} = ANY(${query.types})`);
    }

    // Apply confidence filter
    if (query.minConfidence !== undefined) {
      dbQuery = dbQuery.where(
        sql`json_extract(${memoryNodes.metadata}, '$.confidence') >= ${query.minConfidence}`
      );
    }

    // Apply age filter
    if (query.maxAgeDays !== undefined) {
      const cutoff = Date.now() - query.maxAgeDays * 24 * 60 * 60 * 1000;
      dbQuery = dbQuery.where(sql`${memoryNodes.extractedAt} >= ${cutoff}`);
    }

    // Order and limit
    dbQuery = dbQuery
      .orderBy(sql`json_extract(${memoryNodes.metadata}, '$.confidence') DESC`)
      .orderBy(sql`${memoryNodes.extractedAt} DESC`)
      .limit(query.limit ?? 100);

    const rows = await dbQuery;

    // Parse JSON fields
    return rows.map((row: any) => ({
      ...row,
      metadata: typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata,
      relatedNodes: typeof row.relatedNodes === "string" ? JSON.parse(row.relatedNodes) : row.relatedNodes,
      embedding: typeof row.embedding === "string" ? JSON.parse(row.embedding) : row.embedding,
    })) as MemoryNode[];
  }

  /**
   * Create a memory node directly
   */
  async createMemory(
    userId: string,
    type: MemoryType,
    content: string,
    metadata?: Partial<Omit<MemoryMetadata, "extractedAt" | "verifications">>
  ): Promise<MemoryNode> {
    // Get embedding
    const embedding = await this.getEmbedding(content);
    const now = Date.now();

    const node = createMemoryNode(userId, type, content, embedding, {
      ...metadata,
      source: metadata?.source ?? "manual",
      confidence: metadata?.confidence ?? 1.0,
      extractedAt: Math.floor(now / 1000),
      confirmed: metadata?.confirmed ?? false,
    });

    const inserted = await this.insertMemoryNodes([node]);
    return inserted[0];
  }

  /**
   * Delete a memory node and its edges
   */
  async deleteMemory(memoryId: string): Promise<boolean> {
    try {
      const drizzle = drizzleClient(this.db as any, { schema }) as any;

      // Delete edges first (cascade should handle but explicit is safer)
      await drizzle.memoryEdges
        .delete()
        .where(sql`${memoryEdges.fromNodeId} = ${memoryId} OR ${memoryEdges.toNodeId} = ${memoryId}`)
        .run();

      // Delete node
      const result = await drizzle.memoryNodes
        .delete()
        .where(sql`${memoryNodes.id} = ${memoryId}`)
        .run();

      return result.changes > 0;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Update memory verification count
   */
  async verifyMemory(memoryId: string): Promise<boolean> {
    try {
      const drizzle = drizzleClient(this.db as any, { schema }) as any;

      // Read current metadata
      const existing = await drizzle.memoryNodes
        .select({ metadata: memoryNodes.metadata })
        .where(sql`${memoryNodes.id} = ${memoryId}`)
        .limit(1);

      if (existing.length === 0) {
        return false;
      }

      const metadata = typeof existing[0].metadata === "string"
        ? JSON.parse(existing[0].metadata)
        : existing[0].metadata;

      // Update verification count
      const updatedMetadata = {
        ...metadata,
        verifications: (metadata.verifications || 0) + 1,
      };

      const result = await drizzle.memoryNodes
        .update({
          metadata: JSON.stringify(updatedMetadata),
          updatedAt: Date.now(),
        })
        .where(sql`${memoryNodes.id} = ${memoryId}`)
        .run();

      return result.changes > 0;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Get embedding for text
   */
  private async getEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text.slice(0, 8000), // Truncate for API limit
      });

      return response.data[0].embedding;
    } catch (_error) {
      return new Array(1536).fill(0);
    }
  }

  /**
   * Embed multiple facts in parallel
   */
  private async embedFacts(facts: ExtractedFact[]): Promise<(ExtractedFact & { embedding: number[] })[]> {
    const embeddings = await Promise.all(
      facts.map((fact) => this.getEmbedding(fact.content))
    );

    return facts.map((fact, i) => ({
      ...fact,
      embedding: embeddings[i],
    }));
  }

  /**
   * Get recent conversation turns from database
   */
  private async getRecentTurns(userId: string, count: number): Promise<Message[]> {
    try {
      const drizzle = drizzleClient(this.db as any, { schema }) as any;
      const rows = await drizzle.conversations
        .select()
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.createdAt))
        .limit(count);

      // Transform into messages format
      const allMessages: Message[] = [];
      rows.reverse().forEach((row: any) => {
        allMessages.push({ role: "user", content: row.message });
        if (row.response) {
          allMessages.push({ role: "assistant", content: row.response });
        }
      });

      return allMessages;
    } catch (_error) {
      return [];
    }
  }

  /**
   * Insert memory nodes into database
   */
  private async insertMemoryNodes(
    nodes: Omit<MemoryNode, 'id'>[] = [],
  ): Promise<MemoryNode[]> {
    if (nodes.length === 0) {return [];}

    // Convert to database format
    const preparedNodes = nodes.map((node) => ({
      id: crypto.randomUUID(),
      userId: node.userId,
      type: node.type,
      content: node.content,
      embedding: JSON.stringify(node.embedding),
      metadata: JSON.stringify(node.metadata),
      relatedNodes: JSON.stringify(node.relatedNodes),
      extractedAt: Math.floor(node.createdAt / 1000),
      updatedAt: Math.floor(node.updatedAt / 1000),
    }));

    // Insert using Drizzle
    const results = await Promise.all(
      preparedNodes.map((node) =>
        this.db.insert(memoryNodes).values(node).returning()
      )
    );

    // Parse JSON fields back
    return results.map((row: any) => ({
      ...row,
      metadata: typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata,
      relatedNodes: typeof row.relatedNodes === "string" ? JSON.parse(row.relatedNodes) : row.relatedNodes,
      embedding: typeof row.embedding === "string" ? JSON.parse(row.embedding) : row.embedding,
    })) as MemoryNode[];
  }

  /**
   * Create memory edges between new nodes and existing memories
   */
  private async createMemoryEdges(
    userId: string,
    newNodes: MemoryNode[],
    existingMemories: MemoryNode[],
    extractedFacts: ExtractedFact[]
  ): Promise<number> {
    let edgesCreated = 0;
    const nowSeconds = Math.floor(Date.now() / 1000);
    const edges: MemoryEdge[] = [];

    // Create edges based on relatedTo from extraction
    for (let i = 0; i < newNodes.length; i++) {
      const node = newNodes[i];
      const fact = extractedFacts[i];

      if (fact.relatedTo && fact.relatedTo.length > 0) {
        for (const relatedHint of fact.relatedTo) {
          // Find matching existing memories by content keyword or type
          for (const memory of existingMemories) {
            if (
              memory.content.toLowerCase().includes(relatedHint.toLowerCase()) ||
              memory.type === this.hintToType(relatedHint)
            ) {
              edges.push({
                id: crypto.randomUUID(),
                fromNodeId: node.id,
                toNodeId: memory.id,
                relationship: RelationshipType.RELATED_TO,
                weight: 0.7,
                createdAt: nowSeconds,
              });
              edgesCreated++;
            }
          }

          // Also connect between new nodes if they share hints
          for (let j = i + 1; j < newNodes.length; j++) {
            const otherNode = newNodes[j];
            if (
              otherNode.content.toLowerCase().includes(relatedHint.toLowerCase()) ||
              otherNode.type === this.hintToType(relatedHint)
            ) {
              edges.push({
                id: crypto.randomUUID(),
                fromNodeId: node.id,
                toNodeId: otherNode.id,
                relationship: RelationshipType.RELATED_TO,
                weight: 0.8,
                createdAt: nowSeconds,
              });
              edgesCreated++;
            }
          }
        }
      }

      // Connect nodes of the same type with high confidence
      for (let j = i + 1; j < newNodes.length; j++) {
        const otherNode = newNodes[j];
        if (
          node.type === otherNode.type &&
          Math.abs(node.metadata.confidence - otherNode.metadata.confidence) < 0.2
        ) {
          edges.push({
            id: crypto.randomUUID(),
            fromNodeId: node.id,
            toNodeId: otherNode.id,
            relationship: RelationshipType.RELATED_TO,
            weight: 0.6,
            createdAt: nowSeconds,
          });
          edgesCreated++;
        }
      }
    }

    // Insert edges
    if (edges.length > 0) {
      await this.db.insert(memoryEdges).values(edges);
    }

    return edgesCreated;
  }

  /**
   * Convert a related hint to a MemoryType
   */
  private hintToType(hint: string): MemoryType {
    const lowerHint = hint.toLowerCase();
    const typeMap: Record<string, MemoryType> = {
      injury: MemoryType.FACT,
      pain: MemoryType.EMOTIONAL,
      food: MemoryType.PREFERENCE,
      dislike: MemoryType.PREFERENCE,
      like: MemoryType.PREFERENCE,
      workout: MemoryType.EVENT,
      achievement: MemoryType.EVENT,
      gym: MemoryType.ENTITY,
      equipment: MemoryType.ENTITY,
      restriction: MemoryType.CONSTRAINT,
    };

    return typeMap[lowerHint] || MemoryType.FACT;
  }

  /**
   * Enforce memory limit by pruning old/low-confidence memories
   */
  private async enforceMemoryLimit(userId: string): Promise<void> {
    const maxMemories = this.config.maxMemoriesPerUser;
    if (maxMemories === 0) {return;} // Unlimited

    const drizzle = drizzleClient(this.db as any, { schema }) as any;

    // Count current memories
    const countResult = await drizzle.memoryNodes
      .select()
      .where(sql`${memoryNodes.userId} = ${userId}`)
      .limit(1);

    const count = countResult.length;

    if (count <= maxMemories) {return;}

    // Find memories to delete (oldest, lowest confidence, not critical)
    // We need to find critical memories by keyword search since isHealthCritical works on content
    const criticalCondition = sql`(
      ${memoryNodes.content} LIKE '%injury%' OR
      ${memoryNodes.content} LIKE '%pain%' OR
      ${memoryNodes.content} LIKE '%hurt%' OR
      ${memoryNodes.content} LIKE '%damage%' OR
      ${memoryNodes.content} LIKE '%strain%' OR
      ${memoryNodes.content} LIKE '%sprain%' OR
      ${memoryNodes.content} LIKE '%herniated%' OR
      ${memoryNodes.content} LIKE '%bulging%' OR
      ${memoryNodes.content} LIKE '%disc%' OR
      ${memoryNodes.content} LIKE '%surgery%' OR
      ${memoryNodes.content} LIKE '%recovery%' OR
      ${memoryNodes.content} LIKE '%rehab%' OR
      ${memoryNodes.content} LIKE '%hernia%' OR
      ${memoryNodes.content} LIKE '%fracture%' OR
      ${memoryNodes.content} LIKE '%broken%' OR
      ${memoryNodes.content} LIKE '%torn%' OR
      ${memoryNodes.content} LIKE '%rupture%' OR
      ${memoryNodes.content} LIKE '%dislocated%' OR
      ${memoryNodes.content} LIKE '%medical%' OR
      ${memoryNodes.content} LIKE '%doctor%' OR
      ${memoryNodes.content} LIKE '%physical therapy%' OR
      ${memoryNodes.content} LIKE '%chiropractor%' OR
      ${memoryNodes.content} LIKE '%lower back%' OR
      ${memoryNodes.content} LIKE '%upper back%' OR
      ${memoryNodes.content} LIKE '%neck%' OR
      ${memoryNodes.content} LIKE '%shoulder%' OR
      ${memoryNodes.content} LIKE '%knee%' OR
      ${memoryNodes.content} LIKE '%ankle%' OR
      ${memoryNodes.content} LIKE '%hip%' OR
      ${memoryNodes.content} LIKE '%elbow%' OR
      ${memoryNodes.content} LIKE '%wrist%' OR
      ${memoryNodes.content} LIKE '%pre-existing%' OR
      ${memoryNodes.content} LIKE '%condition%'
    )`;

    const toDelete = await drizzle.memoryNodes
      .select({ id: memoryNodes.id })
      .where(
        sql`${memoryNodes.userId} = ${userId} AND NOT ${criticalCondition}`
      )
      .orderBy(sql`${memoryNodes.extractedAt} ASC`)
      .limit(count - maxMemories);

    if (toDelete.length > 0) {
      const ids = toDelete.map((r: any) => r.id);

      // Delete edges using IN clause
      await drizzle.memoryEdges
        .delete()
        .where(
          or(
            inArray(memoryEdges.fromNodeId, ids),
            inArray(memoryEdges.toNodeId, ids)
          )
        )
        .run();

      // Delete nodes
      await drizzle.memoryNodes
        .delete()
        .where(inArray(memoryNodes.id, ids))
        .run();
    }
  }

  /**
   * Update compressed context (for old memories)
   */
  private async updateCompressedContext(_userId: string): Promise<void> {
    // This could create periodic summaries of old memories
    // For now, it's a placeholder
  }

  /**
   * Get memory statistics for a user
   */
  async getUserStats(userId: string): Promise<{
    totalMemories: number;
    byType: Record<string, number>;
    avgConfidence: number;
    oldestMemory: number | null;
    newestMemory: number | null;
  }> {
    const memories = await this.getMemories(userId);

    const byType: Record<string, number> = {};
    for (const mem of memories) {
      byType[mem.type] = (byType[mem.type] || 0) + 1;
    }

    const timestamps = memories.map((m) => m.metadata.extractedAt);
    const avgConfidence = memories.length > 0
      ? memories.reduce((sum, m) => sum + m.metadata.confidence, 0) / memories.length
      : 0;

    return {
      totalMemories: memories.length,
      byType,
      avgConfidence,
      oldestMemory: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestMemory: timestamps.length > 0 ? Math.max(...timestamps) : null,
    };
  }

  /**
   * Clear all memories for a user (for GDPR compliance, testing)
   */
  async clearUserMemories(userId: string): Promise<number> {
    try {
      const drizzle = drizzleClient(this.db as any, { schema }) as any;

      // Delete edges first using raw SQL
      await drizzle.execute(
        sql`DELETE FROM memory_edges WHERE from_node_id IN (SELECT id FROM memory_nodes WHERE user_id = ${userId}) OR to_node_id IN (SELECT id FROM memory_nodes WHERE user_id = ${userId})`
      );

      // Delete nodes
      const result = await drizzle.memoryNodes
        .delete()
        .where(eq(memoryNodes.userId, userId))
        .run();

      return result.changes;
    } catch (_error) {
      return 0;
    }
  }
}

/**
 * Create a new MemoryService instance
 */
export function createMemoryService(config: MemoryServiceConfig): MemoryService {
  return new MemoryService(config);
}

/**
 * Create MemoryService with simple configuration
 */
export async function createMemoryServiceWithDB(
  openaiApiKey: string,
  db: DB
): Promise<MemoryService> {
  return createMemoryService({ openaiApiKey, db });
}
