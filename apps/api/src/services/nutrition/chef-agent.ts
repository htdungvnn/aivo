/**
 * Chef Agent - Recipe generation from available ingredients
 *
 * Specialized in creating practical, delicious recipes based on:
 * - Available ingredients (from user's kitchen)
 * - Skill level and available tools
 * - Dietary preferences and restrictions
 */

import { AGENT_SYSTEM_PROMPTS } from "../nutrition";
import type { ChefAgentRequest, ChefAgentResponse, Recipe, NutritionConsultContext } from "@aivo/shared-types";
import type { AgentInvocationResult } from "./types";

const CHEF_SYSTEM_PROMPT = AGENT_SYSTEM_PROMPTS.chef + `

IMPORTANT CONTEXT:
- User's skill level: ${(ctx: NutritionConsultContext) => ctx.skillLevel || "beginner"}
- Available kitchen tools: ${(ctx: NutritionConsultContext) => (ctx.kitchenTools || []).join(", ") || "basic"}
- Dietary type: ${(ctx: NutritionConsultContext) => ctx.dietType || "omnivore"}
- Allergies to avoid: ${(ctx: NutritionConsultContext) => (ctx.allergies || []).join(", ") || "none"}
- Intolerances to avoid: ${(ctx: NutritionConsultContext) => (ctx.intolerances || []).join(", ") || "none"}

CRITICAL RULES:
1. NEVER include ingredients the user is allergic to
2. For allergies with anaphylaxis risk, add a CRITICAL warning
3. Suggest substitutions for ingredients the user doesn't have
4. Keep instructions simple for beginners
5. Include prep time and cook time estimates
6. Add food safety tips when handling raw meat/eggs

OUTPUT STRUCTURE (JSON):
{
  "name": "Recipe name",
  "description": "Brief description",
  "ingredients": [
    { "name": "...", "quantity": 100, "unit": "g", "notes": "optional" }
  ],
  "instructions": [
    { "step": 1, "text": "...", "durationMinutes": 5, "tips": [] }
  ],
  "tips": [...],
  "warnings": ["Allergen alerts here"],
  "storageInstructions": "...",
  "reheatingInstructions": "...",
  "allergenAlerts": ["Contains: dairy"]
}`;

/**
 * Invoke the Chef Agent to generate a recipe
 */
export async function invokeChefAgent(request: ChefAgentRequest): Promise<AgentInvocationResult> {
  const startTime = Date.now();

  try {
    // Build the prompt with user context
    const prompt = buildChefPrompt(request);

    // Call OpenAI API
    const response = await callOpenAI(prompt, request.context);

    // Parse the JSON response
    const recipe = parseChefResponse(response);

    // Validate for allergies
    const warnings = validateRecipeAllergies(recipe, request.context);

    // Calculate confidence based on ingredient match
    const confidence = calculateConfidence(request.context.availableIngredients || [], recipe);

    return {
      agentType: "chef",
      success: true,
      content: formatRecipeAsText(recipe),
      confidence,
      warnings,
      metadata: { recipe },
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      agentType: "chef",
      success: false,
      content: "Unable to generate recipe. Please try again.",
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
function buildChefPrompt(request: ChefAgentRequest): string {
  const { query, context } = request;

  let prompt = CHEF_SYSTEM_PROMPT.replace('${(ctx: NutritionConsultContext) => ctx.skillLevel || "beginner"}', context.skillLevel || "beginner");
  prompt = prompt.replace('${(ctx: NutritionConsultContext) => (ctx.kitchenTools || []).join(", ") || "basic"}', (context.kitchenTools || []).join(", ") || "basic");
  prompt = prompt.replace('${(ctx: NutritionConsultContext) => ctx.dietType || "omnivore"}', context.dietType || "omnivore");
  prompt = prompt.replace('${(ctx: NutritionConsultContext) => (ctx.allergies || []).join(", ") || "none"}', (context.allergies || []).join(", ") || "none");
  prompt = prompt.replace('${(ctx: NutritionConsultContext) => (ctx.intolerances || []).join(", ") || "none"}', (context.intolerances || []).join(", ") || "none");

  return `${prompt}

USER QUERY: ${query}

AVAILABLE INGREDIENTS:
${(context.availableIngredients || []).map(ing => `- ${ing.name}: ${ing.quantity}${ing.unit}`).join("\n") || "No specific ingredients provided"}

Please generate a recipe. Respond ONLY with valid JSON.`;
}

/**
 * Call OpenAI API with the prompt
 */
async function callOpenAI(prompt: string, context: NutritionConsultContext): Promise<Recipe> {
  const { openai } = await import("../../utils/openai");

  const systemPrompt = prompt;
  const userMessage = "Generate a recipe based on the available ingredients and constraints provided.";

  const result = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 1500,
    response_format: { type: "json_object" },
  });

  const content = result.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  return JSON.parse(content) as Recipe;
}

/**
 * Parse chef agent response into Recipe structure
 */
function parseChefResponse(data: unknown): Recipe {
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid recipe response");
  }

  const recipe = data as Record<string, unknown>;

  return {
    name: String(recipe.name || "Untitled Recipe"),
    description: String(recipe.description || ""),
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.map((ing: Record<string, unknown>) => ({
      name: String(ing.name),
      quantity: Number(ing.quantity) || 0,
      unit: String(ing.unit || ""),
      notes: typeof ing.notes === "string" ? ing.notes : undefined,
    })) : [],
    instructions: Array.isArray(recipe.instructions) ? recipe.instructions.map((inst: Record<string, unknown>, idx: number) => ({
      step: Number(inst.step) || idx + 1,
      text: String(inst.text),
      durationMinutes: typeof inst.durationMinutes === "number" ? inst.durationMinutes : undefined,
      tips: Array.isArray(inst.tips) ? inst.tips.map(String) : undefined,
    })) : [],
    tips: Array.isArray(recipe.tips) ? recipe.tips.map(String) : [],
    warnings: Array.isArray(recipe.warnings) ? recipe.warnings.map(String) : undefined,
    storageInstructions: typeof recipe.storageInstructions === "string" ? recipe.storageInstructions : undefined,
    reheatingInstructions: typeof recipe.reheatingInstructions === "string" ? recipe.reheatingInstructions : undefined,
    allergenAlerts: Array.isArray(recipe.allergenAlerts) ? recipe.allergenAlerts.map(String) : undefined,
  };
}

