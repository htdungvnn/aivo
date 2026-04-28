import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
  index,
  unique,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ============================================
// AIVO DATABASE SCHEMA for Cloudflare D1 (SQLite)
// ============================================

// Timestamps are set by application code using Math.floor(Date.now() / 1000)

// Users table
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email", { length: 255 }).notNull().unique(),
  name: text("name", { length: 255 }).notNull(),
  age: integer("age"),
  gender: text("gender"),
  height: real("height"),
  weight: real("weight"),
  restingHeartRate: integer("resting_heart_rate"),
  maxHeartRate: integer("max_heart_rate"),
  fitnessLevel: text("fitness_level"),
  goals: text("goals"),
  picture: text("picture"),
  emailVerified: integer("email_verified").default(0),
  onboardingCompleted: integer("onboarding_completed").default(0),
  receiveMonthlyReports: integer("receive_monthly_reports").default(1),
  expoPushToken: text("expo_push_token"), // For push notifications
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// Sessions table
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider"),
  providerUserId: text("provider_user_id", { length: 255 }).notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: integer("expires_at"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index('idx_sessions_user_id').on(table.userId),
  index('idx_sessions_created').on(sql`desc ${table.createdAt}`),
  index('idx_sessions_provider_user').on(table.provider, table.providerUserId),
]);

// Body photos table - stores uploaded user body photos
export const bodyPhotos = sqliteTable("body_photos", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  r2Url: text("r2_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  uploadDate: integer("upload_date").notNull().default(0),
  analysisStatus: text("analysis_status", { length: 20 }).notNull().default("pending"), // pending, processing, completed, failed
  poseDetected: integer("pose_detected").default(0), // 0=no, 1=yes
  metadata: text("metadata"), // JSON: width, height, file size, etc.
}, (table) => [
  index('idx_user_id').on(table.userId),
  index('idx_analysis_status').on(table.analysisStatus),
]);

// Body metrics table
export const bodyMetrics = sqliteTable("body_metrics", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  timestamp: integer("timestamp").notNull(),
  weight: real("weight"),
  bodyFatPercentage: real("body_fat_percentage"),
  muscleMass: real("muscle_mass"),
  boneMass: real("bone_mass"),
  waterPercentage: real("water_percentage"),
  bmi: real("bmi"),
  waistCircumference: real("waist_circumference"),
  chestCircumference: real("chest_circumference"),
  hipCircumference: real("hip_circumference"),
  source: text("source"), // "manual", "ai", "device"
  notes: text("notes"),
}, (table) => [
  index('idx_body_metrics_user_id').on(table.userId),
  index('idx_body_metrics_timestamp').on(table.userId, sql`desc ${table.timestamp}`),
]);

// Body heatmaps table - stores AI-analyzed heatmap regions
export const bodyHeatmaps = sqliteTable("body_heatmaps", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  photoId: text("photo_id").notNull().references(() => bodyPhotos.id, { onDelete: "cascade" }),
  regions: text("regions").notNull(), // JSON array: [{ zoneId, intensity, color, confidence }]
  metrics: text("metrics"), // JSON: { upperBodyScore, coreScore, lowerBodyScore, overallScore }
  vectorData: text("vector_data"), // JSON array of embedding vector
  createdAt: integer("created_at").notNull().default(0),
}, (table) => [
  index('idx_user_id').on(table.userId),
  index('idx_photo_id').on(table.photoId),
]);

// Body heatmap history table - tracks progress snapshots (optional summary table)
export const bodyHeatmapHistory = sqliteTable("body_heatmap_history", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  heatmapId: text("heatmap_id").notNull().references(() => bodyHeatmaps.id, { onDelete: "cascade" }),
  snapshotDate: text("snapshot_date").notNull(), // ISO date YYYY-MM-DD
  comparisonNote: text("comparison_note"), // AI-generated progress summary
}, (table) => [
  index('idx_user_id').on(table.userId),
  index('idx_snapshot_date').on(table.snapshotDate),
  index('idx_heatmap_id').on(table.heatmapId),
]);

// Vision analyses table
export const visionAnalyses = sqliteTable("vision_analyses", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  processedUrl: text("processed_url"),
  analysis: text("analysis"),
  confidence: real("confidence"),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index('idx_vision_analyses_user_id').on(table.userId),
  index('idx_vision_analyses_created').on(sql`desc ${table.createdAt}`),
]);

// ============================================
// NUTRITION & FOOD LOGGING SCHEMA
// ============================================

// Food items database - curated nutritional information
export const foodItems = sqliteTable("food_items", {
  id: text("id").primaryKey(),
  name: text("name", { length: 255 }).notNull(),
  brand: text("brand", { length: 255 }),
  servingSize: real("serving_size"), // grams per serving
  servingUnit: text("serving_unit"), // "g", "oz", "cup", "tbsp", "tsp", "piece"
  calories: real("calories").notNull(),
  protein_g: real("protein_g").notNull(),
  carbs_g: real("carbs_g").notNull(),
  fat_g: real("fat_g").notNull(),
  fiber_g: real("fiber_g"),
  sugar_g: real("sugar_g"),
  sodium_mg: real("sodium_mg"),
  isVerified: integer("is_verified").default(1), // 1=verified, 0=user submitted
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index('idx_name').on(table.name),
  unique('unique_name_brand').on(table.name, table.brand),
]);

// Food logs - user's daily food entries
export const foodLogs = sqliteTable("food_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mealType: text("meal_type"), // "breakfast", "lunch", "dinner", "snack", or custom
  foodItemId: text("food_item_id").references(() => foodItems.id),
  customName: text("custom_name"),
  imageUrl: text("image_url"),
  estimatedPortionG: real("estimated_portion_g"),
  confidence: real("confidence"), // AI confidence 0-1
  calories: real("calories").notNull(),
  protein_g: real("protein_g").notNull(),
  carbs_g: real("carbs_g").notNull(),
  fat_g: real("fat_g").notNull(),
  fiber_g: real("fiber_g"),
  sugar_g: real("sugar_g"),
  loggedAt: integer("logged_at").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index('idx_food_logs_user_id').on(table.userId),
  index('idx_food_logs_logged').on(table.userId, sql`desc ${table.loggedAt}`),
  index('idx_food_logs_food_item').on(table.foodItemId),
  index('idx_food_logs_meal_type').on(table.userId, table.mealType),
  index('idx_food_logs_user_meal_logged').on(table.userId, table.mealType, sql`desc ${table.loggedAt}`),
]);

// Daily nutrition summaries table - materialized aggregates for fast queries
export const dailyNutritionSummaries = sqliteTable("daily_nutrition_summaries", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // ISO date YYYY-MM-DD
  totalCalories: real("total_calories").default(0),
  totalProtein_g: real("total_protein_g").default(0),
  totalCarbs_g: real("total_carbs_g").default(0),
  totalFat_g: real("total_fat_g").default(0),
  totalFiber_g: real("total_fiber_g"),
  totalSugar_g: real("total_sugar_g"),
  foodLogCount: integer("food_log_count").default(0),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index('idx_user_date').on(table.userId, table.date),
]);
// Primary key is composite (userId, date)
// SQLite doesn't support composite PK via drizzle primaryKey() directly
// We'll add it via migration

