import { Hono } from "hono";
import { z } from "zod";
import { createDrizzleInstance } from "@aivo/db";
import { gamificationProfiles, pointTransactions, streakFreezes, dailyCheckins, users, bodyMetrics } from "@aivo/db";
import { eq, and, desc, asc, count, gte, gt, isNull } from "drizzle-orm";
import type { D1Database } from "@cloudflare/workers-types";
import type { Context } from "hono";
import type { KVNamespace } from "@cloudflare/workers-types";
import { authenticate, getUserFromContext, type AuthUser } from "../middleware/auth";

type DrizzleInstance = ReturnType<typeof createDrizzleInstance>;

export interface Env {
  DB: D1Database;
  LEADERBOARD_CACHE: KVNamespace;
}

export const GamificationRouter = () => {
  const router = new Hono<{ Bindings: Env }>();

  // Apply authentication to all gamification routes
  router.use("*", authenticate);

// ============================================
// SCHEMAS
// ============================================

const CheckinSchema = z.object({
  userId: z.string(),
  source: z.enum(["workout", "manual", "auto"]).optional().default("manual"),
  workoutId: z.string().optional(),
});

const PurchaseFreezeSchema = z.object({
  userId: z.string(),
});

const ShareSchema = z.object({
  userId: z.string(),
  theme: z.string().optional().default("default"),
  hideWeight: z.boolean().optional().default(false),
});

const LeaderboardQuerySchema = z.object({
  limit: z.number().int().positive().optional().default(100),
  friendsOnly: z.boolean().optional().default(false),
});

// ============================================
// CONSTANTS
// ============================================

const FREEZE_COST = 50;
const SHARE_BONUS_POINTS = 25;

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

// ============================================
// HELPER FUNCTIONS
// ============================================

async function awardPoints(
  c: Context,
  drizzle: DrizzleInstance,
  userId: string,
  points: number,
  type: "earn" | "spend" | "bonus" | "penalty",
  reason: string,
  relatedId?: string
) {
  const now = Math.floor(Date.now() / 1000);

  const profile = await drizzle.query.gamificationProfiles.findFirst({
    where: eq(gamificationProfiles.userId, userId),
  });

  if (!profile) {
    throw new Error("Gamification profile not found");
  }

  const newBalance = (profile.totalPoints ?? 0) + points;
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
      updatedAt: now,
    })
    .where(eq(gamificationProfiles.userId, userId));

  await drizzle.insert(pointTransactions).values({
    id: `tx_${crypto.randomUUID()}`,
    userId,
    type,
    amount: points,
    reason,
    relatedId: relatedId ?? null,
    balanceAfter: newBalance,
    createdAt: now,
  });

  return { newBalance, newLevel, newXp, xpToNext };
}

// ============================================
// CHECK-IN ENDPOINT
// ============================================

