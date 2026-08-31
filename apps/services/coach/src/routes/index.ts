/**
 * Coach Service - Route Definitions
 */

import { Hono } from 'hono';
import type { CoachContext } from '../env.d';
import { authMiddleware } from '../middleware/auth';
import { exercisesRoutes } from './exercises';
import { plansRoutes } from './plans';
import { sessionsRoutes } from './sessions';
import { progressRoutes } from './progress';
import { planningRoutes } from './planning';

/**
 * Create all routes for the coach service
 */
export function createRoutes(): Hono<CoachContext> {
  const app = new Hono<CoachContext>();
  
  // Apply auth middleware to all routes (except health and swagger)
  app.use('*', authMiddleware());
  
  // Mount route groups
  app.route('/exercises', exercisesRoutes);
  app.route('/plans', plansRoutes);
  app.route('/sessions', sessionsRoutes);
  app.route('/progress', progressRoutes);
  app.route('/planning', planningRoutes);
  
  return app;
}
