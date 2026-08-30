/**
 * Coach Service - Progress Routes
 * API endpoints for workout progress
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { CoachContext } from '../env.d';
import { ProgressService } from '../services/progress';
import { NotFoundError, ValidationError } from '../middleware';

// Validation schemas
const updateGoalsSchema = z.object({
  primaryGoal: z.enum(['fat_loss', 'muscle_gain', 'general_fitness', 'mobility']),
  secondaryGoals: z.array(z.enum(['fat_loss', 'muscle_gain', 'general_fitness', 'mobility'])).max(2).optional(),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  limitations: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
  preferredWorkoutDays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  preferredSessionDurationMs: z.number().int().positive().optional(),
  reminderEnabled: z.boolean().default(true),
  reminderTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
});

const exercisePreferenceSchema = z.object({
  exerciseCode: z.string(),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  excluded: z.boolean().default(false),
  exclusionReason: z.string().max(200).optional(),
  modifications: z.array(z.object({
    type: z.enum(['reps', 'sets', 'rest', 'tempo']),
    value: z.union([z.number(), z.string()]),
    reason: z.string(),
  })).optional(),
});

/**
 * Create progress routes
 */
export function progressRoutes(): Hono<CoachContext> {
  const app = new Hono<CoachContext>();
  const progressService = new ProgressService();
  
  // Get progress summary
  app.get('/summary', async (c) => {
    const userId = c.get('userId');
    const period = c.req.query('period') || 'week';
    
    let startDate: number;
    const now = Date.now();
    
    switch (period) {
      case 'day':
        startDate = now - 24 * 60 * 60 * 1000;
        break;
      case 'week':
        startDate = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case 'month':
        startDate = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case 'quarter':
        startDate = now - 90 * 24 * 60 * 60 * 1000;
        break;
      default:
        startDate = now - 7 * 24 * 60 * 60 * 1000;
    }
    
    const summary = await progressService.getProgressSummary(
      c.env.DB,
      userId,
      startDate,
      now
    );
    
    return c.json({
      data: { summary },
    });
  });
  
  // Get exercise-specific progress
  app.get('/exercises/:exerciseCode', async (c) => {
    const userId = c.get('userId');
    const exerciseCode = c.req.param('exerciseCode');
    const limit = parseInt(c.req.query('limit') || '10', 10);
    
    const progress = await progressService.getExerciseProgress(
      c.env.DB,
      userId,
      exerciseCode,
      limit
    );
    
    return c.json({
      data: { progress },
    });
  });
  
  // Get workout history
  app.get('/history', async (c) => {
    const userId = c.get('userId');
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);
    const exerciseCode = c.req.query('exercise');
    
    const history = await progressService.getWorkoutHistory(
      c.env.DB,
      userId,
      { limit, offset, exerciseCode }
    );
    
    return c.json({
      data: {
        history,
        total: history.length,
        limit,
        offset,
      },
    });
  });
  
  // Get trends
  app.get('/trends', async (c) => {
    const userId = c.get('userId');
    const metric = c.req.query('metric') || 'quality_score';
    const period = c.req.query('period') || 'week';
    
    const trends = await progressService.getTrends(
      c.env.DB,
      userId,
      metric,
      period
    );
    
    return c.json({
      data: { trends },
    });
  });
  
  // Get user's fitness goals
  app.get('/goals', async (c) => {
    const userId = c.get('userId');
    
    const goals = await progressService.getUserGoals(c.env.DB, userId);
    
    return c.json({
      data: { goals },
    });
  });
  
  // Update user's fitness goals
  app.put('/goals', async (c) => {
    const userId = c.get('userId');
    const body = await c.req.json();
    
    // Validate input
    const result = updateGoalsSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError(
        result.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }
    
    const goals = await progressService.updateUserGoals(c.env.DB, userId, result.data);
    
    return c.json({
      data: { goals },
    });
  });
  
  // Get exercise preferences
  app.get('/preferences/:exerciseCode', async (c) => {
    const userId = c.get('userId');
    const exerciseCode = c.req.param('exerciseCode');
    
    const preferences = await progressService.getExercisePreferences(
      c.env.DB,
      userId,
      exerciseCode
    );
    
    return c.json({
      data: { preferences },
    });
  });
  
  // Update exercise preferences
  app.put('/preferences/:exerciseCode', async (c) => {
    const userId = c.get('userId');
    const exerciseCode = c.req.param('exerciseCode');
    const body = await c.req.json();
    
    // Validate input
    const result = exercisePreferenceSchema.safeParse({
      ...body,
      exerciseCode,
    });
    if (!result.success) {
      throw new ValidationError(
        result.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }
    
    const preferences = await progressService.updateExercisePreferences(
      c.env.DB,
      userId,
      exerciseCode,
      result.data
    );
    
    return c.json({
      data: { preferences },
    });
  });
  
  return app;
}
