/**
 * Vector Search - Semantic memory retrieval using embeddings
 * Supports hybrid scoring: semantic similarity + recency + confidence
 */

import { OpenAI } from "openai";
import { MemoryNode, MemoryQuery, MemoryType, isMemoryQuery, isHealthCritical } from "./types.ts";

/**
 * Configuration for the vector search service
 */
export interface VectorSearchConfig {
  /** OpenAI API key for embedding generation */
  openaiApiKey: string;
  /** Embedding model to use */
  embeddingModel?: string;
  /** Weight for semantic similarity in hybrid scoring (0-1) */
  semanticWeight?: number;
  /** Weight for recency in hybrid scoring (0-1) */
  recencyWeight?: number;
  /** Weight for confidence in hybrid scoring (0-1) */
  confidenceWeight?: number;
  /** Half-life for recency decay in hours (default: 168 = 1 week) */
  recencyHalfLifeHours?: number;
  /** Maximum candidates to fetch from database before scoring */
  candidateLimit?: number;
  /** Cache TTL for embeddings in milliseconds */
  embeddingCacheTtl?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<VectorSearchConfig> = {
  openaiApiKey: "",
  embeddingModel: "text-embedding-3-small",
  semanticWeight: 0.6,
  recencyWeight: 0.2,
  confidenceWeight: 0.2,
  recencyHalfLifeHours: 168,
  candidateLimit: 50,
  embeddingCacheTtl: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * Scored memory with relevance score
 */
export interface ScoredMemory {
  memory: MemoryNode;
  score: number;
  breakdown: {
    semantic: number;
    recency: number;
    confidence: number;
  };
}

/**
 * MemorySearcher handles semantic search and retrieval
 */
export class MemorySearcher {
  private openai: OpenAI;
  private config: Required<VectorSearchConfig>;
  private embeddingCache = new Map<string, { embedding: number[]; expiresAt: number }>();

  constructor(config: VectorSearchConfig) {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Search for relevant memories based on query
   * @param query - Search parameters
   * @param fetchFn - Function to fetch candidates from database
   * @returns Scored and ranked memories
   */
  async search(
    query: MemoryQuery,
    fetchFn: (q: MemoryQuery) => Promise<MemoryNode[]>
  ): Promise<MemoryNode[]> {
    if (!isMemoryQuery(query)) {
      throw new Error("Invalid MemoryQuery");
    }

    // Get query embedding if a query string is provided
    let queryEmbedding: number[] | null = null;
    if (query.query) {
      queryEmbedding = await this.getEmbedding(query.query);
    }

    // Fetch candidates from database
    let candidates = await fetchFn(query);

    // Apply filters
    candidates = this.filterCandidates(candidates, query);

    // If no query embedding and no filters that need scoring, return as-is
    if (!queryEmbedding && !query.query) {
      return candidates.slice(0, query.limit || 10);
    }

    // Score and rank
    const scored = await Promise.all(
      candidates.map(async (memory) => {
        const score = this.computeScore(memory, queryEmbedding, query.query);
        return { memory, score };
      })
    );

    // Sort by score and return top-k
    const sorted = scored
      .filter((s) => s.score >= (query.minConfidence ?? 0.5))
      .sort((a, b) => b.score - a.score)
      .slice(0, query.limit || 10);

    // Update lastAccessed timestamps for retrieved memories
    await this.updateAccessTimes(sorted.map((s) => s.memory.id));

    return sorted.map((s) => s.memory);
  }

  /**
   * Compute hybrid score for a memory
   */
  private computeScore(
    memory: MemoryNode,
    queryEmbedding: number[] | null,
    queryText?: string
  ): number {
    let semanticScore = 0;
    let recencyScore = 0;
    let confidenceScore = 0;

    // Semantic similarity (if query embedding available)
    if (queryEmbedding && memory.embedding.length > 0) {
      semanticScore = this.cosineSimilarity(queryEmbedding, memory.embedding);
    } else if (queryText) {
      // Fallback: keyword matching
      semanticScore = this.keywordScore(queryText, memory.content);
    }

    // Recency boost (exponential decay)
    const ageHours = (Date.now() - memory.metadata.extractedAt) / (1000 * 60 * 60);
    const halfLife = this.config.recencyHalfLifeHours;
    recencyScore = Math.exp(-ageHours / halfLife);

    // Confidence boost
    confidenceScore = memory.metadata.confidence;

    // Bonus for critical health info
    const healthCriticalBonus = isHealthCritical(memory.content) ? 0.1 : 0;

    // Priority type boost
    const typeBoost = this.getTypeBoost(memory.type);

    // Weighted sum
    const weightedScore =
      semanticScore * this.config.semanticWeight +
      recencyScore * this.config.recencyWeight +
      confidenceScore * this.config.confidenceWeight +
      healthCriticalBonus +
      typeBoost;

    // Normalize to 0-1 range
    return Math.min(1, Math.max(0, weightedScore));
  }

  /**
   * Get boost for priority memory types
   */
  private getTypeBoost(type: MemoryType): number {
    const priorityBoosts: Record<MemoryType, number> = {
      [MemoryType.FACT]: 0.05,
      [MemoryType.PREFERENCE]: 0.03,
      [MemoryType.CONSTRAINT]: 0.08, // Important for safety
      [MemoryType.EMOTIONAL]: 0.02,
      [MemoryType.EVENT]: 0.0,
      [MemoryType.ENTITY]: 0.0,
    };
    return priorityBoosts[type] ?? 0;
  }

  /**
   * Simple keyword-based scoring as fallback
   */
  private keywordScore(query: string, content: string): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();

    let matches = 0;
    for (const word of queryWords) {
      if (word.length > 3 && contentLower.includes(word)) {
        matches++;
      }
    }

    return matches / Math.max(1, queryWords.length);
  }

  /**
   * Filter candidates based on query parameters
   */
  private filterCandidates(candidates: MemoryNode[], query: MemoryQuery): MemoryNode[] {
    return candidates.filter((memory) => {
      // Type filter
      if (query.types && query.types.length > 0 && !query.types.includes(memory.type)) {
        return false;
      }

      // Confidence filter
      if (memory.metadata.confidence < (query.minConfidence ?? 0)) {
        return false;
      }

      // Age filter
      if (query.maxAgeDays) {
        const ageHours = (Date.now() - memory.metadata.extractedAt) / (1000 * 60 * 60);
        if (ageHours > query.maxAgeDays * 24) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Get embedding for text with caching
   */
  private async getEmbedding(text: string): Promise<number[]> {
    const cacheKey = this.createCacheKey(text);
    const now = Date.now();

    // Check cache
    const cached = this.embeddingCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.embedding;
    }

    try {
      const response = await this.openai.embeddings.create({
        model: this.config.embeddingModel,
        input: this.truncateText(text),
      });

      const embedding = response.data[0].embedding;

      // Cache with TTL
      this.embeddingCache.set(cacheKey, {
        embedding,
        expiresAt: now + this.config.embeddingCacheTtl,
      });

      return embedding;
    } catch (error) {
      console.error("Failed to generate embedding:", error);
      return new Array(1536).fill(0);
    }
  }

  /**
   * Create cache key for text
   */
  private createCacheKey(text: string): string {
    // Simple hash - use proper hash in production if needed
    return text.slice(0, 200).toLowerCase().trim().replace(/\s+/g, " ");
  }

  /**
   * Truncate text for embedding API
   */
  private truncateText(text: string, maxChars: number = 8000): string {
    if (text.length <= maxChars) {
      return text;
    }
    return text.slice(0, maxChars);
  }

  /**
   * Update lastAccessed timestamps for retrieved memories
   * This helps with recency scoring and access analytics
   */
  private async updateAccessTimes(memoryIds: string[]): Promise<void> {
    // This would update the database - implementation depends on your DB layer
    // For now, we'll just log
    if (memoryIds.length > 0) {
      console.log(`[Memory] Accessed ${memoryIds.length} memories`);
    }
  }

  /**
   * Compute cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Clear the embedding cache (useful for testing)
   */
  clearCache(): void {
    this.embeddingCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hits: number; misses: number } {
    // In a full implementation, track hits/misses
    return { size: this.embeddingCache.size, hits: 0, misses: 0 };
  }
}

/**
 * Create a new memory searcher instance
 */
export function createSearcher(config: VectorSearchConfig): MemorySearcher {
  return new MemorySearcher(config);
}

/**
 * Create a simple searcher with just OpenAI API key
 */
export function createSearcherFromKey(openaiApiKey: string): MemorySearcher {
  return new MemorySearcher({ openaiApiKey });
}
