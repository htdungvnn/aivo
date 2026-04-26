/**
 * Budget Agent - Cost optimization and grocery planning
 *
 * Specialized in budget-friendly meal planning, cost analysis,
 * and grocery savings strategies.
 */

import { AGENT_SYSTEM_PROMPTS } from "./prompts";
import type { BudgetAgentRequest, CostAnalysis, SavingsOpportunity, GroceryItem, MealPrepTip } from "@aivo/shared-types";
import type { AgentInvocationResult } from "./types";

// Analysis result structure (not full AgentResponse)
interface BudgetAnalysis {
  costAnalysis: CostAnalysis;
  savingsOpportunities: SavingsOpportunity[];
  groceryList?: GroceryItem[];
  budgetFriendlyAlternatives?: SavingsOpportunity[];
  mealPrepTips?: MealPrepTip[];
  confidence: number;
}

/**
 * Invoke the Budget Agent for cost optimization analysis
 */
export async function invokeBudgetAgent(request: BudgetAgentRequest): Promise<AgentInvocationResult> {
  const startTime = Date.now();

  try {
    // Build the prompt with user context
    const prompt = buildBudgetPrompt(request);

    // Call OpenAI API
    const response = await callOpenAI(prompt, request.context);

    // Parse the JSON response
    const analysis = parseBudgetResponse(response);

    // Calculate total weekly estimate
    const totalWeeklyEstimate = calculateWeeklyEstimate(analysis, request.context);

    return {
      agentType: "budget",
      success: true,
      content: formatAnalysisAsText(analysis, totalWeeklyEstimate),
      confidence: analysis.confidence,
      warnings: [],
      metadata: { analysis, totalWeeklyEstimate },
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      agentType: "budget",
      success: false,
      content: "Unable to generate budget analysis. Please try again.",
      confidence: 0,
      warnings: [],
      metadata: { error: error instanceof Error ? error.message : String(error) },
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Build the system prompt with user context
 */
function buildBudgetPrompt(request: BudgetAgentRequest): string {
  const { query, context } = request;

  // Calculate weekly budget
  let weeklyBudget: number | undefined;
  if (context.budget) {
    if (context.budget.daily) {
      weeklyBudget = context.budget.daily * 7;
    } else if (context.budget.weekly) {
      weeklyBudget = context.budget.weekly;
    } else if (context.budget.monthly) {
      weeklyBudget = context.budget.monthly / 4;
    }
  }
  const budgetInfo = weeklyBudget ? `Weekly budget: $${weeklyBudget.toFixed(0)}` : "Budget not specified - provide general tips";
  const availableList = (context.availableIngredients || []).map(i => i.name).join(", ") || "no specific ingredients";

  return `${AGENT_SYSTEM_PROMPTS.budget}

USER QUERY: ${query}

ADDITIONAL CONTEXT:
- ${budgetInfo}
- Available ingredients: ${availableList}
- Skill level: ${context.skillLevel || "beginner"}

Please provide a comprehensive budget analysis. Respond ONLY with valid JSON.`;
}

/**
 * Call OpenAI API with the prompt
 */
async function callOpenAI(prompt: string, _context: BudgetAgentRequest["context"]): Promise<BudgetAnalysis> {
  const { openai } = await import("../../utils/openai");

  const result = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: "Analyze the budget and cost optimization for this meal plan." },
    ],
    temperature: 0.5,
    max_tokens: 2000,
    response_format: { type: "json_object" },
  });

  const content = result.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  const data = JSON.parse(content);
  return parseBudgetResponse(data);
}

/**
 * Parse budget agent response into structured format
 */
