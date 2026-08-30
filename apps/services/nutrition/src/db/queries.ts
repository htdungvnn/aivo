/**
 * Database queries for the Nutrition Worker
 * Uses D1 for persistence
 */

import { generateUUID } from '../lib/crypto';
import type {
  Food,
  Meal,
  MealItem,
  MealAnalysis,
  MealAnalysisItem,
  MealAnalysisResult,
  MealAnalysisStatus,
  MealPlan,
  MealPlanEntry,
  NutritionTargets,
  MacroTargets,
  NutritionValues,
  NutritionTargetsRecord,
  DailyNutritionSummary,
  UserFoodCorrection,
  MealType,
  NutritionSource,
} from '@repo/nutrition-types';

// =============================================================================
// FOOD CATALOG QUERIES
// =============================================================================

/**
 * Get food by normalized name
 */
export async function getFoodByNormalizedName(
  db: D1Database,
  normalizedName: string
): Promise<Food | null> {
  const result = await db
    .prepare('SELECT * FROM foods WHERE normalized_name = ?')
    .bind(normalizedName)
    .first();
  
  if (!result) return null;
  
  return rowToFood(result as Record<string, unknown>);
}

/**
 * Search foods by name or alias
 */
export async function searchFoods(
  db: D1Database,
  query: string,
  limit: number = 20
): Promise<Food[]> {
  const normalizedQuery = query.toLowerCase().trim();
  
  // Search in normalized_name, display_name, and aliases
  const results = await db
    .prepare(`
      SELECT * FROM foods 
      WHERE normalized_name LIKE ? 
         OR display_name LIKE ?
         OR aliases LIKE ?
      ORDER BY 
        CASE 
          WHEN normalized_name LIKE ? THEN 1
          WHEN display_name LIKE ? THEN 2
          ELSE 3
        END,
        display_name
      LIMIT ?
    `)
    .bind(
      `%${normalizedQuery}%`,
      `%${normalizedQuery}%`,
      `%${normalizedQuery}%`,
      `${normalizedQuery}%`,
      `${normalizedQuery}%`,
      limit
    )
    .all();
  
  return (results.results as Record<string, unknown>[]).map(rowToFood);
}

/**
 * Get food by ID
 */
export async function getFoodById(db: D1Database, id: string): Promise<Food | null> {
  const result = await db
    .prepare('SELECT * FROM foods WHERE id = ?')
    .bind(id)
    .first();
  
  if (!result) return null;
  
  return rowToFood(result as Record<string, unknown>);
}

/**
 * Helper to convert database row to Food object
 */