// Nutrition consultations table - stores AI agent consultations
export const nutritionConsults = sqliteTable("nutrition_consults", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(), // For tracking related queries in same session
  query: text("query").notNull(), // User's original question
  context: text("context"), // JSON: { allergies, medications, dietType, etc. }
  agentsConsulted: text("agents_consulted").notNull(), // JSON array: ["chef", "medical", "budget"]
  responses: text("responses").notNull(), // JSON array of agent responses
  synthesizedAdvice: text("synthesized_advice").notNull(),
  warnings: text("warnings"), // JSON array of warning strings
  processingTimeMs: integer("processing_time_ms").notNull(),
  userRating: integer("user_rating"), // 1-5 scale
  feedback: text("feedback"), // User's optional feedback
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index('idx_nutrition_consults_user_id').on(table.userId),
  index('idx_nutrition_consults_created').on(sql`desc ${table.createdAt}`),
  index('idx_nutrition_consults_session').on(table.sessionId),
]);

// Workouts table
export const workouts = sqliteTable("workouts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type"),
  name: text("name"),
  duration: integer("duration"),
  caloriesBurned: real("calories_burned"),
  startTime: integer("start_time"),
  endTime: integer("end_time"),
  notes: text("notes"),
  metrics: text("metrics"),
  createdAt: integer("created_at").notNull(),
  completedAt: integer("completed_at"),
  status: text("status"),
}, (table) => [
  index('idx_workouts_user_id').on(table.userId),
  index('idx_workouts_created').on(sql`desc ${table.createdAt}`),
  index('idx_workouts_user_status').on(table.userId, table.status),
  index('idx_workouts_start_time').on(table.userId, sql`desc ${table.startTime}`),
  index('idx_workouts_user_status_start').on(table.userId, table.status, table.startTime),
]);

// Workout exercises table
export const workoutExercises = sqliteTable("workout_exercises", {
  id: text("id").primaryKey(),
  workoutId: text("workout_id").notNull().references(() => workouts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sets: integer("sets"),
  reps: integer("reps"),
  weight: real("weight"),
  restTime: integer("rest_time"),
  notes: text("notes"),
  order: integer("order"),
  rpe: real("rpe"),
}, (table) => [
  index('idx_workout_exercises_workout_id').on(table.workoutId),
]);

// ============================================
// AI ADAPTIVE ROUTINE PLANNER SCHEMA
// ============================================

// Workout routines table - weekly workout plans
export const workoutRoutines = sqliteTable("workout_routines", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  weekStartDate: text("week_start_date"), // ISO date YYYY-MM-DD
  isActive: integer("is_active").default(1),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index('idx_routines_user_id').on(table.userId),
  index('idx_routines_active').on(table.userId, table.isActive),
  index('idx_routines_week_start').on(table.userId, table.weekStartDate),
]);

// Routine exercises table - planned exercises for specific days
export const routineExercises = sqliteTable("routine_exercises", {
  id: text("id").primaryKey(),
  routineId: text("routine_id").notNull().references(() => workoutRoutines.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 (Sunday-Saturday)
  exerciseName: text("exercise_name").notNull(),
  exerciseType: text("exercise_type"), // "strength", "cardio", "mobility", "recovery"
  targetMuscleGroups: text("target_muscle_groups"), // JSON array
  sets: integer("sets"),
  reps: integer("reps"),
  weight: real("weight"),
  rpe: real("rpe"), // Rate of Perceived Exertion 1-10
  duration: integer("duration"), // seconds for cardio/recovery
  restTime: integer("rest_time"), // seconds between sets
  orderIndex: integer("order_index"),
  notes: text("notes"),
}, (table) => [
  index('idx_routine_exercises_routine_id').on(table.routineId),
]);

// Body insights table - recovery and soreness reports
export const bodyInsights = sqliteTable("body_insights", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  timestamp: integer("timestamp").notNull(),
  source: text("source"), // "ai_analysis", "user_report", "device"
  recoveryScore: real("recovery_score"), // 0-100
  fatigueLevel: integer("fatigue_level"), // 1-10
  muscleSoreness: text("muscle_soreness"), // JSON: { "chest": 3, "legs": 8, ... }
  sleepQuality: integer("sleep_quality"), // 1-10
  sleepHours: real("sleep_hours"),
  stressLevel: integer("stress_level"), // 1-10
  hydrationLevel: integer("hydration_level"), // 1-10
  notes: text("notes"),
  rawData: text("raw_data"), // Original analysis data
}, (table) => [
  index('idx_body_insights_user_time').on(table.userId, sql`desc ${table.timestamp}`),
]);

// User goals table - structured fitness goals
export const userGoals = sqliteTable("user_goals", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "strength", "hypertrophy", "endurance", "weight_loss", "mobility"
  targetMetric: text("target_metric"), // "bench_press", "body_weight", "5k_time", etc.
  currentValue: real("current_value"),
  targetValue: real("target_value"),
  deadline: text("deadline"), // ISO date
  priority: integer("priority").default(1), // 1=high, 2=medium, 3=low
  status: text("status").default("active"), // "active", "completed", "paused"
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index('idx_user_goals_user_id').on(table.userId),
  index('idx_user_goals_status').on(table.status),
  index('idx_user_goals_type').on(table.type),
]);

// Plan deviations table - tracks adjustments made by AI
export const planDeviations = sqliteTable("plan_deviations", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  originalRoutineId: text("original_routine_id").references(() => workoutRoutines.id),
  adjustedRoutineId: text("adjusted_routine_id").references(() => workoutRoutines.id),
  deviationScore: real("deviation_score"), // 0-100
  reason: text("reason"), // "missed_workout", "muscle_soreness", "fatigue", "injury"
  adjustmentsJson: text("adjustments_json"), // Detailed changes made
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index('idx_plan_deviations_user_id').on(table.userId),
  index('idx_plan_deviations_created').on(sql`desc ${table.createdAt}`),
  index('idx_plan_deviations_original_routine').on(table.originalRoutineId),
]);

// Workout completion feedback table - tracks what was actually done vs planned
export const workoutCompletions = sqliteTable("workout_completions", {
  id: text("id").primaryKey(),
  workoutId: text("workout_id").notNull().references(() => workouts.id, { onDelete: "cascade" }),
  routineExerciseId: text("routine_exercise_id").references(() => routineExercises.id),
  completed: integer("completed").default(1),
  completionRate: real("completion_rate"), // 0-1 (sets/reps achieved vs planned)
  actualSets: integer("actual_sets"),
  actualReps: integer("actual_reps"),
  actualWeight: real("actual_weight"),
  rpeReported: real("rpe_reported"),
  skippedReason: text("skipped_reason"), // "soreness", "fatigue", "time", "injury"
  notes: text("notes"),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index('idx_workout_completions_workout').on(table.workoutId),
  index('idx_workout_completions_routine_exercise').on(table.routineExerciseId),
  index('idx_workout_completions_created').on(sql`desc ${table.createdAt}`),
]);

