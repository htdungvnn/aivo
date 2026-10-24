/**
 * Route protection rules and redirect destination validation.
 *
 * Client-side route protection is UX only — the backend enforces
 * authorization. But the destination rules below are security relevant and
 * are shared so web and mobile cannot disagree about them.
 */

export const PUBLIC_ROUTES = [
  "/",
  "/auth/sign-in",
  "/auth/sign-up",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
  "/auth/callback",
] as const;

export const PROTECTED_ROUTE_PREFIXES = [
  "/dashboard",
  "/workout",
  "/nutrition",
  "/progress",
  "/profile",
  "/settings",
  "/onboarding",
] as const;

/** Routes that only make sense while signed out. */
export const GUEST_ONLY_ROUTES = ["/auth/sign-in", "/auth/sign-up"] as const;

export const DEFAULT_AUTHENTICATED_ROUTE = "/dashboard";
export const DEFAULT_ONBOARDING_ROUTE = "/onboarding";
export const SIGN_IN_ROUTE = "/auth/sign-in";
export const SIGN_UP_ROUTE = "/auth/sign-up";

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => matchesRoute(pathname, route));
}

export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isGuestOnlyRoute(pathname: string): boolean {
  return GUEST_ONLY_ROUTES.some((route) => matchesRoute(pathname, route));
}

function matchesRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

/**
 * Validates a redirect destination.
 *
 * Only same-origin, absolute-path destinations are allowed. Protocol-relative
 * URLs (`//evil.com`) and absolute URLs (`https://evil.com`) are rejected to
 * prevent open-redirect abuse.
 */
export function isValidRedirect(destination: string | null | undefined): boolean {
  if (!destination) return false;
  if (!destination.startsWith("/")) return false;
  // `//host` and `/\host` are treated as protocol-relative URLs by browsers.
  if (destination.startsWith("//")) return false;
  if (destination.startsWith("/\\")) return false;
  if (destination.includes("\\")) return false;
  if (destination.includes("\n") || destination.includes("\r")) return false;
  return true;
}

/**
 * Returns the destination to use after authentication.
 *
 * Falls back to the default destination when the requested one is missing or
 * unsafe.
 */
export function resolvePostAuthDestination(
  requested: string | null | undefined,
  onboardingCompleted: boolean,
): string {
  if (isValidRedirect(requested)) {
    return requested as string;
  }
  return onboardingCompleted ? DEFAULT_AUTHENTICATED_ROUTE : DEFAULT_ONBOARDING_ROUTE;
}

/**
 * Resolves where an unauthenticated visitor should land after signing in.
 *
 * The intended destination is preserved when it is a protected, internal
 * route; anything else falls back to the default authenticated destination.
 */
export function resolvePostSignInDestination(
  requested: string | null | undefined,
  onboardingCompleted: boolean,
): string {
  if (isValidRedirect(requested) && isProtectedRoute(requested as string)) {
    return requested as string;
  }
  return resolvePostAuthDestination(null, onboardingCompleted);
}

/**
 * The query parameter used to carry the intended destination across the
 * sign-in screen.
 */
export const REDIRECT_PARAM = "redirect";

export function withRedirectParam(path: string, destination: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${REDIRECT_PARAM}=${encodeURIComponent(destination)}`;
}

export function readRedirectParam(search: string): string | null {
  const params = new URLSearchParams(search);
  return params.get(REDIRECT_PARAM);
}
