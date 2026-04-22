// ============================================
// AIVO Shared Types - Complete System Schema
// ============================================
// Strict TypeScript definitions for the entire AIVO platform
// No `any` types allowed - full type safety

// ============================================
// SECTION 1: USER & AUTHENTICATION
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  age?: number;
  gender?: Gender;
  height?: number; // in cm
  weight?: number; // in kg
  restingHeartRate?: number;
  maxHeartRate?: number;
  fitnessLevel?: FitnessLevel;
  goals?: UserGoal[];
  picture?: string; // R2 storage URL for profile picture
  createdAt: Date;
  updatedAt: Date;
}

export type Gender = "male" | "female" | "other" | "prefer_not_to_say";

export type FitnessLevel = "beginner" | "intermediate" | "advanced" | "elite";

export type UserGoal =
  | "lose_weight"
  | "gain_muscle"
  | "improve_endurance"
  | "maintain_fitness"
  | "general_health"
  | "increase_strength"
  | "improve_flexibility"
  | "stress_reduction";

export interface OAuthProvider {
  type: "google" | "facebook" | "apple";
  providerId: string;
  email: string;
  name: string;
  picture?: string;
}

export interface LoginRequest {
  token: string;
}

export interface AuthToken {
  token: string;
  refreshToken?: string;
  expiresAt: Date;
}

export interface AuthResponse {
  user: User;
  token: string;
  isNewUser: boolean;
}

// ============================================
// SECTION 2: BODY METRICS & INSIGHTS
// ============================================

export interface BodyMetric {
  id: string;
  userId: string;
  timestamp: number; // Unix timestamp in milliseconds
  weight?: number | null; // kg, nullable in DB
  bodyFatPercentage?: number | null; // 0-100, nullable in DB
  muscleMass?: number | null; // kg, nullable in DB
  boneMass?: number | null; // kg, nullable in DB
  waterPercentage?: number | null; // 0-100, nullable in DB
  bmi?: number | null; // nullable in DB
  waistCircumference?: number | null; // cm, nullable in DB
  chestCircumference?: number | null; // cm, nullable in DB
  hipCircumference?: number | null; // cm, nullable in DB
  source?: "manual" | "ai" | "device";
  notes?: string | null; // nullable in DB
}

// 2D Vector Heatmap data structure
export interface BodyHeatmapData {
  id: string;
  userId: string;
  timestamp: number; // Unix timestamp in milliseconds
  imageUrl?: string; // R2 stored SVG/PNG
  vectorData: HeatmapVectorPoint[];
  metadata?: {
    analysisSource?: "ai_vision" | "manual_input" | "device_sync";
    confidence?: number; // 0-1
    zones?: MuscleZone[];
    analysisId?: string;
    generatedAt?: string;
    pointCount?: number;
  };
}

export interface HeatmapVectorPoint {
  x: number; // 0-100 normalized coordinates
  y: number;
  intensity: number; // 0-1
  muscle: MuscleGroup;
}

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "core"
  | "quadriceps"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "forearms"
  | "neck";

export interface MuscleZone {
  group: MuscleGroup;
  development: "underdeveloped" | "normal" | "overdeveloped";
  imbalanceScore: number; // -100 to 100, negative = weak side
  recommendation?: string;
}

// Body composition estimates from AI vision analysis
export interface BodyCompositionEstimate {
  bodyFatEstimate: number; // 0-1 (percentage)
  muscleMassEstimate: number; // 0-1 (percentage)
  confidence: number; // 0-1 confidence score
}

// AI Vision analysis result
export interface VisionAnalysis {
  id: string;
  userId: string;
  imageUrl: string; // Original image in R2
  processedUrl?: string; // Heatmap overlay in R2
  analysis: {
    posture?: PostureAssessment;
    symmetry?: SymmetryAssessment;
    muscleDevelopment: MuscleDevelopment[];
    riskFactors: RiskFactor[];
    bodyComposition?: BodyCompositionEstimate;
  };
  confidence: number;
  createdAt: number; // Unix timestamp in milliseconds
}

export interface PostureAssessment {
  score: number; // 0-100
  issues: PostureIssue[];
  recommendations: string[];
}

export interface PostureIssue {
  type: "forward_head" | "rounded_shoulders" | "hyperlordosis" | "kyphosis" | "pelvic_tilt";
  severity: "mild" | "moderate" | "severe";
}

export interface SymmetryAssessment {
  overallScore: number;
  imbalances: ImbalanceDetail[];
}

export interface ImbalanceDetail {
  muscleGroup: MuscleGroup;
  percentageDiff: number; // Left vs right difference
  side: "left" | "right";
}

export interface MuscleDevelopment {
  group: MuscleGroup;
  score: number; // 0-100
  percentile: number; // Compared to population
}

export interface RiskFactor {
  factor: string;
  severity: "low" | "medium" | "high";
  description: string;
}

// ============================================
// SECTION 3: WORKOUTS & SCHEDULING
// ============================================

export interface Workout {
  id: string;
  userId: string;
  type: WorkoutType;
  name?: string;
  duration: number; // in minutes
  caloriesBurned?: number;
  startTime: Date;
  endTime: Date;
  notes?: string;
  metrics?: WorkoutMetrics;
  exercises?: WorkoutExercise[];
  createdAt: Date;
  completedAt?: Date;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
}

export type WorkoutType =
  | "strength"
  | "cardio"
  | "hiit"
  | "yoga"
  | "running"
  | "cycling"
  | "swimming"
  | "pilates"
  | "mobility"
  | "sports"
  | "other";

export interface WorkoutMetrics {
  heartRate?: HeartRateData;
  distance?: number; // in km
  pace?: number; // min/km
  power?: number; // watts
  elevation?: number; // meters
  reps?: number;
  sets?: number;
  custom?: Record<string, number>;
}

export interface HeartRateData {
  avg: number;
  min: number;
  max: number;
  zones?: HeartRateZone[];
}

export interface HeartRateZone {
  name: string;
  min: number;
  max: number;
  timeInZone: number; // seconds
}

export interface WorkoutExercise {
  id?: string;
  workoutId: string;
  name: string;
  sets: number;
  reps: number;
  weight?: number; // kg
  restTime?: number; // seconds
  notes?: string;
  order: number;
  rpe?: number; // Rate of Perceived Exertion 1-10
}

// AI Smart Scheduler
export interface DailySchedule {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  workout?: ScheduledWorkout;
  recoveryTasks: RecoveryTask[];
  nutritionGoals?: NutritionGoal[];
  sleepGoal?: SleepGoal;
  generatedBy: "ai" | "manual";
  optimizationScore?: number; // 0-100
  adjustmentsMade: ScheduleAdjustment[];
}

export interface ScheduledWorkout {
  workoutId?: string; // If based on existing template
  templateId?: string;
  customName: string;
  type: WorkoutType;
  duration: number;
  estimatedCalories: number;
  exercises: ScheduledExercise[];
  notes?: string;
}

