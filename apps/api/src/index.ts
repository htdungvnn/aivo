import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { cors } from "hono/cors";

import { createAuth } from "./auth/auth.ts";
import { authRoutes } from "./auth/routes.ts";
import { sessionMiddleware, type AuthEnv } from "./auth/middleware.ts";
import { allowedOrigins } from "./auth/origins.ts";

const app = new OpenAPIHono<AuthEnv>();

/**
 * The origins allowed to talk to the API.
 *
 * The list comes from the configured application URLs plus the local
 * development origins — never an arbitrary origin.
 */
const corsOptions = {
  origin: (origin: string, c: { env: AuthEnv["Bindings"] }) => {
    if (!origin) return null;
    return allowedOrigins(c.env).includes(origin) ? origin : null;
  },
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["POST", "GET", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
  credentials: true,
};

/**
 * The web app and the mobile app both talk to this API from a different
 * origin, so the authentication routes need CORS with credentials.
 */
app.use("/api/auth/*", cors(corsOptions));

/**
 * The application auth endpoints (session, policy, me) are read by the web
 * client with credentials as well, so they need the same CORS treatment.
 */
app.use("/auth/*", cors(corsOptions));

/**
 * Better Auth owns every route under `/api/auth/*` — sign in, sign up, OAuth
 * callbacks, session management and the rest.
 */
app.on(["POST", "GET", "OPTIONS"], "/api/auth/*", async (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});

/**
 * The application auth endpoints: session state, policy and the protected
 * `me` route.
 */
app.route("/auth", authRoutes);

const MessageSchema = z
  .object({
    message: z.string().openapi({ example: "Hello Hono!" }),
  })
  .openapi("Message");

const messageRoute = createRoute({
  method: "get",
  path: "/message",
  operationId: "getMessage",
  summary: "Get a greeting message",
  tags: ["Message"],
  responses: {
    200: {
      description: "Successful response",
      content: {
        "application/json": {
          schema: MessageSchema,
        },
      },
    },
  },
});

app.openapi(messageRoute, (c) => {
  return c.json({ message: "Hello Hono!" }, 200);
});

/**
 * A protected example route proving that authorization is enforced
 * server-side, not only in the client.
 */
const protectedRoute = createRoute({
  method: "get",
  path: "/protected",
  operationId: "getProtected",
  summary: "An example route that requires an authenticated session",
  tags: ["Message"],
  responses: {
    200: {
      description: "Successful response",
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
    },
    401: { description: "Not authenticated" },
  },
});

app.use("/protected", sessionMiddleware);

app.openapi(protectedRoute, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  return c.json({ message: `Hello ${user.email}!` }, 200);
});

app.doc("/openapi", {
  openapi: "3.0.0",
  info: {
    title: "AIVO API",
    version: "0.1.0",
    description: "AIVO API documentation",
  },
  tags: [
    { name: "Message", description: "Greeting endpoints" },
    { name: "Auth", description: "Authentication endpoints" },
  ],
});

app.get("/docs", (c) => {
  /**
   * Rendered by hand rather than via `swaggerUI()` so the page can carry the
   * AIVO favicon and brand title in the document head.
   */
  const version = "5.29.4";
  const cdn = `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${version}`;
  return c.html(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="AIVO API documentation" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="${cdn}/swagger-ui.css" />
    <title>AIVO API</title>
    <style>
      body { margin: 0; background: #09090b; }
      .swagger-ui .topbar { background: #111113; }
      .swagger-ui .info .title { color: #fafafa; }
      .swagger-ui .scheme-container, .swagger-ui .opblock-tag, .swagger-ui .opblock {
        background: #111113;
      }
      .swagger-ui .opblock-tag { color: #fafafa; }
      .swagger-ui input, .swagger-ui select, .swagger-ui textarea { color: #fafafa; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="${cdn}/swagger-ui-bundle.js" crossorigin="anonymous"></script>
    <script>
      window.onload = () => {
        window.ui = SwaggerUIBundle({ dom_id: '#swagger-ui', url: '/openapi' });
      };
    </script>
  </body>
</html>`);
});

app.get("/", (c) => {
  return c.redirect("/docs");
});

export default app;
