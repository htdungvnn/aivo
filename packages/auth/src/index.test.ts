import { describe, expect, it } from "vitest";

import {
  GENERIC_SIGN_IN_MESSAGE,
  isGuestOnlyRoute,
  isProtectedRoute,
  isPublicRoute,
  isValidRedirect,
  otpSchema,
  parseAuthUser,
  readRedirectParam,
  requestOtp,
  resolvePostAuthDestination,
  resolvePostSignInDestination,
  toSafeAuthError,
  toSafeOtpError,
  verifyOtp,
  withRedirectParam,
} from "./index";

describe("route classification", () => {
  it("treats auth screens as public", () => {
    expect(isPublicRoute("/auth/sign-in")).toBe(true);
    expect(isPublicRoute("/auth/sign-up")).toBe(true);
    expect(isPublicRoute("/auth/callback")).toBe(true);
    expect(isPublicRoute("/")).toBe(true);
  });

  it("treats application sections as protected", () => {
    expect(isProtectedRoute("/dashboard")).toBe(true);
    expect(isProtectedRoute("/workout/plan")).toBe(true);
    expect(isProtectedRoute("/nutrition/meal/1")).toBe(true);
    expect(isProtectedRoute("/progress")).toBe(true);
    expect(isProtectedRoute("/profile")).toBe(true);
    expect(isProtectedRoute("/settings/account")).toBe(true);
    expect(isProtectedRoute("/onboarding")).toBe(true);
  });

  it("does not treat similarly named public paths as protected", () => {
    expect(isProtectedRoute("/dashboard-preview")).toBe(false);
    expect(isProtectedRoute("/auth/sign-in")).toBe(false);
  });

  it("identifies guest-only routes", () => {
    expect(isGuestOnlyRoute("/auth/sign-in")).toBe(true);
    expect(isGuestOnlyRoute("/auth/sign-up")).toBe(true);
    expect(isGuestOnlyRoute("/auth/callback")).toBe(false);
  });
});

describe("redirect validation", () => {
  it("accepts internal absolute paths", () => {
    expect(isValidRedirect("/dashboard")).toBe(true);
    expect(isValidRedirect("/workout/plan?tab=1")).toBe(true);
  });

  it("rejects external and protocol-relative destinations", () => {
    expect(isValidRedirect("https://evil.com")).toBe(false);
    expect(isValidRedirect("//evil.com")).toBe(false);
    expect(isValidRedirect("/\\evil.com")).toBe(false);
    expect(isValidRedirect("javascript:alert(1)")).toBe(false);
    expect(isValidRedirect("")).toBe(false);
    expect(isValidRedirect(null)).toBe(false);
    expect(isValidRedirect(undefined)).toBe(false);
  });

  it("rejects destinations containing backslashes or newlines", () => {
    expect(isValidRedirect("/dashboard\\evil.com")).toBe(false);
    expect(isValidRedirect("/dashboard\nSet-Cookie: x=1")).toBe(false);
  });
});

describe("post-authentication destinations", () => {
  it("routes to onboarding when onboarding is incomplete", () => {
    expect(resolvePostAuthDestination(null, false)).toBe("/onboarding");
  });

  it("routes to the dashboard when onboarding is complete", () => {
    expect(resolvePostAuthDestination(null, true)).toBe("/dashboard");
  });

  it("keeps a valid requested destination", () => {
    expect(resolvePostAuthDestination("/workout/plan", false)).toBe("/workout/plan");
  });

  it("ignores an unsafe requested destination", () => {
    expect(resolvePostAuthDestination("https://evil.com", true)).toBe("/dashboard");
  });

  it("only restores protected destinations after sign in", () => {
    expect(resolvePostSignInDestination("/workout/plan", true)).toBe("/workout/plan");
    expect(resolvePostSignInDestination("/auth/sign-in", true)).toBe("/dashboard");
    expect(resolvePostSignInDestination("https://evil.com", true)).toBe("/dashboard");
  });
});

describe("redirect param", () => {
  it("round-trips a destination", () => {
    const url = withRedirectParam("/auth/sign-in", "/workout/plan");
    expect(readRedirectParam(url.split("?")[1] ?? "")).toBe("/workout/plan");
  });

  it("appends to an existing query string", () => {
    const url = withRedirectParam("/auth/sign-in?x=1", "/dashboard");
    expect(url).toBe("/auth/sign-in?x=1&redirect=%2Fdashboard");
  });

  it("returns null when absent", () => {
    expect(readRedirectParam("")).toBeNull();
  });
});

