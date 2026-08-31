'use client';

/**
 * OAuth callback page
 * Handles the redirect from OAuth providers
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthClient } from '@repo/api-client';
import styles from './callback.module.css';

interface CallbackPageProps {
  params: Promise<{ provider: string }>;
}

export default function OAuthCallbackPage({ params }: CallbackPageProps) {
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const errorParam = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        // Check for OAuth errors
        if (errorParam) {
          throw new Error(errorDescription || errorParam);
        }

        // Validate required params
        if (!code || !state) {
          throw new Error('Missing required OAuth parameters');
        }

        // Verify state
        const storedState = sessionStorage.getItem('oauth_state');
        if (state !== storedState) {
          throw new Error('Invalid OAuth state');
        }

        // Get provider from storage
        const provider = sessionStorage.getItem('oauth_provider') as 'google' | 'facebook';
        if (!provider) {
          throw new Error('Missing OAuth provider');
        }

        // Clear storage
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_provider');

        // Handle callback
        const authClient = getAuthClient();
        const result = await authClient.handleOAuthCallback(provider, code, state);

        setStatus('success');

        // Redirect based on email verification
        setTimeout(() => {
          if (result.emailVerificationRequired) {
            router.push(`/verify-email?status=pending&email=${encodeURIComponent(result.user.email)}`);
          } else {
            router.push('/dashboard');
          }
        }, 1000);
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setStatus('error');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {status === 'loading' && (
          <>
            <div className={styles.spinner} />
            <h1 className={styles.title}>Signing you in...</h1>
            <p className={styles.subtitle}>Please wait while we complete the sign-in process.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className={styles.successIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 className={styles.title}>Welcome!</h1>
            <p className={styles.subtitle}>You have been signed in successfully. Redirecting...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className={styles.errorIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <h1 className={styles.title}>Authentication Failed</h1>
            <p className={styles.subtitle}>{error}</p>
            <button
              onClick={() => router.push('/login')}
              className={styles.retryButton}
            >
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
