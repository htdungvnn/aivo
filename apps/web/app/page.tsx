'use client';

import { useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        window.location.href = '/dashboard';
      }
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 className={styles.title}>Welcome to AIVO</h1>
        <p className={styles.subtitle}>AI-powered voice platform</p>
        
        <div className={styles.ctas}>
          <Link href="/login" className={styles.primaryButton}>
            Sign In
          </Link>
        </div>
      </main>
    </div>
  );
}
