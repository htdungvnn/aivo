import { drizzle } from "drizzle-orm/d1";
import { migrate } from "drizzle-orm/d1/migrator";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import {
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
} from "./schema";

// Export individual tables for direct imports
export {
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

// Build schema object for Drizzle - using simple object without 'as const'
export const dbSchema = {
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

export async function migrateDb(db: unknown) {
  await migrate(drizzle(db as any, { schema: dbSchema }), { migrationsFolder: "./drizzle/migrations" });
}

export function createDrizzleInstance(db: unknown): DrizzleD1Database<typeof dbSchema> {
  return drizzle(db as any, { schema: dbSchema }) as DrizzleD1Database<typeof dbSchema>;
}
