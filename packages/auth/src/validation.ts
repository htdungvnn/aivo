import { z } from "zod";

/**
 * Validation shared by web and mobile.
 *
 * AIVO does not use passwords: an email address is proven with a short-lived
 * one-time password (OTP). The OTP policy is owned by the API — the length
 * here only mirrors the default so the UI can validate the shape of the code
 * before a request is sent.
 */

/**
 * The number of digits in a one-time password.
 *
 * Mirrors the API default. The authoritative value is served by the API at
 * `GET /auth/policy`.
 */
export const OTP_LENGTH_FALLBACK = 6;

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  // Normalize before submission so lookups are stable.
  .toLowerCase();

/**
 * The one-time password sent to the user's email address.
 *
 * Only digits are accepted: the code is typed on a phone keyboard, so a
 * numeric code keeps the input short and unambiguous.
 */
export const otpSchema = z
  .string()
  .trim()
  .min(1, "Enter the code we sent you")
  .regex(/^\d+$/, "The code contains digits only")
  .length(OTP_LENGTH_FALLBACK, `The code is ${OTP_LENGTH_FALLBACK} digits`);

export const signInSchema = z.object({
  email: emailSchema,
});

export const verifyOtpSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
});

export type SignInInput = z.infer<typeof signInSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
