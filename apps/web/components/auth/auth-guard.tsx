"use client";

import {
  isGuestOnlyRoute,
  isProtectedRoute,
  resolvePostSignInDestination,
  withRedirectParam,
} from "@repo/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { AuthLoadingState } from "@/components/auth/auth-loading";
import { useAuthSession } from "@/lib/auth-actions";
/**
 * The splash screen shown while the session is restored.
 *
 * It replaces the whole screen so the sign-in form or the protected content
 * never flashes before the session state is known.
 */
export function AuthSessionGuard({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuthSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    // An authenticated visitor has no reason to see the sign-in screens.
    if (isGuestOnlyRoute(pathname) && isAuthenticated) {
      router.replace("/dashboard");
      return;
    }

    // A protected route requires a session. The intended destination is
    // carried through the sign-in screen so the visitor lands where they
    // intended — after the destination has been validated.
    if (isProtectedRoute(pathname) && !isAuthenticated) {
      router.replace(withRedirectParam("/auth/sign-in", pathname));
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading) {
    return <AuthLoadingState label="Restoring your session" />;
  }

  if (isGuestOnlyRoute(pathname) && isAuthenticated) {
    return <AuthLoadingState label="Redirecting" />;
  }

  if (isProtectedRoute(pathname) && !isAuthenticated) {
    return <AuthLoadingState label="Redirecting to sign in" />;
  }

  return <>{children}</>;
}

/**
 * Resolves the destination to use after a successful sign-in.
 *
 * The intended destination is preserved only when it is a protected internal
 * route — an arbitrary URL is never honoured.
 */
export function usePostSignInRedirect(): (requested: string | null) => string {
  const { onboardingCompleted } = useAuthSession();

  return (requested: string | null) =>
    resolvePostSignInDestination(requested, onboardingCompleted);
}
