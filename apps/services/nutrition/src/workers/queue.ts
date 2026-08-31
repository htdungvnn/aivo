/**
 * Queue Consumer Worker
 * Handles async meal analysis processing
 */

import { createAIAnalysisService } from '../services/ai-analysis';
import { AIModelRouter } from '../services/ai-router';
import { NutritionCalculator } from '../services/calculations';
import {
  getMealAnalysisById,
  updateMealAnalysisStatus,
  incrementAnalysisAttempts,
  saveAnalysisItems,
  getUserNutritionTargets,
  getMealsForDate,
  getUserCorrections,
  getAIUsageToday,
  recordAIUsage,
  searchFoods,
} from '../db/queries';
import { sha256Base64Url } from '../lib/crypto';
import type { MealAnalysisQueueMessage, MealAnalysisStatus } from '@aivo/nutrition-types';
import type D1Database from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  MEAL_IMAGES: R2Bucket;
  ANALYSIS_QUEUE: Queue;
  AI_GATEWAY: Ai;
  AI_DAILY_LIMIT: string;
  AI_HOURLY_LIMIT: string;
  AI_RETRY_LIMIT: string;
  AI_CONFIDENCE_THRESHOLD: string;
  DEFAULT_MODEL: string;
  FALLBACK_MODEL: string;
}

/**
 * Process a meal analysis queue message
 */