function rowToFood(row: Record<string, unknown>): Food {
  return {
    id: row.id as string,
    normalizedName: row.normalized_name as string,
    displayName: row.display_name as string,
    category: row.category as string | null,
    servingSizeDefault: row.serving_size_default as number,
    servingUnitDefault: row.serving_unit_default as string,
    nutritionPer100g: JSON.parse(row.nutrition_per100g as string),
    aliases: JSON.parse(row.aliases as string),
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

// =============================================================================
// USER FOOD CORRECTIONS
// =============================================================================

/**
 * Get user food corrections
 */
export async function getUserCorrections(
  db: D1Database,
  userId: string
): Promise<UserFoodCorrection[]> {
  const results = await db
    .prepare('SELECT * FROM user_food_corrections WHERE user_id = ? ORDER BY use_count DESC')
    .bind(userId)
    .all();
  
  return (results.results as Record<string, unknown>[]).map(row => ({
    id: row.id as string,
    userId: row.user_id as string,
    normalizedFoodName: row.normalized_food_name as string,
    correctedNutrition: JSON.parse(row.corrected_nutrition as string),
    isFavorite: Boolean(row.is_favorite),
    useCount: row.use_count as number,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  }));
}

/**
 * Get user correction for specific food
 */
export async function getUserCorrectionForFood(
  db: D1Database,
  userId: string,
  normalizedFoodName: string
): Promise<UserFoodCorrection | null> {
  const result = await db
    .prepare(
      'SELECT * FROM user_food_corrections WHERE user_id = ? AND normalized_food_name = ?'
    )
    .bind(userId, normalizedFoodName)
    .first();
  
  if (!result) return null;
  
  const row = result as Record<string, unknown>;
  return {
    id: row.id as string,
    userId: row.user_id as string,
    normalizedFoodName: row.normalized_food_name as string,
    correctedNutrition: JSON.parse(row.corrected_nutrition as string),
    isFavorite: Boolean(row.is_favorite),
    useCount: row.use_count as number,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

/**
 * Upsert user food correction
 */
export async function upsertUserCorrection(
  db: D1Database,
  userId: string,
  normalizedFoodName: string,
  correctedNutrition: NutritionValues,
  isFavorite: boolean = false
): Promise<void> {
  const existing = await getUserCorrectionForFood(db, userId, normalizedFoodName);
  const now = Math.floor(Date.now() / 1000);
  
  if (existing) {
    await db
      .prepare(`
        UPDATE user_food_corrections 
        SET corrected_nutrition = ?, is_favorite = ?, use_count = use_count + 1, updated_at = ?
        WHERE id = ?
      `)
      .bind(JSON.stringify(correctedNutrition), isFavorite ? 1 : 0, now, existing.id)
      .run();
  } else {
    const id = generateUUID();
    await db
      .prepare(`
        INSERT INTO user_food_corrections (id, user_id, normalized_food_name, corrected_nutrition, is_favorite, use_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?)
      `)
      .bind(id, userId, normalizedFoodName, JSON.stringify(correctedNutrition), isFavorite ? 1 : 0, now, now)
      .run();
  }
}

// =============================================================================
// MEAL ANALYSIS QUERIES
// =============================================================================

/**
 * Create a new meal analysis
 */
export async function createMealAnalysis(
  db: D1Database,
  data: {
    userId: string;
    imageR2Key?: string | null;
    imageHash?: string | null;
    mealType?: MealType | null;
    idempotencyKey: string;
  }
): Promise<MealAnalysis> {
  const id = generateUUID();
  const now = Math.floor(Date.now() / 1000);
  
  await db
    .prepare(`
      INSERT INTO meal_analyses (id, user_id, image_r2_key, image_hash, status, meal_type, idempotency_key, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'pending_upload', ?, ?, ?, ?)
    `)
    .bind(
      id,
      data.userId,
      data.imageR2Key ?? null,
      data.imageHash ?? null,
      data.mealType ?? null,
      data.idempotencyKey,
      now,
      now
    )
    .run();
  
  const result = await getMealAnalysisById(db, id);
  if (!result) throw new Error('Failed to create meal analysis');
  return result;
}

/**
 * Get meal analysis by ID
 */
export async function getMealAnalysisById(
  db: D1Database,
  id: string
): Promise<MealAnalysis | null> {
  const result = await db
    .prepare('SELECT * FROM meal_analyses WHERE id = ?')
    .bind(id)
    .first();
  
  if (!result) return null;
  
  return rowToMealAnalysis(result as Record<string, unknown>);
}

/**
 * Get meal analysis by idempotency key
 */
export async function getMealAnalysisByIdempotencyKey(
  db: D1Database,
  idempotencyKey: string
): Promise<MealAnalysis | null> {
  const result = await db
    .prepare('SELECT * FROM meal_analyses WHERE idempotency_key = ? ORDER BY created_at DESC LIMIT 1')
    .bind(idempotencyKey)
    .first();
  
  if (!result) return null;
  
  return rowToMealAnalysis(result as Record<string, unknown>);
}

/**
 * Update meal analysis status
 */
export async function updateMealAnalysisStatus(
  db: D1Database,
  id: string,
  status: MealAnalysisStatus,
  updates?: Partial<{
    result: MealAnalysisResult | null;
    overallConfidence: number | null;
    aiModel: string | null;
    promptVersion: string | null;
    errorCategory: string | null;
    errorMessage: string | null;
  }>
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const completedAt = (status === 'completed' || status === 'failed' || status === 'needs_review') ? now : null;
  
  const setClauses = ['status = ?', 'updated_at = ?'];
  const bindings: (string | number | null)[] = [status, now];
  
  if (completedAt) {
    setClauses.push('completed_at = ?');
    bindings.push(completedAt);
  }
  
  if (updates?.result !== undefined) {
    setClauses.push('result = ?');
    bindings.push(JSON.stringify(updates.result));
  }
  
  if (updates?.overallConfidence !== undefined) {
    setClauses.push('overall_confidence = ?');
    bindings.push(updates.overallConfidence);
  }
  
  if (updates?.aiModel !== undefined) {
    setClauses.push('ai_model = ?');
    bindings.push(updates.aiModel);
  }
  
  if (updates?.promptVersion !== undefined) {
    setClauses.push('prompt_version = ?');
    bindings.push(updates.promptVersion);
  }
  
  if (updates?.errorCategory !== undefined) {
    setClauses.push('error_category = ?');
    bindings.push(updates.errorCategory);
  }
  
  if (updates?.errorMessage !== undefined) {
    setClauses.push('error_message = ?');
    bindings.push(updates.errorMessage);
  }
  
  bindings.push(id);
  
  await db
    .prepare(`UPDATE meal_analyses SET ${setClauses.join(', ')} WHERE id = ?`)
    .bind(...bindings)
    .run();
}

/**
 * Increment processing attempts
 */
export async function incrementAnalysisAttempts(db: D1Database, id: string): Promise<void> {
  await db
    .prepare('UPDATE meal_analyses SET processing_attempts = processing_attempts + 1 WHERE id = ?')
    .bind(id)
    .run();
}

/**
 * Get analysis items for an analysis
 */
export async function getAnalysisItems(
  db: D1Database,
  analysisId: string
): Promise<MealAnalysisItem[]> {
  const results = await db
    .prepare('SELECT * FROM meal_analysis_items WHERE analysis_id = ? ORDER BY order_index')
    .bind(analysisId)
    .all();
  
  return (results.results as Record<string, unknown>[]).map(rowToMealAnalysisItem);
}

/**
 * Save analysis items
 */
export async function saveAnalysisItems(
  db: D1Database,
  analysisId: string,
  items: MealAnalysisItem[]
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  
  // Delete existing items
  await db.prepare('DELETE FROM meal_analysis_items WHERE analysis_id = ?').bind(analysisId).run();
  
  // Insert new items
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    await db
      .prepare(`
        INSERT INTO meal_analysis_items 
        (id, analysis_id, name, normalized_name, estimated_quantity, unit, confidence, nutrition, food_id, source, user_override, warnings, order_index)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        item.id,
        analysisId,
        item.name,
        item.normalizedName ?? null,
        item.estimatedQuantity,
        item.unit,
        item.confidence,
        JSON.stringify(item.nutrition),
        item.foodId ?? null,
        item.source,
        item.userOverride ? JSON.stringify(item.userOverride) : null,
        JSON.stringify(item.warnings),
        i
      )
      .run();
  }
}

/**
 * Helper to convert database row to MealAnalysis
 */
function rowToMealAnalysis(row: Record<string, unknown>): MealAnalysis {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    imageR2Key: row.image_r2_key as string | null,
    imageHash: row.image_hash as string | null,
    status: row.status as MealAnalysisStatus,
    mealType: row.meal_type as MealType | null,
    mealName: row.meal_name as string | null,
    result: row.result ? JSON.parse(row.result as string) : null,
    overallConfidence: row.overall_confidence as number | null,
    aiModel: row.ai_model as string | null,
    promptVersion: row.prompt_version as string | null,
    processingAttempts: row.processing_attempts as number,
    errorCategory: row.error_category as string | null,
    errorMessage: row.error_message as string | null,
    idempotencyKey: row.idempotency_key as string,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
    completedAt: row.completed_at as number | null,
  };
}

/**
 * Helper to convert database row to MealAnalysisItem
 */
function rowToMealAnalysisItem(row: Record<string, unknown>): MealAnalysisItem {
  return {
    id: row.id as string,
    name: row.name as string,
    normalizedName: row.normalized_name as string | null,
    estimatedQuantity: row.estimated_quantity as number,
    unit: row.unit as string,
    confidence: row.confidence as number,
    nutrition: JSON.parse(row.nutrition as string),
    foodId: row.food_id as string | null,
    source: row.source as NutritionSource,
    userOverride: row.user_override ? JSON.parse(row.user_override as string) : null,
    warnings: JSON.parse(row.warnings as string),
  };
}

// =============================================================================
// MEAL QUERIES
// =============================================================================

/**
 * Create a new meal
 */
export async function createMeal(
  db: D1Database,
  data: {
    userId: string;
    date: string;
    timezone: string;
    mealType: MealType;
    name: string;
    imageR2Key?: string | null;
    imageHash?: string | null;
    notes?: string | null;
    totalNutrition: NutritionValues;
    items: Omit<MealItem, 'id' | 'mealId'>[];
    source: 'manual' | 'ai_analysis';
    analysisId?: string | null;
  }
): Promise<Meal> {
  const mealId = generateUUID();
  const now = Math.floor(Date.now() / 1000);
  
  await db
    .prepare(`
      INSERT INTO meals (id, user_id, date, timezone, meal_type, name, image_r2_key, image_hash, notes, total_nutrition, source, analysis_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      mealId,
      data.userId,
      data.date,
      data.timezone,
      data.mealType,
      data.name,
      data.imageR2Key ?? null,
      data.imageHash ?? null,
      data.notes ?? null,
      JSON.stringify(data.totalNutrition),
      data.source,
      data.analysisId ?? null,
      now,
      now
    )
    .run();
  
  // Insert meal items
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    const itemId = generateUUID();
    await db
      .prepare(`
        INSERT INTO meal_items (id, meal_id, name, normalized_name, quantity, unit, nutrition, source, food_id, order_index, user_override)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        itemId,
        mealId,
        item.name,
        item.normalizedName ?? null,
        item.quantity,
        item.unit,
        JSON.stringify(item.nutrition),
        item.source,
        item.foodId ?? null,
        i,
        item.userOverride ? JSON.stringify(item.userOverride) : null
      )
      .run();
  }
  
  // Update daily summary
  await updateDailySummary(db, data.userId, data.date, data.timezone);
  
  const result = await getMealById(db, mealId);
  if (!result) throw new Error('Failed to create meal');
  return result;
}

/**
 * Get meal by ID
 */
export async function getMealById(db: D1Database, id: string): Promise<Meal | null> {
  const mealResult = await db
    .prepare('SELECT * FROM meals WHERE id = ? AND deleted_at IS NULL')
    .bind(id)
    .first();
  
  if (!mealResult) return null;
  
  const items = await getMealItems(db, id);
  
  return rowToMeal(mealResult as Record<string, unknown>, items);
}

/**
 * Get meal items
 */
export async function getMealItems(db: D1Database, mealId: string): Promise<MealItem[]> {
  const results = await db
    .prepare('SELECT * FROM meal_items WHERE meal_id = ? ORDER BY order_index')
    .bind(mealId)
    .all();
  
  return (results.results as Record<string, unknown>[]).map(row => ({
    id: row.id as string,
    mealId: row.meal_id as string,
    name: row.name as string,
    normalizedName: row.normalized_name as string | null,
    quantity: row.quantity as number,
    unit: row.unit as string,
    nutrition: JSON.parse(row.nutrition as string),
    source: row.source as NutritionSource,
    foodId: row.food_id as string | null,
    orderIndex: row.order_index as number,
    userOverride: row.user_override ? JSON.parse(row.user_override as string) : null,
  }));
}

/**
 * List meals for a user within a date range
 */
export async function listMeals(
  db: D1Database,
  userId: string,
  startDate: string,
  endDate: string,
  mealType?: MealType,
  limit: number = 20,
  offset: number = 0
): Promise<{ meals: Meal[]; total: number }> {
  let whereClause = 'user_id = ? AND date >= ? AND date <= ? AND deleted_at IS NULL';
  const bindings: (string | number)[] = [userId, startDate, endDate];
  
  if (mealType) {
    whereClause += ' AND meal_type = ?';
    bindings.push(mealType);
  }
  
  // Get total count
  const countResult = await db
    .prepare(`SELECT COUNT(*) as count FROM meals WHERE ${whereClause}`)
    .bind(...bindings)
    .first() as { count: number };
  
  // Get meals
  bindings.push(limit, offset);
  const results = await db
    .prepare(`
      SELECT * FROM meals 
      WHERE ${whereClause}
      ORDER BY date DESC, created_at DESC
      LIMIT ? OFFSET ?
    `)
    .bind(...bindings)
    .all();
  
  const meals: Meal[] = [];
  for (const row of results.results as Record<string, unknown>[]) {
    const items = await getMealItems(db, row.id as string);
    meals.push(rowToMeal(row, items));
  }
  
  return {
    meals,
    total: countResult.count,
  };
}

/**
 * Get meals for user on a specific date
 */
export async function getMealsForDate(
  db: D1Database,
  userId: string,
  date: string
): Promise<Meal[]> {
  const results = await db
    .prepare('SELECT * FROM meals WHERE user_id = ? AND date = ? AND deleted_at IS NULL ORDER BY meal_type')
    .bind(userId, date)
    .all();
  
  const meals: Meal[] = [];
  for (const row of results.results as Record<string, unknown>[]) {
    const items = await getMealItems(db, row.id as string);
    meals.push(rowToMeal(row, items));
  }
  
  return meals;
}

/**
 * Delete meal (soft delete)
 */
export async function deleteMeal(db: D1Database, id: string, userId: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  
  await db
    .prepare('UPDATE meals SET deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ?')
    .bind(now, now, id, userId)
    .run();
  
  // Update daily summary
  const meal = await db
    .prepare('SELECT date FROM meals WHERE id = ?')
    .bind(id)
    .first() as { date: string } | null;
  
  if (meal) {
    await updateDailySummary(db, userId, meal.date, 'UTC');
  }
}

/**
 * Helper to convert database row to Meal
 */
function rowToMeal(row: Record<string, unknown>, items: MealItem[]): Meal {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    date: row.date as string,
    timezone: row.timezone as string,
    mealType: row.meal_type as MealType,
    name: row.name as string,
    imageR2Key: row.image_r2_key as string | null,
    imageHash: row.image_hash as string | null,
    notes: row.notes as string | null,
    totalNutrition: JSON.parse(row.total_nutrition as string),
    items,
    analysisId: row.analysis_id as string | null,
    source: row.source as 'manual' | 'ai_analysis',
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
    deletedAt: row.deleted_at as number | null,
  };
}

// =============================================================================
// MEAL PLAN QUERIES
// =============================================================================

/**
 * Get or create meal plan for a date
 */
export async function getOrCreateMealPlan(
  db: D1Database,
  userId: string,
  date: string,
  timezone: string = 'UTC'
): Promise<MealPlan> {
  const existing = await getMealPlanByDate(db, userId, date);
  if (existing) return existing;
  
  const planId = generateUUID();
  const now = Math.floor(Date.now() / 1000);
  
  await db
    .prepare(`
      INSERT INTO meal_plans (id, user_id, date, timezone, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?)
    `)
    .bind(planId, userId, date, timezone, now, now)
    .run();
  
  // Create default entries for each meal type
  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  for (let i = 0; i < mealTypes.length; i++) {
    const entryId = generateUUID();
    await db
      .prepare(`
        INSERT INTO meal_plan_entries (id, plan_id, meal_type, target_nutrition, suggested_foods, order_index, created_at, updated_at)
        VALUES (?, ?, ?, '{}', '[]', ?, ?, ?)
      `)
      .bind(entryId, planId, mealTypes[i], i, now, now)
      .run();
  }
  
  const result = await getMealPlanByDate(db, userId, date);
  if (!result) throw new Error('Failed to create meal plan');
  return result;
}

/**
 * Get meal plan by date
 */
export async function getMealPlanByDate(
  db: D1Database,
  userId: string,
  date: string
): Promise<MealPlan | null> {
  const planResult = await db
    .prepare('SELECT * FROM meal_plans WHERE user_id = ? AND date = ?')
    .bind(userId, date)
    .first();
  
  if (!planResult) return null;
  
  const planRow = planResult as Record<string, unknown>;
  const entries = await getMealPlanEntries(db, planRow.id as string);
  
  return {
    id: planRow.id as string,
    userId: planRow.user_id as string,
    date: planRow.date as string,
    timezone: planRow.timezone as string,
    status: planRow.status as 'active' | 'completed' | 'archived',
    entries,
    createdAt: planRow.created_at as number,
    updatedAt: planRow.updated_at as number,
  };
}

/**
 * Get meal plan entries
 */
export async function getMealPlanEntries(
  db: D1Database,
  planId: string
): Promise<MealPlanEntry[]> {
  const results = await db
    .prepare('SELECT * FROM meal_plan_entries WHERE plan_id = ? ORDER BY order_index')
    .bind(planId)
    .all();
  
  return (results.results as Record<string, unknown>[]).map(row => ({
    id: row.id as string,
    planId: row.plan_id as string,
    mealType: row.meal_type as MealType,
    targetTime: row.target_time as string | null,
    targetNutrition: JSON.parse(row.target_nutrition as string),
    suggestedFoods: JSON.parse(row.suggested_foods as string),
    isLocked: Boolean(row.is_locked),
    lockedBy: row.locked_by as 'user' | 'system' | null,
    orderIndex: row.order_index as number,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  }));
}

/**
 * Update meal plan entry
 */
export async function updateMealPlanEntry(
  db: D1Database,
  entryId: string,
  updates: Partial<{
    targetNutrition: NutritionValues;
    suggestedFoods: string[];
    isLocked: boolean;
    lockedBy: 'user' | 'system' | null;
  }>
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const setClauses = ['updated_at = ?'];
  const bindings: (string | number | null)[] = [now];
  
  if (updates.targetNutrition !== undefined) {
    setClauses.push('target_nutrition = ?');
    bindings.push(JSON.stringify(updates.targetNutrition));
  }
  
  if (updates.suggestedFoods !== undefined) {
    setClauses.push('suggested_foods = ?');
    bindings.push(JSON.stringify(updates.suggestedFoods));
  }
  
  if (updates.isLocked !== undefined) {
    setClauses.push('is_locked = ?');
    bindings.push(updates.isLocked ? 1 : 0);
  }
  
  if (updates.lockedBy !== undefined) {
    setClauses.push('locked_by = ?');
    bindings.push(updates.lockedBy);
  }
  
  bindings.push(entryId);
  
  await db
    .prepare(`UPDATE meal_plan_entries SET ${setClauses.join(', ')} WHERE id = ?`)
    .bind(...bindings)
    .run();
}

// =============================================================================
// NUTRITION TARGETS QUERIES
// =============================================================================

/**
 * Get user's active nutrition targets
 */
export async function getUserNutritionTargets(
  db: D1Database,
  userId: string
): Promise<NutritionTargetsRecord | null> {
  const result = await db
    .prepare('SELECT * FROM nutrition_targets WHERE user_id = ? AND is_active = 1')
    .bind(userId)
    .first();
  
  if (!result) return null;
  
  const row = result as Record<string, unknown>;
  return {
    id: row.id as string,
    userId: row.user_id as string,
    targets: JSON.parse(row.targets as string),
    macroTargets: JSON.parse(row.macro_targets as string),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

/**
 * Upsert user's nutrition targets
 */
export async function upsertNutritionTargets(
  db: D1Database,
  userId: string,
  targets: Partial<NutritionTargets>,
  macroTargets?: Partial<MacroTargets>
): Promise<NutritionTargetsRecord> {
  const now = Math.floor(Date.now() / 1000);
  const existing = await getUserNutritionTargets(db, userId);
  
  const currentTargets = existing?.targets ?? {
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
  
  const currentMacros = existing?.macroTargets ?? {
    proteinPercent: 20,
    carbsPercent: 50,
    fatPercent: 30,
  };
  
  const newTargets = { ...currentTargets, ...targets };
  const newMacros = macroTargets ? { ...currentMacros, ...macroTargets } : currentMacros;
  
  if (existing) {
    await db
      .prepare(`
        UPDATE nutrition_targets 
        SET targets = ?, macro_targets = ?, updated_at = ?
        WHERE id = ?
      `)
      .bind(JSON.stringify(newTargets), JSON.stringify(newMacros), now, existing.id)
      .run();
    
    return { ...existing, targets: newTargets, macroTargets: newMacros, updatedAt: now };
  } else {
    const id = generateUUID();
    await db
      .prepare(`
        INSERT INTO nutrition_targets (id, user_id, targets, macro_targets, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, ?, ?)
      `)
      .bind(id, userId, JSON.stringify(newTargets), JSON.stringify(newMacros), now, now)
      .run();
    
    return {
      id,
      userId,
      targets: newTargets,
      macroTargets: newMacros,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  }
}

// =============================================================================
// DAILY SUMMARY QUERIES
// =============================================================================

/**
 * Get or create daily nutrition summary
 */
export async function getOrCreateDailySummary(
  db: D1Database,
  userId: string,
  date: string,
  timezone: string = 'UTC'
): Promise<DailyNutritionSummary | null> {
  const result = await db
    .prepare('SELECT * FROM daily_nutrition_summaries WHERE user_id = ? AND date = ?')
    .bind(userId, date)
    .first();
  
  if (result) {
    const row = result as Record<string, unknown>;
    return rowToDailySummary(row);
  }
  
  // Calculate from meals
  const meals = await getMealsForDate(db, userId, date);
  return calculateDailySummary(db, userId, date, timezone, meals);
}

/**
 * Update daily summary from meals
 */
export async function updateDailySummary(
  db: D1Database,
  userId: string,
  date: string,
  timezone: string = 'UTC'
): Promise<void> {
  const meals = await getMealsForDate(db, userId, date);
  const summary = calculateDailySummary(db, userId, date, timezone, meals);
  
  const existing = await db
    .prepare('SELECT id FROM daily_nutrition_summaries WHERE user_id = ? AND date = ?')
    .bind(userId, date)
    .first();
  
  const now = Math.floor(Date.now() / 1000);
  
  if (existing) {
    await db
      .prepare(`
        UPDATE daily_nutrition_summaries 
        SET total_nutrition = ?, meal_count = ?, updated_at = ?
        WHERE user_id = ? AND date = ?
      `)
      .bind(
        JSON.stringify(summary.totalNutrition),
        summary.mealCount,
        now,
        userId,
        date
      )
      .run();
  } else {
    const id = generateUUID();
    await db
      .prepare(`
        INSERT INTO daily_nutrition_summaries (id, user_id, date, timezone, total_nutrition, meal_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(id, userId, date, timezone, JSON.stringify(summary.totalNutrition), summary.mealCount, now, now)
      .run();
  }
}

/**
 * Calculate daily summary from meals
 */
function calculateDailySummary(
  db: D1Database,
  userId: string,
  date: string,
  timezone: string,
  meals: Meal[]
): DailyNutritionSummary {
  const totalNutrition: NutritionValues = {
    caloriesKcal: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    fiberG: 0,
    sugarG: 0,
    sodiumMg: 0,
  };
  
  for (const meal of meals) {
    totalNutrition.caloriesKcal += meal.totalNutrition.caloriesKcal;
    totalNutrition.proteinG += meal.totalNutrition.proteinG;
    totalNutrition.carbsG += meal.totalNutrition.carbsG;
    totalNutrition.fatG += meal.totalNutrition.fatG;
    totalNutrition.fiberG += meal.totalNutrition.fiberG;
    totalNutrition.sugarG += meal.totalNutrition.sugarG;
    totalNutrition.sodiumMg += meal.totalNutrition.sodiumMg;
  }
  
  // Get targets for remaining calculation
  const targets = getUserNutritionTargetsSync(db, userId);
  
  let planTarget: NutritionValues | null = null;
  if (targets) {
    planTarget = {
      caloriesKcal: targets.targets.caloriesKcal,
      proteinG: targets.targets.proteinG,
      carbsG: targets.targets.carbsG,
      fatG: targets.targets.fatG,
      fiberG: targets.targets.fiberG,
      sugarG: targets.targets.sugarG,
      sodiumMg: targets.targets.sodiumMg,
    };
  }
  
  const remainingNutrition = planTarget
    ? {
        caloriesKcal: Math.max(0, planTarget.caloriesKcal - totalNutrition.caloriesKcal),
        proteinG: Math.max(0, planTarget.proteinG - totalNutrition.proteinG),
        carbsG: Math.max(0, planTarget.carbsG - totalNutrition.carbsG),
        fatG: Math.max(0, planTarget.fatG - totalNutrition.fatG),
        fiberG: Math.max(0, planTarget.fiberG - totalNutrition.fiberG),
        sugarG: Math.max(0, planTarget.sugarG - totalNutrition.sugarG),
        sodiumMg: Math.max(0, planTarget.sodiumMg - totalNutrition.sodiumMg),
      }
    : { ...totalNutrition };
  
  // Calculate macro percentages
  const totalMacroGrams = totalNutrition.proteinG + totalNutrition.carbsG + totalNutrition.fatG;
  const macroPercentages = totalMacroGrams > 0
    ? {
        proteinPercent: Math.round((totalNutrition.proteinG / totalMacroGrams) * 100),
        carbsPercent: Math.round((totalNutrition.carbsG / totalMacroGrams) * 100),
        fatPercent: Math.round((totalNutrition.fatG / totalMacroGrams) * 100),
      }
    : { proteinPercent: 0, carbsPercent: 0, fatPercent: 0 };
  
  // Calculate target adherence
  const targetAdherence = planTarget
    ? {
        caloriesPercent: planTarget.caloriesKcal > 0 
          ? Math.round((totalNutrition.caloriesKcal / planTarget.caloriesKcal) * 100)
          : 0,
        proteinPercent: planTarget.proteinG > 0 
          ? Math.round((totalNutrition.proteinG / planTarget.proteinG) * 100)
          : 0,
        carbsPercent: planTarget.carbsG > 0 
          ? Math.round((totalNutrition.carbsG / planTarget.carbsG) * 100)
          : 0,
        fatPercent: planTarget.fatG > 0 
          ? Math.round((totalNutrition.fatG / planTarget.fatG) * 100)
          : 0,
      }
    : { caloriesPercent: 0, proteinPercent: 0, carbsPercent: 0, fatPercent: 0 };
  
  return {
    date,
    timezone,
    totalNutrition,
    mealCount: meals.length,
    remainingNutrition,
    macroPercentages,
    targetAdherence,
  };
}

/**
 * Sync get user nutrition targets
 */
function getUserNutritionTargetsSync(db: D1Database, userId: string): NutritionTargetsRecord | null {
  const result = db
    .prepare('SELECT * FROM nutrition_targets WHERE user_id = ? AND is_active = 1')
    .bind(userId)
    .first();
  
  if (!result) return null;
  
  const row = result as Record<string, unknown>;
  return {
    id: row.id as string,
    userId: row.user_id as string,
    targets: JSON.parse(row.targets as string),
    macroTargets: JSON.parse(row.macro_targets as string),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

/**
 * Helper to convert database row to DailyNutritionSummary
 */
function rowToDailySummary(row: Record<string, unknown>): DailyNutritionSummary {
  const totalNutrition = JSON.parse(row.total_nutrition as string);
  const remainingNutrition: NutritionValues = {
    caloriesKcal: Math.max(0, (row.plan_target ? JSON.parse(row.plan_target as string).caloriesKcal : 0) - totalNutrition.caloriesKcal),
    proteinG: Math.max(0, (row.plan_target ? JSON.parse(row.plan_target as string).proteinG : 0) - totalNutrition.proteinG),
    carbsG: Math.max(0, (row.plan_target ? JSON.parse(row.plan_target as string).carbsG : 0) - totalNutrition.carbsG),
    fatG: Math.max(0, (row.plan_target ? JSON.parse(row.plan_target as string).fatG : 0) - totalNutrition.fatG),
    fiberG: Math.max(0, (row.plan_target ? JSON.parse(row.plan_target as string).fiberG : 0) - totalNutrition.fiberG),
    sugarG: Math.max(0, (row.plan_target ? JSON.parse(row.plan_target as string).sugarG : 0) - totalNutrition.sugarG),
    sodiumMg: Math.max(0, (row.plan_target ? JSON.parse(row.plan_target as string).sodiumMg : 0) - totalNutrition.sodiumMg),
  };
  
  const totalMacroGrams = totalNutrition.proteinG + totalNutrition.carbsG + totalNutrition.fatG;
  const planTarget = row.plan_target ? JSON.parse(row.plan_target as string) : null;
  
  return {
    date: row.date as string,
    timezone: row.timezone as string,
    totalNutrition,
    mealCount: row.meal_count as number,
    remainingNutrition,
    macroPercentages: totalMacroGrams > 0
      ? {
          proteinPercent: Math.round((totalNutrition.proteinG / totalMacroGrams) * 100),
          carbsPercent: Math.round((totalNutrition.carbsG / totalMacroGrams) * 100),
          fatPercent: Math.round((totalNutrition.fatG / totalMacroGrams) * 100),
        }
      : { proteinPercent: 0, carbsPercent: 0, fatPercent: 0 },
    targetAdherence: planTarget
      ? {
          caloriesPercent: planTarget.caloriesKcal > 0 
            ? Math.round((totalNutrition.caloriesKcal / planTarget.caloriesKcal) * 100)
            : 0,
          proteinPercent: planTarget.proteinG > 0 
            ? Math.round((totalNutrition.proteinG / planTarget.proteinG) * 100)
            : 0,
          carbsPercent: planTarget.carbsG > 0 
            ? Math.round((totalNutrition.carbsG / planTarget.carbsG) * 100)
            : 0,
          fatPercent: planTarget.fatG > 0 
            ? Math.round((totalNutrition.fatG / planTarget.fatG) * 100)
            : 0,
        }
      : { caloriesPercent: 0, proteinPercent: 0, carbsPercent: 0, fatPercent: 0 },
  };
}

// =============================================================================
// AI USAGE TRACKING
// =============================================================================

/**
 * Record AI usage
 */
export async function recordAIUsage(
  db: D1Database,
  userId: string
): Promise<void> {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const hour = now.getUTCHours();
  const timestamp = Math.floor(now.getTime() / 1000);
  
  const existing = await db
    .prepare('SELECT id, call_count FROM ai_usage WHERE user_id = ? AND date = ? AND hour = ?')
    .bind(userId, date, hour)
    .first();
  
  if (existing) {
    await db
      .prepare('UPDATE ai_usage SET call_count = call_count + 1, updated_at = ? WHERE id = ?')
      .bind(timestamp, (existing as { id: string }).id)
      .run();
  } else {
    const id = generateUUID();
    await db
      .prepare(`
        INSERT INTO ai_usage (id, user_id, date, hour, call_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, ?, ?)
      `)
      .bind(id, userId, date, hour, timestamp, timestamp)
      .run();
  }
}

/**
 * Get AI usage for user today
 */
export async function getAIUsageToday(
  db: D1Database,
  userId: string
): Promise<{ daily: number; hourly: number }> {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const hour = now.getUTCHours();
  
  // Get daily count
  const dailyResult = await db
    .prepare('SELECT COALESCE(SUM(call_count), 0) as total FROM ai_usage WHERE user_id = ? AND date = ?')
    .bind(userId, date)
    .first() as { total: number };
  
  // Get hourly count
  const hourlyResult = await db
    .prepare('SELECT COALESCE(call_count, 0) as count FROM ai_usage WHERE user_id = ? AND date = ? AND hour = ?')
    .bind(userId, date, hour)
    .first() as { count: number } | null;
  
  return {
    daily: dailyResult.total,
    hourly: hourlyResult?.count ?? 0,
  };
}

// =============================================================================
// CHART DATA QUERIES
// =============================================================================

/**
 * Get chart data for a metric within a date range
 */
export async function getChartData(
  db: D1Database,
  userId: string,
  metric: string,
  startDate: string,
  endDate: string
): Promise<{ date: string; value: number }[]> {
  const results = await db
    .prepare(`
      SELECT date, total_nutrition 
      FROM daily_nutrition_summaries 
      WHERE user_id = ? AND date >= ? AND date <= ?
      ORDER BY date ASC
    `)
    .bind(userId, startDate, endDate)
    .all();
  
  return (results.results as Record<string, unknown>[]).map(row => {
    const nutrition = JSON.parse(row.total_nutrition as string);
    let value = 0;
    
    switch (metric) {
      case 'calories':
        value = nutrition.caloriesKcal;
        break;
      case 'protein':
        value = nutrition.proteinG;
        break;
      case 'carbs':
        value = nutrition.carbsG;
        break;
      case 'fat':
        value = nutrition.fatG;
        break;
      case 'fiber':
        value = nutrition.fiberG;
        break;
      case 'sugar':
        value = nutrition.sugarG;
        break;
      case 'sodium':
        value = nutrition.sodiumMg;
        break;
      default:
        value = 0;
    }
    
    return {
      date: row.date as string,
      value,
    };
  });
}
