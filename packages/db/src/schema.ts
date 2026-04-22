import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
  index,
  unique
} from "drizzle-orm/sqlite-core";

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
});

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
});

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
});

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
  index('idx_user_id').on(table.userId),
  index('idx_logged_at').on(table.loggedAt),
  index('idx_user_meal').on(table.userId, table.mealType),
]);

// Daily nutrition summaries - materialized aggregates for fast queries
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
});

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
});

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
});

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
});

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
});

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
});

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
});

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
  index('idx_workout_id').on(table.workoutId),
  index('idx_routine_exercise').on(table.routineExerciseId),
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
});

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
});

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
});

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
});

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
});

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
});

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
});

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
});

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
  index('idx_form_videos_created_at').on(table.createdAt),
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
  createdAt: integer("created_at").notNull(),
  completedAt: integer("completed_at"),
  processingTimeMs: integer("processing_time_ms"),
}, (table) => [
  index('idx_form_analyses_user_id').on(table.userId),
  index('idx_form_analyses_created_at').on(table.createdAt),
  index('idx_form_analyses_grade').on(table.grade),
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
  unique('unique_sleep_user_date').on(table.userId, table.date),
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

// Migrations table
export const migrations = sqliteTable("migrations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  appliedAt: integer("applied_at").notNull(),
  hash: text("hash").notNull(),
  version: integer("version"),
});

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
};