export interface ScheduledExercise {
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  restTime: number;
  rpeTarget: number;
  notes?: string;
}

export interface RecoveryTask {
  id: string;
  type: "stretching" | "mobility" | "foam_rolling" | "rest" | "active_recovery";
  duration: number; // minutes
  priority: "high" | "medium" | "low";
  completed: boolean;
}

export interface NutritionGoal {
  caloriesTarget: number;
  proteinTarget: number; // grams
  carbsTarget: number;
  fatTarget: number;
  waterTarget: number; // ml
}

export interface SleepGoal {
  targetHours: number;
  targetBedtime?: string; // HH:MM
  targetWakeTime?: string;
}

export interface ScheduleAdjustment {
  reason: string;
  originalPlan: string;
  adjustedPlan: string;
  factor: "recovery" | "scheduling_conflict" | "equipment" | "fatigue" | "preference";
}

// Workout Templates
export interface WorkoutTemplate {
  id: string;
  userId: string;
  name: string;
  type: WorkoutType;
  duration: number;
  exercises: TemplateExercise[];
  tags: string[];
  isPublic: boolean;
  popularity?: number; // for public templates
}

export interface TemplateExercise {
  name: string;
  defaultSets: number;
  defaultReps: number;
  weightProgression?: number; // kg to add each week
  notes?: string;
  order: number;
}

// ============================================
// SECTION 4: AI COACH & CONVERSATIONS
// ============================================

export interface Conversation {
  id: string;
  userId: string;
  message: string;
  response: string;
  context?: string[];
  tokensUsed: number;
  model?: string;
  createdAt: Date;
}

export interface AIRecommendation {
  id: string;
  userId: string;
  type: RecommendationType;
  title: string;
  description: string;
  confidence: number; // 0-1
  reasoning?: string;
  actions: RecommendationAction[];
  expiresAt?: Date;
  isRead: boolean;
  isDismissed: boolean;
  feedback?: RecommendationFeedback;
  createdAt: Date;
}

export type RecommendationType =
  | "workout_suggestion"
  | "recovery_advice"
  | "nutrition_tip"
  | "form_correction"
  | "goal_adjustment"
  | "scheduling_optimization"
  | "injury_prevention"
  | "motivation_boost";

export interface RecommendationAction {
  id: string;
  label: string;
  type: "navigate" | "start_workout" | "update_goal" | "custom";
  payload?: Record<string, unknown>;
}

export interface RecommendationFeedback {
  helpful: boolean;
  rating?: number; // 1-5
  comment?: string;
}

// AI Memory Graph for Retention Engine
export interface MemoryNode {
  id: string;
  userId: string;
  type: MemoryType;
  content: string;
  embedding?: number[]; // Vector embedding for similarity search
  metadata: {
    importance: number; // 0-1
    recency: number; // timestamp weight
    accessCount: number;
    lastAccessed: Date;
    tags: string[];
  };
  relatedNodes: string[]; // Other memory node IDs
}

export type MemoryType =
  | "preference"
  | "achievement"
  | "struggle"
  | "goal_progress"
  | "feedback"
  | "social_interaction"
  | "habit";

export interface MemoryEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  relationship: "related" | "causes" | "contradicts" | "reinforces";
  weight: number; // 0-1
}

// Prompt Compression context
export interface CompressedContext {
  id: string;
  userId: string;
  originalTokens: number;
  compressedTokens: number;
  compressionRatio: number;
  strategy: "semantic_pruning" | "summarization" | "deduplication" | "keyword_extraction";
  context: string[];
  createdAt: Date;
  expiresAt: Date;
}

// ============================================
// SECTION 5: GAMIFICATION & RETENTION
// ============================================

export interface GamificationProfile {
  id: string;
  userId: string;
  totalPoints: number;
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  streak: {
    current: number;
    longest: number;
    lastActivityDate: string; // YYYY-MM-DD
  };
  badges: Badge[];
  achievements: Achievement[];
  leaderboardPosition?: number;
  socialProofCards: SocialProofCard[];
}

export interface Badge {
  id: string;
  type: BadgeType;
  name: string;
  description: string;
  icon: string;
  earnedAt: Date;
  tier: "bronze" | "silver" | "gold" | "platinum";
}

export type BadgeType =
  | "first_workout"
  | "seven_day_streak"
  | "thirty_day_streak"
  | "calorie_master"
  | "early_bird"
  | "night_owl"
  | "social_butterfly"
  | "goal_achiever"
  | "personal_best"
  | "perfect_week"
  | "workout_variety"
  | "consistency_king";

export interface Achievement {
  id: string;
  userId: string;
  type: AchievementType;
  progress: number; // 0-100
  target: number;
  reward: number; // XP points
  completed: boolean;
  completedAt?: Date;
  claimed: boolean;
}

export type AchievementType =
  | "total_workouts"
  | "total_minutes"
  | "total_calories"
  | "consecutive_days"
  | "workout_type_mastery"
  | "personal_record";

// Social Proof Cards for marketing/engagement
export interface SocialProofCard {
  id: string;
  userId: string;
  type: "milestone" | "streak" | "comparison" | "achievement";
  title: string;
  subtitle: string;
  data: {
    value: number;
    label: string;
    comparison?: string; // e.g., "Top 10% of users"
    icon: string;
    color: string;
  };
  shareableImageUrl?: string; // R2 URL
  createdAt: Date;
  isPublic: boolean;
}

// ============================================
// SECTION 6: ACTIVITY EVENTS & TRACKING
// ============================================

export interface ActivityEvent {
  id: string;
  userId: string;
  workoutId?: string;
  type: ActivityEventType;
  payload: Record<string, unknown>;
  clientTimestamp: Date;
  serverTimestamp: Date;
  deviceInfo?: DeviceInfo;
}

export type ActivityEventType =
  | "track_metrics"
  | "heart_rate_zone"
  | "workout_complete"
  | "goal_progress"
  | "app_open"
  | "feature_used"
  | "recommendation_shown"
  | "recommendation_acted";

export interface DeviceInfo {
  platform: "web" | "ios" | "android";
  version: string;
  model?: string;
  os?: string;
}

// Real-time status updates
export interface StatusUpdate {
  userId: string;
  type: "workout_started" | "workout_updated" | "workout_completed" | "metric_update" | "goal_achieved";
  data: Record<string, unknown>;
  timestamp: Date;
}

// ============================================
// SECTION 7: API & INFRASTRUCTURE
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Cloudflare Workers environment bindings
export type Env = {
  DB: unknown;
  AI?: unknown;
  R2?: unknown;
  AUTH_SECRET: string;
};

// ============================================
// SECTION 8: RUST WASM COMPUTE TYPES
// ============================================

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
// SECTION 9: SOCIAL & SHARING
// ============================================

