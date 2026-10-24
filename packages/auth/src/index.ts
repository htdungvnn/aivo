export {
  SESSION_ANONYMOUS,
  SESSION_LOADING,
  type AuthProvider,
  type AuthSessionState,
  type AuthUser,
} from "./user";

export {
  MIN_PASSWORD_LENGTH_FALLBACK,
  buildPasswordRequirements,
  emailSchema,
  forgotPasswordSchema,
  passwordsMatch,
  passwordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  type ForgotPasswordInput,
  type PasswordRequirement,
  type PasswordRequirements,
  type ResetPasswordInput,
  type SignInInput,
  type SignUpInput,
} from "./validation";

export {
  DEFAULT_AUTHENTICATED_ROUTE,
  DEFAULT_ONBOARDING_ROUTE,
  GUEST_ONLY_ROUTES,
  PROTECTED_ROUTE_PREFIXES,
  PUBLIC_ROUTES,
  REDIRECT_PARAM,
  SIGN_IN_ROUTE,
  SIGN_UP_ROUTE,
  isGuestOnlyRoute,
  isProtectedRoute,
  isPublicRoute,
  isValidRedirect,
  readRedirectParam,
  resolvePostAuthDestination,
  resolvePostSignInDestination,
  withRedirectParam,
} from "./routes";

export {
  GENERIC_SIGN_IN_MESSAGE,
  authError,
  mapAuthErrorCode,
  toSafeAuthError,
  toSafeSignInError,
  type AuthError,
  type AuthErrorCode,
} from "./errors";

export {
  ONBOARDING_NOT_COMPLETED,
  destinationForOnboardingStatus,
  type OnboardingStatus,
} from "./onboarding";

export {
  inferAuthProvider,
  toAuthUser,
  type SessionPayload,
  type SessionUser,
} from "./session";

export {
  setAuthAnalyticsReporter,
  trackAuthEvent,
  type AuthAnalyticsEvent,
  type AuthAnalyticsPayload,
  type AuthAnalyticsReporter,
} from "./analytics";
