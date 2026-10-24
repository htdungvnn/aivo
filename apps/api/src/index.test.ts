import { describe, expect, it } from "vitest";

import app from "./index";

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
