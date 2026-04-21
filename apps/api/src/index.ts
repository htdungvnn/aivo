import { Hono } from "hono";
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
import { z } from "zod";

import { FitnessCalculator } from "@aivo/compute";
import { createDrizzleInstance } from "@aivo/db";
import { optimize_content_wasm, init as initOptimizer } from "@aivo/optimizer";
import { validateBodyMetrics } from "./services/validation";

// Google OAuth token info response
interface GoogleTokenInfo {
  email: string;
  sub: string;
  name?: string;
  picture?: string;
}

// Facebook OAuth token info response
interface FacebookTokenInfo {
  email: string;
  id: string;
  first_name?: string;
  last_name?: string;
  picture?: { data: { url: string } };
}

// Define Cloudflare Workers environment type
interface Env {
  AUTH_SECRET: string;
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  BODY_INSIGHTS_CACHE: KVNamespace;
  OPENAI_API_KEY?: string;
}

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for all routes
app.use("*", cors({
  origin: ["http://localhost:3000", "http://localhost:8081", "https://aivo.app"],
  credentials: true,
  allowHeaders: ["Content-Type", "Authorization"],
  exposeHeaders: ["Authorization"],
}));

// Use pretty JSON in dev
if (process.env.NODE_ENV !== "production") {
  app.use("*", prettyJSON());
}

// Helper function to create JWT tokens
function createToken(payload: { userId: string; email: string }, secret: string): string {
  const header = { alg: "HS256", typ: "JWT" };
  const timestamp = Math.floor(Date.now() / 1000);
  const expiresIn = 7 * 24 * 60 * 60;

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify({ ...payload, iat: timestamp, exp: timestamp + expiresIn }));
  const signature = btoa(`${encodedHeader}.${encodedPayload}.${secret}`).slice(0, 32);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Get current Unix timestamp
const now = () => Math.floor(Date.now() / 1000);

// ============ KV CACHING HELPERS ============

const CACHE_TTL = {
  METRICS: 300, // 5 minutes
  HEATMAPS: 300, // 5 minutes
  HEALTH_SCORE: 600, // 10 minutes
};

// Generate cache key for body insights
const getCacheKey = (userId: string, type: string, params?: string): string => {
  return `body:${userId}:${type}${params ? `:${params}` : ""}`;
};

// Get cached data from KV
async function getCachedData<T>(
  kv: KVNamespace,
  key: string
): Promise<{ data: T | null; hit: boolean }> {
  try {
    const cached = await kv.get<T>(key, { type: "json" });
    if (cached) {
      return { data: cached, hit: true };
    }
  } catch (error) {
    console.error("Cache get error:", error);
  }
  return { data: null, hit: false };
}

// Set cached data in KV
async function setCachedData(
  kv: KVNamespace,
  key: string,
  data: unknown,
  ttl: number
): Promise<void> {
  try {
    await kv.put(key, JSON.stringify(data), { expirationTtl: ttl });
  } catch (error) {
    console.error("Cache set error:", error);
  }
}

// Invalidate cache for user's body data
async function invalidateBodyCache(
  kv: KVNamespace,
  userId: string
): Promise<void> {
  const patterns = [
    `body:${userId}:metrics`,
    `body:${userId}:heatmaps`,
    `body:${userId}:health-score`,
  ];

  await Promise.all(
    patterns.map((pattern) =>
      kv.deleteByPrefix(pattern).catch((err) => {
        console.error(`Cache invalidation error for ${pattern}:`, err);
      })
    )
  );
}

// Health check
app.get("/health", (c) => {
  return c.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// ============ AUTH ENDPOINTS ============

const authRouter = new Hono<{ Bindings: Env }>();

// Verify Google OAuth token
authRouter.post("/google", async (c) => {
  const body = await c.req.json();
  const { token } = z.object({ token: z.string() }).parse(body);

  try {
    const googleResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    if (!googleResponse.ok) {
      return c.json({ success: false, error: "Invalid Google token" }, 401);
    }
    const googleData: GoogleTokenInfo = await googleResponse.json();

    const email = googleData.email;
    if (!email) {
      return c.json({ success: false, error: "Email not provided by Google" }, 400);
    }

    const name = googleData.name || email.split("@")[0] || "User";
    const providerId = googleData.sub;
    const picture = googleData.picture;

    const drizzle = createDrizzleInstance(c.env.DB);

    const existingUser = await drizzle.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email),
    });

    let isNewUser = false;
    let user = existingUser;

    if (!user) {
      const [newUser] = await drizzle.insert(drizzle.users).values({
        id: crypto.randomUUID(),
        email,
        name,
        createdAt: now(),
        updatedAt: now(),
      }).returning();
      user = newUser;
      isNewUser = true;
    }

    const expiresAt = now() + 7 * 24 * 60 * 60;

    await drizzle.insert(drizzle.sessions).values({
      userId: user.id,
      provider: "google",
      providerUserId: providerId,
      accessToken: token,
      expiresAt,
      createdAt: now(),
      updatedAt: now(),
    }).onConflictDoUpdate({
      target: drizzle.sessions.providerUserId,
      set: {
        provider: "google",
        providerUserId: providerId,
        accessToken: token,
        expiresAt,
        updatedAt: now(),
      },
    });

    const appToken = createToken(
      { userId: user.id, email },
      c.env.AUTH_SECRET || "aivo-secret-key-change-in-production"
    );

    return c.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          age: user.age,
          gender: user.gender,
          height: user.height,
          weight: user.weight,
          fitnessLevel: user.fitnessLevel,
          goals: user.goals,
          picture,
        },
        token: appToken,
        isNewUser,
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    return c.json({ success: false, error: "Authentication failed" }, 500);
  }
});