export interface ShareableContent {
  id: string;
  userId: string;
  type: "workout_summary" | "achievement" | "progress" | "social_proof";
  title: string;
  description: string;
  imageUrl: string; // R2 stored image
  platform: "instagram" | "twitter" | "facebook" | "tiktok" | "generic";
  isPublic: boolean;
  likes: number;
  shares: number;
  createdAt: Date;
}

// ============================================
// SECTION 10: ADMIN & MONITORING
// ============================================

export interface SystemMetrics {
  timestamp: Date;
  activeUsers: number;
  newUsers: number;
  workoutsCompleted: number;
  aiRequests: number;
  apiLatency: number; // ms
  errorRate: number; // percentage
  storageUsed: number; // bytes
}

export interface UserAnalytics {
  userId: string;
  engagementScore: number; // 0-100
  retentionRisk: "low" | "medium" | "high";
  predictedLTV: number; // Lifetime value
  churnProbability: number; // 0-1
  preferredCommunication: ("email" | "push" | "in_app")[];
  lastActive: Date;
}

// ============================================
// SECTION 11: MIGRATION TRACKING
// ============================================

export interface MigrationRecord {
  id: string;
  name: string;
  appliedAt: Date;
  hash: string;
  version: number;
}

// ============================================
// TYPE UTILITIES
// ============================================

export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Discriminated union helper
export interface Discriminator<T extends string, V extends Record<string, unknown>> {
  kind: T;
  data: V;
}

// Result type for operations that can fail
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// ============================================
// EXPORT ALL TYPES
// ============================================

// Export type guards
export function isUser(obj: unknown): obj is User {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    "email" in obj &&
    "name" in obj &&
    "createdAt" in obj &&
    "updatedAt" in obj
  );
}

export function isWorkout(obj: unknown): obj is Workout {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    "userId" in obj &&
    "type" in obj &&
    "duration" in obj &&
    "status" in obj
  );
}

export function isActivityEvent(obj: unknown): obj is ActivityEvent {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    "userId" in obj &&
    "type" in obj &&
    "payload" in obj &&
    "clientTimestamp" in obj &&
    "serverTimestamp" in obj
  );
}

// ============================================
// SECTION 12: BODY HEATMAP - SHARED CONSTANTS & UTILITIES
// ============================================

/**
 * Normalized muscle positions (0-100 coordinate system)
 * These positions map to the body outline SVG
 */
export const MUSCLE_POSITIONS: Record<string, { x: number; y: number; zone: string }> = {
  chest: { x: 50, y: 42, zone: "front_torso" },
  chest_upper: { x: 50, y: 35, zone: "front_torso" },
  chest_lower: { x: 50, y: 50, zone: "front_torso" },
  back: { x: 50, y: 55, zone: "back_torso" },
  back_upper: { x: 50, y: 48, zone: "back_torso" },
  back_lower: { x: 50, y: 65, zone: "back_torso" },
  shoulders: { x: 24, y: 38, zone: "front_torso" },
  shoulders_rear: { x: 76, y: 38, zone: "back_torso" },
  biceps: { x: 18, y: 45, zone: "front_arm" },
  triceps: { x: 22, y: 50, zone: "back_arm" },
  forearms: { x: 12, y: 55, zone: "front_arm" },
  abs: { x: 50, y: 62, zone: "front_torso" },
  core: { x: 50, y: 68, zone: "front_torso" },
  obliques: { x: 30, y: 58, zone: "front_torso" },
  quadriceps: { x: 30, y: 82, zone: "front_leg" },
  hamstrings: { x: 30, y: 92, zone: "back_leg" },
  glutes: { x: 38, y: 82, zone: "back_torso" },
  calves: { x: 30, y: 100, zone: "front_leg" },
  neck: { x: 50, y: 15, zone: "front_torso" },
};

/**
 * SVG path data for body outline (front view)
 * Coordinates in 200x400 viewBox
 */
export const BODY_OUTLINE_FRONT = `
  M 50 15
  C 42 15, 35 18, 32 22
  C 29 26, 28 30, 28 35
  C 28 38, 27 40, 25 42
  C 23 44, 20 46, 15 48
  C 10 50, 7 52, 5 56
  C 3 60, 3 65, 4 70
  C 5 75, 6 80, 7 90
  C 8 100, 10 110, 12 120
  M 12 120 C 15 118, 20 115, 25 112
  M 50 15
  C 58 15, 65 18, 68 22
  C 71 26, 72 30, 72 35
  C 72 38, 73 40, 75 42
  C 77 44, 80 46, 85 48
  C 90 50, 93 52, 95 56
  C 97 60, 97 65, 96 70
  C 95 75, 94 80, 93 90
  C 92 100, 90 110, 88 120
  M 88 120 C 85 118, 80 115, 75 112
  M 30 28 C 30 40, 32 55, 32 70
  C 32 85, 30 100, 28 115
  M 70 28 C 70 40, 68 55, 68 70
  C 68 85, 70 100, 72 115
  M 32 115 C 28 118, 20 120, 15 122
  M 68 115 C 72 118, 80 120, 85 122
  M 45 100 C 40 100, 35 105, 32 115
  M 55 100 C 60 100, 65 105, 68 115
`.trim();

/**
 * SVG path data for body outline (back view)
 */
export const BODY_OUTLINE_BACK = `
  M 50 15
  C 42 15, 35 18, 32 22
  C 29 26, 28 30, 28 35
  C 28 38, 27 40, 25 42
  C 23 44, 20 46, 15 48
  C 10 50, 7 52, 5 56
  C 3 60, 3 65, 4 70
  C 5 75, 6 80, 7 90
  C 8 100, 10 110, 12 120
  M 12 120 C 15 118, 20 115, 25 112
  M 50 15
  C 58 15, 65 18, 68 22
  C 71 26, 72 30, 72 35
  C 72 38, 73 40, 75 42
  C 77 44, 80 46, 85 48
  C 90 50, 93 52, 95 56
  C 97 60, 97 65, 96 70
  C 95 75, 94 80, 93 90
  C 92 100, 90 110, 88 120
  M 88 120 C 85 118, 80 115, 75 112
  M 30 32 C 30 45, 32 60, 32 75
  C 32 90, 30 105, 28 120
  M 70 32 C 70 45, 68 60, 68 75
  C 68 90, 70 105, 72 120
  M 32 120 C 28 123, 20 125, 15 127
  M 68 120 C 72 123, 80 125, 85 127
`.trim();

/**
 * Color scale types for heatmap visualization
 */
export type HeatmapColorScale = "heat" | "cool" | "monochrome";

/**
 * Get color for intensity value based on scale
 * @param intensity - Value between 0 and 1
 * @param scale - Color scale to use
 * @returns Object with baseColor and opacity
 */
