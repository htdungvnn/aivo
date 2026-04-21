import { drizzle } from "drizzle-orm/d1";
import { migrate } from "drizzle-orm/d1/migrator";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
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

const fullSchema = {
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
} satisfies Record<string, SQLiteTable<any>>;

export async function migrateDb(db: unknown) {
  await migrate(drizzle(db as any, { schema: fullSchema }), { migrationsFolder: "./drizzle/migrations" });
}

export function createDrizzleInstance(db: unknown) {
  return drizzle(db as any, { schema: fullSchema });
}