describe("otp validation", () => {
  it("accepts a numeric code of the expected length", () => {
    expect(otpSchema.safeParse("123456").success).toBe(true);
  });

  it("rejects a code with letters", () => {
    expect(otpSchema.safeParse("12a456").success).toBe(false);
  });

  it("rejects a code of the wrong length", () => {
    expect(otpSchema.safeParse("12345").success).toBe(false);
  });

  it("rejects an empty code", () => {
    expect(otpSchema.safeParse("").success).toBe(false);
  });
});

describe("otp flow", () => {
  it("sends a code to a valid address", async () => {
    const requested: string[] = [];

    const result = await requestOtp(
      {
        requestOtp: async (email) => {
          requested.push(email);
        },
        verifyOtp: async () => {},
      },
      "Athlete@Aivo.app ",
    );

    expect(result.ok).toBe(true);
    expect(requested).toEqual(["athlete@aivo.app"]);
  });

  it("rejects a malformed address without sending a code", async () => {
    let called = false;

    const result = await requestOtp(
      {
        requestOtp: async () => {
          called = true;
        },
        verifyOtp: async () => {},
      },
      "not-an-email",
    );

    expect(result.ok).toBe(false);
    expect(called).toBe(false);
  });

  it("exchanges a valid code for a session", async () => {
    const verified: { email: string; otp: string }[] = [];

    const result = await verifyOtp(
      {
        requestOtp: async () => {},
        verifyOtp: async (email, otp) => {
          verified.push({ email, otp });
        },
      },
      "athlete@aivo.app",
      "123456",
    );

    expect(result.ok).toBe(true);
    expect(verified).toEqual([{ email: "athlete@aivo.app", otp: "123456" }]);
  });

  it("rejects an invalid code without calling the transport", async () => {
    let called = false;

    const result = await verifyOtp(
      {
        requestOtp: async () => {},
        verifyOtp: async () => {
          called = true;
        },
      },
      "athlete@aivo.app",
      "12",
    );

    expect(result.ok).toBe(false);
    expect(called).toBe(false);
  });
});

describe("parsing the API session user", () => {
  it("accepts a user the API returned", () => {
    const user = parseAuthUser({
      id: "user-1",
      email: "athlete@aivo.app",
      emailVerified: true,
      displayName: "Athlete",
      avatarUrl: null,
      authProvider: "email",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(user?.authProvider).toBe("email");
    expect(user?.email).toBe("athlete@aivo.app");
    expect(user?.displayName).toBe("Athlete");
  });

  it("rejects a payload that is not a user", () => {
    expect(parseAuthUser(null)).toBeNull();
    expect(parseAuthUser(undefined)).toBeNull();
    expect(parseAuthUser("nope")).toBeNull();
    expect(parseAuthUser({})).toBeNull();
  });

  it("falls back to the email provider for an unknown value", () => {
    const user = parseAuthUser({
      id: "user-1",
      email: "athlete@aivo.app",
      emailVerified: true,
      authProvider: "somebody-else",
    });

    expect(user?.authProvider).toBe("email");
  });
});

describe("safe error mapping", () => {
  it("maps provider codes to safe messages", () => {
    expect(toSafeAuthError({ code: "INVALID_EMAIL_OR_PASSWORD" }).message).toBe(
      GENERIC_SIGN_IN_MESSAGE,
    );
    expect(toSafeAuthError({ code: "USER_ALREADY_EXISTS" }).code).toBe("EMAIL_EXISTS");
    expect(toSafeAuthError({ code: "TOO_MANY_REQUESTS" }).code).toBe("RATE_LIMITED");
  });

  it("does not leak unknown provider messages", () => {
    const error = toSafeAuthError({ code: "SOMETHING_INTERNAL", message: "db exploded" });
    expect(error.code).toBe("UNKNOWN");
    expect(error.message).not.toContain("db exploded");
  });

  it("maps otp failures to specific codes", () => {
    expect(toSafeOtpError({ code: "INVALID_OTP" }).code).toBe("INVALID_OTP");
    expect(toSafeOtpError({ code: "OTP_EXPIRED" }).code).toBe("OTP_EXPIRED");
    expect(toSafeOtpError({ code: "TOO_MANY_ATTEMPTS" }).code).toBe("TOO_MANY_ATTEMPTS");
  });

  it("collapses unknown otp failures to an invalid code", () => {
    expect(toSafeOtpError({ code: "SOMETHING_INTERNAL" }).code).toBe("INVALID_OTP");
  });
});
