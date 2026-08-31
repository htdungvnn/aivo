/**
 * Coach Service - Exercises Routes
 * API endpoints for exercise definitions
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { CoachContext } from '../env.d';
import { getExerciseDefinitions } from '../services/exercises';
import { NotFoundError } from '../middleware';

// Validation schemas
const exerciseCodeSchema = z.object({
  code: z.enum(['squat', 'push_up', 'lunge', 'shoulder_press', 'plank']),
});

/**
 * Create exercises routes
 */
export function exercisesRoutes(): Hono<CoachContext> {
  const app = new Hono<CoachContext>();
  
  // Get all supported exercises
  app.get('/', async (c) => {
    const exercises = getExerciseDefinitions();
    
    return c.json({
      data: {
        exercises: exercises.map(ex => ({
          code: ex.code,
          name: ex.name,
          description: ex.description,
          difficulty: ex.difficulty,
          goals: ex.goals,
          cameraOrientation: ex.cameraOrientation,
          formRulesCount: ex.formRules.length,
        })),
        total: exercises.length,
      },
    });
  });
  
  // Get exercise definition with rules
  app.get('/:code', async (c) => {
    const code = c.req.param('code');
    
    const exercises = getExerciseDefinitions();
    const exercise = exercises.find(ex => ex.code === code);
    
    if (!exercise) {
      throw new NotFoundError(`Exercise '${code}' not found`);
    }
    
    return c.json({
      data: {
        exercise,
      },
    });
  });
  
  // Get form rules for an exercise
  app.get('/:code/rules', async (c) => {
    const code = c.req.param('code');
    
    const exercises = getExerciseDefinitions();
    const exercise = exercises.find(ex => ex.code === code);
    
    if (!exercise) {
      throw new NotFoundError(`Exercise '${code}' not found`);
    }
    
    // Get rule definitions
    const { getFormRuleDefinitions } = await import('../services/exercises');
    const rules = getFormRuleDefinitions(exercise.formRules);
    
    return c.json({
      data: {
        exerciseCode: code,
        rules,
      },
    });
  });
  
  return app;
}
