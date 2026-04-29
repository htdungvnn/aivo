// ============================================
// USER & AUTHENTICATION
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
