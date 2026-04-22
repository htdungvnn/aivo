/**
 * Conversation Summarizer - Extract structured facts from conversations
 * Uses OpenAI API with structured JSON response format
 */

/* eslint-disable no-console */

import { OpenAI } from "openai";
import type {
  ExtractedFact,
  FactExtractionResult,
  MemoryNode,
} from "./types.ts";
import {
  MemoryType,
} from "./types.ts";

/**
 * Result of deduplication process
 */
interface DeduplicationResult {
  uniqueFacts: ExtractedFact[];
  duplicates: Array<{
    original: ExtractedFact;
    duplicate: ExtractedFact;
    similarity: number;
  }>;
}

/**
 * System prompt for fact extraction
 * Instructs the model to extract structured facts from conversations
 */
const FACT_EXTRACTION_SYSTEM_PROMPT = `You are AIVO's Memory Extraction Engine. Your job is to extract structured facts from fitness coaching conversations.

Focus on extracting facts that are:
- **Health-related**: injuries, conditions, symptoms, pain levels, limitations
- **Preferences**: foods (like/dislike), workout times, equipment preferences, environment
- **Goals**: explicit fitness goals, weight targets, timeline expectations
- **Events**: completed workouts, achievements, milestones, progress markers
- **Constraints**: time availability, equipment access, location limitations, budget
- **Emotional state**: motivation levels, energy, mood, pain/discomfort, confidence

IGNORE:
- General chit-chat and greetings
- Hypothetical questions ("what if...")
- Already captured facts that appear in the existing memories
- Vague statements without specific details

Return a JSON object with this exact schema:
{
  "facts": [
    {
      "type": "fact|preference|entity|event|emotional|constraint",
      "content": "A clear, concise statement of the fact (2-15 words)",
      "confidence": 0.85,
      "relatedTo": ["fact_type_hints"]
    }
  ]
}

Guidelines:
- Be specific: "lower back pain from deadlifts" not "back problem"
- Use natural language: "User dislikes running" not "preference: running=false"
- Confidence should reflect certainty: 0.9+ for explicit statements, 0.7-0.8 for inferences
- Only extract facts that are clearly stated or directly implied
- Each fact should be self-contained and understandable without context
- Maximum 5 facts per extraction to avoid noise
- Avoid extracting the same fact in slightly different wording

Examples:
Conversation: "My lower back still hurts from when I hurt it deadlifting 3 weeks ago"
→ {"facts": [{"type": "fact", "content": "User has lower back injury from deadlifts", "confidence": 0.95, "relatedTo": ["injury", "pain"]}]}

Conversation: "I really hate broccoli and most vegetables"
→ {"facts": [{"type": "preference", "content": "User dislikes broccoli and most vegetables", "confidence": 0.9, "relatedTo": ["food", "dislike"]}]}

Conversation: "Just finished my first 5k run today!"
→ {"facts": [{"type": "event", "content": "User completed first 5k run", "confidence": 0.95, "relatedTo": ["running", "achievement"]}]}`;

/**
 * Conversation message format
 */
export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
}

/**
 * Configuration for the summarizer
 */
export interface SummarizerConfig {
  /** OpenAI API key */
  openaiApiKey: string;
  /** Model to use for extraction (default: gpt-4o-mini) */
  model?: string;
  /** Maximum facts to extract per conversation */
  maxFacts?: number;
  /** Minimum confidence threshold (0-1) */
  minConfidence?: number;
  /** Whether to deduplicate against existing memories */
  deduplicate?: boolean;
  /** Similarity threshold for deduplication (0-1) */
  deduplicationThreshold?: number;
}

/**
 * ConversationSummarizer extracts structured facts from conversations
 */
export class ConversationSummarizer {
  private openai: OpenAI;
  private config: Required<SummarizerConfig>;

  constructor(config: SummarizerConfig) {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    this.config = {
      openaiApiKey: config.openaiApiKey,
      model: config.model ?? "gpt-4o-mini",
      maxFacts: config.maxFacts ?? 5,
      minConfidence: config.minConfidence ?? 0.7,
      deduplicate: config.deduplicate ?? true,
      deduplicationThreshold: config.deduplicationThreshold ?? 0.85,
    };
  }