export async function processAnalysisMessage(
  message: MealAnalysisQueueMessage,
  env: Env
): Promise<void> {
  const { analysisId, userId, r2Key, mealTypeHint, retryCount } = message;
  const requestId = crypto.randomUUID();
  
  console.log(`[${requestId}] Processing analysis ${analysisId} for user ${userId}`);
  
  // Get analysis record
  const analysis = await getMealAnalysisById(env.DB, analysisId);
  
  if (!analysis) {
    console.error(`[${requestId}] Analysis ${analysisId} not found`);
    return;
  }
  
  // Check if already processed
  if (['completed', 'cancelled', 'needs_review'].includes(analysis.status)) {
    console.log(`[${requestId}] Analysis ${analysisId} already in terminal state: ${analysis.status}`);
    return;
  }
  
  // Update status to processing
  await updateMealAnalysisStatus(env.DB, analysisId, 'processing');
  
  try {
    // Get AI usage
    const usage = await getAIUsageToday(env.DB, userId);
    const dailyLimit = parseInt(env.AI_DAILY_LIMIT || '50', 10);
    const hourlyLimit = parseInt(env.AI_HOURLY_LIMIT || '10', 10);
    
    if (usage.daily >= dailyLimit) {
      console.log(`[${requestId}] User ${userId} exceeded daily AI limit`);
      await updateMealAnalysisStatus(env.DB, analysisId, 'failed', {
        errorCategory: 'AI_QUOTA_EXCEEDED',
        errorMessage: 'Daily AI usage limit reached',
      });
      return;
    }
    
    // Get image data
    let imageData: ArrayBuffer | string | null = null;
    
    if (r2Key) {
      const imageObject = await env.MEAL_IMAGES.get(r2Key);
      if (imageObject) {
        imageData = await imageObject.arrayBuffer();
      }
    } else if (message.imageDataBase64) {
      imageData = message.imageDataBase64;
    }
    
    if (!imageData) {
      console.error(`[${requestId}] No image data found for analysis ${analysisId}`);
      await updateMealAnalysisStatus(env.DB, analysisId, 'failed', {
        errorCategory: 'IMAGE_NOT_FOUND',
        errorMessage: 'Meal image not found',
      });
      return;
    }
    
    // Get user context for analysis
    const userTargets = await getUserNutritionTargets(env.DB, userId);
    const previousMeals = await getMealsForDate(
      env.DB,
      userId,
      new Date().toISOString().split('T')[0]
    );
    const userCorrections = await getUserCorrections(env.DB, userId);
    
    // Create AI analysis service
    const aiService = createAIAnalysisService(env.AI_GATEWAY, env.DB, {
      dailyLimit,
      hourlyLimit,
    });
    
    // Update router with current usage
    aiService.updateUsageLimits(usage.daily, usage.hourly);
    
    // Perform analysis
    const analysisResult = await aiService.analyzeMeal(imageData, {
      userId,
      userTargets: userTargets?.targets || null,
      dailyUsage: {
        aiCallsToday: usage.daily,
        aiCallsLimit: dailyLimit,
      },
    }, {
      mealTypeHint,
      previousConfidence: analysis.overallConfidence || undefined,
      retryCount,
    });
    
    // Record AI usage
    await recordAIUsage(env.DB, userId);
    
    if (!analysisResult.success || !analysisResult.result) {
      console.error(`[${requestId}] AI analysis failed: ${analysisResult.error}`);
      
      // Check if we should retry
      const maxRetries = parseInt(env.AI_RETRY_LIMIT || '3', 10);
      if ((retryCount || 0) < maxRetries && analysisResult.error?.includes('validation')) {
        console.log(`[${requestId}] Retrying analysis ${analysisId} (attempt ${retryCount + 1})`);
        await incrementAnalysisAttempts(env.DB, analysisId);
        
        // Re-queue for retry
        await env.ANALYSIS_QUEUE.send({
          ...message,
          retryCount: (retryCount || 0) + 1,
          timestamp: Date.now(),
        });
        return;
      }
      
      await updateMealAnalysisStatus(env.DB, analysisId, 'failed', {
        errorCategory: 'AI_MODEL_ERROR',
        errorMessage: analysisResult.error || 'Analysis failed',
      });
      return;
    }
    
    // Process and validate analysis result
    const confidenceThreshold = parseFloat(env.AI_CONFIDENCE_THRESHOLD || '0.7');
    
    // Try to match foods with catalog
    const enrichedResult = await enrichAnalysisWithCatalog(
      env.DB,
      analysisResult.result,
      userCorrections.map(c => ({
        normalizedFoodName: c.normalizedFoodName,
        nutrition: c.correctedNutrition,
      }))
    );
    
    // Save analysis items
    await saveAnalysisItems(env.DB, analysisId, enrichedResult.foods);
    
    // Determine final status
    const needsReview = enrichedResult.overallConfidence < confidenceThreshold ||
                        enrichedResult.warnings.length > 0;
    
    const finalStatus: MealAnalysisStatus = needsReview ? 'needs_review' : 'completed';
    
    // Update analysis with results
    await updateMealAnalysisStatus(env.DB, analysisId, finalStatus, {
      result: enrichedResult,
      overallConfidence: enrichedResult.overallConfidence,
      aiModel: analysisResult.model,
      promptVersion: 'v1',
    });
    
    console.log(`[${requestId}] Analysis ${analysisId} completed with status: ${finalStatus}`);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${requestId}] Analysis ${analysisId} error:`, errorMessage);
    
    await updateMealAnalysisStatus(env.DB, analysisId, 'failed', {
      errorCategory: 'INTERNAL_ERROR',
      errorMessage: errorMessage,
    });
  }
}

/**
 * Enrich analysis with food catalog data
 */
async function enrichAnalysisWithCatalog(
  db: D1Database,
  result: any,
  userCorrections: { normalizedFoodName: string; nutrition: any }[]
): Promise<any> {
  const enrichedFoods = [];
  let totalConfidence = 0;
  
  for (const food of result.foods) {
    let enrichedFood = { ...food };
    const warnings: string[] = [];
    
    // Try to find matching food in catalog
    const searchResults = await searchFoods(db, food.name, 1);
    
    if (searchResults.length > 0) {
      const matchedFood = searchResults[0];
      
      // Check user corrections first
      const userCorrection = userCorrections.find(
        c => c.normalizedFoodName === matchedFood.normalizedName
      );
      
      if (userCorrection) {
        enrichedFood.nutrition = NutritionCalculator.mergeUserOverride(
          food.nutrition,
          userCorrection.nutrition
        );
        enrichedFood.nutrition.source = 'user_override';
        enrichedFood.foodId = matchedFood.id;
        enrichedFood.normalizedName = matchedFood.normalizedName;
      } else {
        // Use catalog nutrition
        const catalogNutrition = NutritionCalculator.calculateFromPer100g(
          matchedFood.nutritionPer100g,
          food.estimatedQuantity,
          food.unit
        );
        
        // Compare with AI estimate
        const diff = Math.abs(food.nutrition.caloriesKcal - catalogNutrition.caloriesKcal);
        const percentDiff = food.nutrition.caloriesKcal > 0 
          ? diff / food.nutrition.caloriesKcal 
          : 0;
        
        if (percentDiff > 0.3) {
          warnings.push(`Nutrition differs significantly from catalog (${Math.round(percentDiff * 100)}% diff)`);
        }
        
        enrichedFood.nutrition = catalogNutrition;
        enrichedFood.nutrition.source = 'food_catalog';
        enrichedFood.nutrition.confidence = food.confidence;
        enrichedFood.foodId = matchedFood.id;
        enrichedFood.normalizedName = matchedFood.normalizedName;
      }
    }
    
    // Add warnings
    enrichedFood.warnings = [...enrichedFood.warnings, ...warnings];
    
    // Boost confidence if we found catalog match
    if (enrichedFood.foodId) {
      enrichedFood.confidence = Math.min(enrichedFood.confidence * 1.1, 1);
    }
    
    enrichedFoods.push(enrichedFood);
    totalConfidence += enrichedFood.confidence;
  }
  
  return {
    ...result,
    foods: enrichedFoods,
    overallConfidence: result.foods.length > 0 
      ? totalConfidence / result.foods.length 
      : 0,
    warnings: result.warnings || [],
  };
}

/**
 * Queue consumer handler
 */
export default {
  async queue(batch: MessageBatch, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`Processing batch of ${batch.messages.length} messages`);
    
    for (const message of batch.messages) {
      try {
        const payload = message.body as MealAnalysisQueueMessage;
        await processAnalysisMessage(payload, env);
        await message.ack();
      } catch (error) {
        console.error('Failed to process message:', error);
        // Don't ack - message will be retried
      }
    }
  },
};
