import { createAuthClient } from "better-auth/react";

import { apiBaseUrl } from "@/lib/api-url";

/**
 * The Better Auth client used by the web app.
 *
 * The API base URL is public configuration — no secret is ever embedded in
 * the client bundle.
 */
export const authClient = createAuthClient({
  baseURL: apiBaseUrl(),
  basePath: "/api/auth",
});
