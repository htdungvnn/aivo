/**
 * AI Meal Analysis Service
 * Handles AI model calls, prompt management, and output validation
 */

import { z } from 'zod';
import type {
  MealAnalysisResult,
  MealAnalysisItem,
  AIModel,
  NutritionSource,
  NUTRITION_SOURCE,
} from '@repo/nutrition-types';
import { AIModelRouter, getAIRouter } from './ai-router';
import { NutritionCalculator } from './calculations';
import type D1Database from '@cloudflare/workers-types';

// =============================================================================
// AI RESPONSE SCHEMA
// =============================================================================

/**
 * Zod schema for AI meal analysis response
 */
export const AIResponseSchema = z.object({
  schemaVersion: z.literal(1),
  mealName: z.string().min(1).max(200),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  foods: z.array(
    z.object({
      name: z.string().min(1).max(200),
      normalizedName: z.string().nullable(),
      estimatedQuantity: z.number().positive().max(10000),
      unit: z.string().min(1).max(20),
      confidence: z.number().min(0).max(1),
      caloriesKcal: z.number().min(0).max(5000),
      proteinG: z.number().min(0).max(500),
      carbsG: z.number().min(0).max(800),
      fatG: z.number().min(0).max(400),
      fiberG: z.number().min(0).max(150),
      sugarG: z.number().min(0).max(300),
      sodiumMg: z.number().min(0).max(10000),
    })
  ).min(1).max(50),
  overallConfidence: z.number().min(0).max(1),
  warnings: z.array(z.string()),
  needsUserReview: z.boolean(),
});

export type AIResponse = z.infer<typeof AIResponseSchema>;

// =============================================================================
// PROMPT MANAGEMENT
// =============================================================================

/**
 * System prompt for meal analysis
 */
const SYSTEM_PROMPT = `You are a nutrition analysis AI. Analyze meal images and provide accurate nutritional information.

Return ONLY valid JSON matching this schema:
{
  "schemaVersion": 1,
  "mealName": "string",
  "mealType": "breakfast" | "lunch" | "dinner" | "snack",
  "foods": [
    {
      "name": "string",
      "normalizedName": "string | null",
      "estimatedQuantity": number,
      "unit": "g" | "ml" | "piece" | "slice",
      "confidence": number,
      "caloriesKcal": number,
      "proteinG": number,
      "carbsG": number,
      "fatG": number,
      "fiberG": number,
      "sugarG": number,
      "sodiumMg": number
    }
  ],
  "overallConfidence": number,
  "warnings": string[],
  "needsUserReview": boolean
}

Rules:
- Use grams (g) for solid foods, ml for liquids
- Provide realistic portion estimates
- Return values per 100g or per serving as specified by unit
- Set needsUserReview=true if confidence < 0.7 or portions are unclear
- Only report values you can reasonably estimate
- Do not invent micronutrients not visible`;

/**
 * Prompt version hash for caching
 */
let promptVersionHash: string | null = null;

/**
 * Get or compute prompt version hash
 */
export function getPromptVersionHash(): string {
  if (!promptVersionHash) {
    promptVersionHash = crypto.randomUUID().slice(0, 8);
  }
  return promptVersionHash;
}

/**
 * Build analysis prompt with user context
 */
function buildAnalysisPrompt(userContext?: {
  preferredMealType?: string;
  language?: string;
}): string {
  const parts: string[] = [SYSTEM_PROMPT];
  
  if (userContext?.preferredMealType) {
    parts.push(`\nContext: User typically eats this meal as ${userContext.preferredMealType}`);
  }
  
  return parts.join('\n');
}

// =============================================================================
// AI ANALYSIS SERVICE
// =============================================================================

export interface AnalysisContext {
  userId: string;
  userTargets: {
    caloriesKcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  } | null;
  dailyUsage: {
    aiCallsToday: number;
    aiCallsLimit: number;
  };
}

