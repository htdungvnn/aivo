import { createAuthClient } from "better-auth/react";

/**
 * The Better Auth client used by the web app.
 *
 * The API base URL is public configuration — no secret is ever embedded in
 * the client bundle.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
  basePath: "/api/auth",
});