  /**
   * Extract facts from a conversation turn
   * @param userId - The user ID
   * @param conversation - The conversation messages (recent turns)
   * @param existingMemories - Existing memories to avoid duplication
   * @returns Extracted facts with confidence scores
   */
  async extractFacts(
    userId: string,
    conversation: Message[],
    existingMemories: MemoryNode[] = []
  ): Promise<ExtractedFact[]> {
    const startTime = Date.now();

    // Build the extraction prompt
    const prompt = this.buildExtractionPrompt(conversation, existingMemories);

    try {
      // Call OpenAI with JSON response format
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: "system", content: FACT_EXTRACTION_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3, // Low temperature for consistent extraction
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.warn("No content in OpenAI response");
        return [];
      }

      const parsed = JSON.parse(content);
      const facts: ExtractedFact[] = [];

      // Validate and filter facts
      for (const fact of parsed.facts || []) {
        if (!fact.type || !fact.content || typeof fact.confidence !== "number") {
          continue;
        }

        // Validate type
        if (!Object.values(MemoryType).includes(fact.type)) {
          // Map to closest valid type
          fact.type = this.mapToValidType(fact.type);
        }

        // Filter by confidence threshold
        if (fact.confidence < this.config.minConfidence) {
          continue;
        }

        // Truncate content if too long
        fact.content = this.truncateContent(fact.content);

        facts.push({
          type: fact.type,
          content: fact.content,
          confidence: Math.min(1, Math.max(0, fact.confidence)),
          relatedTo: fact.relatedTo,
        });
      }

      // Limit number of facts
      const limitedFacts = facts.slice(0, this.config.maxFacts);

      // Deduplicate against existing memories if enabled
      if (this.config.deduplicate && existingMemories.length > 0) {
        const dedupResult = await this.deduplicateFacts(limitedFacts, existingMemories);
        return dedupResult.uniqueFacts;
      }

      const processingTime = Date.now() - startTime;
      console.log(
        `[Memory] Extracted ${limitedFacts.length} facts in ${processingTime}ms for user ${userId}`
      );

      return limitedFacts;
    } catch (error: unknown) {
      console.error("Fact extraction failed:", error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  /**
   * Build the prompt for fact extraction
   */
  private buildExtractionPrompt(
    conversation: Message[],
    existingMemories: MemoryNode[]
  ): string {
    const conversationText = conversation
      .map((msg) => `${msg.role === "user" ? "User" : "AI"}: ${msg.content}`)
      .join("\n");

    // Get summary of existing memories to avoid duplication
    const existingSummary = this.formatExistingMemories(existingMemories);

    return `Conversation (most recent turn):
${conversationText}

${existingSummary}

Extract any new facts from this conversation that aren't already captured in the existing memories. Focus on information that would be useful for future coaching sessions.`;
  }

  /**
   * Format existing memories for inclusion in the prompt
   */
  private formatExistingMemories(memories: MemoryNode[]): string {
    if (memories.length === 0) {
      return "Existing memories: None";
    }

    // Group by type for cleaner presentation
    const grouped = new Map<string, MemoryNode[]>();
    for (const memory of memories) {
      const key = memory.type;
      const existing = grouped.get(key) || [];
      grouped.set(key, [...existing, memory]);
    }

    let output = "Existing memories:\n";
    for (const [type, nodes] of grouped.entries()) {
      output += `\n${type}:\n`;
      for (const node of nodes.slice(0, 10)) {
        // Limit to prevent prompt overflow
        output += `- ${node.content} (confidence: ${(node.metadata.confidence * 100).toFixed(0)}%)\n`;
      }
      if (nodes.length > 10) {
        output += `  ...and ${nodes.length - 10} more\n`;
      }
    }

    return output;
  }

  /**
   * Deduplicate extracted facts against existing memories
   * Uses semantic similarity to avoid storing duplicate information
   */
  private async deduplicateFacts(
    facts: ExtractedFact[],
    existingMemories: MemoryNode[]
  ): Promise<DeduplicationResult> {
    const uniqueFacts: ExtractedFact[] = [];
    const duplicates: Array<{
      original: ExtractedFact;
      duplicate: ExtractedFact;
      similarity: number;
    }> = [];

    // Get embeddings for all facts
    const factEmbeddings = new Map<ExtractedFact, number[]>();

    for (const fact of facts) {
      // Check if this fact is semantically similar to any existing memory
      const factEmbedding = await this.getTextEmbedding(fact.content);
      factEmbeddings.set(fact, factEmbedding);

      let isDuplicate = false;
      let maxSimilarity = 0;

      for (const memory of existingMemories) {
        const similarity = this.cosineSimilarity(factEmbedding, memory.embedding);
        maxSimilarity = Math.max(maxSimilarity, similarity);

        if (similarity > this.config.deduplicationThreshold) {
          // This fact is too similar to existing memory
          duplicates.push({
            original: fact,
            duplicate: {
              type: memory.type,
              content: memory.content,
              confidence: memory.metadata.confidence,
            },
            similarity,
          });
          isDuplicate = true;
          break;
        }
      }

      // Also check against other new facts
      if (!isDuplicate) {
        for (const otherFact of facts) {
          if (otherFact === fact) {continue;}
          const otherEmbedding = factEmbeddings.get(otherFact);
          if (otherEmbedding) {
            const similarity = this.cosineSimilarity(factEmbedding, otherEmbedding);
            if (similarity > this.config.deduplicationThreshold) {
              isDuplicate = true;
              duplicates.push({
                original: fact,
                duplicate: otherFact,
                similarity,
              });
              break;
            }
          }
        }
      }

      if (!isDuplicate) {
        uniqueFacts.push(fact);
      }
    }

    return { uniqueFacts, duplicates };
  }

  /**
   * Get embedding for a text string
   * Caches embeddings to avoid redundant API calls
   */
  private async getTextEmbedding(text: string): Promise<number[]> {
    const cacheKey = this.createEmbeddingCacheKey(text);

    // Check in-memory cache (could be extended to use a distributed cache)
    const cached = this.embeddingCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.openai.embeddings.create({
        model: "text-embedding-3-small",
        input: this.truncateForEmbedding(text),
      });

      const embedding = response.data[0].embedding;

      // Cache the embedding
      this.embeddingCache.set(cacheKey, embedding);

      return embedding;
    } catch (error) {
      console.error("Failed to get embedding:", error);
      // Return zero vector as fallback (not ideal but prevents crashes)
      return new Array(1536).fill(0);
    }
  }

  /**
   * Create a cache key for text embedding
   */
  private createEmbeddingCacheKey(text: string): string {
    // Simple hash - in production use a proper hash function
    return text.slice(0, 100).toLowerCase().trim();
  }

  /**
   * Compute cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
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
   * Map an invalid type string to a valid MemoryType
   */
  private mapToValidType(type: string): MemoryType {
    const lowerType = type.toLowerCase();
    const typeMap: Record<string, MemoryType> = {
      // Common variations
      injury: MemoryType.FACT,
      health: MemoryType.FACT,
      food: MemoryType.PREFERENCE,
      dislike: MemoryType.PREFERENCE,
      like: MemoryType.PREFERENCE,
      achievement: MemoryType.EVENT,
      workout: MemoryType.EVENT,
      mood: MemoryType.EMOTIONAL,
      pain: MemoryType.EMOTIONAL,
      restriction: MemoryType.CONSTRAINT,
      limitation: MemoryType.CONSTRAINT,
      equipment: MemoryType.ENTITY,
      gym: MemoryType.ENTITY,
      place: MemoryType.ENTITY,
      person: MemoryType.ENTITY,
    };

    return typeMap[lowerType] || MemoryType.FACT;
  }

  /**
   * Truncate content to reasonable length
   */
  private truncateContent(content: string, maxLength: number = 200): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.slice(0, maxLength - 3) + "...";
  }

  /**
   * Truncate text for embedding API
   */
  private truncateForEmbedding(text: string, maxChars: number = 8000): string {
    if (text.length <= maxChars) {
      return text;
    }
    return text.slice(0, maxChars);
  }

  /**
   * In-memory embedding cache (simple LRU could be added)
   */
  private embeddingCache = new Map<string, number[]>();
}

/**
 * Create a new summarizer instance
 */
export function createSummarizer(config: SummarizerConfig): ConversationSummarizer {
  return new ConversationSummarizer(config);
}

/**
 * Convenience function to extract facts from a conversation
 */
export async function extractFactsFromConversation(
  config: SummarizerConfig,
  conversation: Message[],
  existingMemories: MemoryNode[] = []
): Promise<FactExtractionResult> {
  const summarizer = createSummarizer(config);
  const startTime = Date.now();

  const facts = await summarizer.extractFacts("", conversation, existingMemories);

  const processingTime = Date.now() - startTime;

  return {
    facts,
    confidence: facts.length > 0 ? facts.reduce((sum, f) => sum + f.confidence, 0) / facts.length : 0,
    processingTimeMs: processingTime,
  };
}