export function getHeatmapColor(intensity: number, scale: HeatmapColorScale = "heat"): { baseColor: string; opacity: number } {
  const i = Math.max(0, Math.min(1, intensity));
  const opacity = 0.4 + i * 0.5;

  switch (scale) {
    case "cool":
      return { baseColor: "rgba(6, 182, 212, ", opacity };
    case "monochrome":
      return { baseColor: "rgba(255, 255, 255, ", opacity };
    case "heat":
    default:
      if (i < 0.2) { return { baseColor: "rgba(59, 130, 246, ", opacity }; } // blue
      if (i < 0.4) { return { baseColor: "rgba(6, 182, 212, ", opacity }; } // cyan
      if (i < 0.6) { return { baseColor: "rgba(34, 197, 94, ", opacity }; } // green
      if (i < 0.8) { return { baseColor: "rgba(234, 179, 8, ", opacity }; } // yellow
      return { baseColor: "rgba(249, 115, 22, ", opacity }; // orange
  }
}

/**
 * Calculate radius for heatmap point based on intensity
 */
export function getHeatmapRadius(intensity: number, baseRadius: number = 8): number {
  return baseRadius + intensity * 6;
}

/**
 * Aggregate heatmap points by muscle location
 * Groups nearby points and averages their intensities
 */
export function aggregateHeatmapPoints(
  vectorData: Array<{ x: number; y: number; intensity: number; muscle: MuscleGroup }>
): Array<{ x: number; y: number; intensity: number; muscle: MuscleGroup }> {
  const groups: Record<string, { x: number; y: number; count: number; totalIntensity: number }> = {};

  vectorData.forEach((point) => {
    const key = `${point.muscle}_${Math.round(point.x)}_${Math.round(point.y)}`;
    if (!groups[key]) {
      groups[key] = { x: point.x, y: point.y, count: 0, totalIntensity: 0 };
    }
    groups[key].count++;
    groups[key].totalIntensity += point.intensity;
  });

  return Object.values(groups).map((g) => ({
    x: g.x,
    y: g.y,
    intensity: g.totalIntensity / g.count,
    muscle: vectorData.find(
      (p) => Math.abs(p.x - g.x) < 2 && Math.abs(p.y - g.y) < 2
    )?.muscle || ("chest" as MuscleGroup),
  }));
}

// ============================================
// VISION-TO-SVG HEATMAP ENGINE TYPES
// ============================================

/**
 * Pre-defined body zones for SVG heatmap rendering
 * Coordinates are normalized (0-1) relative to SVG viewport
 */
export interface BodyZone {
  id: string;
  name: string;
  bounds: {
    x: number; // 0-1 left offset
    y: number; // 0-1 top offset
    width: number; // 0-1 width
    height: number; // 0-1 height
  };
  muscles: string[]; // Primary muscle groups in this zone
}

export const BODY_ZONES: BodyZone[] = [
  // Upper Body
  {
    id: "chest",
    name: "Chest",
    bounds: { x: 0.35, y: 0.18, width: 0.30, height: 0.15 },
    muscles: ["pectorals", "deltoids_front"],
  },
  {
    id: "back_upper",
    name: "Upper Back",
    bounds: { x: 0.35, y: 0.12, width: 0.30, height: 0.15 },
    muscles: ["trapezius", "deltoids_rear", "lats"],
  },
  {
    id: "shoulders",
    name: "Shoulders",
    bounds: { x: 0.25, y: 0.18, width: 0.50, height: 0.08 },
    muscles: ["deltoids"],
  },
  {
    id: "arms",
    name: "Arms",
    bounds: { x: 0.15, y: 0.20, width: 0.10, height: 0.30 },
    muscles: ["biceps", "triceps", "forearms"],
  },

  // Core
  {
    id: "abs_upper",
    name: "Upper Abs",
    bounds: { x: 0.35, y: 0.32, width: 0.30, height: 0.08 },
    muscles: ["rectus_abdominis"],
  },
  {
    id: "abs_lower",
    name: "Lower Abs",
    bounds: { x: 0.35, y: 0.40, width: 0.30, height: 0.10 },
    muscles: ["rectus_abdominis", "hip_flexors"],
  },
  {
    id: "obliques",
    name: "Obliques",
    bounds: { x: 0.25, y: 0.35, width: 0.50, height: 0.12 },
    muscles: ["obliques", "serratus_anterior"],
  },
  {
    id: "lower_back",
    name: "Lower Back",
    bounds: { x: 0.35, y: 0.28, width: 0.30, height: 0.08 },
    muscles: ["erector_spinae"],
  },

  // Lower Body
  {
    id: "glutes",
    name: "Glutes",
    bounds: { x: 0.35, y: 0.50, width: 0.30, height: 0.12 },
    muscles: ["gluteus_maximus"],
  },
  {
    id: "quads",
    name: "Quadriceps",
    bounds: { x: 0.30, y: 0.62, width: 0.40, height: 0.20 },
    muscles: ["quadriceps"],
  },
  {
    id: "hamstrings",
    name: "Hamstrings",
    bounds: { x: 0.30, y: 0.82, width: 0.40, height: 0.15 },
    muscles: ["hamstrings"],
  },
  {
    id: "calves",
    name: "Calves",
    bounds: { x: 0.35, y: 0.97, width: 0.30, height: 0.10 },
    muscles: ["gastrocnemius", "soleus"],
  },
];

/**
 * Heatmap region data for a specific body zone
 */
export interface HeatmapRegion {
  zoneId: string;
  intensity: number; // 0-100 (fat percentage or lean score, lower is better)
  color: string; // Calculated from intensity
  confidence: number; // 0-1 from vision analysis
}

/**
 * Complete vision analysis result from Claude
 */
export interface VisionAnalysisResult {
  photoId: string;
  pose: "front" | "back" | "side" | "unknown";
  regions: HeatmapRegion[];
  metrics: {
    upperBodyScore: number; // 0-100, lower is better
    coreScore: number;
    lowerBodyScore: number;
    overallScore: number;
  };
  processedAt: string;
}

/**
 * Stored heatmap record (from database)
 */
export interface StoredHeatmap {
  id: string;
  userId: string;
  photoId: string;
  regions: HeatmapRegion[];
  metrics: {
    upperBodyScore: number;
    coreScore: number;
    lowerBodyScore: number;
    overallScore: number;
  };
  createdAt: number;
}

/**
 * Body photo upload record
 */
export interface BodyPhotoRecord {
  id: string;
  userId: string;
  r2Url: string;
  thumbnailUrl?: string;
  uploadDate: number;
  analysisStatus: "pending" | "processing" | "completed" | "failed";
  poseDetected?: boolean;
}

/**
 * Heatmap comparison data showing progress between two measurements
 */
export interface HeatmapComparison {
  current: StoredHeatmap;
  previous?: StoredHeatmap;
  differences: Record<
    string,
    { current: number; previous: number; change: number; trend: "improved" | "regressed" | "stable" }
  >;
}

// ============================================
// SECTION 13: POSTURE ANALYSIS - SHARED CONSTANTS & UTILITIES
// ============================================

