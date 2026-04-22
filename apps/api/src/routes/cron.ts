import { Hono } from "hono";
import { createDrizzleInstance } from "@aivo/db";
import {
  gamificationProfiles,
  dailyCheckins,
  streakFreezes,
  pointTransactions,
  formAnalysisVideos,
} from "@aivo/db";
import { eq, and, sql, desc, asc, gte, gt, isNull } from "drizzle-orm";
import type { D1Database } from "@cloudflare/workers-types";
import type { KVNamespace } from "@cloudflare/workers-types";
// Temporarily disabled - WIP with type errors
// import { processFormAnalysisJob } from "../services/form-analyzer";

type DrizzleInstance = ReturnType<typeof createDrizzleInstance>;

export interface CronEnv {
  DB: D1Database;
  LEADERBOARD_CACHE: KVNamespace;
  OPENAI_API_KEY?: string;
}

const cron = new Hono<{ Bindings: CronEnv }>();

// ============================================
// STREAK UTILITIES
// ============================================

function computeStreak(checkinDates: string[]): number {
  if (checkinDates.length === 0) {return 0;}
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expectedDate = new Date(today);
  let streak = 0;
  const dateSet = new Set(checkinDates);
  while (true) {
    const dateStr = expectedDate.toISOString().split("T")[0];
    if (dateSet.has(dateStr)) {
      streak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function findLongestStreak(checkinDates: string[]): number {
  if (checkinDates.length === 0) {return 0;}
  const dates = checkinDates
    .map((d) => new Date(d))
    .sort((a, b) => a.getTime() - b.getTime());
  let longest = 0;
  let current = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diffDays = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      current++;
    } else {
      longest = Math.max(longest, current);
      current = 1;
    }
  }
  return Math.max(longest, current);
}

async function awardStreakPoints(
  drizzle: DrizzleInstance,
  userId: string,
  points: number,
  timestamp: number
) {
  const profile = await drizzle.query.gamificationProfiles.findFirst({
    where: eq(gamificationProfiles.userId, userId),
  });

  if (!profile) {return;}

  const currentPoints = profile.totalPoints ?? 0;
  const newBalance = currentPoints + points;
  let newXp = (profile.currentXp ?? 0) + points;
  let newLevel = profile.level ?? 1;
  let xpToNext = profile.xpToNextLevel ?? 100;

  while (newXp >= xpToNext) {
    newXp -= xpToNext;
    newLevel += 1;
    xpToNext = Math.floor(100 * Math.pow(1.5, newLevel - 1));
  }

  await drizzle
    .update(gamificationProfiles)
    .set({
      totalPoints: newBalance,
      level: newLevel,
      currentXp: newXp,
      xpToNextLevel: xpToNext,
      updatedAt: timestamp,
    })
    .where(eq(gamificationProfiles.userId, userId));

  await drizzle.insert(pointTransactions).values({
    id: `tx_${crypto.randomUUID()}`,
    userId,
    type: "earn",
    amount: points,
    reason: "streak_maintenance",
    relatedId: null,
    balanceAfter: newBalance,
    createdAt: timestamp,
  });
}

// ============================================
// MAIN CRON JOB
// ============================================

async function runCronJob(env: CronEnv): Promise<{ success: boolean; message: string; stats?: unknown; error?: string }> {
  const startTime = Date.now();
  // eslint-disable-next-line no-console
  console.log("[Cron] Starting daily gamification processing...");

  const drizzle = createDrizzleInstance(env.DB);
  const cache = env.LEADERBOARD_CACHE;
  const now = Math.floor(Date.now() / 1000);
  const today = new Date().toISOString().split("T")[0];

  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const cutoffTimestamp = Math.floor(ninetyDaysAgo.getTime() / 1000);

    const activeProfiles = await drizzle.query.gamificationProfiles.findMany({
      where: gte(gamificationProfiles.updatedAt, cutoffTimestamp),
    });

    // eslint-disable-next-line no-console
    console.log(`[Cron] Processing ${activeProfiles.length} active users`);

    let processedStreaks = 0;
    let streaksReset = 0;
    let leaderboardUpdates = 0;
    let processedVideos = 0;
    let failedVideos = 0;

    for (const profile of activeProfiles) {
      const checkins = await drizzle.query.dailyCheckins.findMany({
        where: and(
          eq(dailyCheckins.userId, profile.userId),
          gte(dailyCheckins.date, ninetyDaysAgo.toISOString().split("T")[0])
        ),
        orderBy: asc(dailyCheckins.date),
      });

      const checkinDates = checkins.map((c) => c.date);
      const currentStreak = computeStreak(checkinDates);
      const longestStreak = Math.max(profile.streakLongest ?? 0, findLongestStreak(checkinDates));

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      const hasYesterdayCheckin = checkinDates.includes(yesterdayStr);

      let newStreak = currentStreak;

      if (!hasYesterdayCheckin && currentStreak > 0) {
        const unusedFreeze = await drizzle.query.streakFreezes.findFirst({
          where: and(
            eq(streakFreezes.userId, profile.userId),
            isNull(streakFreezes.usedAt),
            gt(streakFreezes.expiresAt, now)
          ),
        });

        if (!unusedFreeze) {
          newStreak = 0;
          streaksReset++;
        } else {
          await drizzle
            .update(streakFreezes)
            .set({
              usedAt: now,
              usedOnDate: yesterdayStr,
            })
            .where(eq(streakFreezes.id, unusedFreeze.id));

          await drizzle.insert(dailyCheckins).values({
            userId: profile.userId,
            date: yesterdayStr,
            checkedInAt: now,
            source: "freeze",
            workoutId: null,
          });

          newStreak = 1;
        }
      }

      await drizzle
        .update(gamificationProfiles)
        .set({
          streakCurrent: newStreak,
          streakLongest: longestStreak,
          lastActivityDate: today,
          updatedAt: now,
        })
        .where(eq(gamificationProfiles.userId, profile.userId));

      processedStreaks++;

      if (newStreak > 0 && newStreak % 7 === 0) {
        const weeklyBonus = newStreak * 2;
        await awardStreakPoints(drizzle, profile.userId, weeklyBonus, now);
      }
    }

    const expireThreshold = now - 30 * 24 * 60 * 60;
    await drizzle
      .update(streakFreezes)
      .set({ usedAt: -1 })
      .where(sql`expires_at < ${expireThreshold} AND used_at IS NULL`);

    // ============================================
    // FORM ANALYSIS PROCESSING
    // ============================================
    // Temporarily disabled - WIP with type errors
    /*
    const pendingVideos = await drizzle
      .select()
      .from(formAnalysisVideos)
      .where(eq(formAnalysisVideos.status, "pending"))
      .limit(10); // Process up to 10 videos per cron run to manage costs

    for (const video of pendingVideos) {
      try {
        const result = await processFormAnalysisJob(drizzle, video.id, env.OPENAI_API_KEY ?? "");
        if (result.success) {
          processedVideos++;
          // eslint-disable-next-line no-console
          console.log(`[Cron] Form analysis completed for video ${video.id}`);
        } else {
          failedVideos++;
          // eslint-disable-next-line no-console
          console.error(`[Cron] Form analysis failed for video ${video.id}:`, result.error);
        }
      } catch (error) {
        failedVideos++;
        // eslint-disable-next-line no-console
        console.error(`[Cron] Error processing video ${video.id}:`, error);
      }
    }
    */

    // eslint-disable-next-line no-console
    console.log(`[Cron] Form analysis: ${processedVideos} processed, ${failedVideos} failed`);

    const topProfiles = await drizzle.query.gamificationProfiles.findMany({
      with: {
        user: {
          columns: { id: true, name: true, picture: true },
        },
      },
      orderBy: desc(gamificationProfiles.totalPoints),
      limit: 500,
    }) as Array<{
      userId: string;
      totalPoints: number | null;
      streakCurrent: number | null;
      level: number | null;
      user: { id: string; name: string | null; picture: string | null } | null;
    }>;

    const leaderboard = topProfiles.map((profile, index) => ({
      rank: index + 1,
      userId: profile.userId,
      name: profile.user?.name ?? "Unknown",
      picture: profile.user?.picture,
      points: profile.totalPoints ?? 0,
      streak: profile.streakCurrent ?? 0,
      level: profile.level ?? 1,
    }));

    await cache.put("leaderboard:global:v1", JSON.stringify(leaderboard), { expirationTtl: 3600 });
    await cache.put("leaderboard:top100", JSON.stringify(leaderboard.slice(0, 100)), { expirationTtl: 3600 });

    leaderboardUpdates++;

    const duration = Date.now() - startTime;
    // eslint-disable-next-line no-console
    console.log(`[Cron] Completed: ${processedStreaks} streaks processed, ${streaksReset} reset, ${leaderboardUpdates} leaderboards cached, ${processedVideos} videos analyzed`);
    // eslint-disable-next-line no-console
    console.log(`[Cron] Duration: ${duration}ms`);

    return {
      success: true,
      message: "Daily gamification processing completed",
      stats: {
        processedUsers: processedStreaks,
        streaksReset,
        leaderboardUpdates,
        videosAnalyzed: processedVideos,
        videosFailed: failedVideos,
        durationMs: duration,
        date: today,
      },
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[Cron] Error:", error);
    return {
      success: false,
      message: "Cron processing failed",
      error: String(error),
    };
  }
}

cron.get("/", async (c) => {
  const result = await runCronJob(c.env);
  return c.json(result);
});

export { cron as CronRouter, runCronJob };