// Daily schedules table
export const dailySchedules = sqliteTable("daily_schedules", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: text("date"),
  routineId: text("routine_id").references(() => workoutRoutines.id),
  workoutId: text("workout_id").references(() => workouts.id),
  recoveryTasks: text("recovery_tasks"),
  nutritionGoals: text("nutrition_goals"),
  sleepGoal: text("sleep_goal"),
  generatedBy: text("generated_by"),
  optimizationScore: real("optimization_score"),
  adjustmentsMade: text("adjustments_made"),
}, (table) => [
  index('idx_daily_schedules_user_date').on(table.userId, table.date),
  index('idx_daily_schedules_routine').on(table.routineId),
]);

// Workout templates table
export const workoutTemplates = sqliteTable("workout_templates", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type"),
  duration: integer("duration"),
  exercises: text("exercises"),
  tags: text("tags"),
  isPublic: integer("is_public").default(0),
  popularity: real("popularity"),
});

// Conversations table
export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  response: text("response").notNull(),
  context: text("context"),
  tokensUsed: integer("tokens_used"),
  model: text("model"),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index('idx_conversations_user_id').on(table.userId),
  index('idx_conversations_created').on(sql`desc ${table.createdAt}`),
]);

// AI recommendations table
export const aiRecommendations = sqliteTable("ai_recommendations", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  confidence: real("confidence"),
  reasoning: text("reasoning"),
  actions: text("actions"),
  expiresAt: integer("expires_at"),
  isRead: integer("is_read").default(0),
  isDismissed: integer("is_dismissed").default(0),
  feedback: text("feedback"),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index('idx_ai_recs_user_id').on(table.userId),
  index('idx_ai_recs_created').on(sql`desc ${table.createdAt}`),
  index('idx_ai_recs_unread').on(table.userId, table.isRead),
  index('idx_ai_recs_type').on(table.type),
]);

// Memory nodes table
export const memoryNodes = sqliteTable("memory_nodes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type"),
  content: text("content").notNull(),
  embedding: text("embedding"),
  metadata: text("metadata"),
  relatedNodes: text("related_nodes"),
  extractedAt: integer("extracted_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index('idx_memory_nodes_user_id').on(table.userId),
  index('idx_memory_nodes_user_id_type').on(table.userId, table.type),
  index('idx_memory_nodes_user_id_extracted_at').on(table.userId, table.extractedAt),
]);

// Memory edges table
export const memoryEdges = sqliteTable("memory_edges", {
  id: text("id").primaryKey(),
  fromNodeId: text("from_node_id").notNull().references(() => memoryNodes.id, { onDelete: "cascade" }),
  toNodeId: text("to_node_id").notNull().references(() => memoryNodes.id, { onDelete: "cascade" }),
  relationship: text("relationship"),
  weight: real("weight"),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index('idx_memory_edges_from_node').on(table.fromNodeId),
  index('idx_memory_edges_to_node').on(table.toNodeId),
  index('idx_memory_edges_from_relationship').on(table.fromNodeId, table.relationship),
]);

// Compressed contexts table
export const compressedContexts = sqliteTable("compressed_contexts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  originalTokens: integer("original_tokens"),
  compressedTokens: integer("compressed_tokens"),
  compressionRatio: real("compression_ratio"),
  strategy: text("strategy"),
  context: text("context"),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at"),
}, (table) => [
  index('idx_compressed_contexts_user_created').on(table.userId, table.createdAt),
]);

// Gamification profiles table
export const gamificationProfiles = sqliteTable("gamification_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  totalPoints: integer("total_points").default(0),
  level: integer("level").default(1),
  currentXp: integer("current_xp").default(0),
  xpToNextLevel: integer("xp_to_next_level").default(100),
  streakCurrent: integer("streak_current").default(0),
  streakLongest: integer("streak_longest").default(0),
  lastActivityDate: text("last_activity_date"),
  freezeCount: integer("freeze_count").default(0),
  updatedAt: integer("updated_at").notNull(),
});

// Badges table
export const badges = sqliteTable("badges", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type"),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon"),
  earnedAt: integer("earned_at").notNull(),
  tier: text("tier"),
});

// Achievements table
export const achievements = sqliteTable("achievements", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type"),
  progress: real("progress"),
  target: integer("target"),
  reward: integer("reward"),
  completed: integer("completed").default(0),
  completedAt: integer("completed_at"),
  claimed: integer("claimed").default(0),
}, (table) => [
  index('idx_achievements_user_id').on(table.userId),
  index('idx_achievements_completed').on(table.completed),
]);

// Social proof cards table
export const socialProofCards = sqliteTable("social_proof_cards", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type"),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  data: text("data"),
  shareableImageUrl: text("shareable_image_url"),
  createdAt: integer("created_at").notNull(),
  isPublic: integer("is_public").default(0),
}, (table) => [
  index('idx_social_proof_user_id').on(table.userId),
  index('idx_social_proof_created').on(sql`desc ${table.createdAt}`),
  index('idx_social_proof_public').on(table.isPublic),
]);

// Activity events table
export const activityEvents = sqliteTable("activity_events", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workoutId: text("workout_id").references(() => workouts.id),
  type: text("type"),
  payload: text("payload"),
  clientTimestamp: integer("client_timestamp").notNull(),
  serverTimestamp: integer("server_timestamp").notNull(),
  deviceInfo: text("device_info"),
}, (table) => [
  index('idx_activity_events_user_id').on(table.userId),
  index('idx_activity_events_workout_id').on(table.workoutId),
  index('idx_activity_events_server_time').on(sql`desc ${table.serverTimestamp}`),
  index('idx_activity_events_type').on(table.type),
]);

// System metrics table
export const systemMetrics = sqliteTable("system_metrics", {
  timestamp: integer("timestamp").primaryKey(),
  activeUsers: integer("active_users"),
  newUsers: integer("new_users"),
  workoutsCompleted: integer("workouts_completed"),
  aiRequests: integer("ai_requests"),
  apiLatency: real("api_latency"),
  errorRate: real("error_rate"),
  storageUsed: integer("storage_used"),
});

// User analytics table
export const userAnalytics = sqliteTable("user_analytics", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  engagementScore: real("engagement_score"),
  retentionRisk: text("retention_risk"),
  predictedLTV: real("predicted_ltv"),
  churnProbability: real("churn_probability"),
  preferredCommunication: text("preferred_communication"),
  lastActive: integer("last_active"),
}, (table) => [
  index('idx_user_analytics_risk').on(table.retentionRisk),
  index('idx_user_analytics_last_active').on(table.lastActive),
]);

// Daily check-ins table for streak tracking
export const dailyCheckins = sqliteTable("daily_checkins", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // ISO date format: YYYY-MM-DD
  checkedInAt: integer("checked_in_at"),
  source: text("source"), // "workout", "manual", "auto"
  workoutId: text("workout_id").references(() => workouts.id),
}, (table) => [
  index('idx_user_id').on(table.userId),
  unique('unique_user_date').on(table.userId, table.date),
]);

