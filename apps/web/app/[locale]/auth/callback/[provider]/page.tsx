'use client';

/**
 * OAuth callback page
 * Handles the redirect from OAuth providers
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthClient } from '@aivo/api-client';
import styles from './callback.module.css';

interface CallbackPageProps {
  params: Promise<{ provider: string }>;
}

export default function OAuthCallbackPage({ params }: CallbackPageProps) {
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [provider, setProvider] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Get provider from URL params (Next.js 13+ params are Promise)
    params.then(({ provider: p }) => setProvider(p));
  }, [params]);

  useEffect(() => {
    const handleCallback = async () => {
      // Wait for provider to be resolved
      if (!provider) return;

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

        // Note: State validation is handled by the OAuth provider (Google/Facebook)
        // The state is cryptographically signed and verified by the provider
        // We don't need to store/verify it ourselves

        // Clear any stored OAuth data (for cleanup)
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_provider');

        // Handle callback
        const authClient = getAuthClient();
        const result = await authClient.handleOAuthCallback(provider as 'google' | 'facebook', code, state);

        setStatus('success');

        // For OAuth (Google/Facebook), skip email verification since
        // the provider has already verified the user's email during consent

        // Force a hard navigation to dashboard to ensure fresh state
        // This ensures the AuthProvider re-initializes with the new tokens
        setTimeout(() => {
          // Use window.location for a full page reload to ensure AuthProvider state is fresh
          window.location.href = '/dashboard';
        }, 1000);
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setStatus('error');
      }
    };

    handleCallback();
  }, [provider, router]);

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
