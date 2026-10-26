/**
 * The one-time password policy.
 *
 * AIVO has no passwords: a user proves ownership of their email address with
 * a short-lived numeric code. The policy lives here so the Worker and the
 * schema generator configure the plugin identically.
 */
export const otpPolicy = {
  otpLength: 6,
  expiresIn: 300,
  allowedAttempts: 3,
  /**
   * The code is stored hashed: a leaked database row cannot be used to sign
   * in.
   */
  storeOTP: "hashed" as const,
  /**
   * A valid code for a new address registers the account, so sign-up and
   * sign-in are the same flow.
   */
  disableSignUp: false,
};
