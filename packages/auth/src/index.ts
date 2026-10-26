export {
  SESSION_ANONYMOUS,
  SESSION_LOADING,
  type AuthProvider,
  type AuthSessionState,
  type AuthUser,
  type SocialProvider,
} from "./user";

export {
  OTP_LENGTH_FALLBACK,
  emailSchema,
  otpSchema,
  signInSchema,
  verifyOtpSchema,
  type SignInInput,
  type VerifyOtpInput,
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
  toSafeOtpError,
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
  parseAuthUser,
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

export {
  OTP_EXPIRY_SECONDS_FALLBACK,
  OTP_RESEND_COOLDOWN_SECONDS,
  otpRequestSchema,
  otpVerifyRequestSchema,
  requestOtp,
  verifyOtp,
  type OtpRequestResult,
  type OtpStep,
  type OtpTransport,
  type OtpVerifyResult,
} from "./otp";