// Verify Facebook OAuth token
authRouter.post("/facebook", async (c) => {
  const body = await c.req.json();
  const { token } = z.object({ token: z.string() }).parse(body);

  try {
    const fbResponse = await fetch(
      `https://graph.facebook.com/me?fields=id,email,first_name,last_name,picture&access_token=${token}`
    );
    if (!fbResponse.ok) {
      return c.json({ success: false, error: "Invalid Facebook token" }, 401);
    }
    const fbData: FacebookTokenInfo = await fbResponse.json();

    const email = fbData.email;
    if (!email) {
      return c.json({ success: false, error: "Email not provided by Facebook" }, 400);
    }

    const name = `${fbData.first_name || ""} ${fbData.last_name || ""}`.trim() || email.split("@")[0] || "User";
    const providerId = fbData.id;
    const picture = fbData.picture?.data?.url;

    const drizzle = createDrizzleInstance(c.env.DB);

    const existingUser = await drizzle.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email),
    });

    let isNewUser = false;
    let user = existingUser;

    if (!user) {
      const [newUser] = await drizzle.insert(drizzle.users).values({
        id: crypto.randomUUID(),
        email,
        name,
        createdAt: now(),
        updatedAt: now(),
      }).returning();
      user = newUser;
      isNewUser = true;
    }

    const expiresAt = now() + 7 * 24 * 60 * 60;

    await drizzle.insert(drizzle.sessions).values({
      userId: user.id,
      provider: "facebook",
      providerUserId: providerId,
      accessToken: token,
      expiresAt,
      createdAt: now(),
      updatedAt: now(),
    }).onConflictDoUpdate({
      target: drizzle.sessions.providerUserId,
      set: {
        provider: "facebook",
        providerUserId: providerId,
        accessToken: token,
        expiresAt,
        updatedAt: now(),
      },
    });

    const appToken = createToken(
      { userId: user.id, email },
      c.env.AUTH_SECRET || "aivo-secret-key-change-in-production"
    );

    return c.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          age: user.age,
          gender: user.gender,
          height: user.height,
          weight: user.weight,
          fitnessLevel: user.fitnessLevel,
          goals: user.goals,
          picture,
        },
        token: appToken,
        isNewUser,
      },
    });
  } catch (error) {
    console.error("Facebook auth error:", error);
    return c.json({ success: false, error: "Authentication failed" }, 500);
  }
});

// Verify session token
authRouter.post("/verify", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ success: false, error: "No token provided" }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const [headerPayload] = token.split(".");
    const payloadStr = atob(headerPayload.split(".")[1]);
    const payload = JSON.parse(payloadStr);

    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return c.json({ success: false, error: "Token expired" }, 401);
    }

    const drizzle = createDrizzleInstance(c.env.DB);

    const user = await drizzle.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, payload.userId),
    });

    if (!user) {
      return c.json({ success: false, error: "User not found" }, 404);
    }

    return c.json({ success: true, data: { user } });
  } catch (error) {
    console.error("Token verification error:", error);
    return c.json({ success: false, error: "Invalid token" }, 401);
  }
});

// Logout
authRouter.post("/logout", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ success: false, error: "No token provided" }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const [headerPayload] = token.split(".");
    const payloadStr = atob(headerPayload.split(".")[1]);
    const payload = JSON.parse(payloadStr);

    const drizzle = createDrizzleInstance(c.env.DB);

    if (payload.userId) {
      await drizzle.delete(drizzle.sessions).where(
        (session, { eq }) => eq(session.userId, payload.userId)
      );
    }

    return c.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return c.json({ success: false, error: "Logout failed" }, 500);
  }
});

app.route("/auth", authRouter);

// Users endpoints
const usersRouter = new Hono<{ Bindings: Env }>();

usersRouter.get("/", async (c) => {
  const drizzle = createDrizzleInstance(c.env.DB);
  const users = await drizzle.query.users.findMany();
  return c.json(users);
});

usersRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const drizzle = createDrizzleInstance(c.env.DB);
  const user = await drizzle.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, id),
  });
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json(user);
});

app.route("/users", usersRouter);

// Workouts endpoints
const workoutsRouter = new Hono<{ Bindings: Env }>();

workoutsRouter.get("/", async (c) => {
  const userId = c.req.query("userId");
  const drizzle = createDrizzleInstance(c.env.DB);
  const where = userId ? { userId } : undefined;
  const workouts = await drizzle.query.workouts.findMany({
    where,
    orderBy: (workouts, { desc }) => desc(workouts.createdAt),
  });
  return c.json(workouts);
});

workoutsRouter.post("/", async (c) => {
  const body = await c.req.json();
  const validated = z.object({
    userId: z.string(),
    type: z.enum(["strength", "cardio", "hiit", "yoga", "running", "cycling"]),
    duration: z.number().positive(),
    caloriesBurned: z.number().nonnegative().optional(),
    metrics: z.record(z.number()).optional(),
  }).parse(body);

  const drizzle = createDrizzleInstance(c.env.DB);
  const [workout] = await drizzle
    .insert(drizzle.workouts)
    .values({
      ...validated,
      id: crypto.randomUUID(),
      createdAt: now(),
      completedAt: null,
    })
    .returning();

// Client-provided exercise data (without generated fields)
interface ClientExercise {
  name: string;
  sets?: number;
  reps?: number;
  weight?: number;
  duration?: number;
  notes?: string;
  order?: number;
}

// ... later in code
if (body.exercises) {
  await drizzle.insert(drizzle.workoutExercises).values(
    body.exercises.map((ex: ClientExercise) => ({
      id: crypto.randomUUID(),
      workoutId: workout.id,
      order: ex.order ?? 0,
      ...ex,
    }))
  );
}

  return c.json(workout, 201);
});

app.route("/workouts", workoutsRouter);

// Fitness calculations using WASM
const calcRouter = new Hono<{ Bindings: Env }>();

calcRouter.post("/bmi", async (c) => {
  const body = await c.req.json();
  const { weight, height } = z.object({
    weight: z.number().positive(),
    height: z.number().positive(),
  }).parse(body);

  const bmi = FitnessCalculator.calculateBMI(weight, height);
  const category = FitnessCalculator.getBMICategory(bmi);

  return c.json({ bmi, category });
});

calcRouter.post("/calories", async (c) => {
  const body = await c.req.json();
  const { weight, height, age, gender, activityLevel, goal } = z.object({
    weight: z.number().positive(),
    height: z.number().positive(),
    age: z.number().positive(),
    gender: z.enum(["male", "female"]),
    activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
    goal: z.enum(["lose", "maintain", "gain"]),
  }).parse(body);

  const bmr = FitnessCalculator.calculateBMR(weight, height, age, gender === "male");
  const tdee = FitnessCalculator.calculateTDEE(bmr, activityLevel);
  const target = FitnessCalculator.calculateTargetCalories(tdee, goal);

  return c.json({ bmr, tdee, targetCalories: target });
});

calcRouter.post("/one-rep-max", async (c) => {
  const body = await c.req.json();
  const { weight, reps } = z.object({
    weight: z.number().positive(),
    reps: z.number().positive().max(20),
  }).parse(body);

  const oneRepMax = FitnessCalculator.calculateOneRepMax(weight, reps);

  return c.json({ oneRepMax });
});

app.route("/calc", calcRouter);

// AI Coach endpoints
const aiRouter = new Hono<{ Bindings: Env }>();

// Lazy-loaded optimizer instance
let optimizerInitialized = false;
let optimizerPromise: Promise<void> | null = null;

async function ensureOptimizer() {
  if (!optimizerInitialized) {
    optimizerPromise = (async () => {
      await initOptimizer();
      optimizerInitialized = true;
    })();
    await optimizerPromise;
  }
}

