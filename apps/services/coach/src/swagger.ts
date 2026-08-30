/**
 * Coach Service - OpenAPI/Swagger Documentation
 */

import { createSpec, op, path, ref, stringSchema, objectSchema, arraySchema, numberSchema } from '@repo/swagger-utils/spec-builder';
import { mountSwaggerRoutes, healthResponseSchema } from '@repo/swagger-utils/swagger-handler';
import type { Hono } from 'hono';
import type { Env } from './env.d.js';

/**
 * Create OpenAPI specification for the Coach service
 */
export function createCoachSwaggerSpec() {
  return createSpec('AIVO Coach', '1.0.0')
    .title('AIVO Coach API')
    .description(`
      Workout planning, session tracking, and fitness coaching API for the AIVO platform.
      
      ## Features
      - Workout plan management
      - Exercise library
      - Session tracking
      - Form analysis
      - Progress tracking
      - AI-powered plan generation
      
      ## Authentication
      All endpoints (except health) require a valid JWT access token:
      \`Authorization: Bearer <access_token>\`
    `)
    .server('https://coach.aivo.app', 'Production')
    .addTag('Health', 'Service health check')
    .addTag('Exercises', 'Exercise definitions and form rules')
    .addTag('Plans', 'Workout plan management')
    .addTag('Sessions', 'Workout session tracking')
    .addTag('Progress', 'Progress tracking and goals')
    .addTag('Planning', 'AI-powered plan generation')
    // Common schemas
    .addSchema('Exercise', {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Exercise code' },
        name: { type: 'string', description: 'Exercise name' },
        description: { type: 'string', description: 'Exercise description' },
        difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
        goals: arraySchema(stringSchema()),
        cameraOrientation: stringSchema()
      }
    })
    .addSchema('WorkoutPlan', {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', description: 'Plan ID' },
        userId: { type: 'string', description: 'User ID' },
        name: { type: 'string', description: 'Plan name' },
        description: { type: 'string', nullable: true },
        goal: { type: 'string', enum: ['fat_loss', 'muscle_gain', 'general_fitness', 'mobility'] },
        durationWeeks: { type: 'integer', description: 'Plan duration in weeks' },
        workoutDaysPerWeek: { type: 'integer', description: 'Workout days per week' },
        workouts: arraySchema(objectSchema({
          dayNumber: numberSchema('integer'),
          name: stringSchema(),
          exercises: arraySchema(objectSchema({
            exerciseCode: stringSchema(),
            order: numberSchema('integer'),
            targetSets: numberSchema('integer'),
            targetReps: numberSchema('integer'),
            restBetweenSetsMs: numberSchema('integer'),
            restAfterExerciseMs: numberSchema('integer')
          })),
          isRestDay: { type: 'boolean' }
        })),
        status: { type: 'string', enum: ['draft', 'active', 'completed', 'archived'] },
        startDate: stringSchema(),
        createdAt: { type: 'integer' },
        updatedAt: { type: 'integer' }
      }
    })
    .addSchema('WorkoutSession', {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', description: 'Session ID' },
        userId: { type: 'string', description: 'User ID' },
        planId: { type: 'string', format: 'uuid', nullable: true, description: 'Associated plan ID' },
        status: { type: 'string', enum: ['planned', 'in_progress', 'paused', 'completed', 'cancelled'] },
        startedAt: { type: 'integer', nullable: true },
        completedAt: { type: 'integer', nullable: true },
        currentExerciseIndex: { type: 'integer', nullable: true },
        totalDurationMs: { type: 'integer', nullable: true },
        userRating: { type: 'integer', nullable: true },
        userNotes: { type: 'string', nullable: true }
      }
    })
    .addSchema('SetSummary', {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Set ID' },
        sessionId: { type: 'string', format: 'uuid' },
        exerciseCode: stringSchema(),
        setNumber: numberSchema('integer'),
        status: { type: 'string', enum: ['completed', 'skipped', 'failed'] },
        completedReps: numberSchema('integer'),
        averageRangeOfMotion: numberSchema('number'),
        averageQualityScore: numberSchema('number'),
        averageTempoSeconds: numberSchema('number'),
        durationMs: numberSchema('integer'),
        averageConfidence: numberSchema('number'),
        createdAt: { type: 'integer' }
      }
    })
    .addSchema('ProgressSummary', {
      type: 'object',
      properties: {
        totalSessions: numberSchema('integer'),
        completedSessions: numberSchema('integer'),
        totalDurationMs: numberSchema('integer'),
        averageQualityScore: numberSchema('number'),
        adherenceRate: numberSchema('number'),
        exercisesWorked: numberSchema('integer')
      }
    })
    .addSchema('UserGoals', {
      type: 'object',
      properties: {
        primaryGoal: stringSchema(),
        secondaryGoals: arraySchema(stringSchema()),
        experienceLevel: stringSchema(),
        limitations: arraySchema(stringSchema()),
        equipment: arraySchema(stringSchema()),
        preferredWorkoutDays: arraySchema(numberSchema('integer')),
        preferredSessionDurationMs: numberSchema('integer'),
        reminderEnabled: { type: 'boolean' },
        reminderTime: stringSchema()
      }
    })
    .addSchema('PlanningJob', {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        userId: { type: 'string' },
        status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
        type: stringSchema(),
        reason: stringSchema(),
        planId: { type: 'string', format: 'uuid', nullable: true },
        createdAt: { type: 'integer' },
        completedAt: { type: 'integer', nullable: true }
      }
    })
    // Health endpoint
    .path('/health', path()
      .get(op()
        .summary('Health check')
        .description('Check if the coach service is running')
        .tag('Health')
        .response('200', 'Service is healthy', healthResponseSchema('coach'))
        .build())
      .build())
    // Exercises routes
    .path('/exercises', path()
      .get(op()
        .summary('Get all exercises')
        .description('Get list of all supported exercises')
        .tag('Exercises')
        .auth()
        .response('200', 'Exercise list', objectSchema({
          exercises: arraySchema(ref('Exercise')),
          total: numberSchema('integer')
        }))
        .build())
      .build())
    .path('/exercises/{code}', path()
      .get(op()
        .summary('Get exercise details')
        .description('Get detailed information about a specific exercise')
        .tag('Exercises')
        .auth()
        .path('code', stringSchema(), true, 'Exercise code')
        .response('200', 'Exercise details', ref('Exercise'))
        .response('404', 'Exercise not found')
        .build())
      .build())
    .path('/exercises/{code}/rules', path()
      .get(op()
        .summary('Get form rules')
        .description('Get form analysis rules for an exercise')
        .tag('Exercises')
        .auth()
        .path('code', stringSchema(), true, 'Exercise code')
        .response('200', 'Form rules')
        .response('404', 'Exercise not found')
        .build())
      .build())
    // Plans routes
    .path('/plans', path()
      .get(op()
        .summary('Get user plans')
        .description('Get all workout plans for the current user')
        .tag('Plans')
        .auth()
        .query('status', stringSchema(), false, 'Filter by status')
        .response('200', 'Plan list', objectSchema({
          plans: arraySchema(ref('WorkoutPlan')),
          total: numberSchema('integer')
        }))
        .build())
      .post(op()
        .summary('Create plan')
        .description('Create a new workout plan')
        .tag('Plans')
        .auth()
        .body(ref('WorkoutPlan'), true)
        .response('201', 'Plan created', ref('WorkoutPlan'))
        .build())
      .build())
    .path('/plans/active', path()
      .get(op()
        .summary('Get active plan')
        .description('Get the user\'s currently active workout plan')
        .tag('Plans')
        .auth()
        .response('200', 'Active plan', objectSchema({
          plan: ref('WorkoutPlan'),
          message: stringSchema()
        }))
        .build())
      .build())
    .path('/plans/{planId}', path()
      .get(op()
        .summary('Get plan details')
        .tag('Plans')
        .auth()
        .path('planId', stringSchema(), true, 'Plan ID')
        .response('200', 'Plan details', ref('WorkoutPlan'))
        .response('404', 'Plan not found')
        .build())
      .put(op()
        .summary('Update plan')
        .tag('Plans')
        .auth()
        .path('planId', stringSchema(), true, 'Plan ID')
        .body(ref('WorkoutPlan'), true)
        .response('200', 'Plan updated', ref('WorkoutPlan'))
        .build())
      .delete(op()
        .summary('Delete plan')
        .tag('Plans')
        .auth()
        .path('planId', stringSchema(), true, 'Plan ID')
        .response('200', 'Plan deleted')
        .response('404', 'Plan not found')
        .build())
      .build())
    .path('/plans/{planId}/activate', path()
      .post(op()
        .summary('Activate plan')
        .description('Set a plan as the active workout plan')
        .tag('Plans')
        .auth()
        .path('planId', stringSchema(), true, 'Plan ID')
        .response('200', 'Plan activated', ref('WorkoutPlan'))
        .response('404', 'Plan not found')
        .build())
      .build())
    .path('/plans/{planId}/archive', path()
      .post(op()
        .summary('Archive plan')
        .description('Archive a completed or abandoned plan')
        .tag('Plans')
        .auth()
        .path('planId', stringSchema(), true, 'Plan ID')
        .response('200', 'Plan archived', ref('WorkoutPlan'))
        .response('404', 'Plan not found')
        .build())
      .build())
    // Sessions routes
    .path('/sessions', path()
      .get(op()
        .summary('Get user sessions')
        .description('Get workout session history')
        .tag('Sessions')
        .auth()
        .query('limit', numberSchema('integer'), false, 'Results limit')
        .query('offset', numberSchema('integer'), false, 'Results offset')
        .query('status', stringSchema(), false, 'Filter by status')
        .response('200', 'Session list', objectSchema({
          sessions: arraySchema(ref('WorkoutSession')),
          total: numberSchema('integer'),
          limit: numberSchema('integer'),
          offset: numberSchema('integer')
        }))
        .build())
      .build())
    .path('/sessions/active', path()
      .get(op()
        .summary('Get active session')
        .description('Get the user\'s currently active workout session')
        .tag('Sessions')
        .auth()
        .response('200', 'Active session', objectSchema({
          session: ref('WorkoutSession')
        }))
        .build())
      .build())
    .path('/sessions/start', path()
      .post(op()
        .summary('Start session')
        .description('Start a new workout session')
        .tag('Sessions')
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
    .path('/sessions/{sessionId}', path()
      .get(op()
        .summary('Get session details')
        .tag('Sessions')
        .auth()
        .path('sessionId', stringSchema(), true, 'Session ID')
        .response('200', 'Session details', ref('WorkoutSession'))
        .response('404', 'Session not found')
        .build())
      .build())
    .path('/sessions/{sessionId}/checkpoint', path()
      .patch(op()
        .summary('Update checkpoint')
        .description('Update session checkpoint (exercise index, status, notes)')
        .tag('Sessions')
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
    .path('/sessions/{sessionId}/sets', path()
      .post(op()
        .summary('Submit set')
        .description('Submit completed set data')
        .tag('Sessions')
        .auth()
        .path('sessionId', stringSchema(), true, 'Session ID')
        .body(ref('SetSummary'), true)
        .response('201', 'Set submitted', ref('SetSummary'))
        .build())
      .build())
    .path('/sessions/{sessionId}/complete', path()
      .post(op()
        .summary('Complete session')
        .description('Mark a session as completed')
        .tag('Sessions')
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
    .path('/sessions/{sessionId}/cancel', path()
      .post(op()
        .summary('Cancel session')
        .description('Cancel an in-progress session')
        .tag('Sessions')
        .auth()
        .path('sessionId', stringSchema(), true, 'Session ID')
        .response('200', 'Session cancelled', ref('WorkoutSession'))
        .build())
      .build())
    // Progress routes
    .path('/progress/summary', path()
      .get(op()
        .summary('Get progress summary')
        .description('Get workout progress summary for a time period')
        .tag('Progress')
        .auth()
        .query('period', stringSchema(), false, 'Time period (day, week, month, quarter)')
        .response('200', 'Progress summary', objectSchema({
          summary: ref('ProgressSummary')
        }))
        .build())
      .build())
    .path('/progress/exercises/{exerciseCode}', path()
      .get(op()
        .summary('Get exercise progress')
        .description('Get progress data for a specific exercise')
        .tag('Progress')
        .auth()
        .path('exerciseCode', stringSchema(), true, 'Exercise code')
        .query('limit', numberSchema('integer'), false, 'Results limit')
        .response('200', 'Exercise progress')
        .build())
      .build())
    .path('/progress/history', path()
      .get(op()
        .summary('Get workout history')
        .description('Get detailed workout session history')
        .tag('Progress')
        .auth()
        .query('limit', numberSchema('integer'), false)
        .query('offset', numberSchema('integer'), false)
        .query('exercise', stringSchema(), false, 'Filter by exercise')
        .response('200', 'Workout history')
        .build())
      .build())
    .path('/progress/trends', path()
      .get(op()
        .summary('Get progress trends')
        .description('Get trend analysis for progress metrics')
        .tag('Progress')
        .auth()
        .query('metric', stringSchema(), false, 'Metric (quality_score, volume, etc.)')
        .query('period', stringSchema(), false, 'Time period')
        .response('200', 'Progress trends')
        .build())
      .build())
    .path('/progress/goals', path()
      .get(op()
        .summary('Get user goals')
        .description('Get the user\'s fitness goals')
        .tag('Progress')
        .auth()
        .response('200', 'User goals', ref('UserGoals'))
        .build())
      .put(op()
        .summary('Update goals')
        .description('Update the user\'s fitness goals')
        .tag('Progress')
        .auth()
        .body(ref('UserGoals'), true)
        .response('200', 'Goals updated', ref('UserGoals'))
        .build())
      .build())
    // Planning routes
    .path('/planning/request', path()
      .post(op()
        .summary('Request new plan')
        .description('Request AI to generate a new workout plan')
        .tag('Planning')
        .auth()
        .body(objectSchema({
          currentGoal: stringSchema(),
          reason: stringSchema(),
          availableExercises: arraySchema(stringSchema()),
          excludedExercises: arraySchema(stringSchema()),
          maxWorkoutsPerWeek: numberSchema('integer'),
          maxSessionDurationMs: numberSchema('integer'),
          userFeedback: stringSchema()
        }), true)
        .response('202', 'Plan generation queued', objectSchema({
          job: ref('PlanningJob')
        }))
        .response('503', 'AI planning disabled')
        .build())
      .build())
    .path('/planning/jobs', path()
      .get(op()
        .summary('Get planning jobs')
        .description('Get user\'s planning job history')
        .tag('Planning')
        .auth()
        .query('limit', numberSchema('integer'), false)
        .response('200', 'Planning jobs', objectSchema({
          jobs: arraySchema(ref('PlanningJob'))
        }))
        .build())
      .build())
    .path('/planning/jobs/{jobId}', path()
      .get(op()
        .summary('Get job status')
        .description('Get the status of a planning job')
        .tag('Planning')
        .auth()
        .path('jobId', stringSchema(), true, 'Job ID')
        .response('200', 'Job status', ref('PlanningJob'))
        .response('404', 'Job not found')
        .build())
      .build())
    .path('/planning/adjust', path()
      .post(op()
        .summary('Request adjustment')
        .description('Request AI to adjust the current plan')
        .tag('Planning')
        .auth()
        .body(objectSchema({
          planId: stringSchema(),
          reason: stringSchema(),
          completedSessionId: stringSchema()
        }), true)
        .response('202', 'Adjustment queued')
        .build())
      .build())
    .path('/planning/reasons', path()
      .get(op()
        .summary('Get adjustment reasons')
        .description('Get list of available plan adjustment reasons')
        .tag('Planning')
        .auth()
        .response('200', 'Adjustment reasons')
        .build())
      .build())
    .build();
}

/**
 * Mount Swagger routes on the coach app
 */
export function mountCoachSwagger(app: Hono) {
  const spec = createCoachSwaggerSpec();
  mountSwaggerRoutes(app, spec, {
    title: 'AIVO Coach API',
    path: '/api/v1'
  });
}