export interface AnalysisResult {
  success: boolean;
  result?: MealAnalysisResult;
  model: AIModel;
  latencyMs: number;
  confidence: number;
  error?: string;
  warnings: string[];
}

/**
 * AI Meal Analysis Service
 */
export class AIAnalysisService {
  private router: AIModelRouter;
  private ai: Ai;
  private db: D1Database;
  
  constructor(ai: Ai, db: D1Database, routerOptions?: {
    dailyLimit?: number;
    hourlyLimit?: number;
  }) {
    this.router = getAIRouter(routerOptions);
    this.ai = ai;
    this.db = db;
  }
  
  /**
   * Analyze meal image using AI
   */
  async analyzeMeal(
    imageData: ArrayBuffer | string,
    context: AnalysisContext,
    options?: {
      preferredModel?: AIModel;
      mealTypeHint?: string;
      previousConfidence?: number;
      retryCount?: number;
    }
  ): Promise<AnalysisResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    
    // Check availability
    const availability = this.router.isAvailable();
    if (!availability.available) {
      return {
        success: false,
        model: '@cf/unum/uform-gen2-qwen-500m',
        latencyMs: 0,
        confidence: 0,
        error: availability.reason || 'AI feature unavailable',
        warnings: [availability.reason || 'AI feature unavailable'],
      };
    }
    
    // Select model
    const routingDecision = this.router.selectModel({
      preferredModel: options?.preferredModel,
      imageSize: typeof imageData === 'string' ? imageData.length : imageData.byteLength,
      previousConfidence: options?.previousConfidence,
      multipleUnclearFoods: false,
      uncertainPortions: false,
    });
    
    const selectedModel = routingDecision.selectedModel;
    
    try {
      // Build prompt
      const prompt = buildAnalysisPrompt({
        preferredMealType: options?.mealTypeHint,
      });
      
      // Prepare image data
      let imageBase64: string;
      if (typeof imageData === 'string') {
        // Already base64
        imageBase64 = imageData;
      } else {
        // Convert ArrayBuffer to base64
        const bytes = new Uint8Array(imageData);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        imageBase64 = btoa(binary);
      }
      
      // Call AI model via Workers AI
      const aiResponse = await this.ai.run('@cf/unum/uform-gen2-qwen-500m', {
        image: [imageBase64],
        text: prompt,
        max_tokens: 2048,
      });
      
      const latencyMs = Date.now() - startTime;
      
      // Parse response
      if (!aiResponse || !aiResponse.response) {
        return {
          success: false,
          model: selectedModel,
          latencyMs,
          confidence: 0,
          error: 'Empty AI response',
          warnings: ['Empty response from AI model'],
        };
      }
      
      // Extract JSON from response
      let parsedResponse: unknown;
      try {
        const responseText = aiResponse.response.trim();
        
        // Try to extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } else {
          parsedResponse = JSON.parse(responseText);
        }
      } catch (parseError) {
        // Try to retry with escalated model
        if ((options?.retryCount ?? 0) < 2) {
          return this.analyzeMeal(imageData, context, {
            ...options,
            previousConfidence: 0,
            retryCount: (options?.retryCount ?? 0) + 1,
          });
        }
        
        return {
          success: false,
          model: selectedModel,
          latencyMs,
          confidence: 0,
          error: 'Failed to parse AI response as JSON',
          warnings: ['Invalid JSON response from AI', responseText.slice(0, 200)],
        };
      }
      
      // Validate with Zod
      const validationResult = AIResponseSchema.safeParse(parsedResponse);
      
      if (!validationResult.success) {
        const errorDetails = validationResult.error.issues.map(
          i => `${i.path.join('.')}: ${i.message}`
        );
        
        // Try to retry with escalated model
        if ((options?.retryCount ?? 0) < 2) {
          warnings.push(...errorDetails);
          return this.analyzeMeal(imageData, context, {
            ...options,
            previousConfidence: 0,
            retryCount: (options?.retryCount ?? 0) + 1,
          });
        }
        
        return {
          success: false,
          model: selectedModel,
          latencyMs,
          confidence: 0,
          error: `Validation failed: ${errorDetails.join(', ')}`,
          warnings: [...warnings, ...errorDetails],
        };
      }
      
