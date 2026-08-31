/**
 * Health Service API Routes
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { HealthEnv } from '../types/env.js';
import { requireAuth, parseTimezone, parseDateParam, parseRangeParam } from '../middleware/index.js';
import { getHealthError, HEALTH_ERROR_CODES } from '../middleware/errors.js';
import * as db from '../db/index.js';
import {
  calculateReadiness,
  isValidReadinessOutput,
} from '../lib/readiness-engine.js';
import {
  generateDailyActions,
  toStoredAction,
  generateAdaptations,
} from '../lib/daily-actions.js';
import {
  generateChartData,
  generateReadinessChart,
  generateNutritionChart,
  generateSleepChart,
  generateActivityChart,
  generateHydrationChart,
  getChartDefinition,
  isRangeSupported,
  CHART_RANGES,
  getSupportedRanges,
} from '../lib/chart-aggregation.js';
import {
  HEALTH_ALGORITHM_VERSION,
  HEALTH_METRICS,
  CHART_RANGES,
  isFiniteNumber,
  roundTo,
  formatDate,
} from '@aivo/health-types';
import {
  ALL_CHARTS,
  getChartDefinition as getChartDef,
  getChartsByPlatform,
} from '@aivo/health-types';

// Context type
type Context = {
  Bindings: HealthEnv;
  Variables: {
    requestId: string;
    userId: string;
  };
};

// =============================================================================
// Zod Schemas
// =============================================================================

/**
 * Check-in request schema
 */
const CheckInRequestSchema = z.object({
  energy: z.number().min(1).max(10).optional(),
  stress: z.number().min(1).max(10).optional(),
  sleepQuality: z.number().min(1).max(10).optional(),
  muscleSoreness: z.number().min(0).max(10).optional(),
  notes: z.string().max(500).optional(),
});

/**
 * Action status update schema
 */
const ActionStatusUpdateSchema = z.object({
  status: z.enum(['completed', 'skipped']),
  skipReason: z.string().max(200).optional(),
});

/**
 * Adaptation action schema
 */
const AdaptationActionSchema = z.object({
  action: z.enum(['accept', 'reject', 'restore']),
});

/**
 * Chart request schema
 */
const ChartRequestSchema = z.object({
  metric: z.string(),
  range: z.enum(['1d', '7d', '30d', '90d', '1y']).optional().default('7d'),
  target: z.number().positive().optional(),
});

/**
 * Multiple charts request schema
 */
const MultipleChartsRequestSchema = z.object({
  metrics: z.array(z.string()),
  range: z.enum(['1d', '7d', '30d', '90d', '1y']).optional().default('7d'),
});

// =============================================================================
// Readiness Routes
// =============================================================================

/**
 * Get today's readiness
 */
async function getTodayReadiness(c: Context) {
  const userId = c.get('userId');
  const db = c.env.DB;
  const timezone = parseTimezone(c.req.raw);
  const today = formatDate(new Date());
  
  // Check for cached snapshot
  const snapshot = await db.getReadinessSnapshot(db, userId, today);
  
  if (snapshot) {
    return c.json({
      data: {
        date: snapshot.date,
        score: snapshot.score,
        level: snapshot.level,
        confidence: snapshot.confidence,
        dataCompleteness: snapshot.dataCompleteness,
        factors: JSON.parse(snapshot.factorsJson),
        recommendation: JSON.parse(snapshot.recommendationJson),
        algorithmVersion: snapshot.algorithmVersion,
        calculatedAt: snapshot.updatedAt,
        cached: true,
      },
    });
  }
  
  throw getHealthError(
    HEALTH_ERROR_CODES.READINESS_NOT_FOUND,
    'Readiness not calculated for today',
    404
  );
}

/**
 * Recalculate today's readiness
 */
async function recalculateReadiness(c: Context) {
  const userId = c.get('userId');
  const db = c.env.DB;
  const timezone = parseTimezone(c.req.raw);
  const today = formatDate(new Date());
  
  // Get data from other services (simplified - in production, call actual services)
  // For now, use defaults
  const readinessInput = {
    date: today,
    userId,
    timezone,
    dataCompleteness: 0.5,
    dataFreshness: 0,
  };
  
  // Calculate readiness
  const result = calculateReadiness(readinessInput);
  
  if (!isValidReadinessOutput(result)) {
    throw getHealthError(
      HEALTH_ERROR_CODES.READINESS_CALCULATION_FAILED,
      'Failed to calculate readiness'
    );
  }
  
  // Save snapshot
  await db.saveReadinessSnapshot(db, {
    id: crypto.randomUUID(),
    userId,
    date: today,
    timezone,
    score: result.score,
    level: result.level,
    confidence: result.confidence,
    dataCompleteness: result.dataCompleteness,
    factors: result.factors,
    recommendation: result.recommendation,
    inputSnapshot: result.inputSnapshot,
    sourceDataTimestamps: {},
    algorithmVersion: result.algorithmVersion,
    idempotencyKey: `${userId}:${today}`,
  });
  
  return c.json({
    data: {
      date: result.date,
      score: result.score,
      level: result.level,
      confidence: result.confidence,
      dataCompleteness: result.dataCompleteness,
      factors: result.factors,
      recommendation: result.recommendation,
      algorithmVersion: result.algorithmVersion,
      calculatedAt: result.calculatedAt,
      cached: false,
    },
  });
}

