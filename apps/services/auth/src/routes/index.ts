/**
 * Routes index
 */

import { Hono } from 'hono';
import { cors } from '../middleware/request';
import oauth from './oauth';
import auth from './auth';
import register from './register';
import verification from './verification';
import sessions from './sessions';
import account from './account';
import admin from './admin';

export function createRoutes() {
  const app = new Hono();
  
  // CORS for all routes
  const allowedOrigins = [
    'http://localhost:3000',
    'https://aivo.app',
    // Add production origins
  ];
  
  app.use('*', cors(allowedOrigins));
  
  // Health check
  app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));
  
  // Mount routes
  app.route('/oauth', oauth);
  app.route('/auth', auth);
  app.route('/register', register);
  app.route('/verification', verification);
  app.route('/sessions', sessions);
  app.route('/account', account);
  app.route('/admin', admin);
  
  return app;
}

export { oauth, auth, register, verification, sessions, account, admin };