/**
 * Posture issue type discriminator
 */
export type PostureIssueType =
  | "forward_head"
  | "rounded_shoulders"
  | "hyperlordosis"
  | "kyphosis"
  | "pelvic_tilt";

/**
 * Severity levels for posture issues
 */
export type SeverityLevel = "mild" | "moderate" | "severe";

/**
 * Human-readable labels and descriptions for posture issues
 */
export const POSTURE_ISSUE_LABELS: Record<PostureIssueType, { label: string; description: string }> = {
  forward_head: {
    label: "Forward Head",
    description: "Head positioned too far forward relative to shoulders"
  },
  rounded_shoulders: {
    label: "Rounded Shoulders",
    description: "Shoulders rolled forward, indicating poor upper back posture"
  },
  hyperlordosis: {
    label: "Hyperlordosis",
    description: "Excessive inward curve of the lower back"
  },
  kyphosis: {
    label: "Kyphosis",
    description: " Excessive outward curve of the upper back (hunching)"
  },
  pelvic_tilt: {
    label: "Pelvic Tilt",
    description: "Anterior or posterior pelvic misalignment"
  },
};

/**
 * Severity color mappings (hex colors)
 */
export const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  mild: "#fbbf24",      // amber-400
  moderate: "#f97316",  // orange-500
  severe: "#ef4444",    // red-500
};

/**
 * Severity background/style mappings for UI
 * Returns platform-agnostic style descriptors
 */
export const SEVERITY_STYLES: Record<SeverityLevel, { bg: string; border: string; text: string }> = {
  mild: { bg: "rgba(251, 191, 36, 0.2)", border: "rgba(251, 191, 36, 0.3)", text: "rgba(251, 191, 36, 1)" },
  moderate: { bg: "rgba(249, 115, 22, 0.2)", border: "rgba(249, 115, 22, 0.3)", text: "rgba(249, 115, 22, 1)" },
  severe: { bg: "rgba(239, 68, 68, 0.2)", border: "rgba(239, 68, 68, 0.3)", text: "rgba(239, 68, 68, 1)" },
};

/**
 * Get score color class/string based on score value
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-blue-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

/**
 * Get human-readable score label
 */
export function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs Work";
}

/**
 * Get gradient class for score bar
 */
export function getScoreGradient(score: number): string {
  return score >= 60
    ? "bg-gradient-to-r from-emerald-500 to-blue-500"
    : "bg-gradient-to-r from-amber-500 to-red-500";
}

// ============================================
// SECTION 14: HEALTH SCORE - SHARED CALCULATIONS
// ============================================

export interface HealthScoreFactors {
  bmi: number;
  bodyFat: number;
  muscleMass: number;
  fitnessLevel: number;
}

export interface HealthScoreResult {
  score: number;
  category: "excellent" | "good" | "fair" | "poor";
  factors: HealthScoreFactors;
  recommendations: string[];
}

/**
 * Calculate health score from metrics and user profile
 * Pure function - no side effects
 */
export function calculateHealthScore(params: {
  bmi?: number;
  bodyFatPercentage?: number;
  muscleMass?: number;
  weight?: number;
  fitnessLevel?: string;
}): HealthScoreResult {
  const factors: HealthScoreFactors = {
    bmi: 0.5,
    bodyFat: 0.5,
    muscleMass: 0.5,
    fitnessLevel: 0.4,
  };

  // BMI scoring (0-1)
  if (params.bmi !== undefined) {
    const bmi = params.bmi;
    if (bmi >= 18.5 && bmi <= 24.9) {
      factors.bmi = 1;
    } else if (bmi >= 25 && bmi <= 29.9) {
      factors.bmi = 0.7;
    } else if (bmi >= 30) {
      factors.bmi = 0.3;
    } else {
      factors.bmi = 0.5;
    }
  }

  // Body fat scoring (0-1)
  if (params.bodyFatPercentage !== undefined) {
    const bf = params.bodyFatPercentage / 100; // Convert to decimal
    if (bf < 0.12) {
      factors.bodyFat = 0.8;
    } else if (bf >= 0.12 && bf <= 0.25) {
      factors.bodyFat = 1;
    } else if (bf > 0.25 && bf <= 0.30) {
      factors.bodyFat = 0.7;
    } else {
      factors.bodyFat = 0.3;
    }
  }

  // Muscle mass scoring (0-1)
  if (params.muscleMass !== undefined && params.weight !== undefined) {
    const muscleRatio = params.muscleMass / params.weight;
    if (muscleRatio >= 0.35 && muscleRatio <= 0.45) {
      factors.muscleMass = 1;
    } else if (muscleRatio >= 0.30 && muscleRatio < 0.35) {
      factors.muscleMass = 0.8;
    } else if (muscleRatio > 0.45 && muscleRatio <= 0.50) {
      factors.muscleMass = 0.9;
    } else {
      factors.muscleMass = 0.5;
    }
  }

  // Fitness level scoring
  const fitnessMap: Record<string, number> = {
    beginner: 0.4,
    intermediate: 0.7,
    advanced: 0.9,
    elite: 1.0,
  };
  factors.fitnessLevel = fitnessMap[params.fitnessLevel || "beginner"] || 0.4;

  // Weighted average
  const weights = { bmi: 0.25, bodyFat: 0.3, muscleMass: 0.3, fitnessLevel: 0.15 };
  const score =
    (factors.bmi * weights.bmi +
      factors.bodyFat * weights.bodyFat +
      factors.muscleMass * weights.muscleMass +
      factors.fitnessLevel * weights.fitnessLevel) *
    100;

  // Determine category
  let category: HealthScoreResult["category"];
  if (score >= 80) {
    category = "excellent";
  } else if (score >= 60) {
    category = "good";
  } else if (score >= 40) {
    category = "fair";
  } else {
    category = "poor";
  }

  // Generate recommendations
  const recommendations: string[] = [];
  if (factors.bmi < 0.7) {
    recommendations.push("Focus on maintaining a healthy weight range through balanced nutrition");
  }
  if (factors.bodyFat < 0.7) {
    recommendations.push("Consider adjusting macronutrient intake to optimize body composition");
  }
  if (factors.muscleMass < 0.7) {
    recommendations.push("Incorporate resistance training to build lean muscle mass");
  }
  if (recommendations.length === 0) {
    recommendations.push("Keep up your excellent health trajectory!");
  }

  return {
    score: Math.round(score * 10) / 10,
    category,
    factors,
    recommendations,
  };
}

// ============================================
// SECTION 15: TIMESTAMP UTILITIES
// ============================================

/**
 * Get current timestamp in milliseconds
 */
export function now(): number {
  return Date.now();
}

/**
 * Convert milliseconds to Unix timestamp (seconds)
 */
export function toUnixTimestamp(ms: number): number {
  return Math.floor(ms / 1000);
}