      const aiResponseData = validationResult.data;
      
      // Convert to internal format
      const result = this.convertToMealAnalysisResult(aiResponseData);
      
      // Record usage
      this.router.recordCallResult({
        success: true,
        model: selectedModel,
        latencyMs,
        imageSize: typeof imageData === 'string' ? imageData.length : imageData.byteLength,
        outputTokens: aiResponse.usage?.tokens ?? 0,
        estimatedCost: routingDecision.estimatedCost,
        confidence: aiResponseData.overallConfidence,
        validationPassed: true,
        errorMessage: null,
      });
      
      return {
        success: true,
        result,
        model: selectedModel,
        latencyMs,
        confidence: aiResponseData.overallConfidence,
        warnings,
      };
      
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Record failed call
      this.router.recordCallResult({
        success: false,
        model: selectedModel,
        latencyMs,
        imageSize: typeof imageData === 'string' ? imageData.length : imageData.byteLength,
        outputTokens: 0,
        estimatedCost: routingDecision.estimatedCost,
        confidence: 0,
        validationPassed: false,
        errorMessage,
      });
      
      // Retry logic
      if ((options?.retryCount ?? 0) < 2) {
        return this.analyzeMeal(imageData, context, {
          ...options,
          previousConfidence: 0,
          retryCount: (options?.retryCount ?? 0) + 1,
        });
      }
      
      return {
        success: false,
        model: selectedModel,
        latencyMs,
        confidence: 0,
        error: errorMessage,
        warnings,
      };
    }
  }
  
  /**
   * Convert AI response to internal MealAnalysisResult format
   */
  private convertToMealAnalysisResult(aiResponse: AIResponse): MealAnalysisResult {
    const items: MealAnalysisItem[] = aiResponse.foods.map((food, index) => ({
      id: crypto.randomUUID(),
      name: food.name,
      normalizedName: food.normalizedName,
      estimatedQuantity: food.estimatedQuantity,
      unit: food.unit,
      confidence: food.confidence,
      nutrition: {
        caloriesKcal: NutritionCalculator.round(food.caloriesKcal, 0),
        proteinG: NutritionCalculator.round(food.proteinG, 1),
        carbsG: NutritionCalculator.round(food.carbsG, 1),
        fatG: NutritionCalculator.round(food.fatG, 1),
        fiberG: NutritionCalculator.round(food.fiberG, 1),
        sugarG: NutritionCalculator.round(food.sugarG, 1),
        sodiumMg: NutritionCalculator.round(food.sodiumMg, 0),
        source: 'ai_estimate' as NutritionSource,
        confidence: food.confidence,
      },
      foodId: null,
      source: 'ai_estimate' as NutritionSource,
      userOverride: null,
      warnings: [],
    }));
    
    return {
      schemaVersion: aiResponse.schemaVersion,
      mealName: aiResponse.mealName,
      mealType: aiResponse.mealType as MealAnalysisResult['mealType'],
      foods: items,
      overallConfidence: aiResponse.overallConfidence,
      warnings: aiResponse.warnings,
      needsUserReview: aiResponse.needsUserReview,
    };
  }
  
  /**
   * Update router usage limits
   */
  updateUsageLimits(dailyUsed: number, hourlyUsed: number): void {
    this.router.updateUsage(dailyUsed, hourlyUsed);
  }
}

/**
 * Create AI analysis service instance
 */
export function createAIAnalysisService(
  ai: Ai,
  db: D1Database,
  options?: {
    dailyLimit?: number;
    hourlyLimit?: number;
  }
): AIAnalysisService {
  return new AIAnalysisService(ai, db, options);
}
