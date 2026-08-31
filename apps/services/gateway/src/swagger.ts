/**
 * Unified OpenAPI/Swagger Documentation for AIVO API Gateway
 * 
 * This file aggregates documentation from all AIVO microservices:
 * - Auth Service: Authentication, registration, OAuth, sessions
 * - Health Service: Daily readiness, check-ins, actions, charts
 * - Coach Service: Workout plans, sessions, exercises, progress
 * - Nutrition Service: Meals, foods, targets, analysis
 */

import { createSpec, op, path, ref, stringSchema, objectSchema, arraySchema, numberSchema } from '@repo/swagger-utils';
import { mountSwaggerRoutes } from '@repo/swagger-utils';
import type { Hono } from 'hono';
import type { GatewayEnv } from './env';

/**
 * Create the unified OpenAPI specification for all AIVO services
 */
export function createUnifiedSwaggerSpec() {
  return createSpec('AIVO Platform', '1.0.0')
    .title('AIVO Health & Fitness Platform API')
    .description(`
      Comprehensive API documentation for the AIVO AI-powered health, fitness, and nutrition coaching platform.
      
      ## Architecture
      
      This gateway provides a unified entry point to all AIVO microservices:
      
      | Service | Path | Description |
      |---------|------|-------------|
      | Auth | /api/v1/auth | Authentication, registration, OAuth |
      | Health | /api/v1/health | Readiness, check-ins, daily actions |
      | Coach | /api/v1/coach | Workout plans, sessions, progress |
      | Nutrition | /api/v1/nutrition | Meals, foods, nutrition tracking |
      
      ## Authentication
      
      Most endpoints require a valid JWT access token in the Authorization header:
      \`Authorization: Bearer <access_token>\`
      
      ## Rate Limiting
      
      The gateway enforces rate limiting:
      - Default: 100 requests per minute per IP
      - Headers: \`X-RateLimit-Limit\`, \`X-RateLimit-Remaining\`, \`X-RateLimit-Reset\`
    `)
    .server('https://api.aivo.app', 'Production')
    .server('http://localhost:3000', 'Local Development')
    .addTag('Gateway', 'API Gateway endpoints')
    .addTag('Auth', 'Authentication, registration, OAuth, sessions')
    .addTag('Health', 'Readiness scoring, check-ins, daily actions')
    .addTag('Coach', 'Workout plans, sessions, exercises, progress')
    .addTag('Nutrition', 'Meal logging, food search, nutrition targets')
    
    // =========================================================================
    // Common Schemas
    // =========================================================================
    
    // User schema
    .addSchema('User', {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', description: 'User unique identifier' },
        email: { type: 'string', format: 'email', description: 'User email address' },
        displayName: { type: 'string', description: 'User display name' },
        avatarUrl: { type: 'string', format: 'uri', description: 'User avatar URL' },
        status: { type: 'string', enum: ['pending_verification', 'active', 'suspended', 'deleted'] },
        emailVerifiedAt: { type: 'integer', description: 'Email verification timestamp' },
        createdAt: { type: 'integer', description: 'Account creation timestamp' }
      }
    })
    
    // Token schema
    .addSchema('TokenPair', {
      type: 'object',
      properties: {
        accessToken: { type: 'string', description: 'JWT access token' },
        refreshToken: { type: 'string', description: 'Refresh token' },
        expiresIn: { type: 'integer', description: 'Access token expiry in seconds' },
        tokenType: { type: 'string', example: 'Bearer' }
      },
      required: ['accessToken', 'expiresIn', 'tokenType']
    })
    
    // Session schema
    .addSchema('Session', {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Session ID' },
        clientType: { type: 'string', enum: ['web', 'mobile', 'api'] },
        deviceName: { type: 'string', description: 'Device name' },
        platform: { type: 'string', description: 'Platform (iOS, Android, etc.)' },
        createdAt: { type: 'integer', description: 'Session creation timestamp' },
        lastActiveAt: { type: 'integer', description: 'Last activity timestamp' },
        expiresAt: { type: 'integer', description: 'Session expiry timestamp' },
        isCurrent: { type: 'boolean', description: 'Is this the current session' }
      }
    })
    
    // Readiness schema
    .addSchema('ReadinessLevel', {
      type: 'object',
      properties: {
        score: { type: 'number', minimum: 0, maximum: 100 },
        level: { type: 'string', enum: ['low', 'moderate', 'good', 'high'] },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        dataCompleteness: { type: 'number', minimum: 0, maximum: 1 },
        factors: arraySchema(objectSchema({
          name: stringSchema(),
          impact: numberSchema('number'),
          value: numberSchema('number')
        })),
        recommendation: stringSchema(),
        calculatedAt: { type: 'integer' }
      }
    })
    
    // CheckIn schema
    .addSchema('CheckIn', {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Check-in ID' },
        date: { type: 'string', format: 'date' },
        energy: { type: 'number', minimum: 1, maximum: 10 },
        stress: { type: 'number', minimum: 1, maximum: 10 },
        sleepQuality: { type: 'number', minimum: 1, maximum: 10 },
        muscleSoreness: { type: 'number', minimum: 0, maximum: 10 },
        notes: stringSchema(),
        completed: { type: 'boolean' },
        completedAt: { type: 'integer' }
      }
    })
    
    // Nutrition Info schema
    .addSchema('NutritionInfo', {
      type: 'object',
      properties: {
        caloriesKcal: { type: 'number', description: 'Calories in kcal' },
        proteinG: { type: 'number', description: 'Protein in grams' },
        carbsG: { type: 'number', description: 'Carbohydrates in grams' },
        fatG: { type: 'number', description: 'Fat in grams' },
        fiberG: { type: 'number', description: 'Fiber in grams' }
      }
    })
    
    // Meal schema
    .addSchema('Meal', {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Meal ID' },
        userId: { type: 'string', description: 'User ID' },
        date: { type: 'string', format: 'date' },
        mealType: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
        name: stringSchema(),
        totalNutrition: ref('NutritionInfo'),
        createdAt: { type: 'integer' }
      }
    })
    
    // Workout Plan schema
    .addSchema('WorkoutPlan', {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        userId: { type: 'string' },
        name: stringSchema(),
        description: stringSchema(),
        goal: { type: 'string', enum: ['fat_loss', 'muscle_gain', 'general_fitness', 'mobility'] },
        durationWeeks: { type: 'integer' },
        status: { type: 'string', enum: ['draft', 'active', 'completed', 'archived'] },
        startDate: stringSchema()
      }
    })
    
    // Workout Session schema
    .addSchema('WorkoutSession', {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        userId: { type: 'string' },
        planId: { type: 'string', format: 'uuid', nullable: true },
        status: { type: 'string', enum: ['planned', 'in_progress', 'paused', 'completed', 'cancelled'] },
        startedAt: { type: 'integer', nullable: true },
        completedAt: { type: 'integer', nullable: true }
      }
    })

    // =========================================================================
    // Gateway Endpoints
    // =========================================================================
    
    .path('/health', path()
      .get(op()
        .summary('Gateway health check')
        .description('Check gateway status and all service health')
        .tag('Gateway')
        .response('200', 'Gateway is healthy', {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'healthy' },
            version: { type: 'string', example: '1.0.0' },
            timestamp: { type: 'integer' },
            services: {
              type: 'object',
              properties: {
                auth: { properties: { status: { type: 'string' }, latency: { type: 'number' } } },
                health: { properties: { status: { type: 'string' }, latency: { type: 'number' } } },
                coach: { properties: { status: { type: 'string' }, latency: { type: 'number' } } },
                nutrition: { properties: { status: { type: 'string' }, latency: { type: 'number' } } },
                mail: { properties: { status: { type: 'string' }, latency: { type: 'number' } } }
              }
            }
          }
        })
        .build())
      .build())
    
    .path('/metrics', path()
      .get(op()
        .summary('Gateway metrics')
        .description('Get gateway metrics and statistics')
        .tag('Gateway')
        .response('200', 'Metrics data')
        .build())
      .build())

    // =========================================================================
    // Auth Service Endpoints
    // =========================================================================
    
    .path('/api/v1/auth/me', path()
      .get(op()
        .summary('Get current user')
        .description('Get the currently authenticated user information')
        .tag('Auth')
        .auth()
        .response('200', 'User information', objectSchema({
          user: ref('User'),
          roles: arraySchema(stringSchema()),
          session: ref('Session')
        }))
        .response('401', 'Unauthorized')
        .build())
      .build())
    
    .path('/api/v1/auth/refresh', path()
      .post(op()
        .summary('Refresh access token')
        .description('Exchange a refresh token for a new access token')
        .tag('Auth')
        .response('200', 'New token pair', ref('TokenPair'))
        .response('401', 'Invalid refresh token')
        .build())
      .build())
    
    .path('/api/v1/auth/logout', path()
      .post(op()
        .summary('Logout')
        .description('Logout the current session')
        .tag('Auth')
        .auth()
        .response('200', 'Logged out successfully')
        .response('401', 'Unauthorized')
        .build())
      .build())
    
    .path('/api/v1/auth/logout-all', path()
      .post(op()
        .summary('Logout all sessions')
        .description('Logout from all sessions except current')
        .tag('Auth')
        .auth()
        .response('200', 'All sessions logged out')
        .response('401', 'Unauthorized')
        .build())
      .build())
    
    .path('/api/v1/register', path()
      .post(op()
        .summary('Register new user')
        .description('Create a new user account')
        .tag('Auth')
        .body(objectSchema({
          email: stringSchema('email'),
          password: stringSchema(),
          displayName: stringSchema()
        }), true)
        .response('201', 'Account created')
        .response('400', 'Validation error')
        .response('429', 'Too many requests')
        .build())
      .build())
    
    .path('/api/v1/sessions', path()
      .get(op()
        .summary('List sessions')
        .description('Get all active sessions for the current user')
        .tag('Auth')
        .auth()
        .response('200', 'Session list', objectSchema({
          sessions: arraySchema(ref('Session'))
        }))
        .build())
      .delete(op()
        .summary('Revoke all sessions')
        .description('Revoke all sessions except the current one')
        .tag('Auth')
        .auth()
        .response('200', 'Sessions revoked')
        .build())
      .build())
    
    .path('/api/v1/sessions/{sessionId}', path()
      .delete(op()
        .summary('Revoke session')
        .description('Revoke a specific session by ID')
        .tag('Auth')
        .auth()
        .path('sessionId', stringSchema(), true, 'Session ID')
        .response('200', 'Session revoked')
        .response('404', 'Session not found')
        .build())
      .build())
    
    .path('/api/v1/auth/oauth/google', path()
      .get(op()
        .summary('Google OAuth login')
        .description('Initiate Google OAuth flow')
        .tag('Auth')
        .response('302', 'Redirect to Google')
        .build())
      .build())
    
    .path('/api/v1/auth/oauth/google/callback', path()
      .get(op()
        .summary('Google OAuth callback')
        .description('Handle Google OAuth callback')
        .tag('Auth')
        .response('200', 'OAuth successful', ref('TokenPair'))
        .response('400', 'OAuth failed')
        .build())
      .build())

    // =========================================================================
    // Health Service Endpoints
    // =========================================================================
    
    .path('/api/v1/health/readiness/today', path()
      .get(op()
        .summary('Get today\'s readiness')
        .description('Get the readiness score calculated for today')
        .tag('Health')
        .auth()
        .response('200', 'Today\'s readiness', ref('ReadinessLevel'))
        .response('404', 'Readiness not yet calculated')
        .build())
      .build())
    
    .path('/api/v1/health/readiness/recalculate', path()
      .post(op()
        .summary('Recalculate readiness')
        .description('Force recalculation of today\'s readiness score')
        .tag('Health')
        .auth()
        .response('200', 'Recalculated readiness', ref('ReadinessLevel'))
        .build())
      .build())
    
    .path('/api/v1/health/readiness/history', path()
      .get(op()
        .summary('Get readiness history')
        .description('Get readiness scores for a date range')
        .tag('Health')
        .auth()
        .query('startDate', stringSchema(), false, 'Start date (YYYY-MM-DD)')
        .query('endDate', stringSchema(), false, 'End date (YYYY-MM-DD)')
        .response('200', 'Readiness history')
        .build())
      .build())
    
    .path('/api/v1/health/readiness/factors', path()
      .get(op()
        .summary('Get readiness factors')
        .description('Get the factors that contributed to today\'s readiness score')
        .tag('Health')
        .auth()
        .query('date', stringSchema(), false, 'Date (YYYY-MM-DD)')
        .response('200', 'Readiness factors')
        .build())
      .build())
    
    .path('/api/v1/health/checkin', path()
      .post(op()
        .summary('Submit check-in')
        .description('Submit a daily self-reported check-in')
        .tag('Health')
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
    
    .path('/api/v1/health/actions', path()
      .get(op()
        .summary('Get today\'s actions')
        .description('Get AI-generated actions for today')
        .tag('Health')
        .auth()
        .response('200', 'Today\'s actions')
        .build())
      .build())
    
    .path('/api/v1/health/actions/{id}', path()
      .patch(op()
        .summary('Update action status')
        .description('Mark an action as completed or skipped')
        .tag('Health')
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
    
    .path('/api/v1/health/adaptations', path()
      .get(op()
        .summary('Get today\'s adaptations')
        .description('Get plan adaptations suggested for today')
        .tag('Health')
        .auth()
        .response('200', 'Today\'s adaptations')
        .build())
      .build())
    
    .path('/api/v1/health/adaptations/{id}', path()
      .post(op()
        .summary('Process adaptation')
        .description('Accept or reject a plan adaptation')
        .tag('Health')
        .auth()
        .path('id', stringSchema(), true, 'Adaptation ID')
        .body(objectSchema({ action: stringSchema() }), true)
        .response('200', 'Adaptation processed')
        .response('404', 'Adaptation not found')
        .build())
      .build())
    
    .path('/api/v1/health/charts', path()
      .get(op()
        .summary('Get available charts')
        .description('Get list of available chart definitions')
        .tag('Health')
        .auth()
        .query('platform', stringSchema(), false, 'Platform (web or mobile)')
        .response('200', 'Available charts')
        .build())
      .build())
    
    .path('/api/v1/health/charts/{metric}', path()
      .get(op()
        .summary('Get chart data')
        .description('Get chart data for a specific metric')
        .tag('Health')
        .auth()
        .path('metric', stringSchema(), true, 'Metric code')
        .query('range', stringSchema(), false, 'Time range (1d, 7d, 30d, 90d, 1y)')
        .query('target', numberSchema('number'), false, 'Target value')
        .response('200', 'Chart data')
        .response('400', 'Invalid metric or range')
        .build())
      .build())
    
    .path('/api/v1/health/charts/batch', path()
      .post(op()
        .summary('Get multiple charts')
        .description('Get chart data for multiple metrics at once')
        .tag('Health')
        .auth()
        .body(objectSchema({
          metrics: arraySchema(stringSchema()),
          range: stringSchema()
        }), true)
        .response('200', 'Batch chart data')
        .build())
      .build())
    
    .path('/api/v1/health/intelligence', path()
      .get(op()
        .summary('Get daily intelligence')
        .description('Get the complete daily intelligence for today')
        .tag('Health')
        .auth()
        .response('200', 'Daily intelligence')
        .build())
      .build())
    
    .path('/api/v1/health/intelligence/weekly', path()
      .get(op()
        .summary('Get weekly summary')
        .description('Get a summary of the past week\'s health data')
        .tag('Health')
        .auth()
        .response('200', 'Weekly summary')
        .response('404', 'Not enough data for summary')
        .build())
      .build())

    // =========================================================================
    // Coach Service Endpoints
    // =========================================================================
    
    .path('/api/v1/coach/exercises', path()
      .get(op()
        .summary('Get all exercises')
        .description('Get list of all supported exercises')
        .tag('Coach')
        .auth()
        .response('200', 'Exercise list')
        .build())
      .build())
    
    .path('/api/v1/coach/exercises/{code}', path()
      .get(op()
        .summary('Get exercise details')
        .description('Get detailed information about a specific exercise')
        .tag('Coach')
        .auth()
        .path('code', stringSchema(), true, 'Exercise code')
        .response('200', 'Exercise details')
        .response('404', 'Exercise not found')
        .build())
      .build())
    
    .path('/api/v1/coach/exercises/{code}/rules', path()
      .get(op()
        .summary('Get form rules')
        .description('Get form analysis rules for an exercise')
        .tag('Coach')
        .auth()
        .path('code', stringSchema(), true, 'Exercise code')
        .response('200', 'Form rules')
        .response('404', 'Exercise not found')
        .build())
      .build())
    
    .path('/api/v1/coach/plans', path()
      .get(op()
        .summary('Get user plans')
        .description('Get all workout plans for the current user')
        .tag('Coach')
        .auth()
        .query('status', stringSchema(), false, 'Filter by status')
        .response('200', 'Plan list')
        .build())
      .post(op()
        .summary('Create plan')
        .description('Create a new workout plan')
        .tag('Coach')
        .auth()
        .body(ref('WorkoutPlan'), true)
        .response('201', 'Plan created', ref('WorkoutPlan'))
        .build())
      .build())
    
    .path('/api/v1/coach/plans/active', path()
      .get(op()
        .summary('Get active plan')
        .description('Get the user\'s currently active workout plan')
        .tag('Coach')
        .auth()
        .response('200', 'Active plan', objectSchema({
          plan: ref('WorkoutPlan'),
          message: stringSchema()
        }))
        .build())
      .build())
    
    .path('/api/v1/coach/plans/{planId}', path()
      .get(op()
        .summary('Get plan details')
        .tag('Coach')
        .auth()
        .path('planId', stringSchema(), true, 'Plan ID')
        .response('200', 'Plan details', ref('WorkoutPlan'))
        .response('404', 'Plan not found')
        .build())
      .put(op()
        .summary('Update plan')
        .tag('Coach')
        .auth()
        .path('planId', stringSchema(), true, 'Plan ID')
        .body(ref('WorkoutPlan'), true)
        .response('200', 'Plan updated', ref('WorkoutPlan'))
        .build())
      .delete(op()
        .summary('Delete plan')
        .tag('Coach')
        .auth()
        .path('planId', stringSchema(), true, 'Plan ID')
        .response('200', 'Plan deleted')
        .response('404', 'Plan not found')
        .build())
      .build())
    
    .path('/api/v1/coach/plans/{planId}/activate', path()
      .post(op()
        .summary('Activate plan')
        .description('Set a plan as the active workout plan')
        .tag('Coach')
        .auth()
        .path('planId', stringSchema(), true, 'Plan ID')
        .response('200', 'Plan activated', ref('WorkoutPlan'))
        .response('404', 'Plan not found')
        .build())
      .build())
    
    .path('/api/v1/coach/sessions', path()
      .get(op()
        .summary('Get user sessions')
        .description('Get workout session history')
        .tag('Coach')
        .auth()
        .query('limit', numberSchema('integer'), false, 'Results limit')
        .query('offset', numberSchema('integer'), false, 'Results offset')
        .query('status', stringSchema(), false, 'Filter by status')
        .response('200', 'Session list')
        .build())
      .build())
    
    .path('/api/v1/coach/sessions/active', path()
      .get(op()
        .summary('Get active session')
        .description('Get the user\'s currently active workout session')
        .tag('Coach')
        .auth()
        .response('200', 'Active session')
        .build())
      .build())
    
    .path('/api/v1/coach/sessions/start', path()
      .post(op()
        .summary('Start session')
        .description('Start a new workout session')
        .tag('Coach')
        .auth()
        .body(objectSchema({
          planId: stringSchema(),
          exercises: arraySchema(objectSchema({
            exerciseCode: stringSchema(),
            targetSets: numberSchema('integer'),
            targetReps: numberSchema('integer')
          })),
          idempotencyKey: stringSchema()
        }), false)
        .response('201', 'Session started', ref('WorkoutSession'))
        .build())
      .build())
    
    .path('/api/v1/coach/sessions/{sessionId}', path()
      .get(op()
        .summary('Get session details')
        .tag('Coach')
        .auth()
        .path('sessionId', stringSchema(), true, 'Session ID')
        .response('200', 'Session details', ref('WorkoutSession'))
        .response('404', 'Session not found')
        .build())
      .build())
    
    .path('/api/v1/coach/sessions/{sessionId}/checkpoint', path()
      .patch(op()
        .summary('Update checkpoint')
        .description('Update session checkpoint')
        .tag('Coach')
        .auth()
        .path('sessionId', stringSchema(), true, 'Session ID')
        .body(objectSchema({
          status: stringSchema(),
          currentExerciseIndex: numberSchema('integer'),
          notes: stringSchema()
        }), false)
        .response('200', 'Checkpoint updated')
        .build())
      .build())
    
    .path('/api/v1/coach/sessions/{sessionId}/sets', path()
      .post(op()
        .summary('Submit set')
        .description('Submit completed set data')
        .tag('Coach')
        .auth()
        .path('sessionId', stringSchema(), true, 'Session ID')
        .body(objectSchema({
          exerciseCode: stringSchema(),
          setNumber: numberSchema('integer'),
          completedReps: numberSchema('integer'),
          averageRangeOfMotion: numberSchema('number'),
          averageQualityScore: numberSchema('number')
        }), true)
        .response('201', 'Set submitted')
        .build())
      .build())
    
    .path('/api/v1/coach/sessions/{sessionId}/complete', path()
      .post(op()
        .summary('Complete session')
        .description('Mark a session as completed')
        .tag('Coach')
        .auth()
        .path('sessionId', stringSchema(), true, 'Session ID')
        .body(objectSchema({
          userRating: numberSchema('integer'),
          userNotes: stringSchema(),
          totalDurationMs: numberSchema('integer')
        }), true)
        .response('200', 'Session completed')
        .build())
      .build())
    
    .path('/api/v1/coach/sessions/{sessionId}/cancel', path()
      .post(op()
        .summary('Cancel session')
        .description('Cancel an in-progress session')
        .tag('Coach')
        .auth()
        .path('sessionId', stringSchema(), true, 'Session ID')
        .response('200', 'Session cancelled', ref('WorkoutSession'))
        .build())
      .build())
    
    .path('/api/v1/coach/progress/summary', path()
      .get(op()
        .summary('Get progress summary')
        .description('Get workout progress summary for a time period')
        .tag('Coach')
        .auth()
        .query('period', stringSchema(), false, 'Time period (day, week, month, quarter)')
        .response('200', 'Progress summary')
        .build())
      .build())
    
    .path('/api/v1/coach/progress/history', path()
      .get(op()
        .summary('Get workout history')
        .description('Get detailed workout session history')
        .tag('Coach')
        .auth()
        .query('limit', numberSchema('integer'), false)
        .query('offset', numberSchema('integer'), false)
        .query('exercise', stringSchema(), false, 'Filter by exercise')
        .response('200', 'Workout history')
        .build())
      .build())
    
    .path('/api/v1/coach/planning/request', path()
      .post(op()
        .summary('Request new plan')
        .description('Request AI to generate a new workout plan')
        .tag('Coach')
        .auth()
        .body(objectSchema({
          currentGoal: stringSchema(),
          reason: stringSchema(),
          maxWorkoutsPerWeek: numberSchema('integer'),
          maxSessionDurationMs: numberSchema('integer')
        }), true)
        .response('202', 'Plan generation queued')
        .response('503', 'AI planning disabled')
        .build())
      .build())
    
    .path('/api/v1/coach/planning/jobs', path()
      .get(op()
        .summary('Get planning jobs')
        .description('Get user\'s planning job history')
        .tag('Coach')
        .auth()
        .query('limit', numberSchema('integer'), false)
        .response('200', 'Planning jobs')
        .build())
      .build())
    
    .path('/api/v1/coach/planning/jobs/{jobId}', path()
      .get(op()
        .summary('Get job status')
        .description('Get the status of a planning job')
        .tag('Coach')
        .auth()
        .path('jobId', stringSchema(), true, 'Job ID')
        .response('200', 'Job status')
        .response('404', 'Job not found')
        .build())
      .build())

    // =========================================================================
    // Nutrition Service Endpoints
    // =========================================================================
    
    .path('/api/v1/nutrition/meals', path()
      .get(op()
        .summary('List meals')
        .description('Get meals for a date range')
        .tag('Nutrition')
        .auth()
        .query('startDate', stringSchema(), true, 'Start date (YYYY-MM-DD)')
        .query('endDate', stringSchema(), true, 'End date (YYYY-MM-DD)')
        .query('mealType', stringSchema(), false, 'Filter by meal type')
        .query('limit', numberSchema('integer'), false, 'Results limit')
        .query('offset', numberSchema('integer'), false, 'Results offset')
        .response('200', 'Meal list', objectSchema({
          meals: arraySchema(ref('Meal')),
          total: numberSchema('integer'),
          hasMore: { type: 'boolean' }
        }))
        .build())
      .post(op()
        .summary('Create meal')
        .description('Log a new meal manually')
        .tag('Nutrition')
        .auth()
        .body(objectSchema({
          date: stringSchema(),
          timezone: stringSchema(),
          mealType: stringSchema(),
          name: stringSchema(),
          items: arraySchema(objectSchema({
            name: stringSchema(),
            quantity: numberSchema('number'),
            unit: stringSchema(),
            nutrition: ref('NutritionInfo'),
            foodId: stringSchema()
          })),
          notes: stringSchema()
        }), true)
        .response('201', 'Meal created', ref('Meal'))
        .build())
      .build())
    
    .path('/api/v1/nutrition/meals/today', path()
      .get(op()
        .summary('Get today\'s meals')
        .description('Get all meals logged for today with totals')
        .tag('Nutrition')
        .auth()
        .response('200', 'Today\'s meals', objectSchema({
          date: stringSchema(),
          meals: arraySchema(ref('Meal')),
          totalNutrition: ref('NutritionInfo'),
          macroPercentages: objectSchema({
            protein: numberSchema('number'),
            carbs: numberSchema('number'),
            fat: numberSchema('number')
          })
        }))
        .build())
      .build())
    
    .path('/api/v1/nutrition/meals/{id}', path()
      .get(op()
        .summary('Get meal by ID')
        .description('Get a specific meal by its ID')
        .tag('Nutrition')
        .auth()
        .path('id', stringSchema(), true, 'Meal ID')
        .response('200', 'Meal details', ref('Meal'))
        .response('404', 'Meal not found')
        .build())
      .put(op()
        .summary('Update meal')
        .description('Update a meal\'s details')
        .tag('Nutrition')
        .auth()
        .path('id', stringSchema(), true, 'Meal ID')
        .response('200', 'Meal updated')
        .build())
      .delete(op()
        .summary('Delete meal')
        .description('Delete a meal')
        .tag('Nutrition')
        .auth()
        .path('id', stringSchema(), true, 'Meal ID')
        .response('200', 'Meal deleted')
        .response('404', 'Meal not found')
        .build())
      .build())
    
    .path('/api/v1/nutrition/foods/search', path()
      .get(op()
        .summary('Search foods')
        .description('Search the food catalog')
        .tag('Nutrition')
        .auth()
        .query('q', stringSchema(), true, 'Search query')
        .query('limit', numberSchema('integer'), false, 'Results limit')
        .response('200', 'Search results', objectSchema({
          foods: arraySchema(objectSchema({
            id: stringSchema(),
            name: stringSchema(),
            brand: stringSchema(),
            nutrition: ref('NutritionInfo')
          })),
          total: numberSchema('integer')
        }))
        .build())
      .build())
    
    .path('/api/v1/nutrition/foods/{id}', path()
      .get(op()
        .summary('Get food by ID')
        .description('Get a specific food from the catalog')
        .tag('Nutrition')
        .auth()
        .path('id', stringSchema(), true, 'Food ID')
        .response('200', 'Food details')
        .response('404', 'Food not found')
        .build())
      .build())
    
    .path('/api/v1/nutrition/charts/{metric}', path()
      .get(op()
        .summary('Get nutrition chart data')
        .description('Get chart data for a specific nutrition metric')
        .tag('Nutrition')
        .auth()
        .path('metric', stringSchema(), true, 'Metric name (calories, protein, etc.)')
        .query('range', stringSchema(), false, 'Time range (1d, 7d, 30d)')
        .response('200', 'Chart data')
        .build())
      .build())
    
    .path('/api/v1/nutrition/targets', path()
      .get(op()
        .summary('Get nutrition targets')
        .description('Get user\'s daily nutrition targets')
        .tag('Nutrition')
        .auth()
        .response('200', 'Nutrition targets', objectSchema({
          caloriesKcal: numberSchema('number'),
          proteinG: numberSchema('number'),
          carbsG: numberSchema('number'),
          fatG: numberSchema('number')
        }))
        .build())
      .put(op()
        .summary('Update nutrition targets')
        .description('Update user\'s daily nutrition targets')
        .tag('Nutrition')
        .auth()
        .body(objectSchema({
          caloriesKcal: numberSchema('number'),
          proteinG: numberSchema('number'),
          carbsG: numberSchema('number'),
          fatG: numberSchema('number')
        }), true)
        .response('200', 'Targets updated')
        .build())
      .build())
    
    .path('/api/v1/nutrition/upload', path()
      .post(op()
        .summary('Upload meal image')
        .description('Upload an image for meal logging')
        .tag('Nutrition')
        .auth()
        .response('200', 'Upload successful', objectSchema({
          imageKey: stringSchema(),
          imageUrl: stringSchema()
        }))
        .build())
      .build())
    
    .path('/api/v1/nutrition/analysis/meals', path()
      .post(op()
        .summary('Analyze meal image')
        .description('Upload a meal image for AI analysis')
        .tag('Nutrition')
        .auth()
        .response('202', 'Analysis queued')
        .response('400', 'Invalid image')
        .build())
      .build())
    
    .build();
}

/**
 * Mount Swagger routes on the gateway app
 */
export function mountGatewaySwagger(app: Hono<{ Bindings: GatewayEnv }>) {
  const spec = createUnifiedSwaggerSpec();
  mountSwaggerRoutes(app, spec, {
    title: 'AIVO API',
    path: ''
  });
}