/**
 * Validate recipe against user's allergies/intolerances
 */
function validateRecipeAllergies(recipe: Recipe, context: NutritionConsultContext): string[] {
  const warnings: string[] = [];
  const allergens = [...(context.allergies || []), ...(context.intolerances || [])];
  const recipeAllergens = recipe.allergenAlerts || [];

  for (const allergen of allergens) {
    for (const recipeAllergen of recipeAllergens) {
      if (recipeAllergen.toLowerCase().includes(allergen.toLowerCase())) {
        warnings.push(`⚠️ CRITICAL: Recipe contains ${allergen} - user is allergic!`);
      }
    }
  }

  return warnings;
}

/**
 * Calculate confidence based on ingredient match percentage
 */
function calculateConfidence(
  availableIngredients: Array<{ name: string; quantity: number; unit: string }>,
  recipe: Recipe
): number {
  if (availableIngredients.length === 0) return 0.5; // No ingredient list provided

  const recipeIngredientNames = recipe.ingredients.map(ing => ing.name.toLowerCase());
  let matched = 0;

  for (const available of availableIngredients) {
    if (recipeIngredientNames.some(recipeName =>
      recipeName.includes(available.name.toLowerCase()) ||
      available.name.toLowerCase().includes(recipeName)
    )) {
      matched++;
    }
  }

  const matchRatio = matched / recipe.ingredients.length;
  return Math.min(0.3 + matchRatio * 0.7, 1.0); // Base 30% + up to 70% based on match
}

/**
 * Format recipe as readable text
 */
function formatRecipeAsText(recipe: Recipe): string {
  let text = `# ${recipe.name}\n\n`;
  text += `${recipe.description}\n\n`;
  text += `**Prep Time:** ${recipe.estimatedPrepTimeMinutes || "15"} min | `;
  text += `**Cook Time:** ${recipe.estimatedCookTimeMinutes || "30"} min\n\n`;

  text += "## Ingredients\n";
  recipe.ingredients.forEach((ing, i) => {
    text += `${i + 1}. ${ing.name}: ${ing.quantity} ${ing.unit}\n`;
  });

  text += "\n## Instructions\n";
  recipe.instructions.forEach((inst) => {
    text += `${inst.step}. ${inst.text}\n`;
    if (inst.tips) {
      inst.tips.forEach(tip => text += `   💡 ${tip}\n`);
    }
  });

  if (recipe.tips.length > 0) {
    text += "\n## Tips\n";
    recipe.tips.forEach(tip => text += `• ${tip}\n`);
  }

  if (recipe.warnings) {
    text += "\n## ⚠️ Warnings\n";
    recipe.warnings.forEach(warning => text += `• ${warning}\n`);
  }

  return text;
}
