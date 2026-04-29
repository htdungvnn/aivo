// ============================================
// AI-GENERATED INFOGRAPHICS
// ============================================
import type { WorkoutType } from "./workout";
import type { MuscleGroup } from "./body";

/**
 * Infographic template types for social proof content
 */
export type InfographicTemplate =
  | "weekly_summary"
  | "milestone"
  | "streak"
  | "muscle_heatmap"
  | "comparison";

/**
 * Color palette configuration for infographic theming
 */
export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  textMuted: string;
}

/**
 * Typography configuration for infographic rendering
 */
export interface TypographyConfig {
  headlineFont: string;
  bodyFont: string;
  headlineSize: number;
  subheadSize: number;
  bodySize: number;
}

/**
 * Complete infographic configuration
 */
export interface InfographicConfig {
  template: InfographicTemplate;
  theme: "dark" | "light" | "neon" | "ocean" | "sunset" | "vibrant";
  layout: "portrait" | "landscape" | "square";
  colorScheme: ColorPalette;
  typography: TypographyConfig;
  includeStats: string[];
  includeComparison: boolean;
}

/**
 * AI-generated story content for the infographic
 */
export interface InfographicStory {
  headline: string;
  subheadline?: string;
  narrative: string;  // Main "hype" paragraph
  stats: Array<{
    label: string;
    value: string | number;
    unit?: string;
    comparison?: string;  // e.g., "Top 10% of users"
    icon?: string;
  }>;
  callToAction: string;
  funFacts: string[];
  tone: "motivational" | "celebratory" | "educational" | "competitive";
  readingLevel: "easy" | "medium" | "challenging";
}

/**
 * User statistics for infographic generation
 */
export interface UserStats {
  period: {
    startDate: string;  // ISO date YYYY-MM-DD
    endDate: string;    // ISO date YYYY-MM-DD
    type: "weekly" | "monthly" | "all_time";
  };
  workouts: {
    count: number;
    totalMinutes: number;
    totalCalories: number;
    avgDuration: number;
    types: Record<WorkoutType, number>;
    personalRecords: PersonalRecord[];
  };
  strength: {
    totalVolume: number;
    topExercises: Array<{ name: string; volume: number }>;
    estimatedOneRMs: Record<string, number>;
  };
  gamification: {
    streak: number;
    longestStreak: number;
    points: number;
    level: number;
    badges: number;
    leaderboardRank?: number;
    percentile?: number;
  };
  body: {
    weightChange?: number;
    bodyFatChange?: number;
    muscleGain?: number;
    bmi?: number;
    healthScore?: number;
    muscleDevelopment?: Array<{ group: MuscleGroup; score: number }>;
  };
  comparisons: {
    vsAverage: Record<string, number>;
    personalBests: Array<{ metric: string; improvement: number }>;
  };
}

/**
 * Complete infographic data structure
 */
export interface InfographicData {
  id: string;
  userId: string;
  template: InfographicTemplate;
  config: InfographicConfig;
  story: InfographicStory;
  stats: UserStats;
  createdAt: Date;
  shareableImageUrl?: string;  // R2 URL after rendering
  svgContent?: string;  // Raw SVG (for debugging)
  width: number;
  height: number;
}

/**
 * Personal record data
 */
export interface PersonalRecord {
  exercise: string;
  weight: number;
  reps: number;
  date: string;
  previous?: number;
  improvementPercent?: number;
}

/**
 * Render result from WASM infographic generator
 */
export interface InfographicRenderResult {
  svg: string;
  pngBuffer?: Uint8Array;
  pngUrl?: string;
  renderTimeMs: number;
  width: number;
  height: number;
}

// Type alias for convenience
export type InfographicRequest = {
  period: { type: "weekly" | "monthly"; start: string; end?: string };
  template?: string;
  config?: Partial<InfographicConfig>;
};
