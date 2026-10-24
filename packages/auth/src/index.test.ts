import { describe, expect, it } from "vitest";

import {
  GENERIC_SIGN_IN_MESSAGE,
  isGuestOnlyRoute,
  isProtectedRoute,
  isPublicRoute,
  isValidRedirect,
  readRedirectParam,
  resolvePostAuthDestination,
  resolvePostSignInDestination,
  toSafeAuthError,
  toSafeSignInError,
  withRedirectParam,
} from "./index";

describe("route classification", () => {
  it("treats auth screens as public", () => {
    expect(isPublicRoute("/auth/sign-in")).toBe(true);
    expect(isPublicRoute("/auth/sign-up")).toBe(true);
    expect(isPublicRoute("/auth/forgot-password")).toBe(true);
    expect(isPublicRoute("/auth/reset-password")).toBe(true);
    expect(isPublicRoute("/auth/verify-email")).toBe(true);
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
    expect(isGuestOnlyRoute("/auth/forgot-password")).toBe(false);
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

  it("uses the same message for unknown and wrong credentials", () => {
    expect(toSafeSignInError({ code: "INVALID_EMAIL_OR_PASSWORD" }).message).toBe(
      toSafeSignInError({ code: "USER_NOT_FOUND" }).message,
    );
    expect(toSafeSignInError({ code: "INVALID_EMAIL_OR_PASSWORD" }).message).toBe(
      GENERIC_SIGN_IN_MESSAGE,
    );
  });

  it("keeps rate limiting distinct so the UI can explain it", () => {
    expect(toSafeSignInError({ code: "TOO_MANY_REQUESTS" }).code).toBe("RATE_LIMITED");
  });
});
