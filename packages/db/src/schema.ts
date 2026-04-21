import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ============================================
// AIVO DATABASE SCHEMA for Cloudflare D1 (SQLite)
// ============================================

const now = () => sql`${Math.floor(Date.now() / 1000)}`;

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
  createdAt: integer("created_at").default(now()).notNull(),
  updatedAt: integer("updated_at").default(now()).notNull(),
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
  createdAt: integer("created_at").default(now()).notNull(),
  updatedAt: integer("updated_at").default(now()).notNull(),
});

// Body metrics table
export const bodyMetrics = sqliteTable("body_metrics", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  timestamp: integer("timestamp").default(now()).notNull(),
  weight: real("weight"),
  bodyFatPercentage: real("body_fat_percentage"),
  muscleMass: real("muscle_mass"),
  boneMass: real("bone_mass"),
  waterPercentage: real("water_percentage"),
  bmi: real("bmi"),
  waistCircumference: real("waist_circumference"),
  chestCircumference: real("chest_circumference"),
  hipCircumference: real("hip_circumference"),
  notes: text("notes"),
});

// Body heatmaps table
export const bodyHeatmaps = sqliteTable("body_heatmaps", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  timestamp: integer("timestamp").default(now()).notNull(),
  imageUrl: text("image_url"),
  vectorData: text("vector_data"),
  metadata: text("metadata"),
});

// Vision analyses table
export const visionAnalyses = sqliteTable("vision_analyses", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  processedUrl: text("processed_url"),
  analysis: text("analysis"),
  confidence: real("confidence"),
  createdAt: integer("created_at").default(now()).notNull(),
});

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
  createdAt: integer("created_at").default(now()).notNull(),
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

// Daily schedules table
export const dailySchedules = sqliteTable("daily_schedules", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: text("date"),
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
  createdAt: integer("created_at").default(now()).notNull(),
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
  createdAt: integer("created_at").default(now()).notNull(),
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
});

// Memory edges table
export const memoryEdges = sqliteTable("memory_edges", {
  id: text("id").primaryKey(),
  fromNodeId: text("from_node_id").notNull().references(() => memoryNodes.id, { onDelete: "cascade" }),
  toNodeId: text("to_node_id").notNull().references(() => memoryNodes.id, { onDelete: "cascade" }),
  relationship: text("relationship"),
  weight: real("weight"),
});

// Compressed contexts table
export const compressedContexts = sqliteTable("compressed_contexts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  originalTokens: integer("original_tokens"),
  compressedTokens: integer("compressed_tokens"),
  compressionRatio: real("compression_ratio"),
  strategy: text("strategy"),
  context: text("context"),
  createdAt: integer("created_at").default(now()).notNull(),
  expiresAt: integer("expires_at"),
});

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
});

// Badges table
export const badges = sqliteTable("badges", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type"),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon"),
  earnedAt: integer("earned_at").default(now()).notNull(),
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
  createdAt: integer("created_at").default(now()).notNull(),
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
  serverTimestamp: integer("server_timestamp").default(now()).notNull(),
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
  createdAt: integer("created_at").default(now()).notNull(),
});

// Migrations table
export const migrations = sqliteTable("migrations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  appliedAt: integer("applied_at").default(now()).notNull(),
  hash: text("hash").notNull(),
  version: integer("version"),
});

// Export schema object for Drizzle
export const schema = {
  users,
  sessions,
  bodyMetrics,
  bodyHeatmaps,
  visionAnalyses,
  workouts,
  workoutExercises,
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
  migrations,
};
