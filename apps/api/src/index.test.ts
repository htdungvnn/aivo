import { describe, expect, it } from "vitest";

import app from "./index";
import { createTestDatabase, readAuthSchema } from "./test-database.ts";

/**
 * The API tests run against a real in-memory SQLite database using the same
 * schema the Worker applies, so the real Better Auth code paths are
 * exercised rather than a stubbed adapter.
 */
let requestCounter = 0;

type TestContext = {
  bindings: never;
  sentEmails: { to: string; subject: string; text: string }[];
  headers: Record<string, string>;
};

function createContext(): TestContext {
  const database = createTestDatabase(readAuthSchema());
  const sentEmails: { to: string; subject: string; text: string }[] = [];

  /**
   * Each test gets its own client address.
   *
   * Better Auth's rate limiter is keyed by client IP and shared across the
   * process, so without this the sign-up and password-reset limits would
   * leak between tests.
   */
  requestCounter += 1;
  const ip = `10.0.0.${requestCounter}`;

  const bindings = {
    DB: database,
    EMAIL: {
      send: async (message: { to: string; subject: string; text: string }) => {
        sentEmails.push(message);
        return { messageId: "test-message" };
      },
    },
    BETTER_AUTH_URL: "http://localhost:3001",
    BETTER_AUTH_SECRET: "test-secret-value-that-is-long-enough-for-tests",
    WEB_APP_URL: "http://localhost:3000",
    AUTH_EMAIL_FROM: "auth@aivo.app",
  } as never;

  /**
   * The address arrives the way Cloudflare delivers it.
   *
   * `cf-connecting-ip` is set by the edge and cannot be spoofed, so it is
   * what the rate limiter must read. `x-forwarded-for` is included here as
   * the single value a client could forge — it must not be preferred.
   */
  return {
    bindings,
    sentEmails,
    headers: {
      "cf-connecting-ip": ip,
      "x-forwarded-for": "203.0.113.7",
    },
  };
}

/**
 * Sends a JSON request with the test context's bindings and headers.
 */
function request(
  context: TestContext,
  path: string,
  body?: unknown,
): Promise<Response> | Response {
  return app.request(
    path,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...context.headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    context.bindings,
  );
}

/**
 * Reads the one-time password out of the email the API sent.
 */
function readOtp(context: TestContext): string {
  const email = context.sentEmails.at(-1);
  const match = email?.text.match(/code is (\d{6})/);

  if (!match) {
    throw new Error(`No one-time password found in: ${email?.text ?? "no email"}`);
  }

  return match[1] as string;
}

describe("api", () => {
  it("returns a greeting message", async () => {
    const res = await app.request("/message");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: "Hello Hono!" });
  });

  it("serves the OpenAPI document", async () => {
    const res = await app.request("/openapi");

    expect(res.status).toBe(200);

    const doc = (await res.json()) as {
      openapi: string;
      info: { title: string };
      paths: Record<string, unknown>;
    };

    expect(doc.openapi).toBe("3.0.0");
    expect(doc.info.title).toBe("AIVO API");
    expect(doc.paths["/message"]).toBeDefined();
  });

  it("serves the Swagger UI", async () => {
    const res = await app.request("/docs");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain("swagger-ui");
  });
});

describe("auth endpoints", () => {
  it("returns an anonymous session when there is no cookie", async () => {
    const context = createContext();
    const res = await app.request(
      "/auth/session",
      { headers: context.headers },
      context.bindings,
    );

    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      user: unknown;
      onboarding: { onboardingCompleted: boolean };
    };

    expect(body.user).toBeNull();
    expect(body.onboarding.onboardingCompleted).toBe(false);
  });

  it("rejects the protected me route without a session", async () => {
    const context = createContext();
    const res = await app.request(
      "/auth/me",
      { headers: context.headers },
      context.bindings,
    );

    expect(res.status).toBe(401);
  });

  it("exposes the authentication policy", async () => {
    const context = createContext();
    const res = await app.request(
      "/auth/policy",
      { headers: context.headers },
      context.bindings,
    );

    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      otpLength: number;
      otpExpirySeconds: number;
      providers: string[];
    };

    expect(body.otpLength).toBe(6);
    expect(body.otpExpirySeconds).toBe(300);
    expect(Array.isArray(body.providers)).toBe(true);
  });

  it("enforces authorization on protected API routes", async () => {
    const context = createContext();
    const res = await app.request(
      "/protected",
      { headers: context.headers },
      context.bindings,
    );

    expect(res.status).toBe(401);
  });
});

