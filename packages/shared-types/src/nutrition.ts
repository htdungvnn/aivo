// ============================================
// NUTRITION & FOOD LOGGING
// Multi-Agent Nutrition Expert System
// ============================================
import type { Gender } from "./user";
import type { UserGoal } from "./user";
import type { ActivityLevel } from "./compute";

// ============================================
// FOOD DATABASE & LOGGING
// ============================================

/**
 * Food item from nutritional database
 */
export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  servingSize: number; // grams per serving
  servingUnit: string; // "g", "oz", "cup", "tbsp", "tsp", "piece"
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Food item detected by AI vision analysis
 */
export interface DetectedFoodItem {
  name: string;
  confidence: number; // 0-1
  estimatedPortionG: number;
  portionUnit: string; // "g", "oz", "cup", "tbsp", "tsp", "piece"
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  matchedFoodItemId?: string; // If matched to database
}

/**
 * AI Vision analysis result for food image
 */
export interface FoodVisionAnalysis {
  id: string;
  userId: string;
  imageUrl: string;
  detectedItems: DetectedFoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  analysisConfidence: number; // 0-1
  analysisNotes?: string;
  portionEstimationMethod?: "volume_analysis" | "comparison" | "density_calc" | "ai_estimation";
  createdAt: number; // Unix timestamp in milliseconds
}

/**
 * Food log entry - user's recorded food consumption
 */
export interface FoodLog {
  id: string;
  userId: string;
  mealType: MealType; // "breakfast", "lunch", "dinner", "snack", or custom
  foodItemId?: string;
  customName?: string;
  imageUrl?: string;
  estimatedPortionG?: number;
  confidence?: number; // AI confidence if from vision
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  loggedAt: number; // Unix timestamp in milliseconds
  createdAt: number;
}

/**
 * Meal type discriminator - supports standard and custom types
 */
export type MealType =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack"
  | "pre_workout"
  | "post_workout"
  | "custom";

/**
 * Summary of nutrients for a single meal
 */
export interface MealSummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  itemCount: number;
}

/**
 * Daily nutrition summary with targets
 */
export interface DailyNutritionSummary {
  date: string; // ISO date YYYY-MM-DD
  totalCalories: number;
  targetCalories: number;
  totalProtein: number;
  targetProtein: number;
  totalCarbs: number;
  targetCarbs: number;
  totalFat: number;
  targetFat: number;
  totalFiber?: number;
  targetFiber?: number;
  foodLogCount: number;
  meals: {
    breakfast?: MealSummary;
    lunch?: MealSummary;
    dinner?: MealSummary;
    snack?: MealSummary;
    [key: string]: MealSummary | undefined; // For custom meal types
  };
}

/**
 * User's macro targets (can be AI-suggested or manual)
 */
export interface MacroTargets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  source: "ai_suggested" | "manual";
  createdAt: number;
}

// Nutrition API request/response types
export interface UploadImageResponse {
  success: boolean;
  data: {
    imageUrl: string;
    key: string;
    userId: string;
    uploadedAt: string;
  };
}

export interface VisionAnalysisRequest {
  imageUrl: string;
  mealType?: MealType;
}

export interface CreateFromAnalysisRequest {
  analysisId?: string;
  detectedItems: Array<{
    name: string;
    confidence: number;
    estimatedPortionG: number;
    portionUnit: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number;
    sugar_g?: number;
    matchedFoodItemId?: string;
  }>;
  mealType: MealType;
  timestamp?: number;
}

export interface FoodLogCreate {
  mealType: MealType;
  foodItemId?: string;
  customName?: string;
  estimatedPortionG?: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  loggedAt?: number;
}

export interface FoodLogUpdate {
  mealType?: MealType;
  foodItemId?: string;
  customName?: string;
  estimatedPortionG?: number;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  sugar_g?: number;
  loggedAt?: number;
}

