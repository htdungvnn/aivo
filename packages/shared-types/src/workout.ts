// ============================================
// WORKOUTS & SCHEDULING
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
