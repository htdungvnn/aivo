/**
 * Safe, user-facing authentication error messages.
 *
 * Provider and internal errors are never surfaced verbatim: they can contain
 * tokens, session identifiers or internal API payloads. Technical detail is
 * logged separately by the caller, not shown to the user.
 */

export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "EMAIL_EXISTS"
  | "EMAIL_NOT_VERIFIED"
  | "INVALID_EMAIL"
  | "INVALID_PASSWORD"
  | "PASSWORD_TOO_SHORT"
  | "INVALID_TOKEN"
  | "TOKEN_EXPIRED"
  | "ACCOUNT_UNAVAILABLE"
  | "SOCIAL_AUTH_ERROR"
  | "NETWORK_ERROR"
  | "RATE_LIMITED"
  | "UNKNOWN";

export type AuthError = {
  code: AuthErrorCode;
  message: string;
};

const MESSAGES: Record<AuthErrorCode, string> = {
  INVALID_CREDENTIALS: "Unable to sign in with those credentials.",
  EMAIL_EXISTS: "An account with that email already exists.",
  EMAIL_NOT_VERIFIED: "Please verify your email before signing in.",
  INVALID_EMAIL: "Enter a valid email address.",
  INVALID_PASSWORD: "That password doesn't look right.",
  PASSWORD_TOO_SHORT: "Choose a longer password.",
  INVALID_TOKEN: "This reset link is no longer valid.",
  TOKEN_EXPIRED: "This reset link has expired. Request a new one.",
  ACCOUNT_UNAVAILABLE: "This account is currently unavailable. Please try again later.",
  SOCIAL_AUTH_ERROR: "We couldn't sign you in with that provider. Please try again.",
  NETWORK_ERROR: "We couldn't reach the server. Check your connection and try again.",
  RATE_LIMITED: "Too many attempts. Please wait a moment and try again.",
  UNKNOWN: "Something went wrong. Please try again.",
};

/**
 * The generic message used for sign-in failures.
 *
 * Deliberately identical for "unknown email" and "wrong password" so the
 * response cannot be used to discover whether an account exists.
 */
export const GENERIC_SIGN_IN_MESSAGE = MESSAGES.INVALID_CREDENTIALS;

export function authError(code: AuthErrorCode): AuthError {
  return { code, message: MESSAGES[code] };
}

/**
 * Maps a provider error code onto a safe auth error code.
 *
 * Unknown codes collapse to `UNKNOWN` so nothing internal leaks.
 */
export function mapAuthErrorCode(raw: unknown): AuthErrorCode {
  const code =
    typeof raw === "object" && raw !== null
      ? (raw as { code?: unknown }).code
      : typeof raw === "string"
        ? raw
        : undefined;

  if (typeof code !== "string") return "UNKNOWN";

  switch (code) {
    case "INVALID_EMAIL_OR_PASSWORD":
    case "INVALID_CREDENTIALS":
    case "USER_NOT_FOUND":
    case "ACCOUNT_NOT_FOUND":
      return "INVALID_CREDENTIALS";
    case "INVALID_PASSWORD":
      return "INVALID_PASSWORD";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
    case "EMAIL_EXISTS":
      return "EMAIL_EXISTS";
    case "EMAIL_NOT_VERIFIED":
      return "EMAIL_NOT_VERIFIED";
    case "INVALID_TOKEN":
    case "INVALID_TOKEN_OR_EMAIL":
      return "INVALID_TOKEN";
    case "TOKEN_EXPIRED":
      return "TOKEN_EXPIRED";
    case "PASSWORD_TOO_SHORT":
      return "PASSWORD_TOO_SHORT";
    case "ACCOUNT_UNAVAILABLE":
    case "USER_BANNED":
      return "ACCOUNT_UNAVAILABLE";
    case "TOO_MANY_REQUESTS":
    case "RATE_LIMIT_EXCEEDED":
      return "RATE_LIMITED";
    default:
      return "UNKNOWN";
  }
}

/**
 * Converts a thrown value into a user-facing error.
 *
 * The original error is deliberately not returned — callers log it
 * themselves if they need the technical detail.
 */
export function toSafeAuthError(raw: unknown): AuthError {
  if (typeof raw === "object" && raw !== null) {
    const code = (raw as { code?: unknown }).code;
    if (typeof code === "string" && code in MESSAGES) {
      return authError(code as AuthErrorCode);
    }
  }
  return authError(mapAuthErrorCode(raw));
}

/**
 * Converts a thrown value into a user-facing error for credential sign-in.
 *
 * Every failure collapses to the same generic message so the response
 * cannot be used to discover whether an account exists. Rate limiting is
 * kept distinct because hiding it would make the UI misleading.
 */
export function toSafeSignInError(raw: unknown): AuthError {
  const code = mapAuthErrorCode(raw);
  if (code === "RATE_LIMITED") {
    return authError(code);
  }
  return authError("INVALID_CREDENTIALS");
}