// ============================================
// MULTI-AGENT NUTRITION EXPERT
// ============================================

/**
 * Agent types for specialized nutrition consultation
 */
export type NutritionAgentType = "chef" | "medical" | "budget";

/**
 * Request to consult with nutrition agents
 */
export interface NutritionConsultRequest {
  userId: string;
  query: string;
  context: NutritionConsultContext;
  preferredAgents?: NutritionAgentType[]; // If empty, orchestrator routes automatically
  maxResponseTimeMs?: number;
  sessionId?: string; // Optional session tracking for multi-turn conversations
}

/**
 * Contextual information for nutrition consultation
 */
export interface NutritionConsultContext {
  // User profile data (populated from database)
  userProfile?: {
    age?: number;
    gender?: Gender;
    height?: number;
    weight?: number;
    fitnessGoals?: UserGoal[];
    activityLevel?: ActivityLevel;
  };

  // Dietary restrictions & allergies (CRITICAL for medical agent)
  allergies?: string[]; // e.g., ["peanuts", "shellfish", "dairy"]
  intolerances?: string[]; // e.g., ["gluten", "lactose"]
  medicalConditions?: string[]; // e.g., ["diabetes", "hypertension", "celiac"]
  medications?: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
  }>;

  // Budget constraints (for budget agent)
  budget?: {
    daily?: number; // Daily food budget in local currency
    weekly?: number;
    monthly?: number;
    currency: string;
    priceSensitivity: "low" | "medium" | "high";
  };

  // Available ingredients (for chef agent)
  availableIngredients?: Array<{
    name: string;
    quantity: number;
    unit: string;
    expirationDate?: string; // ISO date
    isPerishable: boolean;
  }>;

  // Kitchen capabilities
  kitchenTools?: string[]; // e.g., ["oven", "blender", "microwave", "air_fryer"]
  skillLevel?: "beginner" | "intermediate" | "advanced";

  // Dietary preferences
  dietType?: "omnivore" | "vegetarian" | "vegan" | "pescatarian" | "keto" | "paleo" | "mediterranean";
  macroPreferences?: {
    proteinGrams?: number;
    carbsGrams?: number;
    fatGrams?: number;
    calorieTarget?: number;
  };
}

/**
 * Response from a single agent
 */
export interface AgentResponse {
  agentType: NutritionAgentType;
  success: boolean;
  content: string;
  confidence: number; // 0-1, AI's confidence in the advice
  warnings?: string[]; // e.g., ["This recipe contains peanuts - user is allergic"]
  metadata?: Record<string, unknown>;
  processingTimeMs: number;
}

/**
 * Orchestrated consultation response
 */
export interface NutritionConsultResponse {
  success: boolean;
  sessionId: string;
  userQuery: string;
  agentsConsulted: NutritionAgentType[];
  responses: AgentResponse[];
  synthesizedAdvice: string; // Orchestrator's combined recommendation
  primaryAgent?: NutritionAgentType; // Agent that provided the most relevant response (optional if none)
  warnings: string[]; // Consolidated safety warnings
  processingTimeMs: number;
}

/**
 * Stored consultation record (for database)
 */
export interface StoredNutritionConsult {
  id: string;
  userId: string;
  sessionId: string;
  query: string;
  context: NutritionConsultContext;
  agentsConsulted: NutritionAgentType[];
  responses: AgentResponse[];
  synthesizedAdvice: string;
  warnings: string[];
  processingTimeMs: number;
  createdAt: Date;
  userRating?: number; // 1-5, optional user feedback
  feedback?: string; // Optional user comments
}

// ============================================
// CHEF AGENT TYPES
// ============================================

/**
 * Chef Agent specific types
 */
export interface ChefAgentRequest extends NutritionConsultRequest {
  context: NutritionConsultContext & {
    availableIngredients: NonNullable<NutritionConsultContext["availableIngredients"]>;
    kitchenTools: NonNullable<NutritionConsultContext["kitchenTools"]>;
    skillLevel: NonNullable<NutritionConsultContext["skillLevel"]>;
  };
}

