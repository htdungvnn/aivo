/**
 * Zod schemas for nutrition types validation
 * Used for API request/response validation
 */

import { z } from 'zod';

// =============================================================================
// ENUM SCHEMAS
// =============================================================================

export const MealAnalysisStatusSchema = z.enum([
  'pending_upload',
  'queued',
  'processing',
  'needs_review',
  'completed',
  'failed',
  'cancelled',
]);

export const MealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);

export const NutritionSourceSchema = z.enum([
  'food_catalog',
  'ai_estimate',
  'user_override',
  'calculated',
]);

export const ChartMetricSchema = z.enum([
  'calories',
  'protein',
  'carbs',
  'fat',
  'fiber',
  'sugar',
  'sodium',
  'weight',
  'hydration',
  'activity',
  'sleep',
]);

export const ChartRangeSchema = z.enum(['1d', '7d', '30d', '90d']);

export const AIModelSchema = z.enum([
  '@cf/unum/uform-gen2-qwen-500m',
  '@cf/unum/uform-gen2-qwen-7b',
  '@cf/meta/llama-4-vision-beta',
]);

// =============================================================================
// NUTRITION VALUE SCHEMAS
// =============================================================================

/**
 * Nutrition values schema with validation
 */
export const NutritionValuesSchema = z.object({
  caloriesKcal: z.number().min(0).max(5000),
  proteinG: z.number().min(0).max(500),
  carbsG: z.number().min(0).max(800),
  fatG: z.number().min(0).max(400),
  fiberG: z.number().min(0).max(150),
  sugarG: z.number().min(0).max(300),
  sodiumMg: z.number().min(0).max(10000),
});

/**
 * Nutrition values with source tracking
 */
export const NutritionValuesWithSourceSchema = NutritionValuesSchema.extend({
  source: NutritionSourceSchema,
  confidence: z.number().min(0).max(1).optional(),
});

/**
 * Nutrition per 100g schema
 */
export const NutritionPer100gSchema = NutritionValuesSchema.extend({
  source: NutritionSourceSchema,
});

// =============================================================================
// MEAL ANALYSIS SCHEMAS
// =============================================================================

/**
 * Meal analysis item schema
 */
export const MealAnalysisItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  normalizedName: z.string().nullable(),
  estimatedQuantity: z.number().positive().max(10000),
  unit: z.string().min(1).max(20),
  confidence: z.number().min(0).max(1),
  nutrition: NutritionValuesWithSourceSchema,
  foodId: z.string().uuid().nullable(),
  source: NutritionSourceSchema,
  userOverride: NutritionValuesSchema.partial().nullable(),
  warnings: z.array(z.string()),
});

/**
 * Meal analysis result schema (from AI)
 */
export const MealAnalysisResultSchema = z.object({
  schemaVersion: z.literal(1),
  mealName: z.string().min(1).max(200),
  mealType: MealTypeSchema,
  foods: z.array(MealAnalysisItemSchema).min(1).max(50),
  overallConfidence: z.number().min(0).max(1),
  warnings: z.array(z.string()),
  needsUserReview: z.boolean(),
});

// =============================================================================
// MEAL SCHEMAS
// =============================================================================

/**
 * Meal item schema
 */
export const MealItemSchema = z.object({
  id: z.string().uuid(),
  mealId: z.string().uuid(),
  name: z.string().min(1).max(200),
  normalizedName: z.string().nullable(),
  quantity: z.number().positive().max(10000),
  unit: z.string().min(1).max(20),
  nutrition: NutritionValuesSchema,
  source: NutritionSourceSchema,
  foodId: z.string().uuid().nullable(),
  orderIndex: z.number().int().min(0),
  userOverride: NutritionValuesSchema.partial().nullable(),
});

/**
 * Meal schema
 */
export const MealSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string(),
  mealType: MealTypeSchema,
  name: z.string().min(1).max(200),
  imageR2Key: z.string().nullable(),
  imageHash: z.string().nullable(),
  notes: z.string().nullable(),
  totalNutrition: NutritionValuesSchema,
  items: z.array(MealItemSchema),
  analysisId: z.string().uuid().nullable(),
  source: z.enum(['manual', 'ai_analysis']),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
  deletedAt: z.number().int().nullable(),
});

// =============================================================================
// MEAL PLAN SCHEMAS
// =============================================================================

/**
 * Meal plan entry schema
 */
export const MealPlanEntrySchema = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid(),
  mealType: MealTypeSchema,
  targetTime: z.string().nullable(),
  targetNutrition: NutritionValuesSchema,
  suggestedFoods: z.array(z.string()),
  isLocked: z.boolean(),
  lockedBy: z.enum(['user', 'system']).nullable(),
  orderIndex: z.number().int().min(0),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