router.post("/checkin", async (c) => {
  try {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;
    const body = await c.req.json();
    const { source, workoutId } = CheckinSchema.parse(body);

    const drizzle = createDrizzleInstance(c.env.DB);
    const now = Math.floor(Date.now() / 1000);
    const today = new Date().toISOString().split("T")[0];

    const existing = await drizzle.query.dailyCheckins.findFirst({
      where: and(
        eq(dailyCheckins.userId, userId),
        eq(dailyCheckins.date, today)
      ),
    });

    if (existing) {
      return c.json({ success: false, message: "Already checked in today" }, 400);
    }

    await drizzle.insert(dailyCheckins).values({
      userId,
      date: today,
      checkedInAt: now,
      source: source ?? "manual",
      workoutId: workoutId ?? null,
    });

    await drizzle
      .update(gamificationProfiles)
      .set({ lastActivityDate: today, updatedAt: now })
      .where(eq(gamificationProfiles.userId, userId));

    await awardPoints(c, drizzle, userId, 10, "earn", "Daily check-in");

    return c.json({
      success: true,
      message: "Check-in recorded",
      date: today,
      checkedInAt: now,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    // eslint-disable-next-line no-console
    console.error("Checkin error:", error);
    return c.json({ success: false, message: "Failed to record check-in" }, 500);
  }
});

router.get("/streak/:userId", async (c) => {
  try {
    const authUser = getUserFromContext(c) as AuthUser;
    const requesterId = authUser.id;
    const { userId } = c.req.param();

    // Users can only view their own streak
    if (requesterId !== userId) {
      return c.json({ success: false, message: "Unauthorized" }, 403);
    }
    const drizzle = createDrizzleInstance(c.env.DB);

    const profile = await drizzle.query.gamificationProfiles.findFirst({
      where: eq(gamificationProfiles.userId, userId),
    });

    if (!profile) {
      const now = Math.floor(Date.now() / 1000);
      await drizzle.insert(gamificationProfiles).values({
        id: `gp_${crypto.randomUUID()}`,
        userId,
        totalPoints: 0,
        level: 1,
        currentXp: 0,
        xpToNextLevel: 100,
        streakCurrent: 0,
        streakLongest: 0,
        lastActivityDate: null,
        freezeCount: 0,
        updatedAt: now,
      });

      return c.json({
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastCheckin: null,
        lastActivityDate: null,
        needsCheckin: true,
        profile: { totalPoints: 0, level: 1, currentXp: 0, xpToNextLevel: 100 },
      });
    }

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const cutoffDate = ninetyDaysAgo.toISOString().split("T")[0];

    const checkins = await drizzle.query.dailyCheckins.findMany({
      where: and(
        eq(dailyCheckins.userId, userId),
        gte(dailyCheckins.date, cutoffDate)
      ),
      orderBy: asc(dailyCheckins.date),
    });

    const checkinDates = checkins.map((c) => c.date);
    const currentStreak = computeStreak(checkinDates);
    const longestStreak = Math.max(
      profile.streakLongest ?? 0,
      findLongestStreak(checkinDates)
    );

    const today = new Date().toISOString().split("T")[0];
    const hasCheckedInToday = checkinDates.includes(today);

    return c.json({
      userId,
      currentStreak,
      longestStreak,
      lastCheckin: checkinDates[checkinDates.length - 1] ?? null,
      lastActivityDate: profile.lastActivityDate,
      needsCheckin: !hasCheckedInToday,
      profile: {
        totalPoints: profile.totalPoints ?? 0,
        level: profile.level ?? 1,
        currentXp: profile.currentXp ?? 0,
        xpToNextLevel: profile.xpToNextLevel ?? 100,
        freezeCount: profile.freezeCount ?? 0,
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Streak fetch error:", error);
    return c.json({ success: false, message: "Failed to fetch streak data" }, 500);
  }
});

// ============================================
// FREEZE ENDPOINTS
// ============================================

router.post("/freeze/purchase", async (c) => {
  try {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;
    const drizzle = createDrizzleInstance(c.env.DB);
    const now = Math.floor(Date.now() / 1000);

    const profile = await drizzle.query.gamificationProfiles.findFirst({
      where: eq(gamificationProfiles.userId, userId),
    });

    if (!profile) {
      return c.json({ success: false, message: "Profile not found. Please check in first." }, 404);
    }

    if ((profile.totalPoints ?? 0) < FREEZE_COST) {
      return c.json({
        success: false,
        message: `Insufficient points. Need ${FREEZE_COST}, have ${profile.totalPoints}`,
      }, 400);
    }

    const existingFreezes = await drizzle.query.streakFreezes.findMany({
      where: and(
        eq(streakFreezes.userId, userId),
        isNull(streakFreezes.usedAt)
      ),
    });

    if (existingFreezes.length >= 3) {
      return c.json({ success: false, message: "Maximum 3 freezes allowed" }, 400);
    }

    const newBalance = (profile.totalPoints ?? 0) - FREEZE_COST;
    await drizzle
      .update(gamificationProfiles)
      .set({
        totalPoints: newBalance,
        freezeCount: (profile.freezeCount ?? 0) + 1,
        updatedAt: now,
      })
      .where(eq(gamificationProfiles.userId, userId));

    await drizzle.insert(pointTransactions).values({
      id: `tx_${crypto.randomUUID()}`,
      userId,
      type: "spend",
      amount: -FREEZE_COST,
      reason: "purchase_streak_freeze",
      relatedId: null,
      balanceAfter: newBalance,
      createdAt: now,
    });

    const expiresAt = now + 30 * 24 * 60 * 60;
    await drizzle.insert(streakFreezes).values({
      id: `freeze_${crypto.randomUUID()}`,
      userId,
      purchasedAt: now,
      usedAt: null,
      usedOnDate: null,
      expiresAt,
      pointsSpent: FREEZE_COST,
    });

    return c.json({
      success: true,
      message: "Streak freeze purchased",
      data: {
        newBalance,
        activeFreezes: existingFreezes.length + 1,
        expiresAt,
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Freeze purchase error:", error);
    return c.json({ success: false, message: "Failed to purchase freeze" }, 500);
  }
});

router.post("/freeze/apply", async (c) => {
  try {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;
    const drizzle = createDrizzleInstance(c.env.DB);
    const now = Math.floor(Date.now() / 1000);
    const targetDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const freeze = await drizzle.query.streakFreezes.findFirst({
      where: and(
        eq(streakFreezes.userId, userId),
        isNull(streakFreezes.usedAt),
        gt(streakFreezes.expiresAt, now)
      ),
    });

    if (!freeze) {
      return c.json({ success: false, message: "No available freeze. Purchase one first." }, 404);
    }

    await drizzle
      .update(streakFreezes)
      .set({
        usedAt: now,
        usedOnDate: targetDate,
      })
      .where(eq(streakFreezes.id, freeze.id));

    await drizzle.insert(dailyCheckins).values({
      userId,
      date: targetDate,
      checkedInAt: now,
      source: "freeze",
      workoutId: null,
    });

    return c.json({
      success: true,
      message: "Freeze applied",
      data: { date: targetDate, freezeId: freeze.id },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Freeze apply error:", error);
    return c.json({ success: false, message: "Failed to apply freeze" }, 500);
  }
});

// ============================================
// LEADERBOARD ENDPOINTS
// ============================================

router.get("/leaderboard", async (c) => {
  try {
    const query = LeaderboardQuerySchema.parse(c.req.query());
    const { limit, friendsOnly } = query;
    const cache = c.env.LEADERBOARD_CACHE;

    const cacheKey = friendsOnly
      ? `leaderboard:friends:${limit}`
      : `leaderboard:global:${limit}`;
    const cached = await cache.get<string>(cacheKey);
    if (cached) {
      return c.json(JSON.parse(cached));
    }

    const drizzle = createDrizzleInstance(c.env.DB);

    if (friendsOnly) {
      return c.json({ success: false, message: "Friends-only leaderboard not yet implemented" }, 501);
    }

    const topProfiles = await drizzle.query.gamificationProfiles.findMany({
      with: {
        user: {
          columns: { id: true, name: true, picture: true },
        },
      },
      orderBy: desc(gamificationProfiles.totalPoints),
      limit: Math.min(limit, 500),
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

    await cache.put(cacheKey, JSON.stringify(leaderboard), { expirationTtl: 300 });

    return c.json({ success: true, data: leaderboard, cached: false });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Leaderboard error:", error);
    return c.json({ success: false, message: "Failed to fetch leaderboard" }, 500);
  }
});

router.get("/leaderboard/rank/:userId", async (c) => {
  try {
    const authUser = getUserFromContext(c) as AuthUser;
    const requesterId = authUser.id;
    const { userId } = c.req.param();

    // Users can only view their own rank
    if (requesterId !== userId) {
      return c.json({ success: false, message: "Unauthorized" }, 403);
    }
    const drizzle = createDrizzleInstance(c.env.DB);

    const profile = await drizzle.query.gamificationProfiles.findFirst({
      where: eq(gamificationProfiles.userId, userId),
    });

    if (!profile) {
      return c.json({ success: false, message: "Profile not found" }, 404);
    }

    const result = await drizzle
      .select({ count: count() })
      .from(gamificationProfiles)
      .where(gte(gamificationProfiles.totalPoints, (profile.totalPoints ?? 0) + 1))
      .execute();

    const rank = (result[0]?.count ?? 0) + 1;

    return c.json({
      success: true,
      data: {
        userId,
        rank,
        points: profile.totalPoints ?? 0,
        percentile: Math.max(0, 100 - (rank / 1000) * 100).toFixed(1),
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Rank fetch error:", error);
    return c.json({ success: false, message: "Failed to fetch rank" }, 500);
  }
});

// ============================================
// POINTS ENDPOINT
// ============================================

router.get("/points/:userId", async (c) => {
  try {
    const authUser = getUserFromContext(c) as AuthUser;
    const requesterId = authUser.id;
    const { userId } = c.req.param();

    // Users can only view their own points
    if (requesterId !== userId) {
      return c.json({ success: false, message: "Unauthorized" }, 403);
    }
    const drizzle = createDrizzleInstance(c.env.DB);

    const profile = await drizzle.query.gamificationProfiles.findFirst({
      where: eq(gamificationProfiles.userId, userId),
    });

    if (!profile) {
      return c.json({ success: false, message: "Profile not found" }, 404);
    }

    const transactions = await drizzle.query.pointTransactions.findMany({
      where: eq(pointTransactions.userId, userId),
      orderBy: desc(pointTransactions.createdAt),
      limit: 50,
    });

    return c.json({
      success: true,
      data: {
        balance: profile.totalPoints ?? 0,
        level: profile.level ?? 1,
        currentXp: profile.currentXp ?? 0,
        xpToNextLevel: profile.xpToNextLevel ?? 100,
        streakCurrent: profile.streakCurrent ?? 0,
        streakLongest: profile.streakLongest ?? 0,
        freezeCount: profile.freezeCount ?? 0,
        transactions: transactions.map((tx) => ({
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          reason: tx.reason,
          balanceAfter: tx.balanceAfter,
          createdAt: tx.createdAt,
        })),
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Points fetch error:", error);
    return c.json({ success: false, message: "Failed to fetch points data" }, 500);
  }
});

// ============================================
// SHARE ENDPOINTS
// ============================================

router.post("/share/generate", async (c) => {
  try {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;
    const drizzle = createDrizzleInstance(c.env.DB);

    // Get optional query parameters
    const hideWeight = c.req.query("hideWeight") === "true";
    const theme = c.req.query("theme") || "default";

    const [profile, bodyMetricsList, user] = await Promise.all([
      drizzle.query.gamificationProfiles.findFirst({ where: eq(gamificationProfiles.userId, userId) }),
      drizzle.query.bodyMetrics.findMany({
        where: eq(bodyMetrics.userId, userId),
        orderBy: desc(bodyMetrics.timestamp),
        limit: 1,
      }),
      drizzle.query.users.findFirst({ where: eq(users.id, userId) }),
    ]);

    if (!profile || !user) {
      return c.json({ success: false, message: "User profile not found" }, 404);
    }

    const bmi = bodyMetricsList[0]?.bmi ?? null;
    const weight = hideWeight ? null : (bodyMetricsList[0]?.weight ?? null);

    const svgContent = generateShareSVGTemplate(
      user.name,
      profile.streakCurrent ?? 0,
      profile.totalPoints ?? 0,
      profile.level ?? 1,
      bmi,
      weight,
      theme
    );

    return c.json({
      success: true,
      data: {
        svg: svgContent,
        shareUrl: `https://aivo.app/share?userId=${encodeURIComponent(userId)}`,
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Share generate error:", error);
    return c.json({ success: false, message: "Failed to generate share card" }, 500);
  }
});

router.post("/share/record", async (c) => {
  try {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;
    const drizzle = createDrizzleInstance(c.env.DB);

    await awardPoints(c, drizzle, userId, SHARE_BONUS_POINTS, "earn", "Social share");

    return c.json({
      success: true,
      message: `Share recorded! +${SHARE_BONUS_POINTS} points earned`,
      pointsAwarded: SHARE_BONUS_POINTS,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Share record error:", error);
    return c.json({ success: false, message: "Failed to record share" }, 500);
  }
});

// ============================================
// SHARE SVG TEMPLATE
// ============================================

function generateShareSVGTemplate(
  userName: string,
  streakDays: number,
  points: number,
  level: number,
  bmi: number | null,
  weight: number | null,
  theme: string
): string {
  const colors: Record<string, { bg: string; text: string; accent: string }> = {
    default: { bg: "#1a1a2e", text: "#ffffff", accent: "#4ade80" },
    dark: { bg: "#0f0f23", text: "#ffffff", accent: "#60a5fa" },
    light: { bg: "#f8fafc", text: "#1e293b", accent: "#10b981" },
    ocean: { bg: "#0c4a6e", text: "#f0f9ff", accent: "#38bdf8" },
  };
  const themeColors = colors[theme] ?? colors.default;

  const weightDisplay = weight !== null ? `${weight} kg` : "";
  const bmiDisplay = bmi !== null ? `BMI: ${bmi.toFixed(1)}` : "";

  return `
<svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${themeColors.bg}"/>
  <text x="540" y="400" font-family="Arial, sans-serif" font-size="48" fill="${themeColors.text}" text-anchor="middle">
    ${escapeXml(userName)}
  </text>
  <text x="540" y="500" font-family="Arial, sans-serif" font-size="32" fill="${themeColors.accent}" text-anchor="middle">
    🔥 ${streakDays} day streak
  </text>
  <text x="540" y="580" font-family="Arial, sans-serif" font-size="28" fill="${themeColors.text}" text-anchor="middle">
    Level ${level} • ${points.toLocaleString()} points
  </text>
  ${weightDisplay || bmiDisplay ? `
  <text x="540" y="660" font-family="Arial, sans-serif" font-size="24" fill="${themeColors.text}" text-anchor="middle">
    ${weightDisplay} ${bmiDisplay ? `• ${bmiDisplay}` : ""}
  </text>
  ` : ""}
  <text x="540" y="800" font-family="Arial, sans-serif" font-size="24" fill="${themeColors.text}" text-anchor="middle" opacity="0.7">
    Join me on AIVO!
  </text>
  <text x="540" y="850" font-family="Arial, sans-serif" font-size="20" fill="${themeColors.text}" opacity="0.5" text-anchor="middle">
    aivo.app
  </text>
</svg>`.trim();
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

  return router;
};
