import { Hono } from "hono";
import { z } from "zod";
import { createDrizzleInstance, conversations, workoutRoutines, dailySchedules, planDeviations } from "@aivo/db";
import { eq, and, desc, gte, lt, asc, inArray, isNotNull } from "drizzle-orm";
import type { D1Database } from "@cloudflare/workers-types";
import { optimize_content_wasm } from "@aivo/optimizer";
import { AdaptivePlanner } from "@aivo/compute";
import { MemoryService } from "@aivo/memory-service";
import type { PlanDeviationScore, RecoveryCurve } from "@aivo/shared-types";

export interface Env {
  DB: D1Database;
  OPENAI_API_KEY?: string;
}

const ChatRequest = z.object({
  userId: z.string(),
  message: z.string().min(1).max(2000),
  context: z.array(z.string()).optional(),
});

export const AIRouter = () => {
  const router = new Hono<{ Bindings: Env }>();

  // Memory service cache (initialized on first use with OpenAI key)
  let cachedMemoryService: MemoryService | null = null;

  const getMemoryService = (db: D1Database, openaiKey: string): MemoryService => {
    if (!cachedMemoryService) {
      cachedMemoryService = new MemoryService({
        openaiApiKey: openaiKey,
        db: createDrizzleInstance(db),
      });
    }
    return cachedMemoryService;
  };

  // Types for AI replan response
  interface Adjustment {
    date: string;
    changeType: string;
    fromExercise?: string;
    toExercise?: string;
    fromDate?: string;
    toDate?: string;
    reason: string;
    priority: number;
  }

  interface NewScheduleDay {
    date: string;
    routineId: string;
    workoutId?: string;
    exercises: Array<{
      exerciseName: string;
      sets: number;
      reps: number;
      weight?: number;
      rpe?: number;
    }>;
    recoveryTasks?: string[];
    nutritionGoals?: string[];
    sleepGoal?: string;
    optimizationScore?: number;
    adjustmentsMade?: Adjustment[];
  }

  interface AIReplanResult {
    adjustments: Adjustment[];
    newSchedule: NewScheduleDay[];
    reasoning: string[];
  }

  interface MuscleProfile {
    muscle: string;
    averageSoreness: number;
    sorenessTrend: string;
    recoveryRate: number;
  }

  // Chat endpoint
  /**
   * @swagger
   * /ai/chat:
   *   post:
   *     summary: AI Chat
   *     description: Send a message to the AI fitness coach
   *     tags: [ai]
   *     security:
   *       - bearer: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: "#/components/schemas/ChatRequest"
   *     responses:
   *       200:
   *         description: AI response
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ChatResponse"
   *       401:
   *         description: Unauthorized
   *       503:
   *         description: AI service not configured
   */
  router.post("/chat", async (c) => {
    const drizzle = createDrizzleInstance(c.env.DB);
    const userId = c.req.header("X-User-Id");
    const authHeader = c.req.header("Authorization");

    if (!userId || !authHeader?.startsWith("Bearer ")) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const validated = ChatRequest.parse(body);

    const openaiKey = c.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return c.json({ success: false, error: "AI service not configured" }, 503);
    }

    try {
      // Fetch recent conversation history for context
      const history = await drizzle.query.conversations.findMany({
        where: (conv, { eq }) => eq(conv.userId, userId),
        orderBy: (conv, { desc }) => desc(conv.createdAt),
        limit: 20,
      });

      // Build messages array with token optimization
      const systemPrompt = `You are AIVO, an expert AI fitness coach and nutrition advisor.`;

      const messages: Array<{ role: string; content: string }> = [
        { role: "system", content: systemPrompt },
      ];

      // Get memory context if available
      if (c.env.OPENAI_API_KEY) {
        try {
          const memoryService = getMemoryService(c.env.DB, c.env.OPENAI_API_KEY);
          const memoryContext = await memoryService.getMemoriesForContext(
            userId,
            validated.message,
            1500 // Reserve 500 tokens for conversation history
          );
          if (memoryContext) {
            messages.push({
              role: "system",
              content: memoryContext,
            });
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn("Memory service not available:", error);
          // Continue without memory context
        }
      }

      // Add context if provided
      if (validated.context && validated.context.length > 0) {
        messages.push({
          role: "system",
          content: `User context: ${validated.context.join("; ")}`,
        });
      }

      // Add conversation history with token thinning
      if (history.length > 0) {
        // Transform conversations into OpenAI message format
        // Each conversation row has user message and assistant response
        const allMessages: Array<{ role: string; content: string }> = [];
        history.reverse().forEach((conv) => {
          allMessages.push({ role: "user", content: conv.message });
          if (conv.response) {
            allMessages.push({ role: "assistant", content: conv.response });
          }
        });

        const conversationJson = JSON.stringify({ messages: allMessages });

        const optimizedJson = optimize_content_wasm(conversationJson, "");
        const optimized = JSON.parse(optimizedJson);

        if (optimized.optimizedContent) {
          try {
            const optimizedData = JSON.parse(optimized.optimizedContent);
            if (Array.isArray(optimizedData.messages)) {
              messages.push(...optimizedData.messages.slice(-10));
            }
          } catch {
            // Fallback to recent messages
            const recent = allMessages.slice(-10);
            messages.push(...recent);
          }
        } else {
          // If no optimization, take recent messages directly
          const recent = allMessages.slice(-10);
          messages.push(...recent);
        }
      }

      messages.push({ role: "user", content: validated.message });

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const error = await response.json() as { error?: { message?: string } };
        throw new Error(`OpenAI error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json() as {
        choices: { message: { content: string } }[];
        usage?: { total_tokens: number };
      };
      const aiMessage = data.choices[0]?.message?.content || "No response generated";
      const tokensUsed = data.usage?.total_tokens || 0;

      const conversationId = crypto.randomUUID();

      // Insert conversation and get the inserted row
      const [insertedConversation] = await drizzle.insert(conversations).values({
        id: conversationId,
        userId: validated.userId,
        message: validated.message,
        response: aiMessage,
        context: validated.context ? JSON.stringify(validated.context) : null,
        tokensUsed,
        model: "gpt-4o-mini",
        createdAt: Date.now(),
      }).returning();

      // Process conversation for memory extraction (async, don't await to avoid blocking response)
      if (c.env.OPENAI_API_KEY) {
        try {
          const memoryService = getMemoryService(c.env.DB, c.env.OPENAI_API_KEY);
          memoryService.processConversationTurn(
            userId,
            validated.message,
            aiMessage,
            insertedConversation.id
          ).catch((err: Error) => {
            // eslint-disable-next-line no-console
            console.error("Memory processing failed:", err.message);
            // Don't fail the request if memory processing fails
          });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn("Memory service initialization failed:", error);
        }
      }

      return c.json({
        success: true,
        data: {
          message: aiMessage,
          tokensUsed,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error("AI chat error:", error);
      const message = error instanceof Error ? error.message : "Chat failed";
      return c.json({ success: false, error: message }, 500);
    }
  });

  // Get conversation history
  /**
   * @swagger
   * /ai/history/{userId}:
   *   get:
   *     summary: Get conversation history
   *     description: Retrieve AI chat history for a user
   *     tags: [ai]
   *     security:
   *       - bearer: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: limit
   *         schema:
   *           type: number
   *         description: Maximum number of messages to return
   *     responses:
   *       200:
   *         description: Conversation history
   */
  router.get("/history/:userId", async (c) => {
    const userId = c.req.param("userId");
    const limit = parseInt(c.req.query("limit") || "50");

    const drizzle = createDrizzleInstance(c.env.DB);
    const conversations = await drizzle.query.conversations.findMany({
      where: (conv, { eq }) => eq(conv.userId, userId),
      orderBy: (conv, { desc }) => desc(conv.createdAt),
      limit,
    });

    return c.json(conversations);
  });

  // Adaptive routine replanning endpoint
  /**
   * @swagger
   * /ai/replan:
   *   post:
   *     summary: Replan Routine
   *     description: AI-powered routine adjustment based on deviation and recovery
   *     tags: [ai]
   *     security:
   *       - bearer: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: "#/components/schemas/ReplanRoutineRequest"
   *     responses:
   *       200:
   *         description: Adjusted routine
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ReplanRoutineResponse"
   */
  router.post("/replan", async (c) => {
    const drizzle = createDrizzleInstance(c.env.DB);
    const userId = c.req.header("X-User-Id");
    const authHeader = c.req.header("Authorization");

    if (!userId || !authHeader?.startsWith("Bearer ")) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    const openaiKey = c.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return c.json({ success: false, error: "AI service not configured" }, 503);
    }

    try {
      const body = await c.req.json();

      // Validate required fields
      const currentRoutineId = body.currentRoutineId;
      if (!currentRoutineId) {
        return c.json({ success: false, error: "currentRoutineId is required" }, 400);
      }

      // Fetch current routine and its exercises
      const routine = await drizzle.query.workoutRoutines.findFirst({
        where: (r, { and }) => and(
          eq(r.id, currentRoutineId),
          eq(r.userId, userId)
        ),
      });

      if (!routine) {
        return c.json({ success: false, error: "Routine not found" }, 404);
      }

      const plannedExercises = await drizzle.query.routineExercises.findMany({
        where: (re) => eq(re.routineId, currentRoutineId),
        orderBy: (re) => [asc(re.dayOfWeek), asc(re.orderIndex)],
      });

      if (plannedExercises.length === 0) {
        return c.json({ success: false, error: "Routine has no exercises" }, 400);
      }

      // Fetch workout completions for the current week
      const weekStart = routine.weekStartDate || new Date().toISOString().split('T')[0];
      const weekStartTimestamp = Math.floor(new Date(weekStart).getTime() / 1000);
      const weekEndTimestamp = weekStartTimestamp + 7 * 24 * 60 * 60;

      const userWorkouts = await drizzle.query.workouts.findMany({
        where: (w) => and(
          eq(w.userId, userId),
          isNotNull(w.startTime),
          gte(w.startTime!, weekStartTimestamp),
          lt(w.startTime!, weekEndTimestamp)
        ),
        columns: { id: true },
      });

      const workoutIds = userWorkouts.map(w => w.id);
      const completionRecords = workoutIds.length > 0 ? await drizzle.query.workoutCompletions.findMany({
        where: (wc) => inArray(wc.workoutId, workoutIds),
      }) : [];

      // Fetch body insights (last 30 days)
      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
      const insights = await drizzle.query.bodyInsights.findMany({
        where: (bi) => and(
          eq(bi.userId, userId),
          gte(bi.timestamp, thirtyDaysAgo)
        ),
        orderBy: (bi) => desc(bi.timestamp),
      });

      // Fetch active user goals
      const goals = await drizzle.query.userGoals.findMany({
        where: (g) => and(
          eq(g.userId, userId),
          eq(g.status, "active")
        ),
      });

      // Calculate deviation score using WASM
      const deviationJson = AdaptivePlanner.calculateDeviationScore(
        JSON.stringify(completionRecords),
        JSON.stringify(plannedExercises)
      );
      const deviationScore: PlanDeviationScore = JSON.parse(deviationJson);

      // Analyze recovery curve using WASM
      const muscleGroups = plannedExercises.flatMap(ex => {
        try {
          const groups = JSON.parse(ex.targetMuscleGroups || "[]");
          return Array.isArray(groups) ? groups : [];
        } catch {
          return [];
        }
      });
      const uniqueMuscleGroups = [...new Set(muscleGroups)];

      const recoveryJson = AdaptivePlanner.analyzeRecoveryCurve(
        JSON.stringify(insights),
        JSON.stringify(uniqueMuscleGroups)
      );
      const recoveryCurve: RecoveryCurve = JSON.parse(recoveryJson);

      // Check if reschedule is needed
      const shouldReschedule = AdaptivePlanner.shouldReschedule(deviationJson, recoveryJson);

      if (!shouldReschedule) {
        return c.json({
          success: true,
          data: {
            adjustedRoutine: {
              routineId: currentRoutineId,
              name: routine.name,
              weekStartDate: weekStart,
              adjustments: [],
              optimizationScore: 100,
              newSchedule: [], // unchanged
              reasoning: ["Routine is on track, no adjustments needed"],
            },
            deviationScore,
            appliedAt: new Date().toISOString(),
            nextReviewDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          },
        });
      }

      // Generate adjusted schedule using AI
      const prompt = `You are an expert fitness coach AI. Your task is to adjust a user's weekly workout routine based on their deviation and recovery data.

CURRENT ROUTINE:
${JSON.stringify(plannedExercises.map(ex => ({
  day: ex.dayOfWeek,
  exercise: ex.exerciseName,
  type: ex.exerciseType,
  muscles: JSON.parse(ex.targetMuscleGroups || "[]"),
  sets: ex.sets,
  reps: ex.reps,
  weight: ex.weight,
  rpe: ex.rpe,
})), null, 2)}

DEVIATION SCORE:
- Overall: ${deviationScore.overallScore.toFixed(1)}/100
- Trend: ${deviationScore.trend}
- Completion Rate: ${(deviationScore.completionRate * 100).toFixed(1)}%
- Missed Workouts: ${deviationScore.missedWorkouts}
- Average RPE: ${deviationScore.averageRPE.toFixed(1)}

RECOVERY CURVE:
- Overall Score: ${recoveryCurve.overallRecoveryScore.toFixed(1)}/100
- Recommended Rest Days: ${recoveryCurve.recommendedRestDays}
- Training Intensity: ${recoveryCurve.canTrainIntensity}
- Muscle Profiles:
${recoveryCurve.profiles.map((p: MuscleProfile) => `  ${p.muscle}: soreness=${p.averageSoreness.toFixed(1)}, trend=${p.sorenessTrend}, recovery=${p.recoveryRate} days`).join('\n')}

USER GOALS:
${JSON.stringify(goals.map(g => ({ type: g.type, target: g.targetMetric, priority: g.priority })), null, 2)}

INSTRUCTIONS:
1. Analyze the deviation and recovery data
2. Reshuffle exercises to accommodate fatigue and rest needs
3. Consider muscle group recovery times (don't train same muscle on consecutive days if sore)
4. Maintain workout frequency if possible, but insert rest days if recovery is poor
5. Adjust intensity based on recovery curve (lower weight/sets if recovery score < 50)
6. Preserve exercise order within days where possible
7. Output a complete adjusted schedule with reasoning

Output JSON format:
{
  "adjustments": [
    { "date": "YYYY-MM-DD", "changeType": "move|swap|cancel|add|modify", "fromExercise": "...", "toExercise": "...", "fromDate": "...", "toDate": "...", "reason": "...", "priority": 1 }
  ],
  "newSchedule": [
    { "date": "YYYY-MM-DD", "routineId": "...", "exercises": [{ "exerciseName": "...", "sets": ..., "reps": ..., "weight": ..., "rpe": ... }], "recoveryTasks": [...], "nutritionGoals": [...], "sleepGoal": "..." }
  ],
  "reasoning": ["...", "..."]
}`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are an AI fitness coach that optimizes workout schedules based on recovery and adherence data." },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const error = await response.json() as { error?: { message?: string } };
        throw new Error(`OpenAI error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json() as {
        choices: { message: { content: string } }[];
      };
      const aiResponse = data.choices[0]?.message?.content || "{}";

      // Parse AI response
      let aiResult: AIReplanResult;
      try {
        // Extract JSON from response (may contain markdown)
        const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) || aiResponse.match(/{[\s\S]*}/);
        const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : aiResponse;
        aiResult = JSON.parse(jsonStr);
      } catch {
        // eslint-disable-next-line no-console
        console.error("Failed to parse AI response:", aiResponse);
        return c.json({ success: false, error: "Failed to generate adjusted schedule" }, 500);
      }

      // Create adjusted routine (new workoutRoutines record)
      const adjustedRoutineId = crypto.randomUUID();
      const now = Math.floor(Date.now() / 1000);
      await drizzle.insert(workoutRoutines).values({
        id: adjustedRoutineId,
        userId,
        name: `${routine.name} (Adjusted ${new Date().toISOString().split('T')[0]})`,
        description: `Auto-adjusted based on deviation: ${deviationScore.trend}`,
        weekStartDate: weekStart, // same week, different schedule
        isActive: 1,
        createdAt: now,
        updatedAt: now,
      });

      // Create daily schedules
      for (const day of aiResult.newSchedule) {
        await drizzle.insert(dailySchedules).values({
          id: crypto.randomUUID(),
          userId,
          date: day.date,
          routineId: adjustedRoutineId,
          workoutId: day.workoutId || null,
          recoveryTasks: JSON.stringify(day.recoveryTasks || []),
          nutritionGoals: JSON.stringify(day.nutritionGoals || []),
          sleepGoal: day.sleepGoal || null,
          generatedBy: "ai_replan",
          optimizationScore: day.optimizationScore || deviationScore.overallScore,
          adjustmentsMade: JSON.stringify(day.adjustmentsMade || aiResult.adjustments),
        });
      }

      // Record plan deviation
      await drizzle.insert(planDeviations).values({
        id: crypto.randomUUID(),
        userId,
        originalRoutineId: currentRoutineId,
        adjustedRoutineId,
        deviationScore: deviationScore.overallScore,
        reason: deviationScore.trend,
        adjustmentsJson: JSON.stringify(aiResult.adjustments),
        createdAt: now,
      });

      // Deactivate old routine (optional - keep history)
      await drizzle.update(workoutRoutines)
        .set({ isActive: 0, updatedAt: now })
        .where(and(eq(workoutRoutines.id, currentRoutineId), eq(workoutRoutines.userId, userId)));

      return c.json({
        success: true,
        data: {
          adjustedRoutine: {
            routineId: adjustedRoutineId,
            name: routine.name,
            weekStartDate: weekStart,
            adjustments: aiResult.adjustments,
            optimizationScore: 100 - deviationScore.overallScore,
            newSchedule: aiResult.newSchedule,
            reasoning: aiResult.reasoning,
          },
          deviationScore,
          appliedAt: new Date().toISOString(),
          nextReviewDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
      });
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error("AI replan error:", error);
      const message = error instanceof Error ? error.message : "Replanning failed";
      return c.json({ success: false, error: message }, 500);
    }
  });

  return router;
};
