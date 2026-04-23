/**
 * AIVO Memory Service
 * Semantic coaching memory system for persistent user context
 *
 * @packageDocumentation
 */

// Main service
export { MemoryService, createMemoryService, createMemoryServiceWithDB } from "./service.ts";
export type { MemoryServiceConfig } from "./service.ts";

// Types
export type {
  MemoryType,
  RelationshipType,
  MemoryNode,
  MemoryEdge,
  MemoryQuery,
  MemoryMetadata,
  ExtractedFact,
  FactExtractionResult,
  MemoryContext,
  TokenBudget,
} from "./types.ts";

export {
  DEFAULT_TOKEN_BUDGET,
  isHealthCritical,
  isValidEmbedding,
  isMemoryNode,
  isMemoryQuery,
  formatMemoryContext,
  createMemoryNode,
  createMemoryEdge,
} from "./types.ts";

// Summarizer
export { ConversationSummarizer, createSummarizer, extractFactsFromConversation } from "./summarizer.ts";
export type { Message, SummarizerConfig } from "./summarizer.ts";

// Vector Search
export { MemorySearcher, createSearcher, createSearcherFromKey } from "./vector-search.ts";
export type { VectorSearchConfig, ScoredMemory } from "./vector-search.ts";

// Context Builder
export { ContextBuilder, createContextBuilder, estimateTokens, truncateToTokenBudget } from "./compression.ts";
export type { ContextBuilderConfig } from "./compression.ts";