// Streak freezes table - tracks freeze purchases and usage
export const streakFreezes = sqliteTable("streak_freezes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  purchasedAt: integer("purchased_at").notNull(),
  usedAt: integer("used_at"),
  usedOnDate: text("used_on_date"), // date the freeze was applied to
  expiresAt: integer("expires_at"), // freeze expires after X days if not used
  pointsSpent: integer("points_spent").default(50), // default cost 50 points
}, (table) => [
  index('idx_user_id').on(table.userId),
]);

// Point transactions table - tracks all point earnings and spending
export const pointTransactions = sqliteTable("point_transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "earn", "spend", "bonus", "penalty"
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  relatedId: text("related_id"), // workout_id, badge_id, etc.
  balanceAfter: integer("balance_after").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index('idx_user_id').on(table.userId),
  index('idx_created_at').on(table.createdAt),
]);

// Leaderboard snapshots table - historical leaderboard data
export const leaderboardSnapshots = sqliteTable("leaderboard_snapshots", {
  date: text("date").primaryKey(), // ISO date YYYY-MM-DD
  snapshotAt: integer("snapshot_at").notNull(),
  data: text("data").notNull(), // JSON array of { userId, rank, points, streak }
});

// Social relationships table - friend connections
export const socialRelationships = sqliteTable("social_relationships", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  friendId: text("friend_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").default("accepted"), // "pending", "accepted", "blocked"
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index('idx_user').on(table.userId),
  index('idx_friend').on(table.friendId),
  unique('unique_user_friend').on(table.userId, table.friendId),
]);

// Shareable content table
export const shareableContent = sqliteTable("shareable_content", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  platform: text("platform"),
  isPublic: integer("is_public").default(0),
  likes: integer("likes").default(0),
  shares: integer("shares").default(0),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index('idx_shareable_user_id').on(table.userId),
  index('idx_shareable_created').on(sql`desc ${table.createdAt}`),
  index('idx_shareable_public').on(table.isPublic),
]);

// ============================================
// FORM ANALYSIS - AI-POWERED MOVEMENT CORRECTION
// ============================================

// Form analysis videos table - stores uploaded videos for analysis
export const formAnalysisVideos = sqliteTable("form_analysis_videos", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  exerciseType: text("exercise_type").notNull(),
  status: text("status").notNull().default("pending"),
  videoKey: text("video_key").notNull(),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  frameCount: integer("frame_count"),
  durationSeconds: integer("duration_seconds"),
  metadata: text("metadata"), // JSON: fileSize, resolution, fps, uploadedAt
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index('idx_form_videos_user_id').on(table.userId),
  index('idx_form_videos_status').on(table.status),
  index('idx_form_videos_created_at').on(sql`desc ${table.createdAt}`),
  index('idx_form_videos_user_status').on(table.userId, table.status),
]);

// Form analyses table - completed analysis results
export const formAnalyses = sqliteTable("form_analyses", {
  id: text("id").primaryKey(),
  videoId: text("video_id").notNull().unique().references(() => formAnalysisVideos.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  exerciseType: text("exercise_type").notNull(),
  status: text("status").notNull(),
  overallScore: real("overall_score").notNull(),
  grade: text("grade").notNull(),
  issues: text("issues").notNull(), // JSON array of FormIssue
  corrections: text("corrections").notNull(), // JSON array of FormCorrection
  summaryJson: text("summary_json").notNull(), // JSON: { strengths, primaryConcern, priority }
  frameAnalysisJson: text("frame_analysis_json"), // JSON: { keyFrames: [...] }
  aiFeedbackJson: text("ai_feedback_json"), // JSON: AIFeedbackResponse from GPT-4o
  aiProcessingTimeMs: integer("ai_processing_time_ms"), // Time for AI analysis
  createdAt: integer("created_at").notNull(),
  completedAt: integer("completed_at"),
  processingTimeMs: integer("processing_time_ms"),
}, (table) => [
  index('idx_form_analyses_user_id').on(table.userId),
  index('idx_form_analyses_created').on(sql`desc ${table.createdAt}`),
  index('idx_form_analyses_grade').on(table.grade),
  index('idx_form_analyses_exercise').on(table.userId, table.exerciseType),
]);

// Notifications table - push notifications and in-app alerts
export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "form_analysis_complete", "form_analysis_failed", "streak_milestone", etc.
  title: text("title").notNull(),
  body: text("body").notNull(),
  data: text("data"), // JSON: additional context (videoId, grade, etc.)
  channel: text("channel").default("push"), // "push", "in_app", "email"
  status: text("status").default("pending"), // "pending", "sent", "delivered", "failed"
  expoPushTicket: text("expo_push_ticket"),
  sentAt: integer("sent_at"),
  deliveredAt: integer("delivered_at"),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index('idx_notifications_user_id').on(table.userId),
  index('idx_notifications_status').on(table.status),
  index('idx_notifications_created_at').on(table.createdAt),
]);

// ============================================
// BIOMETRIC CORRELATION - SLEEP & SNAPSHOTS
// ============================================

// Sleep logs - structured sleep tracking with objective metrics
export const sleepLogs = sqliteTable("sleep_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // ISO date YYYY-MM-DD
  durationHours: real("duration_hours"), // Total sleep duration in hours
  qualityScore: integer("quality_score"), // 0-100 self-reported
  deepSleepMinutes: integer("deep_sleep_minutes"), // Optional: from wearable
  remSleepMinutes: integer("rem_sleep_minutes"), // Optional: from wearable
  awakeMinutes: integer("awake_minutes"), // Optional: from wearable
  bedtime: text("bedtime"), // HH:MM format (e.g., "22:30")
  waketime: text("waketime"), // HH:MM format (e.g., "06:30")
  consistencyScore: integer("consistency_score"), // 0-100 (calculated, bedtime variance)
  notes: text("notes"),
  source: text("source").default("manual"), // "manual", "device", "import"
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index('idx_sleep_user_date').on(table.userId, table.date),
  index('idx_sleep_created').on(sql`desc ${table.createdAt}`),
]);

// Biometric snapshots - pre-aggregated 7d/30d statistics for performance
export const biometricSnapshots = sqliteTable("biometric_snapshots", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  period: text("period").notNull(), // "7d" or "30d"
  generatedAt: integer("generated_at").notNull(),
  validUntil: integer("valid_until"), // Snapshot expires after 24h (7d) or 168h (30d)
  // Exercise load aggregates (JSON)
  exerciseLoad: text("exercise_load"),
  // Sleep aggregates (JSON)
  sleep: text("sleep"),
  // Nutrition aggregates (JSON) - from dailyNutritionSummaries
  nutrition: text("nutrition"),
  // Body metrics trends (JSON) - from bodyMetrics
  bodyMetrics: text("body_metrics"),
  // Recovery composite score (0-100)
  recoveryScore: real("recovery_score"),
  // Warnings about data quality or concerning patterns
  warnings: text("warnings"), // JSON array of strings
}, (table) => [
  index('idx_snapshot_user_period').on(table.userId, table.period),
  index('idx_snapshot_generated').on(table.generatedAt),
]);

