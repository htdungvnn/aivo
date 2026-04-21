import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
import { SwaggerUI } from "@hono/swagger-ui";

// Import routers
import { AuthRouter } from "./routes/auth";
import { UsersRouter } from "./routes/users";
import { WorkoutsRouter } from "./routes/workouts";
import { CalcRouter } from "./routes/calc";
import { AIRouter } from "./routes/ai";
import { BodyRouter } from "./routes/body";
import { HealthRouter } from "./routes/health";

// Define Cloudflare Workers environment type
export interface AppEnv {
  AUTH_SECRET: string;
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  BODY_INSIGHTS_CACHE: KVNamespace;
  OPENAI_API_KEY?: string;
}

// Create OpenAPIHono app
const app = new OpenAPIHono<{ Bindings: AppEnv }>();

// Enable CORS for all routes
app.use("*", cors({
  origin: ["http://localhost:3000", "http://localhost:8081", "https://aivo.app"],
  credentials: true,
  allowHeaders: ["Content-Type", "Authorization"],
  exposeHeaders: ["Authorization", "X-Cache"],
}));

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
app.route("/health", HealthRouter());

// Swagger UI documentation
/**
 * @swagger
 * /docs:
 *   get:
 *     summary: API Documentation
 *     description: Interactive Swagger UI documentation
 *     tags: [health]
 *     responses:
 *       200:
 *         description: Swagger UI HTML page
 */
app.get("/docs", async (c) => {
  const html = SwaggerUI({
    title: "AIVO API Documentation",
    url: "/openapi.json",
  });
  return c.html(html);
});

// OpenAPI JSON specification
/**
 * @swagger
 * /openapi.json:
 *   get:
 *     summary: OpenAPI Specification
 *     description: JSON OpenAPI 3.0 specification
 *     tags: [health]
 *     responses:
 *       200:
 *         description: OpenAPI JSON document
 */
app.get("/openapi.json", async (c) => {
  return c.json(app.getOpenAPIDocument());
});

export default app;