export interface ChefAgentResponse extends AgentResponse {
  agentType: "chef";
  recipe?: Recipe;
  ingredientSubstitutions?: Array<{
    original: string;
    substitute: string;
    reason: string;
  }>;
  missingIngredients?: string[];
  estimatedPrepTimeMinutes?: number;
  estimatedCookTimeMinutes?: number;
  difficultyLevel?: "easy" | "medium" | "hard";
  servings?: number;
  nutritionEstimate?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

/**
 * Generated recipe from Chef Agent
 */
export interface Recipe {
  name: string;
  description: string;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    notes?: string;
  }>;
  instructions: Array<{
    step: number;
    text: string;
    durationMinutes?: number;
    tips?: string[];
  }>;
  tips: string[];
  warnings?: string[]; // e.g., ["Handle raw chicken carefully"]
  storageInstructions?: string;
  reheatingInstructions?: string;
  allergenAlerts?: string[]; // e.g., ["Contains dairy", "May contain traces of nuts"]
  estimatedPrepTimeMinutes?: number;
  estimatedCookTimeMinutes?: number;
}

// ============================================
// MEDICAL AGENT TYPES
// ============================================

/**
 * Medical Agent specific types
 */
export interface MedicalAgentRequest extends NutritionConsultRequest {
  context: NutritionConsultContext & {
    allergies: string[];
    intolerances: string[];
    medicalConditions: string[];
    medications: NonNullable<NutritionConsultContext["medications"]>;
  };
}

export interface MedicalAgentResponse extends AgentResponse {
  agentType: "medical";
  safetyAlerts: SafetyAlert[];
  nutrientWarnings?: NutrientWarning[];
  dietaryModifications?: DietaryModification[];
  consultationNeeded?: boolean;
  consultationReason?: string;
  generalGuidance?: string;
}

export interface SafetyAlert {
  severity: "critical" | "warning" | "info";
  category: "drug_interaction" | "condition_exacerbation" | "nutrient_concern" | "allergy_risk";
  title: string;
  description: string;
  affectedMedications?: string[];
  affectedConditions?: string[];
  recommendation?: string;
}

export interface NutrientWarning {
  nutrient: string;
  currentLevel: string;
  concern: string;
  foodsToLimit?: string[];
  targetRange?: string;
}

export interface DietaryModification {
  condition: string;
  modification: string;
  rationale?: string;
  foodsToEmphasize?: string[];
  foodsToAvoid?: string[];
}

// ============================================
// BUDGET AGENT TYPES
// ============================================

/**
 * Budget Agent specific types
 */
export interface BudgetAgentRequest extends NutritionConsultRequest {
  context: NutritionConsultContext & {
    budget: NonNullable<NutritionConsultContext["budget"]>;
  };
}

export interface BudgetAgentResponse extends AgentResponse {
  agentType: "budget";
  costAnalysis: CostAnalysis;
  savingsOpportunities: SavingsOpportunity[];
  groceryList?: GroceryItem[];
  budgetFriendlyAlternatives?: SavingsOpportunity[];
  mealPrepTips?: MealPrepTip[];
  confidence: number;
}

export interface CostAnalysis {
  estimatedTotalCost: number;
  costPerServing: number;
  servings: number;
  costBreakdown: CostBreakdownItem[];
}

export interface CostBreakdownItem {
  ingredient: string;
  cost: number;
  percentage: number;
  notes?: string;
}

export interface SavingsOpportunity {
  strategy: string;
  potentialSavings: number;
  notes?: string;
}

export interface GroceryItem {
  item: string;
  quantity: string;
  estimatedCost?: number;
  cheaperAlternative?: string;
  buyInBulk: boolean;
}

export type MealPrepTip = string;
