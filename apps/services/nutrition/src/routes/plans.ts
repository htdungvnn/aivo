/**
 * Meal plan routes
 */

import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth } from '../middleware/auth';
import { NutritionError } from '../middleware';
import {
  getOrCreateMealPlan,
  getMealPlanByDate,
  getMealPlanEntries,
  updateMealPlanEntry,
  getMealsForDate,
  updateDailySummary,
} from '../db/queries';
import { NutritionCalculator, MealPlanCalculator } from '../services/calculations';
import type { MealType, MealPlanEntry } from '@repo/nutrition-types';

const plans = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

// Use auth middleware
plans.use('*', requireAuth());

/**
 * Get meal plan for a date
 */
plans.get('/:date', async (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId');
  const date = c.req.param('date');
  const timezone = c.req.query('timezone') || 'UTC';
  
  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw NutritionError.badRequest('Invalid date format. Use YYYY-MM-DD');
  }
  
  const plan = await getOrCreateMealPlan(c.env.DB, userId, date, timezone);
  
  // Get meals for the day
  const meals = await getMealsForDate(c.env.DB, userId, date);
  
  // Calculate consumed nutrition
  const consumedNutrition = NutritionCalculator.aggregateNutrition(meals);
  
  // Update plan targets based on consumed meals
  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  const entries = plan.entries.map(entry => {
    const mealOfType = meals.find(m => m.mealType === entry.mealType);
    
    return {
      ...entry,
      actualNutrition: mealOfType?.totalNutrition || null,
      isComplete: !!mealOfType,
    };
  });
  
  return c.json({
    data: {
      plan: {
        ...plan,
        entries,
      },
      consumedNutrition,
      meals,
    },
    requestId,
  });
});

/**
 * Update meal plan entry
 */
plans.put('/:date/:mealType', async (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId');
  const date = c.req.param('date');
  const mealType = c.req.param('mealType') as MealType;
  const body = await c.req.json();
  
  // Validate
  if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType)) {
    throw NutritionError.badRequest('Invalid meal type');
  }
  
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw NutritionError.badRequest('Invalid date format');
  }
  
  const plan = await getOrCreateMealPlan(c.env.DB, userId, date, body.timezone || 'UTC');
  const entry = plan.entries.find(e => e.mealType === mealType);
  
  if (!entry) {
    throw NutritionError.notFound('Meal plan entry not found');
  }
  
  // Build update object
  const updates: any = {};
  
  if (body.targetNutrition) {
    updates.targetNutrition = body.targetNutrition;
  }
  
  if (body.suggestedFoods) {
    updates.suggestedFoods = body.suggestedFoods;
  }
  
  if (typeof body.isLocked === 'boolean') {
    updates.isLocked = body.isLocked;
    updates.lockedBy = body.lockedBy || 'user';
  }
  
  if (body.targetTime) {
    updates.targetTime = body.targetTime;
  }
  
  // Apply updates
  if (Object.keys(updates).length > 0) {
    await updateMealPlanEntry(c.env.DB, entry.id, updates);
  }
  
  return c.json({
    data: {
      updated: true,
      entryId: entry.id,
    },
    requestId,
  });
});

/**
 * Lock/unlock meal plan entry
 */
plans.post('/:date/:mealType/lock', async (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId');
  const date = c.req.param('date');
  const mealType = c.req.param('mealType') as MealType;
  const body = await c.req.json();
  
  const lock = body.lock === true;
  const lockedBy = body.lockedBy || 'user';
  
  const plan = await getOrCreateMealPlan(c.env.DB, userId, date, body.timezone || 'UTC');
  const entry = plan.entries.find(e => e.mealType === mealType);
  
  if (!entry) {
    throw NutritionError.notFound('Meal plan entry not found');
  }
  
  await updateMealPlanEntry(c.env.DB, entry.id, {
    isLocked: lock,
    lockedBy: lock ? lockedBy : null,
  });
  
  return c.json({
    data: {
      locked: lock,
      entryId: entry.id,
    },
    requestId,
  });
});

/**
 * Regenerate meal plan suggestions
 */
plans.post('/:date/regenerate', async (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId');
  const date = c.req.param('date');
  const body = await c.req.json();
  
  const plan = await getOrCreateMealPlan(c.env.DB, userId, date, body.timezone || 'UTC');
  const meals = await getMealsForDate(c.env.DB, userId, date);
  
  // Calculate remaining nutrition
  const consumedNutrition = NutritionCalculator.aggregateNutrition(meals);
  const targetNutrition = body.targets || {
    caloriesKcal: 2000,
    proteinG: 50,
    carbsG: 275,
    fatG: 78,
    fiberG: 28,
    sugarG: 50,
    sodiumMg: 2300,
  };
  
  const remainingNutrition = NutritionCalculator.calculateRemainingNutrition(
    consumedNutrition,
    targetNutrition
  );
  
  // Calculate meal plan targets for remaining meals
  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  const completedTypes = meals.map(m => m.mealType);
  const remainingTypes = mealTypes.filter(t => !completedTypes.includes(t));
  
  for (const entry of plan.entries) {
    if (!entry.isLocked && remainingTypes.includes(entry.mealType)) {
      const suggestions = MealPlanCalculator.suggestFoodsForRemaining(
        remainingNutrition,
        entry.mealType,
        []
      );
      
      await updateMealPlanEntry(c.env.DB, entry.id, {
        suggestedFoods: suggestions,
        targetNutrition: NutritionCalculator.calculateMealPlanTargets(
          remainingNutrition,
          entry.mealType,
          remainingTypes
        ),
      });
    }
  }
  
  return c.json({
    data: {
      regenerated: true,
      remainingNutrition,
      updatedEntries: plan.entries.filter(e => !e.isLocked).length,
    },
    requestId,
  });
});

export default plans;
