'use client';

/**
 * Dashboard page - protected route
 */

import { useEffect } from 'react';
import { useAuth, useRequireActiveAccount } from '@/components/auth/AuthProvider';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const { user, session, roles, isLoading, isAuthenticated, logout } = useAuth();
  const { canAccess, needsVerification } = useRequireActiveAccount();

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useRequireActiveAccount
  }

  if (needsVerification) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1>Email Verification Required</h1>
          <p>Please verify your email to access the dashboard.</p>
          <a href="/verify-email" className={styles.button}>
            Verify Email
          </a>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1>Access Denied</h1>
          <p>Your account is not active. Please contact support.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Dashboard</h1>
        <button onClick={logout} className={styles.logoutButton}>
          Sign Out
        </button>
      </header>

      <main className={styles.main}>
        <div className={styles.profileCard}>
          <h2>Profile</h2>
          {user?.avatarUrl && (
            <img src={user.avatarUrl} alt="" className={styles.avatar} />
          )}
          <div className={styles.profileInfo}>
            <p><strong>Name:</strong> {user?.displayName || 'Not set'}</p>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Status:</strong> {user?.status}</p>
            <p><strong>Roles:</strong> {roles.join(', ')}</p>
          </div>
        </div>

        <div className={styles.sessionCard}>
          <h2>Current Session</h2>
          <div className={styles.sessionInfo}>
            <p><strong>Device:</strong> {session?.deviceName || session?.clientType || 'Unknown'}</p>
            <p><strong>Platform:</strong> {session?.platform || 'Unknown'}</p>
            <p><strong>Last Active:</strong> {session?.lastActiveAt ? new Date(session.lastActiveAt * 1000).toLocaleString() : 'Unknown'}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
