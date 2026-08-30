/**
 * Health Service - OpenAPI/Swagger Documentation
 */

import { createSpec, op, path, ref, stringSchema, objectSchema, arraySchema, numberSchema } from '@repo/swagger-utils/spec-builder';
import { mountSwaggerRoutes, healthResponseSchema } from '@repo/swagger-utils/swagger-handler';
import type { Hono } from 'hono';
import type { Env } from './types/env.js';

/**
 * Create OpenAPI specification for the Health service
 */
export function createHealthSwaggerSpec() {
  return createSpec('AIVO Health', '1.0.0')
    .title('AIVO Health & Daily Intelligence API')
    .description(`
      Daily intelligence, readiness calculation, and health tracking API for the AIVO platform.
      
      ## Features
      - Daily readiness scoring
      - Self-reported check-ins
      - AI-generated daily actions
      - Plan adaptations
      - Health chart data
      - Weekly summaries
      
      ## Authentication
      All endpoints (except health) require a valid JWT access token:
      \`Authorization: Bearer <access_token>\`
    `)
    .server('https://health.aivo.app', 'Production')
    .addTag('Health', 'Service health check')
    .addTag('Readiness', 'Readiness scoring and history')
    .addTag('CheckIn', 'Daily self-reported check-ins')
    .addTag('Actions', 'AI-generated daily actions')
    .addTag('Adaptations', 'Plan adaptations')
    .addTag('Charts', 'Health metric charts')
    .addTag('Intelligence', 'Daily intelligence and summaries')
    // Common schemas
    .addSchema('ReadinessLevel', {
      type: 'object',
      properties: {
        score: { type: 'number', minimum: 0, maximum: 100, description: 'Readiness score (0-100)' },
        level: { type: 'string', enum: ['low', 'moderate', 'good', 'high'], description: 'Readiness level' },
        confidence: { type: 'number', minimum: 0, maximum: 1, description: 'Confidence in the score' },
        dataCompleteness: { type: 'number', minimum: 0, maximum: 1, description: 'How much data was available' },
        factors: arraySchema(objectSchema({
          name: stringSchema(),
          impact: numberSchema('number'),
          value: numberSchema('number')
        })),
        recommendation: stringSchema(),
        algorithmVersion: stringSchema(),
        calculatedAt: { type: 'integer', description: 'Calculation timestamp' },
        cached: { type: 'boolean', description: 'Whether this is from cache' }
      }
    })
    .addSchema('CheckIn', {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Check-in ID' },
        date: { type: 'string', format: 'date', description: 'Date (YYYY-MM-DD)' },
        energy: { type: 'number', minimum: 1, maximum: 10, description: 'Energy level (1-10)' },
        stress: { type: 'number', minimum: 1, maximum: 10, description: 'Stress level (1-10)' },
        sleepQuality: { type: 'number', minimum: 1, maximum: 10, description: 'Sleep quality (1-10)' },
        muscleSoreness: { type: 'number', minimum: 0, maximum: 10, description: 'Muscle soreness (0-10)' },
        notes: { type: 'string', description: 'User notes' },
        completed: { type: 'boolean', description: 'Whether check-in was completed' },
        completedAt: { type: 'integer', description: 'Completion timestamp' }
      }
    })
    .addSchema('DailyAction', {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Action ID' },
        type: { type: 'string', enum: ['exercise', 'nutrition', 'recovery', 'mindfulness'] },
        title: { type: 'string', description: 'Action title' },
        description: { type: 'string', description: 'Action description' },
        priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        status: { type: 'string', enum: ['pending', 'completed', 'skipped'] },
        skipReason: { type: 'string', nullable: true, description: 'Reason for skipping' }
      }
    })
    .addSchema('PlanAdaptation', {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Adaptation ID' },
        date: { type: 'string', format: 'date', description: 'Date (YYYY-MM-DD)' },
        type: { type: 'string', enum: ['exercise_modification', 'intensity_adjustment', 'rest_day', 'nutrition_change'] },
        reason: stringSchema(),
        changes: objectSchema({
          field: stringSchema(),
          oldValue: stringSchema(),
          newValue: stringSchema()
        }),
        status: { type: 'string', enum: ['pending', 'accepted', 'rejected', 'restored'] }
      }
    })
    .addSchema('ChartPoint', {
      type: 'object',
      properties: {
        timestamp: { type: 'integer', description: 'Point timestamp' },
        value: { type: 'number', description: 'Metric value' },
        target: { type: 'number', nullable: true, description: 'Target value' }
      }
    })
    .addSchema('ChartData', {
      type: 'object',
      properties: {
        metric: stringSchema(),
        range: stringSchema(),
        unit: stringSchema(),
        target: numberSchema('number'),
        points: arraySchema(ref('ChartPoint')),
        summary: objectSchema({
          average: numberSchema('number'),
          min: numberSchema('number'),
          max: numberSchema('number'),
          trend: stringSchema()
        }),
        cached: { type: 'boolean' },
        generatedAt: { type: 'integer' }
      }
    })
    .addSchema('DailyIntelligence', {
      type: 'object',
      properties: {
        date: stringSchema(),
        timezone: stringSchema(),
        readiness: ref('ReadinessLevel'),
        actions: arraySchema(ref('DailyAction')),
        hasCompletedCheckIn: { type: 'boolean' },
        calculatedAt: { type: 'integer' },
        algorithmVersion: stringSchema()
      }
    })
    .addSchema('WeeklySummary', {
      type: 'object',
      properties: {
        startDate: stringSchema(),
        endDate: stringSchema(),
        timezone: stringSchema(),
        averages: objectSchema({
          readiness: numberSchema('number')
        }),
        trends: objectSchema({
          readiness: stringSchema()
        }),
        highlights: objectSchema({
          bestDay: stringSchema(),
          bestReadiness: numberSchema('number')
        }),
        generatedAt: { type: 'integer' }
      }
    })
    // Health endpoint
    .path('/health', path()
      .get(op()
        .summary('Health check')
        .description('Check if the health service is running')
        .tag('Health')
        .response('200', 'Service is healthy', healthResponseSchema('health'))
        .build())
      .build())
    // Readiness routes
    .path('/readiness/today', path()
      .get(op()
        .summary('Get today\'s readiness')
        .description('Get the readiness score calculated for today')
        .tag('Readiness')
        .auth()
        .response('200', 'Today\'s readiness', ref('ReadinessLevel'))
        .response('404', 'Readiness not yet calculated')
        .build())
      .build())
    .path('/readiness/recalculate', path()
      .post(op()
        .summary('Recalculate readiness')
        .description('Force recalculation of today\'s readiness score')
        .tag('Readiness')
        .auth()
        .response('200', 'Recalculated readiness', ref('ReadinessLevel'))
        .build())
      .build())
    .path('/readiness/history', path()
      .get(op()
        .summary('Get readiness history')
        .description('Get readiness scores for a date range')
        .tag('Readiness')
        .auth()
        .query('startDate', stringSchema(), false, 'Start date (YYYY-MM-DD)')
        .query('endDate', stringSchema(), false, 'End date (YYYY-MM-DD)')
        .response('200', 'Readiness history', objectSchema({
          startDate: stringSchema(),
          endDate: stringSchema(),
          history: arraySchema(ref('ReadinessLevel'))
        }))
        .build())
      .build())
    .path('/readiness/factors', path()
      .get(op()
        .summary('Get readiness factors')
        .description('Get the factors that contributed to today\'s readiness score')
        .tag('Readiness')
        .auth()
        .query('date', stringSchema(), false, 'Date (YYYY-MM-DD)')
        .response('200', 'Readiness factors')
        .response('404', 'Readiness not found for date')
        .build())
      .build())
    // Check-in routes
    .path('/checkin', path()
      .post(op()
        .summary('Submit check-in')
        .description('Submit a daily self-reported check-in')
        .tag('CheckIn')
        .auth()
        .body(objectSchema({
          energy: numberSchema('integer'),
          stress: numberSchema('integer'),
          sleepQuality: numberSchema('integer'),
          muscleSoreness: numberSchema('integer'),
          notes: stringSchema()
        }), false)
        .response('200', 'Check-in submitted', objectSchema({
          checkIn: ref('CheckIn'),
          readinessRecalculated: { type: 'boolean' },
          newReadinessScore: numberSchema('number')
        }))
        .build())
      .build())
    // Actions routes
    .path('/actions', path()
      .get(op()
        .summary('Get today\'s actions')
        .description('Get AI-generated actions for today')
        .tag('Actions')
        .auth()
        .response('200', 'Today\'s actions', objectSchema({
          date: stringSchema(),
          actions: arraySchema(ref('DailyAction'))
        }))
        .build())
      .build())
    .path('/actions/{id}', path()
      .patch(op()
        .summary('Update action status')
        .description('Mark an action as completed or skipped')
        .tag('Actions')
        .auth()
        .path('id', stringSchema(), true, 'Action ID')
        .body(objectSchema({
          status: stringSchema(),
          skipReason: stringSchema()
        }), true)
        .response('200', 'Action updated')
        .response('404', 'Action not found')
        .build())
      .build())
    // Adaptations routes
    .path('/adaptations', path()
      .get(op()
        .summary('Get today\'s adaptations')
        .description('Get plan adaptations suggested for today')
        .tag('Adaptations')
        .auth()
        .response('200', 'Today\'s adaptations', objectSchema({
          date: stringSchema(),
          adaptations: arraySchema(ref('PlanAdaptation'))
        }))
        .build())
      .build())
    .path('/adaptations/{id}', path()
      .post(op()
        .summary('Process adaptation')
        .description('Accept or reject a plan adaptation')
        .tag('Adaptations')
        .auth()
        .path('id', stringSchema(), true, 'Adaptation ID')
        .body(objectSchema({
          action: stringSchema()
        }), true)
        .response('200', 'Adaptation processed')
        .response('404', 'Adaptation not found')
        .build())
      .build())
    // Charts routes
    .path('/charts', path()
      .get(op()
        .summary('Get available charts')
        .description('Get list of available chart definitions')
        .tag('Charts')
        .auth()
        .query('platform', stringSchema(), false, 'Platform (web or mobile)')
        .response('200', 'Available charts')
        .build())
      .build())
    .path('/charts/{metric}', path()
      .get(op()
        .summary('Get chart data')
        .description('Get chart data for a specific metric')
        .tag('Charts')
        .auth()
        .path('metric', stringSchema(), true, 'Metric code')
        .query('range', stringSchema(), false, 'Time range (1d, 7d, 30d, 90d, 1y)')
        .query('target', numberSchema('number'), false, 'Target value')
        .response('200', 'Chart data', ref('ChartData'))
        .response('400', 'Invalid metric or range')
        .build())
      .build())
    .path('/charts/batch', path()
      .post(op()
        .summary('Get multiple charts')
        .description('Get chart data for multiple metrics at once')
        .tag('Charts')
        .auth()
        .body(objectSchema({
          metrics: arraySchema(stringSchema()),
          range: stringSchema()
        }), true)
        .response('200', 'Batch chart data')
        .build())
      .build())
    // Intelligence routes
    .path('/intelligence', path()
      .get(op()
        .summary('Get today\'s intelligence')
        .description('Get the complete daily intelligence for today')
        .tag('Intelligence')
        .auth()
        .response('200', 'Daily intelligence', ref('DailyIntelligence'))
        .build())
      .build())
    .path('/intelligence/weekly', path()
      .get(op()
        .summary('Get weekly summary')
        .description('Get a summary of the past week\'s health data')
        .tag('Intelligence')
        .auth()
        .response('200', 'Weekly summary', ref('WeeklySummary'))
        .response('404', 'Not enough data for summary')
        .build())
      .build())
    .build();
}

/**
 * Mount Swagger routes on the health app
 */
export function mountHealthSwagger(app: Hono) {
  const spec = createHealthSwaggerSpec();
  mountSwaggerRoutes(app, spec, {
    title: 'AIVO Health API',
    path: '/api/v1'
  });
}
