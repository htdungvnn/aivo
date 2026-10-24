import { SignJWT, importPKCS8 } from "jose";

import type { AuthEnv } from "./middleware.ts";

/**
 * The social providers AIVO supports, built from the Worker bindings.
 *
 * Credentials come from secrets — they are never bundled into a client
 * bundle and never returned in an API response. A provider whose
 * credentials are absent is simply not configured, so the client hides the
 * matching button instead of offering one that cannot work.
 *
 * The `socialProviders` option accepts either the options object or a
 * function returning it, which is what lets the Apple client secret be
 * generated asynchronously.
 */
export function buildSocialProviders(env: AuthEnv["Bindings"]) {
  const providers: {
    google?: {
      clientId: string;
      clientSecret: string;
      scope: string[];
    };
    apple?: () => Promise<{
      clientId: string;
      clientSecret: string;
      scope: string[];
      appBundleIdentifier?: string;
    }>;
  } = {};

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      scope: ["email", "profile"],
    };
  }

  if (
    env.APPLE_CLIENT_ID &&
    env.APPLE_TEAM_ID &&
    env.APPLE_KEY_ID &&
    env.APPLE_PRIVATE_KEY
  ) {
    const clientId = env.APPLE_CLIENT_ID;
    const teamId = env.APPLE_TEAM_ID;
    const keyId = env.APPLE_KEY_ID;
    const privateKey = env.APPLE_PRIVATE_KEY;
    const appBundleIdentifier = env.APPLE_APP_BUNDLE_IDENTIFIER;

    providers.apple = async () => ({
      clientId,
      clientSecret: await createAppleClientSecret({
        clientId,
        teamId,
        keyId,
        privateKey,
      }),
      scope: ["email", "name"],
      ...(appBundleIdentifier ? { appBundleIdentifier } : {}),
    });
  }

  return providers;
}

/**
 * Sign in with Apple requires a short-lived client secret JWT signed with
 * the team's private key.
 */
async function createAppleClientSecret(input: {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
}): Promise<string> {
  const key = await importPKCS8(normalizePrivateKey(input.privateKey), "ES256");
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: input.keyId })
    .setIssuer(input.teamId)
    .setSubject(input.clientId)
    .setAudience("https://appleid.apple.com")
    .setIssuedAt(now)
    .setExpirationTime(now + 180 * 24 * 60 * 60)
    .sign(key);
}

/**
 * Secrets are often stored with escaped newlines. Normalize them so the PEM
 * parses correctly.
 */
function normalizePrivateKey(privateKey: string): string {
  return privateKey.replace(/\\n/g, "\n");
}
