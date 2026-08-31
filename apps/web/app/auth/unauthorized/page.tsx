"use client";

/**
 * Unauthorized Page
 * Shown when a user tries to access a resource they don't have permission for
 */

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, ArrowLeft, Home } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-4">
      <div className="w-full max-w-md">
        {/* Back Link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="p-4 rounded-full bg-[var(--color-warning)]/10 mb-4">
                <Lock className="h-8 w-8 text-[var(--color-warning)]" />
              </div>
              <CardTitle className="text-xl mb-2">
                Access denied
              </CardTitle>
              <CardDescription className="max-w-sm">
                You don't have permission to access this resource. This may require
                additional permissions or a different account.
              </CardDescription>
            </div>

            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/dashboard" className="flex items-center justify-center gap-2">
                  <Home className="h-4 w-4" />
                  Go to Dashboard
                </Link>
              </Button>

              <p className="text-sm text-[var(--color-muted-foreground)] text-center">
                If you believe this is an error, please contact your administrator
                or{" "}
                <Link
                  href="mailto:support@aivo.com"
                  className="text-[var(--color-primary)] hover:underline"
                >
                  contact support
                </Link>
                .
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Help Links */}
        <div className="flex justify-center gap-4 mt-6 text-xs text-[var(--color-tertiary)]">
          <Link href="/privacy" className="hover:text-[var(--color-foreground)]">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-[var(--color-foreground)]">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}