/**
 * Meal plan schema
 */
export const MealPlanSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string(),
  status: z.enum(['active', 'completed', 'archived']),
  entries: z.array(MealPlanEntrySchema),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

// =============================================================================
// NUTRITION TARGETS SCHEMAS
// =============================================================================

/**
 * Nutrition targets schema
 */
export const NutritionTargetsSchema = z.object({
  caloriesKcal: z.number().min(0).max(10000),
  proteinG: z.number().min(0).max(1000),
  carbsG: z.number().min(0).max(2000),
  fatG: z.number().min(0).max(1000),
  fiberG: z.number().min(0).max(500),
  sugarG: z.number().min(0).max(500),
  sodiumMg: z.number().min(0).max(20000),
  hydrationMl: z.number().nullable().optional(),
  weightKg: z.number().nullable().optional(),
});

/**
 * Macro targets schema
 */
export const MacroTargetsSchema = z.object({
  proteinPercent: z.number().min(0).max(100),
  carbsPercent: z.number().min(0).max(100),
  fatPercent: z.number().min(0).max(100),
});

/**
 * Nutrition targets record schema
 */
export const NutritionTargetsRecordSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  targets: NutritionTargetsSchema,
  macroTargets: MacroTargetsSchema,
  isActive: z.boolean(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

// =============================================================================
// CHART DATA SCHEMAS
// =============================================================================

/**
 * Chart data point schema
 */
export const ChartDataPointSchema = z.object({
  timestamp: z.string().datetime(),
  value: z.number(),
});

/**
 * Chart data summary schema
 */
export const ChartDataSummarySchema = z.object({
  average: z.number(),
  minimum: z.number(),
  maximum: z.number(),
  changePercent: z.number().nullable(),
});

/**
 * Chart data schema
 */
export const ChartDataSchema = z.object({
  metric: ChartMetricSchema,
  range: ChartRangeSchema,
  unit: z.string(),
  target: z.number().nullable(),
  points: z.array(ChartDataPointSchema),
  summary: ChartDataSummarySchema,
});

// =============================================================================
// API REQUEST SCHEMAS
// =============================================================================

/**
 * Create meal analysis request schema
 */
export const CreateMealAnalysisRequestSchema = z.object({
  mealType: MealTypeSchema.optional(),
  timezone: z.string().optional(),
});

/**
 * Image upload request schema
 */
export const ImageUploadRequestSchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/webp', 'image/png']),
  contentLength: z.number().min(1).max(10 * 1024 * 1024), // Max 10MB
  checksum: z.string().optional(),
});

/**
 * Meal correction schema
 */
export const MealCorrectionSchema = z.object({
  itemId: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  quantity: z.number().positive().max(10000).optional(),
  unit: z.string().min(1).max(20).optional(),
  nutrition: NutritionValuesSchema.partial().optional(),
});

/**
 * Confirm analysis request schema
 */
export const ConfirmAnalysisRequestSchema = z.object({
  corrections: z.array(MealCorrectionSchema).optional(),
});

/**
 * Create meal item request schema
 */
export const CreateMealItemRequestSchema = z.object({
  name: z.string().min(1).max(200),
  normalizedName: z.string().optional(),
  quantity: z.number().positive().max(10000),
  unit: z.string().min(1).max(20),
  nutrition: NutritionValuesSchema.partial().optional(),
  foodId: z.string().uuid().optional(),
});

/**
 * Create meal request schema
 */
export const CreateMealRequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string(),
  mealType: MealTypeSchema,
  name: z.string().min(1).max(200),
  items: z.array(CreateMealItemRequestSchema).min(1).max(50),
  imageR2Key: z.string().optional(),
  notes: z.string().max(1000).optional(),
  source: z.enum(['manual', 'ai_analysis']).optional(),
});

/**
 * Update meal request schema
 */
export const UpdateMealRequestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  mealType: MealTypeSchema.optional(),
  items: z.array(CreateMealItemRequestSchema).min(1).max(50).optional(),
  notes: z.string().max(1000).optional(),
});

/**
 * List meals request schema
 */
export const ListMealsRequestSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mealType: MealTypeSchema.optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

/**
 * Get chart data request schema
 */
export const GetChartDataRequestSchema = z.object({
  metric: ChartMetricSchema,
  range: ChartRangeSchema,
  target: z.number().positive().optional(),
});

/**
 * Update nutrition targets request schema
 */
export const UpdateNutritionTargetsRequestSchema = z.object({
  targets: NutritionTargetsSchema.partial(),
  macroTargets: MacroTargetsSchema.partial().optional(),
});

// =============================================================================
// API RESPONSE SCHEMAS
// =============================================================================

