import { Hono } from "hono";
import { z } from "zod";
import { createDrizzleInstance } from "@aivo/db";
import { schema } from "@aivo/db/schema";
import { eq, gte, lte, and, sql, desc, isNull } from "drizzle-orm";
import { CorrelationAnalyzer } from "@aivo/compute";
import type { D1Database } from "@cloudflare/workers-types";
import type { KVNamespace } from "@cloudflare/workers-types";

interface BiometricEnv {
  DB: D1Database;
  LEADERBOARD_CACHE: KVNamespace;
}

export const BiometricRouter = () => {
  const router = new Hono<{ Bindings: BiometricEnv }>();

  const SleepLogSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    durationHours: z.number().positive().max(24),
    qualityScore: z.number().int().min(0).max(100).optional(),
    deepSleepMinutes: z.number().int().min(0).max(480).optional(),
    remSleepMinutes: z.number().int().min(0).max(300).optional(),
    awakeMinutes: z.number().int().nonnegative().optional(),
    bedtime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    waketime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    consistencyScore: z.number().int().min(0).max(100).optional(),
    notes: z.string().max(500).optional(),
    source: z.enum(["manual", "device", "ai"]).default("manual"),
  });

  router.post("/sleep", async (c) => {
    const userId = c.req.header("X-User-Id");
    if (!userId) return c.json({ success: false, error: "User ID required" }, 400);

    const body = await c.req.json();
    const validation = SleepLogSchema.safeParse(body);
    if (!validation.success) return c.json({ success: false, error: validation.error.errors }, 400);

    const data = validation.data;
    const now = Math.floor(Date.now() / 1000);
    const logId = `sleep_${userId}_${data.date}_${Date.now()}`;

    try {
      const drizzle = createDrizzleInstance(c.env.DB);

      const existing = await drizzle.query.sleepLogs.findFirst({
        where: and(
          eq(schema.sleepLogs.userId, userId),
          eq(schema.sleepLogs.date, data.date)
        ),
      });

      if (existing) {
        await drizzle
          .update(schema.sleepLogs)
          .set({
            durationHours: data.durationHours,
            qualityScore: data.qualityScore,
            deepSleepMinutes: data.deepSleepMinutes,
            remSleepMinutes: data.remSleepMinutes,
            awakeMinutes: data.awakeMinutes,
            bedtime: data.bedtime,
            waketime: data.waketime,
            consistencyScore: data.consistencyScore,
            notes: data.notes,
            source: data.source,
            updatedAt: now,
          })
          .where(eq(schema.sleepLogs.id, existing.id));
      } else {
        await drizzle.insert(schema.sleepLogs).values({
          id: logId,
          userId,
          date: data.date,
          durationHours: data.durationHours,
          qualityScore: data.qualityScore,
          deepSleepMinutes: data.deepSleepMinutes,
          remSleepMinutes: data.remSleepMinutes,
          awakeMinutes: data.awakeMinutes,
          bedtime: data.bedtime,
          waketime: data.waketime,
          consistencyScore: data.consistencyScore,
          notes: data.notes,
          source: data.source,
          createdAt: now,
          updatedAt: now,
        });
      }

      return c.json({ success: true, data: { date: data.date, userId } });
    } catch (error) {
      console.error("Sleep log error:", error);
      return c.json({ success: false, error: "Failed to save sleep log" }, 500);
    }
  });

  router.get("/sleep/history", async (c) => {
    const userId = c.req.header("X-User-Id");
    if (!userId) return c.json({ success: false, error: "User ID required" }, 400);

    const drizzle = createDrizzleInstance(c.env.DB);
    const limit = Math.min(Number(c.req.query("limit") || "30"), 90);

    const logs = await drizzle.query.sleepLogs.findMany({
      where: eq(schema.sleepLogs.userId, userId),
      orderBy: desc(schema.sleepLogs.date),
      limit,
    });

    return c.json({ success: true, data: logs });
  });

  router.get("/sleep/summary", async (c) => {
    const userId = c.req.header("X-User-Id");
    if (!userId) return c.json({ success: false, error: "User ID required" }, 400);

    const drizzle = createDrizzleInstance(c.env.DB);
    const period = c.req.query("period") as "7d" | "30d" | "90d" || "30d";
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];

    const logs = await drizzle.query.sleepLogs.findMany({
      where: and(
        eq(schema.sleepLogs.userId, userId),
        gte(schema.sleepLogs.date, cutoffStr)
      ),
      orderBy: desc(schema.sleepLogs.date),
    });

    if (logs.length === 0) {
      return c.json({ success: true, data: { averageDuration: 0, averageQuality: 0, consistency: 0 } });
    }

    const totalDuration = logs.reduce((sum, log) => sum + (log.durationHours || 0), 0);
    const avgDuration = totalDuration / logs.length;

    const qualityScores = logs.filter(l => l.qualityScore !== null).map(l => l.qualityScore!) as number[];
    const avgQuality = qualityScores.length > 0
      ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
      : 0;

    const uniqueDates = new Set(logs.map(l => l.date));
    const consistency = uniqueDates.size / days;

    return c.json({
      success: true,
      data: {
        period,
        averageDuration: Math.round(avgDuration * 10) / 10,
        averageQuality: Math.round(avgQuality * 10) / 10,
        consistency: Math.round(consistency * 100) / 100,
        totalDays: uniqueDates.size,
      },
    });
  });

  router.post("/snapshot/generate", async (c) => {
    const userId = c.req.header("X-User-Id");
    if (!userId) return c.json({ success: false, error: "User ID required" }, 400);

    const body = await c.req.json();
    const period = body.period === "7d" ? "7d" : "30d";
    const days = period === "7d" ? 7 : 30;
    const now = Math.floor(Date.now() / 1000);
    const validUntil = now + (30 * 24 * 60 * 60);

    try {
      const drizzle = createDrizzleInstance(c.env.DB);

      const existing = await drizzle.query.biometricSnapshots.findFirst({
        where: and(
          eq(schema.biometricSnapshots.userId, userId),
          eq(schema.biometricSnapshots.period, period),
          gte(schema.biometricSnapshots.generatedAt, now - (12 * 60 * 60))
        ),
        orderBy: desc(schema.biometricSnapshots.generatedAt),
      });

      if (existing) {
        return c.json({ success: true, data: { snapshotId: existing.id, period, message: "Recent snapshot exists" } });
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffStr = cutoffDate.toISOString().split("T")[0];

      const [sleepData, workoutData, nutritionData, bodyMetricsData] = await Promise.all([
        drizzle.query.sleepLogs.findMany({
          where: and(eq(schema.sleepLogs.userId, userId), gte(schema.sleepLogs.date, cutoffStr)),
          orderBy: asc(schema.sleepLogs.date),
        }),
        drizzle.query.workouts.findMany({
          where: and(eq(schema.workouts.userId, userId), gte(schema.workouts.startedAt, cutoffDate.getTime()), isNull(schema.workouts.deletedAt)),
        }),
        drizzle.query.dailyNutritionSummaries.findMany({
          where: and(eq(schema.dailyNutritionSummaries.userId, userId), gte(schema.dailyNutritionSummaries.date, cutoffStr)),
        }),
        drizzle.query.bodyMetrics.findMany({
          where: and(eq(schema.bodyMetrics.userId, userId), gte(schema.bodyMetrics.recordedAt, cutoffDate.getTime())),
        }),
      ]);

      type DailyBiometric = {
        date: string;
        exercise_load: number;
        sleep_quality: number;
        sleep_duration: number;
        calories_consumed: number;
        protein_intake: number;
        carb_intake: number;
        fat_intake: number;
        late_nutrition: number;
        hydration: number;
        recovery_score: number;
        body_weight: number;
        body_fat: number;
        workout_intensity: number;
        consecutive_days: number;
      };

      let daily_data: DailyBiometric[] = [];
      let current_consecutive = 0;
      let lastDate: string | null = null;

      let current = new Date(cutoffDate);
      const endDate = new Date();
      while (current <= endDate && current <= new Date()) {
        const dateStr = current.toISOString().split("T")[0];
        const sleep = sleepData.find(s => s.date === dateStr);
        const nutrition = nutritionData.find(n => n.date === dateStr);
        const dayWorkouts = workoutData.filter(w => new Date(w.startedAt).toISOString().split("T")[0] === dateStr);
        const metric = bodyMetricsData.find(m => new Date(m.recordedAt).toISOString().split("T")[0] === dateStr);

        let exercise_load = 0;
        let workout_intensity = 0;
        for (const w of dayWorkouts) {
          const duration = w.durationMinutes ?? 45;
          const rpe = w.averageRpe ?? 6.0;
          exercise_load += duration * (rpe / 10.0);
          workout_intensity += (rpe / 10.0) * 100;
        }
        if (dayWorkouts.length > 0) workout_intensity /= dayWorkouts.length;

        if (exercise_load > 0 || (sleep && (sleep.qualityScore ?? 0) > 0)) {
          if (lastDate === dateStr || lastDate === null) {
            current_consecutive += 1;
          } else {
            const last = new Date(lastDate!);
            const expectedNext = new Date(last);
            expectedNext.setDate(last.getDate() + 1);
            current_consecutive = current.getTime() === expectedNext.getTime() ? current_consecutive + 1 : 1;
          }
          lastDate = dateStr;
        } else {
          current_consecutive = 0;
        }

        daily_data.push({
          date: dateStr,
          exercise_load,
          sleep_quality: sleep?.qualityScore?.toFloat() ?? 0,
          sleep_duration: sleep?.durationHours ?? 0,
          calories_consumed: nutrition?.totalCalories ?? 0,
          protein_intake: nutrition?.totalProtein_g ?? 0,
          carb_intake: nutrition?.totalCarbs_g ?? 0,
          fat_intake: nutrition?.totalFat_g ?? 0,
          late_nutrition: 0,
          hydration: nutrition?.waterMl ?? 0,
          recovery_score: 50,
          body_weight: metric?.bodyWeight ?? 0,
          body_fat: metric?.bodyFatPercentage ?? 0,
          workout_intensity,
          consecutive_days: current_consecutive,
        });

        current.setDate(current.getDate() + 1);
      }

      daily_data = daily_data.filter(d =>
        d.exercise_load > 0 || d.sleep_quality > 0 || d.sleep_duration > 0 || d.calories_consumed > 0
      );

      if (daily_data.length < 3) {
        return c.json({ success: true, data: { message: "Insufficient data" } });
      }

      const analyzer = new CorrelationAnalyzer();
      const data_json = JSON.stringify({
        period_days: days,
        daily_data: daily_data.map(d => ({
          ...d,
          protein_intake: d.protein_intake,
          carb_intake: d.carb_intake,
          fat_intake: d.fat_intake,
        })),
      });

      const result_json = analyzer.analyzeCorrelations(data_json, days, 2.5);
      const result = JSON.parse(result_json);

      const snapshotId = `snap_${userId}_${period}_${now}`;
      await drizzle.insert(schema.biometricSnapshots).values({
        id: snapshotId,
        userId,
        period,
        generatedAt: now,
        validUntil,
        exerciseLoad: JSON.stringify(result.exercise_load),
        sleep: JSON.stringify(result.sleep),
        nutrition: JSON.stringify(result.nutrition),
        bodyMetrics: JSON.stringify(result.body_metrics),
        recoveryScore: result.recovery_score,
        warnings: JSON.stringify(result.warnings),
      });

      for (const finding of result.findings) {
        const findingId = `corr_${userId}_${now}_${Math.random().toString(36).substr(2, 9)}`;
        await drizzle.insert(schema.correlationFindings).values({
          id: findingId,
          userId,
          snapshotId,
          factorA: finding.factor_a,
          factorB: finding.factor_b,
          correlationCoefficient: finding.correlation_coefficient,
          pValue: finding.p_value,
          confidence: finding.confidence,
          anomalyThreshold: finding.anomaly_threshold,
          anomalyCount: finding.anomaly_count,
          outlierDates: JSON.stringify(finding.outlier_dates),
          explanation: finding.explanation,
          actionableInsight: finding.actionable_insight,
          detectedAt: now,
          validUntil,
          isDismissed: 0,
        });
      }

      return c.json({ success: true, data: { snapshotId, period, ...result } });
    } catch (error) {
      console.error("Snapshot error:", error);
      return c.json({ success: false, error: "Failed to generate snapshot" }, 500);
    }
  });

  router.get("/snapshot/:period", async (c) => {
    const userId = c.req.header("X-User-Id");
    const { period } = c.req.param("period");

    if (!userId) return c.json({ success: false, error: "User ID required" }, 400);
    if (!["7d", "30d"].includes(period)) return c.json({ success: false, error: "Invalid period" }, 400);

    try {
      const drizzle = createDrizzleInstance(c.env.DB);

      const snapshot = await drizzle.query.biometricSnapshots.findFirst({
        where: and(
          eq(schema.biometricSnapshots.userId, userId),
          eq(schema.biometricSnapshots.period, period)
        ),
        orderBy: desc(schema.biometricSnapshots.generatedAt),
      });

      if (!snapshot) return c.json({ success: false, error: "No snapshot found" }, 404);

      return c.json({
        success: true,
        data: {
          id: snapshot.id,
          period: snapshot.period,
          generatedAt: new Date(snapshot.generatedAt * 1000).toISOString(),
          recoveryScore: snapshot.recoveryScore,
          exerciseLoad: JSON.parse(snapshot.exerciseLoad),
          sleep: JSON.parse(snapshot.sleep),
          nutrition: JSON.parse(snapshot.nutrition),
          bodyMetrics: JSON.parse(snapshot.bodyMetrics),
          warnings: JSON.parse(snapshot.warnings),
        },
      });
    } catch (error) {
      console.error("Get snapshot error:", error);
      return c.json({ success: false, error: "Failed to fetch snapshot" }, 500);
    }
  });

  router.get("/correlations", async (c) => {
    const userId = c.req.header("X-User-Id");
    if (!userId) return c.json({ success: false, error: "User ID required" }, 400);

    try {
      const drizzle = createDrizzleInstance(c.env.DB);

      const findings = await drizzle.query.correlationFindings.findMany({
        where: and(
          eq(schema.correlationFindings.userId, userId),
          eq(schema.correlationFindings.isDismissed, 0)
        ),
        orderBy: desc(schema.correlationFindings.detectedAt),
        limit: 50,
      });

      const formatted = findings.map(f => ({
        id: f.id,
        factorA: f.factorA,
        factorB: f.factorB,
        correlationCoefficient: f.correlationCoefficient,
        pValue: f.pValue,
        confidence: f.confidence,
        outlierDates: JSON.parse(f.outlierDates || "[]"),
        explanation: f.explanation,
        actionableInsight: f.actionableInsight,
        detectedAt: new Date(f.detectedAt * 1000).toISOString(),
      }));

      return c.json({ success: true, data: formatted, count: formatted.length });
    } catch (error) {
      console.error("Correlations error:", error);
      return c.json({ success: false, error: "Failed to fetch correlations" }, 500);
    }
  });

  router.patch("/correlations/:id/dismiss", async (c) => {
    const userId = c.req.header("X-User-Id");
    const { id } = c.req.param("id");
    if (!userId) return c.json({ success: false, error: "User ID required" }, 400);

    try {
      const drizzle = createDrizzleInstance(c.env.DB);

      await drizzle
        .update(schema.correlationFindings)
        .set({ isDismissed: 1 })
        .where(and(eq(schema.correlationFindings.id, id), eq(schema.correlationFindings.userId, userId)));

      return c.json({ success: true });
    } catch (error) {
      console.error("Dismiss error:", error);
      return c.json({ success: false, error: "Failed to dismiss" }, 500);
    }
  });

  router.get("/recovery-score", async (c) => {
    const userId = c.req.header("X-User-Id");
    if (!userId) return c.json({ success: false, error: "User ID required" }, 400);

    const period = c.req.query("period") || "7d";

    try {
      const drizzle = createDrizzleInstance(c.env.DB);

      const snapshot = await drizzle.query.biometricSnapshots.findFirst({
        where: and(
          eq(schema.biometricSnapshots.userId, userId),
          eq(schema.biometricSnapshots.period, period)
        ),
        orderBy: desc(schema.biometricSnapshots.generatedAt),
      });

      if (snapshot && snapshot.recoveryScore !== null) {
        return c.json({
          success: true,
          data: {
            score: snapshot.recoveryScore,
            period: snapshot.period,
            generatedAt: new Date(snapshot.generatedAt * 1000).toISOString(),
            source: "cached",
          },
        });
      }

      const days = period === "7d" ? 7 : 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffStr = cutoffDate.toISOString().split("T")[0];

      const [sleepData, workoutData, nutritionData] = await Promise.all([
        drizzle.query.sleepLogs.findMany({
          where: and(eq(schema.sleepLogs.userId, userId), gte(schema.sleepLogs.date, cutoffStr)),
        }),
        drizzle.query.workouts.findMany({
          where: and(eq(schema.workouts.userId, userId), gte(schema.workouts.startedAt, cutoffDate.getTime()), isNull(schema.workouts.deletedAt)),
        }),
        drizzle.query.dailyNutritionSummaries.findMany({
          where: and(eq(schema.dailyNutritionSummaries.userId, userId), gte(schema.dailyNutritionSummaries.date, cutoffStr)),
        }),
      ]);

      const avgSleepQuality = sleepData.filter(s => s.qualityScore !== null).length > 0
        ? sleepData.reduce((sum, s) => sum + (s.qualityScore ?? 0), 0) / sleepData.filter(s => s.qualityScore !== null).length
        : 70;
      const avgSleepDuration = sleepData.length > 0
        ? sleepData.reduce((sum, s) => sum + s.durationHours, 0) / sleepData.length
        : 7;
      const avgExerciseLoad = workoutData.length > 0
        ? workoutData.reduce((sum, w) => sum + ((w.durationMinutes ?? 45) * ((w.averageRpe ?? 6.0) / 10.0)), 0) / workoutData.length
        : 50;
      const nutritionAdequacy = nutritionData.length > 0
        ? nutritionData.reduce((sum, n) => {
            const proteinPct = (n.totalProtein_g * 4 / n.totalCalories) * 100;
            const carbPct = (n.totalCarbs_g * 4 / n.totalCalories) * 100;
            const fatPct = (n.totalFat_g * 9 / n.totalCalories) * 100;
            return sum + (
              (proteinPct >= 10 && proteinPct <= 35 ? 25 : 0) +
              (carbPct >= 45 && carbPct <= 65 ? 25 : 0) +
              (fatPct >= 20 && fatPct <= 35 ? 25 : 0)
            );
          }, 0) / nutritionData.length
        : 50;

      const analyzer = new CorrelationAnalyzer();
      const score = analyzer.calculateRecoveryScore(
        avgSleepQuality / 100,
        avgSleepDuration / 8,
        avgExerciseLoad / 100,
        nutritionAdequacy / 100,
        0.75
      ) * 100;

      return c.json({
        success: true,
        data: {
          score,
          period,
          generatedAt: new Date().toISOString(),
          source: "calculated",
          factors: { avgSleepQuality, avgSleepDuration, avgExerciseLoad, nutritionAdequacy },
        },
      });
    } catch (error) {
      console.error("Recovery score error:", error);
      return c.json({ success: false, error: "Failed to calculate recovery score" }, 500);
    }
  });

  return router;
};
