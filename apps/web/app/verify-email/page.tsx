'use client';

/**
 * Email verification pending page
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import styles from './verify-email.module.css';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const { sendVerificationEmail, logout } = useAuth();
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleResendEmail = async () => {
    setStatus('sending');
    try {
      await sendVerificationEmail();
      setStatus('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
      setStatus('error');
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.icon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>

        <h1 className={styles.title}>Verify Your Email</h1>
        
        <p className={styles.description}>
          We&apos;ve sent a verification email to{' '}
          <strong>{email}</strong>
        </p>

        <p className={styles.instructions}>
          Please check your inbox and click the verification link to activate your account.
          The link will expire in 1 hour.
        </p>

        {status === 'sent' && (
          <div className={styles.success}>
            <p>Verification email sent! Check your inbox.</p>
          </div>
        )}

        {status === 'error' && (
          <div className={styles.error}>
            <p>{error}</p>
          </div>
        )}

        <div className={styles.actions}>
          <button
            onClick={handleResendEmail}
            disabled={status === 'sending'}
            className={styles.primaryButton}
          >
            {status === 'sending' ? 'Sending...' : 'Resend Verification Email'}
          </button>

          <div className={styles.divider}>
            <span>or</span>
          </div>

          <button onClick={handleLogout} className={styles.secondaryButton}>
            Sign Out
          </button>
        </div>

        <p className={styles.helpText}>
          Didn&apos;t receive the email? Check your spam folder or click resend above.
        </p>
      </div>
    </div>
  );
}
