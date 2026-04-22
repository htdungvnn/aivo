import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
import { SwaggerUI } from "@hono/swagger-ui";
import type { D1Database } from "@cloudflare/workers-types";
import type { R2Bucket } from "@cloudflare/workers-types";
import type { KVNamespace } from "@cloudflare/workers-types";

// Import routers
import { AuthRouter } from "./routes/auth";
import { UsersRouter } from "./routes/users";
import { WorkoutsRouter } from "./routes/workouts";
import { CalcRouter } from "./routes/calc";
import { AIRouter } from "./routes/ai";
import { BodyRouter } from "./routes/body";
import { BodyPhotosRouter } from "./routes/body-photos";
import { HealthRouter } from "./routes/health";
import { ExportRouter } from "./routes/export";
import { MonthlyReportRouter } from "./routes/monthly-reports";
import { GamificationRouter } from "./routes/gamification";
import { runCronJob } from "./routes/cron";
// Temporarily disabled - WIP with type errors
// import { NutritionRouter } from "./routes/nutrition";
import { InfographicRouter } from "./routes/infographic";
// Temporarily disabled - WIP with type errors
// import { formRouter } from "./routes/form-analyze";

// Define Cloudflare Workers environment type
export interface AppEnv {
  AUTH_SECRET: string;
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  BODY_INSIGHTS_CACHE: KVNamespace;
  LEADERBOARD_CACHE: KVNamespace;
  RATE_LIMIT_KV: KVNamespace;
  OPENAI_API_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  NODE_ENV?: string;
}

// Create OpenAPIHono app
const app = new OpenAPIHono<{ Bindings: AppEnv }>();

// ============================================
// SECURITY HEADERS MIDDLEWARE
// ============================================
app.use("*", async (c, next) => {
  // Security headers
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("X-XSS-Protection", "1; mode=block");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()"
  );
  c.header(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.openai.com https://*.r2.dev; font-src 'self'; object-src 'none'; frame-ancestors 'none';"
  );
  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  await next();
});

// ============================================
// ENHANCED CORS CONFIGURATION
// ============================================
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3000", "http://localhost:8081"];

app.use(
  "*",
  cors({
    origin: allowedOrigins,
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "X-User-Id"],
    exposeHeaders: ["X-RateLimit-Remaining", "X-RateLimit-Reset"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    maxAge: 86400, // 24 hours preflight cache
  })
);

// ============================================
// RATE LIMITING MIDDLEWARE
// ============================================
app.use("/api/auth", async (c, next) => {
  await applyRateLimit(c, 5, 900000); // 5 attempts per 15 minutes for auth
  await next();
});

app.use("/ai", async (c, next) => {
  await applyRateLimit(c, 60, 60000); // 60 requests per minute for AI
  await next();
});

app.use("/upload", async (c, next) => {
  await applyRateLimit(c, 30, 60000); // 30 uploads per minute
  await next();
});

// Global rate limit for other endpoints
app.use(async (c, next) => {
  await applyRateLimit(c, 300, 60000); // 300 requests per minute
  await next();
});

async function applyRateLimit(c: any, maxRequests: number, windowMs: number): Promise<void> {
  const env = c.env as AppEnv;
  if (!env.RATE_LIMIT_KV) return;

  const userId = c.req.header("X-User-Id") || c.req.ip || "anonymous";
  const window = Math.floor(Date.now() / windowMs);
  const key = `rate-limit:${userId}:${window}`;

  const count = await env.RATE_LIMIT_KV.get(key);
  const currentCount = count ? parseInt(count) : 0;

  if (currentCount >= maxRequests) {
    c.header("X-RateLimit-Limit", String(maxRequests));
    c.header("X-RateLimit-Remaining", "0");
    c.header("X-RateLimit-Reset", String(windowMs - (Date.now() % windowMs)));
    throw new Error("Too many requests");
  }

  await env.RATE_LIMIT_KV.put(key, String(currentCount + 1), { expirationTtl: Math.ceil(windowMs / 1000) });
  c.header("X-RateLimit-Limit", String(maxRequests));
  c.header("X-RateLimit-Remaining", String(maxRequests - currentCount - 1));
}

// ============================================
// REQUEST SIZE LIMIT
// ============================================
app.use("*", async (c, next) => {
  const contentLength = c.req.header("content-length");
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
    return c.json({ error: "Request too large" }, 413);
  }
  await next();
});

// Use pretty JSON in dev
if (process.env.NODE_ENV !== "production") {
  app.use("*", prettyJSON());
}

// Mount routers
app.route("/api/auth", AuthRouter());
app.route("/users", UsersRouter());
app.route("/workouts", WorkoutsRouter());
app.route("/calc", CalcRouter());
app.route("/ai", AIRouter());
app.route("/body", BodyRouter());
app.route("/body-photos", BodyPhotosRouter());
// Temporarily disabled - WIP with type errors
// app.route("/nutrition", NutritionRouter());
app.route("/api/export", ExportRouter());
app.route("/api", MonthlyReportRouter());
app.route("/health", HealthRouter());
app.route("/api/gamification", GamificationRouter());
app.route("/api/infographic", InfographicRouter());
// Temporarily disabled - WIP with type errors
// app.route("/api/form", formRouter());

// ============================================
// PROTECTED SWAGGER UI (Production)
// ============================================
app.get("/docs", async (c) => {
  // In production, require admin authentication or return 404
  if (process.env.NODE_ENV === "production") {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.text("Not Found", 404);
    }
    // Additional admin check could be added here
  }

  const html = SwaggerUI({
    title: "AIVO API Documentation",
    url: "/openapi.json",
  });
  return c.html(html);
});

app.get("/openapi.json", async (c) => {
  if (process.env.NODE_ENV === "production") {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.text("Not Found", 404);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return c.json((app as any).getOpenAPIDocument({}) as any);
});

export { app as default };

// Cron schedule handler - runs daily at midnight UTC
export async function onSchedule(
  ctx: unknown
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await runCronJob((ctx as any).env);
}
