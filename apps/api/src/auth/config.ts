import type { BetterAuthOptions } from "better-auth";

/**
 * The parts of the auth configuration that do not depend on the runtime
 * environment.
 *
 * Keeping this separate from the Worker entry point means the D1 schema can
 * be generated from exactly the same configuration the Worker runs — the
 * schema can never drift from what the library expects.
 */
export const authConfig = {
  appName: "AIVO",
  /**
   * AIVO has no passwords.
   *
   * An email address is proven with a one-time password instead, so the
   * credential endpoints stay disabled and no password is ever stored.
   */
  emailAndPassword: {
    enabled: false,
  },
  emailVerification: {
    sendOnSignUp: false,
    sendOnSignIn: false,
    autoSignInAfterVerification: true,
  },
  /**
   * Account linking.
   *
   * A user who signed in with a one-time password and later uses a social
   * provider with the same (verified) address ends up with one account
   * instead of two.
   */
  account: {
    accountLinking: {
      trustedProviders: ["google", "facebook"],
      requireLocalEmailVerified: true,
      allowDifferentEmails: false,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
      strategy: "jwe",
    },
  },
  advanced: {
    useSecureCookies: true,
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    customRules: {
      "/email-otp/send-verification-otp": { window: 60, max: 3 },
      "/sign-in/email-otp": { window: 60, max: 5 },
    },
  },
} satisfies BetterAuthOptions;
