import { z } from "zod";

import { emailSchema, otpSchema } from "./validation";

/**
 * The email one-time-password (OTP) flow.
 *
 * AIVO has no passwords: a user proves ownership of their email address with
 * a short-lived numeric code. The same flow covers both sign-in and sign-up
 * — a brand new address is registered automatically the first time a valid
 * code is submitted.
 *
 * The transport (how the request reaches the API) is supplied by the app, so
 * web and mobile share the flow rules without duplicating them.
 */

/**
 * How long a one-time password stays valid, in seconds.
 *
 * Mirrors the API default. The authoritative value is served by the API at
 * `GET /auth/policy`.
 */
export const OTP_EXPIRY_SECONDS_FALLBACK = 300;

/**
 * The seconds a user must wait before asking for a new code.
 *
 * Sending is rate limited server-side; the cooldown keeps the UI in step
 * with that limit instead of letting the user hit an error.
 */
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

/** The steps of the flow. */
export type OtpStep = "email" | "code";

/**
 * The transport the OTP flow needs from the host app.
 *
 * `requestOtp` sends the code to the given address. `verifyOtp` exchanges
 * the code for a session.
 */
export type OtpTransport = {
  requestOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
};

/**
 * The parsed result of submitting the email step.
 */
export type OtpRequestResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

/**
 * The parsed result of submitting the code step.
 */
export type OtpVerifyResult = { ok: true } | { ok: false; error: string };

/**
 * Validates the email address and asks the transport to send a code.
 */
export async function requestOtp(
  transport: OtpTransport,
  email: string,
): Promise<OtpRequestResult> {
  const parsed = emailSchema.safeParse(email);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid email",
    };
  }

  await transport.requestOtp(parsed.data);

  return { ok: true, email: parsed.data };
}

/**
 * Validates the code and exchanges it for a session.
 */
export async function verifyOtp(
  transport: OtpTransport,
  email: string,
  otp: string,
): Promise<OtpVerifyResult> {
  const parsedEmail = emailSchema.safeParse(email);
  const parsedOtp = otpSchema.safeParse(otp);

  if (!parsedEmail.success) {
    return {
      ok: false,
      error: parsedEmail.error.issues[0]?.message ?? "Invalid email",
    };
  }

  if (!parsedOtp.success) {
    return {
      ok: false,
      error: parsedOtp.error.issues[0]?.message ?? "Invalid code",
    };
  }

  await transport.verifyOtp(parsedEmail.data, parsedOtp.data);

  return { ok: true };
}

/**
 * The request body sent to the API when asking for a code.
 *
 * Exported so the apps and the API tests agree on the contract.
 */
export const otpRequestSchema = z.object({
  email: emailSchema,
  type: z.literal("sign-in"),
});

/**
 * The request body sent to the API when exchanging a code for a session.
 */
export const otpVerifyRequestSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
});
