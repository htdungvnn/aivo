// ============================================
// USER EXTENDED TYPES
// ============================================
// Additional user-related types that don't belong in core user.ts

export interface UpdateUserInput {
  name?: string;
  age?: number;
  gender?: "male" | "female" | "non_binary" | "prefer_not_to_say";
  height?: number;
  weight?: number;
  picture?: string;
  fitnessLevel?: "beginner" | "intermediate" | "advanced" | "elite";
}

export interface UserProfileUpdate {
  bio?: string;
  location?: string;
  website?: string;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
  };
  privacySettings?: {
    profilePublic: boolean;
    shareWorkouts: boolean;
    shareBodyMetrics: boolean;
  };
}

export interface UserPatch {
  fields: (keyof UpdateUserInput)[];
  values: UpdateUserInput;
}

export interface PublicUser {
  id: string;
  name: string;
  avatarUrl?: string;
  fitnessLevel: string;
  memberSince: string;
  achievements: {
    workouts: number;
    streak: number;
    level: number;
  };
}

export interface UserFilter {
  fitnessLevel?: string;
  goals?: string[];
  location?: string;
  hasPublicProfile?: boolean;
}
