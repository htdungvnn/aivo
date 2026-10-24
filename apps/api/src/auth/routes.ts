import type { OnboardingStatus } from "@repo/auth";
import { createRoute, z } from "@hono/zod-openapi";
import { OpenAPIHono } from "@hono/zod-openapi";

import { createAuth } from "./auth.ts";
import { requireSession, sessionMiddleware, type AuthEnv } from "./middleware.ts";

/**
 * Session and account endpoints.
 *
 * These expose the minimal auth user model — never session tokens, provider
 * tokens or internal identifiers.
 */
export const authRoutes = new OpenAPIHono<AuthEnv>();

const SessionUserSchema = z
  .object({
    id: z.string(),
    email: z.string(),
    emailVerified: z.boolean(),
    displayName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    authProvider: z.enum(["google", "apple", "credential"]),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("AuthUser");

const OnboardingSchema = z
  .object({ onboardingCompleted: z.boolean() })
  .openapi("OnboardingStatus");

/**
 * Resolves the session for the routes that need it.
 *
 * Registered as middleware rather than inline so the handler stays a plain
 * function with a well-typed context.
 */
authRoutes.use("/session", sessionMiddleware);
authRoutes.use("/me", sessionMiddleware, requireSession);

/**
 * Returns the current session.
 *
 * `200` with `user: null` when there is no valid session, so the client can
 * distinguish "signed out" from "still restoring" via the response itself.
 */
authRoutes.openapi(
  createRoute({
    method: "get",
    path: "/session",
    operationId: "getSession",
    summary: "Get the current authentication session",
    tags: ["Auth"],
    responses: {
      200: {
        description: "The current session, or an anonymous session",
        content: {
          "application/json": {
            schema: z.object({
              user: SessionUserSchema.nullable(),
              onboarding: OnboardingSchema,
            }),
          },
        },
      },
    },
  }),
  async (c) => {
    const user = c.get("user");
    const onboarding = await getOnboardingStatus(c.env.DB, user?.id ?? null);

    return c.json({ user, onboarding }, 200);
  },
);

/**
 * Returns the authentication policy the clients render.
 *
 * The password policy is owned by the backend — the UI reads it here
 * instead of hardcoding its own rules.
 */
authRoutes.openapi(
  createRoute({
    method: "get",
    path: "/policy",
    operationId: "getAuthPolicy",
    summary: "Get the authentication policy",
    tags: ["Auth"],
    responses: {
      200: {
        description: "The active authentication policy",
        content: {
          "application/json": {
            schema: z.object({
              minPasswordLength: z.number(),
              requireEmailVerification: z.boolean(),
              providers: z.array(z.string()),
            }),
          },
        },
      },
    },
  }),
  async (c) => {
    const auth = createAuth(c.env);
    const providers = Object.keys(auth.options.socialProviders ?? {});

    return c.json(
      {
        minPasswordLength: auth.options.emailAndPassword?.minPasswordLength ?? 8,
        requireEmailVerification:
          auth.options.emailAndPassword?.requireEmailVerification ?? false,
        providers,
      },
      200,
    );
  },
);

/**
 * A protected route proving server-side enforcement.
 */
authRoutes.openapi(
  createRoute({
    method: "get",
    path: "/me",
    operationId: "getCurrentUser",
    summary: "Get the authenticated user",
    tags: ["Auth"],
    responses: {
      200: {
        description: "The authenticated user",
        content: {
          "application/json": {
            schema: z.object({
              user: SessionUserSchema,
              onboarding: OnboardingSchema,
            }),
          },
        },
      },
      401: { description: "Not authenticated" },
    },
  }),
  async (c) => {
    const user = c.get("user");
    const onboarding = await getOnboardingStatus(c.env.DB, user?.id ?? null);

    return c.json({ user, onboarding }, 200);
  },
);

/**
 * Reads the onboarding status for a user.
 *
 * Onboarding is a separate feature and owns its own table. Until that
 * feature ships, every user is treated as not yet onboarded.
 */
export async function getOnboardingStatus(
  db: D1Database,
  userId: string | null,
): Promise<OnboardingStatus> {
  if (!userId) {
    return { onboardingCompleted: false };
  }

  const row = await db
    .prepare("SELECT onboarding_completed FROM user_onboarding WHERE user_id = ?")
    .bind(userId)
    .first<{ onboarding_completed: number | null }>();

  return { onboardingCompleted: row?.onboarding_completed === 1 };
}
