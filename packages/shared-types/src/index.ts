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
  timestamp: Date;
  weight?: number; // kg
  bodyFatPercentage?: number; // 0-100
  muscleMass?: number; // kg
  boneMass?: number; // kg
  waterPercentage?: number; // 0-100
  bmi?: number;
  waistCircumference?: number; // cm
  chestCircumference?: number; // cm
  hipCircumference?: number; // cm
  notes?: string;
}

// 2D Vector Heatmap data structure
export interface BodyHeatmapData {
  id: string;
  userId: string;
  timestamp: Date;
  imageUrl?: string; // R2 stored SVG/PNG
  vectorData: HeatmapVectorPoint[];
  metadata: {
    analysisSource: "ai_vision" | "manual_input" | "device_sync";
    confidence: number; // 0-1
    zones: MuscleZone[];
  };
}

export interface HeatmapVectorPoint {
  x: number; // 0-100 normalized coordinates
  y: number;
  intensity: number; // 0-1
  label: MuscleGroup;
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
  };
  confidence: number;
  createdAt: Date;
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
