/**
 * Coach Service - Sessions Routes
 * API endpoints for workout sessions
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { CoachContext } from '../env.d';
import { SessionService } from '../services/sessions';
import { NotFoundError, ForbiddenError, ValidationError } from '../middleware';

// Validation schemas
const startSessionSchema = z.object({
  planId: z.string().uuid().optional(),
  exercises: z.array(z.object({
    exerciseCode: z.string(),
    targetSets: z.number().int().positive().default(3),
    targetReps: z.number().int().positive().default(10),
  })),
  idempotencyKey: z.string().optional(),
});

const updateSessionSchema = z.object({
  status: z.enum(['in_progress', 'paused', 'completed', 'cancelled']).optional(),
  currentExerciseIndex: z.number().int().nonnegative().optional(),
  notes: z.string().max(1000).optional(),
});

const submitSetSchema = z.object({
  exerciseCode: z.string(),
  setNumber: z.number().int().positive(),
  status: z.enum(['completed', 'skipped', 'failed']),
  completedReps: z.number().int().nonnegative(),
  averageRangeOfMotion: z.number().min(0).max(1),
  averageQualityScore: z.number().min(0).max(100),
  averageTempoSeconds: z.number().positive(),
  durationMs: z.number().int().positive(),
  restDurationMs: z.number().int().nonnegative().optional(),
  correctionCounts: z.record(z.string(), z.number()).optional(),
  averageConfidence: z.number().min(0).max(1),
  repDetails: z.array(z.object({
    repNumber: z.number().int().positive(),
    rangeOfMotion: z.number().min(0).max(1),
    tempoSeconds: z.number().positive(),
    qualityScore: z.number().min(0).max(100),
    corrections: z.array(z.string()),
    durationMs: z.number().int().positive(),
    timestamp: z.number().int().positive(),
  })).optional(),
});

const completeSessionSchema = z.object({
  userRating: z.number().int().min(1).max(5).optional(),
  userNotes: z.string().max(500).optional(),
  totalDurationMs: z.number().int().positive(),
});

const submitCorrectionSchema = z.object({
  exerciseCode: z.string(),
  setNumber: z.number().int().positive().optional(),
  correctionCode: z.string(),
  severity: z.enum(['info', 'hint', 'warning', 'critical']),
  acknowledged: z.boolean().default(false),
});

/**
 * Create sessions routes
 */
export function sessionsRoutes(): Hono<CoachContext> {
  const app = new Hono<CoachContext>();
  const sessionService = new SessionService();
  
  // Get user's sessions
  app.get('/', async (c) => {
    const userId = c.get('userId');
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);
    const status = c.req.query('status');
    
    const sessions = await sessionService.getUserSessions(
      c.env.DB,
      userId,
      { limit, offset, status }
    );
    
    return c.json({
      data: {
        sessions,
        total: sessions.length,
        limit,
        offset,
      },
    });
  });
  
  // Get active session
  app.get('/active', async (c) => {
    const userId = c.get('userId');
    
    const session = await sessionService.getActiveSession(c.env.DB, userId);
    
    if (!session) {
      return c.json({
        data: { session: null },
      });
    }
    
    return c.json({
      data: { session },
    });
  });
  
  // Get specific session
  app.get('/:sessionId', async (c) => {
    const userId = c.get('userId');
    const sessionId = c.req.param('sessionId');
    
    const session = await sessionService.getSessionById(c.env.DB, sessionId);
    
    if (!session) {
      throw new NotFoundError('Session not found');
    }
    
    if (session.userId !== userId) {
      throw new ForbiddenError('Access denied to this session');
    }
    
    return c.json({
      data: { session },
    });
  });
  
  // Start new session
  app.post('/start', async (c) => {
    const userId = c.get('userId');
    const body = await c.req.json();
    
    // Validate input
    const result = startSessionSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError(
        result.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }
    
    // Check idempotency
    if (result.data.idempotencyKey) {
      const existing = await sessionService.getByIdempotencyKey(
        c.env.DB,
        result.data.idempotencyKey
      );
      if (existing) {
        return c.json({
          data: { session: existing, idempotent: true },
        });
      }
    }
    
    const session = await sessionService.startSession(c.env.DB, userId, result.data);
    
    return c.json({
      data: { session },
    }, 201);
  });
  
  // Update session checkpoint
  app.patch('/:sessionId/checkpoint', async (c) => {
    const userId = c.get('userId');
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json();
    
    // Validate input
    const result = updateSessionSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError(
        result.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }
    
    const session = await sessionService.updateSessionCheckpoint(
      c.env.DB,
      sessionId,
      userId,
      result.data
    );
    
    if (!session) {
      throw new NotFoundError('Session not found');
    }
    
    return c.json({
      data: { session },
    });
  });
  
  // Submit set summary
  app.post('/:sessionId/sets', async (c) => {
    const userId = c.get('userId');
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json();
    
    // Validate input
    const result = submitSetSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError(
        result.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }
    
    const set = await sessionService.submitSetSummary(
      c.env.DB,
      sessionId,
      userId,
      result.data
    );
    
    if (!set) {
      throw new NotFoundError('Session not found');
    }
    
    return c.json({
      data: { set },
    });
  });
  
  // Complete session
  app.post('/:sessionId/complete', async (c) => {
    const userId = c.get('userId');
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json();
    
    // Validate input
    const result = completeSessionSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError(
        result.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }
    
    const summary = await sessionService.completeSession(
      c.env.DB,
      c.env,
      sessionId,
      userId,
      result.data
    );
    
    if (!summary) {
      throw new NotFoundError('Session not found');
    }
    
    return c.json({
      data: { summary },
    });
  });
  
  // Cancel session
  app.post('/:sessionId/cancel', async (c) => {
    const userId = c.get('userId');
    const sessionId = c.req.param('sessionId');
    
    const session = await sessionService.cancelSession(c.env.DB, sessionId, userId);
    
    if (!session) {
      throw new NotFoundError('Session not found');
    }
    
    return c.json({
      data: { session },
    });
  });
  
  // Submit correction feedback
  app.post('/:sessionId/corrections', async (c) => {
    const userId = c.get('userId');
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json();
    
    // Validate input
    const result = submitCorrectionSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError(
        result.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }
    
    const correction = await sessionService.submitCorrection(
      c.env.DB,
      sessionId,
      userId,
      result.data
    );
    
    return c.json({
      data: { correction },
    }, 201);
  });
  
  return app;
}
