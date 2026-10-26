/**
 * The minimal authentication user model.
 *
 * Fitness-specific information (goal, height, weight, activity level, ...)
 * belongs to the Onboarding/Profile feature and must NOT be added here.
 */
export type AuthUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  authProvider: AuthProvider;
  createdAt: Date | string;
  updatedAt: Date | string;
};

/**
 * The ways a user can authenticate.
 *
 * `email` covers the one-time-password flow: the user proves ownership of
 * their address with a short-lived code instead of a password.
 */
export type AuthProvider = "google" | "facebook" | "email";

/** The social providers AIVO supports. */
export type SocialProvider = Extract<AuthProvider, "google" | "facebook">;

/** The session state exposed to the application. */
export type AuthSessionState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};

export const SESSION_LOADING: AuthSessionState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
};

export const SESSION_ANONYMOUS: AuthSessionState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
};
