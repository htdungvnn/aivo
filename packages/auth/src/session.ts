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
 * Infers the authentication provider from the provider session payload.
 *
 * Social providers report their provider id; credential accounts do not.
 */
export function inferAuthProvider(user: SessionUser): AuthProvider {
  const provider = user.provider?.toLowerCase();

  if (provider === "google" || provider === "apple") {
    return provider;
  }
  return "credential";
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
