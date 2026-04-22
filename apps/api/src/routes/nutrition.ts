import { Hono } from "hono";
import { z } from "zod";
import { createDrizzleInstance } from "@aivo/db";
import { schema } from "@aivo/db/schema";
import { eq, gte, lte, and } from "drizzle-orm";
import { uploadImage, validateImage } from "../services/r2";
import type { D1Database } from "@cloudflare/workers-types";
import type { R2Bucket } from "@cloudflare/workers-types";
import { FitnessCalculator } from "@aivo/compute";
import { authenticate, getUserFromContext, type AuthUser } from "../middleware/auth";

// Types for daily nutrition summary
interface DailySummaryData {
  userId: string;
  date: string;
  totalCalories: number;
  totalProtein_g: number;
  totalCarbs_g: number;
  totalFat_g: number;
  totalFiber_g: number | null;
  totalSugar_g: number | null;
  foodLogCount: number;
  updatedAt: number;
}

// WASM Image Processor (optional - for image optimization)
interface ImageProcessorWASM {
  ImageProcessor: {
    optimizeForAI: (base64: string, maxDim: number, quality: number) => Promise<string>;
  };
}

type ImageProcessorModule = ImageProcessorWASM | null;
let imageProcessorPromise: Promise<ImageProcessorModule> | null = null;

async function getImageProcessor(): Promise<ImageProcessorModule> {
  if (!imageProcessorPromise) {
    imageProcessorPromise = import("@aivo/compute").then((mod) => mod as ImageProcessorModule).catch((err) => {
      // eslint-disable-next-line no-console
      console.error("Failed to load WASM image processor:", err);
      return null;
    });
  }
  return imageProcessorPromise;
}

/**
 * Optimize image using WASM processor
 * Falls back to original if optimization fails
 */
async function optimizeImage(buffer: Buffer, maxDim: number = 1024, quality: number = 90): Promise<Buffer> {
  try {
    const mod = await getImageProcessor();
    if (!mod) {return buffer;}

    // Convert buffer to base64
    const base64 = `data:image/jpeg;base64,${buffer.toString("base64")}`;

    // Optimize using WASM
    const optimizedBase64 = await mod.ImageProcessor.optimizeForAI(base64, maxDim, quality);

    // Extract base64 part (remove data URL prefix if present)
    const base64Data = optimizedBase64.includes(",")
      ? optimizedBase64.split(",")[1]
      : optimizedBase64;

    // Convert back to buffer
    return Buffer.from(base64Data, "base64");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("Image optimization failed, using original:", error);
    return buffer;
  }
}

export interface EnvWithR2 {
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  OPENAI_API_KEY?: string;
}

// Zod schemas for validation
const FoodItemSchema = z.object({
  name: z.string().min(1).max(255),
  brand: z.string().max(255).optional(),
  servingSize: z.number().positive(),
  servingUnit: z.string(),
  calories: z.number().nonnegative(),
  protein_g: z.number().nonnegative(),
  carbs_g: z.number().nonnegative(),
  fat_g: z.number().nonnegative(),
  fiber_g: z.number().nonnegative().optional(),
  sugar_g: z.number().nonnegative().optional(),
  sodium_mg: z.number().nonnegative().optional(),
});

const FoodLogCreateSchema = z.object({
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack", "pre_workout", "post_workout", "custom"]),
  foodItemId: z.string().optional(),
  customName: z.string().optional(),
  estimatedPortionG: z.number().positive().optional(),
  calories: z.number().nonnegative(),
  protein_g: z.number().nonnegative(),
  carbs_g: z.number().nonnegative(),
  fat_g: z.number().nonnegative(),
  fiber_g: z.number().nonnegative().optional(),
  sugar_g: z.number().nonnegative().optional(),
  loggedAt: z.number().int().positive().optional(),
});