/**
 * Get readiness history
 */
async function getReadinessHistory(c: Context) {
  const userId = c.get('userId');
  const db = c.env.DB;
  
  const startDate = parseDateParam(c.req.query('startDate'), new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const endDate = parseDateParam(c.req.query('endDate'));
  
  const history = await db.getReadinessHistory(db, userId, startDate, endDate);
  
  return c.json({
    data: {
      startDate,
      endDate,
      history,
    },
  });
}

/**
 * Get readiness factor details
 */
async function getReadinessFactors(c: Context) {
  const userId = c.get('userId');
  const db = c.env.DB;
  const date = parseDateParam(c.req.query('date'));
  
  const snapshot = await db.getReadinessSnapshot(db, userId, date);
  
  if (!snapshot) {
    throw getHealthError(
      HEALTH_ERROR_CODES.READINESS_NOT_FOUND,
      'Readiness not found for date',
      404
    );
  }
  
  const factors = await db.getReadinessFactors(db, snapshot.id);
  
  return c.json({
    data: {
      date,
      snapshotId: snapshot.id,
      factors,
    },
  });
}

// =============================================================================
// Check-in Routes
// =============================================================================

/**
 * Submit daily check-in
 */
async function submitCheckIn(c: Context) {
  const userId = c.get('userId');
  const db = c.env.DB;
  const timezone = parseTimezone(c.req.raw);
  const today = formatDate(new Date());
  
  const body = await c.req.json();
  const parsed = CheckInRequestSchema.safeParse(body);
  
  if (!parsed.success) {
    throw getHealthError(
      HEALTH_ERROR_CODES.VALIDATION_ERROR,
      'Invalid check-in data',
      400,
      { errors: parsed.error.errors }
    );
  }
  
  const checkIn = {
    id: crypto.randomUUID(),
    userId,
    date: today,
    timezone,
    energy: parsed.data.energy,
    stress: parsed.data.stress,
    sleepQuality: parsed.data.sleepQuality,
    muscleSoreness: parsed.data.muscleSoreness,
    notes: parsed.data.notes,
    completed: true,
  };
  
  await db.saveCheckIn(db, checkIn);
  
  // Optionally recalculate readiness
  let readinessRecalculated = false;
  let newReadinessScore: number | undefined;
  
  try {
    const readinessInput = {
      date: today,
      userId,
      timezone,
      selfReported: parsed.data.energy || parsed.data.stress || parsed.data.muscleSoreness
        ? {
            energy: parsed.data.energy ? (parsed.data.energy - 1) * 11.11 : null,
            stress: parsed.data.stress ? 100 - (parsed.data.stress - 1) * 11.11 : null,
            muscleSoreness: parsed.data.muscleSoreness ?? null,
          }
        : undefined,
      dataCompleteness: 0.5,
      dataFreshness: 0,
    };
    
    const result = calculateReadiness(readinessInput);
    
    if (isValidReadinessOutput(result)) {
      await db.saveReadinessSnapshot(db, {
        id: crypto.randomUUID(),
        userId,
        date: today,
        timezone,
        score: result.score,
        level: result.level,
        confidence: result.confidence,
        dataCompleteness: result.dataCompleteness,
        factors: result.factors,
        recommendation: result.recommendation,
        inputSnapshot: result.inputSnapshot,
        sourceDataTimestamps: {},
        algorithmVersion: result.algorithmVersion,
        idempotencyKey: `${userId}:${today}`,
      });
      
      readinessRecalculated = true;
      newReadinessScore = result.score;
    }
  } catch {
    // Don't fail check-in if readiness calculation fails
  }
  
  return c.json({
    data: {
      checkIn: {
        id: checkIn.id,
        date: today,
        completed: true,
        completedAt: Date.now(),
      },
      readinessRecalculated,
      newReadinessScore,
    },
  });
}

// =============================================================================
// Actions Routes
// =============================================================================

/**
 * Get today's actions
 */
async function getTodayActions(c: Context) {
  const userId = c.get('userId');
  const db = c.env.DB;
  const today = formatDate(new Date());
  
  const actions = await db.getDailyActions(db, userId, today);
  
  return c.json({
    data: {
      date: today,
      actions,
    },
  });
}

/**
 * Update action status
 */
async function updateActionStatus(c: Context) {
  const userId = c.get('userId');
  const db = c.env.DB;
  
  const actionId = c.req.param('id');
  const body = await c.req.json();
  const parsed = ActionStatusUpdateSchema.safeParse(body);
  
  if (!parsed.success) {
    throw getHealthError(
      HEALTH_ERROR_CODES.VALIDATION_ERROR,
      'Invalid action status update',
      400
    );
  }
  
  const success = await db.updateActionStatus(
    db,
    actionId,
    userId,
    parsed.data.status,
    parsed.data.skipReason
  );
  
  if (!success) {
    throw getHealthError(
      HEALTH_ERROR_CODES.ACTION_NOT_FOUND,
      'Action not found or already processed',
      404
    );
  }
  
  return c.json({
    data: {
      actionId,
      status: parsed.data.status,
      updatedAt: Date.now(),
    },
  });
}

// =============================================================================
// Adaptation Routes
// =============================================================================

/**
 * Get today's plan adaptations
 */
async function getTodayAdaptations(c: Context) {
  const userId = c.get('userId');
  const db = c.env.DB;
  const today = formatDate(new Date());
  
  const adaptations = await db.getPlanAdaptations(db, userId, today);
  
  return c.json({
    data: {
      date: today,
      adaptations,
    },
  });
}

/**
 * Accept or reject plan adaptation
 */
async function processAdaptation(c: Context) {
  const userId = c.get('userId');
  const db = c.env.DB;
  
  const adaptationId = c.req.param('id');
  const body = await c.req.json();
  const parsed = AdaptationActionSchema.safeParse(body);
  
  if (!parsed.success) {
    throw getHealthError(
      HEALTH_ERROR_CODES.VALIDATION_ERROR,
      'Invalid adaptation action',
      400
    );
  }
  
  const success = await db.updateAdaptationStatus(
    db,
    adaptationId,
    userId,
    parsed.data.action
  );
  
  if (!success) {
    throw getHealthError(
      HEALTH_ERROR_CODES.ADAPTATION_NOT_FOUND,
      'Adaptation not found or already processed',
      404
    );
  }
  
  return c.json({
    data: {
      adaptationId,
      action: parsed.data.action,
      updatedAt: Date.now(),
    },
  });
}

// =============================================================================
// Chart Routes
// =============================================================================

/**
 * Get available chart definitions
 */
async function getChartDefinitions(c: Context) {
  const platform = c.req.query('platform') as 'web' | 'mobile' | undefined;
  
  let charts = ALL_CHARTS;
  if (platform === 'web' || platform === 'mobile') {
    charts = getChartsByPlatform(platform);
  }
  
  return c.json({
    data: {
      charts: charts.map(chart => ({
        metric: chart.config.metric,
        label: chart.config.label,
        unit: chart.config.unit,
        color: chart.config.color,
        target: chart.config.target,
        chartType: chart.config.chartType,
        category: chart.category,
        supportedRanges: chart.supportedRanges,
      })),
    },
  });
}

/**
 * Get chart data for metric
 */
async function getChartData(c: Context) {
  const userId = c.get('userId');
  const db = c.env.DB;
  
  const metric = c.req.param('metric');
  const range = parseRangeParam(c.req.query('range'));
  const target = c.req.query('target') ? parseFloat(c.req.query('target')!) : undefined;
  
  // Validate metric
  const chartDef = getChartDef(metric);
  if (!chartDef) {
    throw getHealthError(
      HEALTH_ERROR_CODES.INVALID_METRIC,
      `Unknown metric: ${metric}`,
      400
    );
  }
  
  // Validate range
  if (!isRangeSupported(metric, range)) {
    throw getHealthError(
      HEALTH_ERROR_CODES.INVALID_RANGE,
      `Range ${range} not supported for metric ${metric}`,
      400
    );
  }
  
  // Check cache
  const cached = await db.getCachedChartData(db, userId, metric, range);
  if (cached) {
    return c.json({
      data: {
        metric,
        range,
        unit: chartDef.config.unit,
        target: target ?? chartDef.config.target,
        points: cached.points,
        summary: cached.summary,
        cached: true,
        generatedAt: cached.generatedAt,
      },
    });
  }
  
  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  
  switch (range) {
    case '1d':
      startDate.setDate(startDate.getDate() - 1);
      break;
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
  }
  
  // Get data from database
  const data = await db.getHealthMetrics(
    db,
    userId,
    metric,
    formatDate(startDate),
    formatDate(endDate)
  );
  
  // Generate chart data
  const chartData = generateChartData(
    {
      metric,
      unit: chartDef.config.unit,
      target: target ?? chartDef.config.target,
      points: data.map(d => ({
        timestamp: new Date(d.date).getTime(),
        value: d.value,
        target: d.target,
      })),
    },
    range
  );
  
  // Cache the result (expires in 5 minutes)
  const now = Date.now();
  await db.saveChartSnapshot(db, {
    id: crypto.randomUUID(),
    userId,
    date: formatDate(endDate),
    metricCode: metric,
    rangeType: range,
    points: chartData.points,
    summary: chartData.summary as Record<string, number | null>,
    target: chartData.target ?? null,
    unit: chartData.unit,
    generatedAt: now,
    expiresAt: now + 5 * 60 * 1000,
  });
  
  return c.json({
    data: {
      metric: chartData.metric,
      range: chartData.range,
      unit: chartData.unit,
      target: chartData.target,
      points: chartData.points,
      summary: chartData.summary,
      cached: false,
      generatedAt: now,
    },
  });
}

/**
 * Get multiple charts at once
 */
async function getMultipleChartData(c: Context) {
  const userId = c.get('userId');
  const db = c.env.DB;
  
  const body = await c.req.json();
  const parsed = MultipleChartsRequestSchema.safeParse(body);
  
  if (!parsed.success) {
    throw getHealthError(
      HEALTH_ERROR_CODES.VALIDATION_ERROR,
      'Invalid chart request',
      400
    );
  }
  
  const charts: Record<string, unknown> = {};
  
  for (const metric of parsed.data.metrics) {
    try {
      const chartDef = getChartDef(metric);
      if (!chartDef) continue;
      
      const data = await db.getHealthMetrics(
        db,
        userId,
        metric,
        formatDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
        formatDate(new Date())
      );
      
      const chartData = generateChartData(
        {
          metric,
          unit: chartDef.config.unit,
          target: chartDef.config.target,
          points: data.map(d => ({
            timestamp: new Date(d.date).getTime(),
            value: d.value,
            target: d.target,
          })),
        },
        parsed.data.range
      );
      
      charts[metric] = chartData;
    } catch {
      // Skip failed charts
    }
  }
  
  return c.json({
    data: {
      charts,
      requestedMetrics: parsed.data.metrics,
      requestedRange: parsed.data.range,
      generatedAt: Date.now(),
    },
  });
}

// =============================================================================
// Daily Intelligence Routes
// =============================================================================

/**
 * Get today's Daily Intelligence
 */
async function getTodayIntelligence(c: Context) {
  const userId = c.get('userId');
  const db = c.env.DB;
  const timezone = parseTimezone(c.req.raw);
  const today = formatDate(new Date());
  
  // Get or calculate readiness
  let snapshot = await db.getReadinessSnapshot(db, userId, today);
  
  if (!snapshot) {
    // Calculate readiness
    const readinessInput = {
      date: today,
      userId,
      timezone,
      dataCompleteness: 0.5,
      dataFreshness: 0,
    };
    
    const result = calculateReadiness(readinessInput);
    
    if (isValidReadinessOutput(result)) {
      await db.saveReadinessSnapshot(db, {
        id: crypto.randomUUID(),
        userId,
        date: today,
        timezone,
        score: result.score,
        level: result.level,
        confidence: result.confidence,
        dataCompleteness: result.dataCompleteness,
        factors: result.factors,
        recommendation: result.recommendation,
        inputSnapshot: result.inputSnapshot,
        sourceDataTimestamps: {},
        algorithmVersion: result.algorithmVersion,
        idempotencyKey: `${userId}:${today}`,
      });
      
      snapshot = await db.getReadinessSnapshot(db, userId, today);
    }
  }
  
  if (!snapshot) {
    throw getHealthError(
      HEALTH_ERROR_CODES.INTELLIGENCE_GENERATION_FAILED,
      'Failed to generate daily intelligence'
    );
  }
  
  // Get or generate actions
  let actions = await db.getDailyActions(db, userId, today);
  
  if (actions.length === 0) {
    const factors = JSON.parse(snapshot.factorsJson);
    
    const generatedActions = generateDailyActions({
      readinessScore: snapshot.score,
      readinessLevel: snapshot.level as 'low' | 'moderate' | 'good' | 'high',
      recommendation: JSON.parse(snapshot.recommendationJson),
      factors,
      nutrition: {
        caloriesConsumed: 0,
        caloriesTarget: 2000,
        proteinG: 0,
        proteinTarget: 150,
        hydration: 0,
        hydrationTarget: 2000,
      },
      activity: {
        steps: 0,
        stepsTarget: 10000,
        activeMinutes: 0,
        activeMinutesTarget: 30,
      },
      recovery: {
        sleepHours: null,
        muscleSoreness: null,
      },
      hasCompletedCheckIn: false,
      timeOfDay: getTimeOfDay(),
    });
    
    const storedActions = generatedActions.map(a => toStoredAction(a, userId, today));
    await db.saveDailyActions(db, userId, today, storedActions);
    actions = await db.getDailyActions(db, userId, today);
  }
  
  // Get check-in status
  const checkIn = await db.getCheckIn(db, userId, today);
  
  return c.json({
    data: {
      date: today,
      timezone,
      readiness: {
        score: snapshot.score,
        level: snapshot.level,
        confidence: snapshot.confidence,
        factors: JSON.parse(snapshot.factorsJson),
        recommendation: JSON.parse(snapshot.recommendationJson),
      },
      actions,
      hasCompletedCheckIn: checkIn?.completed ?? false,
      calculatedAt: snapshot.updatedAt,
      algorithmVersion: snapshot.algorithmVersion,
    },
  });
}

/**
 * Get weekly intelligence summary
 */
async function getWeeklySummary(c: Context) {
  const userId = c.get('userId');
  const db = c.env.DB;
  const timezone = parseTimezone(c.req.raw);
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  
  const history = await db.getReadinessHistory(
    db,
    userId,
    formatDate(startDate),
    formatDate(endDate)
  );
  
  if (history.length === 0) {
    throw getHealthError(
      HEALTH_ERROR_CODES.NOT_FOUND,
      'No data available for weekly summary',
      404
    );
  }
  
  const scores = history.map(h => h.score);
  const avgReadiness = roundTo(scores.reduce((a, b) => a + b, 0) / scores.length, 0);
  
  // Calculate trends
  const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
  const secondHalf = scores.slice(Math.floor(scores.length / 2));
  
  const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0;
  const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0;
  
  const trend: 'improving' | 'stable' | 'declining' = 
    secondAvg - firstAvg > 5 ? 'improving' :
    firstAvg - secondAvg > 5 ? 'declining' : 'stable';
  
  const bestDay = history.reduce(
    (best, day) => (day.score > best.score ? day : best),
    history[0]
  );
  
  return c.json({
    data: {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      timezone,
      averages: {
        readiness: avgReadiness,
      },
      trends: {
        readiness: trend,
      },
      highlights: {
        bestDay: bestDay.date,
        bestReadiness: bestDay.score,
      },
      generatedAt: Date.now(),
    },
  });
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get time of day category
 */
function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// =============================================================================
// Create Routes
// =============================================================================

/**
 * Create all routes
 */
export function createRoutes() {
  const app = new Hono<Context>();
  
  // Health check (no auth)
  app.get('/health', (c) =>
    c.json({
      status: 'ok',
      timestamp: Date.now(),
      version: '1.0.0',
      service: 'health',
    })
  );
  
  // Readiness routes
  app.get('/readiness/today', requireAuth(), getTodayReadiness);
  app.post('/readiness/recalculate', requireAuth(), recalculateReadiness);
  app.get('/readiness/history', requireAuth(), getReadinessHistory);
  app.get('/readiness/factors', requireAuth(), getReadinessFactors);
  
  // Check-in routes
  app.post('/checkin', requireAuth(), submitCheckIn);
  
  // Actions routes
  app.get('/actions', requireAuth(), getTodayActions);
  app.patch('/actions/:id', requireAuth(), updateActionStatus);
  
  // Adaptation routes
  app.get('/adaptations', requireAuth(), getTodayAdaptations);
  app.post('/adaptations/:id', requireAuth(), processAdaptation);
  
  // Chart routes
  app.get('/charts', requireAuth(), getChartDefinitions);
  app.get('/charts/:metric', requireAuth(), getChartData);
  app.post('/charts/batch', requireAuth(), getMultipleChartData);
  
  // Daily Intelligence routes
  app.get('/intelligence', requireAuth(), getTodayIntelligence);
  app.get('/intelligence/weekly', requireAuth(), getWeeklySummary);
  
  return app;
}
