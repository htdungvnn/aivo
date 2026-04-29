// ============================================
// GAMIFICATION & RETENTION
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
