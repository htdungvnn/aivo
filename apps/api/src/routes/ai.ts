import { Hono } from "hono";
import { z } from "zod";
import { OpenAPIHono } from "@hono/zod-openapi";
import { createDrizzleInstance } from "@aivo/db";
import { optimize_content_wasm } from "@aivo/optimizer";

export interface Env {
  DB: D1Database;
  OPENAI_API_KEY?: string;
}

const ChatRequest = z.object({
  userId: z.string(),
  message: z.string().min(1).max(2000),
  context: z.array(z.string()).optional(),
});

const ChatResponse = z.object({
  success: z.boolean(),
  data: z.object({
    message: z.string(),
    tokensUsed: z.number(),
    timestamp: z.string(),
  }),
});

export const AIRouter = () => {
  const router = new Hono<{ Bindings: Env }>();

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

      await drizzle.insert(drizzle.conversations).values({
        id: crypto.randomUUID(),
        userId: validated.userId,
        message: validated.message,
        response: aiMessage,
        context: validated.context ? JSON.stringify(validated.context) : null,
        tokensUsed,
        model: "gpt-4o-mini",
        createdAt: Date.now(),
      });

      return c.json({
        success: true,
        data: {
          message: aiMessage,
          tokensUsed,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: unknown) {
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

  return router;
};