aiRouter.post("/chat", async (c) => {
  const drizzle = createDrizzleInstance(c.env.DB);
  const userId = c.req.header("X-User-Id");
  const authHeader = c.req.header("Authorization");

  if (!userId || !authHeader?.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const validated = z.object({
    userId: z.string(),
    message: z.string().min(1).max(2000),
    context: z.array(z.string()).optional(),
  }).parse(body);

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
    const systemPrompt = `You are AIVO, an expert AI fitness coach and nutrition advisor. You provide personalized, evidence-based advice on:
- Workout programming and exercise technique
- Nutrition planning and macro tracking
- Recovery, sleep, and stress management
- Goal setting and progress tracking
- Body composition analysis

Be encouraging, specific, and science-backed. When giving recommendations, consider the user's fitness level and goals. If asked about medical conditions, advise consulting a healthcare provider.`;

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
      // Ensure optimizer is initialized
      await ensureOptimizer();

      // Reconstruct conversation in chronological order (oldest first)
      const conversationJson = JSON.stringify({
        messages: history.reverse().map((msg) => ({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.message,
        })),
      });

      // Apply token optimization
      const optimizedJson = optimize_content_wasm(conversationJson, "");
      const optimized = JSON.parse(optimizedJson);

      // Parse optimized content back to messages
      if (optimized.optimizedContent) {
        try {
          const optimizedData = JSON.parse(optimized.optimizedContent);
          if (Array.isArray(optimizedData.messages)) {
            messages.push(...optimizedData.messages.slice(-10)); // Keep up to 10 recent messages
          }
        } catch (_) {
          // Fallback to last 5 messages if optimization parsing fails
          const recent = history.slice(0, 5).reverse();
          recent.forEach((msg) => {
            messages.push({
              role: msg.role === "user" ? "user" : "assistant",
              content: msg.message,
            });
          });
        }
      }
    }

    // Add current user message
    messages.push({ role: "user", content: validated.message });

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
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
      const error = await response.json();
      throw new Error(`OpenAI error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const aiMessage = data.choices[0]?.message?.content || "No response generated";
    const tokensUsed = data.usage?.total_tokens || 0;

    // Save conversation to database
    await drizzle.insert(drizzle.conversations).values({
      id: crypto.randomUUID(),
      userId: validated.userId,
      message: validated.message,
      response: aiMessage,
      context: validated.context ? JSON.stringify(validated.context) : null,
      tokensUsed,
      model: "gpt-4o-mini",
      createdAt: now(),
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

aiRouter.get("/history/:userId", async (c) => {
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

app.route("/ai", aiRouter);

// ============ BODY INSIGHT ENDPOINTS ============

// Extend Env to include R2 bucket
interface EnvWithR2 extends Env {
  R2_BUCKET: R2Bucket;
  OPENAI_API_KEY?: string;
}

const bodyRouter = new Hono<{ Bindings: EnvWithR2 }>();

// BodyMetrics type for responses
interface BodyMetricResponse {
  id: string;
  userId: string;
  timestamp: number;
  weight?: number;
  bodyFatPercentage?: number;
  muscleMass?: number;
  boneMass?: number;
  waterPercentage?: number;
  bmi?: number;
  waistCircumference?: number;
  chestCircumference?: number;
  hipCircumference?: number;
  notes?: string;
  source?: "ai" | "manual";
  visionAnalysisId?: string;
}

// Vision Analysis Response Types
interface PostureAssessment {
  alignmentScore: number;
  issues: string[];
  confidence: number;
}

interface SymmetryAssessment {
  leftRightBalance: number;
  imbalances: string[];
}

interface MuscleDevelopment {
  muscle: string;
  score: number;
  zone: string;
}

interface VisionAnalysisResponse {
  id: string;
  userId: string;
  imageUrl: string;
  processedUrl?: string;
  analysis: {
    posture?: PostureAssessment;
    symmetry?: SymmetryAssessment;
    muscleDevelopment: MuscleDevelopment[];
    bodyComposition?: {
      bodyFatEstimate: number;
      muscleMassEstimate: number;
    };
  };
  confidence: number;
  createdAt: number;
}

// Health Score response
interface HealthScoreResponse {
  score: number;
  category: "poor" | "fair" | "good" | "excellent";
  factors: {
    bmi: number;
    bodyFat: number;
    muscleMass: number;
    fitnessLevel: number;
  };
  recommendations: string[];
}

// Upload body image to R2
bodyRouter.post("/upload", async (c) => {
  const userId = c.req.header("X-User-Id");
  if (!userId) {
    return c.json({ success: false, error: "User ID required" }, 400);
  }

  try {
    const formData = await c.req.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return c.json({ success: false, error: "No image provided" }, 400);
    }

    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const contentType = imageFile.type || "image/jpeg";

    // Validate image
    const validation = validateImage(buffer);
    if (!validation.valid) {
      return c.json({ success: false, error: validation.error }, 400);
    }

    const filename = imageFile.name || `body-photo-${Date.now()}.jpg`;
    const { url, key } = await uploadImage(c.env.R2_BUCKET, {
      userId,
      image: buffer,
      filename,
      contentType,
      metadata: {
        source: "body-insight",
        uploadedBy: userId,
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
    console.error("Upload error:", error);
    return c.json({ success: false, error: "Upload failed" }, 500);
  }
});

// Analyze body image with AI vision
bodyRouter.post("/vision/analyze", async (c) => {
  const drizzle = createDrizzleInstance(c.env.DB);
  const userId = c.req.header("X-User-Id");
  const authHeader = c.req.header("Authorization");

  if (!userId || !authHeader?.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  // Verify user exists
  const user = await drizzle.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, userId),
  });

  if (!user) {
    return c.json({ success: false, error: "User not found" }, 404);
  }

  try {
    const body = await c.req.json();
    const { imageUrl, analyzeMuscles = true, analyzePosture = true } = z.object({
      imageUrl: z.string().url(),
      analyzeMuscles: z.boolean().optional(),
      analyzePosture: z.boolean().optional(),
    }).parse(body);

    // Call OpenAI Vision API for analysis
    // Note: Requires OPENAI_API_KEY environment variable
    const openaiKey = c.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return c.json({ success: false, error: "AI service not configured" }, 503);
    }

    const analysis = await analyzeImageWithAI(openaiKey, imageUrl, {
      analyzeMuscles,
      analyzePosture,
    });

    // Save analysis to database
    const [savedAnalysis] = await drizzle
      .insert(drizzle.visionAnalyses)
      .values({
        id: crypto.randomUUID(),
        userId,
        imageUrl,
        processedUrl: analysis.processedUrl || null,
        analysis: JSON.stringify(analysis.analysis),
        confidence: analysis.confidence,
        createdAt: now(),
      })
      .returning();

    // Also update or create body metrics entry
    const bodyComposition = analysis.analysis.bodyComposition;
    if (bodyComposition) {
      await drizzle.insert(drizzle.bodyMetrics).values({
        id: crypto.randomUUID(),
        userId,
        timestamp: now(),
        bodyFatPercentage: bodyComposition.bodyFatEstimate,
        muscleMass: bodyComposition.muscleMassEstimate,
        bmi: user.weight && user.height ? user.weight / Math.pow(user.height / 100, 2) : null,
        source: "ai",
        notes: `Auto-generated from vision analysis ${savedAnalysis.id}`,
      });
    }

    // Invalidate cache for this user's body data (new metrics available)
    await invalidateBodyCache(c.env.BODY_INSIGHTS_CACHE, userId);

    return c.json({
      success: true,
      data: {
        id: savedAnalysis.id,
        userId,
        imageUrl,
        processedUrl: savedAnalysis.processedUrl,
        analysis: analysis.analysis,
        confidence: analysis.confidence,
        createdAt: savedAnalysis.createdAt,
      },
    });
  } catch (error: unknown) {
    console.error("Vision analysis error:", error);
    const message = error instanceof Error ? error.message : "Analysis failed";
    return c.json({ success: false, error: message }, 500);
  }
});

// Get body metrics history
bodyRouter.get("/metrics", async (c) => {
  const userId = c.req.header("X-User-Id");
  const authHeader = c.req.header("Authorization");

  if (!userId || !authHeader?.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  const drizzle = createDrizzleInstance(c.env.DB);

  try {
    const startDate = c.req.query("startDate")
      ? parseInt(c.req.query("startDate")!)
      : undefined;
    const endDate = c.req.query("endDate")
      ? parseInt(c.req.query("endDate")!)
      : undefined;
    const limit = parseInt(c.req.query("limit") || "100");

    // Build cache key based on query params
    const paramStr = `${startDate || ""}:${endDate || ""}:${limit}`;
    const cacheKey = getCacheKey(userId, "metrics", paramStr);

    // Try cache first
    const { data: cachedData, hit: cacheHit } = await getCachedData<
      BodyMetricResponse[]
    >(c.env.BODY_INSIGHTS_CACHE, cacheKey);

    if (cacheHit && cachedData) {
      c.header("X-Cache", "HIT");
      return c.json({ success: true, data: cachedData });
    }

    const where: { userId: string; timestamp?: { gte?: number; lte?: number } } = { userId };
    if (startDate !== undefined || endDate !== undefined) {
      where.timestamp = {};
      if (startDate !== undefined) { where.timestamp.gte = startDate; }
      if (endDate !== undefined) { where.timestamp.lte = endDate; }
    }

    const metrics: BodyMetricResponse[] = await drizzle.query.bodyMetrics.findMany({
      where,
      orderBy: (bm, { desc }) => desc(bm.timestamp),
      limit,
    });

    // Set cache for subsequent requests
    await setCachedData(
      c.env.BODY_INSIGHTS_CACHE,
      cacheKey,
      metrics,
      CACHE_TTL.METRICS
    );

    c.header("X-Cache", "MISS");
    return c.json({ success: true, data: metrics });
  } catch (error) {
    console.error("Get metrics error:", error);
    return c.json({ success: false, error: "Failed to fetch metrics" }, 500);
  }
});

// Create manual body metric entry
bodyRouter.post("/metrics", async (c) => {
  const userId = c.req.header("X-User-Id");
  const authHeader = c.req.header("Authorization");

  if (!userId || !authHeader?.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  const drizzle = createDrizzleInstance(c.env.DB);

  try {
    const body = await c.req.json();
    const validated = z.object({
      weight: z.number().positive().optional(),
      bodyFatPercentage: z.number().positive().max(100).optional(),
      muscleMass: z.number().positive().optional(),
      boneMass: z.number().positive().optional(),
      waterPercentage: z.number().positive().max(100).optional(),
      bmi: z.number().positive().optional(),
      waistCircumference: z.number().positive().optional(),
      chestCircumference: z.number().positive().optional(),
      hipCircumference: z.number().positive().optional(),
      notes: z.string().optional(),
    }).parse(body);

    // Fetch user profile for validation
    const user = await drizzle.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, userId),
    });

    if (!user) {
      return c.json({ success: false, error: "User not found" }, 404);
    }

    // Perform WASM-based validation if we have required fields
    const hasRequiredFields =
      validated.weight !== undefined ||
      validated.bodyFatPercentage !== undefined ||
      validated.muscleMass !== undefined;

    if (hasRequiredFields && user.height && user.age && user.gender) {
      const validationResult = await validateBodyMetrics({
        weight: validated.weight,
        bodyFatPercentage: validated.bodyFatPercentage,
        muscleMass: validated.muscleMass,
        height: user.height,
        age: user.age,
        gender: user.gender as "male" | "female",
        fitnessLevel: user.fitnessLevel || "beginner",
      });

      if (!validationResult.valid) {
        return c.json(
          {
            success: false,
            error: "Validation failed",
            details: validationResult.errors,
          },
          400
        );
      }

      // Log warnings (in production, could be sent as response header or separate field)
      if (validationResult.warnings.length > 0) {
        console.warn(`Validation warnings for user ${userId}:`, validationResult.warnings);
      }
    }

    const [metric] = await drizzle
      .insert(drizzle.bodyMetrics)
      .values({
        id: crypto.randomUUID(),
        userId,
        timestamp: now(),
        ...validated,
        source: "manual",
      })
      .returning();

    // Invalidate cache for this user's body data
    await invalidateBodyCache(c.env.BODY_INSIGHTS_CACHE, userId);

    return c.json({ success: true, data: metric }, 201);
  } catch (error) {
    console.error("Create metric error:", error);
    return c.json({ success: false, error: "Failed to create metric" }, 500);
  }
});

// Get body heatmap data
bodyRouter.get("/heatmaps", async (c) => {
  const userId = c.req.header("X-User-Id");
  const authHeader = c.req.header("Authorization");

  if (!userId || !authHeader?.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  const drizzle = createDrizzleInstance(c.env.DB);

  try {
    const limit = parseInt(c.req.query("limit") || "10");
    const cacheKey = getCacheKey(userId, "heatmaps", limit.toString());

    // Try cache first
    const { data: cachedData, hit: cacheHit } = await getCachedData<
      Array<{
        id: string;
        userId: string;
        timestamp: number;
        imageUrl: string;
        vectorData: unknown[] | null;
        metadata: unknown | null;
      }>
    >(c.env.BODY_INSIGHTS_CACHE, cacheKey);

    if (cacheHit && cachedData) {
      c.header("X-Cache", "HIT");
      return c.json({ success: true, data: cachedData });
    }

    const heatmaps = await drizzle.query.bodyHeatmaps.findMany({
      where: (bh, { eq }) => eq(bh.userId, userId),
      orderBy: (bh, { desc }) => desc(bh.timestamp),
      limit,
    });

    // Parse JSON fields
    const parsed = heatmaps.map((h) => ({
      ...h,
      vectorData: h.vectorData ? JSON.parse(h.vectorData) : null,
      metadata: h.metadata ? JSON.parse(h.metadata) : null,
    }));

    // Set cache
    await setCachedData(
      c.env.BODY_INSIGHTS_CACHE,
      cacheKey,
      parsed,
      CACHE_TTL.HEATMAPS
    );

    c.header("X-Cache", "MISS");
    return c.json({ success: true, data: parsed });
  } catch (error) {
    console.error("Get heatmaps error:", error);
    return c.json({ success: false, error: "Failed to fetch heatmaps" }, 500);
  }
});

// Generate heatmap from vision analysis
bodyRouter.post("/heatmaps/generate", async (c) => {
  const userId = c.req.header("X-User-Id");
  const authHeader = c.req.header("Authorization");

  if (!userId || !authHeader?.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  const drizzle = createDrizzleInstance(c.env.DB);

  try {
    const body = await c.req.json();
    const { analysisId, vectorData } = z.object({
      analysisId: z.string(),
      vectorData: z.array(
        z.object({
          x: z.number().min(0).max(100),
          y: z.number().min(0).max(100),
          muscle: z.string(),
          intensity: z.number().min(0).max(1),
        })
      ),
    }).parse(body);

    // Get the analysis
    const analysis = await drizzle.query.visionAnalyses.findFirst({
      where: (va, { eq }) => eq(va.id, analysisId),
    });

    if (!analysis) {
      return c.json({ success: false, error: "Analysis not found" }, 404);
    }

    // Generate heatmap SVG overlay
    const svgOverlay = generateHeatmapSVG(vectorData);

    // Upload generated heatmap to R2
    const svgBuffer = Buffer.from(svgOverlay);
    const { url } = await uploadImage(c.env.R2_BUCKET, {
      userId,
      image: svgBuffer,
      filename: `heatmap-${analysisId}.svg`,
      contentType: "image/svg+xml",
      metadata: {
        analysisId,
        type: "heatmap",
      },
    });

    // Save heatmap record
    const [heatmap] = await drizzle
      .insert(drizzle.bodyHeatmaps)
      .values({
        id: crypto.randomUUID(),
        userId,
        timestamp: now(),
        imageUrl: url,
        vectorData: JSON.stringify(vectorData),
        metadata: JSON.stringify({
          analysisId,
          generatedAt: new Date().toISOString(),
          pointCount: vectorData.length,
        }),
      })
      .returning();

    // Invalidate heatmap cache for this user
    await invalidateBodyCache(c.env.BODY_INSIGHTS_CACHE, userId);

    return c.json({
      success: true,
      data: {
        ...heatmap,
        vectorData,
        metadata: { ...JSON.parse(heatmap.metadata), vectorData },
      },
    });
  } catch (error) {
    console.error("Generate heatmap error:", error);
    return c.json({ success: false, error: "Failed to generate heatmap" }, 500);
  }
});

// Get health score (composite metric)
bodyRouter.get("/health-score", async (c) => {
  const userId = c.req.header("X-User-Id");
  const authHeader = c.req.header("Authorization");

  if (!userId || !authHeader?.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  const drizzle = createDrizzleInstance(c.env.DB);

  try {
    const cacheKey = getCacheKey(userId, "health-score");

    // Try cache first
    const { data: cachedData, hit: cacheHit } = await getCachedData<HealthScoreResponse>(
      c.env.BODY_INSIGHTS_CACHE,
      cacheKey
    );

    if (cacheHit && cachedData) {
      c.header("X-Cache", "HIT");
      return c.json({ success: true, data: cachedData });
    }

    // Get user basic info
    const user = await drizzle.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, userId),
    });

    if (!user) {
      return c.json({ success: false, error: "User not found" }, 404);
    }

    // Get latest body metrics
    const latestMetric = await drizzle.query.bodyMetrics.findMany({
      where: (bm, { eq }) => eq(bm.userId, userId),
      orderBy: (bm, { desc }) => desc(bm.timestamp),
      limit: 1,
    });

    const metric = latestMetric[0];

    // Calculate health score factors (0-1 scale each)
    const factors: Record<string, number> = {};

    // BMI factor (optimal 18.5-24.9)
    if (metric?.bmi) {
      const bmi = metric.bmi;
      if (bmi >= 18.5 && bmi <= 24.9) {
        factors.bmi = 1;
      } else if (bmi >= 25 && bmi <= 29.9) {
        factors.bmi = 0.7;
      } else if (bmi >= 30) {
        factors.bmi = 0.3;
      } else {
        factors.bmi = 0.5;
      }
    } else {
      factors.bmi = 0.5; // Neutral if unknown
    }

    // Body fat factor (age/gender dependent)
    if (metric?.bodyFatPercentage) {
      const bf = metric.bodyFatPercentage;
      // Simplified ranges - in production use age/gender adjusted
      if (bf < 0.12) { factors.bodyFat = 0.8; } // too low for most
      else if (bf >= 0.12 && bf <= 0.25) { factors.bodyFat = 1; }
      else if (bf > 0.25 && bf <= 0.30) { factors.bodyFat = 0.7; }
      else { factors.bodyFat = 0.3; }
    } else {
      factors.bodyFat = 0.5;
    }

    // Muscle mass factor (relative to height/weight)
    if (metric?.muscleMass && user?.weight) {
      const muscleRatio = metric.muscleMass / user.weight;
      if (muscleRatio >= 0.35 && muscleRatio <= 0.45) {
        factors.muscleMass = 1;
      } else if (muscleRatio >= 0.30 && muscleRatio < 0.35) {
        factors.muscleMass = 0.8;
      } else if (muscleRatio > 0.45 && muscleRatio <= 0.50) {
        factors.muscleMass = 0.9;
      } else {
        factors.muscleMass = 0.5;
      }
    } else {
      factors.muscleMass = 0.5;
    }

    // Fitness level factor
    const fitnessMap: Record<string, number> = {
      beginner: 0.4,
      intermediate: 0.7,
      advanced: 0.9,
      elite: 1.0,
    };
    factors.fitnessLevel = fitnessMap[user.fitnessLevel || "beginner"] || 0.4;

    // Weighted average score
    const weights = { bmi: 0.25, bodyFat: 0.3, muscleMass: 0.3, fitnessLevel: 0.15 };
    const score =
      (factors.bmi * weights.bmi +
        factors.bodyFat * weights.bodyFat +
        factors.muscleMass * weights.muscleMass +
        factors.fitnessLevel * weights.fitnessLevel) *
      100;

    let category: HealthScoreResponse["category"];
    if (score >= 80) {
      category = "excellent";
    } else if (score >= 60) {
      category = "good";
    } else if (score >= 40) {
      category = "fair";
    } else {
      category = "poor";
    }

    // Generate recommendations based on factors
    const recommendations: string[] = [];
    if (factors.bmi < 0.7) {
      recommendations.push("Focus on maintaining a healthy weight range through balanced nutrition");
    }
    if (factors.bodyFat < 0.7) {
      recommendations.push("Consider adjusting macronutrient intake to optimize body composition");
    }
    if (factors.muscleMass < 0.7) {
      recommendations.push("Incorporate resistance training to build lean muscle mass");
    }
    if (recommendations.length === 0) {
      recommendations.push("Keep up your excellent health trajectory!");
    }

    const result = {
      success: true,
      data: {
        score: Math.round(score * 10) / 10,
        category,
        factors,
        recommendations,
      },
    };

    // Set cache
    await setCachedData(
      c.env.BODY_INSIGHTS_CACHE,
      cacheKey,
      result.data,
      CACHE_TTL.HEALTH_SCORE
    );

    c.header("X-Cache", "MISS");
    return c.json(result);
  } catch (error) {
    console.error("Health score error:", error);
    return c.json({ success: false, error: "Failed to calculate health score" }, 500);
  }
});

app.route("/body", bodyRouter);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Analyze image with OpenAI Vision API
 */
async function analyzeImageWithAI(
  apiKey: string,
  imageUrl: string,
  _options: { analyzeMuscles?: boolean; analyzePosture?: boolean }
): Promise<{
  analysis: VisionAnalysisResponse["analysis"];
  confidence: number;
  processedUrl?: string;
}> {
  const systemPrompt = `You are a fitness and body composition AI analyzer. Analyze the provided body photo and return ONLY a valid JSON object with this exact structure:

{
  "posture": {
    "alignmentScore": <number 0-1>,
    "issues": ["forward_head_posture", "rounded_shoulders", "anterior_pelvic_tilt", ...],
    "confidence": <number 0-1>
  },
  "symmetry": {
    "leftRightBalance": <number 0-1>,
    "imbalances": ["right_shoulder_lower", "left_quadriceps_smaller", ...]
  },
  "muscleDevelopment": [
    {
      "muscle": "chest" | "back" | "shoulders" | "biceps" | "triceps" | "abs" | "core" | "quadriceps" | "hamstrings" | "glutes" | "calves" | "forearms",
      "score": <number 0-1>,
      "zone": "upper" | "lower" | "full"
    }
  ],
  "bodyComposition": {
    "bodyFatEstimate": <number 0-1>,
    "muscleMassEstimate": <number 0-1>
  }
}

Do not include any explanatory text. Only return the JSON.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
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
      max_tokens: 1000,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error("No analysis returned from AI");
  }

  try {
    const parsed = JSON.parse(content) as VisionAnalysisResponse["analysis"];
    return {
      analysis: parsed,
      confidence: 0.85, // OpenAI provides confidence implicitly via model
    };
  } catch (_) {
    console.error("Failed to parse AI response:", content);
    throw new Error("Invalid analysis response from AI");
  }
}

/**
 * Generate SVG heatmap overlay from vector data
 */
function generateHeatmapSVG(vectorData: Array<{ x: number; y: number; muscle: string; intensity: number }>): string {
  const viewBox = "0 0 200 400";
  const colorScale = (intensity: number): string => {
    // Blue -> Cyan -> Green -> Yellow -> Orange -> Red
    if (intensity < 0.2) { return "#3b82f6"; } // blue-500
    if (intensity < 0.4) { return "#06b6d4"; } // cyan-500
    if (intensity < 0.6) { return "#22c55e"; } // green-500
    if (intensity < 0.8) { return "#eab308"; } // yellow-500
    return "#f97316"; // orange-500
  };

  const circles = vectorData
    .map((point) => {
      const cx = point.x;
      const cy = point.y;
      const radius = 8 + point.intensity * 6;
      const color = colorScale(point.intensity);
      const opacity = 0.4 + point.intensity * 0.5;
      return `<ellipse cx="${cx}" cy="${cy}" rx="${radius}" ry="${radius * 1.2}" fill="${color}" fill-opacity="${opacity}" />`;
    })
    .join("\n    ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%">
  <!-- AIVO Body Heatmap Overlay -->
  ${circles}
</svg>`;
}

export default app;