/**
 * Convert Unix timestamp to Date
 */
export function fromUnixTimestamp(unix: number): Date {
  return new Date(unix * 1000);
}

// ============================================
// SECTION 16: API RESPONSE HELPERS
// ============================================

/**
 * Create a standard API response
 */
export function createApiResponse<T>(
  data: T,
  status: "success" | "error" = "success",
  message?: string
): ApiResponse<T> {
  return {
    success: status === "success",
    data,
    error: status === "error" ? message : undefined,
    message,
    timestamp: new Date(),
  };
}

/**
 * Create an error API response
 */
export function createErrorResponse<T = never>(error: string): ApiResponse<T> {
  return {
    success: false,
    error,
    timestamp: new Date(),
  };
}

// ============================================
// SECTION 17: NUTRITION & FOOD LOGGING
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
// SECTION 18: AI-GENERATED INFOGRAPHICS
// ============================================

/**
 * Infographic template types for social proof content
 */
export type InfographicTemplate =
  | "weekly_summary"
  | "milestone"
  | "streak"
  | "muscle_heatmap"
  | "comparison";

/**
 * Color palette configuration for infographic theming
 */
export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  textMuted: string;
}

/**
 * Typography configuration for infographic rendering
 */
export interface TypographyConfig {
  headlineFont: string;
  bodyFont: string;
  headlineSize: number;
  subheadSize: number;
  bodySize: number;
}

/**
 * Complete infographic configuration
 */
export interface InfographicConfig {
  template: InfographicTemplate;
  theme: "dark" | "light" | "neon" | "ocean" | "sunset" | "vibrant";
  layout: "portrait" | "landscape" | "square";
  colorScheme: ColorPalette;
  typography: TypographyConfig;
  includeStats: string[];
  includeComparison: boolean;
}

/**
 * AI-generated story content for the infographic
 */
export interface InfographicStory {
  headline: string;
  subheadline?: string;
  narrative: string;  // Main "hype" paragraph
  stats: Array<{
    label: string;
    value: string | number;
    unit?: string;
    comparison?: string;  // e.g., "Top 10% of users"
    icon?: string;
  }>;
  callToAction: string;
  funFacts: string[];
  tone: "motivational" | "celebratory" | "educational" | "competitive";
  readingLevel: "easy" | "medium" | "challenging";
}

/**
 * User statistics for infographic generation
 */
export interface UserStats {
  period: {
    startDate: string;  // ISO date YYYY-MM-DD
    endDate: string;    // ISO date YYYY-MM-DD
    type: "weekly" | "monthly" | "all_time";
  };
  workouts: {
    count: number;
    totalMinutes: number;
    totalCalories: number;
    avgDuration: number;
    types: Record<WorkoutType, number>;
    personalRecords: PersonalRecord[];
  };
  strength: {
    totalVolume: number;
    topExercises: Array<{ name: string; volume: number }>;
    estimatedOneRMs: Record<string, number>;
  };
  gamification: {
    streak: number;
    longestStreak: number;
    points: number;
    level: number;
    badges: number;
    leaderboardRank?: number;
    percentile?: number;
  };
  body: {
    weightChange?: number;
    bodyFatChange?: number;
    muscleGain?: number;
    bmi?: number;
    healthScore?: number;
    muscleDevelopment?: Array<{ group: MuscleGroup; score: number }>;
  };
  comparisons: {
    vsAverage: Record<string, number>;
    personalBests: Array<{ metric: string; improvement: number }>;
  };
}

/**
 * Complete infographic data structure
 */
export interface InfographicData {
  id: string;
  userId: string;
  template: InfographicTemplate;
  config: InfographicConfig;
  story: InfographicStory;
  stats: UserStats;
  createdAt: Date;
  shareableImageUrl?: string;  // R2 URL after rendering
  svgContent?: string;  // Raw SVG (for debugging)
  width: number;
  height: number;
}

/**
 * Personal record data
 */
export interface PersonalRecord {
  exercise: string;
  weight: number;
  reps: number;
  date: string;
  previous?: number;
  improvementPercent?: number;
}

/**
 * Render result from WASM infographic generator
 */
export interface InfographicRenderResult {
  svg: string;
  pngBuffer?: Uint8Array;
  pngUrl?: string;
  renderTimeMs: number;
  width: number;
  height: number;
}

// Type alias for convenience
export type InfographicRequest = {
  period: { type: "weekly" | "monthly"; start: string; end?: string };
  template?: string;
  config?: Partial<InfographicConfig>;
};

// ============================================
// SECTION 18: FORM ANALYSIS - AI-POWERED MOVEMENT CORRECTION
// ============================================

/**
 * Supported exercise types for form analysis
 */
export type FormExerciseType = "squat" | "deadlift" | "bench_press" | "overhead_press" | "lunge";

/**
 * Video status lifecycle
 */
export type FormVideoStatus = "pending" | "processing" | "completed" | "failed";

/**
 * Specific movement flaw detected
 */
export type FormIssueType =
  | "knee_valgus"           // Knees cave inward
  | "knee_hyperextension"   // Locked knees
  | "rounded_back"          // Thoracic spine rounding
  | "excessive_lean"        // Excessive forward lean in deadlift
  | "butt_wink"             // Pelvic tuck at bottom of squat
  | "heels_rising"          // Heels lift off ground
  | "incomplete_depth"      // Not hitting parallel in squat
  | "bar_path_deviation"    // Bar moves forward/backward
  | "hip_asymmetry"         // One hip rises before other
  | "shoulder_elevation"    // Shoulders shrugged up
  | "elbow_flare"           // Elbows flare out excessively
  | "head_position"         // Head not neutral (cervical flexion/extension)
  | "asymmetric_extension"; // Unequal limb extension

/**
 * Severity level of detected issue
 */
export type FormIssueSeverity = "minor" | "moderate" | "major";

/**
 * A specific form issue detected in the video
 */
export interface FormIssue {
  type: FormIssueType;
  severity: FormIssueSeverity;
  confidence: number; // 0-1, AI confidence score
  timestampMs: number; // Time in video where issue occurs (milliseconds)
  description: string; // Human-readable explanation
  impact: "performance" | "safety" | "both";
}

/**
 * A correction drill to address a specific issue
 */
export interface FormCorrection {
  issueType: FormIssueType;
  drillName: string;
  description: string;
  steps: string[]; // Array of step-by-step instructions
  cues: string[]; // Verbal cues for the user
  durationSeconds: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  equipment: string[]; // Equipment needed (e.g., "barbell", "resistance band")
}

/**
 * Uploaded video awaiting analysis
 */
export interface FormAnalysisVideo {
  id: string;
  userId: string;
  exerciseType: FormExerciseType;
  status: FormVideoStatus;
  videoKey: string; // R2 key for the uploaded video
  videoUrl: string; // Signed URL for playback
  thumbnailUrl?: string; // Extracted thumbnail frame
  frameCount?: number; // Total frames extracted
  durationSeconds?: number;
  metadata: {
    fileSize: number;
    resolution?: string;
    fps?: number;
    uploadedAt: number;
  };
  createdAt: number;
  updatedAt: number;
}

