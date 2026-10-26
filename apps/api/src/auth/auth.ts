import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";

import { authConfig } from "./config.ts";
import { sendAuthEmail } from "./email.ts";
import { trustedOrigins } from "./origins.ts";
import { otpPolicy } from "./otp-policy.ts";
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
    socialProviders: buildSocialProviders(env),
    plugins: [
      expo(),
      emailOTP({
        ...otpPolicy,
        sendVerificationOTP: async ({ email, otp, type }) => {
          await sendAuthEmail(env, {
            to: email,
            subject:
              type === "sign-in" ? "Your AIVO sign-in code" : "Your AIVO code",
            text: `Your AIVO sign-in code is ${otp}. It expires in 5 minutes. If you did not request it, you can ignore this email.`,
            html: `<p>Your AIVO sign-in code is:</p><p style="font-size:24px;font-weight:700;letter-spacing:4px">${otp}</p><p>It expires in 5 minutes. If you did not request it, you can ignore this email.</p>`,
          });
        },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
