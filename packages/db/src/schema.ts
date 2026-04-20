import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  integer,
  real,
  index,
  primaryKey,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  age: integer("age"),
  gender: varchar("gender", { length: 20 }).enum(["male", "female", "other"]),
  height: real("height"), // in cm
  weight: real("weight"), // in kg
  restingHeartRate: integer("resting_heart_rate"),
  maxHeartRate: integer("max_heart_rate"),
  fitnessLevel: varchar("fitness_level", { length: 20 }).enum([
    "beginner",
    "intermediate",
    "advanced",
    "elite",
  ]),
  goals: jsonb("goals"), // array of goal strings
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("email_idx").on(table.email),
}));

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

// Workouts table
export const workouts = pgTable("workouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull().enum([
    "strength",
    "cardio",
    "hiit",
    "yoga",
    "running",
    "cycling",
    "swimming",
    "pilates",
    "other",
  ]),
  name: varchar("name", { length: 255 }),
  duration: integer("duration").notNull(), // in minutes
  caloriesBurned: integer("calories_burned"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  notes: text("notes"),
  metrics: jsonb("metrics"), // flexible metrics storage
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("user_id_idx").on(table.userId),
  typeIdx: index("type_idx").on(table.type),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
}));

export const insertWorkoutSchema = createInsertSchema(workouts);
export const selectWorkoutSchema = createSelectSchema(workouts);

// Workout Exercises table
export const workoutExercises = pgTable("workout_exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  workoutId: uuid("workout_id").notNull().references(() => workouts.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  sets: integer("sets").notNull(),
  reps: integer("reps").notNull(),
  weight: real("weight"), // in kg
  restTime: integer("rest_time"), // in seconds
  notes: text("notes"),
  order: integer("order").default(0),
}, (table) => ({
  workoutIdIdx: index("workout_exercises_workout_id_idx").on(table.workoutId),
}));

export const insertWorkoutExerciseSchema = createInsertSchema(workoutExercises);
export const selectWorkoutExerciseSchema = createSelectSchema(workoutExercises);

// AI Conversations table
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  response: text("response").notNull(),
  context: jsonb("context"), // array of context strings
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("conversations_user_id_idx").on(table.userId),
  createdAtIdx: index("conversations_created_at_idx").on(table.createdAt),
}));

export const insertConversationSchema = createInsertSchema(conversations);
export const selectConversationSchema = createSelectSchema(conversations);

// AI Recommendations table
export const recommendations = pgTable("recommendations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull().enum([
    "workout_suggestion",
    "recovery_advice",
    "nutrition_tip",
    "form_correction",
    "goal_adjustment",
  ]),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  confidence: real("confidence").notNull(), // 0-1
  actions: jsonb("actions").notNull(), // array of action objects
  expiresAt: timestamp("expires_at"),
  isRead: integer("is_read").default(0), // boolean as integer
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("recommendations_user_id_idx").on(table.userId),
  expiresAtIdx: index("recommendations_expires_at_idx").on(table.expiresAt),
}));

export const insertRecommendationSchema = createInsertSchema(recommendations);
export const selectRecommendationSchema = createSelectSchema(recommendations);

// Heart Rate Zones table (for tracking zone data)
export const heartRateZones = pgTable("heart_rate_zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workoutId: uuid("workout_id").references(() => workouts.id, { onDelete: "cascade" }),
  zoneNumber: integer("zone_number").notNull(), // 1-5
  zoneName: varchar("zone_name", { length: 50 }).notNull(),
  minHr: integer("min_hr").notNull(),
  maxHr: integer("max_hr").notNull(),
  timeInZone: integer("time_in_zone").notNull(), // seconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("hr_zones_user_id_idx").on(table.userId),
  workoutIdIdx: index("hr_zones_workout_id_idx").on(table.workoutId),
}));

// Activity Events table (for real-time tracking)
export const activityEvents = pgTable("activity_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workoutId: uuid("workout_id").references(() => workouts.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull().enum([
    "track_metrics",
    "heart_rate_zone",
    "workout_complete",
    "goal_progress",
  ]),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("activity_events_user_id_idx").on(table.userId),
  workoutIdIdx: index("activity_events_workout_id_idx").on(table.workoutId),
  createdAtIdx: index("activity_events_created_at_idx").on(table.createdAt),
}));

export type InsertUser = typeof insertUserSchema._type;
export type SelectUser = typeof selectUserSchema._type;
export type InsertWorkout = typeof insertWorkoutSchema._type;
export type SelectWorkout = typeof selectWorkoutSchema._type;
export type InsertWorkoutExercise = typeof insertWorkoutExerciseSchema._type;
export type SelectWorkoutExercise = typeof selectWorkoutExerciseSchema._type;
export type InsertConversation = typeof insertConversationSchema._type;
export type SelectConversation = typeof selectConversationSchema._type;
export type InsertRecommendation = typeof insertRecommendationSchema._type;
export type SelectRecommendation = typeof selectRecommendationSchema._type;