function parseBudgetResponse(data: unknown): BudgetAnalysis {
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid budget analysis response");
  }

  const resp = data as Record<string, unknown>;

  // Parse cost analysis - matching shared types
  let costAnalysis: CostAnalysis = {
    estimatedTotalCost: 0,
    costPerServing: 0,
    servings: 4,
    costBreakdown: [],
  };

  if (resp.costAnalysis) {
    const ca = resp.costAnalysis as Record<string, unknown>;
    costAnalysis = {
      estimatedTotalCost: typeof ca.estimatedTotalCost === "number" ? ca.estimatedTotalCost : 0,
      costPerServing: typeof ca.costPerServing === "number" ? ca.costPerServing : 0,
      servings: typeof ca.servings === "number" ? ca.servings : 4,
      costBreakdown: Array.isArray(ca.costBreakdown)
        ? ca.costBreakdown.map((item: Record<string, unknown>) => ({
            ingredient: String(item.ingredient || ""),
            cost: typeof item.cost === "number" ? item.cost : 0,
            percentage: typeof item.percentage === "number" ? item.percentage : 0,
            notes: typeof item.notes === "string" ? item.notes : undefined,
          }))
        : [],
    };
  }

  // Parse savings opportunities
  const savingsOpportunities: SavingsOpportunity[] = Array.isArray(resp.savingsOpportunities)
    ? resp.savingsOpportunities.map((opp: Record<string, unknown>) => ({
        strategy: String(opp.strategy || ""),
        potentialSavings: typeof opp.potentialSavings === "number" ? opp.potentialSavings : 0,
        notes: typeof opp.notes === "string" ? opp.notes : undefined,
      }))
    : [];

  // Parse grocery list
  const groceryList: GroceryItem[] = Array.isArray(resp.groceryList)
    ? resp.groceryList.map((item: Record<string, unknown>) => ({
        item: String(item.item || ""),
        quantity: String(item.quantity || ""),
        estimatedCost: typeof item.estimatedCost === "number" ? item.estimatedCost : undefined,
        cheaperAlternative: typeof item.cheaperAlternative === "string" ? item.cheaperAlternative : undefined,
        buyInBulk: Boolean(item.buyInBulk),
      }))
    : [];

  // Parse budget friendly alternatives (map to SavingsOpportunity)
  const budgetFriendlyAlternatives: SavingsOpportunity[] = Array.isArray(resp.budgetFriendlyAlternatives)
    ? resp.budgetFriendlyAlternatives.map((alt: Record<string, unknown>) => ({
        strategy: String(alt.original || ""),
        potentialSavings: typeof alt.potentialSavings === "number" ? alt.potentialSavings : 0,
        notes: typeof alt.notes === "string" ? alt.notes : typeof alt.alternative === "string" ? alt.alternative : undefined,
      }))
    : [];

  // Parse meal prep tips
  const mealPrepTips: MealPrepTip[] = Array.isArray(resp.mealPrepTips)
    ? resp.mealPrepTips.map(String)
    : [];

  return {
    costAnalysis,
    savingsOpportunities,
    groceryList,
    budgetFriendlyAlternatives,
    mealPrepTips,
    confidence: typeof resp.confidence === "number" ? resp.confidence : 0.5,
  };
}

/**
 * Calculate weekly estimate based on analysis and user budget
 */
function calculateWeeklyEstimate(
  analysis: BudgetAnalysis,
  context: BudgetAgentRequest["context"]
): { min: number; max: number; notes: string } {
  const baseCost = analysis.costAnalysis.estimatedTotalCost;
  const servings = analysis.costAnalysis.servings;

  // Estimate 14 meals per week (2 per day)
  const weeklyMeals = 14;
  const mealsPerRecipe = servings;
  const recipesPerWeek = Math.ceil(weeklyMeals / mealsPerRecipe);

  let totalMin = baseCost * recipesPerWeek;
  let totalMax = totalMin * 1.2; // 20% buffer for variety

  // Apply savings opportunities
  const totalSavings = analysis.savingsOpportunities.reduce((sum, opp) => sum + opp.potentialSavings, 0);
  totalMin = Math.max(0, totalMin - totalSavings);
  totalMax = Math.max(0, totalMax - totalSavings);

  let notes = `Based on ${recipesPerWeek} similar meals per week (${weeklyMeals} total meals).`;

  if (context.budget) {
    const budgetValue = context.budget.daily ? context.budget.daily * 7 : context.budget.weekly || (context.budget.monthly ? context.budget.monthly / 4 : 0);
    if (budgetValue > 0) {
      if (totalMax <= budgetValue) {
        notes += " Fits within your budget!";
      } else if (totalMin <= budgetValue) {
        notes += " Partially fits budget with careful shopping.";
      } else {
        notes += ` Exceeds budget by $${(totalMin - budgetValue).toFixed(0)}. Consider budget alternatives.`;
      }
    }
  }

  return {
    min: Math.round(totalMin * 100) / 100,
    max: Math.round(totalMax * 100) / 100,
    notes,
  };
}

