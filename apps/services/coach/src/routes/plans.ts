/**
 * Coach Service - Plans Routes
 * API endpoints for workout plans
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { CoachContext } from '../env.d';
import { PlanService } from '../services/plans';
import { NotFoundError, ForbiddenError, ValidationError } from '../middleware';

// Validation schemas
const createPlanSchema = z.object({
  name: z.string().min(1).max(100),
  goal: z.enum(['fat_loss', 'muscle_gain', 'general_fitness', 'mobility']),
  durationWeeks: z.number().int().positive().max(52).default(4),
  workoutDaysPerWeek: z.number().int().positive().max(7).default(4),
  workouts: z.array(z.object({
    dayNumber: z.number().int().positive(),
    name: z.string().optional(),
    exercises: z.array(z.object({
      exerciseCode: z.string(),
      order: z.number().int().nonnegative(),
      targetSets: z.number().int().positive().default(3),
      targetReps: z.number().int().positive().default(10),
      restBetweenSetsMs: z.number().int().positive().default(60000),
      restAfterExerciseMs: z.number().int().positive().default(90000),
      userLocked: z.boolean().default(false),
    })),
    isRestDay: z.boolean().default(false),
  })),
  description: z.string().max(500).optional(),
  startDate: z.string().optional(),
});

const updatePlanSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  workouts: z.array(z.object({
    dayNumber: z.number().int().positive(),
    name: z.string().optional(),
    exercises: z.array(z.object({
      exerciseCode: z.string(),
      order: z.number().int().nonnegative(),
      targetSets: z.number().int().positive().default(3),
      targetReps: z.number().int().positive().default(10),
      restBetweenSetsMs: z.number().int().positive().default(60000),
      restAfterExerciseMs: z.number().int().positive().default(90000),
      userLocked: z.boolean().default(false),
    })),
    isRestDay: z.boolean().default(false),
  })).optional(),
  description: z.string().max(500).optional(),
  startDate: z.string().optional(),
});

/**
 * Create plans routes
 */
export function plansRoutes(): Hono<CoachContext> {
  const app = new Hono<CoachContext>();
  const planService = new PlanService();
  
  // Get user's active plan
  app.get('/active', async (c) => {
    const userId = c.get('userId');
    
    const plan = await planService.getActivePlan(c.env.DB, userId);
    
    if (!plan) {
      return c.json({
        data: {
          plan: null,
          message: 'No active plan found',
        },
      });
    }
    
    return c.json({
      data: { plan },
    });
  });
  
  // Get all user's plans
  app.get('/', async (c) => {
    const userId = c.get('userId');
    const status = c.req.query('status');
    
    const plans = await planService.getUserPlans(c.env.DB, userId, status);
    
    return c.json({
      data: {
        plans,
        total: plans.length,
      },
    });
  });
  
  // Get specific plan
  app.get('/:planId', async (c) => {
    const userId = c.get('userId');
    const planId = c.req.param('planId');
    
    const plan = await planService.getPlanById(c.env.DB, planId);
    
    if (!plan) {
      throw new NotFoundError('Plan not found');
    }
    
    // Check ownership
    if (plan.userId !== userId) {
      throw new ForbiddenError('Access denied to this plan');
    }
    
    return c.json({
      data: { plan },
    });
  });
  
  // Create new plan
  app.post('/', async (c) => {
    const userId = c.get('userId');
    const body = await c.req.json();
    
    // Validate input
    const result = createPlanSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError(
        result.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }
    
    const plan = await planService.createPlan(c.env.DB, userId, result.data);
    
    return c.json({
      data: { plan },
    }, 201);
  });
  
  // Update plan
  app.put('/:planId', async (c) => {
    const userId = c.get('userId');
    const planId = c.req.param('planId');
    const body = await c.req.json();
    
    // Validate input
    const result = updatePlanSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError(
        result.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }
    
    const plan = await planService.updatePlan(c.env.DB, planId, userId, result.data);
    
    if (!plan) {
      throw new NotFoundError('Plan not found');
    }
    
    return c.json({
      data: { plan },
    });
  });
  
  // Activate plan
  app.post('/:planId/activate', async (c) => {
    const userId = c.get('userId');
    const planId = c.req.param('planId');
    
    const plan = await planService.activatePlan(c.env.DB, planId, userId);
    
    if (!plan) {
      throw new NotFoundError('Plan not found');
    }
    
    return c.json({
      data: { plan },
    });
  });
  
  // Archive plan
  app.post('/:planId/archive', async (c) => {
    const userId = c.get('userId');
    const planId = c.req.param('planId');
    
    const plan = await planService.archivePlan(c.env.DB, planId, userId);
    
    if (!plan) {
      throw new NotFoundError('Plan not found');
    }
    
    return c.json({
      data: { plan },
    });
  });
  
  // Delete plan
  app.delete('/:planId', async (c) => {
    const userId = c.get('userId');
    const planId = c.req.param('planId');
    
    const deleted = await planService.deletePlan(c.env.DB, planId, userId);
    
    if (!deleted) {
      throw new NotFoundError('Plan not found');
    }
    
    return c.json({
      data: { success: true },
    });
  });
  
  return app;
}
