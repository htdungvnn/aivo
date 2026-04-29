/**
 * Context Builder - Assemble relevant memories into AI-ready context
 * Handles token budgeting, priority ordering, and truncation
 */

import type { MemoryNode, MemoryContext, TokenBudget } from "./types.ts";
import { DEFAULT_TOKEN_BUDGET, isHealthCritical } from "./types.ts";

/**
 * Configuration for context building
 */
export interface ContextBuilderConfig {
  /** Default token budget for context */
  tokenBudget?: TokenBudget;
  /** Minimum memories to include even if low confidence */
  minimumMemories?: number;
  /** Maximum memories of a single type to include */
  maxPerType?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<ContextBuilderConfig> = {
  tokenBudget: DEFAULT_TOKEN_BUDGET,
  minimumMemories: 3,
  maxPerType: 5,
};

/**
 * Token estimation utility
 * Approximates tokens as ~4 characters per token
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to fit token budget
 */
export function truncateToTokenBudget(text: string, maxTokens: number): string {
  const estimatedTokens = estimateTokens(text);
  if (estimatedTokens <= maxTokens) {
    return text;
  }
  const maxChars = maxTokens * 4;
  return text.slice(0, maxChars - 50) + "... [truncated]";
}

/**
 * ContextBuilder assembles memories into a formatted context string
 */
export class ContextBuilder {
  private config: Required<ContextBuilderConfig>;

  constructor(config: ContextBuilderConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Build context string from already-fetched memories
   * @param memories - Pre-fetched memory nodes
   * @param customBudget - Optional custom token budget
   * @returns Formatted context ready for AI prompt
   */
  buildFromMemories(
    memories: MemoryNode[],
    customBudget?: TokenBudget
  ): MemoryContext {
    const budget = customBudget ?? this.config.tokenBudget;

    // Group by type
    const grouped = this.groupByType(memories);

    // Apply token budget and build context string
    const { contextString, sources, tokenCount } = this.assembleContext(grouped, budget);

    return {
      memories,
      contextString,
      tokens: tokenCount,
      sources,
    };
  }

  /**
   * Group memories by type for organized presentation
   */
  private groupByType(memories: MemoryNode[]): Map<string, MemoryNode[]> {
    const groups = new Map<string, MemoryNode[]>();

    for (const memory of memories) {
      const key = memory.type;
      const existing = groups.get(key) || [];
      groups.set(key, [...existing, memory]);
    }

    // Sort each group by confidence (descending)
    for (const group of groups.values()) {
      group.sort((a, b) => b.metadata.confidence - a.metadata.confidence);
    }

    return groups;
  }

  /**
   * Assemble context string from grouped memories with token budgeting
   */
  private assembleContext(
    grouped: Map<string, MemoryNode[]>,
    budget: TokenBudget
  ): { contextString: string; sources: MemoryContext['sources']; tokenCount: number } {
    const parts: string[] = [];
    const sources: MemoryContext['sources'] = {
      criticalHealth: 0,
      preferences: 0,
      facts: 0,
      events: 0,
      emotional: 0,
      constraints: 0,
    };

    let totalTokens = 0;
    const typeLabels: Record<string, string> = {
      fact: "Facts",
      preference: "Preferences",
      constraint: "Constraints",
      emotional: "Emotional State",
      event: "Events & Achievements",
      entity: "Entities",
    };

    // Map memory type to reserve key
    const getReserveKey = (type: string): keyof TokenBudget['reserves'] => {
      const map: Record<string, keyof TokenBudget['reserves']> = {
        fact: 'facts',
        preference: 'preferences',
        constraint: 'constraints',
        emotional: 'emotional',
        event: 'events',
        entity: 'entity',
      };
      return map[type] ?? 'facts';
    };

    // First pass: add critical health info (must be included regardless of budget)
    const criticalGroup = grouped.get("fact")?.filter(m => isHealthCritical(m.content)) || [];
    if (criticalGroup.length > 0) {
      const criticalText = this.formatGroup("CRITICAL HEALTH INFORMATION", criticalGroup, budget.reserves.critical);
      if (criticalText) {
        parts.push(criticalText);
        totalTokens += estimateTokens(criticalText);
        sources.criticalHealth = criticalGroup.length;
      }
    }

    // Second pass: add other types in priority order
    const typeOrder = ["constraint", "preference", "fact", "emotional", "event", "entity"];

    for (const type of typeOrder) {
      const group = grouped.get(type);
      if (!group) {continue;}

      // Skip fact type since we already handled critical ones
      if (type === "fact") {
        const nonCritical = group.filter((m) => !isHealthCritical(m.content));
        if (nonCritical.length === 0) {continue;}
        const reserveKey = getReserveKey(type);
        const groupText = this.formatGroup(typeLabels[type], nonCritical, budget.reserves[reserveKey]);
        if (groupText) {
          parts.push(groupText);
          totalTokens += estimateTokens(groupText);
          sources[(type + "s") as keyof typeof sources] = nonCritical.length;
        }
      } else {
        const reserveKey = getReserveKey(type);
        const groupText = this.formatGroup(typeLabels[type], group, budget.reserves[reserveKey]);
        if (groupText) {
          parts.push(groupText);
          totalTokens += estimateTokens(groupText);
          sources[(type + "s") as keyof typeof sources] = group.length;
        }
      }
    }

    const contextString = parts.join("\n\n");

    // Check if we exceeded budget
    if (totalTokens > budget.total) {
      const truncated = truncateToTokenBudget(contextString, budget.total);
      return {
        contextString: truncated,
        sources,
        tokenCount: Math.min(totalTokens, budget.total),
      };
    }

    return {
      contextString,
      sources,
      tokenCount: totalTokens,
    };
  }

  /**
   * Format a group of memories with token limit
   */
  private formatGroup(title: string, memories: MemoryNode[], tokenBudget: number): string {
    if (memories.length === 0) {
      return "";
    }

    const lines: string[] = [`## ${title}`];

    for (const memory of memories.slice(0, this.config.maxPerType)) {
      const line = `- ${this.formatMemory(memory)}`;
      lines.push(line);

      const currentText = lines.join("\n");
      if (estimateTokens(currentText) > tokenBudget) {
        lines.pop();
        if (memories.length > this.config.maxPerType) {
          lines.push(`...and ${memories.length - this.config.maxPerType} more`);
        }
        break;
      }
    }

    return lines.join("\n");
  }

  /**
   * Format a single memory for display
   */
  private formatMemory(memory: MemoryNode): string {
    const confidence = Math.round(memory.metadata.confidence * 100);
    const verified = memory.metadata.verifications > 1
      ? `, verified ${memory.metadata.verifications}x`
      : "";

    return `${memory.content} (confidence: ${confidence}%${verified})`;
  }

  /**
   * Get the current token budget configuration
   */
  getTokenBudget(): TokenBudget {
    return this.config.tokenBudget;
  }

  /**
   * Update token budget
   */
  setTokenBudget(budget: TokenBudget): void {
    this.config.tokenBudget = budget;
  }
}

/**
 * Create a context builder
 */
export function createContextBuilder(
  config: ContextBuilderConfig = {}
): ContextBuilder {
  return new ContextBuilder(config);
}
