"use client";

/**
 * Suspended Account Page
 * Shown when a user's account has been suspended
 */

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldOff, Mail, ArrowLeft } from "lucide-react";

export default function SuspendedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-4">
      <div className="w-full max-w-md">
        {/* Back Link */}
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="p-4 rounded-full bg-[var(--color-error)]/10 mb-4">
                <ShieldOff className="h-8 w-8 text-[var(--color-error)]" />
              </div>
              <CardTitle className="text-xl mb-2">
                Account suspended
              </CardTitle>
              <CardDescription className="max-w-sm">
                Your AIVO account has been suspended. This may be due to a violation
                of our terms of service or suspicious activity.
              </CardDescription>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-[var(--color-muted-foreground)] text-center">
                If you believe this is an error or would like to appeal this decision,
                please contact our support team.
              </p>

              <Button variant="secondary" className="w-full" asChild>
                <a
                  href="mailto:support@aivo.com?subject=Account%20Suspension%20Appeal"
                  className="flex items-center justify-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Contact Support
                </a>
              </Button>
            </div>

            <div className="mt-6 p-4 rounded-lg bg-[var(--color-muted)]">
              <p className="text-xs text-[var(--color-tertiary)]">
                <strong>Note:</strong> Suspicious activity includes sharing account
                access, fraudulent payments, or behavior that violates our community
                guidelines.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Links */}
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