describe("email one-time password", () => {
  it("sends a one-time password to the address", async () => {
    const context = createContext();

    const res = await request(context, "/api/auth/email-otp/send-verification-otp", {
      email: "athlete@aivo.app",
      type: "sign-in",
    });

    expect(res.status).toBe(200);

    const email = context.sentEmails.at(-1);
    expect(email?.to).toBe("athlete@aivo.app");
    expect(email?.text).toContain("sign-in code is");
  });

  it("registers the account and returns a session for a valid code", async () => {
    const context = createContext();

    await request(context, "/api/auth/email-otp/send-verification-otp", {
      email: "athlete@aivo.app",
      type: "sign-in",
    });

    const res = await request(context, "/api/auth/sign-in/email-otp", {
      email: "athlete@aivo.app",
      otp: readOtp(context),
    });

    expect(res.status).toBe(200);

    const body = (await res.json()) as { user: { email: string; emailVerified: boolean } };
    expect(body.user.email).toBe("athlete@aivo.app");
    expect(body.user.emailVerified).toBe(true);
  });

  it("rejects a wrong code", async () => {
    const context = createContext();

    await request(context, "/api/auth/email-otp/send-verification-otp", {
      email: "wrong@aivo.app",
      type: "sign-in",
    });

    const res = await request(context, "/api/auth/sign-in/email-otp", {
      email: "wrong@aivo.app",
      otp: "000000",
    });

    expect(res.status).toBeGreaterThanOrEqual(400);

    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("INVALID_OTP");
  });

  it("rejects a malformed email address", async () => {
    const context = createContext();

    const res = await request(context, "/api/auth/email-otp/send-verification-otp", {
      email: "not-an-email",
      type: "sign-in",
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(context.sentEmails).toHaveLength(0);
  });

  it("does not expose a session for an unauthenticated session request", async () => {
    const context = createContext();

    await request(context, "/api/auth/email-otp/send-verification-otp", {
      email: "athlete@aivo.app",
      type: "sign-in",
    });

    await request(context, "/api/auth/sign-in/email-otp", {
      email: "athlete@aivo.app",
      otp: readOtp(context),
    });

    // The session cookie is not carried over, so the session is anonymous.
    const res = await app.request(
      "/auth/session",
      { headers: context.headers },
      context.bindings,
    );

    const body = (await res.json()) as { user: unknown };
    expect(body.user).toBeNull();
  });

  it("reports the session user as an email provider", async () => {
    const context = createContext();

    await request(context, "/api/auth/email-otp/send-verification-otp", {
      email: "provider@aivo.app",
      type: "sign-in",
    });

    const res = await request(context, "/api/auth/sign-in/email-otp", {
      email: "provider@aivo.app",
      otp: readOtp(context),
    });

    const cookie = res.headers.get("set-cookie");
    expect(cookie).toBeTruthy();

    const session = await app.request(
      "/auth/session",
      {
        headers: {
          ...context.headers,
          cookie: cookie?.split(";")[0] ?? "",
        },
      },
      context.bindings,
    );

    const body = (await session.json()) as {
      user: { authProvider: string; email: string } | null;
    };

    expect(body.user?.authProvider).toBe("email");
    expect(body.user?.email).toBe("provider@aivo.app");
  });

  it("rate limits the code requests per client rather than globally", async () => {
    // The first client exhausts its own allowance.
    const noisy = createContext();

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await request(noisy, "/api/auth/email-otp/send-verification-otp", {
        email: "noisy@aivo.app",
        type: "sign-in",
      });
    }

    const blocked = await request(
      noisy,
      "/api/auth/email-otp/send-verification-otp",
      { email: "noisy@aivo.app", type: "sign-in" },
    );

    expect(blocked.status).toBe(429);

    // A different client is unaffected: the limit is keyed by address, so one
    // user cannot exhaust the one-time password allowance for everyone.
    const quiet = createContext();

    const res = await request(
      quiet,
      "/api/auth/email-otp/send-verification-otp",
      { email: "quiet@aivo.app", type: "sign-in" },
    );

    expect(res.status).toBe(200);
  });
});

describe("password credentials are disabled", () => {
  it("does not accept an email and password sign-in", async () => {
    const context = createContext();

    const res = await request(context, "/api/auth/sign-in/email", {
      email: "athlete@aivo.app",
      password: "correct-horse-battery",
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
