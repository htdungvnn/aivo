/**
 * Infographic Generation API Routes
 *
 * Endpoints:
 * - POST /api/infographic/generate - Generate new infographic
 * - GET  /api/infographic/:id - Retrieve infographic
 * - DELETE /api/infographic/:id - Delete infographic
 * - GET  /api/infographic/templates - List available templates
 */

import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../lib/db";
import { deleteImage } from "../services/r2";
import { generateInfographicStory } from "../services/infographic-ai";
import {
  aggregateUserStats,
} from "../services/user-stats";
import { renderAndUploadInfographic } from "../services/infographic-renderer";
import type {
  InfographicConfig,
  InfographicData,
} from "@aivo/shared-types";
import { socialProofCards } from "@aivo/db";
import type { D1Database } from "@cloudflare/workers-types";
import type { R2Bucket } from "@cloudflare/workers-types";

interface Env {
  DB: D1Database;
  R2: R2Bucket;
  OPENAI_API_KEY?: string;
}

export const InfographicRouter = () => {
  const router = new Hono<{ Bindings: Env }>();

  // Helper to get user ID from auth header
  const getUserIdFromRequest = async (c: Context<{ Bindings: Env }>): Promise<string | null> => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return null;
    }
    // For now, extract user ID from a header
    const userId = c.req.header("X-User-Id");
    return userId || null;
  };

  // Zod schemas for validation
  const generateInfographicSchema = z.object({
    period: z.object({
      type: z.enum(["weekly", "monthly", "all_time"]),
      start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
      end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }),
    template: z.enum([
      "weekly_summary",
      "milestone",
      "streak",
      "muscle_heatmap",
      "comparison",
    ]).optional(),
    config: z
      .object({
        theme: z.enum(["dark", "light", "neon", "ocean", "sunset", "vibrant"]).optional(),
        layout: z.enum(["portrait", "landscape", "square"]).optional(),
      })
      .optional(),
  });

  /**
   * POST /generate
   */
  async function handleGenerateInfographic(c: Context<{ Bindings: Env }>) {
    // 1. Authenticate
    const userId = await getUserIdFromRequest(c);
    if (!userId) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    // Get DB instance
    const db: any = getDb(c.env);

    // 2. Parse and validate request
    const requestBody = await c.req.json().catch(() => null);
    if (!requestBody) {
      return c.json({ success: false, error: "Invalid JSON body" }, 400);
    }

    const validationResult = generateInfographicSchema.safeParse(requestBody);
    if (!validationResult.success) {
      return c.json(
        { success: false, error: "Validation error", details: validationResult.error.issues },
        400
      );
    }

    const { period, template, config } = validationResult.data;

    try {
      // 3. Aggregate user statistics from database
      const stats = await aggregateUserStats(db as any, userId, period);

      // 4. Generate AI narrative
      const story = await generateInfographicStory(userId, stats, {
        template: template || "weekly_summary",
        theme: config?.theme || "vibrant",
        layout: config?.layout || "square",
      } as Partial<InfographicConfig>);

      // 5. Build complete infographic data
      const infographicId = crypto.randomUUID();
      const infographicConfig: InfographicConfig = {
        template: template || "weekly_summary",
        theme: config?.theme || "vibrant",
        layout: config?.layout || "square",
        colorScheme: {
          primary: "#6366f1",
          secondary: "#818cf8",
          accent: "#f97316",
          background: "#ffffff",
          text: "#1f2937",
          textMuted: "#6b7280",
        },
        typography: {
          headlineFont: "Arial, sans-serif",
          bodyFont: "Arial, sans-serif",
          headlineSize: 64,
          subheadSize: 36,
          bodySize: 24,
        },
        includeStats: [],
        includeComparison: true,
      };

      const infographicData: InfographicData = {
        id: infographicId,
        userId,
        template: infographicConfig.template,
        config: infographicConfig,
        story,
        stats,
        createdAt: new Date(),
        width: 1080,
        height: 1080,
      };

      // 6. Render SVG and PNG, upload to R2
      const renderResult = await renderAndUploadInfographic(infographicData, {
        scale: 2.0, // Retina quality
        uploadToR2: true,
        r2Bucket: c.env.R2 as any,
      });

      if (!renderResult.pngUrl) {
        return c.json(
          { success: false, error: "Failed to upload image to storage" },
          500
        );
      }

      // 7. Save record to database
      await db.insert(socialProofCards).values({
        id: infographicId,
        userId,
        type: "infographic",
        title: story.headline,
        subtitle: story.subheadline || "",
        data: JSON.stringify({
          story,
          stats,
          template: infographicConfig.template,
          config: infographicConfig,
        }),
        shareableImageUrl: renderResult.pngUrl,
        createdAt: Math.floor(Date.now() / 1000),
        isPublic: 0,
      });

      // 8. Return success response
      return c.json({
        success: true,
        data: {
          id: infographicId,
          headline: story.headline,
          subheadline: story.subheadline,
          shareableImageUrl: renderResult.pngUrl,
          createdAt: new Date().toISOString(),
          renderTimeMs: renderResult.renderTimeMs,
        },
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Infographic generation failed:", error);
      return c.json(
        { success: false, error: "Failed to generate infographic", message: String(error) },
        500
      );
    }
  }

/**
 * GET /:id
 *
 * Retrieves a specific infographic by ID.
 * User must be owner or infographic must be public.
 */
async function handleGetInfographic(c: Context<{ Bindings: Env }>) {
  const id = c.req.param("id");
  const userId = await getUserIdFromRequest(c);
  const db: any = getDb(c.env);

  const card = await db.query.socialProofCards.findFirst({
    where: (tbl: any, { eq }: { eq: any }) => eq(tbl.id, id),
  });

  if (!card) {
    return c.json({ success: false, error: "Infographic not found" }, 404);
  }

  // Authorization check
  if (card.userId !== userId && !card.isPublic) {
    return c.json({ success: false, error: "Not authorized" }, 403);
  }

  return c.json({
    success: true,
    data: {
      id: card.id,
      title: card.title,
      subtitle: card.subtitle,
      shareableImageUrl: card.shareableImageUrl,
      data: JSON.parse(card.data || "{}"),
      createdAt: new Date(card.createdAt * 1000).toISOString(),
      isPublic: !!card.isPublic,
    },
  });
}

/**
 * DELETE /:id
 *
 * Deletes an infographic (only by owner).
 * Also removes the image from R2.
 */
async function handleDeleteInfographic(c: Context<{ Bindings: Env }>) {
  const id = c.req.param("id") as string;
  const userId = await getUserIdFromRequest(c);

  if (!userId) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  const db: any = getDb(c.env);
  const card = await db.query.socialProofCards.findFirst({
    where: (tbl: any, { eq }: { eq: any }) => eq(tbl.id, id),
  });

  if (!card) {
    return c.json({ success: false, error: "Infographic not found" }, 404);
  }

  // Authorization check - owner or public
  if (card.userId !== userId && !card.isPublic) {
    return c.json({ success: false, error: "Not authorized" }, 403);
  }

  // Delete from R2 if URL exists
  if (card.shareableImageUrl) {
    try {
      const key = extractR2Key(card.shareableImageUrl);
      if (key) {
        await deleteImage(c.env.R2, key);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Failed to delete image from R2:", error);
    }
  }

  // Delete database record
  await db.delete(socialProofCards).where((tbl: any, { eq }: { eq: any }) => eq(tbl.id, id));

  return c.json({ success: true, data: { deleted: true } });
}

/**
 * GET /templates
 *
 * List available infographic templates.
 */
async function handleListTemplates(c: Context<{ Bindings: Env }>) {
  const templates = [
    {
      id: "weekly_summary",
      name: "Weekly Summary",
      description: "Your week in review - workouts, calories, and highlights",
      preview: "/templates/weekly_summary.png",
    },
    {
      id: "milestone",
      name: "Milestone",
      description: "Celebrate achieving a big number or goal",
      preview: "/templates/milestone.png",
    },
    {
      id: "streak",
      name: "Streak",
      description: "Show off your consistency and consecutive days",
      preview: "/templates/streak.png",
    },
    {
      id: "muscle_heatmap",
      name: "Muscle Heatmap",
      description: "Visual representation of muscle development",
      preview: "/templates/muscle_heatmap.png",
    },
    {
      id: "comparison",
      name: "Comparison",
      description: "Before/after or vs average comparisons",
      preview: "/templates/comparison.png",
    },
  ];

  return c.json({ success: true, data: templates });
}

// Register routes
router.post("/generate", async (c) => await handleGenerateInfographic(c));
router.get("/:id", async (c) => await handleGetInfographic(c));
router.delete("/:id", async (c) => await handleDeleteInfographic(c));
router.get("/templates", async (c) => await handleListTemplates(c));

return router;
};

/**
 * Extract R2 key from full URL
 * https://bucket.r2.dev/infographics/user123/png/uuid-123.png
 * -> infographics/user123/png/uuid-123.png
 */
function extractR2Key(url: string): string | null {
  const match = url.match(/https?:\/\/[^\/]+\/(.+)/);
  return match ? match[1] : null;
}