/**
 * Image upload response schema
 */
export const ImageUploadResponseSchema = z.object({
  uploadUrl: z.string().url(),
  r2Key: z.string(),
  expiresAt: z.number().int().positive(),
});

/**
 * Create meal analysis response schema
 */
export const CreateMealAnalysisResponseSchema = z.object({
  analysisId: z.string().uuid(),
  uploadUrl: z.string().url().nullable(),
  r2Key: z.string().nullable(),
  status: MealAnalysisStatusSchema,
  expiresAt: z.number().int().positive(),
});

/**
 * Get analysis status response schema
 */
export const GetAnalysisStatusResponseSchema = z.object({
  analysisId: z.string().uuid(),
  status: MealAnalysisStatusSchema,
  progress: z.object({
    stage: z.string(),
    percent: z.number().min(0).max(100),
  }).optional(),
  completedAt: z.number().int().nullable(),
  errorMessage: z.string().nullable(),
});

/**
 * Get analysis result response schema
 */
export const GetAnalysisResultResponseSchema = z.object({
  analysisId: z.string().uuid(),
  status: MealAnalysisStatusSchema,
  mealName: z.string().nullable(),
  mealType: MealTypeSchema.nullable(),
  overallConfidence: z.number().min(0).max(1).nullable(),
  foods: z.array(MealAnalysisItemSchema),
  needsUserReview: z.boolean(),
  warnings: z.array(z.string()),
});

/**
 * List meals response schema
 */
export const ListMealsResponseSchema = z.object({
  meals: z.array(MealSchema),
  total: z.number().int().min(0),
  hasMore: z.boolean(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type MealAnalysisStatus = z.infer<typeof MealAnalysisStatusSchema>;
export type MealType = z.infer<typeof MealTypeSchema>;
export type NutritionSource = z.infer<typeof NutritionSourceSchema>;
export type ChartMetric = z.infer<typeof ChartMetricSchema>;
export type ChartRange = z.infer<typeof ChartRangeSchema>;
export type AIModel = z.infer<typeof AIModelSchema>;
export type NutritionValues = z.infer<typeof NutritionValuesSchema>;
export type NutritionValuesWithSource = z.infer<typeof NutritionValuesWithSourceSchema>;
export type NutritionPer100g = z.infer<typeof NutritionPer100gSchema>;
export type MealAnalysisItem = z.infer<typeof MealAnalysisItemSchema>;
export type MealAnalysisResult = z.infer<typeof MealAnalysisResultSchema>;
export type MealItem = z.infer<typeof MealItemSchema>;
export type Meal = z.infer<typeof MealSchema>;
export type MealPlanEntry = z.infer<typeof MealPlanEntrySchema>;
export type MealPlan = z.infer<typeof MealPlanSchema>;
export type NutritionTargets = z.infer<typeof NutritionTargetsSchema>;
export type MacroTargets = z.infer<typeof MacroTargetsSchema>;
export type NutritionTargetsRecord = z.infer<typeof NutritionTargetsRecordSchema>;
export type ChartDataPoint = z.infer<typeof ChartDataPointSchema>;
export type ChartDataSummary = z.infer<typeof ChartDataSummarySchema>;
export type ChartData = z.infer<typeof ChartDataSchema>;
export type MealCorrection = z.infer<typeof MealCorrectionSchema>;
export type CreateMealItemRequest = z.infer<typeof CreateMealItemRequestSchema>;
export type CreateMealRequest = z.infer<typeof CreateMealRequestSchema>;
export type UpdateMealRequest = z.infer<typeof UpdateMealRequestSchema>;
export type ListMealsRequest = z.infer<typeof ListMealsRequestSchema>;
export type ListMealsResponse = z.infer<typeof ListMealsResponseSchema>;
export type GetChartDataRequest = z.infer<typeof GetChartDataRequestSchema>;
export type UpdateNutritionTargetsRequest = z.infer<typeof UpdateNutritionTargetsRequestSchema>;
export type ImageUploadRequest = z.infer<typeof ImageUploadRequestSchema>;
export type ImageUploadResponse = z.infer<typeof ImageUploadResponseSchema>;
export type CreateMealAnalysisRequest = z.infer<typeof CreateMealAnalysisRequestSchema>;
export type CreateMealAnalysisResponse = z.infer<typeof CreateMealAnalysisResponseSchema>;
export type GetAnalysisStatusResponse = z.infer<typeof GetAnalysisStatusResponseSchema>;
export type GetAnalysisResultResponse = z.infer<typeof GetAnalysisResultResponseSchema>;
export type ConfirmAnalysisRequest = z.infer<typeof ConfirmAnalysisRequestSchema>;
