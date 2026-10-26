import type { AuthEnv } from "./middleware.ts";

/**
 * The social providers AIVO supports, built from the Worker bindings.
 *
 * Credentials come from secrets — they are never bundled into a client
 * bundle and never returned in an API response. A provider whose
 * credentials are absent is simply not configured, so the client hides the
 * matching button instead of offering one that cannot work.
 */
export function buildSocialProviders(env: AuthEnv["Bindings"]) {
  const providers: {
    google?: {
      clientId: string;
      clientSecret: string;
      scope: string[];
    };
    facebook?: {
      clientId: string;
      clientSecret: string;
      scope: string[];
    };
  } = {};

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      scope: ["email", "profile"],
    };
  }

  if (env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET) {
    providers.facebook = {
      clientId: env.FACEBOOK_CLIENT_ID,
      clientSecret: env.FACEBOOK_CLIENT_SECRET,
      scope: ["email", "public_profile"],
    };
  }

  return providers;
}
