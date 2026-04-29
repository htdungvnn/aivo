import { Hono } from "hono";
import { z } from "zod";
import { createDrizzleInstance, conversations, workoutRoutines, dailySchedules, planDeviations } from "@aivo/db";
import { eq, and, desc, gte, lt, asc, inArray, isNotNull } from "drizzle-orm";
import type { D1Database } from "@cloudflare/workers-types";
// import { optimize_content_wasm } from "@aivo/optimizer";  // Temporarily disabled - WASM init issues
import { AdaptivePlanner, VoiceParser } from "@aivo/compute";
import { MemoryService } from "../lib/memory-service";
import { authenticate, getUserFromContext, type AuthUser } from "../middleware/auth";
import { createAIService, type ChatMessage } from "../utils/unified-ai-service";
import type { PlanDeviationScore, RecoveryCurve, VoiceLogRequest, VoiceParseResult } from "@aivo/shared-types";

export interface Env {
  DB: D1Database;
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
}

const ChatRequest = z.object({
  userId: z.string(),
  message: z.string().min(1).max(2000),
  context: z.array(z.string()).optional(),
});

export const AIRouter = () => {
  const router = new Hono<{ Bindings: Env }>();

  // Apply authentication to all AI routes
  router.use("*", authenticate);

  // In-memory cache for conversation history (per Worker instance)
  // Key: userId, Value: { history: Array<{message: string, response: string}>, fetchedAt: number }
  const historyCache = new Map<string, { history: Array<{ message: string; response: string }>; fetchedAt: number }>();

  // Cache TTL: 30 seconds (conversation history is time-sensitive)
  const HISTORY_CACHE_TTL = 30000;

  const getCachedHistory = (userId: string): Array<{ message: string; response: string }> | null => {
    const entry = historyCache.get(userId);
    if (!entry) {
      return null;
    }
    if (Date.now() - entry.fetchedAt > HISTORY_CACHE_TTL) {
      historyCache.delete(userId);
      return null;
    }
    return entry.history;
  };

  const setCachedHistory = (userId: string, history: Array<{ message: string; response: string }>) => {
    historyCache.set(userId, { history, fetchedAt: Date.now() });
  };

  const invalidateHistoryCache = (userId: string) => {
    historyCache.delete(userId);
  };

  // Initialize unified AI service (lazy initialization)
  let cachedAIService: ReturnType<typeof createAIService> | null = null;

  const getAIService = (env: Env) => {
    if (!cachedAIService) {
      cachedAIService = createAIService({
        openaiApiKey: env.OPENAI_API_KEY,
        geminiApiKey: env.GEMINI_API_KEY,
        defaultProvider: 'auto',
        costOptimization: 'balanced', // Can be 'aggressive', 'balanced', 'quality'
        maxCostPerRequest: 0.50, // Max $0.50 per request
        qualityThreshold: 7, // Minimum quality score 7/10
      });
    }
    return cachedAIService;
  };

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
   *     description: Send a message to the AI fitness coach (auto-selects best model)
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
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;

    try {
      const body = await c.req.json();
      const validated = ChatRequest.parse(body);

      // Ensure the userId in the body matches the authenticated user
      if (validated.userId !== userId) {
        return c.json({ success: false, error: "Cannot chat as another user" }, 403);
      }

      // Check if any AI service is configured
      if (!c.env.OPENAI_API_KEY && !c.env.GEMINI_API_KEY) {
        return c.json({ success: false, error: "AI service not configured" }, 503);
      }

      // Try to get conversation history from cache
      let historySource: Array<{ message: string; response: string }> | null = getCachedHistory(userId);

      // If not in cache, fetch from database
      if (historySource === null) {
        const historyRows = await drizzle.query.conversations.findMany({
          where: (conv, { eq }) => eq(conv.userId, userId),
          orderBy: (conv, { desc }) => desc(conv.createdAt),
          limit: 20,
        });

        // Transform to simple {message, response} format for caching
        historySource = historyRows.map((conv) => ({
          message: conv.message,
          response: conv.response,
        }));

        // Cache the history
        setCachedHistory(userId, historySource);
      }

      // At this point, historySource is guaranteed to be non-null
      const history = historySource!;

      // Build messages array
      const systemPrompt = `You are AIVO, an expert AI fitness coach and nutrition advisor.`;

      const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
      ];

      // Get memory context if available
      const openaiKey = c.env.OPENAI_API_KEY;
      if (openaiKey) {
        try {
          const memoryService = getMemoryService(c.env.DB, openaiKey);
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

      // Add conversation history
      if (history.length > 0) {
        const allMessages: ChatMessage[] = [];
        history.reverse().forEach((conv) => {
          allMessages.push({ role: "user", content: conv.message });
          if (conv.response) {
            allMessages.push({ role: "assistant", content: conv.response });
          }
        });

        // Use recent messages
        const recent = allMessages.slice(-10);
        messages.push(...recent);
      }

      messages.push({ role: "user", content: validated.message });

      // Use unified AI service with automatic model selection
      const aiService = getAIService(c.env);
      const response = await aiService.chat(messages, {
        temperature: 0.7,
        maxTokens: 1000,
        jsonMode: false,
      });

      const aiMessage = response.content;
      const tokensUsed = response.tokensUsed?.total || 0;
      const modelUsed = response.model;
      const provider = response.provider;

      const conversationId = crypto.randomUUID();

      // Insert conversation and get the inserted row
      const [insertedConversation] = await drizzle.insert(conversations).values({
        id: conversationId,
        userId,
        message: validated.message,
        response: aiMessage,
        context: validated.context ? JSON.stringify(validated.context) : null,
        tokensUsed,
        model: `${provider}:${modelUsed}`,
        createdAt: Math.floor(Date.now() / 1000),
      }).returning();

      // Process conversation for memory extraction (async, don't await to avoid blocking response)
      if (openaiKey) {
        try {
          const memoryService = getMemoryService(c.env.DB, openaiKey);
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

      // Invalidate conversation history cache to ensure next request gets fresh data
      invalidateHistoryCache(userId);

      return c.json({
        success: true,
        data: {
          message: aiMessage,
          tokensUsed,
          model: modelUsed,
          provider,
          cost: response.cost,
          selection: response.selection ? {
            selectedModel: response.selection.model.name,
            estimatedCost: response.selection.estimatedCost,
            reasoning: response.selection.reasoning,
          } : undefined,
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

  // Voice-to-action parsing endpoint
  /**
   * @swagger
   * /ai/voice-parse:
   *   post:
   *     summary: Parse Voice Entry
   *     description: Parse natural language voice entry into structured fitness/nutrition data
   *     tags: [ai]
   *     security:
   *       - bearer: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               text:
   *                 type: string
   *                 description: Transcribed text from voice input
   *               contextHint:
   *                 type: string
   *                 description: Optional context hint (e.g., "morning", "post-workout")
   *             required:
   *               - text
   *     responses:
   *       200:
   *         description: Parsed structured data
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     hasFood:
   *                       type: boolean
   *                     hasWorkout:
   *                       type: boolean
   *                     hasBodyMetric:
   *                       type: boolean
   *                     foodEntries:
   *                       type: array
   *                       items:
   *                         $ref: "#/components/schemas/ParsedFoodEntry"
   *                     workoutEntries:
   *                       type: array
   *                       items:
   *                         $ref: "#/components/schemas/ParsedWorkoutEntry"
   *                     bodyMetrics:
   *                       type: array
   *                       items:
   *                         $ref: "#/components/schemas/ParsedBodyMetric"
   *                     overallConfidence:
   *                       type: number
   *                     needsClarification:
   *                       type: boolean
   *                     clarificationQuestions:
   *                       type: array
   *                       items:
   *                         type: string
   */
  router.post("/voice-parse", async (c) => {
    try {
      const body = await c.req.json();
      const { text, context_hint } = body as VoiceLogRequest;

      if (!text || typeof text !== "string") {
        return c.json({ success: false, error: "Text is required" }, 400);
      }

      // Call WASM voice parser
      const resultJson = VoiceParser.parseVoiceEntry(
        text,
        context_hint || null
      );

      const parsedResult = JSON.parse(resultJson) as VoiceParseResult;

      return c.json({
        success: true,
        data: parsedResult,
      });
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error("Voice parse error:", error);
      const message = error instanceof Error ? error.message : "Parsing failed";
      return c.json({ success: false, error: message }, 500);
    }
  });

  // Voice logging with Whisper transcription (accepts audio)
  /**
   * @swagger
   * /ai/voice-log:
   *   post:
   *     summary: Voice Log with Transcription
   *     description: Accepts audio (base64), transcribes via Whisper, parses into structured data
   *     tags: [ai]
   *     security:
   *       - bearer: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               audio:
   *                 type: string
   *                 description: Base64-encoded audio (mp3, wav, m4a, webm)
   *               text:
   *                 type: string
   *                 description: Direct text (if already transcribed)
   *               context_hint:
   *                 type: string
   *                 description: Optional context (e.g., "morning", "post-workout")
   *     responses:
   *       200:
   *         description: Parsed structured data
   */
  router.post("/voice-log", async (c) => {
    try {
      const body = await c.req.json();
      const { audio, text: providedText, context_hint } = body as {
        audio?: string;
        text?: string;
        context_hint?: string;
      };

      let text = providedText;

      // If audio is provided, transcribe with Whisper (OpenAI only)
      if (audio) {
        const openaiKey = c.env.OPENAI_API_KEY;
        if (!openaiKey) {
          return c.json({ success: false, error: "Audio transcription requires OpenAI API key. Please configure OPENAI_API_KEY." }, 503);
        }

        // Decode base64 to buffer
        const audioBuffer = Buffer.from(audio, "base64");

        // Create form data for Whisper API
        const formData = new FormData();
        const blob = new Blob([audioBuffer], { type: "audio/mp3" });
        formData.append("file", blob, "audio.mp3");
        formData.append("model", "whisper-1");

        const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errBody = await response.json();
          const errMsg = (errBody as { error?: { message?: string } })?.error?.message || response.statusText;
          throw new Error(`Whisper error: ${errMsg}`);
        }

        const transcription = await response.json() as { text: string };
        text = transcription.text;
      }

      if (!text || typeof text !== "string") {
        return c.json({ success: false, error: "No text provided or transcription failed" }, 400);
      }

      // Call WASM voice parser
      const resultJson = VoiceParser.parseVoiceEntry(text, context_hint || null);
      const parsedResult = JSON.parse(resultJson) as VoiceParseResult;

      return c.json({
        success: true,
        data: parsedResult,
        transcribed_text: text, // Include transcription for client reference
      });
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error("Voice log error:", error);
      const message = error instanceof Error ? error.message : "Voice logging failed";
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
    const authUser = getUserFromContext(c) as AuthUser;
    const requestedUserId = c.req.param("userId");

    // Users can only access their own history
    if (authUser.id !== requestedUserId) {
      return c.json({ success: false, error: "Forbidden" }, 403);
    }

    const limit = parseInt(c.req.query("limit") || "50");
    const drizzle = createDrizzleInstance(c.env.DB);
    const conversationsList = await drizzle.query.conversations.findMany({
      where: (conv, { eq }) => eq(conv.userId, requestedUserId),
      orderBy: (conv, { desc }) => desc(conv.createdAt),
      limit,
    });

    return c.json(conversationsList);
  });

  // Get available AI models and their pricing
  /**
   * @swagger
   * /ai/models:
   *   get:
   *     summary: List available AI models
   *     description: Get list of available AI models with pricing and capabilities
   *     tags: [ai]
   *     security:
   *       - bearer: []
   *     responses:
   *       200:
   *         description: List of models
   */
  router.get("/models", async (c) => {
    const aiService = getAIService(c.env);
    const models = aiService.getAvailableModels();

    return c.json({
      success: true,
      data: models.map(model => ({
        id: model.id,
        name: model.name,
        provider: model.provider,
        contextWindow: model.contextWindow,
        maxOutputTokens: model.maxOutputTokens,
        pricing: {
          inputPer1M: model.inputPricePer1M,
          outputPer1M: model.outputPricePer1M,
        },
        capabilities: model.capabilities,
        qualityScore: model.qualityScore,
      })),
      config: {
        costOptimization: aiService['config'].costOptimization,
        maxCostPerRequest: aiService['config'].maxCostPerRequest,
        qualityThreshold: aiService['config'].qualityThreshold,
      },
    });
  });

  // Estimate cost for a task
  /**
   * @swagger
   * /ai/estimate-cost:
   *   post:
   *     summary: Estimate AI cost for a task
   *     description: Get cost estimate for a given prompt/task
   *     tags: [ai]
   *     security:
   *       - bearer: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               prompt:
   *                 type: string
   *                 description: The prompt or task description
   *               estimatedOutputTokens:
   *                 type: number
   *                 description: Estimated output tokens (optional)
   *             required:
   *               - prompt
   *     responses:
   *       200:
   *         description: Cost estimates for available models
   */
  router.post("/estimate-cost", async (c) => {
    try {
      const body = await c.req.json();
      const { prompt, estimatedOutputTokens } = body as { prompt: string; estimatedOutputTokens?: number };

      if (!prompt || typeof prompt !== 'string') {
        return c.json({ success: false, error: "Prompt is required" }, 400);
      }

      const aiService = getAIService(c.env);
      const selection = aiService.getRecommendation(prompt, estimatedOutputTokens);

      // Get cost for all capable models
      const allModels = aiService.getAvailableModels();
      const inputTokens = Math.ceil(prompt.length / 4);
      const outputTokens = estimatedOutputTokens || Math.min(Math.ceil(prompt.length / 3), 2000);

      const estimates = allModels
        .filter(model => {
          const totalTokens = inputTokens + outputTokens;
          return totalTokens <= model.contextWindow && outputTokens <= model.maxOutputTokens;
        })
        .map(model => ({
          model: model.id,
          name: model.name,
          provider: model.provider,
          estimatedCost: (inputTokens / 1_000_000) * model.inputPricePer1M + (outputTokens / 1_000_000) * model.outputPricePer1M,
          qualityScore: model.qualityScore,
        }))
        .sort((a, b) => a.estimatedCost - b.estimatedCost);

      return c.json({
        success: true,
        data: {
          recommendation: {
            model: selection.model.id,
            name: selection.model.name,
            provider: selection.model.provider,
            estimatedCost: selection.estimatedCost,
            reasoning: selection.reasoning,
          },
          allEstimates: estimates,
          tokenEstimate: { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens },
        },
      });
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error("Cost estimation error:", error);
      const message = error instanceof Error ? error.message : "Estimation failed";
      return c.json({ success: false, error: message }, 500);
    }
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
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;

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

      // Fetch current routine and its exercises (only for this user)
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

      // Use unified AI service for model selection
      const aiService = getAIService(c.env);
      const response = await aiService.chat(
        [{ role: "system", content: "You are an AI fitness coach that optimizes workout schedules based on recovery and adherence data." },
         { role: "user", content: prompt }],
        {
          temperature: 0.7,
          maxTokens: 2000,
          jsonMode: true,
        }
      );

      const aiResponse = response.content;

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
