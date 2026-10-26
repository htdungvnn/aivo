/**
 * Product analytics events for authentication.
 *
 * Never include passwords, one-time passwords, tokens, authorization codes
 * or session ids in the payload — `AuthAnalyticsPayload` only allows
 * non-sensitive fields.
 */

export type AuthAnalyticsEvent =
  | "auth_sign_in_started"
  | "auth_sign_in_succeeded"
  | "auth_sign_in_failed"
  | "auth_otp_requested"
  | "auth_otp_verified"
  | "auth_otp_failed"
  | "auth_sign_up_succeeded"
  | "auth_logout";

export type AuthAnalyticsPayload = {
  method?: "google" | "facebook" | "email";
  reason?: string;
};

export type AuthAnalyticsReporter = (
  event: AuthAnalyticsEvent,
  payload?: AuthAnalyticsPayload,
) => void;

/**
 * The default reporter discards events.
 *
 * Apps wire a real analytics provider in by calling `setAuthAnalyticsReporter`.
 */
let reporter: AuthAnalyticsReporter = () => {};

export function setAuthAnalyticsReporter(next: AuthAnalyticsReporter): void {
  reporter = next;
}

export function trackAuthEvent(
  event: AuthAnalyticsEvent,
  payload?: AuthAnalyticsPayload,
): void {
  reporter(event, payload);
}
