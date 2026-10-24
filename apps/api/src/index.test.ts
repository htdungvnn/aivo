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

  return { bindings, sentEmails, headers: { "x-forwarded-for": ip } };
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
      minPasswordLength: number;
      requireEmailVerification: boolean;
      providers: string[];
    };

    expect(body.minPasswordLength).toBe(8);
    expect(body.requireEmailVerification).toBe(true);
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

describe("email sign up", () => {
  it("creates an account and returns the session", async () => {
    const context = createContext();

    const res = await request(context, "/api/auth/sign-up/email", {
      email: "athlete@aivo.app",
      password: "correct-horse-battery",
      name: "Athlete",
    });

    expect(res.status).toBe(200);

    const body = (await res.json()) as { user: { email: string } };
    expect(body.user.email).toBe("athlete@aivo.app");
  });

  it("sends a verification email that links to the application", async () => {
    const context = createContext();

    await request(context, "/api/auth/sign-up/email", {
      email: "verify@aivo.app",
      password: "correct-horse-battery",
      name: "Verify",
    });

    const email = context.sentEmails.find((message) =>
      message.subject.includes("Verify"),
    );

    expect(email).toBeDefined();
    expect(email?.to).toBe("verify@aivo.app");
    expect(email?.text).toContain("http://localhost:3000/auth/verify-email");
    expect(email?.text).toContain("token=");
  });

  it("rejects a weak password", async () => {
    const context = createContext();

    const res = await request(context, "/api/auth/sign-up/email", {
      email: "weak@aivo.app",
      password: "short",
      name: "Weak",
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("rejects a malformed email address", async () => {
    const context = createContext();

    const res = await request(context, "/api/auth/sign-up/email", {
      email: "not-an-email",
      password: "correct-horse-battery",
      name: "Bad",
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe("email sign in", () => {
  it("rejects wrong credentials with a generic error", async () => {
    const context = createContext();

    await request(context, "/api/auth/sign-up/email", {
      email: "athlete@aivo.app",
      password: "correct-horse-battery",
      name: "Athlete",
    });

    const res = await request(context, "/api/auth/sign-in/email", {
      email: "athlete@aivo.app",
      password: "wrong-password",
    });

    expect(res.status).toBeGreaterThanOrEqual(400);

    const body = (await res.json()) as { code?: string; message?: string };
    expect(body.code).toBe("INVALID_EMAIL_OR_PASSWORD");
  });

  it("returns the same error for an unknown account as for a wrong password", async () => {
    const context = createContext();

    const res = await request(context, "/api/auth/sign-in/email", {
      email: "nobody@aivo.app",
      password: "wrong-password",
    });

    expect(res.status).toBeGreaterThanOrEqual(400);

    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("INVALID_EMAIL_OR_PASSWORD");
  });
});

describe("password reset", () => {
  it("does not reveal whether an account exists", async () => {
    const context = createContext();

    const res = await request(context, "/api/auth/request-password-reset", {
      email: "nobody@aivo.app",
    });

    expect(res.status).toBe(200);

    const body = (await res.json()) as { status: boolean; message: string };
    expect(body.status).toBe(true);
    expect(body.message).toContain("If this email exists");
  });

  it("emails a reset link that points at the application", async () => {
    const context = createContext();

    await request(context, "/api/auth/sign-up/email", {
      email: "reset@aivo.app",
      password: "correct-horse-battery",
      name: "Reset",
    });

    const res = await request(context, "/api/auth/request-password-reset", {
      email: "reset@aivo.app",
    });

    expect(res.status).toBe(200);

    const email = context.sentEmails.find((message) =>
      message.subject.includes("Reset"),
    );

    expect(email).toBeDefined();
    expect(email?.text).toContain("http://localhost:3000/auth/reset-password");
    expect(email?.text).toContain("token=");
  });
});
