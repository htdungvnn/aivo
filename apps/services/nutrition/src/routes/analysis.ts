/**
 * Meal analysis routes
 */

import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth } from '../middleware/auth';
import { NutritionError } from '../middleware';
import {
  createMealAnalysis,
  getMealAnalysisById,
  getMealAnalysisByIdempotencyKey,
  updateMealAnalysisStatus,
  incrementAnalysisAttempts,
  getAnalysisItems,
  saveAnalysisItems,
  getAIUsageToday,
  recordAIUsage,
  getUserNutritionTargets,
  getMealsForDate,
  getUserCorrections,
  createMeal,
  getOrCreateMealPlan,
  updateMealPlanEntry,
} from '../db/queries';
import { NutritionCalculator } from '../services/calculations';
import { createAIAnalysisService } from '../services/ai-analysis';
import type {
  MealAnalysisStatus,
  MealType,
  MealCorrection,
  MealAnalysisResult,
  CONFIDENCE_THRESHOLDS,
} from '@aivo/nutrition-types';
import type D1Database from '@cloudflare/workers-types';

const analysis = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

// Use auth middleware
analysis.use('*', requireAuth());

/**
 * Create a new meal analysis
 */
analysis.post('/', async (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId');
  const body = await c.req.json().catch(() => ({}));
  
  const mealType = body.mealType as MealType | undefined;
  const timezone = body.timezone || 'UTC';
  
  // Validate meal type if provided
  if (mealType && !['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType)) {
    throw NutritionError.badRequest('Invalid meal type');
  }
  
  // Generate idempotency key
  const idempotencyKey = body.idempotencyKey || crypto.randomUUID();
  
  // Check for existing analysis with same idempotency key
  const existing = await getMealAnalysisByIdempotencyKey(c.env.DB, idempotencyKey);
  if (existing) {
    // Return existing analysis
    return c.json({
      data: {
        analysisId: existing.id,
        status: existing.status,
        createdAt: existing.createdAt,
        isExisting: true,
      },
      requestId,
    });
  }
  
  // Create new analysis
  const analysisRecord = await createMealAnalysis(c.env.DB, {
    userId,
    mealType: mealType || null,
    idempotencyKey,
  });
  
  // Queue analysis task
  const queueMessage = {
    analysisId: analysisRecord.id,
    userId,
    r2Key: null,
    mealTypeHint: mealType,
    idempotencyKey,
    timestamp: Date.now(),
    retryCount: 0,
  };
  
  try {
    await c.env.ANALYSIS_QUEUE.send(queueMessage);
  } catch (queueError) {
    console.error(`[${requestId}] Failed to queue analysis:`, queueError);
    // Don't fail the request - we can still return the analysis ID
  }
  
  return c.json({
    data: {
      analysisId: analysisRecord.id,
      status: analysisRecord.status,
      createdAt: analysisRecord.createdAt,
      isExisting: false,
    },
    requestId,
  }, 202);
});

/**
 * Get analysis status
 */
analysis.get('/:id/status', async (c) => {
  const userId = c.get('userId');
  const analysisId = c.req.param('id');
  
  const analysisRecord = await getMealAnalysisById(c.env.DB, analysisId);
  
  if (!analysisRecord) {
    throw NutritionError.notFound('Analysis not found');
  }
  
  if (analysisRecord.userId !== userId) {
    throw NutritionError.forbidden('Access denied');
  }
  
  // Build progress info
  let progress: { stage: string; percent: number } | undefined;
  
  switch (analysisRecord.status) {
    case 'pending_upload':
      progress = { stage: 'Waiting for image upload', percent: 10 };
      break;
    case 'queued':
      progress = { stage: 'Queued for processing', percent: 25 };
      break;
    case 'processing':
      progress = { stage: 'Analyzing image', percent: 50 };
      break;
    case 'needs_review':
      progress = { stage: 'Awaiting user review', percent: 90 };
      break;
    case 'completed':
      progress = { stage: 'Completed', percent: 100 };
      break;
    case 'failed':
      progress = { stage: 'Failed', percent: 0 };
      break;
    case 'cancelled':
      progress = { stage: 'Cancelled', percent: 0 };
      break;
  }
  
  return c.json({
    data: {
      analysisId: analysisRecord.id,
      status: analysisRecord.status,
      progress,
      completedAt: analysisRecord.completedAt,
      errorMessage: analysisRecord.errorMessage,
    },
    requestId: c.get('requestId'),
  });
});

/**
 * Get analysis result
 */
analysis.get('/:id', async (c) => {
  const userId = c.get('userId');
  const analysisId = c.req.param('id');
  
  const analysisRecord = await getMealAnalysisById(c.env.DB, analysisId);
  
  if (!analysisRecord) {
    throw NutritionError.notFound('Analysis not found');
  }
  
  if (analysisRecord.userId !== userId) {
    throw NutritionError.forbidden('Access denied');
  }
  
  if (analysisRecord.status === 'pending_upload' || analysisRecord.status === 'queued') {
    return c.json({
      data: {
        analysisId: analysisRecord.id,
        status: analysisRecord.status,
        message: 'Analysis is still pending',
      },
      requestId: c.get('requestId'),
    });
  }
  
  const items = await getAnalysisItems(c.env.DB, analysisId);
  
  return c.json({
    data: {
      analysisId: analysisRecord.id,
      status: analysisRecord.status,
      mealName: analysisRecord.mealName,
      mealType: analysisRecord.mealType,
      overallConfidence: analysisRecord.overallConfidence,
      foods: items,
      needsUserReview: analysisRecord.status === 'needs_review',
      warnings: analysisRecord.result?.warnings || [],
      completedAt: analysisRecord.completedAt,
      errorMessage: analysisRecord.errorMessage,
    },
    requestId: c.get('requestId'),
  });
});

/**
 * Update image for analysis and trigger processing
 */
analysis.post('/:id/image', async (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId');
  const analysisId = c.req.param('id');
  
  const analysisRecord = await getMealAnalysisById(c.env.DB, analysisId);
  
  if (!analysisRecord) {
    throw NutritionError.notFound('Analysis not found');
  }
  
  if (analysisRecord.userId !== userId) {
    throw NutritionError.forbidden('Access denied');
  }
  
  if (analysisRecord.status !== 'pending_upload') {
    throw NutritionError.badRequest('Analysis is not awaiting image upload');
  }
  
  // Get image data from request
  const contentType = c.req.header('Content-Type') || '';
  const imageData = await c.req.arrayBuffer();
  
  // Validate image
  if (!['image/jpeg', 'image/webp', 'image/png'].includes(contentType)) {
    throw NutritionError.badRequest('Invalid image type');
  }
  
  if (imageData.byteLength < 1000 || imageData.byteLength > 10 * 1024 * 1024) {
    throw NutritionError.badRequest('Invalid image size');
  }
  
  // Compute hash
  const imageHashBuffer = await crypto.subtle.digest('SHA-256', imageData);
  const imageHash = Array.from(new Uint8Array(imageHashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Upload to R2
  const r2Key = `meals/${userId}/${Date.now()}-${analysisId}`;
  await c.env.MEAL_IMAGES.put(r2Key, imageData, {
    httpMetadata: {
      contentType,
      cacheControl: 'private, max-age=31536000',
    },
    customMetadata: {
      userId,
      analysisId,
      imageHash,
    },
  });
  
  // Update analysis status
  await updateMealAnalysisStatus(c.env.DB, analysisId, 'queued', {
    imageR2Key: r2Key,
    imageHash,
  });
  
  // Queue analysis task
  const queueMessage = {
    analysisId,
    userId,
    r2Key,
    mealTypeHint: analysisRecord.mealType || undefined,
    idempotencyKey: analysisRecord.idempotencyKey,
    timestamp: Date.now(),
    retryCount: 0,
  };
  
  await c.env.ANALYSIS_QUEUE.send(queueMessage);
  
  return c.json({
    data: {
      analysisId,
      status: 'queued',
      r2Key,
      imageHash,
    },
    requestId,
  }, 202);
});

/**
 * Confirm analysis and create meal
 */
analysis.post('/:id/confirm', async (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId');
  const analysisId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  
  const corrections = body.corrections as MealCorrection[] | undefined;
  
  const analysisRecord = await getMealAnalysisById(c.env.DB, analysisId);
  
  if (!analysisRecord) {
    throw NutritionError.notFound('Analysis not found');
  }
  
  if (analysisRecord.userId !== userId) {
    throw NutritionError.forbidden('Access denied');
  }
  
  if (!['completed', 'needs_review'].includes(analysisRecord.status)) {
    throw NutritionError.badRequest('Analysis is not ready for confirmation');
  }
  
  const items = await getAnalysisItems(c.env.DB, analysisId);
  
  // Apply corrections if provided
  let mealItems = items;
  if (corrections && corrections.length > 0) {
    mealItems = items.map(item => {
      const correction = corrections.find(c => c.itemId === item.id);
      if (!correction) return item;
      
      return {
        ...item,
        name: correction.name || item.name,
        estimatedQuantity: correction.quantity || item.estimatedQuantity,
        unit: correction.unit || item.unit,
        nutrition: correction.nutrition
          ? NutritionCalculator.mergeUserOverride(item.nutrition, correction.nutrition)
          : item.nutrition,
        userOverride: correction.nutrition || item.userOverride,
      };
    });
  }
  
  // Calculate total nutrition
  const totalNutrition = NutritionCalculator.aggregateNutrition(mealItems);
  
  // Determine meal date and timezone
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const timezone = body.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Create meal
  const meal = await createMeal(c.env.DB, {
    userId,
    date,
    timezone,
    mealType: analysisRecord.mealType || 'snack',
    name: analysisRecord.mealName || 'Analyzed Meal',
    imageR2Key: analysisRecord.imageR2Key,
    imageHash: analysisRecord.imageHash,
    notes: null,
    totalNutrition,
    items: mealItems.map((item, index) => ({
      name: item.name,
      normalizedName: item.normalizedName,
      quantity: item.estimatedQuantity,
      unit: item.unit,
      nutrition: item.nutrition,
      source: item.source,
      foodId: item.foodId,
      orderIndex: index,
      userOverride: item.userOverride,
    })),
    source: 'ai_analysis',
    analysisId,
  });
  
  // Update analysis status
  await updateMealAnalysisStatus(c.env.DB, analysisId, 'completed');
  
  // Update meal plan if exists
  try {
    const plan = await getOrCreateMealPlan(c.env.DB, userId, date, timezone);
    const entries = plan.entries.map(entry => {
      if (entry.mealType === meal.mealType && !entry.isLocked) {
        return {
          ...entry,
          targetNutrition: totalNutrition,
          updatedAt: Math.floor(Date.now() / 1000),
        };
      }
      return entry;
    });
    
    for (const entry of entries) {
      if (entry.mealType === meal.mealType && !entry.isLocked) {
        await updateMealPlanEntry(c.env.DB, entry.id, {
          targetNutrition: totalNutrition,
        });
      }
    }
  } catch (planError) {
    // Don't fail if plan update fails
    console.error(`[${requestId}] Failed to update meal plan:`, planError);
  }
  
  return c.json({
    data: {
      meal,
      analysisId,
    },
    requestId,
  });
});

/**
 * Cancel analysis
 */
analysis.post('/:id/cancel', async (c) => {
  const userId = c.get('userId');
  const analysisId = c.req.param('id');
  
  const analysisRecord = await getMealAnalysisById(c.env.DB, analysisId);
  
  if (!analysisRecord) {
    throw NutritionError.notFound('Analysis not found');
  }
  
  if (analysisRecord.userId !== userId) {
    throw NutritionError.forbidden('Access denied');
  }
  
  if (['completed', 'cancelled', 'failed'].includes(analysisRecord.status)) {
    throw NutritionError.badRequest('Analysis cannot be cancelled');
  }
  
  // Delete image if exists
  if (analysisRecord.imageR2Key) {
    await c.env.MEAL_IMAGES.delete(analysisRecord.imageR2Key);
  }
  
  // Update status
  await updateMealAnalysisStatus(c.env.DB, analysisId, 'cancelled');
  
  return c.json({
    data: {
      analysisId,
      status: 'cancelled',
    },
    requestId: c.get('requestId'),
  });
});

/**
 * Retry failed analysis
 */
analysis.post('/:id/retry', async (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId');
  const analysisId = c.req.param('id');
  
  const analysisRecord = await getMealAnalysisById(c.env.DB, analysisId);
  
  if (!analysisRecord) {
    throw NutritionError.notFound('Analysis not found');
  }
  
  if (analysisRecord.userId !== userId) {
    throw NutritionError.forbidden('Access denied');
  }
  
  if (analysisRecord.status !== 'failed') {
    throw NutritionError.badRequest('Only failed analyses can be retried');
  }
  
  // Check retry limit
  const MAX_RETRIES = 3;
  if (analysisRecord.processingAttempts >= MAX_RETRIES) {
    throw NutritionError.badRequest(`Maximum retry limit (${MAX_RETRIES}) reached`);
  }
  
  // Check AI usage
  const usage = await getAIUsageToday(c.env.DB, userId);
  if (usage.daily >= 50) {
    throw NutritionError.rateLimited('Daily AI usage limit reached');
  }
  
  // Update status
  await updateMealAnalysisStatus(c.env.DB, analysisId, 'queued');
  await incrementAnalysisAttempts(c.env.DB, analysisId);
  
  // Queue retry
  const queueMessage = {
    analysisId,
    userId,
    r2Key: analysisRecord.imageR2Key,
    mealTypeHint: analysisRecord.mealType || undefined,
    idempotencyKey: analysisRecord.idempotencyKey,
    timestamp: Date.now(),
    retryCount: analysisRecord.processingAttempts + 1,
  };
  
  await c.env.ANALYSIS_QUEUE.send(queueMessage);
  
  return c.json({
    data: {
      analysisId,
      status: 'queued',
    },
    requestId,
  }, 202);
});

export default analysis;
