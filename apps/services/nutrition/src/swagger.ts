/**
 * Nutrition Service - OpenAPI/Swagger Documentation
 */

import { createSpec, op, path, ref, stringSchema, objectSchema, arraySchema, numberSchema } from '@repo/swagger-utils/spec-builder';
import { mountSwaggerRoutes, healthResponseSchema } from '@repo/swagger-utils/swagger-handler';
import type { Hono } from 'hono';
import type { Env } from './types/env.js';

/**
 * Create OpenAPI specification for the Nutrition service
 */
export function createNutritionSwaggerSpec() {
  return createSpec('AIVO Nutrition', '1.0.0')
    .title('AIVO Nutrition API')
    .description(`
      Nutrition tracking and meal analysis API for the AIVO platform.
      
      ## Features
      - Meal logging and tracking
      - AI-powered meal image analysis
      - Food catalog search
      - Nutrition targets and goals
      - Chart data for nutrition metrics
      
      ## Authentication
      All endpoints (except health) require a valid JWT access token:
      \`Authorization: Bearer <access_token>\`
    `)
    .server('http://localhost:3002', 'Local development')
    .server('https://nutrition.aivo.app', 'Production')
    .addTag('Health', 'Service health check')
    .addTag('Meals', 'Meal logging and management')
    .addTag('Analysis', 'AI meal analysis')
    .addTag('Foods', 'Food catalog search')
    .addTag('Charts', 'Nutrition chart data')
    .addTag('Targets', 'Nutrition targets')
    .addTag('Upload', 'Image upload')
    // Common schemas
    .addSchema('NutritionInfo', {
      type: 'object',
      properties: {
        caloriesKcal: { type: 'number', description: 'Calories in kcal' },
        proteinG: { type: 'number', description: 'Protein in grams' },
        carbsG: { type: 'number', description: 'Carbohydrates in grams' },
        fatG: { type: 'number', description: 'Fat in grams' },
        fiberG: { type: 'number', description: 'Fiber in grams' },
        sugarG: { type: 'number', description: 'Sugar in grams' },
        sodiumMg: { type: 'number', description: 'Sodium in milligrams' }
      }
    })
    .addSchema('MealItem', {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Food name' },
        quantity: { type: 'number', description: 'Quantity' },
        unit: { type: 'string', description: 'Unit of measurement' },
        nutrition: ref('NutritionInfo'),
        foodId: { type: 'string', nullable: true, description: 'Food catalog ID' }
      }
    })
    .addSchema('Meal', {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Meal ID' },
        userId: { type: 'string', description: 'User ID' },
        date: { type: 'string', format: 'date', description: 'Date (YYYY-MM-DD)' },
        mealType: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
        name: { type: 'string', description: 'Meal name' },
        items: arraySchema(ref('MealItem')),
        totalNutrition: ref('NutritionInfo'),
        imageUrl: { type: 'string', nullable: true, description: 'Image URL' },
        createdAt: { type: 'integer', description: 'Creation timestamp' },
        updatedAt: { type: 'integer', description: 'Update timestamp' }
      }
    })
    .addSchema('Food', {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Food ID' },
        name: { type: 'string', description: 'Food name' },
        normalizedName: { type: 'string', description: 'Normalized name for search' },
        brand: { type: 'string', nullable: true, description: 'Brand name' },
        servingSize: { type: 'number', description: 'Serving size' },
        servingUnit: { type: 'string', description: 'Serving unit' },
        nutrition: ref('NutritionInfo'),
        barcode: { type: 'string', nullable: true, description: 'Barcode' }
      }
    })
    .addSchema('NutritionTargets', {
      type: 'object',
      properties: {
        caloriesKcal: { type: 'number', description: 'Daily calorie target' },
        proteinG: { type: 'number', description: 'Daily protein target (g)' },
        carbsG: { type: 'number', description: 'Daily carbs target (g)' },
        fatG: { type: 'number', description: 'Daily fat target (g)' },
        fiberG: { type: 'number', description: 'Daily fiber target (g)' },
        sugarG: { type: 'number', description: 'Daily sugar limit (g)' },
        sodiumMg: { type: 'number', description: 'Daily sodium limit (mg)' }
      }
    })
    .addSchema('MealAnalysis', {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Analysis ID' },
        status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
        meal: ref('Meal'),
        confidence: { type: 'number', description: 'Analysis confidence (0-1)' },
        suggestions: arraySchema(stringSchema())
      }
    })
    // Health endpoint
    .path('/health', path()
      .get(op()
        .summary('Health check')
        .description('Check if the nutrition service is running')
        .tag('Health')
        .response('200', 'Service is healthy', healthResponseSchema('nutrition'))
        .build())
      .build())
    // Meals routes
    .path('/analysis/meals', path()
      .post(op()
        .summary('Analyze meal image')
        .description('Upload a meal image for AI analysis')
        .tag('Analysis')
        .auth()
        .response('202', 'Analysis queued')
        .response('400', 'Invalid image')
        .build())
      .build())
    .path('/meals', path()
      .get(op()
        .summary('List meals')
        .description('Get meals for a date range')
        .tag('Meals')
        .auth()
        .query('startDate', stringSchema(), true, 'Start date (YYYY-MM-DD)')
        .query('endDate', stringSchema(), true, 'End date (YYYY-MM-DD)')
        .query('mealType', stringSchema(), false, 'Filter by meal type')
        .query('limit', numberSchema('integer'), false, 'Number of results')
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
        .tag('Meals')
        .auth()
        .body(objectSchema({
          date: stringSchema(),
          timezone: stringSchema(),
          mealType: stringSchema(),
          name: stringSchema(),
          items: arraySchema(ref('MealItem')),
          imageR2Key: stringSchema(),
          notes: stringSchema()
        }), true)
        .response('201', 'Meal created', ref('Meal'))
        .build())
      .build())
    .path('/meals/today', path()
      .get(op()
        .summary('Get today\'s meals')
        .description('Get all meals logged for today with totals')
        .tag('Meals')
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
    .path('/meals/{id}', path()
      .get(op()
        .summary('Get meal by ID')
        .description('Get a specific meal by its ID')
        .tag('Meals')
        .auth()
        .path('id', stringSchema(), true, 'Meal ID')
        .response('200', 'Meal details', ref('Meal'))
        .response('404', 'Meal not found')
        .build())
      .put(op()
        .summary('Update meal')
        .description('Update a meal\'s details')
        .tag('Meals')
        .auth()
        .path('id', stringSchema(), true, 'Meal ID')
        .response('200', 'Meal updated')
        .build())
      .delete(op()
        .summary('Delete meal')
        .description('Delete a meal')
        .tag('Meals')
        .auth()
        .path('id', stringSchema(), true, 'Meal ID')
        .response('200', 'Meal deleted')
        .response('404', 'Meal not found')
        .build())
      .build())
    // Foods routes
    .path('/foods/search', path()
      .get(op()
        .summary('Search foods')
        .description('Search the food catalog')
        .tag('Foods')
        .auth()
        .query('q', stringSchema(), true, 'Search query')
        .query('limit', numberSchema('integer'), false, 'Results limit')
        .response('200', 'Search results', objectSchema({
          foods: arraySchema(ref('Food')),
          total: numberSchema('integer')
        }))
        .build())
      .build())
    .path('/foods/{id}', path()
      .get(op()
        .summary('Get food by ID')
        .description('Get a specific food from the catalog')
        .tag('Foods')
        .auth()
        .path('id', stringSchema(), true, 'Food ID')
        .response('200', 'Food details', ref('Food'))
        .response('404', 'Food not found')
        .build())
      .build())
    // Charts routes
    .path('/charts/{metric}', path()
      .get(op()
        .summary('Get nutrition chart data')
        .description('Get chart data for a specific nutrition metric')
        .tag('Charts')
        .auth()
        .path('metric', stringSchema(), true, 'Metric name (calories, protein, etc.)')
        .query('range', stringSchema(), false, 'Time range (1d, 7d, 30d)')
        .response('200', 'Chart data')
        .build())
      .build())
    // Targets routes
    .path('/targets', path()
      .get(op()
        .summary('Get nutrition targets')
        .description('Get user\'s daily nutrition targets')
        .tag('Targets')
        .auth()
        .response('200', 'Nutrition targets', ref('NutritionTargets'))
        .build())
      .put(op()
        .summary('Update nutrition targets')
        .description('Update user\'s daily nutrition targets')
        .tag('Targets')
        .auth()
        .body(ref('NutritionTargets'), true)
        .response('200', 'Targets updated', ref('NutritionTargets'))
        .build())
      .build())
    // Upload routes
    .path('/upload', path()
      .post(op()
        .summary('Upload meal image')
        .description('Upload an image for meal logging')
        .tag('Upload')
        .auth()
        .response('200', 'Upload successful', objectSchema({
          imageKey: stringSchema(),
          imageUrl: stringSchema()
        }))
        .build())
      .build())
    .build();
}

/**
 * Mount Swagger routes on the nutrition app
 */
export function mountNutritionSwagger(app: Hono<{ Bindings: Env }>) {
  const spec = createNutritionSwaggerSpec();
  mountSwaggerRoutes(app, spec, {
    title: 'AIVO Nutrition API',
    path: '/api/v1'
  });
}
