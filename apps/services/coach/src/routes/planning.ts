/**
 * Coach Service - Planning Routes
 * API endpoints for AI planning
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { CoachContext } from '../env.d';
import { PlanningService } from '../services/planning';
import { NotFoundError, ValidationError } from '../middleware';

// Validation schemas
const requestPlanSchema = z.object({
  currentGoal: z.enum(['fat_loss', 'muscle_gain', 'general_fitness', 'mobility']),
  reason: z.enum([
    'initial_plan',
    'weekly_progression',
    'adherence_good',
    'adherence_poor',
    'user_goal_changed',
    'user_feedback',
    'recovery_needed',
    'plateau_detected',
  ]),
  availableExercises: z.array(z.string()).optional(),
  excludedExercises: z.array(z.string()).optional(),
  maxWorkoutsPerWeek: z.number().int().positive().max(7).optional(),
  maxSessionDurationMs: z.number().int().positive().optional(),
  userFeedback: z.string().max(500).optional(),
});

const adjustPlanSchema = z.object({
  planId: z.string().uuid(),
  reason: z.enum([
    'weekly_progression',
    'adherence_good',
    'adherence_poor',
    'user_feedback',
    'recovery_needed',
    'plateau_detected',
  ]),
  completedSessionId: z.string().uuid().optional(),
});

/**
 * Create planning routes
 */
export function planningRoutes(): Hono<CoachContext> {
  const app = new Hono<CoachContext>();
  
  // Check if AI planning is enabled
  app.use('*', async (c, next) => {
    if (c.env.PLANNING_ENABLED !== 'true') {
      return c.json({
        error: {
          code: 'PLANNING_DISABLED',
          message: 'AI planning is currently disabled',
        },
      }, 503);
    }
    await next();
  });
  
  // Request a new plan
  app.post('/request', async (c) => {
    const userId = c.get('userId');
    const body = await c.req.json();
    
    // Validate input
    const result = requestPlanSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError(
        result.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }
    
    const planningService = new PlanningService(c.env);
    const job = await planningService.requestPlan(userId, result.data);
    
    return c.json({
      data: { job },
    }, 202);
  });
  
  // Get planning job status
  app.get('/jobs/:jobId', async (c) => {
    const userId = c.get('userId');
    const jobId = c.req.param('jobId');
    
    const planningService = new PlanningService(c.env);
    const job = await planningService.getJobStatus(c.env.DB, jobId);
    
    if (!job) {
      throw new NotFoundError('Planning job not found');
    }
    
    if (job.userId !== userId) {
      return c.json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied to this job',
        },
      }, 403);
    }
    
    return c.json({
      data: { job },
    });
  });
  
  // Get user's planning jobs
  app.get('/jobs', async (c) => {
    const userId = c.get('userId');
    const limit = parseInt(c.req.query('limit') || '10', 10);
    
    const planningService = new PlanningService(c.env);
    const jobs = await planningService.getUserJobs(c.env.DB, userId, limit);
    
    return c.json({
      data: { jobs },
    });
  });
  
  // Request plan adjustment
  app.post('/adjust', async (c) => {
    const userId = c.get('userId');
    const body = await c.req.json();
    
    // Validate input
    const result = adjustPlanSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError(
        result.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }
    
    const planningService = new PlanningService(c.env);
    
    // Queue the adjustment job
    await c.env.PLANNING_QUEUE.send({
      schemaVersion: 1,
      messageId: crypto.randomUUID(),
      type: 'coach.plan_adjustment' as any,
      occurredAt: new Date().toISOString(),
      recipient: { email: '' },
      locale: 'en',
      data: {
        userId,
        planId: result.data.planId,
        reason: result.data.reason,
        completedSessionId: result.data.completedSessionId,
      },
    });
    
    return c.json({
      data: {
        message: 'Plan adjustment queued',
        planId: result.data.planId,
      },
    }, 202);
  });
  
  // Get adjustment reason explanations
  app.get('/reasons', async (c) => {
    const reasons = {
      initial_plan: {
        code: 'initial_plan',
        name: 'Initial Plan',
        description: 'Create a workout plan from scratch based on your goals',
      },
      weekly_progression: {
        code: 'weekly_progression',
        name: 'Weekly Progression',
        description: 'Progress your plan based on weekly performance',
      },
      adherence_good: {
        code: 'adherence_good',
        name: 'Good Adherence',
        description: 'You are following the plan well, time to increase intensity',
      },
      adherence_poor: {
        code: 'adherence_poor',
        name: 'Poor Adherence',
        description: 'Adjust the plan to be more achievable',
      },
      user_goal_changed: {
        code: 'user_goal_changed',
        name: 'Goal Changed',
        description: 'Update plan based on new fitness goals',
      },
      user_feedback: {
        code: 'user_feedback',
        name: 'User Feedback',
        description: 'Adjust based on your feedback',
      },
      recovery_needed: {
        code: 'recovery_needed',
        name: 'Recovery',
        description: 'Reduce intensity for recovery',
      },
      plateau_detected: {
        code: 'plateau_detected',
        name: 'Plateau Detected',
        description: 'Break through a performance plateau',
      },
    };
    
    return c.json({
      data: { reasons },
    });
  });
  
  return app;
}
