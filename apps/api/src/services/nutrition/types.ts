/**
 * Types for the Multi-Agent Nutrition Expert system
 * Shared between agent services and API routes
 */

import type { NutritionAgentType, NutritionConsultRequest, NutritionConsultResponse, AgentResponse, StoredNutritionConsult } from "@aivo/shared-types";

/**
 * Configuration for the nutrition agent system
 */
export interface NutritionAgentConfig {
  openaiApiKey: string;
  defaultModel?: "gpt-4o-mini" | "gpt-4o";
  timeoutMs?: number;
  maxRetries?: number;
}

/**
 * Result of a single agent invocation (internal representation)
 */
export interface AgentInvocationResult {
  agentType: NutritionAgentType;
  success: boolean;
  content: string;
  confidence: number;
  warnings: string[];
  metadata: Record<string, unknown>;
  processingTimeMs: number;
  rawResponse?: unknown; // For debugging
}

/**
 * Database operation for storing consult
 */
export interface NutritionConsultStorage {
  saveConsult(consult: StoredNutritionConsult): Promise<void>;
  getConsult(userId: string, sessionId: string): Promise<StoredNutritionConsult | null>;
  getUserConsults(userId: string, limit?: number): Promise<StoredNutritionConsult[]>;
}

// Default configuration
export const DEFAULT_NUTRITION_CONFIG: Required<NutritionAgentConfig> = {
  openaiApiKey: "",
  defaultModel: "gpt-4o-mini",
  timeoutMs: 30000,
  maxRetries: 2,
};