/**
 * Complete analysis result after AI processing
 */
export interface FormAnalysisReport {
  videoId: string;
  userId: string;
  exerciseType: FormExerciseType;
  status: FormVideoStatus;
  overallScore: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  issues: FormIssue[];
  corrections: FormCorrection[];
  summary: {
    strengths: string[];
    primaryConcern: string;
    priority: "low" | "medium" | "high";
  };
  frameAnalysis?: {
    keyFrames: Array<{
      timestampMs: number;
      url: string; // R2 URL to annotated frame
      issuesPresent: FormIssueType[];
    }>;
  };
  createdAt: number;
  completedAt?: number;
  processingTimeMs?: number;
}

/**
 * Job status for async processing
 */
export interface FormAnalysisJob {
  id: string;
  videoId: string;
  status: "queued" | "processing" | "completed" | "failed";
  attempts: number;
  errorMessage?: string;
  queuedAt: number;
  startedAt?: number;
  completedAt?: number;
}

/**
 * Helper function to calculate overall grade from score
 */
export function calculateFormGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

/**
 * Helper function to get color for score display
 */
export function getFormScoreColor(score: number): string {
  if (score >= 90) return "#10b981"; // green
  if (score >= 80) return "#22c55e"; // light green
  if (score >= 70) return "#eab308"; // yellow
  if (score >= 60) return "#f97316"; // orange
  return "#ef4444"; // red
}

/**
 * Helper function to group issues by type
 */
export function groupIssuesByType(issues: FormIssue[]): Map<FormIssueType, FormIssue[]> {
  const map = new Map<FormIssueType, FormIssue[]>();
  for (const issue of issues) {
    const existing = map.get(issue.type) || [];
    map.set(issue.type, [...existing, issue]);
  }
  return map;
}

/**
 * Helper function to get worst severity from list of issues
 */
export function getWorstSeverity(issues: FormIssue[]): FormIssueSeverity {
  if (issues.length === 0) return "minor";
  const severities: FormIssueSeverity[] = ["minor", "moderate", "major"];
  for (const severity of severities.reverse()) {
    if (issues.some(i => i.severity === severity)) {
      return severity;
    }
  }
  return "minor";
}

// ============================================
// SECTION 19: BIOMETRIC CORRELATION - STRESS & RECOVERY ANALYSIS
// ============================================

/**
 * Sleep log entry - structured sleep tracking with objective metrics
 * Corresponds to sleep_logs table
 */
