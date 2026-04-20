// User types
export interface User {
  id: string;
  email: string;
  name: string;
  age?: number;
  gender?: "male" | "female" | "other";
  height?: number; // in cm
  weight?: number; // in kg
  restingHeartRate?: number;
  maxHeartRate?: number;
  fitnessLevel?: FitnessLevel;
  goals?: UserGoal[];
  createdAt: Date;
  updatedAt: Date;
}

export type FitnessLevel = "beginner" | "intermediate" | "advanced" | "elite";

export type UserGoal = "lose_weight" | "gain_muscle" | "improve_endurance" | "maintain_fitness" | "general_health";

// Workout types
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
}

// AI Coach types
export interface Conversation {
  id: string;
  userId: string;
  message: string;
  response: string;
  context?: string[];
  createdAt: Date;
}

export interface AIRecommendation {
  id: string;
  userId: string;
  type: RecommendationType;
  title: string;
  description: string;
  confidence: number; // 0-1
  actions: RecommendationAction[];
  expiresAt?: Date;
  createdAt: Date;
}

export type RecommendationType =
  | "workout_suggestion"
  | "recovery_advice"
  | "nutrition_tip"
  | "form_correction"
  | "goal_adjustment";

export interface RecommendationAction {
  id: string;
  label: string;
  type: "navigate" | "start_workout" | "update_goal" | "custom";
  payload?: Record<string, unknown>;
}

// API types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiBindings {
  Env: {
    DB?: D1Database;
    AI?: Ai;
  };
  CF?: {
    AI?: Ai;
  };
}

// Database schema types (for Drizzle)
export interface UserRow {
  id: string;
  email: string;
  name: string;
  age: number | null;
  gender: "male" | "female" | "other" | null;
  height: number | null;
  weight: number | null;
  resting_heart_rate: number | null;
  max_heart_rate: number | null;
  fitness_level: "beginner" | "intermediate" | "advanced" | "elite" | null;
  goals: string | null; // JSON array
  created_at: Date;
  updated_at: Date;
}

export interface WorkoutRow {
  id: string;
  user_id: string;
  type: WorkoutType;
  name: string | null;
  duration: number;
  calories_burned: number | null;
  start_time: Date;
  end_time: Date;
  notes: string | null;
  metrics: string | null; // JSON
  created_at: Date;
}

export interface WorkoutExerciseRow {
  id: string;
  workout_id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number | null;
  rest_time: number | null;
  notes: string | null;
}

export interface ConversationRow {
  id: string;
  user_id: string;
  message: string;
  response: string;
  context: string | null; // JSON array
  created_at: Date;
}

export interface RecommendationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description: string;
  confidence: number;
  actions: string; // JSON
  expires_at: Date | null;
  created_at: Date;
}

// Client event types
export interface TrackMetricsEvent {
  type: "track_metrics";
  workoutId: string;
  timestamp: Date;
  metrics: {
    heartRate?: number;
    distance?: number;
    pace?: number;
    power?: number;
    elevation?: number;
  };
}

export interface HeartRateZoneEvent {
  type: "heart_rate_zone";
  workoutId: string;
  zone: number;
  enteredAt: Date;
  exitedAt?: Date;
}

export interface WorkoutCompleteEvent {
  type: "workout_complete";
  workoutId: string;
  summary: {
    duration: number;
    caloriesBurned: number;
    avgHeartRate?: number;
    maxHeartRate?: number;
    distance?: number;
  };
}

// Union type for all client events
export type ClientEvent = TrackMetricsEvent | HeartRateZoneEvent | WorkoutCompleteEvent;

// WASM compute types
export interface WasmFitnessCalculator {
  calculateBMI(weightKg: number, heightCm: number): number;
  getBMICategory(bmi: number): "underweight" | "normal" | "overweight" | "obese";
  calculateBMR(weightKg: number, heightCm: number, ageYears: number, isMale: boolean): number;
  calculateTDEE(bmr: number, activityLevel: ActivityLevel): number;
  calculateTargetCalories(tdee: number, goal: Goal): number;
  calculateOneRepMax(weightLifted: number, reps: number): number;
  calculateCaloriesBurned(weightKg: number, minutes: number, metValue: number): number;
  calculateHeartRateZones(restingHR: number, maxHR: number): HeartRateZone[];
  calculateMaxHeartRate(ageYears: number): number;
}

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "lose" | "maintain" | "gain";
