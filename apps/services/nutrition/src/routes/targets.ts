/**
 * Nutrition targets routes
 */

import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth } from '../middleware/auth';
import { NutritionError } from '../middleware';
import {
  getUserNutritionTargets,
  upsertNutritionTargets,
} from '../db/queries';
import type { NutritionTargets, MacroTargets } from '@aivo/nutrition-types';

const targets = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

// Use auth middleware
targets.use('*', requireAuth());

/**
 * Get current nutrition targets
 */
targets.get('/', async (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId');
  
  const targetsRecord = await getUserNutritionTargets(c.env.DB, userId);
  
  if (!targetsRecord) {
    // Return default targets
    return c.json({
      data: {
        targets: {
          caloriesKcal: 2000,
          proteinG: 50,
          carbsG: 275,
          fatG: 78,
          fiberG: 28,
          sugarG: 50,
          sodiumMg: 2300,
          hydrationMl: 2000,
          weightKg: null,
        },
        macroTargets: {
          proteinPercent: 20,
          carbsPercent: 50,
          fatPercent: 30,
        },
        isDefault: true,
      },
      requestId,
    });
  }
  
  return c.json({
    data: {
      targets: targetsRecord.targets,
      macroTargets: targetsRecord.macroTargets,
      isDefault: false,
      updatedAt: targetsRecord.updatedAt,
    },
    requestId,
  });
});

/**
 * Update nutrition targets
 */
targets.put('/', async (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId');
  const body = await c.req.json();
  
  const { targets: newTargets, macroTargets: newMacroTargets } = body;
  
  // Validate targets if provided
  if (newTargets) {
    const validKeys = [
      'caloriesKcal',
      'proteinG',
      'carbsG',
      'fatG',
      'fiberG',
      'sugarG',
      'sodiumMg',
      'hydrationMl',
      'weightKg',
    ];
    
    for (const [key, value] of Object.entries(newTargets)) {
      if (!validKeys.includes(key)) {
        throw NutritionError.badRequest(`Invalid target: ${key}`);
      }
      
      if (typeof value === 'number' && (value < 0 || value > 100000)) {
        throw NutritionError.badRequest(`${key} must be between 0 and 100000`);
      }
    }
  }
  
  // Validate macro targets if provided
  if (newMacroTargets) {
    const validKeys = ['proteinPercent', 'carbsPercent', 'fatPercent'];
    
    for (const [key, value] of Object.entries(newMacroTargets)) {
      if (!validKeys.includes(key)) {
        throw NutritionError.badRequest(`Invalid macro target: ${key}`);
      }
      
      if (typeof value === 'number' && (value < 0 || value > 100)) {
        throw NutritionError.badRequest(`${key} must be between 0 and 100`);
      }
    }
    
    // Validate macro percentages sum to ~100
    const existingMacros = newMacroTargets;
    const sum = (existingMacros.proteinPercent || 0) + 
                (existingMacros.carbsPercent || 0) + 
                (existingMacros.fatPercent || 0);
    
    if (sum > 0 && (sum < 95 || sum > 105)) {
      throw NutritionError.badRequest('Macro percentages should sum to approximately 100');
    }
  }
  
  const updated = await upsertNutritionTargets(
    c.env.DB,
    userId,
    newTargets || {},
    newMacroTargets
  );
  
  return c.json({
    data: {
      targets: updated.targets,
      macroTargets: updated.macroTargets,
      updatedAt: updated.updatedAt,
    },
    requestId,
  });
});

/**
 * Reset targets to defaults
 */
targets.post('/reset', async (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId');
  
  const updated = await upsertNutritionTargets(c.env.DB, userId, {
    caloriesKcal: 2000,
    proteinG: 50,
    carbsG: 275,
    fatG: 78,
    fiberG: 28,
    sugarG: 50,
    sodiumMg: 2300,
    hydrationMl: 2000,
    weightKg: null,
  }, {
    proteinPercent: 20,
    carbsPercent: 50,
    fatPercent: 30,
  });
  
  return c.json({
    data: {
      targets: updated.targets,
      macroTargets: updated.macroTargets,
      reset: true,
    },
    requestId,
  });
});

export default targets;
