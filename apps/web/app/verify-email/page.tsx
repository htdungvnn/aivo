"use client";

/**
 * Verify Email Page
 * Handles email verification after signup
 */

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  Mail,
  RefreshCw,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const email = searchParams.get("email");

  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine status from URL params
  const isPending = status === "pending" || !status;
  const isVerified = status === "verified";
  const isExpired = status === "expired";
  const isInvalid = status === "invalid";

  const handleResend = async () => {
    setIsResending(true);
    setError(null);
    
    try {
      // Simulate resending verification email
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setResendSuccess(true);
    } catch (err) {
      setError("Failed to resend verification email. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  const handleGoToDashboard = () => {
    router.push("/dashboard");
  };

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
            {/* Pending Verification */}
            {isPending && (
              <>
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="p-4 rounded-full bg-[var(--color-primary)]/10 mb-4">
                    <Mail className="h-8 w-8 text-[var(--color-primary)]" />
                  </div>
                  <CardTitle className="text-xl mb-2">
                    Check your email
                  </CardTitle>
                  <CardDescription className="max-w-sm">
                    {email ? (
                      <>
                        We've sent a verification link to{" "}
                        <span className="font-medium text-[var(--color-foreground)]">
                          {email}
                        </span>
                        . Please click the link to verify your account.
                      </>
                    ) : (
                      "Please check your email for a verification link to complete your signup."
                    )}
                  </CardDescription>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleResend}
                    disabled={isResending || resendSuccess}
                    className="w-full"
                    variant={resendSuccess ? "secondary" : "default"}
                  >
                    {isResending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : resendSuccess ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Email sent!
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Resend verification email
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-[var(--color-tertiary)]">
                    Didn't receive the email? Check your spam folder or wait a
                    few minutes before trying again.
                  </p>
                </div>
              </>
            )}

            {/* Verified Successfully */}
            {isVerified && (
              <>
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="p-4 rounded-full bg-[var(--color-success)]/10 mb-4">
                    <CheckCircle className="h-8 w-8 text-[var(--color-success)]" />
                  </div>
                  <CardTitle className="text-xl mb-2">
                    Email verified!
                  </CardTitle>
                  <CardDescription className="max-w-sm">
                    Your email has been successfully verified. You can now access
                    all features of AIVO.
                  </CardDescription>
                </div>

                <Button
                  onClick={handleGoToDashboard}
                  className="w-full"
                >
                  Go to Dashboard
                </Button>
              </>
            )}

            {/* Expired Link */}
            {isExpired && (
              <>
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="p-4 rounded-full bg-[var(--color-warning)]/10 mb-4">
                    <AlertCircle className="h-8 w-8 text-[var(--color-warning)]" />
                  </div>
                  <CardTitle className="text-xl mb-2">
                    Link expired
                  </CardTitle>
                  <CardDescription className="max-w-sm">
                    This verification link has expired. Please request a new one.
                  </CardDescription>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleResend}
                    disabled={isResending || resendSuccess}
                    className="w-full"
                  >
                    {isResending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Request new link
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}

            {/* Invalid Link */}
            {isInvalid && (
              <>
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="p-4 rounded-full bg-[var(--color-error)]/10 mb-4">
                    <AlertCircle className="h-8 w-8 text-[var(--color-error)]" />
                  </div>
                  <CardTitle className="text-xl mb-2">
                    Invalid link
                  </CardTitle>
                  <CardDescription className="max-w-sm">
                    This verification link is invalid. It may have already been
                    used or is malformed.
                  </CardDescription>
                </div>

                <Button
                  onClick={() => router.push("/login")}
                  variant="secondary"
                  className="w-full"
                >
                  Back to Login
                </Button>
              </>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 rounded-lg bg-[var(--color-error-muted)] text-sm text-[var(--color-error)]">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help Text */}
        <p className="text-xs text-center text-[var(--color-tertiary)] mt-6">
          Need help?{" "}
          <Link
            href="/help"
            className="text-[var(--color-primary)] hover:underline"
          >
            Contact support
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <div className="animate-spin h-8 w-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
