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
    FACEBOOK_CLIENT_ID?: string;
    FACEBOOK_CLIENT_SECRET?: string;
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

  const provider = await getAccountProvider(c.env.DB, session.user.id);

  c.set("user", toAuthUser({ ...session.user, provider }));
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

/**
 * Reads the social provider a user signed in with.
 *
 * A user who authenticated with a one-time password has no social account
 * row at all, which is exactly how they are told apart here. The lookup is
 * scoped to the session's own user id, so it can never expose another
 * account's provider.
 */
async function getAccountProvider(
  db: D1Database,
  userId: string,
): Promise<string | null> {
  const row = await db
    .prepare('SELECT providerId FROM "account" WHERE userId = ? LIMIT 1')
    .bind(userId)
    .first<{ providerId: string | null }>();

  return row?.providerId ?? null;
}
