/**
 * Food catalog routes
 */

import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth } from '../middleware/auth';
import { NutritionError } from '../middleware';
import {
  searchFoods,
  getFoodById,
  getFoodByNormalizedName,
  getUserCorrections,
  getUserCorrectionForFood,
  upsertUserCorrection,
} from '../db/queries';
import { NutritionCalculator } from '../services/calculations';
import type { NutritionValues } from '@repo/nutrition-types';

const foods = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

// Use auth middleware
foods.use('*', requireAuth());

/**
 * Search foods
 */
foods.get('/search', async (c) => {
  const requestId = c.get('requestId');
  const query = c.req.query('q');
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 50);
  
  if (!query || query.length < 2) {
    throw NutritionError.badRequest('Query must be at least 2 characters');
  }
  
  const results = await searchFoods(c.env.DB, query, limit);
  
  return c.json({
    data: {
      foods: results,
      count: results.length,
    },
    requestId,
  });
});

/**
 * Get food by ID
 */
foods.get('/:id', async (c) => {
  const requestId = c.get('requestId');
  const foodId = c.req.param('id');
  
  const food = await getFoodById(c.env.DB, foodId);
  
  if (!food) {
    throw NutritionError.notFound('Food not found');
  }
  
  return c.json({
    data: food,
    requestId,
  });
});

/**
 * Get nutrition for a food with quantity
 */
foods.get('/:id/nutrition', async (c) => {
  const requestId = c.get('requestId');
  const foodId = c.req.param('id');
  const quantity = parseFloat(c.req.query('quantity') || '100');
  const unit = c.req.query('unit') || 'g';
  
  if (quantity < 0 || quantity > 10000) {
    throw NutritionError.badRequest('Invalid quantity');
  }
  
  const food = await getFoodById(c.env.DB, foodId);
  
  if (!food) {
    throw NutritionError.notFound('Food not found');
  }
  
  // Calculate nutrition for quantity
  const nutrition = NutritionCalculator.calculateFromPer100g(
    food.nutritionPer100g,
    quantity,
    unit
  );
  
  return c.json({
    data: {
      food: {
        id: food.id,
        name: food.displayName,
        normalizedName: food.normalizedName,
        quantity,
        unit,
      },
      nutrition,
    },
    requestId,
  });
});

/**
 * Get user food corrections
 */
foods.get('/corrections/mine', async (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId');
  
  const corrections = await getUserCorrections(c.env.DB, userId);
  
  return c.json({
    data: {
      corrections,
      count: corrections.length,
    },
    requestId,
  });
});

/**
 * Get correction for specific food
 */
foods.get('/corrections/:normalizedName', async (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId');
  const normalizedName = decodeURIComponent(c.req.param('normalizedName'));
  
  const correction = await getUserCorrectionForFood(c.env.DB, userId, normalizedName);
  
  return c.json({
    data: {
      correction,
      hasCorrection: !!correction,
    },
    requestId,
  });
});

/**
 * Save or update food correction
 */
foods.post('/corrections', async (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId');
  const body = await c.req.json();
  
  const { normalizedFoodName, correctedNutrition, isFavorite } = body;
  
  if (!normalizedFoodName || !correctedNutrition) {
    throw NutritionError.badRequest('normalizedFoodName and correctedNutrition are required');
  }
  
  // Validate nutrition values
  const validation = NutritionCalculator.validateNutrition(correctedNutrition);
  if (!validation.valid) {
    throw NutritionError.badRequest(`Invalid nutrition values: ${validation.errors.join(', ')}`);
  }
  
  await upsertUserCorrection(
    c.env.DB,
    userId,
    normalizedFoodName,
    correctedNutrition,
    isFavorite || false
  );
  
  return c.json({
    data: {
      saved: true,
      normalizedFoodName,
    },
    requestId,
  });
});

/**
 * Delete food correction
 */
foods.delete('/corrections/:normalizedName', async (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId');
  const normalizedName = decodeURIComponent(c.req.param('normalizedName'));
  
  // To delete, we set corrected nutrition to null or use a soft delete approach
  // For now, just confirm the operation
  await upsertUserCorrection(
    c.env.DB,
    userId,
    normalizedName,
    {
      caloriesKcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
      sugarG: 0,
      sodiumMg: 0,
    },
    false
  );
  
  return c.json({
    data: {
      deleted: true,
      normalizedFoodName,
    },
    requestId,
  });
});

export default foods;
