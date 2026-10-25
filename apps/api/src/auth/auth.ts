import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";

import { authConfig } from "./config.ts";
import { sendAuthEmail } from "./email.ts";
import { trustedOrigins } from "./origins.ts";
import { buildSocialProviders } from "./social.ts";
import type { AuthEnv } from "./middleware.ts";

/**
 * The Better Auth instance backing every authentication request.
 *
 * The D1 binding is passed straight through: Better Auth detects the D1
 * dialect and uses D1's `batch()` for atomic writes (D1 has no interactive
 * transactions).
 *
 * The instance is created per request environment rather than at module
 * scope, because the D1 binding and the secrets only exist on the request
 * context.
 */
export function createAuth(env: AuthEnv["Bindings"]) {
    return betterAuth({
    ...authConfig,
    database: env.DB,
    baseURL: env.BETTER_AUTH_URL,
    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: trustedOrigins(env),
    emailAndPassword: {
      ...authConfig.emailAndPassword,
      sendResetPassword: async ({ user, token }) => {
        // The link points at the web application, which owns the reset
        // screen. The token is a single-use secret — it is never logged.
        const url = buildAppUrl(env, "/auth/reset-password", { token });

        await sendAuthEmail(env, {
          to: user.email,
          subject: "Reset your AIVO password",
          text: `Reset your AIVO password by opening this link: ${url}`,
          html: `<p>Reset your AIVO password by opening this link:</p><p><a href="${url}">Reset password</a></p>`,
        });
      },
    },
    emailVerification: {
      ...authConfig.emailVerification,
      sendVerificationEmail: async ({ user, token }) => {
        const url = buildAppUrl(env, "/auth/verify-email", { token });

        await sendAuthEmail(env, {
          to: user.email,
          subject: "Verify your AIVO email",
          text: `Verify your email by opening this link: ${url}`,
          html: `<p>Verify your email by opening this link:</p><p><a href="${url}">Verify email</a></p>`,
        });
      },
    },
    socialProviders: buildSocialProviders(env),
    plugins: [expo()],
  });
}

/**
 * Builds a link into the application that owns the authentication screens.
 *
 * The base URL comes from the environment — it is never hardcoded, and the
 * query parameters are the only place a token is ever carried.
 */
function buildAppUrl(
  env: AuthEnv["Bindings"],
  path: string,
  params: Record<string, string>,
): string {
  const base = env.WEB_APP_URL.replace(/\/+$/, "");
  const search = new URLSearchParams(params);

  return `${base}${path}?${search.toString()}`;
}

export type Auth = ReturnType<typeof createAuth>;
