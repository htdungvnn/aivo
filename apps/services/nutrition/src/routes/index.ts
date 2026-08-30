/**
 * Routes index for Nutrition Worker
 */

import { Hono } from 'hono';
import { cors } from '../middleware';
import { requireAuth } from '../middleware/auth';
import analysis from './analysis';
import meals from './meals';
import plans from './plans';
import targets from './targets';
import charts from './charts';
import foods from './foods';
import upload from './upload';

export function createRoutes() {
  const app = new Hono();
  
  // CORS for all routes
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3002',
    'https://aivo.app',
  ];
  
  app.use('*', cors(allowedOrigins));
  
  // Health check
  app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));
  
  // Protected routes
  const protectedRoutes = app.use('*', requireAuth());
  
  // Mount protected routes
  protectedRoutes.route('/analysis', analysis);
  protectedRoutes.route('/meals', meals);
  protectedRoutes.route('/plans', plans);
  protectedRoutes.route('/targets', targets);
  protectedRoutes.route('/charts', charts);
  protectedRoutes.route('/foods', foods);
  protectedRoutes.route('/upload', upload);
  
  return app;
}

export { analysis, meals, plans, targets, charts, foods, upload };
