// ============================================
// RUST WASM COMPUTE TYPES
// ============================================
import type { Gender } from "./user";
import type { HeartRateZone } from "./workout";
import type { MuscleGroup } from "./body";

export interface WasmFitnessCalculator {
  // BMI calculations
  calculateBMI(weightKg: number, heightCm: number): number;
  getBMICategory(bmi: number): "underweight" | "normal" | "overweight" | "obese";

  // BMR & TDEE
  calculateBMR(weightKg: number, heightCm: number, ageYears: number, isMale: boolean): number;
  calculateTDEE(bmr: number, activityLevel: ActivityLevel): number;
  calculateTargetCalories(tdee: number, goal: Goal): number;

  // Strength calculations
  calculateOneRepMax(weightLifted: number, reps: number): number;
  calculateOneRepMaxBrzycki(weightLifted: number, reps: number): number;
  calculateVolume(weight: number, reps: number, sets: number): number;
  calculateIntensity(weightLifted: number, oneRepMax: number): number;

  // Heart rate
  calculateMaxHeartRate(ageYears: number): number;
  calculateHeartRateZones(restingHR: number, maxHR: number): HeartRateZone[];
  calculateKarvonenZone(restingHR: number, maxHR: number, percentage: number): number;

  // Calories & MET
  calculateCaloriesBurned(weightKg: number, minutes: number, metValue: number): number;

  // Body composition
  calculateBodyFatPercentage(
    age: number,
    gender: Gender,
    bmi: number
  ): "essential" | "athletic" | "fitness" | "average" | "obese";

  // Progress tracking
  calculateProgressPercentage(current: number, target: number, start: number): number;
  calculatePersonalRecordImprovement(currentPr: number, previousPr: number): number;
}

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "lose" | "maintain" | "gain";

// Prompt Compression types (for AI cost optimization)
export interface PromptCompressionResult {
  originalTokens: number;
  compressedTokens: number;
  compressionRatio: number;
  strategy: CompressionStrategy;
  compressedPrompt: string;
  preservedSemantics: boolean;
}

export type CompressionStrategy =
  | "semantic_pruning"
  | "summarization"
  | "deduplication"
  | "keyword_extraction"
  | "sliding_window";

// SVG Heatmap Generator
export interface HeatmapGenerationInput {
  userId: string;
  muscleData: MuscleIntensity[];
  width: number;
  height: number;
  colorScheme: "fire" | "ice" | "rainbow" | "grayscale";
}

export interface MuscleIntensity {
  muscle: MuscleGroup;
  intensity: number; // 0-1
  position: { x: number; y: number }; // Normalized 0-100
}

export interface GeneratedHeatmap {
  svgString: string;
  pngUrl?: string; // R2 stored PNG conversion
  dataPoints: number;
  generationTimeMs: number;
}

// ============================================
// METABOLIC DIGITAL TWIN TYPES
// Predictive body composition simulation
// ============================================

export interface MetabolicDigitalTwinInput {
  historicalData: MetabolicHistoricalPoint[];
  userId: string;
  timeHorizonDays: number;
}

export interface MetabolicHistoricalPoint {
  timestamp: number; // Unix timestamp in ms
  weightKg: number;
  bodyFatPct: number;
  muscleMassKg: number;
  activityLevel?: number;
  calorieIntake?: number;
}

export interface TrendLine {
  slope: number;
  intercept: number;
  rSquared: number;
  stdError: number;
}

export interface Projection {
  daysAhead: number;
  value: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

export interface ScenarioProjection {
  scenarioType: "consistent_performance" | "potential_regression" | "best_case" | "worst_case";
  weightProjections: Projection[];
  bodyFatProjections: Projection[];
  muscleProjections: Projection[];
  overallConfidence: number;
  expectedBehaviorChange: string;
}

export interface CurrentMetrics {
  weightKg: number;
  bodyFatPct: number;
  muscleMassKg: number;
  leanBodyMassKg: number;
  bmi: number;
  activityScore: number;
}

export interface TrendAnalysis {
  weightTrend: TrendLine;
  bodyFatTrend: TrendLine;
  muscleTrend: TrendLine;
  consistencyScore: number; // 0-100
  volatility: number; // daily weight change std dev in kg
  trendStrength: number; // 0-1 average R²
}

export interface ScenarioResults {
  consistentPerformance: ScenarioProjection;
  potentialRegression: ScenarioProjection;
  bestCase: ScenarioProjection;
  worstCase: ScenarioProjection;
}

export interface DigitalTwinResult {
  userId: string;
  generatedAt: number; // timestamp
  timeHorizonDays: number;
  currentMetrics: CurrentMetrics;
  trendAnalysis: TrendAnalysis;
  scenarios: ScenarioResults;
  recommendations: string[];
}
