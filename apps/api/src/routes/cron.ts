import { Hono } from "hono";
import { createDrizzleInstance } from "@aivo/db";
import { gamificationProfiles, dailyCheckins, streakFreezes, pointTransactions } from "@aivo/db";
import { eq, and, sql, desc, asc, gte, gt } from "drizzle-orm";
import type { Database } from "hono";

type DrizzleInstance = ReturnType<typeof createDrizzleInstance>;

export interface CronEnv {
  DB: Database;
  LEADERBOARD_CACHE: KVNamespace;
}

const cron = new Hono<{ Bindings: CronEnv }>();

// ============================================
// STREAK UTILITIES
// ============================================

function computeStreak(checkinDates: string[]): number {
  if (checkinDates.length === 0) return 0;
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
  if (checkinDates.length === 0) return 0;
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

  if (!profile) return;

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

export async function runCronJob(env: CronEnv): Promise<{ success: boolean; message: string; stats?: any; error?: string }> {
  const startTime = Date.now();
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

    console.log(`[Cron] Processing ${activeProfiles.length} active users`);

    let processedStreaks = 0;
    let streaksReset = 0;
    let leaderboardUpdates = 0;

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
            eq(streakFreezes.usedAt, null),
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

    const topProfiles = await drizzle.query.gamificationProfiles.findMany({
      with: {
        user: {
          columns: { id: true, name: true, picture: true },
        },
      },
      orderBy: desc(gamificationProfiles.totalPoints),
      limit: 500,
    });

    const leaderboard = topProfiles.map((profile, index) => ({
      userId: profile.userId,
      rank: index + 1,
      name: profile.user?.name ?? "Unknown",
      points: profile.totalPoints ?? 0,
      streak: profile.streakCurrent ?? 0,
      level: profile.level ?? 1,
    }));

    await cache.put("leaderboard:global:v1", JSON.stringify(leaderboard), { expirationTtl: 3600 });
    await cache.put("leaderboard:top100", JSON.stringify(leaderboard.slice(0, 100)), { expirationTtl: 3600 });

    leaderboardUpdates++;

    const duration = Date.now() - startTime;
    console.log(`[Cron] Completed: ${processedStreaks} streaks processed, ${streaksReset} reset, ${leaderboardUpdates} leaderboards cached`);
    console.log(`[Cron] Duration: ${duration}ms`);

    return {
      success: true,
      message: "Daily gamification processing completed",
      stats: {
        processedUsers: processedStreaks,
        streaksReset,
        leaderboardUpdates,
        durationMs: duration,
        date: today,
      },
    };
  } catch (error) {
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
