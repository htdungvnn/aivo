/**
 * The base URL of the AIVO API.
 *
 * This is public configuration — the value ends up in the client bundle, and
 * no secret is ever embedded in it.
 *
 * The URL is resolved in this order:
 *
 * 1. `NEXT_PUBLIC_API_URL` — set explicitly, either in the environment or by
 *    the deploy workflow.
 * 2. The deployed API, when the app is running in production.
 * 3. The local development API.
 *
 * Resolving it at runtime rather than baking it in at build time means the
 * same source works in every environment, and a misconfigured deployment
 * fails visibly instead of silently pointing at localhost.
 */

/**
 * The deployed API origin.
 */
const PRODUCTION_API_URL = "https://api.htdung-aivo.workers.dev";

/**
 * The API used during local development.
 */
const DEVELOPMENT_API_URL = "http://localhost:3001";

/**
 * Whether the app is running in production.
 *
 * `import.meta.env.PROD` is replaced at build time by Vite, so this is a
 * compile-time constant on the client and works in the Worker runtime.
 */
function isProduction(): boolean {
  return import.meta.env.PROD;
}

/**
 * The base URL of the API, without a trailing slash.
 */
export function apiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (configured) {
    return stripTrailingSlash(configured);
  }

  return isProduction() ? PRODUCTION_API_URL : DEVELOPMENT_API_URL;
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