// Correlation findings - discovered patterns between biometric factors
export const correlationFindings = sqliteTable("correlation_findings", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  snapshotId: text("snapshot_id").notNull().references(() => biometricSnapshots.id, { onDelete: "cascade" }),
  factorA: text("factor_a").notNull(), // e.g., "exercise_load", "sleep_quality", "nutrition_consistency"
  factorB: text("factor_b").notNull(), // usually "recovery_score" or another factor
  correlationCoefficient: real("correlation_coefficient"), // -1 to 1
  pValue: real("p_value"), // statistical significance (approx)
  confidence: real("confidence"), // 0-1 based on data completeness
  anomalyThreshold: real("anomaly_threshold"), // z-score threshold used for outlier detection
  anomalyCount: integer("anomaly_count"), // number of outlier days detected
  outlierDates: text("outlier_dates"), // JSON array of dates (ISO)
  explanation: text("explanation"), // Plain English explanation (pre-computed)
  actionableInsight: text("actionable_insight"), // What user should do
  detectedAt: integer("detected_at").notNull(),
  validUntil: integer("valid_until"), // 30 days validity
  isDismissed: integer("is_dismissed").default(0),
}, (table) => [
  index('idx_findings_user_snapshot').on(table.userId, table.snapshotId),
  index('idx_findings_detected').on(table.detectedAt),
]);

// ============================================
// ACOUSTIC MYOGRAPHY - MUSCLE FATIGUE ANALYSIS
// ============================================

// Acoustic baselines - stored baseline measurements for rested muscle
export const acousticBaselines = sqliteTable("acoustic_baselines", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  muscleGroup: text("muscle_group").notNull(), // MuscleGroup from shared-types
  createdAt: integer("created_at").notNull(),
  // Baseline features (JSON)
  medianFrequency: real("median_frequency").notNull(), // Hz for fresh muscle
  rmsAmplitude: real("rms_amplitude").notNull(),
  spectralEntropy: real("spectral_entropy").notNull(),
  contractionRate: real("contraction_rate").notNull(), // contractions per second
  qualityScore: real("quality_score").notNull(), // 0-1
  // Metadata
  sampleRate: integer("sample_rate").default(8000),
  chunkDurationMs: integer("chunk_duration_ms").default(500),
  ambientNoiseLevel: real("ambient_noise_level"), // dB background noise at calibration
  notes: text("notes"),
  rawFeaturesJson: text("raw_features_json"), // Full features from calibration sample
}, (table) => [
  index('idx_acoustic_baseline_user_muscle').on(table.userId, table.muscleGroup),
  unique('unique_baseline_user_muscle').on(table.userId, table.muscleGroup),
]);

// Acoustic sessions - workout sessions with continuous acoustic monitoring
export const acousticSessions = sqliteTable("acoustic_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workoutId: text("workout_id").references(() => workouts.id), // Optional link to workout
  exerciseName: text("exercise_name"), // e.g., "bench_press", "squat"
  muscleGroup: text("muscle_group").notNull(), // Primary muscle being monitored
  startTime: integer("start_time").notNull(),
  endTime: integer("end_time"),
  // Session aggregates
  totalChunks: integer("total_chunks").default(0),
  validChunks: integer("valid_chunks").default(0),
  avgFatigueLevel: real("avg_fatigue_level"), // 0-100
  peakFatigueLevel: real("peak_fatigue_level"), // 0-100
  fatigueTrend: text("fatigue_trend"), // "improving", "stable", "declining"
  // Baseline used for this session
  baselineId: text("baseline_id").references(() => acousticBaselines.id),
  // Metadata
  deviceType: text("device_type").default("iphone"), // "iphone", "android", "web"
  sampleRate: integer("sample_rate").default(8000),
  ambientNoiseLevel: real("ambient_noise_level"),
  notes: text("notes"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index('idx_acoustic_session_user_time').on(table.userId, sql`desc ${table.startTime}`),
  index('idx_acoustic_session_workout').on(table.workoutId),
]);

// Audio chunks - individual audio samples (optional persistence for re-analysis)
export const acousticAudioChunks = sqliteTable("acoustic_audio_chunks", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => acousticSessions.id, { onDelete: "cascade" }),
  chunkIndex: integer("chunk_index").notNull(),
  timestamp: integer("timestamp").notNull(), // Relative to session start (ms)
  // Audio data (optional - may be stored in R2 instead)
  pcmDataKey: text("pcm_data_key"), // R2 key if audio persisted
  // Cached features from processing
  featuresJson: text("features_json"), // AcousticFeatures as JSON
  // Signal quality
  isValid: integer("is_valid").default(1),
  confidence: real("confidence"), // 0-1
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index('idx_chunks_session_index').on(table.sessionId, table.chunkIndex),
  index('idx_chunks_timestamp').on(table.sessionId, table.timestamp),
]);

// Muscle fatigue readings - latest fatigue state per muscle group (materialized view pattern)
export const muscleFatigueReadings = sqliteTable("muscle_fatigue_readings", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  muscleGroup: text("muscle_group").notNull(),
  sessionId: text("session_id").references(() => acousticSessions.id),
  // Current fatigue state
  fatigueLevel: real("fatigue_level").notNull(), // 0-100
  fatigueCategory: text("fatigue_category").notNull(), // "fresh", "moderate", "fatigued", "exhausted"
  medianFrequency: real("median_frequency"), // Current median freq (Hz)
  medianFreqShift: real("median_freq_shift"), // Change from baseline (negative = fatigued)
  // Confidence and reasoning
  confidence: real("confidence").notNull(), // 0-1
  recommendations: text("recommendations"), // JSON array of recommendations
  // Timestamps
  measuredAt: integer("measured_at").notNull(),
  sessionStartTime: integer("session_start_time"), // For context
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index('idx_fatigue_user_muscle').on(table.userId, table.muscleGroup),
  index('idx_fatigue_updated').on(sql`desc ${table.updatedAt}`),
  index('idx_fatigue_session').on(table.sessionId),
  index('idx_fatigue_measured').on(table.userId, sql`desc ${table.measuredAt}`),
]);

// Acoustic fatigue trends - aggregated trend data for analytics
export const acousticFatigueTrends = sqliteTable("acoustic_fatigue_trends", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  period: text("period").notNull(), // "daily", "weekly", "monthly"
  periodStart: text("period_start").notNull(), // ISO date YYYY-MM-DD
  muscleGroup: text("muscle_group").notNull(),
  // Trend metrics
  avgFatigueLevel: real("avg_fatigue_level"), // 0-100
  peakFatigueLevel: real("peak_fatigue_level"),
  recoveryRate: real("recovery_rate"), // How quickly fatigue reduces (0-1)
  sessionsCount: integer("sessions_count").default(0),
  totalDurationMinutes: integer("total_duration_minutes").default(0),
  // Correlation with workout metrics
  avgWorkoutIntensity: real("avg_workout_intensity"), // From workout logs
  correlationWithVolume: real("correlation_with_volume"), // Pearson r
  // Calculated at
  calculatedAt: integer("calculated_at").notNull(),
}, (table) => [
  index('idx_trend_user_period').on(table.userId, table.period, table.periodStart),
  index('idx_trend_muscle').on(table.muscleGroup),
]);