export interface SleepLog {
  id: string;
  userId: string;
  date: string; // ISO date YYYY-MM-DD
  durationHours: number;
  qualityScore?: number; // 0-100, optional
  deepSleepMinutes?: number;
  remSleepMinutes?: number;
  awakeMinutes?: number;
  bedtime?: string; // HH:MM format
  waketime?: string; // HH:MM format
  consistencyScore?: number; // 0-100, optional
  notes?: string;
  source: "manual" | "device" | "ai";
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Aggregated statistics for a time period (used in BiometricSnapshot)
 */
export interface ExerciseLoadAggregate {
  totalWorkouts: number;
  totalDurationMinutes: number;
  totalCalories: number;
  avgDurationMinutes: number;
  workoutsByType: Record<WorkoutType, number>;
  intensityDistribution: {
    low: number; // % of workouts at low intensity
    moderate: number;
    high: number;
  };
  consecutiveDays: number;
  restDays: number;
  avgRpe?: number; // Average Rate of Perceived Exertion
}

export interface SleepAggregate {
  avgDurationHours: number;
  avgQualityScore?: number;
  avgDeepSleepMinutes?: number;
  avgRemSleepMinutes?: number;
  consistencyScore?: number;
  bedtimeConsistency: number; // 0-1, lower variance = higher score
  qualityVsDurationCorrelation?: number; // Correlation coefficient
  daysWithData: number;
  totalDays: number;
}

export interface NutritionAggregate {
  avgDailyCalories: number;
  targetCalories: number;
  avgDailyProtein: number;
  targetProtein: number;
  avgDailyCarbs: number;
  targetCarbs: number;
  avgDailyFat: number;
  targetFat: number;
  avgDailyFiber?: number;
  targetFiber?: number;
  proteinGoalPct: number; // % of target achieved
  carbsGoalPct: number;
  fatGoalPct: number;
  consistencyScore: number; // 0-100 based on variance
  avgMealCount: number;
  lateNightEatingIncidents: number; // Meals after 9 PM
  hydration?: {
    avgWaterMl: number;
    targetWaterMl: number;
    goalPct: number;
  };
  macroBalanceScore: number; // 0-100 based on ratio balance
}

export interface BodyMetricsAggregate {
  weightChange: number; // kg change over period
  bodyFatChange: number; // percentage points change
  muscleMassChange?: number; // kg change
  bmiChange?: number;
  avgWeight: number;
  avgBodyFat: number;
  measurementsCompleteness: number; // 0-1
}

/**
 * Pre-computed biometric snapshot for a time period
 * Used to avoid expensive on-the-fly correlations for every API call
 * Corresponds to biometric_snapshots table
 */
export interface BiometricSnapshot {
  id: string;
  userId: string;
  period: "7d" | "30d";
  generatedAt: Date;
  validUntil?: Date;
  exerciseLoad: ExerciseLoadAggregate;
  sleep: SleepAggregate;
  nutrition: NutritionAggregate;
  bodyMetrics: BodyMetricsAggregate;
  recoveryScore: number; // 0-100 composite score
  warnings: string[]; // e.g., ["low_sleep", "nutrient_deficit", "overtraining_risk"]
}

/**
 * Correlation finding between two factors
 * Identifies patterns like "recovery drops when eating after 9 PM"
 * Corresponds to correlation_findings table
 */
export interface CorrelationFinding {
  id: string;
  userId: string;
  snapshotId: string;
  factorA: BiometricFactor; // e.g., "sleep_quality" or "late_nutrition"
  factorB: BiometricFactor; // e.g., "recovery_score" or "workout_intensity"
  correlationCoefficient: number; // -1 to 1 (Pearson's r)
  pValue: number; // Statistical significance (0-1, lower = more significant)
  confidence: number; // Combined confidence score (0-1)
  anomalyThreshold: number; // Z-score threshold used for anomaly detection
  anomalyCount: number; // Number of outlier points
  outlierDates: string[]; // ISO dates where anomalies occurred
  explanation: string; // AI-generated plain-language explanation
  actionableInsight: string; // AI-generated recommendation
  detectedAt: Date;
  validUntil?: Date; // Correlations expire after data gets stale
  isDismissed: boolean;
}

/**
 * Factor types that can be correlated
 */
export type BiometricFactor =
  // Sleep factors
  | "sleep_duration"
  | "sleep_quality"
  | "deep_sleep"
  | "rem_sleep"
  | "sleep_consistency"
  | "bedtime"
  // Exercise factors
  | "workout_intensity"
  | "workout_duration"
  | "consecutive_days"
  | "rest_days"
  | "exercise_variety"
  | "rpe_average"
  // Nutrition factors
  | "calorie_deficit"
  | "protein_intake"
  | "carb_intake"
  | "fat_intake"
  | "macro_balance"
  | "late_nutrition"
  | "hydration"
  | "meal_consistency"
  // Recovery factors
  | "recovery_score"
  | "subjective_fatigue"
  | "readiness_score"
  // Body metrics
  | "body_weight"
  | "body_fat"
  | "muscle_mass"
  | "bmi";

/**
 * Request to trigger correlation analysis on demand
 */
export interface CorrelationAnalysisRequest {
  period: "7d" | "30d";
  factors?: BiometricFactor[]; // If empty, analyze all factors
  minimumConfidence: number; // 0-1, default 0.7
  includeOutlierDetails: boolean; // Include specific dates for anomalies
}

/**
 * Response from correlation analysis
 */
export interface CorrelationAnalysisResult {
  snapshotId: string;
  generatedAt: Date;
  dataCoverage: number; // 0-1, percentage of days with complete data
  findings: CorrelationFinding[];
  summary: {
    totalFactorsAnalyzed: number;
    significantCorrelations: number;
    primaryConcern?: string;
    recommendedAction?: string;
    warnings: string[];
  };
  recoveryScore: number;
  dataGaps: {
    sleep: number; // days missing
    workouts: number;
    nutrition: number;
    bodyMetrics: number;
  };
}

/**
 * Recovery score factors for detailed breakdown
 */
export interface RecoveryScoreFactors {
  sleep: {
    duration: number; // 0-100 score
    quality: number;
    consistency: number;
    weight: number; // Overall weight for this factor
  };
  exercise: {
    load: number; // 0-100 (balanced = high, under/over = low)
    recoveryTime: number; // Days of rest
    intensityBalance: number;
    weight: number;
  };
  nutrition: {
    adequacy: number; // Meeting targets
    timing: number; // Meal timing quality
    hydration: number;
    weight: number;
  };
  bodyMetrics: {
    weightChange: number; // Score based on healthy rate
    bodyFatChange: number;
    trend: number; // Direction of change
    weight: number;
  };
}

/**
 * Recovery score calculation result
 */
export interface RecoveryScoreResult {
  score: number; // 0-100 overall score
  factors: RecoveryScoreFactors;
  grade: "excellent" | "good" | "fair" | "poor" | "critical";
  trend: "improving" | "stable" | "declining";
  comparedToLastPeriod: {
    change: number;
    direction: "up" | "down" | "same";
  };
  primaryRiskFactor: BiometricFactor | null;
  recommendations: string[];
}

// ============================================
// SECTION 20: ADAPTIVE PLANNER - RE-PLANNING TYPES
// ============================================
// Re-export all adaptive planner types from the separate module
export * from "./adaptive-planner";

// ============================================
// SECTION 21: MULTI-AGENT NUTRITION EXPERT
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
  primaryAgent: NutritionAgentType; // Agent that provided the most relevant response
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
}

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
  safetyAlerts: Array<{
    severity: "critical" | "warning" | "info";
    type: "allergy" | "drug_interaction" | "contraindication" | "condition_risk";
    substance: string;
    reason: string;
    recommendation: string;
  }>;
  nutrientWarnings?: Array<{
    nutrient: string;
    currentIntake?: number;
    target?: number;
    status: "excess" | "deficient" | "imbalanced";
    impact: string;
  }>;
  safeAlternatives?: string[];
  disclaimer: string; // Legal medical disclaimer
}

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
  costAnalysis?: {
    estimatedTotalCost: number;
    costPerServing: number;
    costPerCalorie: number;
    breakdown: Array<{
      ingredient: string;
      quantity: number;
      unit: string;
      unitCost: number;
      totalCost: number;
    }>;
  };
  budgetCompliance: "within_budget" | "over_budget" | "under_budget";
  savingsOpportunities?: Array<{
    type: "substitute_ingredient" | "buy_in_bulk" | "different_brand" | "seasonal_alternative";
    description: string;
    estimatedSavings: number;
    suggestion: string;
  }>;
  costOptimizedAlternatives?: Array<{
    original: string;
    alternative: string;
    reason: string;
    savings: number;
  }>;
  shoppingTips?: string[];
}

/**
 * Agent system prompt templates (for easy customization)
 */
export const AGENT_SYSTEM_PROMPTS: Record<NutritionAgentType, string> = {
  chef: `You are a professional chef and nutritionist specializing in practical home cooking.

Your expertise:
- Creating delicious, nutritious recipes from available ingredients
- Ingredient substitutions for allergies/restrictions
- Cooking techniques for all skill levels
- Meal prep and efficiency

Guidelines:
- Prioritize food safety (proper cooking temperatures, cross-contamination avoidance)
- Consider available kitchen tools and skill level
- Include clear, step-by-step instructions
- Provide realistic prep and cook times
- Suggest variations for dietary preferences
- Always include allergen warnings when applicable

Output format: Valid JSON matching the Recipe schema.`,

  medical: `You are a medical nutrition specialist with expertise in food-drug interactions and dietary contraindications.

Your expertise:
- Food-drug interactions (MAO inhibitors, blood thinners, etc.)
- Condition-specific dietary restrictions (diabetes, hypertension, kidney disease, etc.)
- Allergen identification and severity assessment
- Nutrient-drug interactions

CRITICAL SAFETY RULES:
1. If a user mentions a life-threatening allergy (anaphylaxis risk), mark as CRITICAL severity
2. Flag grapefruit interactions with statins, blood pressure meds
3. Warn about vitamin K interactions with warfarin
4. Flag high-potassium foods for kidney disease patients
5. Flag high-sodium foods for hypertension patients

DISCLAIMER: You are not a substitute for medical advice. Users should consult their healthcare provider.

Output format: Valid JSON matching the MedicalAgentResponse schema.`,

  budget: `You are a grocery shopping and meal budget optimization expert.

Your expertise:
- Cost per calorie and cost per gram protein calculations
- Seasonal produce pricing
- Bulk buying strategies
- Store brand vs name brand comparisons
- Reducing food waste

Guidelines:
- Provide realistic cost estimates based on average grocery prices
- Suggest cheaper protein sources (eggs, beans, chicken thighs vs breasts)
- Recommend frozen vegetables for cost savings
- Suggest plant-based proteins as budget alternatives
- Consider unit prices (price per oz/lb) not just total price

Output format: Valid JSON matching the BudgetAgentResponse schema.`,
};

