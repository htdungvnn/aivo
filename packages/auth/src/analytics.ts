/**
 * Product analytics events for authentication.
 *
 * Never include passwords, tokens, authorization codes or session ids in
 * the payload — `AuthAnalyticsPayload` only allows non-sensitive fields.
 */

export type AuthAnalyticsEvent =
  | "auth_sign_in_started"
  | "auth_sign_in_succeeded"
  | "auth_sign_in_failed"
  | "auth_sign_up_started"
  | "auth_sign_up_succeeded"
  | "auth_sign_up_failed"
  | "auth_logout"
  | "auth_password_reset_requested"
  | "auth_password_reset_succeeded"
  | "auth_email_verification_requested"
  | "auth_email_verified";

export type AuthAnalyticsPayload = {
  method?: "google" | "apple" | "credential";
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