/**
 * Format budget analysis as readable text
 */
function formatAnalysisAsText(
  analysis: BudgetAnalysis,
  weeklyEstimate: { min: number; max: number; notes: string }
): string {
  let text = "# Budget Nutrition Analysis\n\n";

  text += "## Cost Summary\n\n";
  text += `**Total Recipe Cost:** $${analysis.costAnalysis.estimatedTotalCost.toFixed(2)}\n`;
  text += `**Servings:** ${analysis.costAnalysis.servings}\n`;
  text += `**Cost Per Serving:** $${analysis.costAnalysis.costPerServing.toFixed(2)}\n\n`;

  if (analysis.costAnalysis.costBreakdown.length > 0) {
    text += "### Cost Breakdown\n\n";
    for (const item of analysis.costAnalysis.costBreakdown) {
      text += `- ${item.ingredient}: $${item.cost.toFixed(2)} (${item.percentage}%)\n`;
      if (item.notes) {text += `  *${item.notes}*\n`;}
    }
    text += "\n";
  }

  if (analysis.savingsOpportunities.length > 0) {
    text += "## 💰 Savings Opportunities\n\n";
    for (const opp of analysis.savingsOpportunities) {
      text += `- **${opp.strategy}**: Save $${opp.potentialSavings.toFixed(2)}\n`;
      if (opp.notes) {text += `  *${opp.notes}*\n`;}
    }
    text += "\n";
  }

  if (analysis.groceryList && analysis.groceryList.length > 0) {
    text += "## 🛒 Grocery List\n\n";
    for (const item of analysis.groceryList) {
      text += `- ${item.quantity} ${item.item}`;
      if (item.estimatedCost) {text += ` ($${item.estimatedCost.toFixed(2)})`;}
      if (item.buyInBulk) {text += " **BULK**";}
      if (item.cheaperAlternative) {text += `\n  *Alternative: ${item.cheaperAlternative}*`;}
      text += "\n";
    }
    text += "\n";
  }

  if (analysis.budgetFriendlyAlternatives && analysis.budgetFriendlyAlternatives.length > 0) {
    text += "## 🔄 Budget Swaps\n\n";
    for (const alt of analysis.budgetFriendlyAlternatives) {
      text += `- ${alt.strategy}\n`;
      if (alt.notes) {text += `  ${alt.notes}\n`;}
    }
    text += "\n";
  }

  if (analysis.mealPrepTips && analysis.mealPrepTips.length > 0) {
    text += "## 🥘 Meal Prep Tips\n\n";
    for (const tip of analysis.mealPrepTips) {
      text += `- ${tip}\n`;
    }
    text += "\n";
  }

  text += "## Weekly Budget Estimate\n\n";
  text += `**Estimated Range:** $${weeklyEstimate.min} - $${weeklyEstimate.max}\n`;
  text += `${weeklyEstimate.notes}\n\n`;

  text += `---\n*Confidence: ${Math.round(analysis.confidence * 100)}%*\n`;
  text += `*Prices are estimates and may vary by location and season.*`;

  return text;
}