// ============================================
// ADAPTIVE MACRO OSCILLATION SCHEMA
// ============================================

// User macro targets override (persisted user preferences)
export const userMacroTargets = sqliteTable("user_macro_targets", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  calories: integer("calories").notNull(),
  protein_g: integer("protein_g").notNull(),
  carbs_g: integer("carbs_g").notNull(),
  fat_g: integer("fat_g").notNull(),
  water_ml: integer("water_ml").default(3000),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// Macro adjustment sessions - tracks active adjustment periods
export const macroAdjustmentSessions = sqliteTable("macro_adjustment_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startedAt: integer("started_at").notNull(),
  lastActivityAt: integer("last_activity_at").notNull(),
  status: text("status", { enum: ["active", "paused", "completed"] }).notNull(),
  // Current macro values at session start
  baseCalories: integer("base_calories"),
  baseProtein: real("base_protein"),
  baseCarbs: real("base_carbs"),
  baseFat: real("base_fat"),
  // Current effective values (may differ due to adjustments)
  effectiveCalories: integer("effective_calories"),
  effectiveProtein: real("effective_protein"),
  effectiveCarbs: real("effective_carbs"),
  effectiveFat: real("effective_fat"),
  endedAt: integer("ended_at"),
}, (table) => [
  index('idx_macro_session_user').on(table.userId),
  index('idx_macro_session_status').on(table.status),
]);

// Macro adjustment logs - history of all suggested adjustments
export const macroAdjustmentLogs = sqliteTable("macro_adjustment_logs", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => macroAdjustmentSessions.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  timestamp: integer("timestamp").notNull(),
  // Adjustment details
  adjustmentType: text("adjustment_type"), // "increase_calories", "decrease_calories", "rebalance_macros", "maintain"
  calorieChange: integer("calorie_change"),
  proteinChange: real("protein_change"),
  carbsChange: real("carbs_change"),
  fatChange: real("fat_change"),
  reasoning: text("reasoning"), // JSON array or plain text
  confidence: real("confidence"), // 0-1 from adjustment engine
  urgency: text("urgency"), // "low", "medium", "high", "critical"
  // User feedback
  userAccepted: integer("user_accepted").default(0), // 0=pending, 1=accepted, 2=dismissed
  userFeedback: text("user_feedback"),
}, (table) => [
  index('idx_macro_logs_session').on(table.sessionId),
  index('idx_macro_logs_user').on(table.userId),
  index('idx_macro_logs_timestamp').on(sql`desc ${table.timestamp}`),
]);

// Sensor data snapshots - raw sensor readings aggregates
export const sensorDataSnapshots = sqliteTable("sensor_data_snapshots", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  timestamp: integer("timestamp").notNull(),
  period: text("period"), // "hourly", "daily", "weekly"
  // Aggregated sensor metrics
  steps: integer("steps"),
  activeMinutes: integer("active_minutes"),
  avgHeartRate: real("avg_heart_rate"),
  restingHeartRate: integer("resting_heart_rate"),
  hrvMs: integer("hrv_ms"), // Heart rate variability in milliseconds (SDNN)
  hrvRmssd: real("hrv_rmssd"), // Root mean square of successive differences
  stressScore: real("stress_score"), // 0-100 calculated from HRV
  // Source metadata
  source: text("source"), // "apple_health", "google_fit", "manual"
  rawData: text("raw_data"), // JSON: full daily aggregates for debugging
}, (table) => [
  index('idx_sensor_snapshot_user_time').on(table.userId, table.timestamp),
  index('idx_sensor_snapshot_period').on(table.userId, table.period),
  // Optimized index for latest snapshot per period (e.g., latest daily, latest hourly)
  index('idx_sensor_snapshot_user_period_time').on(table.userId, table.period, sql`desc ${table.timestamp}`),
]);

// Migrations table
export const migrations = sqliteTable("migrations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  appliedAt: integer("applied_at").notNull(),
  hash: text("hash").notNull(),
  version: integer("version"),
});

// Live workout sessions for AI-driven real-time adjustment
export const liveWorkoutSessions = sqliteTable("live_workout_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  workoutTemplateId: text("workout_template_id"),
  name: text("name").notNull(),
  startedAt: integer("started_at").notNull(),
  lastActivityAt: integer("last_activity_at").notNull(),
  status: text("status", { enum: ["active", "paused", "completed", "aborted"] }).notNull(),

  // Fatigue tracking
  fatigueLevel: integer("fatigue_level").notNull().default(0),
  fatigueCategory: text("fatigue_category", {
    enum: ["fresh", "moderate", "fatigued", "exhausted"],
  }).notNull().default("fresh"),

  // Volume tracking
  totalPlannedVolume: real("total_planned_volume").notNull().default(0),
  totalCompletedVolume: real("total_completed_volume").notNull().default(0),
  setsCompleted: integer("sets_completed").notNull().default(0),
  totalPlannedSets: integer("total_planned_sets").notNull().default(0),

  // Session settings
  targetRpe: real("target_rpe").notNull().default(8.0),
  idealRestSeconds: integer("ideal_rest_seconds").notNull().default(90),
  hasSpotter: integer("has_spotter").notNull().default(0),

  // Completion data
  endedAt: integer("ended_at"),
  totalDurationMs: integer("total_duration_ms"),
  earlyExitReason: text("early_exit_reason"),
  earlyExitSuggestion: text("early_exit_suggestion"),

  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index("idx_live_session_user_id").on(table.userId),
  index("idx_live_session_status").on(table.status),
  index("idx_live_session_started_at").on(sql`desc ${table.startedAt}`),
]);

// Set RPE logs for fatigue analysis
export const setRpeLogs = sqliteTable("set_rpe_logs", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  userId: text("user_id").notNull(),
  setNumber: integer("set_number").notNull(),
  exerciseName: text("exercise_name").notNull(),
  weight: real("weight"),
  plannedReps: integer("planned_reps").notNull(),
  completedReps: integer("completed_reps").notNull(),
  rpe: real("rpe").notNull(), // 1-10 rating
  restTimeSeconds: integer("rest_time_seconds").notNull(),
  timestamp: integer("timestamp").notNull(),
  notes: text("notes"),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index("idx_rpe_logs_session_id").on(table.sessionId),
  index("idx_rpe_logs_user_id").on(table.userId),
  index("idx_rpe_logs_timestamp").on(sql`desc ${table.timestamp}`),
]);


// ============================================
// BIOMETRIC DIGITAL TWIN - AVATAR & PROJECTIONS
// ============================================

// Body avatar models - stores user's current avatar configuration and morph targets
export const bodyAvatarModels = sqliteTable("body_avatar_models", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),

  // Current body composition snapshot
  currentWeight: real("current_weight"),
  currentBodyFatPct: real("current_body_fat_pct"),
  currentMuscleMass: real("current_muscle_mass"),
  heightCm: real("height_cm"),
  ageYears: integer("age_years"),
  gender: text("gender"),

  // Somatotype classification
  somatotype: text("somatotype"), // "endomorph", "mesomorph", "ectomorph", "mixed"
  somatotypeConfidence: real("somatotype_confidence"),

  // Morph targets for current body state (JSON)
  morphTargetsJson: text("morph_targets_json"),

  // Avatar rendering preferences
  avatarStyle: text("avatar_style").default("realistic"), // "realistic", "stylized", "abstract"
  skinTone: text("skin_tone"),
  showMuscleDefinitions: integer("show_muscle_definitions").default(1),
}, (table) => [
  index('idx_avatar_user_id').on(table.userId),
  unique('unique_avatar_user').on(table.userId),
]);

