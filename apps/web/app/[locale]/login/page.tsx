'use client';

/**
 * Login page component
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { OAuthButton } from '@/components/auth/OAuthButton';
import { authCardStyles } from '@/components/auth/AuthCard';
import styles from './login.module.css';

export default function LoginPage() {
  const { login, loginWithEmail, error, clearError, isLoading } = useAuth();
  const router = useRouter();
  
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  
  // Email/password form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      await login('google');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setIsFacebookLoading(true);
    try {
      await login('facebook');
    } finally {
      setIsFacebookLoading(false);
    }
  };

  const validateEmailForm = (): boolean => {
    let valid = true;
    setEmailError('');
    setPasswordError('');
    
    if (!email) {
      setEmailError('Email is required');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address');
      valid = false;
    }
    
    if (!password) {
      setPasswordError('Password is required');
      valid = false;
    }
    
    return valid;
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmailForm()) {
      return;
    }
    
    setIsEmailLoading(true);
    try {
      await loginWithEmail(email, password);
      router.push('/');
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleOAuthClick = () => {
    setShowEmailForm(false);
    clearError();
  };

  const handleEmailClick = () => {
    setShowEmailForm(true);
    clearError();
  };

  return (
    <div className={authCardStyles.container}>
      <div className={authCardStyles.card}>
        <div className={authCardStyles.header}>
          <h1 className={authCardStyles.title}>Welcome to AIVO</h1>
          <p className={authCardStyles.subtitle}>
            {showEmailForm ? 'Sign in with your email' : 'Sign in to continue'}
          </p>
        </div>

        {error && (
          <div className={styles.error}>
            <p>{error}</p>
            <button onClick={clearError} className={styles.dismissButton}>
              Dismiss
            </button>
          </div>
        )}

        {!showEmailForm ? (
          <>
            <div className={styles.providers}>
              <OAuthButton
                provider="google"
                onClick={handleGoogleLogin}
                isLoading={isGoogleLoading || isLoading}
              >
                Sign in with Google
              </OAuthButton>

              <OAuthButton
                provider="facebook"
                onClick={handleFacebookLogin}
                isLoading={isFacebookLoading || isLoading}
              >
                Sign in with Facebook
              </OAuthButton>

              <div className={styles.divider}>
                <span>or</span>
              </div>

              <button
                onClick={handleEmailClick}
                className={`${styles.oauthButton} ${styles.emailButton}`}
              >
                <svg className={styles.providerIcon} viewBox="0 0 24 24">
                  <path fill="currentColor" d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                <span>Continue with Email</span>
              </button>
            </div>

            <p className={styles.registerLink}>
              Don&apos;t have an account?{' '}
              <Link href="/register">Create one</Link>
            </p>
          </>
        ) : (
          <>
            <form onSubmit={handleEmailLogin} className={styles.emailForm}>
              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.label}>
                  Email address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError('');
                  }}
                  className={`${styles.input} ${emailError ? styles.inputError : ''}`}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={isEmailLoading}
                />
                {emailError && <p className={styles.fieldError}>{emailError}</p>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="password" className={styles.label}>
                  Password
                </label>
                <div className={styles.passwordWrapper}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError('');
                    }}
                    className={`${styles.input} ${passwordError ? styles.inputError : ''}`}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={isEmailLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={styles.passwordToggle}
                    tabIndex={-1}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {passwordError && <p className={styles.fieldError}>{passwordError}</p>}
              </div>

              <div className={styles.forgotPassword}>
                <Link href="/forgot-password">Forgot password?</Link>
              </div>

              <button
                type="submit"
                disabled={isEmailLoading}
                className={styles.submitButton}
              >
                {isEmailLoading ? <span className={styles.spinner} /> : 'Sign In'}
              </button>
            </form>

            <button
              onClick={handleOAuthClick}
              className={styles.backButton}
            >
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
              </svg>
              Back to sign in options
            </button>
          </>
        )}

        <p className={styles.terms}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
