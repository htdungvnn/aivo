/**
 * Nutrition Agent Orchestrator
 *
 * Routes queries to appropriate specialized agents and synthesizes responses.
 * Analyzes user intent to determine which agents to invoke.
 */

import type {
  NutritionConsultRequest,
  NutritionConsultResponse,
  AgentResponse,
  NutritionAgentType,
  NutritionConsultContext,
} from "@aivo/shared-types";
import { invokeChefAgent } from "./chef-agent";
import { invokeMedicalAgent } from "./medical-agent";
import { invokeBudgetAgent } from "./budget-agent";
import type { AgentInvocationResult } from "./types";
import type { ChefAgentRequest } from "./chef-agent";
import type { MedicalAgentRequest } from "./medical-agent";
import type { BudgetAgentRequest } from "./budget-agent";

/**
 * Main orchestration function for nutrition consultations
 */
export async function orchestrateNutritionConsult(
  request: NutritionConsultRequest
): Promise<NutritionConsultResponse> {
  const startTime = Date.now();

  try {
    // Determine which agents to invoke
    const agentsToInvoke = selectAgents(request.query, request.context, request.preferredAgents);

    // Invoke agents (in parallel for efficiency)
    const agentResults = await invokeAgents(agentsToInvoke, request);

    // Filter successful responses
    const successfulResponses = agentResults.filter((r): r is AgentInvocationResult & { success: true } => r.success);

    // Synthesize final response
    const synthesizedAdvice = synthesizeResponse(successfulResponses, request.query);

    // Identify primary agent (highest confidence)
    const primaryAgent = identifyPrimaryAgent(successfulResponses);

    // Collect all warnings
    const allWarnings = agentResults.flatMap(r => r.warnings);

    return {
      success: true,
      sessionId: request.sessionId || generateSessionId(),
      userQuery: request.query,
      agentsConsulted: agentsToInvoke,
      responses: successfulResponses.map(r => ({
        agentType: r.agentType,
        success: r.success,
        content: r.content,
        confidence: r.confidence,
        warnings: r.warnings,
        metadata: r.metadata,
        processingTimeMs: r.processingTimeMs,
      })),
      synthesizedAdvice,
      primaryAgent,
      warnings: allWarnings,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      sessionId: request.sessionId || generateSessionId(),
      userQuery: request.query,
      agentsConsulted: [],
      responses: [],
      synthesizedAdvice: "Unable to process your nutrition consultation. Please try again.",
      primaryAgent: undefined,
      warnings: ["Orchestration failed: " + (error instanceof Error ? error.message : String(error))],
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Select which agents to invoke based on query and context
 */
function selectAgents(
  query: string,
  context: NutritionConsultContext,
  preferredAgents?: NutritionAgentType[]
): NutritionAgentType[] {
  const agents: NutritionAgentType[] = [];

  // If user explicitly prefers certain agents, include them
  if (preferredAgents) {
    agents.push(...preferredAgents);
    return [...new Set(agents)]; // Deduplicate
  }

  // Analyze query intent
  const lowerQuery = query.toLowerCase();

  // Always include medical agent if medical conditions or medications exist
  if ((context.medicalConditions && context.medicalConditions.length > 0) ||
      (context.medications && context.medications.length > 0) ||
      lowerQuery.includes("medication") ||
      lowerQuery.includes("drug") ||
      lowerQuery.includes("interaction") ||
      lowerQuery.includes("condition") ||
      lowerQuery.includes("diabetes") ||
      lowerQuery.includes("hypertension") ||
      lowerQuery.includes("heart") ||
      lowerQuery.includes("safe") ||
      lowerQuery.includes("danger")) {
    agents.push("medical");
  }

  // Include chef agent for recipe requests
  if (lowerQuery.includes("recipe") ||
      lowerQuery.includes("cook") ||
      lowerQuery.includes("meal") ||
      lowerQuery.includes("dish") ||
      lowerQuery.includes("ingredient") ||
      lowerQuery.includes("cook with") ||
      context.availableIngredients?.length) {
    agents.push("chef");
  }

  // Include budget agent if budget is a concern
  if (context.budget ||
      lowerQuery.includes("budget") ||
      lowerQuery.includes("cheap") ||
      lowerQuery.includes("affordable") ||
      lowerQuery.includes("cost") ||
      lowerQuery.includes("price") ||
      lowerQuery.includes("save money") ||
      lowerQuery.includes("inexpensive")) {
    agents.push("budget");
  }

  // If no specific agents selected based on context, use all three
  // (they'll filter based on relevance in synthesis)
  if (agents.length === 0) {
    agents.push("chef", "medical", "budget");
  }

  return [...new Set(agents)];
}

/**
 * Invoke selected agents in parallel
 */
async function invokeAgents(
  agentTypes: NutritionAgentType[],
  request: NutritionConsultRequest
): Promise<AgentInvocationResult[]> {
  const results: AgentInvocationResult[] = [];

  const invocations = agentTypes.map(async (agentType) => {
    switch (agentType) {
      case "chef":
        return invokeChefAgent({
          query: request.query,
          context: request.context,
        } as ChefAgentRequest);

      case "medical":
        return invokeMedicalAgent({
          query: request.query,
          context: request.context,
        } as MedicalAgentRequest);

      case "budget":
        return invokeBudgetAgent({
          query: request.query,
          context: request.context,
        } as BudgetAgentRequest);

      default:
        return {
          agentType,
          success: false,
          content: `Unknown agent type: ${agentType}`,
          confidence: 0,
          warnings: [],
          metadata: { error: "Unknown agent type" },
          processingTimeMs: 0,
        };
    }
  });

  const resultsArray = await Promise.allSettled(invocations);

  for (let i = 0; i < resultsArray.length; i++) {
    const result = resultsArray[i];
    if (result.status === "fulfilled") {
      results.push(result.value);
    } else {
      results.push({
        agentType: agentTypes[i],
        success: false,
        content: "Agent invocation failed",
        confidence: 0,
        warnings: [],
        metadata: { error: result.reason },
        processingTimeMs: 0,
      });
    }
  }

  return results;
}

/**
 * Identify the primary agent (highest confidence, successful response)
 */
function identifyPrimaryAgent(responses: AgentInvocationResult[]): NutritionAgentType | undefined {
  const successful = responses.filter(r => r.success && r.confidence > 0);

  if (successful.length === 0) {
    return undefined;
  }

  // Sort by confidence, then by processing time (faster is better)
  successful.sort((a, b) => {
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    return a.processingTimeMs - b.processingTimeMs;
  });

  return successful[0].agentType;
}

/**
 * Synthesize a coherent response from multiple agent results
 */
function synthesizeResponse(responses: AgentInvocationResult[], query: string): string {
  if (responses.length === 0) {
    return "Unable to provide nutrition consultation. Please consult a healthcare provider or nutritionist.";
  }

  // If only one agent responded successfully, return its content
  if (responses.length === 1) {
    return responses[0].content;
  }

  // Multiple agents - synthesize into cohesive response
  let synthesized = `# Nutrition Consultation Summary\n\n`;
  synthesized += `**Your Query:** ${query}\n\n`;
  synthesized += `---\n\n`;

  // Organize by agent type in a logical order
  const agentOrder: NutritionAgentType[] = ["medical", "chef", "budget"];
  const agentLabels: Record<NutritionAgentType, string> = {
    medical: "## 🏥 Medical Safety Analysis",
    chef: "## 👨‍🍳 Recipe & Nutrition",
    budget: "## 💰 Budget Planning",
  };

  for (const agentType of agentOrder) {
    const agentResponse = responses.find(r => r.agentType === agentType);
    if (agentResponse) {
      synthesized += `${agentLabels[agentType]}\n\n`;

      // Extract just the content after the agent's main heading
      const content = agentResponse.content;
      // Remove the agent's own heading if present
      const withoutHeading = content.replace(/^# .*\n\n/, "").replace(/^## .*\n\n/, "");
      synthesized += `${withoutHeading}\n\n`;
    }
  }

  synthesized += `---\n\n`;
  synthesized += `**Note:** This consultation combines analysis from multiple specialized agents.\n`;
  synthesized += `Always consult with healthcare professionals for medical decisions.\n`;

  return synthesized;
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `nutr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
