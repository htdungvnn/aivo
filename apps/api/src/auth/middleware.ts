import { toAuthUser, type AuthUser } from "@repo/auth";
import { createMiddleware } from "hono/factory";

import { createAuth } from "./auth.ts";

export type AuthVariables = {
  user: AuthUser | null;
  session: { id: string; expiresAt: Date } | null;
};

/**
 * The bindings the auth layer depends on.
 *
 * Secrets are optional here so the API can boot in environments where a
 * provider has not been configured yet; the corresponding feature is simply
 * reported as unavailable.
 */
export type AuthEnv = {
  Bindings: {
    DB: D1Database;
    EMAIL: SendEmail;
    BETTER_AUTH_URL: string;
    BETTER_AUTH_SECRET: string;
    /** The base URL of the application that renders the auth screens. */
    WEB_APP_URL: string;
    AUTH_EMAIL_FROM?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    APPLE_CLIENT_ID?: string;
    APPLE_TEAM_ID?: string;
    APPLE_KEY_ID?: string;
    APPLE_PRIVATE_KEY?: string;
    APPLE_APP_BUNDLE_IDENTIFIER?: string;
  };
  Variables: AuthVariables;
};

/**
 * Resolves the session for the current request and exposes it on the
 * context.
 *
 * This is the server-side authorization boundary: routes that require a
 * user must use `requireSession`, never a client-side check.
 */
export const sessionMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    c.set("user", null);
    c.set("session", null);
    await next();
    return;
  }

  c.set("user", toAuthUser(session.user));
  c.set("session", {
    id: session.session.id,
    expiresAt: session.session.expiresAt,
  });

  await next();
});

/**
 * Rejects the request unless a valid session is present.
 *
 * Returns `401` rather than a redirect: this is an API boundary.
 */
export const requireSession = createMiddleware<AuthEnv>(async (c, next) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});
