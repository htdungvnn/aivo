'use client';

/**
 * Registration page component
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { OAuthButton } from '@/components/auth/OAuthButton';
import { authCardStyles } from '@/components/auth/AuthCard';
import styles from './register.module.css';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  displayName?: string;
  general?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { login, isLoading: isAuthLoading } = useAuth();
  
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://localhost:3001';

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.displayName) {
      newErrors.displayName = 'Display name is required';
    } else if (formData.displayName.length < 2) {
      newErrors.displayName = 'Display name must be at least 2 characters';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setErrors({});
    
    try {
      const response = await fetch(`${AUTH_API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          displayName: formData.displayName,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.error?.details) {
          const fieldErrors: FormErrors = {};
          const details = data.error.details;
          if (details.fieldErrors) {
            Object.entries(details.fieldErrors as Record<string, string[]>).forEach(([field, msgs]) => {
              if (msgs && msgs.length > 0) {
                fieldErrors[field as keyof FormErrors] = msgs[0] as string;
              }
            });
          }
          setErrors(fieldErrors);
        } else {
          setErrors({ general: data.error?.message || 'Registration failed' });
        }
        return;
      }
      
      setSuccessMessage('Account created! Please check your email to verify your account.');
      setTimeout(() => {
        router.push('/login?registered=true');
      }, 3000);
      
    } catch {
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const isLoading = isSubmitting || isAuthLoading;

  return (
    <div className={authCardStyles.container}>
      <div className={authCardStyles.card}>
        <div className={authCardStyles.header}>
          <h1 className={authCardStyles.title}>Create your account</h1>
          <p className={authCardStyles.subtitle}>Start your health journey with AIVO</p>
        </div>

        {errors.general && (
          <div className={styles.error}>
            <p>{errors.general}</p>
            <button onClick={() => setErrors({})} className={styles.dismissButton}>
              Dismiss
            </button>
          </div>
        )}

        {successMessage && (
          <div className={styles.success}>
            <p>{successMessage}</p>
          </div>
        )}

        {!successMessage && (
          <>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="displayName" className={styles.label}>
                  Display Name
                </label>
                <input
                  type="text"
                  id="displayName"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  className={`${styles.input} ${errors.displayName ? styles.inputError : ''}`}
                  placeholder="John Doe"
                  disabled={isLoading}
                />
                {errors.displayName && (
                  <span className={styles.fieldError}>{errors.displayName}</span>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="email" className={styles.label}>
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                  placeholder="you@example.com"
                  disabled={isLoading}
                />
                {errors.email && (
                  <span className={styles.fieldError}>{errors.email}</span>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="password" className={styles.label}>
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                  placeholder="At least 8 characters"
                  disabled={isLoading}
                />
                {errors.password && (
                  <span className={styles.fieldError}>{errors.password}</span>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="confirmPassword" className={styles.label}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`}
                  placeholder="Re-enter your password"
                  disabled={isLoading}
                />
                {errors.confirmPassword && (
                  <span className={styles.fieldError}>{errors.confirmPassword}</span>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={styles.submitButton}
              >
                {isSubmitting ? (
                  <span className={styles.spinner} />
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            <div className={styles.divider}>
              <span>or continue with</span>
            </div>

            <div className={styles.providers}>
              <OAuthButton
                provider="google"
                onClick={handleGoogleLogin}
                isLoading={isGoogleLoading || isLoading}
              >
                Google
              </OAuthButton>

              <OAuthButton
                provider="facebook"
                onClick={handleFacebookLogin}
                isLoading={isFacebookLoading || isLoading}
              >
                Facebook
              </OAuthButton>
            </div>
          </>
        )}

        <p className={styles.footer}>
          Already have an account?{' '}
          <Link href="/login">Sign in</Link>
        </p>

        <p className={styles.terms}>
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
