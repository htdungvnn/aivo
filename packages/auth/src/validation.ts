import { z } from "zod";

/**
 * Validation shared by web and mobile.
 *
 * Password rules are NOT hardcoded here: the authentication provider owns the
 * policy. `MIN_PASSWORD_LENGTH_FALLBACK` is only used to render a sensible
 * hint before the provider policy is known — the authoritative value is
 * served by the API at `GET /auth/policy`.
 */
export const MIN_PASSWORD_LENGTH_FALLBACK = 8;

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  // Normalize before submission so lookups are stable.
  .toLowerCase();

export const passwordSchema = z
  .string()
  .min(1, "Password is required")
  .max(128, "Password is too long");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Confirm your password"),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, "Confirm your new password"),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Password requirements surfaced to the user while typing.
 *
 * The list is derived from the provider policy rather than restated here, so
 * the UI can never drift from what the backend enforces.
 */
export type PasswordRequirements = {
  minLength: number;
  requirements: readonly PasswordRequirement[];
};

export type PasswordRequirement = {
  id: string;
  label: string;
  /** Whether the currently entered value satisfies this requirement. */
  satisfied: boolean;
};

export function buildPasswordRequirements(
  password: string,
  minLength: number = MIN_PASSWORD_LENGTH_FALLBACK,
): PasswordRequirements {
  const requirements: PasswordRequirement[] = [
    {
      id: "length",
      label: `At least ${minLength} characters`,
      satisfied: password.length >= minLength,
    },
  ];

  return { minLength, requirements };
}

/**
 * Validates that the password and its confirmation match.
 *
 * Kept separate from the schemas so the error can be attached to the
 * confirmation field specifically.
 */
export function passwordsMatch(password: string, confirmPassword: string): boolean {
  return password.length > 0 && password === confirmPassword;
}
