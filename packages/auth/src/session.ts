import type { AuthProvider, AuthUser } from "./user";

/**
 * The provider-agnostic shape of an authenticated session.
 *
 * Web and mobile both receive this shape from the API, so the mapping from
 * a provider session to our minimal user model lives in exactly one place.
 */
export type SessionUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  name?: string | null;
  image?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  provider?: string | null;
};

export type SessionPayload = {
  user: SessionUser;
  session?: {
    id: string;
    expiresAt: string | Date;
  };
};

/**
 * The authentication providers a session can report.
 */
const AUTH_PROVIDERS: readonly AuthProvider[] = ["google", "facebook", "email"];

/**
 * Infers the authentication provider from the provider session payload.
 *
 * Social providers report their provider id; an email one-time-password
 * session does not, and falls back to `email`.
 */
export function inferAuthProvider(user: SessionUser): AuthProvider {
  const provider = user.provider?.toLowerCase();

  if (provider === "google" || provider === "facebook") {
    return provider;
  }
  return "email";
}

/**
 * Maps a provider session user onto the minimal AIVO auth user model.
 *
 * Fitness data is intentionally absent — see `AuthUser`.
 */
export function toAuthUser(user: SessionUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    emailVerified: Boolean(user.emailVerified),
    displayName: user.name ?? null,
    avatarUrl: user.image ?? null,
    authProvider: inferAuthProvider(user),
    createdAt: user.createdAt ?? new Date(0).toISOString(),
    updatedAt: user.updatedAt ?? new Date(0).toISOString(),
  };
}

/**
 * Narrows an API response into the minimal AIVO auth user model.
 *
 * The API is the source of truth for the sign-in method, so clients parse
 * its payload instead of re-deriving the provider from the raw session.
 * Unknown values are rejected rather than trusted, and a payload that is not
 * a user at all yields `null`.
 */
export function parseAuthUser(raw: unknown): AuthUser | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }

  const user = raw as Record<string, unknown>;

  if (typeof user.id !== "string" || typeof user.email !== "string") {
    return null;
  }

  const provider = user.authProvider;
  const authProvider = AUTH_PROVIDERS.includes(provider as AuthProvider)
    ? (provider as AuthProvider)
    : "email";

  return {
    id: user.id,
    email: user.email,
    emailVerified: Boolean(user.emailVerified),
    displayName: typeof user.displayName === "string" ? user.displayName : null,
    avatarUrl: typeof user.avatarUrl === "string" ? user.avatarUrl : null,
    authProvider,
    createdAt:
      typeof user.createdAt === "string" ? user.createdAt : new Date(0).toISOString(),
    updatedAt:
      typeof user.updatedAt === "string" ? user.updatedAt : new Date(0).toISOString(),
  };
}
