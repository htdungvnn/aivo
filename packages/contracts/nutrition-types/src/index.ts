/**
 * Shared Nutrition Types and Contracts for AIVO
 * Used by: Nutrition Worker, Mobile App, Web App
 */

// =============================================================================
// ENUMS AND CONSTANTS
// =============================================================================

/**
 * Meal analysis status state machine
 */
export const MEAL_ANALYSIS_STATUS = {
  PENDING_UPLOAD: 'pending_upload',
  QUEUED: 'queued',
  PROCESSING: 'processing',
  NEEDS_REVIEW: 'needs_review',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type MealAnalysisStatus = (typeof MEAL_ANALYSIS_STATUS)[keyof typeof MEAL_ANALYSIS_STATUS];

/**
 * Meal types (breakfast, lunch, dinner, snack)
 */
export const MEAL_TYPE = {
  BREAKFAST: 'breakfast',
  LUNCH: 'lunch',
  DINNER: 'dinner',
  SNACK: 'snack',
} as const;

export type MealType = (typeof MEAL_TYPE)[keyof typeof MEAL_TYPE];

/**
 * Nutrition data source
 */
export const NUTRITION_SOURCE = {
  FOOD_CATALOG: 'food_catalog',
  AI_ESTIMATE: 'ai_estimate',
  USER_OVERRIDE: 'user_override',
  CALCULATED: 'calculated',
} as const;

export type NutritionSource = (typeof NUTRITION_SOURCE)[keyof typeof NUTRITION_SOURCE];

/**
 * Supported nutrition units
 */
export const NUTRITION_UNITS = {
  GRAMS: 'g',
  MILLIGRAMS: 'mg',
  MILLILITERS: 'ml',
  KILOCALORIES: 'kcal',
} as const;

export type NutritionUnit = (typeof NUTRITION_UNITS)[keyof typeof NUTRITION_UNITS];

/**
 * Chart metric types
 */
export const CHART_METRIC = {
  CALORIES: 'calories',
  PROTEIN: 'protein',
  CARBS: 'carbs',
  FAT: 'fat',
  FIBER: 'fiber',
  SUGAR: 'sugar',
  SODIUM: 'sodium',
  WEIGHT: 'weight',
  HYDRATION: 'hydration',
  ACTIVITY: 'activity',
  SLEEP: 'sleep',
} as const;

export type ChartMetric = (typeof CHART_METRIC)[keyof typeof CHART_METRIC];

/**
 * Chart range types
 */
export const CHART_RANGE = {
  DAY: '1d',
  WEEK: '7d',
  MONTH: '30d',
  THREE_MONTHS: '90d',
} as const;

export type ChartRange = (typeof CHART_RANGE)[keyof typeof CHART_RANGE];

/**
 * AI model types for routing
 */
export const AI_MODEL = {
  VISION_LIGHT: '@cf/unum/uform-gen2-qwen-500m',
  VISION_STANDARD: '@cf/unum/uform-gen2-qwen-7b',
  VISION_PREMIUM: '@cf/meta/llama-4-vision-beta',
} as const;

export type AIModel = (typeof AI_MODEL)[keyof typeof AI_MODEL];

// =============================================================================
// CANONICAL UNITS AND PRECISION
// =============================================================================

export const CANONICAL_UNITS = {
  mass: 'g',
  volume: 'ml',
  energy: 'kcal',
  massSmall: 'mg',
} as const;

export const NUTRITION_PRECISION = {
  caloriesKcal: 0,
  proteinG: 1,
  carbsG: 1,
  fatG: 1,
  fiberG: 1,
  sugarG: 1,
  sodiumMg: 0,
} as const;

export const NUTRITION_DISPLAY_PRECISION = {
  caloriesKcal: 0,
  proteinG: 1,
  carbsG: 1,
  fatG: 1,
  fiberG: 1,
  sugarG: 1,
  sodiumMg: 0,
} as const;

// =============================================================================
// NUTRITION VALUES STRUCT
// =============================================================================

/**
 * Core nutrition values for a single food item
 */
export interface NutritionValues {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
}

/**
 * Nutrition values with source tracking
 */
export interface NutritionValuesWithSource extends NutritionValues {
  source: NutritionSource;
  confidence?: number;
}

/**
 * Nutrition values per 100g
 */
export interface NutritionPer100g extends NutritionValues {
  source: NutritionSource;
}

// =============================================================================
// FOOD CATALOG
// =============================================================================

/**
 * Food item from the catalog
 */
export interface Food {
  id: string;
  normalizedName: string;
  displayName: string;
  category: string | null;
  servingSizeDefault: number;
  servingUnitDefault: string;
  nutritionPer100g: NutritionPer100g;
  aliases: string[];
  createdAt: number;
  updatedAt: number;
}

/**
 * Food search result
 */
export interface FoodSearchResult {
  food: Food;
  matchScore: number;
  matchedAlias: string | null;
}

// =============================================================================
// MEAL ANALYSIS
// =============================================================================

/**
 * Detected food item in a meal
 */
export interface MealAnalysisItem {
  id: string;
  name: string;
  normalizedName: string | null;
  estimatedQuantity: number;
  unit: string;
  confidence: number;
  nutrition: NutritionValuesWithSource;
  foodId: string | null;
  source: NutritionSource;
  userOverride: Partial<NutritionValues> | null;
  warnings: string[];
}

/**
 * Meal analysis result from AI
 */
export interface MealAnalysisResult {
  schemaVersion: number;
  mealName: string;
  mealType: MealType;
  foods: MealAnalysisItem[];
  overallConfidence: number;
  warnings: string[];
  needsUserReview: boolean;
}

/**
 * Meal analysis record
 */
export interface MealAnalysis {
  id: string;
  userId: string;
  imageR2Key: string | null;
  imageHash: string | null;
  status: MealAnalysisStatus;
  mealType: MealType | null;
  mealName: string | null;
  result: MealAnalysisResult | null;
  overallConfidence: number | null;
  aiModel: AIModel | null;
  promptVersion: string | null;
  processingAttempts: number;
  errorCategory: string | null;
  errorMessage: string | null;
  idempotencyKey: string;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
}

// =============================================================================
// MEALS
// =============================================================================

/**
 * Meal item in a saved meal
 */
export interface MealItem {
  id: string;
  mealId: string;
  name: string;
  normalizedName: string | null;
  quantity: number;
  unit: string;
  nutrition: NutritionValues;
  source: NutritionSource;
  foodId: string | null;
  orderIndex: number;
  userOverride: Partial<NutritionValues> | null;
}

/**
 * Complete meal record
 */
export interface Meal {
  id: string;
  userId: string;
  date: string;
  timezone: string;
  mealType: MealType;
  name: string;
  imageR2Key: string | null;
  imageHash: string | null;
  notes: string | null;
  totalNutrition: NutritionValues;
  items: MealItem[];
  analysisId: string | null;
  source: 'manual' | 'ai_analysis';
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

// =============================================================================
// MEAL PLANS
// =============================================================================

/**
 * Individual entry in a meal plan
 */
export interface MealPlanEntry {
  id: string;
  planId: string;
  mealType: MealType;
  targetTime: string | null;
  targetNutrition: NutritionValues;
  suggestedFoods: string[];
  isLocked: boolean;
  lockedBy: 'user' | 'system' | null;
  orderIndex: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Meal plan for a specific date
 */
export interface MealPlan {
  id: string;
  userId: string;
  date: string;
  timezone: string;
  status: 'active' | 'completed' | 'archived';
  entries: MealPlanEntry[];
  createdAt: number;
  updatedAt: number;
}

// =============================================================================
// NUTRITION TARGETS
// =============================================================================

/**
 * User's daily nutrition targets
 */
export interface NutritionTargets {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
  hydrationMl: number | null;
  weightKg: number | null;
}

/**
 * Macro percentage targets
 */
export interface MacroTargets {
  proteinPercent: number;
  carbsPercent: number;
  fatPercent: number;
}

/**
 * User nutrition targets record
 */
export interface NutritionTargetsRecord {
  id: string;
  userId: string;
  targets: NutritionTargets;
  macroTargets: MacroTargets;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

// =============================================================================
// DAILY NUTRITION SUMMARIES
// =============================================================================

/**
 * Daily aggregated nutrition data
 */
export interface DailyNutritionSummary {
  date: string;
  timezone: string;
  totalNutrition: NutritionValues;
  mealCount: number;
  mealPlanTarget: NutritionValues | null;
  remainingNutrition: NutritionValues;
  macroPercentages: MacroTargets;
  targetAdherence: {
    caloriesPercent: number;
    proteinPercent: number;
    carbsPercent: number;
    fatPercent: number;
  };
}

// =============================================================================
// CHART DATA
// =============================================================================

/**
 * Single data point for charts
 */
export interface ChartDataPoint {
  timestamp: string;
  value: number;
}

/**
 * Chart data summary statistics
 */
export interface ChartDataSummary {
  average: number;
  minimum: number;
  maximum: number;
  changePercent: number | null;
}

/**
 * Complete chart data response
 */
export interface ChartData {
  metric: ChartMetric;
  range: ChartRange;
  unit: string;
  target: number | null;
  points: ChartDataPoint[];
  summary: ChartDataSummary;
}

// =============================================================================
// USER CORRECTIONS
// =============================================================================

/**
 * User's correction to a food or meal
 */
export interface UserFoodCorrection {
  id: string;
  userId: string;
  normalizedFoodName: string;
  correctedNutrition: NutritionValues;
  isFavorite: boolean;
  useCount: number;
  createdAt: number;
  updatedAt: number;
}

// =============================================================================
// IMAGE PIPELINE
// =============================================================================

/**
 * Image processing configuration
 */
export interface ImageConfig {
  maxDimensionPx: number;
  quality: number;
  format: 'jpeg' | 'webp';
  stripMetadata: boolean;
  stripLocation: boolean;
}

/**
 * Image upload request
 */
export interface ImageUploadRequest {
  contentType: string;
  contentLength: number;
  checksum?: string;
}

/**
 * Image upload response
 */
export interface ImageUploadResponse {
  uploadUrl: string;
  r2Key: string;
  expiresAt: number;
}

// =============================================================================
// AI ANALYSIS QUEUE MESSAGES
// =============================================================================

/**
 * Message to queue for meal analysis
 */
export interface MealAnalysisQueueMessage {
  analysisId: string;
  userId: string;
  r2Key: string | null;
  imageDataBase64?: string;
  mealTypeHint?: MealType;
  idempotencyKey: string;
  timestamp: number;
  retryCount: number;
}

/**
 * Analysis processing context
 */
export interface AnalysisContext {
  analysisId: string;
  userId: string;
  userTargets: NutritionTargets | null;
  previousMeals: Meal[];
  userCorrections: UserFoodCorrection[];
  dailyUsage: {
    aiCallsToday: number;
    aiCallsLimit: number;
  };
}

// =============================================================================
// AI MODEL ROUTING
// =============================================================================

/**
 * AI model configuration
 */
export interface AIModelConfig {
  modelId: AIModel;
  maxTokens: number;
  inputImageMaxDimension: number;
  estimatedCostPerCall: number;
  confidenceThreshold: number;
  fallbackModels: AIModel[];
}

/**
 * AI routing decision
 */
export interface AIRoutingDecision {
  selectedModel: AIModel;
  reason: string;
  estimatedCost: number;
  canEscalate: boolean;
}

/**
 * AI call result
 */
export interface AICallResult {
  success: boolean;
  model: AIModel;
  latencyMs: number;
  imageSize: number;
  outputTokens: number;
  estimatedCost: number;
  confidence: number;
  validationPassed: boolean;
  errorMessage: string | null;
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

/**
 * Create meal analysis request
 */
export interface CreateMealAnalysisRequest {
  mealType?: MealType;
  timezone?: string;
}

/**
 * Create meal analysis response
 */
export interface CreateMealAnalysisResponse {
  analysisId: string;
  uploadUrl: string | null;
  r2Key: string | null;
  status: MealAnalysisStatus;
  expiresAt: number;
}

/**
 * Get analysis status response
 */
export interface GetAnalysisStatusResponse {
  analysisId: string;
  status: MealAnalysisStatus;
  progress?: {
    stage: string;
    percent: number;
  };
  completedAt: number | null;
  errorMessage: string | null;
}

/**
 * Get analysis result response
 */
export interface GetAnalysisResultResponse {
  analysisId: string;
  status: MealAnalysisStatus;
  mealName: string | null;
  mealType: MealType | null;
  overallConfidence: number | null;
  foods: MealAnalysisItem[];
  needsUserReview: boolean;
  warnings: string[];
}

/**
 * Confirm analysis request
 */
export interface ConfirmAnalysisRequest {
  corrections?: MealCorrection[];
}

/**
 * Individual food correction
 */
export interface MealCorrection {
  itemId: string;
  name?: string;
  quantity?: number;
  unit?: string;
  nutrition?: Partial<NutritionValues>;
}

/**
 * Create meal request
 */
export interface CreateMealRequest {
  date: string;
  timezone: string;
  mealType: MealType;
  name: string;
  items: CreateMealItemRequest[];
  imageR2Key?: string;
  notes?: string;
  source?: 'manual' | 'ai_analysis';
}

/**
 * Create meal item request
 */
export interface CreateMealItemRequest {
  name: string;
  normalizedName?: string;
  quantity: number;
  unit: string;
  nutrition?: Partial<NutritionValues>;
  foodId?: string;
}

/**
 * Update meal request
 */
export interface UpdateMealRequest {
  name?: string;
  mealType?: MealType;
  items?: CreateMealItemRequest[];
  notes?: string;
}

/**
 * List meals request
 */
export interface ListMealsRequest {
  startDate: string;
  endDate: string;
  mealType?: MealType;
  limit?: number;
  offset?: number;
}

/**
 * List meals response
 */
export interface ListMealsResponse {
  meals: Meal[];
  total: number;
  hasMore: boolean;
}

/**
 * Get meal plan response
 */
export interface GetMealPlanResponse {
  plan: MealPlan | null;
  dailySummary: DailyNutritionSummary | null;
}

/**
 * Get chart data request
 */
export interface GetChartDataRequest {
  metric: ChartMetric;
  range: ChartRange;
  target?: number;
}

/**
 * Create/update nutrition targets request
 */
export interface UpdateNutritionTargetsRequest {
  targets: Partial<NutritionTargets>;
  macroTargets?: Partial<MacroTargets>;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * API error codes for nutrition service
 */
export const NUTRITION_ERROR_CODES = {
  ANALYSIS_NOT_FOUND: 'ANALYSIS_NOT_FOUND',
  ANALYSIS_IN_PROGRESS: 'ANALYSIS_IN_PROGRESS',
  ANALYSIS_FAILED: 'ANALYSIS_FAILED',
  MEAL_NOT_FOUND: 'MEAL_NOT_FOUND',
  PLAN_NOT_FOUND: 'PLAN_NOT_FOUND',
  INVALID_IMAGE: 'INVALID_IMAGE',
  IMAGE_UPLOAD_FAILED: 'IMAGE_UPLOAD_FAILED',
  AI_MODEL_ERROR: 'AI_MODEL_ERROR',
  AI_VALIDATION_FAILED: 'AI_VALIDATION_FAILED',
  AI_QUOTA_EXCEEDED: 'AI_QUOTA_EXCEEDED',
  INVALID_FOOD: 'INVALID_FOOD',
  INVALID_PORTION: 'INVALID_PORTION',
  CALCULATION_ERROR: 'CALCULATION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type NutritionErrorCode = (typeof NUTRITION_ERROR_CODES)[keyof typeof NUTRITION_ERROR_CODES];

// =============================================================================
// DEFAULT VALUES
// =============================================================================

/**
 * Default nutrition targets (based on 2000 calorie diet)
 */
export const DEFAULT_NUTRITION_TARGETS: NutritionTargets = {
  caloriesKcal: 2000,
  proteinG: 50,
  carbsG: 275,
  fatG: 78,
  fiberG: 28,
  sugarG: 50,
  sodiumMg: 2300,
  hydrationMl: 2000,
  weightKg: null,
};

/**
 * Default macro percentages
 */
export const DEFAULT_MACRO_TARGETS: MacroTargets = {
  proteinPercent: 20,
  carbsPercent: 50,
  fatPercent: 30,
};

/**
 * Default AI confidence thresholds
 */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.9,
  MEDIUM: 0.7,
  LOW: 0.5,
  NEEDS_REVIEW: 0.7,
} as const;

/**
 * Default image processing config
 */
export const DEFAULT_IMAGE_CONFIG: ImageConfig = {
  maxDimensionPx: 1280,
  quality: 75,
  format: 'jpeg',
  stripMetadata: true,
  stripLocation: true,
};

/**
 * AI usage limits
 */
export const AI_USAGE_LIMITS = {
  DAILY_LIMIT: 50,
  HOURLY_LIMIT: 10,
  RETRY_LIMIT: 3,
} as const;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Implausible nutrition value thresholds
 */
export const IMPLAUSIBLE_VALUES = {
  caloriesKcal: { min: 0, max: 5000 },
  proteinG: { min: 0, max: 500 },
  carbsG: { min: 0, max: 800 },
  fatG: { min: 0, max: 400 },
  fiberG: { min: 0, max: 150 },
  sugarG: { min: 0, max: 300 },
  sodiumMg: { min: 0, max: 10000 },
} as const;

/**
 * Check if a nutrition value is plausible
 */
export function isPlausibleValue(metric: keyof NutritionValues, value: number): boolean {
  const threshold = IMPLAUSIBLE_VALUES[metric];
  if (!threshold) return true;
  return value >= threshold.min && value <= threshold.max;
}

/**
 * Check if all nutrition values are plausible
 */
export function areNutritionValuesPlausible(nutrition: NutritionValues): boolean {
  return (
    isPlausibleValue('caloriesKcal', nutrition.caloriesKcal) &&
    isPlausibleValue('proteinG', nutrition.proteinG) &&
    isPlausibleValue('carbsG', nutrition.carbsG) &&
    isPlausibleValue('fatG', nutrition.fatG) &&
    isPlausibleValue('fiberG', nutrition.fiberG) &&
    isPlausibleValue('sugarG', nutrition.sugarG) &&
    isPlausibleValue('sodiumMg', nutrition.sodiumMg)
  );
}

/**
 * Check if a value is a finite number
 */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Check if all values in nutrition are finite
 */
export function areNutritionValuesFinite(nutrition: NutritionValues): boolean {
  return (
    isFiniteNumber(nutrition.caloriesKcal) &&
    isFiniteNumber(nutrition.proteinG) &&
    isFiniteNumber(nutrition.carbsG) &&
    isFiniteNumber(nutrition.fatG) &&
    isFiniteNumber(nutrition.fiberG) &&
    isFiniteNumber(nutrition.sugarG) &&
    isFiniteNumber(nutrition.sodiumMg)
  );
}
