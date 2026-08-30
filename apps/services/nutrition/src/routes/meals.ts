/**
 * Meals routes
 */

import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth } from '../middleware/auth';
import { NutritionError } from '../middleware';
import {
  createMeal,
  getMealById,
  listMeals,
  getMealsForDate,
  deleteMeal,
  getMealItems,
} from '../db/queries';
import { NutritionCalculator } from '../services/calculations';
import type { MealType } from '@repo/nutrition-types';

const meals = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

// Use auth middleware
meals.use('*', requireAuth());

/**
 * Create a new meal manually
 */
meals.post('/', async (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId');
  const body = await c.req.json();
  
  // Validate required fields
  const { date, timezone, mealType, name, items } = body;
  
  if (!date || !timezone || !mealType || !name || !items) {
    throw NutritionError.badRequest('Missing required fields: date, timezone, mealType, name, items');
  }
  
  if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType)) {
    throw NutritionError.badRequest('Invalid meal type');
  }
  
  if (!Array.isArray(items) || items.length === 0) {
    throw NutritionError.badRequest('At least one item is required');
  }
  
  // Validate items
  for (const item of items) {
    if (!item.name || !item.quantity || !item.unit) {
      throw NutritionError.badRequest('Each item must have name, quantity, and unit');
    }
    if (item.quantity < 0 || item.quantity > 10000) {
      throw NutritionError.badRequest('Invalid quantity value');
    }
  }
  
  // Calculate nutrition for each item
  const mealItems = items.map((item: any, index: number) => {
    let nutrition = item.nutrition || {
      caloriesKcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
      sugarG: 0,
      sodiumMg: 0,
    };
    
    // Apply user override if present
    if (item.userOverride) {
      nutrition = NutritionCalculator.mergeUserOverride(nutrition, item.userOverride);
    }
    
    return {
      name: item.name,
      normalizedName: item.normalizedName || null,
      quantity: item.quantity,
      unit: item.unit,
      nutrition: {
        caloriesKcal: NutritionCalculator.round(nutrition.caloriesKcal, 0),
        proteinG: NutritionCalculator.round(nutrition.proteinG, 1),
        carbsG: NutritionCalculator.round(nutrition.carbsG, 1),
        fatG: NutritionCalculator.round(nutrition.fatG, 1),
        fiberG: NutritionCalculator.round(nutrition.fiberG, 1),
        sugarG: NutritionCalculator.round(nutrition.sugarG, 1),
        sodiumMg: NutritionCalculator.round(nutrition.sodiumMg, 0),
      },
      source: item.foodId ? 'food_catalog' : 'manual',
      foodId: item.foodId || null,
      orderIndex: index,
      userOverride: item.userOverride || null,
    };
  });
  
  // Calculate total nutrition
  const totalNutrition = NutritionCalculator.aggregateNutrition(mealItems);
  
  // Create meal
  const meal = await createMeal(c.env.DB, {
    userId,
    date,
    timezone,
    mealType,
    name,
    imageR2Key: body.imageR2Key || null,
    imageHash: body.imageHash || null,
    notes: body.notes || null,
    totalNutrition,
    items: mealItems,
    source: 'manual',
    analysisId: null,
  });
  
  return c.json({
    data: meal,
    requestId,
  }, 201);
});

/**
 * List meals with filters
 */
meals.get('/', async (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId');
  
  // Parse query parameters
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  const mealType = c.req.query('mealType') as MealType | undefined;
  const limit = parseInt(c.req.query('limit') || '20', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);
  
  if (!startDate || !endDate) {
    throw NutritionError.badRequest('startDate and endDate are required');
  }
  
  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    throw NutritionError.badRequest('Invalid date format. Use YYYY-MM-DD');
  }
  
  if (mealType && !['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType)) {
    throw NutritionError.badRequest('Invalid meal type');
  }
  
  const result = await listMeals(
    c.env.DB,
    userId,
    startDate,
    endDate,
    mealType,
    Math.min(limit, 100),
    offset
  );
  
  return c.json({
    data: {
      meals: result.meals,
      total: result.total,
      hasMore: offset + result.meals.length < result.total,
    },
    requestId,
  });
});

/**
 * Get today's meals
 */
meals.get('/today', async (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId');
  
  const today = new Date().toISOString().split('T')[0];
  const meals = await getMealsForDate(c.env.DB, userId, today);
  
  // Calculate daily totals
  const totalNutrition = NutritionCalculator.aggregateNutrition(meals);
  const macroPercentages = NutritionCalculator.calculateMacroPercentages(totalNutrition);
  
  return c.json({
    data: {
      date: today,
      meals,
      totalNutrition,
      macroPercentages,
    },
    requestId,
  });
});

/**
 * Get single meal by ID
 */
meals.get('/:id', async (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId');
  const mealId = c.req.param('id');
  
  const meal = await getMealById(c.env.DB, mealId);
  
  if (!meal) {
    throw NutritionError.notFound('Meal not found');
  }
  
  if (meal.userId !== userId) {
    throw NutritionError.forbidden('Access denied');
  }
  
  return c.json({
    data: meal,
    requestId,
  });
});

/**
 * Update a meal
 */
meals.put('/:id', async (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId');
  const mealId = c.req.param('id');
  const body = await c.req.json();
  
  const meal = await getMealById(c.env.DB, mealId);
  
  if (!meal) {
    throw NutritionError.notFound('Meal not found');
  }
  
  if (meal.userId !== userId) {
    throw NutritionError.forbidden('Access denied');
  }
  
  // For now, update is limited - in production, add full update logic
  const updates: any = {};
  
  if (body.name) {
    updates.name = body.name;
  }
  
  if (body.mealType && ['breakfast', 'lunch', 'dinner', 'snack'].includes(body.mealType)) {
    updates.mealType = body.mealType;
  }
  
  if (body.notes !== undefined) {
    updates.notes = body.notes;
  }
  
  if (body.items) {
    // Recalculate nutrition
    const mealItems = body.items.map((item: any, index: number) => {
      let nutrition = item.nutrition || {
        caloriesKcal: 0,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
        fiberG: 0,
        sugarG: 0,
        sodiumMg: 0,
      };
      
      if (item.userOverride) {
        nutrition = NutritionCalculator.mergeUserOverride(nutrition, item.userOverride);
      }
      
      return {
        name: item.name,
        normalizedName: item.normalizedName || null,
        quantity: item.quantity,
        unit: item.unit,
        nutrition,
        source: item.foodId ? 'food_catalog' : 'manual',
        foodId: item.foodId || null,
        orderIndex: index,
        userOverride: item.userOverride || null,
      };
    });
    
    updates.items = mealItems;
    updates.totalNutrition = NutritionCalculator.aggregateNutrition(mealItems);
  }
  
  // In production, execute the update
  // For now, return the existing meal with updates
  return c.json({
    data: {
      ...meal,
      ...updates,
    },
    requestId,
  });
});

/**
 * Delete a meal
 */
meals.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId');
  const mealId = c.req.param('id');
  
  const meal = await getMealById(c.env.DB, mealId);
  
  if (!meal) {
    throw NutritionError.notFound('Meal not found');
  }
  
  if (meal.userId !== userId) {
    throw NutritionError.forbidden('Access denied');
  }
  
  // Delete associated image if exists
  if (meal.imageR2Key) {
    await c.env.MEAL_IMAGES.delete(meal.imageR2Key);
  }
  
  // Soft delete meal
  await deleteMeal(c.env.DB, mealId, userId);
  
  return c.json({
    data: {
      deleted: true,
      mealId,
    },
    requestId,
  });
});

export default meals;