// Body projections - stores digital twin projection results
export const bodyProjections = sqliteTable("body_projections", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("created_at").notNull(),

  // Projection parameters
  timeHorizonDays: integer("time_horizon_days").notNull(),
  adherenceFactor: real("adherence_factor"), // 0.0-1.0 user's expected adherence

  // Base projection (without adherence adjustment)
  baseProjectionJson: text("base_projection_json"),

  // Adjusted projection (with adherence factor applied)
  adjustedProjectionJson: text("adjusted_projection_json"),

  // Projected body composition at target date
  projectedWeight: real("projected_weight"),
  projectedBodyFatPct: real("projected_body_fat_pct"),
  projectedMuscleMass: real("projected_muscle_mass"),
  confidence: real("confidence"), // 0-1

  // Scenario bounds
  bestCaseWeight: real("best_case_weight"),
  worstCaseWeight: real("worst_case_weight"),
  scenarioSpread: real("scenario_spread"), // kg variance

  // Morph targets for the projected state (for avatar animation)
  morphTargetsJson: text("morph_targets_json"),

  // AI-generated narrative explaining the projection
  narrative: text("narrative"),

  // Metadata
  generatedBy: text("generated_by").default("wasm"), // "wasm", "cached", "manual"
  cacheKey: text("cache_key"), // For reusing projections with same inputs
  expiresAt: integer("expires_at"), // Cached projections expire after 24h
}, (table) => [
  index('idx_projection_user_created').on(table.userId, sql`desc ${table.createdAt}`),
  index('idx_projection_cache_key').on(table.cacheKey),
  index('idx_projection_expires').on(table.expiresAt),
]);


// Social Features Tables

// clubs - Fitness communities
export const clubs = sqliteTable("clubs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  privacyType: text("privacy_type").notNull().default("public"), // public, private, restricted
  avatarUrl: text("avatar_url"),
  coverImageUrl: text("cover_image_url"),
  category: text("category"),
  location: text("location"),
  maxMembers: integer("max_members").default(1000),
  requiresApproval: integer("requires_approval").default(0), // 0=no, 1=yes
  allowMemberPosts: integer("allow_member_posts").default(1),
  isActive: integer("is_active").default(1),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index('idx_clubs_owner_id').on(table.ownerId),
  index('idx_clubs_privacy_type').on(table.privacyType),
  index('idx_clubs_created_at').on(sql`desc ${table.createdAt}`),
]);

// clubMembers - Membership with roles
export const clubMembers = sqliteTable("club_members", {
  id: text("id").primaryKey(),
  clubId: text("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"), // owner, admin, moderator, member
  joinedAt: integer("joined_at").notNull(),
  lastActiveAt: integer("last_active_at"),
  isMuted: integer("is_muted").default(0),
}, (table) => [
  unique('uq_club_member').on(table.clubId, table.userId),
  index('idx_club_members_user_id').on(table.userId),
  index('idx_club_members_club_role').on(table.clubId, table.role),
]);

// clubEvents - Scheduled workouts/meetups
export const clubEvents = sqliteTable("club_events", {
  id: text("id").primaryKey(),
  clubId: text("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  eventType: text("event_type").notNull(), // workout, social, challenge, meetup
  startTime: integer("start_time").notNull(),
  durationMinutes: integer("duration_minutes"),
  location: text("location"),
  recurrenceRule: text("recurrence_rule"), // JSON: iCal RRULE format
  maxParticipants: integer("max_participants"),
  isCancelled: integer("is_cancelled").default(0),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index('idx_club_events_club_id').on(table.clubId),
  index('idx_club_events_start_time').on(table.startTime),
]);

// eventAttendees - RSVP & attendance tracking
export const eventAttendees = sqliteTable("event_attendees", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => clubEvents.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rsvpStatus: text("rsvp_status").notNull().default("going"), // going, maybe, declined, waitlist
  attended: integer("attended").default(0), // 0=no, 1=yes (checked in)
  signedUpAt: integer("signed_up_at").notNull(),
}, (table) => [
  unique('uq_event_attendee').on(table.eventId, table.userId),
  index('idx_event_attendees_event').on(table.eventId),
  index('idx_event_attendees_user').on(table.userId),
  index('idx_event_attendees_status').on(table.eventId, table.rsvpStatus),
  index('idx_event_attendees_attended').on(table.eventId, table.attended),
]);

