import type { AuthEnv } from "./middleware.ts";

/**
 * The origins that are allowed to talk to the API.
 *
 * The list is derived from the configured application URLs so a deployed
 * Worker trusts its own web app without any extra configuration, and so
 * local development keeps working. An arbitrary origin is never trusted.
 */
export function allowedOrigins(env: AuthEnv["Bindings"]): string[] {
  const origins = new Set<string>([
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
  ]);

  for (const url of [env.WEB_APP_URL, env.BETTER_AUTH_URL]) {
    if (!url) continue;

    try {
      origins.add(new URL(url).origin);
    } catch {
      // A malformed URL is ignored rather than trusted.
    }
  }

  return [...origins];
}

/**
 * The origins that may complete an authentication request.
 *
 * This is a wider set than the CORS origins: the mobile app uses a custom
 * scheme, and Apple posts its response from Apple's own origin.
 */
export function trustedOrigins(env: AuthEnv["Bindings"]): string[] {
  const origins = new Set<string>(allowedOrigins(env));

  // The mobile app's custom scheme and the Expo development client.
  origins.add("aivo://");
  origins.add("aivo://callback");
  origins.add("exp://**");

  // Sign in with Apple posts back from Apple's own origin.
  origins.add("https://appleid.apple.com");

  return [...origins];
}