const VisionAnalysisRequestSchema = z.object({
  imageUrl: z.string().url(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack", "pre_workout", "post_workout", "custom"]).optional(),
});

const CreateFromAnalysisSchema = z.object({
  analysisId: z.string().optional(),
  detectedItems: z.array(
    z.object({
      name: z.string(),
      confidence: z.number().min(0).max(1),
      estimatedPortionG: z.number().positive(),
      portionUnit: z.string(),
      calories: z.number().nonnegative(),
      protein_g: z.number().nonnegative(),
      carbs_g: z.number().nonnegative(),
      fat_g: z.number().nonnegative(),
      fiber_g: z.number().nonnegative().optional(),
      sugar_g: z.number().nonnegative().optional(),
      matchedFoodItemId: z.string().optional(),
    })
  ),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack", "pre_workout", "post_workout", "custom"]),
  timestamp: z.number().int().positive().optional(),
});

// Nutrition consultation schemas
const NutritionConsultRequestSchema = z.object({
  userId: z.string(),
  query: z.string().min(1).max(2000),
  context: z.object({
    medicalConditions: z.array(z.string()).optional(),
    medications: z.array(z.string()).optional(), // Accept simple strings, transform to objects
    allergies: z.array(z.string()).optional(),
    intolerances: z.array(z.string()).optional(),
    dietType: z.enum(["omnivore", "vegetarian", "vegan", "pescatarian", "keto", "paleo", "mediterranean"]).optional(),
    skillLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    kitchenTools: z.array(z.string()).optional(),
    budget: z.object({
      daily: z.number().positive().optional(),
      weekly: z.number().positive().optional(),
      monthly: z.number().positive().optional(),
      currency: z.string().default("USD"),
      priceSensitivity: z.enum(["low", "medium", "high"]).default("medium"),
    }).optional(),
    availableIngredients: z.array(
      z.object({
        name: z.string(),
        quantity: z.number(),
        unit: z.string().optional(),
        expirationDate: z.string().optional(),
        isPerishable: z.boolean().optional().default(false),
      })
    ).optional(),
    macroPreferences: z.object({
      proteinGrams: z.number().optional(),
      carbsGrams: z.number().optional(),
      fatGrams: z.number().optional(),
      calorieTarget: z.number().optional(),
    }).optional(),
  }).optional(),
  preferredAgents: z.array(
    z.enum(["chef", "medical", "budget"])
  ).optional(),
  sessionId: z.string().optional(),
  maxResponseTimeMs: z.number().int().positive().optional(),
});

export const NutritionRouter = () => {
  const router = new Hono<{ Bindings: EnvWithR2 }>();

  // Apply authentication to all nutrition routes
  router.use("*", authenticate);

  // Upload food image to R2
  router.post("/upload", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;

    try {
      const formData = await c.req.formData();
      const imageFile = formData.get("image") as File | null;

      if (!imageFile) {
        return c.json({ success: false, error: "No image provided" }, 400);
      }

      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const contentType = imageFile.type || "image/jpeg";

      const validation = validateImage(buffer);
      if (!validation.valid) {
        return c.json({ success: false, error: validation.error || "Image validation failed" }, 400);
      }

      // Optimize image using WASM (reduces storage costs and improves AI analysis)
      const optimizedBuffer = await optimizeImage(buffer, 1024, 90);

      const filename = imageFile.name || `food-${Date.now()}.jpg`;
      const { url, key } = await uploadImage(c.env.R2_BUCKET, {
        userId,
        image: optimizedBuffer,
        filename,
        contentType,
        metadata: {
          source: "nutrition-log",
          uploadedBy: userId,
          optimized: "true",
        },
      });

      return c.json({
        success: true,
        data: {
          imageUrl: url,
          key,
          userId,
          uploadedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Food image upload error:", error);
      return c.json({ success: false, error: "Upload failed" }, 500);
    }
  });

  // Analyze food image with AI vision
  router.post("/vision/analyze", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;

    const openaiKey = c.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return c.json({ success: false, error: "AI service not configured" }, 503);
    }

    try {
      const body = await c.req.json();
      const { imageUrl } = VisionAnalysisRequestSchema.parse(body);

      // Call OpenAI GPT-4o for food analysis
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are an expert nutritionist AI. Analyze food images and estimate macros.

Return a JSON object with:
{
  "detectedItems": [
    {
      "name": "common food name (lowercase, no brands unless visible)",
      "confidence": 0.0-1.0,
      "estimatedPortionG": number (weight in grams),
      "portionUnit": "g"|"oz"|"cup"|"tbsp"|"tsp"|"piece",
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "fiber_g": number (optional),
      "sugar_g": number (optional)
    }
  ],
  "portionEstimationMethod": "volume_analysis|comparison|density_calc|ai_estimation",
  "analysisConfidence": 0.0-1.0,
  "analysisNotes": "brief notes about image quality, assumptions made"
}

Guidelines:
- Estimate portion size using visual cues (plate size, utensils, common reference objects)
- If uncertain, provide a reasonable range estimate but return a single best guess
- Include confidence scores for each item
- Break complex dishes into component ingredients
- Use standard nutritional values for common foods
- Be conservative with estimates - err on the side of caution
- Total macros should equal sum of individual items`,
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl,
                    detail: "high",
                  },
                },
              ],
            },
          ],
          temperature: 0.3,
          max_tokens: 1500,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const error = await response.json() as { error?: { message?: string } };
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json() as {
        choices: { message: { content: string } }[];
      };
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error("No analysis returned from AI");
      }

      const parsed = JSON.parse(content) as {
        detectedItems: Array<{
          name: string;
          confidence: number;
          estimatedPortionG: number;
          portionUnit: string;
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          fiber_g?: number;
          sugar_g?: number;
        }>;
        portionEstimationMethod?: string;
        analysisConfidence: number;
        analysisNotes?: string;
      };

      // Calculate totals
      const totalCalories = parsed.detectedItems.reduce((sum, item) => sum + item.calories, 0);
      const totalProtein = parsed.detectedItems.reduce((sum, item) => sum + item.protein_g, 0);
      const totalCarbs = parsed.detectedItems.reduce((sum, item) => sum + item.carbs_g, 0);
      const totalFat = parsed.detectedItems.reduce((sum, item) => sum + item.fat_g, 0);

      // Try to match items to food database
      const drizzle = createDrizzleInstance(c.env.DB);
      const matchedItems: Array<{ matchedFoodItemId?: string }> = [];

      for (const item of parsed.detectedItems) {
        // Exact match by name (case-sensitive for now)
        const foodItem = await drizzle.query.foodItems.findFirst({
          where: eq(schema.foodItems.name, item.name),
        });

        matchedItems.push({
          matchedFoodItemId: foodItem?.id,
        });
      }

      // Combine parsed items with matches
      const detectedItemsWithMatches = parsed.detectedItems.map((item, index) => ({
        ...item,
        matchedFoodItemId: matchedItems[index].matchedFoodItemId,
      }));

      return c.json({
        success: true,
        data: {
          id: crypto.randomUUID(),
          userId,
          imageUrl,
          detectedItems: detectedItemsWithMatches,
          totalCalories,
          totalProtein,
          totalCarbs,
          totalFat,
          analysisConfidence: parsed.analysisConfidence,
          analysisNotes: parsed.analysisNotes,
          portionEstimationMethod: parsed.portionEstimationMethod as string | undefined,
          createdAt: Date.now(),
        },
      });
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error("Food vision analysis error:", error);
      const message = error instanceof Error ? error.message : "Analysis failed";
      return c.json({ success: false, error: message }, 500);
    }
  });

  // Create food logs from analysis results
  router.post("/logs/from-analysis", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;

    const drizzle = createDrizzleInstance(c.env.DB);

    try {
      const body = await c.req.json();
      const { detectedItems, timestamp, mealType } =
        CreateFromAnalysisSchema.parse(body);

      const loggedAt = timestamp || Date.now();
      const createdAt = Date.now();

      // Create a food log entry for each detected item
      const createdLogs = await Promise.all(
        detectedItems.map(async (item) => {
          const logId = crypto.randomUUID();

          await drizzle.insert(schema.foodLogs).values({
            id: logId,
            userId,
            mealType,
            foodItemId: item.matchedFoodItemId || null,
            customName: item.matchedFoodItemId ? null : item.name,
            estimatedPortionG: item.estimatedPortionG,
            confidence: item.confidence,
            calories: item.calories,
            protein_g: item.protein_g,
            carbs_g: item.carbs_g,
            fat_g: item.fat_g,
            fiber_g: item.fiber_g || null,
            sugar_g: item.sugar_g || null,
            loggedAt,
            createdAt,
          });

          return {
            id: logId,
            ...item,
            mealType,
            loggedAt,
          };
        })
      );

      // Update daily nutrition summary
      await updateDailySummary(drizzle, userId, loggedAt);

      return c.json({
        success: true,
        data: {
          logs: createdLogs,
          count: createdLogs.length,
        },
      });
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error("Create food logs error:", error);
      const message = error instanceof Error ? error.message : "Failed to create logs";
      return c.json({ success: false, error: message }, 500);
    }
  });

  // Create manual food log entry
  router.post("/logs", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;

    const drizzle = createDrizzleInstance(c.env.DB);

    try {
      const body = await c.req.json();
      const validated = FoodLogCreateSchema.parse(body);

      const logId = crypto.randomUUID();
      const loggedAt = validated.loggedAt || Date.now();
      const createdAt = Date.now();

      await drizzle.insert(schema.foodLogs).values({
        id: logId,
        userId,
        mealType: validated.mealType,
        foodItemId: validated.foodItemId || null,
        customName: validated.customName || null,
        estimatedPortionG: validated.estimatedPortionG || null,
        confidence: null,
        calories: validated.calories,
        protein_g: validated.protein_g,
        carbs_g: validated.carbs_g,
        fat_g: validated.fat_g,
        fiber_g: validated.fiber_g || null,
        sugar_g: validated.sugar_g || null,
        loggedAt,
        createdAt,
      });

      // Update daily nutrition summary
      await updateDailySummary(drizzle, userId, loggedAt);

      const savedLog = await drizzle.query.foodLogs.findFirst({
        where: eq(schema.foodLogs.id, logId),
      });

      return c.json({ success: true, data: savedLog }, 201);
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error("Create food log error:", error);
      const message = error instanceof Error ? error.message : "Failed to create log";
      return c.json({ success: false, error: message }, 500);
    }
  });

  // Get user's food logs
  router.get("/logs", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;

    const drizzle = createDrizzleInstance(c.env.DB);

    try {
      const startDate = c.req.query("startDate")
        ? parseInt(c.req.query("startDate")!)
        : undefined;
      const endDate = c.req.query("endDate")
        ? parseInt(c.req.query("endDate")!)
        : undefined;
      const mealType = c.req.query("mealType");
      const limit = parseInt(c.req.query("limit") || "100");

      const logs = await drizzle.query.foodLogs.findMany({
        where: (() => {
          const conditions: Array<ReturnType<typeof eq> | ReturnType<typeof gte> | ReturnType<typeof lte>> = [
            eq(schema.foodLogs.userId, userId),
          ];
          if (startDate !== undefined) {
            conditions.push(gte(schema.foodLogs.loggedAt, startDate));
          }
          if (endDate !== undefined) {
            conditions.push(lte(schema.foodLogs.loggedAt, endDate));
          }
          if (mealType) {
            conditions.push(eq(schema.foodLogs.mealType, mealType));
          }
          return conditions.length > 1 ? and(...conditions) : conditions[0];
        })(),
        orderBy: (fl, { desc }) => desc(fl.loggedAt),
        limit,
      });

      return c.json({ success: true, data: logs });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Get food logs error:", error);
      return c.json({ success: false, error: "Failed to fetch logs" }, 500);
    }
  });

  // Get food log by ID
  router.get("/logs/:id", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;

    const drizzle = createDrizzleInstance(c.env.DB);
    const logId = c.req.param("id");

    const log = await drizzle.query.foodLogs.findFirst({
      where: eq(schema.foodLogs.id, logId),
    });

    if (!log) {
      return c.json({ success: false, error: "Log not found" }, 404);
    }

    // Ensure user owns this log
    if (log.userId !== userId) {
      return c.json({ success: false, error: "Unauthorized" }, 403);
    }

    return c.json({ success: true, data: log });
  });

  // Update food log (for user corrections)
  router.patch("/logs/:id", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;

    const drizzle = createDrizzleInstance(c.env.DB);
    const logId = c.req.param("id");

    // Get existing log
    const existing = await drizzle.query.foodLogs.findFirst({
      where: eq(schema.foodLogs.id, logId),
    });

    if (!existing) {
      return c.json({ success: false, error: "Log not found" }, 404);
    }

    if (existing.userId !== userId) {
      return c.json({ success: false, error: "Unauthorized" }, 403);
    }

    try {
      const body = await c.req.json();
      const updates: Record<string, unknown> = {};

      // Allow updating these fields
      if (body.customName !== undefined) {updates.customName = body.customName;}
      if (body.estimatedPortionG !== undefined) {updates.estimatedPortionG = body.estimatedPortionG;}
      if (body.calories !== undefined) {updates.calories = body.calories;}
      if (body.protein_g !== undefined) {updates.protein_g = body.protein_g;}
      if (body.carbs_g !== undefined) {updates.carbs_g = body.carbs_g;}
      if (body.fat_g !== undefined) {updates.fat_g = body.fat_g;}
      if (body.fiber_g !== undefined) {updates.fiber_g = body.fiber_g;}
      if (body.sugar_g !== undefined) {updates.sugar_g = body.sugar_g;}

      if (Object.keys(updates).length === 0) {
        return c.json({ success: false, error: "No updates provided" }, 400);
      }

      const updated = await drizzle
        .update(schema.foodLogs)
        .set(updates)
        .where(eq(schema.foodLogs.id, logId));

      // Update daily summary
      await updateDailySummary(drizzle, userId, existing.loggedAt);

      return c.json({ success: true, data: updated });
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error("Update food log error:", error);
      const message = error instanceof Error ? error.message : "Failed to update log";
      return c.json({ success: false, error: message }, 500);
    }
  });

  // Delete food log
  router.delete("/logs/:id", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;

    const drizzle = createDrizzleInstance(c.env.DB);
    const logId = c.req.param("id");

    // Get existing log to retrieve loggedAt for summary update
    const existing = await drizzle.query.foodLogs.findFirst({
      where: eq(schema.foodLogs.id, logId),
    });

    if (!existing) {
      return c.json({ success: false, error: "Log not found" }, 404);
    }

    if (existing.userId !== userId) {
      return c.json({ success: false, error: "Unauthorized" }, 403);
    }

    await drizzle.delete(schema.foodLogs).where(eq(schema.foodLogs.id, logId)).run();

    // Update daily summary
    await updateDailySummary(drizzle, userId, existing.loggedAt);

    return c.json({ success: true, data: null });
  });

  // Get daily nutrition summary
  router.get("/summary", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;

    const drizzle = createDrizzleInstance(c.env.DB);

    try {
      // Get date from query param or default to today
      const dateParam = c.req.query("date");
      const date = dateParam || new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      // Get or compute summary
      const summary = await drizzle.query.dailyNutritionSummaries.findFirst({
        where: and(
          eq(schema.dailyNutritionSummaries.userId, userId),
          eq(schema.dailyNutritionSummaries.date, date)
        ),
      });

      let summaryData: DailySummaryData;
      if (!summary) {
        // Compute from food logs for this date
        const startOfDay = new Date(date + "T00:00:00.000Z").getTime();
        const endOfDay = new Date(date + "T23:59:59.999Z").getTime();

        const logs = await drizzle.query.foodLogs.findMany({
          where: and(
            eq(schema.foodLogs.userId, userId),
            gte(schema.foodLogs.loggedAt, startOfDay),
            lte(schema.foodLogs.loggedAt, endOfDay)
          ),
        });

        const totals = logs.reduce(
          (acc, log) => ({
            calories: acc.calories + log.calories,
            protein: acc.protein + log.protein_g,
            carbs: acc.carbs + log.carbs_g,
            fat: acc.fat + log.fat_g,
            fiber: acc.fiber + (log.fiber_g || 0),
            sugar: acc.sugar + (log.sugar_g || 0),
            count: acc.count + 1,
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, count: 0 }
        );

        // Get user's macro targets (from fitness profile) - will be added to response later
        summaryData = {
          userId,
          date,
          totalCalories: totals.calories || 0,
          totalProtein_g: totals.protein || 0,
          totalCarbs_g: totals.carbs || 0,
          totalFat_g: totals.fat || 0,
          totalFiber_g: totals.fiber || null,
          totalSugar_g: totals.sugar || null,
          foodLogCount: totals.count,
          updatedAt: Date.now(),
        };
      } else {
        summaryData = {
          userId: summary.userId,
          date: summary.date,
          totalCalories: summary.totalCalories ?? 0,
          totalProtein_g: summary.totalProtein_g ?? 0,
          totalCarbs_g: summary.totalCarbs_g ?? 0,
          totalFat_g: summary.totalFat_g ?? 0,
          totalFiber_g: summary.totalFiber_g ?? null,
          totalSugar_g: summary.totalSugar_g ?? null,
          foodLogCount: summary.foodLogCount ?? 0,
          updatedAt: summary.updatedAt,
        };
      }

      // Get meal breakdown
      const startOfDay = new Date(date + "T00:00:00.000Z").getTime();
      const endOfDay = new Date(date + "T23:59:59.999Z").getTime();

      const allLogs = await drizzle.query.foodLogs.findMany({
        where: and(
          eq(schema.foodLogs.userId, userId),
          gte(schema.foodLogs.loggedAt, startOfDay),
          lte(schema.foodLogs.loggedAt, endOfDay)
        ),
      });

      const meals: Record<string, { calories: number; protein: number; carbs: number; fat: number; itemCount: number }> = {};

      for (const log of allLogs) {
        const mealType = log.mealType || "unknown";
        const meal = meals[mealType] || {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          itemCount: 0,
        };
        meals[mealType] = {
          calories: meal.calories + log.calories,
          protein: meal.protein + log.protein_g,
          carbs: meal.carbs + log.carbs_g,
          fat: meal.fat + log.fat_g,
          itemCount: meal.itemCount + 1,
        };
      }

      const user = await drizzle.query.users.findFirst({
        where: eq(schema.users.id, userId),
      });
      const { calories: targetCalories, protein_g: targetProtein, carbs_g: targetCarbs, fat_g: targetFat } =
        calculateMacroTargets({
          weight: user?.weight,
          height: user?.height,
          age: user?.age,
          gender: user?.gender,
          goals: user?.goals,
        });

      return c.json({
        success: true,
        data: {
          date: summaryData.date,
          totalCalories: summaryData.totalCalories,
          targetCalories,
          totalProtein: summaryData.totalProtein_g,
          targetProtein,
          totalCarbs: summaryData.totalCarbs_g,
          targetCarbs,
          totalFat: summaryData.totalFat_g,
          targetFat,
          totalFiber: summaryData.totalFiber_g,
          totalSugar: summaryData.totalSugar_g,
          foodLogCount: summaryData.foodLogCount,
          meals,
        },
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Get nutrition summary error:", error);
      return c.json({ success: false, error: "Failed to fetch summary" }, 500);
    }
  });

  // Search food database
  router.get("/database/search", async (c) => {
    const query = c.req.query("q");
    const limit = parseInt(c.req.query("limit") || "20");

    if (!query || query.trim().length === 0) {
      return c.json({ success: false, error: "Search query required" }, 400);
    }

    const drizzle = createDrizzleInstance(c.env.DB);

    try {
      const results = await drizzle.query.foodItems.findMany({
        where: (fi, { ilike }) =>
          ilike(fi.name, `%${query}%`) ||
          (fi.brand && ilike(fi.brand, `%${query}%`)),
        orderBy: (fi, { asc }) => asc(fi.name),
        limit,
      });

      return c.json({ success: true, data: results });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Search food database error:", error);
      return c.json({ success: false, error: "Search failed" }, 500);
    }
  });

  // Add food item to database (for admin/user submitted)
  router.post("/database/items", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;

    // In production, add admin check here

    try {
      const body = await c.req.json();
      const validated = FoodItemSchema.parse(body);

      const id = crypto.randomUUID();
      const now = Date.now();

      const drizzle = createDrizzleInstance(c.env.DB);

      await drizzle.insert(schema.foodItems).values({
        id,
        name: validated.name,
        brand: validated.brand || null,
        servingSize: validated.servingSize,
        servingUnit: validated.servingUnit,
        calories: validated.calories,
        protein_g: validated.protein_g,
        carbs_g: validated.carbs_g,
        fat_g: validated.fat_g,
        fiber_g: validated.fiber_g || null,
        sugar_g: validated.sugar_g || null,
        sodium_mg: validated.sodium_mg || null,
        isVerified: 0, // User submitted, needs verification
        createdAt: now,
        updatedAt: now,
      }).run();

      const saved = await drizzle.query.foodItems.findFirst({
        where: eq(schema.foodItems.id, id),
      });

      return c.json({ success: true, data: saved }, 201);
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error("Add food item error:", error);
      const message = error instanceof Error ? error.message : "Failed to add item";
      return c.json({ success: false, error: message }, 500);
    }
  });

  // AI Nutrition Consultation endpoint (Multi-Agent Orchestration)
  router.post("/consult", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;

    const openaiKey = c.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return c.json({ success: false, error: "AI nutrition service not configured" }, 503);
    }

    try {
      const body = await c.req.json();
      const validated = NutritionConsultRequestSchema.parse(body);

      // Transform medications from string[] to proper format
      const medications = validated.context?.medications?.map(name => ({ name })) || undefined;

      // Prepare context - userId comes from header, not from body
      const context = {
        ...(validated.context || {}),
        medications,
      };

      const request = {
        userId,
        query: validated.query,
        context,
        preferredAgents: validated.preferredAgents,
        sessionId: validated.sessionId,
        maxResponseTimeMs: validated.maxResponseTimeMs,
      };

      // Invoke orchestrator
      const { orchestrateNutritionConsult } = await import("../services/nutrition/orchestrator");
      const result = await orchestrateNutritionConsult(request);

      // Optionally store consultation in database
      try {
        const drizzle = createDrizzleInstance(c.env.DB);
        const { saveConsult } = await import("../services/nutrition/storage");

        await saveConsult(drizzle, {
          id: crypto.randomUUID(),
          userId,
          sessionId: result.sessionId,
          query: result.userQuery,
          context,
          agentsConsulted: result.agentsConsulted,
          responses: result.responses as any[],
          synthesizedAdvice: result.synthesizedAdvice,
          warnings: result.warnings,
          processingTimeMs: result.processingTimeMs,
          createdAt: new Date(),
          userRating: undefined,
          feedback: undefined,
        });
      } catch (storageError) {
        // Log but don't fail the request if storage fails
        // eslint-disable-next-line no-console
        console.warn("Failed to store nutrition consult:", storageError);
      }

      return c.json(result);
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error("Nutrition consult error:", error);
      const message = error instanceof Error ? error.message : "Consultation failed";
      return c.json(
        {
          success: false,
          error: message,
          sessionId: crypto.randomUUID(),
          userQuery: "",
          agentsConsulted: [],
          responses: [],
          synthesizedAdvice: "Unable to provide consultation. Please try again.",
          primaryAgent: undefined,
          warnings: [],
          processingTimeMs: 0,
        },
        500
      );
    }
  });

  // Get user's nutrition consultation history
  router.get("/consult/history", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;

    const drizzle = createDrizzleInstance(c.env.DB);
    const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);

    try {
      const consults = await drizzle.query.nutritionConsults.findMany({
        where: eq(schema.nutritionConsults.userId, userId),
        orderBy: (nc, { desc }) => desc(nc.createdAt),
        limit,
      });

      return c.json({ success: true, data: consults });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Get consult history error:", error);
      return c.json({ success: false, error: "Failed to fetch history" }, 500);
    }
  });

  // Get consultation by ID
  router.get("/consult/:id", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;

    const drizzle = createDrizzleInstance(c.env.DB);
    const consultId = c.req.param("id");

    const consult = await drizzle.query.nutritionConsults.findFirst({
      where: eq(schema.nutritionConsults.id, consultId),
    });

    if (!consult) {
      return c.json({ success: false, error: "Consultation not found" }, 404);
    }

    // Ensure user owns this consult
    if (consult.userId !== userId) {
      return c.json({ success: false, error: "Unauthorized" }, 403);
    }

    return c.json({ success: true, data: consult });
  });

  // Rate consultation
  router.patch("/consult/:id/rating", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const userId = authUser.id;

    const drizzle = createDrizzleInstance(c.env.DB);
    const consultId = c.req.param("id");

    try {
      const body = await c.req.json();
      const rating = body.rating;
      const feedback = body.feedback;

      if (typeof rating !== "number" || rating < 1 || rating > 5) {
        return c.json({ success: false, error: "Rating must be a number between 1 and 5" }, 400);
      }

      // Verify ownership
      const existing = await drizzle.query.nutritionConsults.findFirst({
        where: eq(schema.nutritionConsults.id, consultId),
      });

      if (!existing || existing.userId !== userId) {
        return c.json({ success: false, error: "Consultation not found" }, 404);
      }

      const updated = await drizzle
        .update(schema.nutritionConsults)
        .set({
          userRating: rating,
          feedback: typeof feedback === "string" ? feedback : null,
          updatedAt: Date.now(),
        })
        .where(eq(schema.nutritionConsults.id, consultId));

      return c.json({ success: true, data: updated });
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error("Rate consult error:", error);
      const message = error instanceof Error ? error.message : "Failed to save rating";
      return c.json({ success: false, error: message }, 500);
    }
  });

  return router;
};

/**
 * Calculate macro targets based on user profile
 * Uses existing FitnessCalculator from Rust WASM
 */
function calculateMacroTargets(
  user: { weight?: number; height?: number; age?: number; gender?: string; goals?: unknown }
): { calories: number; protein_g: number; carbs_g: number; fat_g: number } {
  // Handle null/undefined user or missing required fields
  const weight = user?.weight;
  const height = user?.height;
  const age = user?.age;
  const gender = user?.gender;
  const goals = user?.goals;

  if (!weight || !height || !age) {
    // Default targets if no profile
    return {
      calories: 2000,
      protein_g: 150,
      carbs_g: 250,
      fat_g: 70,
    };
  }

  // Calculate BMR using Mifflin-St Jeor
  const bmr = FitnessCalculator.calculateBMR(weight, height, age, gender === "male");
  const tdee = FitnessCalculator.calculateTDEE(bmr, "moderate"); // Default to moderate activity

  let targetCalories = tdee;
  const goalsArray: string[] = [];

  if (goals) {
    if (typeof goals === "string") {
      try {
        const parsed = JSON.parse(goals);
        if (Array.isArray(parsed)) {
          goalsArray.push(...parsed.map(String));
        } else {
          goalsArray.push(String(parsed));
        }
      } catch {
        goalsArray.push(String(goals));
      }
    } else if (Array.isArray(goals)) {
      goalsArray.push(...goals.map(String));
    } else {
      goalsArray.push(String(goals));
    }

    if (goalsArray.includes("lose_weight")) {
      targetCalories = tdee - 500;
    } else if (goalsArray.includes("gain_muscle")) {
      targetCalories = tdee + 300;
    }
  }

  // Macro split: 30% protein, 40% carbs, 30% fat (adjustable for goals)
  let proteinRatio = 0.30;
  let carbsRatio = 0.40;
  let fatRatio = 0.30;

  if (goalsArray.includes("gain_muscle")) {
    proteinRatio = 0.35;
    carbsRatio = 0.45;
    fatRatio = 0.20;
  } else if (goalsArray.includes("lose_weight")) {
    proteinRatio = 0.40;
    carbsRatio = 0.30;
    fatRatio = 0.30;
  }

  const protein_g = Math.round((targetCalories * proteinRatio) / 4); // 4 cal/g protein
  const carbs_g = Math.round((targetCalories * carbsRatio) / 4); // 4 cal/g carbs
  const fat_g = Math.round((targetCalories * fatRatio) / 9); // 9 cal/g fat

  return {
    calories: Math.round(targetCalories),
    protein_g,
    carbs_g,
    fat_g,
  };
}

/**
 * Update daily nutrition summary aggregate
 */
async function updateDailySummary(
  drizzle: ReturnType<typeof createDrizzleInstance>,
  userId: string,
  loggedAt: number
): Promise<void> {
  const date = new Date(loggedAt).toISOString().split("T")[0]; // YYYY-MM-DD
  const startOfDay = new Date(date + "T00:00:00.000Z").getTime();
  const endOfDay = new Date(date + "T23:59:59.999Z").getTime();

  const logs = await drizzle.query.foodLogs.findMany({
    where: and(
      eq(schema.foodLogs.userId, userId),
      gte(schema.foodLogs.loggedAt, startOfDay),
      lte(schema.foodLogs.loggedAt, endOfDay)
    ),
  });

  const totals = logs.reduce(
    (acc: { calories: number; protein: number; carbs: number; fat: number; fiber: number; count: number }, log: { calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g?: number | null }) => ({
      calories: acc.calories + log.calories,
      protein: acc.protein + log.protein_g,
      carbs: acc.carbs + log.carbs_g,
      fat: acc.fat + log.fat_g,
      fiber: acc.fiber + (log.fiber_g || 0),
      count: acc.count + 1,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, count: 0 }
  );

  const now = Date.now();

  // Upsert summary
  const existing = await drizzle.query.dailyNutritionSummaries.findFirst({
    where: and(
      eq(schema.dailyNutritionSummaries.userId, userId),
      eq(schema.dailyNutritionSummaries.date, date)
    ),
  });

  if (existing) {
    await drizzle
      .update(schema.dailyNutritionSummaries)
      .set({
        totalCalories: totals.calories,
        totalProtein_g: totals.protein,
        totalCarbs_g: totals.carbs,
        totalFat_g: totals.fat,
        totalFiber_g: totals.fiber || null,
        foodLogCount: totals.count,
        updatedAt: now,
      })
      .where(and(
        eq(schema.dailyNutritionSummaries.userId, userId),
        eq(schema.dailyNutritionSummaries.date, date)
      ))
      .run();
  } else {
    await drizzle.insert(schema.dailyNutritionSummaries).values({
      userId,
      date,
      totalCalories: totals.calories,
      totalProtein_g: totals.protein,
      totalCarbs_g: totals.carbs,
      totalFat_g: totals.fat,
      totalFiber_g: totals.fiber || null,
      foodLogCount: totals.count,
      updatedAt: now,
    }).run();
  }
}
