'use client';

/**
 * Auth Error Page
 * Handles OAuth and authentication errors
 */

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './error.module.css';

interface ErrorPageProps {
  params: Promise<{ locale: string }>;
}

export default function AuthErrorPage({ params }: ErrorPageProps) {
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Parse error from URL params
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (errorParam) {
      setErrorCode(errorParam);
      
      // Provide human-readable error messages
      let message = errorDescription || errorParam;
      
      switch (errorParam) {
        case 'oauth_callback_failed':
          message = errorDescription || 'OAuth authentication failed. The session may have expired.';
          break;
        case 'invalid_state':
          message = errorDescription || 'Invalid OAuth state. Please try signing in again.';
          break;
        case 'access_denied':
          message = errorDescription || 'Access was denied. You may have cancelled the sign-in process.';
          break;
        case 'token_exchange_failed':
          message = errorDescription || 'Failed to exchange authorization code for tokens.';
          break;
        case 'user_not_found':
          message = errorDescription || 'User account not found.';
          break;
        case 'account_suspended':
          message = errorDescription || 'Your account has been suspended.';
          break;
        case 'email_not_verified':
          message = errorDescription || 'Please verify your email address before signing in.';
          break;
        default:
          if (!errorDescription) {
            message = 'An unexpected authentication error occurred.';
          }
      }
      
      setError(message);
    }
    
    setIsLoading(false);
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Error Icon */}
        <div className={styles.errorIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        {/* Error Title */}
        <h1 className={styles.title}>Authentication Failed</h1>
        
        {/* Error Description */}
        <p className={styles.description}>
          {error || 'An unexpected error occurred during authentication.'}
        </p>

        {/* Error Code (if available) */}
        {errorCode && (
          <div className={styles.errorCode}>
            <span className={styles.errorCodeLabel}>Error code:</span>
            <code className={styles.errorCodeValue}>{errorCode}</code>
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          <button
            onClick={() => router.push('/login')}
            className={styles.primaryButton}
          >
            Back to Login
          </button>
          
          <Link href="/" className={styles.secondaryButton}>
            Go to Homepage
          </Link>
        </div>

        {/* Help Text */}
        <p className={styles.helpText}>
          If this problem persists, please{' '}
          <a href="mailto:support@aivo.com" className={styles.helpLink}>
            contact support
          </a>
          .
        </p>
      </div>

      {/* Privacy Links */}
      <div className={styles.footer}>
        <Link href="/privacy" className={styles.footerLink}>
          Privacy Policy
        </Link>
        <Link href="/terms" className={styles.footerLink}>
          Terms of Service
        </Link>
      </div>
    </div>
  );
}
