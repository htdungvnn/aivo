// ============================================
// VOICE & NATURAL LANGUAGE ENTRY
// ============================================

/**
 * Parsed food entry from voice/text input
 */
export interface ParsedFoodEntry {
  meal_type: string | null; // "breakfast", "lunch", "dinner", "snack"
  food_name: string;
  estimated_calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  confidence: number; // 0-1
  portion_size: string | null;
}

/**
 * Parsed workout entry from voice/text input
 */
export interface ParsedWorkoutEntry {
  workout_type: string | null; // "strength", "cardio", "mobility"
  exercise_name: string;
  sets: number | null;
  reps: number | null;
  weight: number | null;
  weight_unit: string | null; // "kg", "lb"
  duration_minutes: number | null;
  rpe: number | null; // Rate of Perceived Exertion 1-10
  confidence: number; // 0-1
}

/**
 * Parsed body metric from voice/text input
 */
export interface ParsedBodyMetric {
  metric_type: "weight" | "body_fat" | "muscle_mass" | "circumference";
  value: number;
  unit: string;
  confidence: number;
}

/**
 * Complete result of voice parsing
 */
export interface VoiceParseResult {
  has_food: boolean;
  has_workout: boolean;
  has_body_metric: boolean;
  food_entries: ParsedFoodEntry[];
  workout_entries: ParsedWorkoutEntry[];
  body_metrics: ParsedBodyMetric[];
  overall_confidence: number;
  needs_clarification: boolean;
  clarification_questions: string[];
}

/**
 * Voice logging request payload
 */
export interface VoiceLogRequest {
  text: string;
  context_hint?: string; // e.g., "morning", "post-workout", "before bed"
}