// comments - Nested threaded comments for any entity
export const comments = sqliteTable("comments", {
  id: text("id").primaryKey(),
  entityType: text("entity_type").notNull(), // club, event, post, challenge, workout
  entityId: text("entity_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  parentId: text("parent_id"), // for nested replies, FK defined in migration
  content: text("content").notNull(),
  mentions: text("mentions"), // JSON array of user IDs
  isDeleted: integer("is_deleted").default(0),
  deletedAt: integer("deleted_at"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index('idx_comments_entity').on(table.entityType, table.entityId),
  index('idx_comments_user').on(table.userId),
  index('idx_comments_parent').on(table.parentId),
  index('idx_comments_created').on(sql`desc ${table.createdAt}`),
  index('idx_comments_entity_created').on(table.entityType, table.entityId, sql`desc ${table.createdAt}`),
]);

// reactions - Like/emoji reactions for any entity
export const reactions = sqliteTable("reactions", {
  id: text("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reactionType: text("reaction_type").notNull(), // like, love, haha, wow, sad, angry, etc.
  createdAt: integer("created_at").notNull(),
}, (table) => [
  unique('uq_reaction').on(table.entityType, table.entityId, table.userId, table.reactionType),
  index('idx_reactions_entity').on(table.entityType, table.entityId),
  index('idx_reactions_user').on(table.userId),
  index('idx_reactions_created').on(sql`desc ${table.createdAt}`),
]);

// activityFeedEntries - Denormalized activity stream for fast retrieval
export const activityFeedEntries = sqliteTable("activity_feed_entries", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // owner of the activity
  actorId: text("actor_id").notNull().references(() => users.id), // who performed the action
  action: text("action").notNull(), // created_club, joined_club, registered_event, completed_workout, etc.
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  metadata: text("metadata").notNull(), // JSON: { club_name, workout_title, ... }
  visibility: integer("visibility").notNull().default(1), // 1=public_to_club, 2=public_global, 0=private
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index('idx_feed_user_created').on(table.userId, sql`desc ${table.createdAt}`),
  index('idx_feed_actor_id').on(table.actorId),
  index('idx_feed_entity').on(table.entityType, table.entityId),
]);

// clubChallenges - Competitive goals within clubs
export const clubChallenges = sqliteTable("club_challenges", {
  id: text("id").primaryKey(),
  clubId: text("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  challengeType: text("challenge_type").notNull(), // distance, strength, consistency, weight_loss, etc.
  metric: text("metric").notNull(), // e.g., "total_km", "max_squat_kg", "workout_days"
  unit: text("unit").notNull(), // km, kg, days, etc.
  startDate: integer("start_date").notNull(),
  endDate: integer("end_date").notNull(),
  targetValue: real("target_value"), // optional target to achieve
  isIndividual: integer("is_individual").default(1), // 1=individual leaderboard, 0=team-based
  isActive: integer("is_active").default(1),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index('idx_club_challenges_club_id').on(table.clubId),
  index('idx_club_challenges_dates').on(table.startDate, table.endDate),
]);

// challengeParticipants - Enrollment tracking
export const challengeParticipants = sqliteTable("challenge_participants", {
  id: text("id").primaryKey(),
  challengeId: text("challenge_id").notNull().references(() => clubChallenges.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("active"), // active, completed, withdrew
  initialValue: real("initial_value").default(0), // starting metric value
  currentValue: real("current_value").default(0), // latest progress
  joinedAt: integer("joined_at").notNull(),
  completedAt: integer("completed_at"),
}, (table) => [
  unique('uq_challenge_participant').on(table.challengeId, table.userId),
  index('idx_challenge_participants_challenge_status').on(table.challengeId, table.status),
  index('idx_challenge_participants_user_id').on(table.userId),
  index('idx_challenge_participants_current_value').on(table.challengeId, table.currentValue),
]);

// challengeLeaderboardSnapshots - Materialized rankings (no live ranking)
export const challengeLeaderboardSnapshots = sqliteTable("challenge_leaderboard_snapshots", {
  id: text("id").primaryKey(),
  challengeId: text("challenge_id").notNull().references(() => clubChallenges.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rank: integer("rank").notNull(),
  metricValue: real("metric_value").notNull(),
  snapshotDate: integer("snapshot_date").notNull(), // Unix timestamp when snapshot was taken
}, (table) => [
  index('idx_leaderboard_snapshots_challenge_date').on(table.challengeId, table.snapshotDate),
  index('idx_leaderboard_snapshots_user_id').on(table.userId),
]);

// clubPosts - Discussions within clubs
export const clubPosts = sqliteTable("club_posts", {
  id: text("id").primaryKey(),
  clubId: text("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isPinned: integer("is_pinned").default(0),
  isAnnouncement: integer("is_announcement").default(0),
  likeCount: integer("like_count").default(0),
  commentCount: integer("comment_count").default(0),
  lastActivityAt: integer("last_activity_at").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index('idx_club_posts_club_id').on(table.clubId),
  index('idx_club_posts_author_id').on(table.authorId),
  index('idx_club_posts_club_pinned_created').on(table.clubId, table.isPinned, sql`desc ${table.createdAt}`),
]);

// notificationTemplates - Push notification templates
export const notificationTemplates = sqliteTable("notification_templates", {
  id: text("id").primaryKey(),
  type: text("type").notNull().unique(), // club_invite, event_reminder, challenge_update, friend_activity, etc.
  titleTemplate: text("title_template").notNull(),
  bodyTemplate: text("body_template").notNull(),
  icon: text("icon"), // emoji or icon name
  sound: text("sound").default("default"),
  actionUrl: text("action_url"), // deep link
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index('idx_notification_templates_type').on(table.type),
]);

// userBlocks - Privacy/blocking for social features
export const userBlocks = sqliteTable("user_blocks", {
  id: text("id").primaryKey(),
  blockerId: text("blocker_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  blockedId: text("blocked_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason"), // harassment, spam, inappropriate_content, etc.
  createdAt: integer("created_at").notNull(),
}, (table) => [
  unique('uq_user_block').on(table.blockerId, table.blockedId),
  index('idx_user_blocks_blocker_id').on(table.blockerId),
  index('idx_user_blocks_blocked_id').on(table.blockedId),
]);

// socialInsights - Pre-computed analytics for users and clubs
export const socialInsights = sqliteTable("social_insights", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  period: text("period").notNull(), // daily, weekly, monthly
  start: integer("start").notNull(), // Unix timestamp for period start
  end: integer("end").notNull(), // Unix timestamp for period end
  metrics: text("metrics").notNull(), // JSON: { posts_created, comments_added, reactions_given, clubs_joined, events_attended, challenges_completed }
  generatedAt: integer("generated_at").notNull(),
}, (table) => [
  unique('uq_social_insight').on(table.userId, table.period, table.start),
  index('idx_social_insights_period_start').on(table.period, table.start),
  index('idx_social_insights_user_id').on(table.userId),
]);

// clubSearch - Denormalized search blob (alternative to full-text search)
export const clubSearch = sqliteTable("club_search", {
  clubId: text("club_id").primaryKey().references(() => clubs.id, { onDelete: "cascade" }),
  searchBlob: text("search_blob").notNull(), // Concatenation: name + description + category + location + owner_name
  memberCount: integer("member_count").notNull().default(0),
  lastActivityAt: integer("last_activity_at").notNull(),
}, (table) => [
  index('idx_club_search_blob').on(table.searchBlob),
  index('idx_club_search_member_count').on(sql`desc ${table.memberCount}`),
]);

// Export schema object for Drizzle
export const schema = {
  users,
  sessions,
  bodyPhotos,
  bodyMetrics,
  bodyHeatmaps,
  bodyHeatmapHistory,
  visionAnalyses,
  foodItems,
  foodLogs,
  dailyNutritionSummaries,
  nutritionConsults,
  workouts,
  workoutExercises,
  workoutRoutines,
  routineExercises,
  bodyInsights,
  userGoals,
  planDeviations,
  workoutCompletions,
  dailySchedules,
  workoutTemplates,
  conversations,
  aiRecommendations,
  memoryNodes,
  memoryEdges,
  compressedContexts,
  gamificationProfiles,
  badges,
  achievements,
  socialProofCards,
  activityEvents,
  systemMetrics,
  userAnalytics,
  shareableContent,
  formAnalysisVideos,
  formAnalyses,
  notifications,
  migrations,
  dailyCheckins,
  streakFreezes,
  pointTransactions,
  leaderboardSnapshots,
  socialRelationships,
  liveWorkoutSessions,
  setRpeLogs,
  sleepLogs,
  // Acoustic myography tables
  acousticBaselines,
  acousticSessions,
  acousticAudioChunks,
  muscleFatigueReadings,
  acousticFatigueTrends,
  // Adaptive macro oscillation tables
  userMacroTargets,
  macroAdjustmentSessions,
  macroAdjustmentLogs,
  sensorDataSnapshots,
  biometricSnapshots,
  correlationFindings,
  bodyAvatarModels,
  bodyProjections,

  // Social Features Tables
  clubs,
  clubMembers,
  clubEvents,
  eventAttendees,
  comments,
  reactions,
  activityFeedEntries,
  clubChallenges,
  challengeParticipants,
  challengeLeaderboardSnapshots,
  clubPosts,
  notificationTemplates,
  userBlocks,
  socialInsights,
  clubSearch,
};
